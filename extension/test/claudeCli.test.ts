/**
 * Le filet de sécurité : settings.json ne doit JAMAIS être corrompu,
 * et restore() doit toujours rendre l'état d'origine exact.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

let tmpHome: string;

beforeEach(() => {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), "bakchich-test-"));
  process.env.BAKCHICH_CLAUDE_DIR = path.join(tmpHome, ".claude");
  fs.mkdirSync(path.join(tmpHome, ".claude"));
});

afterEach(() => {
  delete process.env.BAKCHICH_CLAUDE_DIR;
  vi.restoreAllMocks();
  fs.rmSync(tmpHome, { recursive: true, force: true });
});

function settingsPath() {
  return path.join(tmpHome, ".claude", "settings.json");
}

async function freshAdapter() {
  vi.resetModules();
  return await import("../src/adapters/claudeCli");
}

describe("injection / restauration du spinner", () => {
  it("injecte la pub et préserve les autres champs", async () => {
    fs.writeFileSync(settingsPath(), JSON.stringify({ theme: "dark", spinnerVerbs: ["Percolating"] }));
    const { injectAd } = await freshAdapter();
    expect(injectAd("Pub Test ↗")).toBe(true);
    const after = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    expect(after.spinnerVerbs).toEqual(["Pub Test ↗"]);
    expect(after.theme).toBe("dark"); // rien d'autre n'a bougé
  });

  it("restaure les verbes d'origine exacts", async () => {
    fs.writeFileSync(settingsPath(), JSON.stringify({ spinnerVerbs: ["A", "B"] }));
    const { injectAd, restore } = await freshAdapter();
    injectAd("Pub");
    restore();
    const after = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    expect(after.spinnerVerbs).toEqual(["A", "B"]);
  });

  it("retire le champ si l'utilisateur n'en avait pas", async () => {
    fs.writeFileSync(settingsPath(), JSON.stringify({ theme: "dark" }));
    const { injectAd, restore } = await freshAdapter();
    injectAd("Pub");
    restore();
    const after = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    expect("spinnerVerbs" in after).toBe(false);
    expect(after.theme).toBe("dark");
  });

  it("ne touche à RIEN si le JSON est cassé", async () => {
    fs.writeFileSync(settingsPath(), "{ json: cassé !!!");
    const { injectAd } = await freshAdapter();
    expect(injectAd("Pub")).toBe(false);
    expect(fs.readFileSync(settingsPath(), "utf8")).toBe("{ json: cassé !!!"); // intact
  });

  it("ne touche à RIEN si settings.json est un tableau JSON (pas un objet)", async () => {
    // Cas réel : Claude Code refuse un settings.json qui est un tableau.
    // typeof [] === "object" → on doit explicitement le rejeter, sinon on
    // réécrirait un tableau corrompu et le spinner ne s'afficherait jamais.
    const arr = '[{ "foo": "bar" }]';
    fs.writeFileSync(settingsPath(), arr);
    const { injectAd } = await freshAdapter();
    expect(injectAd("Pub")).toBe(false);
    expect(fs.readFileSync(settingsPath(), "utf8")).toBe(arr); // intact
  });

  it("ne fait rien si Claude Code est absent", async () => {
    fs.rmSync(path.join(tmpHome, ".claude"), { recursive: true });
    const { injectAd, claudeCodeDetected } = await freshAdapter();
    expect(claudeCodeDetected()).toBe(false);
    expect(injectAd("Pub")).toBe(false);
  });

  it("restore() est toujours sans danger même sans injection préalable", async () => {
    fs.writeFileSync(settingsPath(), JSON.stringify({ spinnerVerbs: ["X"] }));
    const { restore } = await freshAdapter();
    expect(restore()).toBe(true);
    const after = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    expect(after.spinnerVerbs).toEqual(["X"]);
  });

  // --- Tests de robustesse supplémentaires ---

  it("restore() restitue des spinnerVerbs d'origine multiples exactement", async () => {
    // L'utilisateur avait déjà customisé ses verbes → on doit les rendre à l'identique.
    const original = ["Percolating...", "Brewing...", "Thinking hard...", "Hallucinating..."];
    fs.writeFileSync(settingsPath(), JSON.stringify({ theme: "dark", spinnerVerbs: original }));
    const { injectAd, restore } = await freshAdapter();

    injectAd("Scaleway : le cloud européen ↗ bakch.li/c/abc");
    // Vérification intermédiaire : la pub est bien en place.
    const mid = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    expect(mid.spinnerVerbs).toEqual(["Scaleway : le cloud européen ↗ bakch.li/c/abc"]);

    restore();
    const after = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    // Les verbes d'origine doivent être restaurés bit pour bit.
    expect(after.spinnerVerbs).toEqual(original);
    // Les autres champs sont intacts.
    expect(after.theme).toBe("dark");
  });

  it("injectAd() renvoie false et ne modifie rien si le JSON est corrompu", async () => {
    const corrupt = '{ "spinnerVerbs": ["ok"], broken json !!!';
    fs.writeFileSync(settingsPath(), corrupt);
    const { injectAd } = await freshAdapter();

    const result = injectAd("Pub qui ne devrait jamais apparaître");
    expect(result).toBe(false);
    // Le fichier doit rester intact, octet par octet.
    expect(fs.readFileSync(settingsPath(), "utf8")).toBe(corrupt);
  });

  it("restore() est un no-op sûr s'il n'y a pas de backup (jamais injecté)", async () => {
    // Scénario : l'extension est installée, backup absent → restore() ne doit rien changer.
    const initial = { theme: "light", spinnerVerbs: ["Ready..."] };
    fs.writeFileSync(settingsPath(), JSON.stringify(initial));
    const { restore, _internals } = await freshAdapter();

    // Pas de fichier backup.
    expect(fs.existsSync(_internals.backupPath())).toBe(false);

    const result = restore();
    expect(result).toBe(true); // succès sans rien faire

    const after = JSON.parse(fs.readFileSync(settingsPath(), "utf8"));
    // settings.json est identique à l'original.
    expect(after).toEqual(initial);
    // Toujours pas de backup créé.
    expect(fs.existsSync(_internals.backupPath())).toBe(false);
  });
});
