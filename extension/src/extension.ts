/**
 * Bakchich, extension VS Code.
 *
 * Principe : pendant que l'outil de code reflechit, son spinner affiche une ligne
 * sponsorisee a la place d'un verbe. Tu touches 50 % des revenus pub.
 *
 * Garanties :
 *   . Opt-in strict : RIEN n'est injecte tant que tu n'es pas connecte.
 *   . Reversible : restore() rend le spinner d'origine, a l'octet pres.
 *   . Visible : la barre de statut reflete TOUJOURS l'etat (connexion, gains,
 *     suspendu, hors-ligne...). Jamais de "rien ne se passe" muet.
 *   . Vie privee : on n'envoie que des impressions, le token et un id anonyme.
 */
import * as vscode from "vscode";
import * as crypto from "crypto";
import { injectAd, restore, claudeCodeDetected, _internals } from "./adapters/claudeCli";
import {
  fetchState,
  fetchBalance,
  fetchAuction,
  sendImpression,
  setDeviceId,
  apiUrl,
  type Ad,
  type Balance,
} from "./api";
import { getToken, signIn, signOut } from "./auth";

/* ------------------------------ Reglages ---------------------------------- */
const STATE_POLL_MS = 60_000; // rotation des pubs + kill-switch
const TICK_MS = 1_000; // granularite de l'accumulation de temps visible
const STARTUP_GRACE_MS = 15_000; // au lancement de claude : ecran d'accueil + saisie du 1er prompt, AUCUN spinner → on ne facture pas
const BALANCE_POLL_MS = 30_000; // rafraichissement du solde
const DEVICE_KEY = "bakchich.deviceId";

type Mode =
  | "signedOut"
  | "connecting"
  | "earning"
  | "killed"
  | "offline"
  | "incompatible"
  | "settingsError"
  | "paused";

/* ------------------------------ Etat global ------------------------------- */
let ctxRef: vscode.ExtensionContext;
let statusBar: vscode.StatusBarItem;
let out: vscode.OutputChannel;

let mode: Mode = "signedOut";
let balance: Balance | null = null;
let currentAd: Ad | null = null;
let paused = false;
let previewText: string | null = null; // apercu avant connexion, non creditant
let injected = false; // la pub est-elle REELLEMENT en place dans le spinner ?
// Terminaux qui font tourner `claude` (→ nb de commandes claude actives dedans).
// On ne credite que si le terminal ACTIF (celui regarde) est l'un d'eux.
const claudeTerminals = new Map<vscode.Terminal, number>();
let startupGraceUntil = 0; // horodatage jusqu'auquel on ne facture pas (demarrage claude)
let visibleMs = 0; // temps visible cumule pour l'impression en cours
let lastDiag = "jamais"; // dernier resultat de poll (pour le diagnostic)

let pollTimer: ReturnType<typeof setInterval> | undefined;
let tickTimer: ReturnType<typeof setInterval> | undefined;
let balanceTimer: ReturnType<typeof setInterval> | undefined;

/* ------------------------------ Utilitaires ------------------------------- */
function fmt(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

function log(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  out?.appendLine(`[${ts}] ${msg}`);
}

/** Nombre total de commandes `claude` en cours, tous terminaux confondus. */
function claudeRunCount(): number {
  let n = 0;
  for (const c of claudeTerminals.values()) n += c;
  return n;
}

/** On credite uniquement si la fenetre VS Code est au premier plan ET si une
 *  commande `claude` tourne REELLEMENT dans le terminal actif (detectee via la
 *  shell integration). On n'utilise plus le simple nom du terminal : un terminal
 *  nomme "claude" mais sans claude en cours (curseur au prompt, pas de spinner)
 *  ne credite donc plus rien. Fenetre reduite / non focalisee => pas de credit. */
function userIsPlausiblyWatching(): boolean {
  if (!vscode.window.state.focused) return false;
  const active = vscode.window.activeTerminal;
  return !!active && claudeTerminals.has(active);
}

/** La ligne de commande lance-t-elle le CLI `claude` ? */
function isClaudeCommand(commandLine: string): boolean {
  return /(^|[\s/\\])claude(\s|$)/i.test(commandLine);
}

/** Branche la detection des commandes `claude` via la shell integration, en
 *  retenant DANS QUEL terminal elles tournent. Si l'API n'est pas dispo (vieux
 *  VS Code / integration desactivee), la map reste vide → aucun gain (echec sur). */
function watchClaudeRuns(ctx: vscode.ExtensionContext): void {
  type ShellExecEvent = { terminal?: vscode.Terminal; execution?: { commandLine?: { value?: string } } };
  const win = vscode.window as unknown as {
    onDidStartTerminalShellExecution?: (cb: (e: ShellExecEvent) => void) => vscode.Disposable;
    onDidEndTerminalShellExecution?: (cb: (e: ShellExecEvent) => void) => vscode.Disposable;
  };
  const onStart = win.onDidStartTerminalShellExecution;
  const onEnd = win.onDidEndTerminalShellExecution;
  if (typeof onStart !== "function" || typeof onEnd !== "function") {
    log("shell integration indisponible : aucun gain en terminal ne sera compte.");
    return;
  }
  ctx.subscriptions.push(
    onStart((e) => {
      if (e.terminal && isClaudeCommand(e.execution?.commandLine?.value ?? "")) {
        claudeTerminals.set(e.terminal, (claudeTerminals.get(e.terminal) ?? 0) + 1);
        startupGraceUntil = Date.now() + STARTUP_GRACE_MS; // pas de facturation au demarrage
        log(`claude demarre dans un terminal (sessions: ${claudeRunCount()}).`);
      }
    }),
    onEnd((e) => {
      if (e.terminal && isClaudeCommand(e.execution?.commandLine?.value ?? "")) {
        const n = (claudeTerminals.get(e.terminal) ?? 0) - 1;
        if (n > 0) claudeTerminals.set(e.terminal, n);
        else claudeTerminals.delete(e.terminal);
      }
    }),
    // Filet de securite : un terminal ferme ne fait plus tourner claude.
    vscode.window.onDidCloseTerminal((t) => claudeTerminals.delete(t))
  );
}

type BakchichTerminalLink = vscode.TerminalLink & { url: string };

function installAdLinkProvider(ctx: vscode.ExtensionContext): void {
  ctx.subscriptions.push(
    vscode.window.registerTerminalLinkProvider({
      provideTerminalLinks(context) {
        if (!currentAd?.clickUrl) return [];
        const labels = [
          currentAd.linkLabel,
          currentAd.line.split(" ↗ ").at(-1),
          currentAd.campaignId,
        ].filter((v): v is string => Boolean(v));

        for (const label of labels) {
          const startIndex = context.line.indexOf(label);
          if (startIndex >= 0) {
            const link = new vscode.TerminalLink(
              startIndex,
              label.length,
              `Ouvrir ${label}`
            ) as BakchichTerminalLink;
            link.url = currentAd.clickUrl;
            return [link];
          }
        }
        return [];
      },
      handleTerminalLink(link) {
        void vscode.env.openExternal(vscode.Uri.parse((link as BakchichTerminalLink).url));
      },
    })
  );
}

function viewThresholdMs(): number {
  const s = vscode.workspace.getConfiguration("bakchich").get<number>("viewThresholdSeconds", 15);
  return Math.max(1, Math.min(60, s)) * 1000;
}

/* ------------------------------- Rendu UI --------------------------------- */
function render(): void {
  statusBar.command = "bakchich.menu";
  switch (mode) {
    case "signedOut":
      statusBar.text = "$(zap) Activer Bakchich";
      statusBar.tooltip =
        "Sois paye pendant que ton outil de code tourne. Clique pour te connecter." +
        (previewText ? `\n\nApercu d'une pub en cours : "${previewText}"` : "");
      break;
    case "connecting":
      statusBar.text = "$(sync~spin) Bakchich : connexion...";
      statusBar.tooltip = "Connexion en cours via Google dans ton navigateur.";
      break;
    case "earning":
      statusBar.text = balance
        ? `$(zap) Bakchich : ${fmt(balance.todayCents)} aujourd'hui (${fmt(balance.lifetimeCents)} au total)`
        : "$(zap) Bakchich : actif";
      statusBar.tooltip =
        "Tu gagnes pendant que ton outil de code tourne (50 % des revenus pub).\nClique pour ouvrir le menu." +
        (balance ? `\n\nGains aujourd'hui : ${fmt(balance.todayCents)}\nGains au total : ${fmt(balance.lifetimeCents)}` : "") +
        (currentAd ? `\n\nPub en cours : "${currentAd.line.split(" ↗ ")[0]}"` : "");
      break;
    case "killed":
      statusBar.text = "$(circle-slash) Bakchich (suspendu)";
      statusBar.tooltip = "Diffusion suspendue cote serveur. Ton spinner d'origine est restaure.";
      break;
    case "offline":
      statusBar.text = "$(cloud-offline) Bakchich (hors-ligne)";
      statusBar.tooltip = "Serveur injoignable pour le moment. On reessaie automatiquement.";
      break;
    case "incompatible":
      statusBar.text = "$(warning) Bakchich (outil introuvable)";
      statusBar.tooltip = "Le dossier local attendu (~/.claude) est introuvable. Lance ton outil de code, puis relance VS Code.";
      break;
    case "settingsError":
      statusBar.text = "$(warning) Bakchich (settings.json illisible)";
      statusBar.tooltip =
        "~/.claude/settings.json est invalide (JSON casse ou tableau au lieu d'un objet). " +
        "Tant qu'il n'est pas repare, la pub ne peut pas s'afficher et AUCUN gain n'est compte. " +
        "Ouvre le fichier et assure-toi que c'est un objet JSON { ... }.";
      break;
    case "paused":
      statusBar.text = "$(debug-pause) Bakchich (en pause)";
      statusBar.tooltip = "En pause : aucune pub, aucun gain. Clique pour reprendre.";
      break;
  }
  statusBar.show();
}

function setMode(m: Mode): void {
  if (mode !== m) log(`mode: ${mode} -> ${m}`);
  mode = m;
  render();
}

/* ------------------------------ Boucles ----------------------------------- */
async function poll(): Promise<void> {
  const token = await getToken(ctxRef);
  if (!token || paused) return;

  const res = await fetchState(token);
  lastDiag = res.kind === "ok" ? "ok" : res.kind === "http" ? `http ${res.status}` : "offline";

  if (res.kind === "offline") {
    setMode("offline"); // on garde currentAd : ne pas casser ce qui marche
    return;
  }
  if (res.kind === "http") {
    if (res.status === 401) {
      log("401 : session invalide, deconnexion.");
      await hardSignOut("Session expiree. Reconnecte-toi pour reprendre tes gains.");
    } else {
      setMode("offline");
    }
    return;
  }

  const state = res.data;
  if (state.killswitch) {
    currentAd = null;
    injected = false;
    restore();
    setMode("killed");
    return;
  }

  if (!claudeCodeDetected()) {
    currentAd = null;
    injected = false;
    setMode("incompatible");
    return;
  }

  if (state.ad && state.ad.line) {
    if (!currentAd || currentAd.campaignId !== state.ad.campaignId) {
      visibleMs = 0; // nouvelle pub : compteur propre
    }
    // On ne credite QUE si la pub est reellement injectee dans le spinner.
    // injectAd echoue si settings.json est invalide/illisible/non inscriptible :
    // dans ce cas, rien ne s'affiche, donc AUCUNE impression ne doit compter.
    injected = injectAd(state.ad.line);
    if (injected) {
      currentAd = state.ad;
      setMode("earning");
    } else {
      currentAd = null;
      visibleMs = 0;
      log("injection impossible (settings.json invalide ?) : aucun gain compte.");
      setMode("settingsError");
    }
  } else {
    currentAd = null;
    injected = false;
    restore();
    setMode("earning"); // connecte, en attente d'un annonceur
  }
}

async function tick(): Promise<void> {
  // RÈGLE : affichage = paiement, pas d'affichage = pas de paiement.
  // On n'accumule QUE pendant un affichage vérifié (pub injectée + commande
  // `claude` en cours dans un terminal + fenêtre au premier plan), et de façon
  // CONTINUE : toute interruption remet le compteur à zéro. Conséquence directe :
  // l'UI graphique de Claude (affichage non vérifiable) ne crédite RIEN.
  if (paused || mode !== "earning" || !currentAd || !injected || !userIsPlausiblyWatching()) {
    visibleMs = 0;
    return;
  }

  // Démarrage de claude : on ne facture pas (accueil + saisie du 1er prompt, pas de spinner).
  if (Date.now() < startupGraceUntil) {
    visibleMs = 0;
    return;
  }

  visibleMs += TICK_MS;
  if (visibleMs < viewThresholdMs()) return;

  // Seuil de visibilité atteint en continu : on compte une impression.
  visibleMs = 0;
  const token = await getToken(ctxRef);
  if (!token) return;
  const res = await sendImpression(token, currentAd.campaignId);
  if (res.kind === "ok" && res.data.ok && typeof res.data.creditCents === "number") {
    void refreshBalance();
  }
}

async function refreshBalance(): Promise<void> {
  const token = await getToken(ctxRef);
  if (!token) return;
  const res = await fetchBalance(token);
  if (res.kind === "ok") {
    balance = res.data;
    if (mode === "earning") render();
  }
}

function startLoops(): void {
  stopLoops();
  void poll();
  void refreshBalance();
  pollTimer = setInterval(() => void poll(), STATE_POLL_MS);
  tickTimer = setInterval(() => void tick(), TICK_MS);
  balanceTimer = setInterval(() => void refreshBalance(), BALANCE_POLL_MS);
}

function stopLoops(): void {
  if (pollTimer) clearInterval(pollTimer);
  if (tickTimer) clearInterval(tickTimer);
  if (balanceTimer) clearInterval(balanceTimer);
  pollTimer = tickTimer = balanceTimer = undefined;
}

/* --------------------------- Apercu (signed out) -------------------------- */
async function loadPreview(): Promise<void> {
  const res = await fetchAuction();
  if (res.kind === "ok" && res.data.queue[0]) {
    previewText = res.data.queue[0].text;
    if (mode === "signedOut") render();
  }
}

/* ------------------------------ Actions ----------------------------------- */
async function doSignIn(): Promise<void> {
  setMode("connecting");
  const token = await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: "Bakchich : connexion via Google..." },
    async () => signIn(ctxRef)
  );
  if (token) {
    visibleMs = 0;
    startLoops();
    vscode.window.showInformationMessage("Bakchich : connecte. Tes gains demarrent automatiquement.");
  } else {
    setMode("signedOut");
    void loadPreview();
    vscode.window.showWarningMessage("Bakchich : connexion annulee ou echouee. Reessaie quand tu veux.");
  }
}

async function hardSignOut(notice?: string): Promise<void> {
  stopLoops();
  currentAd = null;
  injected = false;
  balance = null;
  restore();
  await signOut(ctxRef);
  setMode("signedOut");
  void loadPreview();
  if (notice) vscode.window.showInformationMessage(`Bakchich : ${notice}`);
}

function togglePause(): void {
  if (mode === "signedOut" || mode === "connecting") return;
  paused = !paused;
  if (paused) {
    currentAd = null;
    injected = false;
    restore();
    setMode("paused");
  } else {
    startLoops();
  }
}

function doRestore(): void {
  currentAd = null;
  const ok = restore();
  vscode.window.showInformationMessage(
    ok ? "Bakchich : spinner restaure a son etat d'origine." : "Bakchich : rien a restaurer."
  );
}

function openDashboard(): void {
  void vscode.env.openExternal(vscode.Uri.parse("https://bakchich.dev/me"));
}

async function showMenu(): Promise<void> {
  const signedIn = Boolean(await getToken(ctxRef));
  type Item = vscode.QuickPickItem & { id: string };
  const items: Item[] = signedIn
    ? [
        { id: "dashboard", label: "$(graph) Mon tableau de bord", description: "Solde et virements sur bakchich.dev" },
        { id: "toggle", label: paused ? "$(play) Reprendre" : "$(debug-pause) Mettre en pause", description: paused ? "Reprendre les gains" : "Suspendre temporairement" },
        { id: "restore", label: "$(discard) Restaurer le spinner", description: "Rendre le spinner d'origine" },
        { id: "diagnose", label: "$(pulse) Diagnostic", description: "Verifier l'etat de la connexion" },
        { id: "signout", label: "$(sign-out) Se deconnecter", description: "Arreter et restaurer" },
      ]
    : [
        { id: "signin", label: "$(zap) Se connecter", description: "Active tes gains (Google)" },
        { id: "dashboard", label: "$(globe) Ouvrir bakchich.dev", description: "En savoir plus" },
        { id: "diagnose", label: "$(pulse) Diagnostic", description: "Verifier l'etat de la connexion" },
      ];

  const pick = await vscode.window.showQuickPick(items, { placeHolder: "Bakchich" });
  if (!pick) return;
  switch (pick.id) {
    case "signin": return void doSignIn();
    case "signout": return void hardSignOut("deconnecte. Spinner d'origine restaure.");
    case "toggle": return togglePause();
    case "restore": return doRestore();
    case "dashboard": return openDashboard();
    case "diagnose": return diagnose();
  }
}

async function diagnose(): Promise<void> {
  const token = await getToken(ctxRef);
  out.clear();
  out.appendLine("=== Diagnostic Bakchich ===");
  out.appendLine(`Version       : ${ctxRef.extension.packageJSON.version}`);
  out.appendLine(`API           : ${apiUrl()}`);
  out.appendLine(`Connecte      : ${token ? "oui" : "non"}`);
  out.appendLine(`Outil local   : ${claudeCodeDetected() ? "detecte" : "INTROUVABLE (~/.claude absent)"}`);
  out.appendLine(`settings.json : ${_internals.settingsPath()}`);
  out.appendLine(`Backup actif  : ${_internals.backupPath()}`);
  out.appendLine(`Mode          : ${mode}`);
  out.appendLine(`Claude actif  : ${claudeRunCount() > 0 ? `oui (${claudeRunCount()} session(s))` : "non"}`);
  out.appendLine(`Fenetre regardee : ${userIsPlausiblyWatching() ? "oui (credite)" : "non (pas de gain)"}`);
  out.appendLine(`Dernier poll  : ${lastDiag}`);
  out.appendLine(`Device ID     : ${ctxRef.globalState.get<string>(DEVICE_KEY) ?? "n/d"}`);
  out.appendLine(`Pub en cours  : ${currentAd ? currentAd.campaignId : "aucune"}`);
  out.appendLine(`Solde         : ${balance ? `${fmt(balance.todayCents)} aujourd'hui / ${fmt(balance.lifetimeCents)} au total` : "n/d"}`);

  if (token) {
    const res = await fetchState(token);
    out.appendLine(`Test /api/state : ${res.kind === "ok" ? "OK" : res.kind === "http" ? `HTTP ${res.status}` : "hors-ligne"}`);
  }
  out.show(true);
}

/* ------------------------------ Cycle de vie ------------------------------ */
export async function activate(ctx: vscode.ExtensionContext): Promise<void> {
  ctxRef = ctx;
  out = vscode.window.createOutputChannel("Bakchich");

  // Identifiant d'appareil anonyme (stable, non lie a l'identite).
  let deviceId = ctx.globalState.get<string>(DEVICE_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    await ctx.globalState.update(DEVICE_KEY, deviceId);
  }
  setDeviceId(deviceId);

  statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
  ctx.subscriptions.push(statusBar, out);

  // Detection des sessions `claude` en terminal : le credit n'a lieu QUE pendant.
  watchClaudeRuns(ctx);
  installAdLinkProvider(ctx);

  ctx.subscriptions.push(
    vscode.commands.registerCommand("bakchich.signIn", () => void doSignIn()),
    vscode.commands.registerCommand("bakchich.signOut", () => void hardSignOut("deconnecte. Spinner d'origine restaure.")),
    vscode.commands.registerCommand("bakchich.menu", () => void showMenu()),
    vscode.commands.registerCommand("bakchich.toggle", () => togglePause()),
    vscode.commands.registerCommand("bakchich.restore", () => doRestore()),
    vscode.commands.registerCommand("bakchich.diagnose", () => void diagnose()),
    vscode.commands.registerCommand("bakchich.openDashboard", () => openDashboard())
  );

  const token = await getToken(ctx);
  if (token) {
    startLoops();
  } else {
    setMode("signedOut");
    void loadPreview();

    // Notification first-run (une seule fois). Opt-in strict, rien n'est injecte.
    const seen = ctx.globalState.get<boolean>("bakchich.firstRunNotifShown", false);
    if (!seen) {
      await ctx.globalState.update("bakchich.firstRunNotifShown", true);
      void vscode.window
        .showInformationMessage(
          "Bakchich est installe. Active-le pour que le spinner affiche une ligne pub pendant qu'il tourne, et touche 50 % des revenus. Rien ne s'injecte tant que tu n'es pas connecte.",
          "Activer mes gains"
        )
        .then((choice) => {
          if (choice === "Activer mes gains") void doSignIn();
        });
    }
  }
}

export function deactivate(): void {
  stopLoops();
  restore(); // desinstallation / fermeture : spinner d'origine, toujours.
}
