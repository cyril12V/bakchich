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

export function ConfidentialitePage() {
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
          Politique de confidentialité
        </h1>
        <p style={{ ...pStyle, color: "var(--color-gray-400)", marginBottom: "2.5rem" }}>
          Bakchich · Document à faire relire par un juriste avant publication.
        </p>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Qui sommes-nous</h2>
          <p style={pStyle}>
            Bakchich est édité par SHALABY Cyril (entrepreneur individuel, micro-entreprise).
            Contact privacy :{" "}
            <a
              href="mailto:privacy@bakchich.dev"
              style={{ color: "var(--color-black)", fontFamily: "var(--font-body)" }}
            >
              privacy@bakchich.dev
            </a>
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Ce que nous collectons</h2>
          <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li style={liStyle}>
              <strong>Compte :</strong> email et nom fournis par Google lors de la connexion
              (uniquement pour identifier ton compte et créditer tes gains).
            </li>
            <li style={liStyle}>
              <strong>Événements publicitaires :</strong> type (impression, clic), identifiant
              de campagne, horodatage, identifiant d'événement (anti-doublon), version de
              l'extension.
            </li>
            <li style={liStyle}>
              <strong>Adresse IP :</strong> traitée de façon transitoire, uniquement pour le
              rate-limiting et la prévention de la fraude.
            </li>
            <li style={liStyle}>
              <strong>Paiements :</strong> traites par Stripe. Nous ne stockons jamais tes
              coordonnées bancaires complètes.
            </li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Ce que nous ne collectons JAMAIS</h2>
          <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li style={liStyle}>
              Ton code source, le contenu ou le nom de tes fichiers, la structure de tes
              projets.
            </li>
            <li style={liStyle}>
              Tes prompts, les réponses de l'IA, ton historique de conversation.
            </li>
            <li style={liStyle}>
              Ta navigation en dehors de l'extension et du site.
            </li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Base légale et finalités (RGPD)</h2>
          <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li style={liStyle}>
              Exécution du contrat (art. 6.1.b) : servir les publicités, créditer et
              verser tes gains.
            </li>
            <li style={liStyle}>
              Intérêt légitime (art. 6.1.f) : prévention de la fraude, sécurité du
              service.
            </li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Durées de conservation</h2>
          <ul style={{ paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <li style={liStyle}>Compte : jusqu'à suppression par l'utilisateur.</li>
            <li style={liStyle}>Événements : 3 ans (preuve comptable des reversements).</li>
            <li style={liStyle}>IP : 30 jours max.</li>
          </ul>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Destinataires</h2>
          <p style={pStyle}>
            Stripe (paiements et reversements), Hostinger (infrastructure, Union
            Européenne). Aucune vente de données, aucun courtier en données, aucune
            utilisation pour entraîner des modèles d'IA.
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Tes droits</h2>
          <p style={pStyle}>
            Accès, rectification, effacement, portabilité, opposition : écris à{" "}
            <a
              href="mailto:privacy@bakchich.dev"
              style={{ color: "var(--color-black)", fontFamily: "var(--font-body)" }}
            >
              privacy@bakchich.dev
            </a>
            . Réclamation possible auprès de la CNIL (cnil.fr).
          </p>
        </section>

        <section style={sectionStyle}>
          <h2 style={h2Style}>Données Google</h2>
          <p style={pStyle}>
            L'utilisation des informations reçues des API Google respecte la Google API
            Services User Data Policy, y compris les exigences "Limited Use" : email et
            nom servent uniquement à identifier ton compte et créditer tes gains.
          </p>
        </section>
      </div>
    </PageLayout>
  );
}
