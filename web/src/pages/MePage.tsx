import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PageLayout } from "@/components/layouts/PageLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  getToken,
  setToken,
  clearToken,
  getRole,
  setRole,
  fetchBalance,
  fetchHistory,
  fetchConnectStatus,
  startConnectOnboarding,
  requestPayout,
  logoutUser,
  formatEur,
  apiErrorMessage,
  ApiErrorClass,
  ApiErrorWithDetails,
  type BalanceResponse,
  type HistoryEvent,
  type ConnectStatusResponse,
} from "@/lib/api";

/* -------- Logo Google inline SVG -------- */
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

/* -------- Ecran login 2 colonnes -------- */
function LoginScreen() {
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
        className="login-grid"
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
            Mon espace
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
            Connecte-toi pour voir tes gains et retirer tes euros.
          </p>

          <ul
            style={{
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            {[
              "Opt-in strict, tu choisis d'activer",
              "On ne lit que ton email pour créditer tes gains",
              "Retrait SEPA des 10 EUR disponibles",
            ].map((item) => (
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
          <img
            src="/favicon.png"
            alt="Logo Bakchich"
            width={40}
            height={40}
            style={{ objectFit: "contain" }}
          />

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
              Connexion développeur
            </p>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--color-gray-400)",
                fontFamily: "var(--font-body)",
              }}
            >
              Accès via Google uniquement
            </p>
          </div>

          <a href="/auth/google/start?web=1" style={{ textDecoration: "none", width: "100%" }}>
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

          <p
            style={{
              fontSize: "0.8125rem",
              color: "var(--color-gray-400)",
              fontFamily: "var(--font-body)",
              lineHeight: 1.5,
            }}
          >
            Ni code, ni prompts, ni fichiers lus.
          </p>
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .login-grid {
            grid-template-columns: 1fr !important;
            gap: 2.5rem !important;
          }
        }
      `}</style>
    </div>
  );
}

/* -------- Indicateurs de solde -------- */
function BalanceSection({ balance }: { balance: BalanceResponse }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "1rem",
        marginBottom: "2.5rem",
      }}
      className="balance-grid"
    >
      {/* Retirable - carte accent */}
      <div
        style={{
          backgroundColor: "var(--color-accent)",
          borderRadius: "var(--radius-xl)",
          padding: "1.5rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.375rem",
        }}
      >
        <p
          style={{
            fontSize: "0.6875rem",
            fontWeight: 700,
            color: "rgba(10,10,10,0.5)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "var(--font-body)",
          }}
        >
          Retirable
        </p>
        <p
          aria-live="polite"
          aria-atomic="true"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 800,
            color: "var(--color-accent-foreground)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          {formatEur(balance.availableCents)}
        </p>
        <p
          style={{
            fontSize: "0.75rem",
            color: "rgba(10,10,10,0.45)",
            fontFamily: "var(--font-body)",
          }}
        >
          Disponible maintenant
        </p>
      </div>

      {/* Aujourd'hui */}
      <div
        style={{
          backgroundColor: "var(--color-white)",
          border: "1px solid var(--color-gray-200)",
          borderRadius: "var(--radius-xl)",
          padding: "1.5rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.375rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <p
          style={{
            fontSize: "0.6875rem",
            fontWeight: 700,
            color: "var(--color-gray-400)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "var(--font-body)",
          }}
        >
          Aujourd'hui
        </p>
        <p
          aria-live="polite"
          aria-atomic="true"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.25rem, 2.5vw, 1.625rem)",
            fontWeight: 700,
            color: "var(--color-black)",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {formatEur(balance.todayCents)}
        </p>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--color-gray-400)",
            fontFamily: "var(--font-body)",
          }}
        >
          Depuis minuit
        </p>
      </div>

      {/* Total cumulé */}
      <div
        style={{
          backgroundColor: "var(--color-white)",
          border: "1px solid var(--color-gray-200)",
          borderRadius: "var(--radius-xl)",
          padding: "1.5rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.375rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <p
          style={{
            fontSize: "0.6875rem",
            fontWeight: 700,
            color: "var(--color-gray-400)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontFamily: "var(--font-body)",
          }}
        >
          Total cumulé
        </p>
        <p
          aria-live="polite"
          aria-atomic="true"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.25rem, 2.5vw, 1.625rem)",
            fontWeight: 700,
            color: "var(--color-black)",
            letterSpacing: "-0.03em",
            lineHeight: 1,
          }}
        >
          {formatEur(balance.lifetimeCents)}
        </p>
        <p
          style={{
            fontSize: "0.75rem",
            color: "var(--color-gray-400)",
            fontFamily: "var(--font-body)",
          }}
        >
          Depuis le début
        </p>
      </div>

      <style>{`
        @media (max-width: 520px) {
          .balance-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* -------- Section virements -------- */
interface PayoutSectionProps {
  balance: BalanceResponse;
  connectStatus: ConnectStatusResponse | null;
  onRefresh: () => void;
}

function PayoutSection({ balance, connectStatus, onRefresh }: PayoutSectionProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [onboardLoading, setOnboardLoading] = useState(false);

  const canPayout = balance.availableCents >= 1000;
  const isConnected = connectStatus?.connected && connectStatus?.payoutsEnabled;

  async function handleOnboard() {
    setOnboardLoading(true);
    try {
      const url = await startConnectOnboarding();
      if (url) window.location.href = url;
    } catch (err) {
      if (err instanceof ApiErrorClass) {
        setMessage({ kind: "error", text: apiErrorMessage(err.code) });
      } else {
        setMessage({ kind: "error", text: "Erreur lors de la connexion à Stripe." });
      }
      setOnboardLoading(false);
    }
  }

  async function handlePayout() {
    setLoading(true);
    setMessage(null);
    try {
      const result = await requestPayout();
      if (result.status === "paid") {
        setMessage({
          kind: "success",
          text: `Virement de ${formatEur(result.amountCents)} initié. Il arrivera sous 1 à 3 jours ouvrables.`,
        });
      } else {
        setMessage({
          kind: "success",
          text: `Retrait de ${formatEur(result.amountCents)} en cours de vérification manuelle. Vous serez notifié par email.`,
        });
      }
      onRefresh();
    } catch (err) {
      if (err instanceof ApiErrorWithDetails) {
        if (err.code === "below_min" && err.availableCents !== undefined && err.minPayoutCents !== undefined) {
          setMessage({
            kind: "error",
            text: `Solde insuffisant. Vous avez ${formatEur(err.availableCents)}, minimum requis : ${formatEur(err.minPayoutCents)}.`,
          });
        } else {
          setMessage({ kind: "error", text: apiErrorMessage(err.code) });
        }
      } else if (err instanceof ApiErrorClass) {
        setMessage({ kind: "error", text: apiErrorMessage(err.code) });
      } else {
        setMessage({ kind: "error", text: "Erreur lors du retrait." });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        backgroundColor: "var(--color-white)",
        border: "1px solid var(--color-gray-200)",
        borderRadius: "var(--radius-xl)",
        padding: "1.75rem 2rem",
        marginBottom: "2rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.125rem",
          fontWeight: 700,
          color: "var(--color-black)",
          marginBottom: "1.25rem",
        }}
      >
        Virements
      </h2>

      {connectStatus === null ? (
        <p style={{ color: "var(--color-gray-500)", fontFamily: "var(--font-body)", fontSize: "0.9375rem" }}>
          Chargement du statut...
        </p>
      ) : !isConnected ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <p style={{ fontSize: "0.9375rem", color: "var(--color-gray-600)", fontFamily: "var(--font-body)", lineHeight: 1.6 }}>
            Configure tes virements via Stripe Connect pour retirer tes gains par virement SEPA.
          </p>
          <div>
            <Button onClick={handleOnboard} loading={onboardLoading}>
              Configurer mes virements
            </Button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <Badge>Virements actifs</Badge>
            <span style={{ fontSize: "0.875rem", color: "var(--color-gray-500)", fontFamily: "var(--font-body)" }}>
              Compte Stripe Connect configuré
            </span>
          </div>
          {!canPayout && (
            <p style={{ fontSize: "0.875rem", color: "var(--color-gray-500)", fontFamily: "var(--font-body)" }}>
              Minimum de retrait : {formatEur(1000)}. Il te manque encore{" "}
              {formatEur(1000 - balance.availableCents)}.
            </p>
          )}
          <div>
            <Button
              onClick={handlePayout}
              loading={loading}
              disabled={!canPayout || loading}
            >
              Retirer {formatEur(balance.availableCents)}
            </Button>
          </div>
        </div>
      )}

      {message && (
        <div
          role="alert"
          style={{
            marginTop: "1rem",
            padding: "0.875rem 1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: message.kind === "success" ? "var(--color-accent-soft)" : "var(--color-gray-50)",
            border: `1px solid ${message.kind === "success" ? "rgba(97,160,26,0.3)" : "var(--color-black)"}`,
            fontSize: "0.9375rem",
            color: message.kind === "success" ? "var(--color-accent-deep)" : "var(--color-black)",
            fontFamily: "var(--font-body)",
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}

/* -------- Historique des gains en tableau -------- */
function HistorySection({ events }: { events: HistoryEvent[] }) {
  if (events.length === 0) {
    return (
      <div
        style={{
          backgroundColor: "var(--color-white)",
          border: "1px solid var(--color-gray-200)",
          borderRadius: "var(--radius-xl)",
          padding: "1.75rem 2rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.125rem",
            fontWeight: 700,
            color: "var(--color-black)",
            marginBottom: "1.5rem",
          }}
        >
          Historique des gains
        </h2>
        <div
          style={{
            textAlign: "center",
            padding: "2.5rem 1rem",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              backgroundColor: "var(--color-gray-100)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
            }}
          >
            🧩
          </div>
          <p
            style={{
              color: "var(--color-gray-500)",
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
            }}
          >
            Aucun gain enregistré pour l'instant.
          </p>
          <p
            style={{
              color: "var(--color-gray-400)",
              fontFamily: "var(--font-body)",
              fontSize: "0.875rem",
            }}
          >
            Installe l'extension et laisse le spinner tourner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "var(--color-white)",
        border: "1px solid var(--color-gray-200)",
        borderRadius: "var(--radius-xl)",
        padding: "1.75rem 2rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
        overflow: "hidden",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.125rem",
          fontWeight: 700,
          color: "var(--color-black)",
          marginBottom: "1.25rem",
        }}
      >
        Historique des gains
      </h2>

      <div style={{ overflowX: "auto", marginLeft: "-2rem", marginRight: "-2rem" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            minWidth: "480px",
          }}
          aria-label="Historique des gains"
        >
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--color-gray-200)",
              }}
            >
              {(["Type", "Campagne", "Montant", "Date"] as const).map((col) => (
                <th
                  key={col}
                  scope="col"
                  style={{
                    padding: col === "Type" ? "0.625rem 0.875rem 0.625rem 2rem" : "0.625rem 0.875rem",
                    textAlign: col === "Montant" ? "right" : "left",
                    fontSize: "0.6875rem",
                    fontWeight: 700,
                    color: "var(--color-gray-400)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    fontFamily: "var(--font-body)",
                    whiteSpace: "nowrap",
                    paddingRight: col === "Date" ? "2rem" : "0.875rem",
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((event, i) => {
              const isImpression = event.type === "impression";
              const isEven = i % 2 === 0;
              return (
                <tr
                  key={i}
                  style={{
                    backgroundColor: isEven ? "var(--color-white)" : "var(--color-gray-50)",
                    borderBottom: i < events.length - 1 ? "1px solid var(--color-gray-100)" : "none",
                  }}
                >
                  {/* Type */}
                  <td
                    style={{
                      padding: "0.75rem 0.875rem 0.75rem 2rem",
                      verticalAlign: "middle",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "0.2rem 0.625rem",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        fontFamily: "var(--font-body)",
                        letterSpacing: "0.02em",
                        backgroundColor: isImpression
                          ? "var(--color-accent-soft)"
                          : "rgba(10,10,10,0.06)",
                        color: isImpression
                          ? "var(--color-accent-deep)"
                          : "var(--color-gray-600)",
                      }}
                    >
                      {isImpression ? "Impression" : "Clic"}
                    </span>
                  </td>

                  {/* Campagne */}
                  <td
                    style={{
                      padding: "0.75rem 0.875rem",
                      fontSize: "0.875rem",
                      color: event.campaign_text ? "var(--color-black)" : "var(--color-gray-400)",
                      fontFamily: "var(--font-body)",
                      verticalAlign: "middle",
                      maxWidth: "240px",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={event.campaign_text ?? undefined}
                    >
                      {event.campaign_text ?? "Campagne inconnue"}
                    </span>
                  </td>

                  {/* Montant */}
                  <td
                    style={{
                      padding: "0.75rem 0.875rem",
                      textAlign: "right",
                      verticalAlign: "middle",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.9375rem",
                        fontWeight: 600,
                        color: "var(--color-accent-deep)",
                        fontFamily: "var(--font-body)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      +{formatEur(event.credit_cents)}
                    </span>
                  </td>

                  {/* Date */}
                  <td
                    style={{
                      padding: "0.75rem 2rem 0.75rem 0.875rem",
                      fontSize: "0.8125rem",
                      color: "var(--color-gray-400)",
                      fontFamily: "var(--font-body)",
                      verticalAlign: "middle",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {new Date(event.created_at).toLocaleString("fr-FR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* -------- Page principale -------- */
export function MePage() {
  const navigate = useNavigate();
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [authError, setAuthError] = useState(false);
  const [balance, setBalance] = useState<BalanceResponse | null>(null);
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [connectStatus, setConnectStatus] = useState<ConnectStatusResponse | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [role, setRoleState] = useState(() => getRole());

  /* Traitement du hash de retour OAuth */
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#token=")) {
      const t = hash.slice(7);
      setToken(t);
      // Connexion DEPUIS l'espace dev → contexte développeur.
      setRole("dev");
      setRoleState("dev");
      setTokenState(t);
      history.replaceState(null, "", window.location.pathname);
    } else if (hash === "#error=auth") {
      setAuthError(true);
      history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Auto-cicatrisation : session déjà ouverte sans rôle → on est ici, donc dev.
  useEffect(() => {
    if (token && getRole() === null) {
      setRole("dev");
      setRoleState("dev");
    }
  }, [token]);

  const loadData = useCallback(async () => {
    if (!getToken()) return;
    setLoadingData(true);
    try {
      const [bal, hist, connect] = await Promise.all([
        fetchBalance(),
        fetchHistory(),
        fetchConnectStatus(),
      ]);
      setBalance(bal);
      setEvents(hist.events);
      setConnectStatus(connect);
    } catch {
      // 401 deja gere par authFetch (purge + reload)
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    if (token && getRole() !== "advertiser") void loadData();
  }, [token, loadData]);

  async function handleLogout() {
    setLogoutLoading(true);
    try {
      await logoutUser();
    } finally {
      clearToken();
      setRoleState(null);
      setTokenState(null);
      setBalance(null);
      setEvents([]);
      setConnectStatus(null);
      setLogoutLoading(false);
      navigate("/");
    }
  }

  if (!token) {
    return (
      <PageLayout>
        {authError && (
          <div
            role="alert"
            style={{
              margin: "1rem auto",
              maxWidth: "480px",
              padding: "1rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-black)",
              backgroundColor: "var(--color-gray-50)",
              textAlign: "center",
              fontSize: "0.9375rem",
              color: "var(--color-black)",
              fontFamily: "var(--font-body)",
            }}
          >
            Connexion échouée. Réessaie.
          </div>
        )}
        <LoginScreen />
      </PageLayout>
    );
  }

  /* Compte connecté en contexte ANNONCEUR → espace dev réservé. */
  if (role === "advertiser") {
    return (
      <PageLayout>
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
              backgroundColor: "var(--color-white)",
              border: "1px solid var(--color-gray-200)",
              borderRadius: "var(--radius-xl)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
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
                Espace réservé aux développeurs
              </p>
              <p
                style={{
                  fontSize: "0.9375rem",
                  color: "var(--color-gray-500)",
                  fontFamily: "var(--font-body)",
                  lineHeight: 1.6,
                }}
              >
                Tu es connecté dans ton espace <strong>annonceur</strong> (tes campagnes).
                Cet espace-ci affiche tes gains en tant que développeur.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", width: "100%" }}>
              <button
                onClick={() => {
                  setRole("dev");
                  setRoleState("dev");
                }}
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
                Continuer en tant que développeur
              </button>
              <button
                onClick={() => navigate("/annonceurs/espace")}
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
                Revenir à mon espace annonceur
              </button>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div
        style={{
          paddingTop: "2.5rem",
          paddingBottom: "3rem",
          maxWidth: "800px",
          margin: "0 auto",
        }}
      >
        {/* En-tête de page */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2.5rem",
            flexWrap: "wrap",
            gap: "0.75rem",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.625rem, 4vw, 2rem)",
                fontWeight: 800,
                color: "var(--color-black)",
                letterSpacing: "-0.03em",
                marginBottom: "0.25rem",
              }}
            >
              Mon espace
            </h1>
            <p
              style={{
                fontSize: "0.875rem",
                color: "var(--color-gray-400)",
                fontFamily: "var(--font-body)",
              }}
            >
              Tes gains, tes virements, ton historique.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            loading={logoutLoading}
          >
            Déconnexion
          </Button>
        </div>

        {loadingData && !balance && (
          <div
            aria-live="polite"
            aria-busy="true"
            style={{
              textAlign: "center",
              padding: "4rem",
              color: "var(--color-gray-400)",
              fontFamily: "var(--font-body)",
              fontSize: "0.9375rem",
            }}
          >
            Chargement...
          </div>
        )}

        {balance && (
          <>
            <BalanceSection balance={balance} />
            <PayoutSection
              balance={balance}
              connectStatus={connectStatus}
              onRefresh={loadData}
            />
            <HistorySection events={events} />
          </>
        )}
      </div>
    </PageLayout>
  );
}
