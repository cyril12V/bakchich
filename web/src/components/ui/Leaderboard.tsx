import { useState, useEffect } from "react";
import { fetchLeaderboard, formatEur, type LeaderboardEntry } from "@/lib/api";

export function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchLeaderboard();
        if (!cancelled) setEntries(data.leaderboard);
      } catch {
        if (!cancelled) setError("Impossible de charger le leaderboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return (
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
    );
  }

  if (entries.length === 0) {
    return (
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
        Aucune marque sur le leaderboard pour l'instant. Soyez le premier.
      </div>
    );
  }

  return (
    <div
      style={{
        border: "1px solid var(--color-gray-200)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      <table
        style={{ width: "100%", borderCollapse: "collapse" }}
        aria-label="Leaderboard des annonceurs"
      >
        <thead>
          <tr
            style={{
              backgroundColor: "var(--color-gray-50)",
              borderBottom: "1px solid var(--color-gray-200)",
            }}
          >
            {["Rang", "Marque", "Total dépensé", "Impressions"].map((col) => (
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
                }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr
              key={`${entry.brand_name}-${index}`}
              style={{
                borderBottom:
                  index < entries.length - 1
                    ? "1px solid var(--color-gray-100)"
                    : "none",
              }}
            >
              <td
                style={{
                  padding: "0.875rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 700,
                  color:
                    index === 0
                      ? "var(--color-black)"
                      : "var(--color-gray-400)",
                  fontFamily: "var(--font-body)",
                }}
              >
                #{index + 1}
              </td>
              <td style={{ padding: "0.875rem 1rem" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  {entry.brand_icon ? (
                    <img
                      src={entry.brand_icon}
                      alt=""
                      aria-hidden="true"
                      width={32}
                      height={32}
                      style={{
                        borderRadius: "6px",
                        objectFit: "contain",
                        border: "1px solid var(--color-gray-200)",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "6px",
                        backgroundColor: "var(--color-gray-100)",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1rem",
                      }}
                    >
                      {entry.brand_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: "0.9375rem",
                      fontWeight: 500,
                      color: "var(--color-black)",
                    }}
                  >
                    {entry.brand_name}
                  </span>
                </div>
              </td>
              <td
                style={{
                  padding: "0.875rem 1rem",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  color: "var(--color-black)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {formatEur(entry.spent_cents)}
              </td>
              <td
                style={{
                  padding: "0.875rem 1rem",
                  fontSize: "0.875rem",
                  color: "var(--color-gray-600)",
                  fontFamily: "var(--font-body)",
                }}
              >
                {entry.impressions.toLocaleString("fr-FR")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
