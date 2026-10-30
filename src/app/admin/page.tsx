import Link from "next/link";
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
    <main className="page">
      <h1>{t("admin.title")}</h1>
      <p>
        {t("admin.signedInAs")} {session.user.name ?? session.user.email}
      </p>
      <p>
        {t("admin.role")} {t(`role.${session.user.role}`)}
      </p>
      <nav>
        <ul className="nav">
          <li>
            <Link href="/admin/catalogue" className="nav-link">
              {t("admin.nav.catalog")}
            </Link>
          </li>
        </ul>
      </nav>
      <form action={signOutAction}>
        <button type="submit" className="secondary">
          {t("admin.signOut")}
        </button>
      </form>
    </main>
  );
}
