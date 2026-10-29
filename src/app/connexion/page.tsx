import { signIn } from "@/lib/auth";
import { t } from "@/lib/i18n";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function SignInPage({ searchParams }: Props) {
  const { error } = await searchParams;

  async function signInWithGoogle() {
    "use server";
    await signIn("google", { redirectTo: "/admin" });
  }

  return (
    <main>
      <h1>{t("signIn.title")}</h1>
      {error && (
        <p role="alert">{error === "AccessDenied" ? t("signIn.denied") : t("signIn.error")}</p>
      )}
      <form action={signInWithGoogle}>
        <button type="submit" style={{ minHeight: 44 }}>
          {t("signIn.button")}
        </button>
      </form>
    </main>
  );
}
