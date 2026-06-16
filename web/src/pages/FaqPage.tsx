import { PageLayout } from "@/components/layouts/PageLayout";
import { Accordion } from "@/components/ui/Accordion";

const FAQ_ITEMS = [
  {
    question: "Combien je gagne par impression ?",
    answer: (
      <p>
        Tu touches 50 % du bid de l'annonceur par impression (5 s de visibilité) et 50 %
        de chaque clic (facturé 50x une impression). Le montant exact dépend du bid de
        l'annonceur actif. Le bid minimum est de 1 EUR par bloc de 1 000 vues, soit un
        minimum de 0,05 centime par impression pour toi.
      </p>
    ),
  },
  {
    question: "Quel est le format d'une publicité ?",
    answer: (
      <p>
        Une ligne texte de 3 a 60 caractères, visible pendant 5 s dans le spinner de
        Claude Code. Nom de marque et icône obligatoires. Les pubs sont diffusées
        immédiatement après paiement : la modération automatique bloque uniquement les
        contenus interdits (adulte, scam, malware, crypto spéculative).
      </p>
    ),
  },
  {
    question: "Mes données, mon code ou mes prompts sont-ils lus ?",
    answer: (
      <p>
        Non. Jamais. Bakchich ne touche qu'au champ{" "}
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
        . Le code est public et vérifiable. Données envoyées au serveur : eventId, type
        d'event (impression/clic), campaignId, timestamp, token de session. Rien d'autre.
      </p>
    ),
  },
  {
    question: "Les gains sont-ils imposables ?",
    answer: (
      <p>
        Oui. Les gains de Bakchich sont des revenus imposables. Leur déclaration relève
        de ta seule responsabilité en tant qu'utilisateur. Bakchich ne fait pas de
        prélèvement à la source ni de déclaration fiscale en ton nom. Consulte un
        comptable si nécessaire.
      </p>
    ),
  },
  {
    question: "Bakchich est-il affilié à Anthropic ?",
    answer: (
      <p>
        Non. Bakchich est un projet indépendant, non affilié à Anthropic. Bakchich utilise
        le réglage public{" "}
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
        de Claude Code cité à titre purement descriptif. "Claude Code" est une marque de
        ses propriétaires respectifs.
      </p>
    ),
  },
  {
    question: "Comment mettre en pause ou couper Bakchich ?",
    answer: (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <p>Trois options :</p>
        <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <li style={{ display: "flex", gap: "0.5rem" }}>
            <span aria-hidden="true" style={{ color: "var(--color-gray-400)" }}>1.</span>
            <span>
              <strong>Pause :</strong> déconnecte-toi depuis l'espace Mon espace (/me). Le
              spinner reprend son comportement d'origine instantanément.
            </span>
          </li>
          <li style={{ display: "flex", gap: "0.5rem" }}>
            <span aria-hidden="true" style={{ color: "var(--color-gray-400)" }}>2.</span>
            <span>
              <strong>Désinstaller :</strong> supprime l'extension VS Code "Bakchich". Le
              fichier settings.json est restauré exactement comme avant l'installation.
            </span>
          </li>
          <li style={{ display: "flex", gap: "0.5rem" }}>
            <span aria-hidden="true" style={{ color: "var(--color-gray-400)" }}>3.</span>
            <span>
              <strong>Kill-switch global :</strong> en cas d'urgence, l'équipe Bakchich
              peut couper toutes les diffusions en moins de 60 s depuis le panel admin.
            </span>
          </li>
        </ul>
      </div>
    ),
  },
  {
    question: "Dans quels environnements fonctionne Bakchich ?",
    answer: (
      <p>
        Principalement dans Claude Code via VS Code et les IDE compatibles (Codex, etc.).
        Le CLI terminal est aussi supporté. L'extension ne fait rien dans d'autres
        contextes.
      </p>
    ),
  },
  {
    question: "Comment retirer mes gains ?",
    answer: (
      <p>
        Depuis l'espace Mon espace (/me), une fois ton compte Stripe Connect configuré
        (IBAN/KYC). Retrait minimum de 10 EUR. Les premiers retraits passent en
        validation manuelle sous 48h. Les suivants sont automatiques. Les sommes
        retirées arrivent par virement SEPA sous 1 à 3 jours ouvrables.
      </p>
    ),
  },
];

export function FaqPage() {
  return (
    <PageLayout>
      <div style={{ paddingTop: "3rem", paddingBottom: "3rem", maxWidth: "720px" }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 800,
            color: "var(--color-black)",
            marginBottom: "0.75rem",
            letterSpacing: "-0.03em",
          }}
        >
          Questions fréquentes
        </h1>
        <p
          style={{
            fontSize: "1.125rem",
            color: "var(--color-gray-500)",
            fontFamily: "var(--font-body)",
            marginBottom: "2.5rem",
          }}
        >
          Tout ce que tu dois savoir sur Bakchich, les gains, la vie privée et le fonctionnement.
        </p>
        <Accordion items={FAQ_ITEMS} />
      </div>
    </PageLayout>
  );
}
