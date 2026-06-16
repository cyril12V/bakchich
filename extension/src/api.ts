/**
 * Client API Bakchich : tout ce que l'extension échange avec le serveur.
 *
 * Confidentialité : on n'envoie QUE des événements pub (impressions), le token
 * d'auth et un identifiant d'appareil anonyme. JAMAIS de code, de prompt, de
 * complétion, ni de nom de fichier.
 *
 * Chaque appel renvoie un ApiResult discriminé pour que l'UI distingue
 * proprement : succès / erreur HTTP (ex. 401 = session invalide) / hors-ligne.
 */
import * as vscode from "vscode";
import * as crypto from "crypto";

export interface Ad {
  campaignId: string;
  /** Ligne affichée dans le spinner, ex: "Scaleway : le cloud européen ↗ …/c/abc?u=…" */
  line: string;
}

export interface ServerState {
  killswitch: boolean;
  ad: Ad | null;
}

export interface Balance {
  todayCents: number;
  lifetimeCents: number;
  availableCents?: number;
}

export interface ImpressionResult {
  ok: boolean;
  creditCents?: number;
  /** Raison d'un refus côté serveur : "daily_cap" | "too_fast" | "not_current_ad" | "killswitch" */
  reason?: string;
}

export interface AuctionItem {
  id: string;
  text: string;
  brand_name: string | null;
  bid_cents: number;
}

export interface AuctionResponse {
  queue: AuctionItem[];
  minBidCents: number;
}

/** Résultat d'appel discriminé : succès, erreur HTTP, ou réseau injoignable. */
export type ApiResult<T> =
  | { kind: "ok"; data: T }
  | { kind: "http"; status: number }
  | { kind: "offline" };

/** Identifiant d'appareil anonyme (posé par extension.ts au démarrage). */
let deviceId = "";
export function setDeviceId(id: string): void {
  deviceId = id;
}

export function apiUrl(): string {
  return vscode.workspace
    .getConfiguration("bakchich")
    .get<string>("apiUrl", "https://api.bakchich.dev");
}

async function request<T>(
  pathname: string,
  token: string | null,
  body?: unknown
): Promise<ApiResult<T>> {
  try {
    const res = await fetch(apiUrl() + pathname, {
      method: body ? "POST" : "GET",
      headers: {
        "content-type": "application/json",
        ...(deviceId ? { "x-device-id": deviceId } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { kind: "http", status: res.status };
    return { kind: "ok", data: (await res.json()) as T };
  } catch {
    return { kind: "offline" }; // réseau coupé, timeout, DNS… → silencieux côté UX
  }
}

/** Pub gagnante + état du kill-switch, en un seul appel. */
export function fetchState(token: string): Promise<ApiResult<ServerState>> {
  return request<ServerState>("/api/state", token);
}

/** Solde du dev (aujourd'hui + cumul). */
export function fetchBalance(token: string): Promise<ApiResult<Balance>> {
  return request<Balance>("/api/me/balance", token);
}

/** Enchère publique : utilisée pour l'aperçu avant connexion (aucun gain). */
export function fetchAuction(): Promise<ApiResult<AuctionResponse>> {
  return request<AuctionResponse>("/api/auction", null);
}

/** Tick d'impression (idempotent grâce à eventId). */
export function sendImpression(
  token: string,
  campaignId: string
): Promise<ApiResult<ImpressionResult>> {
  return request<ImpressionResult>("/api/events", token, {
    eventId: crypto.randomUUID(),
    type: "impression",
    campaignId,
    ts: Date.now(),
  });
}
