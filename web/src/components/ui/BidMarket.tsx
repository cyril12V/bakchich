import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/Badge";
import { formatEur, fetchAuction, type AuctionItem, type AuctionResponse } from "@/lib/api";

type TimeFilter = "24h" | "all";

interface Props {
  compact?: boolean;
  onDataLoaded?: (data: AuctionResponse) => void;
}

export function BidMarket({ compact = false, onDataLoaded }: Props) {
  const [filter, setFilter] = useState<TimeFilter>("all");
  const [data, setData] = useState<AuctionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchAuction();
        if (!cancelled) {
          setData(result);
          onDataLoaded?.(result);
        }
      } catch {
        if (!cancelled) setError("Impossible de charger les enchères.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    const interval = setInterval(() => { void load(); }, 30_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [onDataLoaded]);

  const now = Date.now();
  const filteredQueue: AuctionItem[] = data?.queue
    ? filter === "24h"
      ? data.queue.filter((item) => now - item.created_at < 24 * 60 * 60 * 1000)
      : data.queue
    : [];

  // La file est triée par bid décroissant. À bid égal, l'enchère sert les campagnes
  // ex æquo en tête à tour de rôle (rotation côté backend) : elles diffusent donc
  // TOUTES réellement. Le statut « Diffusé » suit le bid max, pas la seule position #1.
  const topBidCents = filteredQueue[0]?.bid_cents ?? 0;

  return (
    <section aria-label="Bid Market en temps réel">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          marginBottom: "1rem",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: compact ? "1.25rem" : "1.5rem",
            fontWeight: 700,
            color: "var(--color-black)",
          }}
        >
          Bid Market
        </h2>
        <div style={{ display: "flex", gap: "0.375rem" }}>
          {(["24h", "all"] as TimeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              style={{
                padding: "0.375rem 0.875rem",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-gray-200)",
                backgroundColor: filter === f ? "var(--color-black)" : "var(--color-white)",
                color: filter === f ? "var(--color-white)" : "var(--color-gray-600)",
                fontSize: "0.8125rem",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "var(--font-body)",
                transition: "all var(--transition-fast)",
              }}
            >
              {f === "24h" ? "24h" : "Tout"}
            </button>
          ))}
        </div>
      </div>

      {/* Etats */}
      {loading && (
        <div
          aria-live="polite"
          aria-busy="true"
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "var(--color-gray-400)",
            fontFamily: "var(--font-body)",
          }}
        >
          Chargement...
        </div>
      )}

      {error && !loading && (
        <div
          role="alert"
          style={{
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-gray-200)",
            color: "var(--color-gray-600)",
            fontFamily: "var(--font-body)",
            textAlign: "center",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && filteredQueue.length === 0 && (
        <div
          style={{
            padding: "2rem",
            textAlign: "center",
            color: "var(--color-gray-400)",
            fontFamily: "var(--font-body)",
            border: "1px dashed var(--color-gray-200)",
            borderRadius: "var(--radius-md)",
          }}
        >
          Aucune campagne en file pour le moment.
        </div>
      )}

      {!loading && !error && filteredQueue.length > 0 && (
        <div
          style={{
            border: "1px solid var(--color-gray-200)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
          }}
        >
          <table
            style={{ width: "100%", borderCollapse: "collapse" }}
            aria-label="File d'enchères active"
          >
            <thead>
              <tr
                style={{
                  backgroundColor: "var(--color-gray-50)",
                  borderBottom: "1px solid var(--color-gray-200)",
                }}
              >
                {["Pos.", "Texte de la pub", "Bid", "Blocs", "Vues restantes", "Statut"].map(
                  (col) => (
                    <th
                      key={col}
                      scope="col"
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "left",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "var(--color-gray-500)",
                        fontFamily: "var(--font-body)",
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {col}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {filteredQueue.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom:
                      index < filteredQueue.length - 1
                        ? "1px solid var(--color-gray-100)"
                        : "none",
                    backgroundColor:
                      index === 0 ? "var(--color-gray-50)" : "var(--color-white)",
                  }}
                >
                  <td
                    style={{
                      padding: "0.875rem 1rem",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      color:
                        index === 0 ? "var(--color-black)" : "var(--color-gray-400)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    #{index + 1}
                  </td>
                  <td
                    style={{
                      padding: "0.875rem 1rem",
                      fontSize: "0.9375rem",
                      color: "var(--color-black)",
                      fontFamily: "var(--font-body)",
                      maxWidth: "280px",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
                      <img
                        src={`/api/campaigns/${item.id}/icon`}
                        alt=""
                        width={24}
                        height={24}
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "5px",
                          objectFit: "cover",
                          flexShrink: 0,
                          backgroundColor: "var(--color-gray-100)",
                          border: "1px solid var(--color-gray-200)",
                        }}
                      />
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          minWidth: 0,
                        }}
                      >
                        {item.brand_name && (
                          <strong style={{ marginRight: "0.375rem" }}>{item.brand_name}</strong>
                        )}
                        {item.text}
                      </span>
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "0.875rem 1rem",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "var(--color-black)",
                      fontFamily: "var(--font-body)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatEur(item.bid_cents)}
                  </td>
                  <td
                    style={{
                      padding: "0.875rem 1rem",
                      fontSize: "0.875rem",
                      color: "var(--color-gray-600)",
                      fontFamily: "var(--font-body)",
                    }}
                  >
                    {item.blocks}
                  </td>
                  <td
                    style={{
                      padding: "0.875rem 1rem",
                      fontSize: "0.875rem",
                      color: "var(--color-gray-600)",
                      fontFamily: "var(--font-body)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.impressions_left.toLocaleString("fr-FR")}
                  </td>
                  <td style={{ padding: "0.875rem 1rem" }}>
                    <Badge variant={item.bid_cents === topBidCents ? "live" : "muted"}>
                      {item.bid_cents === topBidCents ? "Diffusé" : "En file"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && (
        <p
          style={{
            marginTop: "0.75rem",
            fontSize: "0.8125rem",
            color: "var(--color-gray-400)",
            fontFamily: "var(--font-body)",
          }}
        >
          Bid minimum : {formatEur(data.minBidCents)} par bloc. Actualisé toutes les 30 s.
        </p>
      )}
    </section>
  );
}
