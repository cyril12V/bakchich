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
  marginBottom: "0.5rem",
};

const liStyle: React.CSSProperties = {
  fontSize: "0.9375rem",
  color: "var(--color-gray-700)",
  fontFamily: "var(--font-body)",
  lineHeight: 1.7,
};

export function CguPage() {
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
          Conditions Générales d'Utilisation
        </h1>
        <p style={{ ...pStyle, color: "var(--color-gray-400)", marginBottom: "2.5rem" }}>
          Bakchich · Document à faire relire par un juriste avant publication.
        </p>

        <section style={sectionStyle}>
          <h2 style={h2Style}>1. Le service</h2>
          <p style={pStyle}>
            Bakchich affiche une ligne sponsorisée dans le spinner de Claude Code via le
            réglage public{" "}
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
            </code>
            , et reverse 50 % des revenus publicitaires à l'utilisateur dont la machine a
            affiché la publicité.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>2. Conditions</h2>
          <p style={pStyle}>
            Service réservé aux personnes majeures. Un seul compte par personne.
            L'installation et la connexion valent acceptation des présentes CGU.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>3. Gains et reversements</h2>
          <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li style={liStyle}>
              Crédit : 50 % du prix de chaque impression (5 s de visibilité) et de chaque
              clic (facturé 50x l'impression).
            </li>
            <li style={liStyle}>
              Retrait via Stripe Connect (virement SEPA), seuil minimum de 10 EUR.
            </li>
            <li style={liStyle}>
              <strong>Fiscalité : les gains sont des revenus imposables. Leur déclaration
              relève de la seule responsabilité de l'utilisateur.</strong>
            </li>
            <li style={liStyle}>
              En cas de fraude détectée (automatisation des impressions, multi-comptes,
              clics artificiels), les gains concernés sont annulés et le compte peut être
              gelé.
            </li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>4. Engagements de Bakchich</h2>
          <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li style={liStyle}>Aucune lecture du code, des prompts ou des fichiers de l'utilisateur.</li>
            <li style={liStyle}>
              Restauration du spinner d'origine à la déconnexion, en pause ou à la
              désinstallation.
            </li>
            <li style={liStyle}>Modération de chaque publicité avant diffusion.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>5. Limites</h2>
          <p style={pStyle}>
            Bakchich est un projet indépendant, non affilié à Anthropic. Le service dépend
            d'un réglage public de Claude Code : si ce réglage évolue, le service peut
            être suspendu sans indemnité, les soldes acquis restant dus.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>6. Resiliation</h2>
          <p style={pStyle}>
            L'utilisateur peut se déconnecter et supprimer son compte à tout moment. Le
            solde acquis au-dessus du seuil reste retirable pendant 12 mois.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>7. Droit applicable</h2>
          <p style={pStyle}>
            Droit français. Litiges : tentative amiable préalable, puis tribunaux
            compétents de Paris.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}
