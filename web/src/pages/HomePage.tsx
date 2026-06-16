import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { PageLayout } from "@/components/layouts/PageLayout";
import { BidMarket } from "@/components/ui/BidMarket";
import { Accordion } from "@/components/ui/Accordion";
import { CampaignForm } from "@/components/forms/CampaignForm";
import { VS_CODE_EXTENSION_URL, type AuctionResponse } from "@/lib/api";

/* -------- Données transparence -------- */

const TRANSPARENCY_DO = [
  "Afficher une ligne pub dans le spinner Claude Code via spinnerVerbs",
  "Te créditer 50 % de chaque impression et clic",
  "Permettre le retrait via virement SEPA (Stripe Connect)",
  "Diffuser les publicités après modération automatique",
  "Restaurer ton spinner d'origine si tu te deconnectes",
];

const TRANSPARENCY_DONT = [
  "Lire ton code, tes prompts, tes fichiers ou ton historique",
  "Vendre tes données ou les utiliser pour entraîner des IA",
  "Afficher des pubs de contenu interdit (adulte, scam, malware, crypto spéculative)",
  "Fonctionner sans ton consentement explicite (opt-in strict)",
];

const FAQ_HOME = [
  {
    question: "Combien je gagne réellement ?",
    answer: (
      <p>
        50 % du prix de chaque impression (spinner de 5 s) et 50 % de chaque clic (facture
        50x l'impression). Le montant exact depend du bid des annonceurs et de ta fréquence
        d'utilisation de Claude Code. Plus tu travailles, plus tu gagnes.
      </p>
    ),
  },
  {
    question: "L'extension lit-elle mon code ou mes prompts ?",
    answer: (
      <p>
        Non. Bakchich n'ecrit qu'une seule chose : le champ{" "}
        <code
          style={{
            fontFamily: "monospace",
            fontSize: "0.875em",
            backgroundColor: "var(--color-gray-100)",
            padding: "0.1em 0.4em",
            borderRadius: "4px",
          }}
        >
          spinnerVerbs
        </code>{" "}
        dans{" "}
        <code
          style={{
            fontFamily: "monospace",
            fontSize: "0.875em",
            backgroundColor: "var(--color-gray-100)",
            padding: "0.1em 0.4em",
            borderRadius: "4px",
          }}
        >
          ~/.claude/settings.json
        </code>
        . C'est tout. Le code est public, verifiable en 5 minutes.
      </p>
    ),
  },
  {
    question: "Marche dans quel contexte exactement ?",
    answer: (
      <p>
        L'extension intercepte le spinner "Percolating..." de Claude Code dans VS Code
        et les IDE compatibles. Le CLI terminal est aussi supporté. Elle ne fait rien en
        dehors de ces contextes.
      </p>
    ),
  },
  {
    question: "Comment retirer mes gains ?",
    answer: (
      <p>
        Via l'espace dev (/me). A partir de 10 EUR disponibles, tu peux lancer un
        virement SEPA. Les premiers retraits passent en validation manuelle (sous 48h),
        les suivants sont automatiques.
      </p>
    ),
  },
];

/* -------- Illustration Avant / Apres (fond blanc, cartes claires) -------- */
function HeroIllustration() {
  // Le solde grimpe TOUT SEUL de 0 à 40 € puis reboucle : on montre qu'on gagne
  // sans rien faire, juste en laissant Claude tourner (+0,10 € par pub vue).
  const [earnings, setEarnings] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setEarnings((v) => (v >= 40 ? 0 : Math.round((v + 0.1) * 100) / 100));
    }, 28);
    return () => clearInterval(id);
  }, []);

  return (
    <div aria-hidden="true" style={{ position: "relative", maxWidth: "340px", marginLeft: "auto" }}>
      {/* Cartes Avant / Apres */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          alignItems: "stretch",
        }}
      >
        {/* Carte : Sans Bakchich */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "var(--radius-md)",
            padding: "0.875rem 1rem",
            boxShadow: "0 2px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
            border: "1px solid rgba(0,0,0,0.1)",
          }}
        >
          <p
            style={{
              fontSize: "0.625rem",
              fontWeight: 700,
              color: "rgba(0,0,0,0.35)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "0.875rem",
              fontFamily: "var(--font-body)",
            }}
          >
            Sans Bakchich
          </p>
          <div
            style={{
              fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
              fontSize: "0.75rem",
              color: "rgba(0,0,0,0.35)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ opacity: 0.5 }}>✦</span>
            <span>Percolating... 42.8s</span>
          </div>
          <p
            style={{
              marginTop: "0.625rem",
              fontSize: "0.75rem",
              color: "rgba(0,0,0,0.25)",
              fontFamily: "var(--font-body)",
            }}
          >
            0,00 EUR gagnés
          </p>
        </div>

        {/* Fleche verte */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              backgroundColor: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 2px 12px rgba(200,242,76,0.4)",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M7 2v10M3 8l4 4 4-4"
                stroke="#0a0a0a"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Carte : Avec Bakchich */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "var(--radius-md)",
            padding: "0.875rem 1rem",
            boxShadow: "0 2px 16px rgba(0,0,0,0.08), 0 1px 8px rgba(200,242,76,0.12)",
            border: "1px solid rgba(97,160,26,0.25)",
          }}
        >
          <p
            style={{
              fontSize: "0.625rem",
              fontWeight: 700,
              color: "var(--color-accent-deep)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "0.875rem",
              fontFamily: "var(--font-body)",
            }}
          >
            Avec Bakchich
          </p>
          <div
            style={{
              fontFamily: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
              fontSize: "0.75rem",
              color: "rgba(0,0,0,0.75)",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <img
              src="/favicon.png"
              alt=""
              width={15}
              height={15}
              style={{ objectFit: "contain", flexShrink: 0 }}
            />
            <span>Votre marque ici</span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                backgroundColor: "rgba(97,160,26,0.12)",
                color: "var(--color-accent-deep)",
                padding: "0.1rem 0.375rem",
                borderRadius: "4px",
                fontSize: "0.5625rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                fontFamily: "var(--font-body)",
              }}
            >
              PUB
            </span>
          </div>

          <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {/* Le MONTANT dans le badge vert grimpe tout seul de 0 à 40 €. */}
            <span
              aria-live="off"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                alignSelf: "flex-start",
                backgroundColor: "var(--color-accent)",
                color: "var(--color-black)",
                borderRadius: "8px",
                padding: "0.3rem 0.7rem",
                fontFamily: "var(--font-display)",
                fontSize: "1.15rem",
                fontWeight: 800,
                letterSpacing: "-0.01em",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              + {earnings.toFixed(2).replace(".", ",")} € pour toi
            </span>
            <span style={{ fontSize: "0.6875rem", color: "var(--color-gray-400)", fontFamily: "var(--font-body)" }}>
              ton solde en direct · +0,10 € à chaque pub vue
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------- Bouton install glassmorphism avec segment gain -------- */
function HeroCTA() {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={VS_CODE_EXTENSION_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "inline-block" }}
    >
      <button
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0",
          padding: "0",
          background: hovered
            ? "rgba(200,242,76,0.22)"
            : "rgba(200,242,76,0.15)",
          color: "var(--color-black)",
          border: "1px solid rgba(200,242,76,0.5)",
          borderRadius: "9999px",
          cursor: "pointer",
          fontFamily: "var(--font-body)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
          boxShadow: hovered
            ? "0 8px 32px rgba(200,242,76,0.35), inset 0 1px 0 rgba(255,255,255,0.45)"
            : "0 4px 20px rgba(200,242,76,0.2), inset 0 1px 0 rgba(255,255,255,0.35)",
          transition: "all var(--transition-fast)",
          overflow: "hidden",
        }}
      >
        {/* Partie principale */}
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.875rem 1.375rem",
            fontSize: "1.0625rem",
            fontWeight: 700,
            color: "var(--color-black)",
          }}
        >
          <span aria-hidden="true">🧩</span>
          Installer l'extension VS Code
        </span>
      </button>
    </a>
  );
}

/* -------- Section campagne sur la home -------- */
interface CampaignSectionProps {
  auctionData: AuctionResponse | null;
}

function HomeCampaignSection({ auctionData }: CampaignSectionProps) {
  return (
    <section
      id="lancer-campagne"
      style={{
        marginBottom: "5rem",
        scrollMarginTop: "80px",
      }}
      aria-labelledby="campagne-home-titre"
    >
      <div style={{ marginBottom: "2rem" }}>
        <h2
          id="campagne-home-titre"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.375rem, 2.5vw, 1.875rem)",
            fontWeight: 700,
            color: "var(--color-black)",
            letterSpacing: "-0.03em",
            marginBottom: "0.5rem",
          }}
        >
          Atteindre les devs au bon moment
        </h2>
        <p
          style={{
            fontSize: "0.9375rem",
            color: "var(--color-gray-500)",
            fontFamily: "var(--font-body)",
            maxWidth: "480px",
          }}
        >
          Pendant que Claude Code tourne, votre marque est la. Lancez une campagne
          directement depuis cette page.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)",
          gap: "2rem",
          alignItems: "start",
        }}
        className="home-campaign-grid"
      >
        <div
          style={{
            backgroundColor: "var(--color-white)",
            border: "1px solid var(--color-gray-200)",
            borderRadius: "var(--radius-xl)",
            padding: "2rem",
            boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
          }}
        >
          <CampaignForm
            auctionData={auctionData}
            successSuffix={
              <span>
                {" "}Connecte-toi a{" "}
                <a
                  href="/annonceurs/espace"
                  style={{
                    color: "var(--color-accent-deep)",
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                  }}
                >
                  ton espace annonceur
                </a>
                {" "}pour suivre son statut.
              </span>
            }
          />
        </div>

        <div
          style={{
            backgroundColor: "var(--color-accent-soft)",
            border: "1px solid rgba(97,160,26,0.2)",
            borderRadius: "var(--radius-xl)",
            padding: "1.75rem",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--color-accent-deep)",
              marginBottom: "1rem",
            }}
          >
            Pourquoi Bakchich ?
          </h3>
          <ul
            style={{
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
            }}
          >
            {[
              "Audience 100 % développeurs actifs",
              "Contexte de concentration maximale",
              "Modération automatique (pas de spam ni contenu interdit)",
              "Prix transparents au bid en temps réel",
              "50 % reversés directement aux devs",
            ].map((item) => (
              <li
                key={item}
                style={{
                  fontSize: "0.875rem",
                  color: "var(--color-gray-700)",
                  fontFamily: "var(--font-body)",
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "flex-start",
                  lineHeight: 1.5,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    marginTop: "2px",
                    color: "var(--color-black)",
                    backgroundColor: "var(--color-accent)",
                    borderRadius: "50%",
                    width: "14px",
                    height: "14px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.5625rem",
                    fontWeight: 800,
                  }}
                >
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid rgba(97,160,26,0.2)" }}>
            <Link
              to="/annonceurs"
              style={{
                fontSize: "0.875rem",
                color: "var(--color-accent-deep)",
                fontFamily: "var(--font-body)",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                fontWeight: 600,
              }}
            >
              Portail annonceurs complet →
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .home-campaign-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

/* -------- Page -------- */
export function HomePage() {
  const [auctionData, setAuctionData] = useState<AuctionResponse | null>(null);
  const handleAuctionData = useCallback((data: AuctionResponse) => {
    setAuctionData(data);
  }, []);

  return (
    <PageLayout>
      {/* HERO 2 colonnes */}
      <section
        style={{
          paddingTop: "5rem",
          paddingBottom: "4rem",
          position: "relative",
        }}
        aria-label="Introduction"
      >
        {/* Grille decorative sur tout le fond du hero */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "-3rem -2rem 0 -2rem",
            zIndex: 0,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(rgba(0,0,0,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.045) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            WebkitMaskImage:
              "radial-gradient(ellipse 75% 65% at 50% 40%, #000 35%, transparent 100%)",
            maskImage:
              "radial-gradient(ellipse 75% 65% at 50% 40%, #000 35%, transparent 100%)",
          }}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4rem",
            alignItems: "center",
            position: "relative",
            zIndex: 1,
          }}
          className="hero-grid"
        >
          {/* Colonne gauche */}
          <div>
            {/* Eyebrow */}
            <p
              style={{
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: "var(--color-gray-400)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                marginBottom: "1.25rem",
                fontFamily: "var(--font-body)",
              }}
            >
              Extension VS Code · Claude Code · Codex
            </p>

            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
                fontWeight: 550,
                color: "var(--color-black)",
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                marginBottom: "1.25rem",
              }}
            >
              Sois payé pendant<br />que Claude tourne.
            </h1>

            <p
              style={{
                fontSize: "clamp(0.875rem, 1.3vw, 0.9375rem)",
                color: "var(--color-gray-500)",
                lineHeight: 1.6,
                marginBottom: "2rem",
                fontFamily: "var(--font-body)",
                maxWidth: "420px",
              }}
            >
              Quand Claude Code réfléchit, son petit texte d'attente affiche une
              pub. Des annonceurs paient pour cette ligne, et tu en touches{" "}
              <strong style={{ color: "var(--color-black)", fontWeight: 700 }}>
                50 % en euros
              </strong>
              . Tu ne fais rien de plus : tu laisses Claude tourner, ton solde
              monte tout seul. C'est gratuit, et ça ne change rien à ta façon de
              coder.
            </p>

            {/* CTA glassmorphism */}
            <div style={{ marginBottom: "0.875rem" }}>
              <HeroCTA />
            </div>

            {/* Bouton secondaire annonceur */}
            <div style={{ marginBottom: "1.25rem" }}>
              <Link
                to="/annonceurs"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.375rem",
                  padding: "0.625rem 1.125rem",
                  border: "1px solid var(--color-gray-200)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "0.9375rem",
                  fontWeight: 500,
                  color: "var(--color-gray-700)",
                  fontFamily: "var(--font-body)",
                  textDecoration: "none",
                  backgroundColor: "var(--color-white)",
                  transition: "border-color var(--transition-fast), color var(--transition-fast)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--color-gray-400)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-black)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--color-gray-200)";
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-gray-700)";
                }}
              >
                Je suis annonceur
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>

            {/* Reassurance */}
            <p
              style={{
                fontSize: "0.8125rem",
                color: "var(--color-gray-400)",
                fontFamily: "var(--font-body)",
                lineHeight: 1.6,
              }}
            >
              Opt-in, code public, désactivable en 1 clic.
            </p>
          </div>

          {/* Colonne droite : illustration Avant / Apres */}
          <div>
            <HeroIllustration />
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            .hero-grid {
              grid-template-columns: 1fr !important;
              gap: 2.5rem !important;
            }
          }
        `}</style>
      </section>

      {/* Separateur hero / contenu suivant */}
      <div
        aria-hidden="true"
        style={{
          height: "1px",
          backgroundColor: "var(--color-gray-200)",
          marginBottom: "4rem",
        }}
      />

      {/* Formulaire de campagne */}
      <HomeCampaignSection auctionData={auctionData} />

      {/* Bid Market */}
      <section
        style={{
          marginBottom: "5rem",
          backgroundColor: "var(--color-white)",
          borderRadius: "var(--radius-xl)",
          padding: "2.5rem 2rem",
          border: "1px solid var(--color-gray-200)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.04)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.375rem, 2.5vw, 1.75rem)",
            fontWeight: 700,
            color: "var(--color-black)",
            marginBottom: "0.5rem",
          }}
        >
          File d'enchères en temps réel
        </h2>
        <p
          style={{
            fontSize: "0.9375rem",
            color: "var(--color-gray-500)",
            fontFamily: "var(--font-body)",
            marginBottom: "1.5rem",
          }}
        >
          Les campagnes actuellement en diffusion ou en attente.
        </p>
        <BidMarket onDataLoaded={handleAuctionData} compact />
      </section>

      {/* FAQ */}
      <section style={{ marginBottom: "5rem", maxWidth: "720px", margin: "0 auto 5rem" }}>
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 700,
            color: "var(--color-black)",
            marginBottom: "1.5rem",
          }}
        >
          Questions fréquentes
        </h2>
        <Accordion items={FAQ_HOME} />
        <Link
          to="/faq"
          style={{
            display: "inline-block",
            marginTop: "1.25rem",
            fontSize: "0.9375rem",
            color: "var(--color-gray-500)",
            fontFamily: "var(--font-body)",
            textDecoration: "underline",
          }}
        >
          Voir toutes les questions
        </Link>
      </section>

      {/* Transparence totale */}
      <section
        style={{
          marginBottom: "2rem",
          borderTop: "1px solid var(--color-gray-200)",
          paddingTop: "2.5rem",
          paddingBottom: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1.25rem",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "var(--color-accent-deep)",
              flexShrink: 0,
            }}
          />
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1rem",
              fontWeight: 700,
              color: "var(--color-black)",
            }}
          >
            Transparence totale
          </h2>
          <span
            style={{
              fontSize: "0.875rem",
              color: "var(--color-gray-400)",
              fontFamily: "var(--font-body)",
            }}
          >
            Le code est public, verifiable en 5 minutes.
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.5rem",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--color-gray-400)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "var(--font-body)",
                marginBottom: "0.625rem",
              }}
            >
              Ce qu'on fait
            </p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {TRANSPARENCY_DO.map((item) => (
                <li
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
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
                      width: "14px",
                      height: "14px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.5625rem",
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
          <div>
            <p
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                color: "var(--color-gray-400)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "var(--font-body)",
                marginBottom: "0.625rem",
              }}
            >
              Ce qu'on ne fait jamais
            </p>
            <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              {TRANSPARENCY_DONT.map((item) => (
                <li
                  key={item}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    fontSize: "0.875rem",
                    color: "var(--color-gray-600)",
                    fontFamily: "var(--font-body)",
                    lineHeight: 1.5,
                  }}
                >
                  <span aria-hidden="true" style={{ flexShrink: 0, marginTop: "2px", color: "var(--color-gray-400)" }}>
                    ✗
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </PageLayout>
  );
}
