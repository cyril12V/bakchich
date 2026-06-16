/**
 * Connexion Bakchich (OAuth Google via le backend).
 *
 * Flux :
 *   1. On ouvre un mini-serveur HTTP local sur 127.0.0.1:<port aléatoire>.
 *   2. On ouvre le navigateur sur {API}/auth/google/start?redirect_port=<port>.
 *   3. Le backend gère Google, puis redirige vers http://127.0.0.1:<port>/?token=…
 *   4. Le mini-serveur récupère le token et le range dans le SecretStorage de
 *      VS Code (trousseau de l'OS) : jamais en clair sur le disque.
 *
 * Robustesse : timeout, gestion d'erreur, page de retour soignée, et fermeture
 * propre du serveur dans tous les cas.
 */
import * as vscode from "vscode";
import * as http from "http";
import { apiUrl } from "./api";

const TOKEN_KEY = "bakchich.token";
const SIGNIN_TIMEOUT_MS = 3 * 60 * 1000; // 3 min puis on abandonne proprement

export async function getToken(ctx: vscode.ExtensionContext): Promise<string | null> {
  return (await ctx.secrets.get(TOKEN_KEY)) ?? null;
}

export async function signOut(ctx: vscode.ExtensionContext): Promise<void> {
  await ctx.secrets.delete(TOKEN_KEY);
}

/** Page HTML renvoyée dans le navigateur à la fin du flux (succès ou échec). */
function resultPage(ok: boolean): string {
  const title = ok ? "Connecté à Bakchich ✅" : "Échec de connexion ❌";
  const msg = ok
    ? "Tu peux fermer cet onglet et retourner dans VS Code. Tes gains démarrent automatiquement."
    : "Quelque chose s'est mal passé. Retourne dans VS Code et relance « Bakchich : Se connecter ».";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
       background:#0d0d0d;color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  .card{max-width:420px;padding:2.5rem 2rem;text-align:center}
  .badge{width:64px;height:64px;border-radius:16px;background:#c8f24c;color:#0d0d0d;
         display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:800;margin:0 auto 1.25rem}
  h1{font-size:1.35rem;margin:0 0 .5rem}
  p{color:#a3a3a3;line-height:1.6;margin:0}
</style></head>
<body><div class="card"><div class="badge">${ok ? "✓" : "!"}</div>
<h1>${title}</h1><p>${msg}</p></div></body></html>`;
}

/**
 * Lance le flux de connexion. Résout avec le token (succès) ou null (annulation,
 * timeout, erreur). N'écrit le token QUE si on en reçoit un valide.
 */
export async function signIn(ctx: vscode.ExtensionContext): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (token: string | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      try {
        server.close();
      } catch {
        /* déjà fermé */
      }
      resolve(token);
    };

    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const token = url.searchParams.get("token");
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(resultPage(Boolean(token)));
      if (token) {
        await ctx.secrets.store(TOKEN_KEY, token);
        finish(token);
      } else {
        finish(null);
      }
    });

    server.on("error", () => finish(null));

    const timeout = setTimeout(() => finish(null), SIGNIN_TIMEOUT_MS);

    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      if (!port) return finish(null);
      const target = `${apiUrl()}/auth/google/start?redirect_port=${port}`;
      void vscode.env.openExternal(vscode.Uri.parse(target)).then(
        (opened) => {
          if (!opened) finish(null); // l'utilisateur a refusé l'ouverture du navigateur
        },
        () => finish(null)
      );
    });
  });
}
