import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { findStaffByEmail } from "@/modules/ops";
import {
  checkStaffAccess,
  deniedSignInLogLine,
  isStaffRole,
  normalizeEmail,
  parseAllowlist,
} from "./auth-access";

// Connexion du personnel : Google, session JWT (cookie chiffré), aucune table d'adaptateur.
// Lit AUTH_SECRET, AUTH_GOOGLE_ID et AUTH_GOOGLE_SECRET dans l'environnement.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 },
  pages: { signIn: "/connexion", error: "/connexion" },
  callbacks: {
    async signIn({ profile }) {
      const decision = await checkStaffAccess(
        { email: profile?.email, emailVerified: profile?.email_verified === true },
        {
          allowlist: parseAllowlist(process.env.STAFF_EMAIL_ALLOWLIST),
          findStaff: findStaffByEmail,
        },
      );
      if (decision.allowed) return true;
      console.warn(deniedSignInLogLine(profile?.email, decision.reason));
      return false;
    },
    async jwt({ token, profile }) {
      // profile n'est présent qu'au moment de la connexion, déjà acceptée par signIn.
      if (profile?.email) {
        const staff = await findStaffByEmail(normalizeEmail(profile.email));
        if (staff) {
          token.staffId = staff.id;
          token.role = staff.role;
        }
      }
      return token;
    },
    session({ session, token }) {
      const { staffId, role } = token;
      if (typeof staffId === "string" && isStaffRole(role)) {
        session.user.staffId = staffId;
        session.user.role = role;
      }
      return session;
    },
  },
});
