import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/layouts/PageLayout";
import { CampaignForm } from "@/components/forms/CampaignForm";
import { BidMarket } from "@/components/ui/BidMarket";
import { Leaderboard } from "@/components/ui/Leaderboard";
import { Card } from "@/components/ui/Card";
import { Accordion } from "@/components/ui/Accordion";
import { type AuctionResponse } from "@/lib/api";

const FAQ_ANNONCEURS = [
  {
    question: "Comment fonctionne la modération ?",
    answer: (
      <p>
        La modération est automatique : votre campagne est diffusée immédiatement après
        paiement. Le système bloque uniquement les contenus interdits : adulte, scam,
        crypto spéculative, malware et concurrence deloyale. En cas de refus automatique,
        remboursement intégral.
      </p>
    ),
  },
  {
    question: "Quel format pour la publicité ?",
    answer: (
      <p>
        Un nom de marque (40 caractères max), une phrase d'accroche de 3 a 60
        caractères et une URL HTTPS. L'icône reste utilisée sur le site, mais pas
        dans le spinner : la pub s'affiche comme "MARQUE : phrase + lien".
      </p>
    ),
  },
  {
    question: "Comment est calculé le bid ?",
    answer: (
      <p>
        Le bid est le prix par bloc (1 000 impressions). L'annonceur avec le bid le plus
        haut diffuse en premier. Si vous avez plusieurs blocs, ils sont consommés
        séquentiellement. Un bid plus élevé n'ajoute pas de vues, il priorise votre
        diffusion.
      </p>
    ),
  },
  {
    question: "Puis-je voir les statistiques en temps réel ?",
    answer: (
      <p>
        Le Bid Market ci-dessous affiche la file d'enchères en temps réel (refresh toutes
        les 30 s). Les impressions et clics de vos campagnes sont traquées côté serveur
        et inaccessibles aux devs (anti-falsification). Votre espace annonceur recapitule
        vos campagnes.
      </p>
    ),
  },
  {
    question: "Que se passe-t-il si des blocs ne sont pas consommés ?",
    answer: (
      <p>
        Les blocs non consommés sont remboursables au prorata pendant 90 jours. Contactez
        privacy@bakchich.dev avec votre ID de campagne.
      </p>
    ),
  },
];

export function AnnonceursPage() {
  const [auctionData, setAuctionData] = useState<AuctionResponse | null>(null);
  const handleAuctionData = useCallback((data: AuctionResponse) => {
    setAuctionData(data);
  }, []);

  return (
    <PageLayout>
      {/* Formulaire campagne */}
      <section
        id="campaign-form"
        style={{
          marginTop: "3rem",
          marginBottom: "4rem",
          scrollMarginTop: "80px",
        }}
      >
        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.75rem",
              flexWrap: "wrap",
              gap: "0.5rem",
            }}
          >
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
                fontWeight: 700,
                color: "var(--color-black)",
                letterSpacing: "-0.03em",
              }}
            >
              Créer une campagne
            </h1>
            <Link
              to="/annonceurs/espace"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 1rem",
                border: "1px solid var(--color-gray-200)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--color-gray-700)",
                fontFamily: "var(--font-body)",
                textDecoration: "none",
                backgroundColor: "var(--color-white)",
                transition: "border-color var(--transition-fast)",
                whiteSpace: "nowrap",
              }}
            >
              Mon espace annonceur →
            </Link>
          </div>
          <p
            style={{
              fontSize: "1rem",
              color: "var(--color-gray-500)",
              fontFamily: "var(--font-body)",
              maxWidth: "520px",
            }}
          >
            Une audience dev qualifiée. Un contexte de concentration unique. Des prix transparents au bid.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)",
            gap: "2rem",
            alignItems: "start",
          }}
          className="campaign-grid"
        >
          <Card>
            <CampaignForm
              auctionData={auctionData}
              successSuffix={
                <span>
                  {" "}Consultez vos campagnes dans{" "}
                  <Link
                    to="/annonceurs/espace"
                    style={{
                      color: "var(--color-accent-deep)",
                      textDecoration: "underline",
                      textUnderlineOffset: "2px",
                    }}
                  >
                    votre espace annonceur
                  </Link>
                  .
                </span>
              }
            />
          </Card>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Modèle économique */}
            <Card as="article">
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--color-black)",
                  marginBottom: "0.875rem",
                }}
              >
                Modèle économique
              </h2>
              <ul
                style={{
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                {[
                  "1 bloc = 1 000 impressions de 5 s",
                  "1 clic = 50 x le prix d'une impression",
                  "50 % reversés au développeur",
                  "Bid minimum : 1,00 EUR par bloc",
                ].map((spec) => (
                  <li
                    key={spec}
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--color-gray-600)",
                      fontFamily: "var(--font-body)",
                      display: "flex",
                      gap: "0.5rem",
                      alignItems: "flex-start",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        color: "var(--color-accent-deep)",
                        flexShrink: 0,
                        fontWeight: 700,
                      }}
                    >
                      ·
                    </span>
                    {spec}
                  </li>
                ))}
              </ul>
            </Card>

            {/* Modération automatique */}
            <Card
              as="article"
              style={{ backgroundColor: "var(--color-accent-soft)", borderColor: "rgba(97,160,26,0.2)" }}
            >
              <h2
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "var(--color-accent-deep)",
                  marginBottom: "0.625rem",
                }}
              >
                Modération automatique
              </h2>
              <p
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-gray-700)",
                  fontFamily: "var(--font-body)",
                  lineHeight: 1.6,
                }}
              >
                Diffusion immédiate après paiement. Contenus bloqués : adulte, scam,
                crypto spéculative, malware. Remboursement intégral si refus.
              </p>
            </Card>
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .campaign-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </section>

      {/* Bid Market */}
      <section style={{ marginBottom: "4rem" }}>
        <BidMarket onDataLoaded={handleAuctionData} />
      </section>

      {/* Leaderboard */}
      <section style={{ marginBottom: "4rem" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "var(--color-black)",
            marginBottom: "0.75rem",
          }}
        >
          Leaderboard des marques
        </h2>
        <p
          style={{
            fontSize: "0.9375rem",
            color: "var(--color-gray-500)",
            fontFamily: "var(--font-body)",
            marginBottom: "1.5rem",
          }}
        >
          Les annonceurs qui ont choisi d'apparaitre publiquement. Option activable
          lors de la création de campagne.
        </p>
        <Leaderboard />
      </section>

      {/* FAQ */}
      <section style={{ marginBottom: "4rem", maxWidth: "720px" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "var(--color-black)",
            marginBottom: "1.5rem",
          }}
        >
          Questions annonceurs
        </h2>
        <Accordion items={FAQ_ANNONCEURS} />
      </section>
    </PageLayout>
  );
}
