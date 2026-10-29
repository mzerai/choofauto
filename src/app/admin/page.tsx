import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { t } from "@/lib/i18n";

export default async function AdminHomePage() {
  const session = await auth();
  if (!session?.user?.role) redirect("/connexion");

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/connexion" });
  }

  return (
    <main>
      <h1>{t("admin.title")}</h1>
      <p>
        {t("admin.signedInAs")} {session.user.name ?? session.user.email}
      </p>
      <p>
        {t("admin.role")} {t(`role.${session.user.role}`)}
      </p>
      <form action={signOutAction}>
        <button type="submit" style={{ minHeight: 44 }}>
          {t("admin.signOut")}
        </button>
      </form>
    </main>
  );
}
