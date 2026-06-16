import { PageLayout } from "@/components/layouts/PageLayout";

const sectionStyle: React.CSSProperties = {
  marginBottom: "2rem",
};

const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "1.25rem",
  fontWeight: 700,
  color: "var(--color-black)",
  marginBottom: "0.75rem",
};

const pStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  color: "var(--color-gray-700)",
  fontFamily: "var(--font-body)",
  lineHeight: 1.7,
  marginBottom: "0.375rem",
};

export function MentionsLegalesPage() {
  return (
    <PageLayout>
      <div style={{ paddingTop: "3rem", paddingBottom: "3rem", maxWidth: "680px" }}>
        <p
          style={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            color: "var(--color-gray-400)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            marginBottom: "0.75rem",
            fontFamily: "var(--font-body)",
          }}
        >
          Texte juridique
        </p>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            fontWeight: 800,
            color: "var(--color-black)",
            marginBottom: "0.5rem",
            letterSpacing: "-0.03em",
          }}
        >
          Mentions légales
        </h1>
        <p
          style={{
            fontSize: "0.9375rem",
            color: "var(--color-gray-400)",
            fontFamily: "var(--font-body)",
            marginBottom: "2.5rem",
          }}
        >
          Conformément à l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la
          confiance dans l'économie numérique (LCEN).
        </p>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Editeur du site</h2>
          <p style={pStyle}>
            <strong>SHALABY Cyril</strong>
          </p>
          <p style={pStyle}>Entrepreneur individuel (Micro-entreprise)</p>
          <p style={pStyle}>Siege social : 3 rue Hector Malot, 75012 Paris</p>
          <p style={pStyle}>SIREN : 895 332 070</p>
          <p style={pStyle}>SIRET : 895 332 070 00021</p>
          <p style={pStyle}>N° TVA intracommunautaire : FR68 895 332 070</p>
          <p style={pStyle}>Telephone : 06 21 80 67 69</p>
          <p style={pStyle}>
            Contact :{" "}
            <a
              href="mailto:privacy@bakchich.dev"
              style={{ color: "var(--color-black)", fontFamily: "var(--font-body)" }}
            >
              privacy@bakchich.dev
            </a>
          </p>
          <p style={{ ...pStyle, marginTop: "0.75rem" }}>
            <strong>Directeur de la publication</strong> : Cyril SHALABY
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Hebergement</h2>
          <p style={pStyle}>
            <strong>Hostinger International Ltd</strong> (serveur VPS)
          </p>
          <p style={pStyle}>61 Lordou Vironos Street, 6023 Larnaca, Chypre</p>
          <p style={pStyle}>Localisation des serveurs : Union Européenne</p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Propriété intellectuelle</h2>
          <p style={pStyle}>
            Le code de l'extension Bakchich est publié en source ouverte. La marque, le
            logo et les contenus du site restent la propriété de leur éditeur.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Indépendance</h2>
          <p style={pStyle}>
            Bakchich est un projet indépendant, non affilié à Anthropic. "Claude Code"
            est une marque de ses propriétaires respectifs, citée à titre purement
            descriptif.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}
