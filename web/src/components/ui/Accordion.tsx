import { useState, useId } from "react";
import type { ReactNode } from "react";

interface AccordionItem {
  question: string;
  answer: ReactNode;
}

interface Props {
  items: AccordionItem[];
}

function AccordionEntry({
  question,
  answer,
}: AccordionItem) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const headingId = `accordion-heading-${id}`;
  const panelId = `accordion-panel-${id}`;

  return (
    <div
      style={{
        borderBottom: "1px solid var(--color-gray-200)",
      }}
    >
      <h3>
        <button
          id={headingId}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            padding: "1.25rem 0",
            background: "none",
            border: "none",
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "var(--font-body)",
            fontSize: "1rem",
            fontWeight: 500,
            color: "var(--color-black)",
          }}
        >
          {question}
          <span
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: "20px",
              height: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "transform var(--transition-fast)",
              transform: open ? "rotate(45deg)" : "none",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2a1 1 0 011 1v4h4a1 1 0 110 2H9v4a1 1 0 11-2 0V9H3a1 1 0 110-2h4V3a1 1 0 011-1z" />
            </svg>
          </span>
        </button>
      </h3>
      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        hidden={!open}
        style={{
          paddingBottom: "1.25rem",
          fontSize: "0.9375rem",
          color: "var(--color-gray-600)",
          fontFamily: "var(--font-body)",
          lineHeight: 1.7,
        }}
      >
        {answer}
      </div>
    </div>
  );
}

export function Accordion({ items }: Props) {
  return (
    <div>
      {items.map((item, i) => (
        <AccordionEntry key={i} {...item} />
      ))}
    </div>
  );
}
