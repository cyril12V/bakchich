import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CampaignForm } from "@/components/forms/CampaignForm";
import {
  getToken,
  setToken,
  clearToken,
  getRole,
  setRole,
  logoutUser,
  fetchProfile,
  fetchCampaigns,
  fetchAuction,
  formatEur,
  type ProfileResponse,
  type Campaign,
  type CampaignStatus,
  type AuctionResponse,
} from "@/lib/api";

/* -------- Logo Google -------- */
function GoogleLogo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      style={{ display: "inline-block", flexShrink: 0 }}
    >
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
    </svg>
  );
}

/* -------- Mapping statuts FR -------- */
const STATUS_LABELS: Record<CampaignStatus, string> = {
  pending_payment: "Paiement en attente",
  pending: "En modération",
  active: "Active",
  exhausted: "Terminée",
  rejected: "Refusée",
  paused: "En pause",
};

const STATUS_COLORS: Record<CampaignStatus, { bg: string; color: string; border: string }> = {
  pending_payment: { bg: "rgba(251,191,36,0.12)", color: "#92400e", border: "rgba(251,191,36,0.4)" },
  pending: { bg: "rgba(200,242,76,0.15)", color: "var(--color-accent-deep)", border: "rgba(97,160,26,0.3)" },
  active: { bg: "rgba(97,160,26,0.12)", color: "var(--color-accent-deep)", border: "rgba(97,160,26,0.3)" },
  exhausted: { bg: "var(--color-gray-100)", color: "var(--color-gray-500)", border: "var(--color-gray-200)" },
  rejected: { bg: "rgba(239,68,68,0.08)", color: "#b91c1c", border: "rgba(239,68,68,0.3)" },
  paused: { bg: "var(--color-gray-100)", color: "var(--color-gray-600)", border: "var(--color-gray-200)" },
};

/* -------- Badge statut -------- */
function StatusBadge({ status }: { status: CampaignStatus }) {
  const styles = STATUS_COLORS[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "0.2rem 0.625rem",
        borderRadius: "9999px",
        fontSize: "0.75rem",
        fontWeight: 600,
        fontFamily: "var(--font-body)",
        backgroundColor: styles.bg,
        color: styles.color,
        border: `1px solid ${styles.border}`,
        whiteSpace: "nowrap",
      }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

/* -------- Ecran de connexion annonceur -------- */
function LoginScreen({ error }: { error: boolean }) {
  const reassurances = [
    "Lance une campagne en quelques minutes",
    "Suis impressions, clics et statut en temps réel",
    "Diffusion immédiate, modération automatique",
  ];
  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "5rem",
          alignItems: "center",
          maxWidth: "900px",
          width: "100%",
        }}
        className="adv-login-grid"
      >
        {/* Colonne gauche : texte */}
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              fontWeight: 800,
              color: "var(--color-black)",
              marginBottom: "0.875rem",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            Espace annonceur
          </h1>
          <p
            style={{
              fontSize: "1rem",
              color: "var(--color-gray-500)",
              fontFamily: "var(--font-body)",
              lineHeight: 1.6,
              marginBottom: "1.75rem",
            }}
          >
            Connecte-toi pour gérer tes campagnes et suivre tes résultats.
          </p>

          <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {reassurances.map((item) => (
              <li
                key={item}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.625rem",
                  fontSize: "0.9375rem",
                  color: "var(--color-gray-600)",
                  fontFamily: "var(--font-body)",
                  lineHeight: 1.5,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    marginTop: "3px",
                    color: "var(--color-black)",
                    backgroundColor: "var(--color-accent)",
                    borderRadius: "50%",
                    width: "16px",
                    height: "16px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.625rem",
                    fontWeight: 800,
                  }}
                >
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Colonne droite : carte de connexion */}
        <div
          style={{
            backgroundColor: "var(--color-white)",
            border: "1px solid var(--color-gray-200)",
            borderRadius: "var(--radius-xl)",
            padding: "2.5rem 2rem",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
            textAlign: "center",
          }}
        >
          <img src="/favicon.png" alt="Logo Bakchich" width={40} height={40} style={{ objectFit: "contain" }} />

          <div>
            <p
              style={{
                fontSize: "1.0625rem",
                fontWeight: 600,
                color: "var(--color-black)",
                fontFamily: "var(--font-display)",
                marginBottom: "0.25rem",
              }}
            >
              Connexion annonceur
            </p>
            <p style={{ fontSize: "0.875rem", color: "var(--color-gray-400)", fontFamily: "var(--font-body)" }}>
              Accès via Google uniquement
            </p>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-black)",
                backgroundColor: "var(--color-gray-50)",
                fontSize: "0.875rem",
                color: "var(--color-black)",
                fontFamily: "var(--font-body)",
              }}
            >
              Connexion échouée. Réessayez.
            </div>
          )}

          <a href="/auth/google/start?web=1&next=/annonceurs/espace" style={{ textDecoration: "none", width: "100%" }}>
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.625rem",
                width: "100%",
                padding: "0.875rem 1.5rem",
                backgroundColor: "var(--color-white)",
                color: "var(--color-black)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-gray-200)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: "1rem",
                fontWeight: 600,
                transition: "border-color var(--transition-fast), box-shadow var(--transition-fast)",
                boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-gray-300)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--color-gray-200)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
              }}
            >
              <GoogleLogo />
              Se connecter avec Google
            </button>
          </a>

          <p style={{ fontSize: "0.8125rem", color: "var(--color-gray-400)", fontFamily: "var(--font-body)", lineHeight: 1.5 }}>
            On utilise ton email uniquement pour rattacher tes campagnes à ton compte.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .adv-login-grid { grid-template-columns: 1fr !important; gap: 2.5rem !important; }
        }
      `}</style>
    </div>
  );
}

/* -------- Carte campagne -------- */
function CampaignCard({ campaign, onEdit }: { campaign: Campaign; onEdit: () => void }) {
  const date = new Date(campaign.created_at).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div
      style={{
        border: "1px solid var(--color-gray-200)",
        borderRadius: "var(--radius-lg)",
        padding: "1.25rem 1.375rem",
        backgroundColor: "var(--color-white)",
        boxShadow: "var(--shadow-sm)",
        display: "flex",
        flexDirection: "column",
        gap: "0.875rem",
      }}
    >
      {/* En-tête : texte + statut */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          {campaign.brand_name && (
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--color-accent-deep)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "var(--font-body)",
                marginBottom: "0.25rem",
              }}
            >
              {campaign.brand_name}
            </p>
          )}
          <p
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--color-black)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {campaign.text}
          </p>
          <a
            href={campaign.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-gray-400)",
              fontFamily: "var(--font-body)",
              textDecoration: "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "block",
              whiteSpace: "nowrap",
            }}
          >
            {campaign.url}
          </a>
        </div>
        <StatusBadge status={campaign.status as CampaignStatus} />
      </div>

      {/* Métriques */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.5rem",
        }}
        className="campaign-metrics"
      >
        {[
          { label: "Bid / bloc", value: formatEur(campaign.bid_cents) },
          { label: "Blocs", value: campaign.blocks.toLocaleString("fr-FR") },
          { label: "Impressions", value: campaign.impressions.toLocaleString("fr-FR") },
          { label: "Clics", value: campaign.clicks.toLocaleString("fr-FR") },
        ].map(({ label, value }) => (
          <div
            key={label}
            style={{
              backgroundColor: "var(--color-gray-50)",
              borderRadius: "var(--radius-sm)",
              padding: "0.625rem 0.75rem",
              textAlign: "center",
            }}
          >
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1rem",
                fontWeight: 700,
                color: "var(--color-black)",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                marginBottom: "0.2rem",
              }}
            >
              {value}
            </p>
            <p
              style={{
                fontSize: "0.6875rem",
                color: "var(--color-gray-400)",
                fontFamily: "var(--font-body)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
              }}
            >
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Pied : date + bouton modifier */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", flexWrap: "wrap" }}>
        <p style={{ fontSize: "0.8125rem", color: "var(--color-gray-400)", fontFamily: "var(--font-body)" }}>
          Créée le {date}
        </p>
        <button
          onClick={onEdit}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.4rem 0.9rem",
            backgroundColor: "transparent",
            color: "var(--color-black)",
            border: "1px solid var(--color-gray-200)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            fontFamily: "var(--font-body)",
            fontSize: "0.875rem",
            fontWeight: 600,
          }}
        >
          ✎ Modifier
        </button>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .campaign-metrics {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* -------- Mauvais espace : compte en contexte dev sur l'espace annonceur -------- */
function WrongSpaceScreen({ onSwitch }: { onSwitch: () => void }) {
  return (
    <div
      style={{
        minHeight: "calc(100vh - 64px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
      }}
    >
      <Card>
        <div
          style={{
            textAlign: "center",
            padding: "2.5rem 2rem",
            maxWidth: "440px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.25rem",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "var(--radius-md)",
              backgroundColor: "var(--color-accent-soft)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
            }}
          >
            🔐
          </div>
          <div>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.25rem",
                fontWeight: 800,
                color: "var(--color-black)",
                marginBottom: "0.5rem",
                letterSpacing: "-0.02em",
              }}
            >
              Espace réservé aux annonceurs
            </p>
            <p
              style={{
                fontSize: "0.9375rem",
                color: "var(--color-gray-500)",
                fontFamily: "var(--font-body)",
                lineHeight: 1.6,
              }}
            >
              Tu es connecté dans ton espace <strong>développeur</strong> (tes gains).
              L'espace annonceur sert à créer et suivre des campagnes publicitaires.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", width: "100%" }}>
            <button
              onClick={onSwitch}
              style={{
                padding: "0.75rem 1.5rem",
                backgroundColor: "var(--color-accent)",
                color: "var(--color-black)",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: "1rem",
                fontWeight: 700,
              }}
            >
              Continuer en tant qu'annonceur
            </button>
            <Link to="/me" style={{ textDecoration: "none" }}>
              <button
                style={{
                  width: "100%",
                  padding: "0.75rem 1.5rem",
                  backgroundColor: "transparent",
                  color: "var(--color-gray-600)",
                  border: "1px solid var(--color-gray-200)",
                  borderRadius: "var(--radius-md)",
                  cursor: "pointer",
                  fontFamily: "var(--font-body)",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                }}
              >
                Revenir à mon espace dev
              </button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* -------- Page principale -------- */
export function AnnonceursEspacePage() {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [authError, setAuthError] = useState(false);
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [auction, setAuction] = useState<AuctionResponse | null>(null);
  const [paidBanner, setPaidBanner] = useState(false);
  // Rôle courant (déclenche un re-render quand on bascule de contexte).
  const [role, setRoleState] = useState(() => getRole());

  /* Retour de paiement Stripe (?paid=1) → bannière de succès, puis on nettoie l'URL. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("paid") === "1") {
      setPaidBanner(true);
      history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  /* Traitement du hash de retour OAuth */
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#token=")) {
      const t = hash.slice(7);
      setToken(t);
      // Connexion DEPUIS l'espace annonceur → contexte annonceur.
      setRole("advertiser");
      setRoleState("advertiser");
      setTokenState(t);
      history.replaceState(null, "", window.location.pathname);
    } else if (hash === "#error=auth") {
      setAuthError(true);
      history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Auto-cicatrisation : session déjà ouverte sans rôle → on est ici, donc annonceur.
  useEffect(() => {
    if (token && getRole() === null) {
      setRole("advertiser");
      setRoleState("advertiser");
    }
  }, [token]);

  const loadData = useCallback(async () => {
    if (!getToken()) return;
    setLoading(true);
    setError(null);
    try {
      const [prof, camp, auc] = await Promise.all([
        fetchProfile(),
        fetchCampaigns(),
        fetchAuction().catch(() => null),
      ]);
      setProfile(prof);
      setCampaigns(camp.campaigns);
      setAuction(auc);
    } catch {
      setError("Erreur lors du chargement. Réessayez.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token && getRole() !== "dev") void loadData();
  }, [token, loadData]);

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await logoutUser();
    } finally {
      clearToken();
      setRoleState(null);
      setTokenState(null);
      setProfile(null);
      setCampaigns([]);
      setLogoutLoading(false);
    }
  }

  if (!token) {
    return (
      <PageLayout>
        <LoginScreen error={authError} />
      </PageLayout>
    );
  }

  /* Compte connecté en contexte DEV → espace annonceur réservé. */
  if (role === "dev") {
    return (
      <PageLayout>
        <WrongSpaceScreen
          onSwitch={() => {
            setRole("advertiser");
            setRoleState("advertiser");
          }}
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div style={{ paddingTop: "2.5rem", paddingBottom: "3rem" }}>
        {/* En-tête */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.75rem, 4vw, 2.25rem)",
                fontWeight: 800,
                color: "var(--color-black)",
                letterSpacing: "-0.03em",
                marginBottom: "0.25rem",
              }}
            >
              Mes campagnes
            </h1>
            {profile && (
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-gray-400)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {profile.email}
              </p>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowForm((v) => !v)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 1.125rem",
                backgroundColor: showForm ? "var(--color-gray-100)" : "var(--color-accent)",
                color: "var(--color-black)",
                border: showForm ? "1px solid var(--color-gray-200)" : "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                fontSize: "0.9375rem",
                fontWeight: 700,
                transition: "background-color var(--transition-fast)",
              }}
            >
              {showForm ? "✕ Fermer" : "+ Créer une campagne"}
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              loading={logoutLoading}
            >
              Déconnexion
            </Button>
          </div>
        </div>

        {/* Bannière de retour de paiement Stripe */}
        {paidBanner && (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "1rem 1.25rem",
              marginBottom: "1.5rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid rgba(97,160,26,0.4)",
              backgroundColor: "rgba(97,160,26,0.1)",
              fontFamily: "var(--font-body)",
              color: "var(--color-accent-deep)",
              fontSize: "0.9375rem",
              fontWeight: 600,
            }}
          >
            <span aria-hidden="true" style={{ fontSize: "1.25rem" }}>✅</span>
            Paiement reçu. Ta campagne est en cours d'activation et apparaîtra ci-dessous dans un instant.
            <button
              onClick={() => setPaidBanner(false)}
              aria-label="Fermer"
              style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "1.1rem" }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Formulaire d'ÉDITION d'une campagne existante */}
        {editing && (
          <div style={{ marginBottom: "2rem" }}>
            <Card>
              <div style={{ padding: "1.75rem 1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", marginBottom: "1.25rem" }}>
                  <h2
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "1.25rem",
                      fontWeight: 800,
                      color: "var(--color-black)",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    Modifier « {editing.brand_name ?? editing.text} »
                  </h2>
                  <button
                    onClick={() => setEditing(null)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-gray-500)", fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 600 }}
                  >
                    ✕ Annuler
                  </button>
                </div>
                <p style={{ fontSize: "0.875rem", color: "var(--color-gray-500)", fontFamily: "var(--font-body)", marginBottom: "1.25rem", lineHeight: 1.5 }}>
                  Si tu augmentes le tarif ou le volume, tu paieras seulement la différence.
                </p>
                <CampaignForm
                  auctionData={auction}
                  defaultEmail={profile?.email}
                  editCampaignData={editing}
                  onDone={() => {
                    setEditing(null);
                    void loadData();
                  }}
                />
              </div>
            </Card>
          </div>
        )}

        {/* Formulaire de création INLINE (dans l'espace, plus de redirection) */}
        {showForm && (
          <div style={{ marginBottom: "2rem" }}>
            <Card>
              <div style={{ padding: "1.75rem 1.5rem" }}>
                <h2
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: "1.25rem",
                    fontWeight: 800,
                    color: "var(--color-black)",
                    letterSpacing: "-0.02em",
                    marginBottom: "1.25rem",
                  }}
                >
                  Nouvelle campagne
                </h2>
                <CampaignForm auctionData={auction} defaultEmail={profile?.email} />
              </div>
            </Card>
          </div>
        )}

        {/* Chargement */}
        {loading && (
          <div
            aria-live="polite"
            aria-busy="true"
            style={{
              textAlign: "center",
              padding: "3rem",
              color: "var(--color-gray-400)",
              fontFamily: "var(--font-body)",
            }}
          >
            Chargement...
          </div>
        )}

        {/* Erreur */}
        {error && (
          <div
            role="alert"
            style={{
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-black)",
              backgroundColor: "var(--color-gray-50)",
              fontSize: "0.9375rem",
              color: "var(--color-black)",
              fontFamily: "var(--font-body)",
              marginBottom: "1.5rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Contenu */}
        {!loading && !error && (
          <>
            {campaigns.length === 0 ? (
              /* État vide */
              <Card>
                <div
                  style={{
                    textAlign: "center",
                    padding: "3rem 1.5rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "1rem",
                  }}
                >
                  <div
                    aria-hidden="true"
                    style={{
                      width: "48px",
                      height: "48px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--color-accent-soft)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                    }}
                  >
                    📣
                  </div>
                  <div>
                    <p
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.125rem",
                        fontWeight: 700,
                        color: "var(--color-black)",
                        marginBottom: "0.375rem",
                      }}
                    >
                      Aucune campagne pour l'instant
                    </p>
                    <p
                      style={{
                        fontSize: "0.9375rem",
                        color: "var(--color-gray-500)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      Créez votre première campagne et touchez une audience dev qualifiée.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowForm(true)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      padding: "0.75rem 1.5rem",
                      backgroundColor: "var(--color-accent)",
                      color: "var(--color-black)",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      fontFamily: "var(--font-body)",
                      fontSize: "1rem",
                      fontWeight: 700,
                      transition: "background-color var(--transition-fast)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-accent-hover)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-accent)";
                    }}
                  >
                    Créer ma première campagne
                  </button>
                </div>
              </Card>
            ) : (
              /* Liste des campagnes */
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {campaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onEdit={() => {
                      setEditing(campaign);
                      setShowForm(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  );
}
