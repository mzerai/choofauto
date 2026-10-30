// Garde-fou : l'import des versions trouvées sur le web ne vise que la base locale de développement.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const LOCAL_PORT = "5434"; // voir docker-compose.yml

export type GuardResult = { ok: true } | { ok: false; reason: string };

export function checkLocalDatabase(env: { DATABASE_URL?: string; NODE_ENV?: string }): GuardResult {
  if (env.NODE_ENV === "production") {
    return { ok: false, reason: "NODE_ENV vaut production : import refusé." };
  }
  if (!env.DATABASE_URL) return { ok: false, reason: "DATABASE_URL n'est pas définie." };
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    return { ok: false, reason: "DATABASE_URL n'est pas une adresse valide." };
  }
  // Le motif de refus ne reprend jamais l'adresse complète : elle peut contenir un mot de passe.
  if (!url.protocol.startsWith("postgres") || !LOCAL_HOSTS.has(url.hostname)) {
    return { ok: false, reason: "DATABASE_URL ne vise pas la base locale (localhost)." };
  }
  if (url.port !== LOCAL_PORT) {
    return { ok: false, reason: `DATABASE_URL ne vise pas le port local ${LOCAL_PORT}.` };
  }
  return { ok: true };
}
