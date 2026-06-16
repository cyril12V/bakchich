/** Helper fetch typé - tous les appels en relatif same-origin */

export const VS_CODE_EXTENSION_URL =
  "https://marketplace.visualstudio.com/items?itemName=bakchich.bakchich";

/** Clé localStorage pour le token dev */
export const TOKEN_KEY = "bakchich.token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  clearRole();
}

/* -------------------------------------------------------------------------- */
/*  Rôle (contexte) — séparation dev / annonceur côté web.                    */
/*  Un même compte Google peut être les deux, mais l'interface n'affiche      */
/*  qu'UN seul univers à la fois : celui par lequel on s'est connecté.        */
/*  100 % côté client (localStorage) — n'impacte ni le backend ni le login    */
/*  de l'extension VS Code (qui a son propre stockage).                       */
/* -------------------------------------------------------------------------- */
export type Role = "dev" | "advertiser";
const ROLE_KEY = "bakchich.role";

export function getRole(): Role | null {
  const r = localStorage.getItem(ROLE_KEY);
  return r === "dev" || r === "advertiser" ? r : null;
}

/** Événement interne pour que le Header (et autres) réagissent au changement de rôle. */
function notifyRoleChange(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("bakchich:role"));
}

export function setRole(role: Role): void {
  localStorage.setItem(ROLE_KEY, role);
  notifyRoleChange();
}

export function clearRole(): void {
  localStorage.removeItem(ROLE_KEY);
  notifyRoleChange();
}

/** Formater des centimes en euros FR */
export function formatEur(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

/** Parser une saisie euro FR (virgule comme séparateur décimal) */
export function parseEurInput(value: string): number {
  return Math.round(parseFloat(value.replace(",", ".")) * 100);
}

/** Fetch authentifie (Bearer token) */
async function authFetch(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error("Unauthorized");
  }
  return response;
}

/** Fetch public (sans auth) */
async function publicFetch(
  input: RequestInfo,
  init?: RequestInit
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  return fetch(input, { ...init, headers });
}

/* Types */
export interface AuctionItem {
  id: string;
  text: string;
  brand_name: string | null;
  bid_cents: number;
  blocks: number;
  impressions: number;
  created_at: number;
  impressions_left: number;
}

export interface AuctionResponse {
  queue: AuctionItem[];
  minBidCents: number;
}

export interface LeaderboardEntry {
  brand_name: string;
  brand_icon: string | null;
  spent_cents: number;
  impressions: number;
}

export interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
}

export interface CampaignPayload {
  advertiserEmail: string;
  text: string;
  url: string;
  bidCents: number;
  blocks: number;
  brandName?: string;
  brandIcon?: string;
  showOnLeaderboard?: boolean;
}

export interface CampaignResponse {
  ok: boolean;
  campaignId: string;
  status: string;
  checkoutUrl?: string;
  message?: string;
}

export interface BalanceResponse {
  todayCents: number;
  lifetimeCents: number;
  availableCents: number;
}

export interface HistoryEvent {
  type: string;
  credit_cents: number;
  created_at: number;
  campaign_text: string | null;
}

export interface HistoryResponse {
  events: HistoryEvent[];
}

export interface ConnectStatusResponse {
  connected: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted?: boolean;
}

export interface ProfileResponse {
  email: string;
  name: string;
}

export type CampaignStatus =
  | "pending_payment"
  | "pending"
  | "active"
  | "exhausted"
  | "rejected"
  | "paused";

export interface Campaign {
  id: string;
  text: string;
  url: string;
  bid_cents: number;
  blocks: number;
  impressions: number;
  clicks: number;
  status: CampaignStatus;
  created_at: number;
  brand_name: string | null;
  show_on_leaderboard: boolean;
}

export interface CampaignsResponse {
  campaigns: Campaign[];
}

export interface PayoutResponse {
  ok: boolean;
  status: "paid" | "pending_review";
  amountCents: number;
  message?: string;
}

export interface ApiError {
  error: string;
  availableCents?: number;
  minPayoutCents?: number;
}

/* API calls */

export async function fetchAuction(): Promise<AuctionResponse> {
  const res = await publicFetch("/api/auction");
  if (!res.ok) throw new Error("Erreur chargement enchères");
  return res.json() as Promise<AuctionResponse>;
}

export async function fetchLeaderboard(): Promise<LeaderboardResponse> {
  const res = await publicFetch("/api/leaderboard");
  if (!res.ok) throw new Error("Erreur chargement leaderboard");
  return res.json() as Promise<LeaderboardResponse>;
}

export async function createCampaign(
  payload: CampaignPayload
): Promise<CampaignResponse> {
  // Token optionnel : si l'annonceur est connecte, la campagne est rattachee a
  // son compte (et apparait dans son espace). Sinon, création anonyme par email.
  const token = getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch("/api/campaigns", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as CampaignResponse | ApiError;
  if (!res.ok) {
    const err = data as ApiError;
    throw new ApiErrorClass(err.error, res.status);
  }
  return data as CampaignResponse;
}

export async function fetchBalance(): Promise<BalanceResponse> {
  const res = await authFetch("/api/me/balance");
  return res.json() as Promise<BalanceResponse>;
}

export async function fetchHistory(): Promise<HistoryResponse> {
  const res = await authFetch("/api/me/history");
  return res.json() as Promise<HistoryResponse>;
}

export async function fetchConnectStatus(): Promise<ConnectStatusResponse> {
  const res = await authFetch("/api/me/connect/status");
  return res.json() as Promise<ConnectStatusResponse>;
}

export async function startConnectOnboarding(): Promise<string> {
  const res = await authFetch("/api/me/connect/onboard", { method: "POST" });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  // Aucune URL valide (Stripe Connect non activé, erreur réseau…) → on lève une
  // erreur explicite au lieu de naviguer vers une URL "undefined" (page blanche).
  if (!res.ok || !data.url) {
    const code =
      data.error ?? (res.status === 503 ? "stripe_not_configured" : "connect_unavailable");
    throw new ApiErrorClass(code, res.status);
  }
  return data.url;
}

export async function requestPayout(): Promise<PayoutResponse> {
  const res = await authFetch("/api/me/payout", { method: "POST" });
  const data = (await res.json()) as PayoutResponse | ApiError;
  if (!res.ok) {
    const err = data as ApiError;
    throw new ApiErrorWithDetails(err.error, res.status, err.availableCents, err.minPayoutCents);
  }
  return data as PayoutResponse;
}

export async function logoutUser(): Promise<void> {
  await authFetch("/api/me/logout", { method: "POST" });
  clearToken();
}

export async function fetchProfile(): Promise<ProfileResponse> {
  const res = await authFetch("/api/me/profile");
  return res.json() as Promise<ProfileResponse>;
}

export async function fetchCampaigns(): Promise<CampaignsResponse> {
  const res = await authFetch("/api/me/campaigns");
  return res.json() as Promise<CampaignsResponse>;
}

/** Classe erreur API avec code */
export class ApiErrorClass extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
    this.name = "ApiError";
  }
}

export class ApiErrorWithDetails extends ApiErrorClass {
  constructor(
    code: string,
    status: number,
    public readonly availableCents?: number,
    public readonly minPayoutCents?: number
  ) {
    super(code, status);
  }
}

/** Messages d'erreur FR pour les codes API */
export function apiErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    text_length_3_60: "Le texte doit faire entre 3 et 60 caractères.",
    min_bid_1_euro: "Le bid minimum est de 1,00 EUR.",
    blocks_min_1: "Il faut au moins 1 bloc.",
    https_only: "L'URL doit commencer par https://.",
    bad_email: "Adresse email invalide.",
    brand_name_required: "Le nom de marque est obligatoire.",
    brand_icon_required: "L'icône de marque est obligatoire.",
    bad_brand_icon: "L'icône doit etre PNG, JPG ou WebP et faire moins de 64 Ko.",
    bad_request: "Requête invalide. Vérifiez tous les champs.",
    below_min: "Solde insuffisant pour un retrait.",
    connect_incomplete: "Configurez d'abord vos virements Stripe.",
    stripe_not_configured: "Les paiements ne sont pas encore configurés. Revenez bientôt.",
    connect_unavailable: "Les virements ne sont pas encore activés côté Stripe (Stripe Connect). On s'en occupe, réessaie bientôt.",
    stripe_error: "Les virements ne sont pas encore activés côté Stripe (Stripe Connect). On s'en occupe, réessaie bientôt.",
    transfer_failed: "Erreur lors du virement. Réessayez dans quelques instants.",
    checkout_failed: "Erreur lors de la création du paiement. Réessayez.",
  };
  return messages[code] ?? "Une erreur est survenue.";
}
