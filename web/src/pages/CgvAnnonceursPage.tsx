import { PageLayout } from "@/components/layouts/PageLayout";

const sectionStyle: React.CSSProperties = {
  marginBottom: "1.75rem",
};

const h2Style: React.CSSProperties = {
  fontFamily: "var(--font-display)",
  fontSize: "1.125rem",
  fontWeight: 700,
  color: "var(--color-black)",
  marginBottom: "0.625rem",
};

const pStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  color: "var(--color-gray-700)",
  fontFamily: "var(--font-body)",
  lineHeight: 1.7,
};

export function CgvAnnonceursPage() {
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
          Conditions Générales de Vente Annonceurs
        </h1>
        <p style={{ ...pStyle, color: "var(--color-gray-400)", marginBottom: "2.5rem" }}>
          Bakchich · Document à faire relire par un juriste avant publication.
        </p>

        <section style={sectionStyle}>
          <h2 style={h2Style}>1. Objet</h2>
          <p style={pStyle}>
            Achat de blocs publicitaires (1 bloc = 1 000 impressions de 5 s dans le
            spinner). Clic facturé 50x le prix d'une impression, décompte du budget.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>2. Enchère</h2>
          <p style={pStyle}>
            Diffusion par ordre décroissant de bid. Le bid est librement modifiable à la
            hausse. Minimum : 1 EUR le bloc.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>3. Modération</h2>
          <p style={pStyle}>
            Toute création est validée avant diffusion. Refusés : contenus trompeurs,
            adultes, crypto spéculative, malware, concurrence déloyale. En cas de refus,
            remboursement intégral.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>4. Format</h2>
          <p style={pStyle}>
            60 caractères max, destination en HTTPS uniquement. Icône optionnelle
            (PNG/JPG/WebP, 64 Ko max).
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>5. Paiement</h2>
          <p style={pStyle}>
            Stripe, à la commande. TVA française applicable (20 %). Facture émise
            automatiquement.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>6. Reporting</h2>
          <p style={pStyle}>
            Impressions et clics consultables en temps réel. Pas de données personnelles
            des développeurs transmises.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>7. Résiliation</h2>
          <p style={pStyle}>
            Blocs non consommés remboursables au prorata pendant 90 jours.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}
