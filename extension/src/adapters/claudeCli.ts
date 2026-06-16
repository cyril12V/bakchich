/**
 * Adaptateur Claude Code CLI.
 *
 * Le cœur de Bakchich : on remplace les verbes du spinner ("Percolating…")
 * par UNE ligne sponsorisée, en modifiant le champ `spinnerVerbs` de
 * ~/.claude/settings.json : un paramètre que Claude Code expose volontairement.
 *
 * RÈGLES DE SÉCURITÉ (non négociables) :
 * 1. On ne touche QU'À `spinnerVerbs`. Jamais un autre champ.
 * 2. Avant la première injection, on sauvegarde les verbes d'origine.
 * 3. restore() remet l'état d'origine : appelé à la déconnexion,
 *    à la désactivation de l'extension, en pause et par le kill-switch.
 * 4. Écriture atomique (fichier temporaire + rename) : settings.json
 *    ne peut JAMAIS se retrouver à moitié écrit.
 * 5. Si le JSON est invalide ou illisible : on ne fait RIEN.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/** Résolution paresseuse : testable et robuste si HOME change. */
function claudeDir(): string {
  return process.env.BAKCHICH_CLAUDE_DIR ?? path.join(os.homedir(), ".claude");
}
const settingsPath = () => path.join(claudeDir(), "settings.json");
const backupPath = () => path.join(claudeDir(), ".bakchich-spinner-backup.json");

type ClaudeSettings = Record<string, unknown> & { spinnerVerbs?: string[] };

function readSettings(): ClaudeSettings | null {
  try {
    if (!fs.existsSync(settingsPath())) return null;
    const raw = fs.readFileSync(settingsPath(), "utf8");
    const parsed = JSON.parse(raw);
    // Attention : typeof [] === "object". Un tableau JSON n'est PAS un settings
    // valide pour Claude Code → on refuse, sinon on écrirait un tableau corrompu.
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    return parsed as ClaudeSettings;
  } catch {
    return null; // JSON cassé ou illisible → on ne touche à rien.
  }
}

/** Écriture atomique : tmp + rename, pour ne jamais corrompre le fichier. */
function writeSettings(settings: ClaudeSettings): boolean {
  try {
    const tmp = settingsPath() + ".bakchich-tmp";
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + "\n", "utf8");
    fs.renameSync(tmp, settingsPath());
    return true;
  } catch {
    return false;
  }
}

/** Sauvegarde les verbes d'origine (une seule fois). */
function backupOriginal(settings: ClaudeSettings): void {
  if (fs.existsSync(backupPath())) return; // déjà sauvegardé
  const original = {
    hadSpinnerVerbs: settings.spinnerVerbs !== undefined,
    spinnerVerbs: settings.spinnerVerbs ?? null,
    savedAt: new Date().toISOString(),
  };
  fs.writeFileSync(backupPath(), JSON.stringify(original, null, 2), "utf8");
}

/**
 * Injecte la ligne sponsorisée dans le spinner.
 * @returns true si l'injection a réussi.
 */
export function injectAd(adLine: string): boolean {
  const exists = fs.existsSync(settingsPath());
  let settings = readSettings();
  if (settings === null) {
    // Fichier PRÉSENT mais illisible/invalide (ex. tableau) → on ne détruit RIEN.
    if (exists) return false;
    // Fichier ABSENT mais ~/.claude présent → on crée une base propre. L'utilisateur
    // n'a aucune manip à faire ; backupOriginal retiendra "pas de spinnerVerbs"
    // d'origine, donc restore() rendra le fichier à {}.
    if (!claudeCodeDetected()) return false;
    settings = {};
  }

  // Idempotent : si la même pub est déjà en place, rien à faire.
  const current = settings.spinnerVerbs;
  if (Array.isArray(current) && current.length === 1 && current[0] === adLine) {
    return true;
  }

  backupOriginal(settings);
  settings.spinnerVerbs = [adLine];
  return writeSettings(settings);
}

/** Restaure l'état d'origine du spinner. Toujours sans risque d'appeler. */
export function restore(): boolean {
  const settings = readSettings();
  if (settings === null) return false;

  if (!fs.existsSync(backupPath())) {
    // Pas de backup = on n'a jamais injecté. Rien à faire.
    return true;
  }

  try {
    const backup = JSON.parse(fs.readFileSync(backupPath(), "utf8"));
    if (backup.hadSpinnerVerbs && Array.isArray(backup.spinnerVerbs)) {
      settings.spinnerVerbs = backup.spinnerVerbs;
    } else {
      delete settings.spinnerVerbs; // l'utilisateur n'en avait pas → on retire le champ
    }
    const ok = writeSettings(settings);
    if (ok) fs.unlinkSync(backupPath());
    return ok;
  } catch {
    return false;
  }
}

/** Claude Code est-il installé sur cette machine ? */
export function claudeCodeDetected(): boolean {
  return fs.existsSync(claudeDir());
}

export const _internals = { settingsPath, backupPath, readSettings };
