import {
  useState,
  useRef,
  type ChangeEvent,
  type FormEvent,
  type DragEvent,
  type ReactNode,
} from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  createCampaign,
  editCampaign,
  formatEur,
  parseEurInput,
  apiErrorMessage,
  ApiErrorClass,
  type AuctionResponse,
  type Campaign,
} from "@/lib/api";

interface Props {
  auctionData: AuctionResponse | null;
  /** Contenu optionnel ajoute après le message de succes (ex. lien vers l'espace annonceur) */
  successSuffix?: ReactNode;
  /** Email pré-rempli (annonceur connecté) : évite de re-saisir son adresse. */
  defaultEmail?: string;
  /** Si fourni : mode ÉDITION de cette campagne (au lieu de création). */
  editCampaignData?: Campaign;
  /** Appelé après une modification appliquée sans paiement (pour rafraîchir/fermer). */
  onDone?: () => void;
}

interface FormState {
  advertiserEmail: string;
  text: string;
  url: string;
  brandName: string;
  brandIcon: string | null;
  showOnLeaderboard: boolean;
  bid: string;
  blocks: string;
}

const INITIAL_STATE: FormState = {
  advertiserEmail: "",
  text: "",
  url: "",
  brandName: "",
  brandIcon: null,
  showOnLeaderboard: false,
  bid: "1,00",
  blocks: "1",
};

type SubmitStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string; suffix?: ReactNode }
  | { kind: "error"; message: string };

/* Style partage pour les inputs custom */
const inputStyle: React.CSSProperties = {
  padding: "0.625rem 0.875rem",
  border: "1px solid var(--color-gray-200)",
  borderRadius: "var(--radius-md)",
  fontSize: "0.9375rem",
  fontFamily: "var(--font-body)",
  color: "var(--color-black)",
  backgroundColor: "var(--color-white)",
  outline: "none",
  width: "100%",
  transition: "border-color var(--transition-fast)",
};

const inputErrorStyle: React.CSSProperties = {
  ...inputStyle,
  borderColor: "var(--color-black)",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 500,
  color: "var(--color-gray-700)",
  fontFamily: "var(--font-body)",
  display: "block",
  marginBottom: "0.375rem",
};

const errorStyle: React.CSSProperties = {
  fontSize: "0.8125rem",
  color: "var(--color-black)",
  fontWeight: 500,
  marginTop: "0.25rem",
};

export function CampaignForm({ auctionData, successSuffix, defaultEmail, editCampaignData, onDone }: Props) {
  const isEdit = Boolean(editCampaignData);
  const initialState: FormState = editCampaignData
    ? {
        advertiserEmail: defaultEmail ?? "",
        text: editCampaignData.text,
        url: editCampaignData.url,
        brandName: editCampaignData.brand_name ?? "",
        brandIcon: null, // null = on garde l'icône existante (non rechargée ici)
        showOnLeaderboard: Boolean(editCampaignData.show_on_leaderboard),
        bid: (editCampaignData.bid_cents / 100).toFixed(2).replace(".", ","),
        blocks: String(editCampaignData.blocks),
      }
    : { ...INITIAL_STATE, advertiserEmail: defaultEmail ?? "" };
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [status, setStatus] = useState<SubmitStatus>({ kind: "idle" });
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bidCents = parseEurInput(form.bid);
  const blocksCount = parseInt(form.blocks, 10) || 0;
  const totalCents = isNaN(bidCents) ? 0 : bidCents * blocksCount;
  const totalImpressions = blocksCount * 1000;
  const topBidCents =
    auctionData?.queue[0]?.bid_cents ?? auctionData?.minBidCents ?? 100;

  function set(field: keyof FormState, value: string | boolean | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: Partial<Record<keyof FormState, string>> = {};
    const emailRe = /.+@.+\..+/;
    // En édition : email et icône ne sont pas requis (on garde l'existant).
    if (!isEdit && !emailRe.test(form.advertiserEmail))
      newErrors.advertiserEmail = "Adresse email invalide.";
    if (form.text.length < 3 || form.text.length > 60)
      newErrors.text = "Le texte doit faire entre 3 et 60 caractères.";
    if (!form.url.startsWith("https://"))
      newErrors.url = "L'URL doit commencer par https://.";
    if (isNaN(bidCents) || bidCents < 100)
      newErrors.bid = "Le bid minimum est de 1,00 EUR.";
    if (blocksCount < 1)
      newErrors.blocks = "Il faut au moins 1 bloc.";
    if (!form.brandName.trim())
      newErrors.brandName = "Le nom de marque est obligatoire.";
    if (!isEdit && !form.brandIcon)
      newErrors.brandIcon = "L'icône de marque est obligatoire.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setStatus({ kind: "loading" });
    try {
      // --- Mode ÉDITION ---
      if (isEdit && editCampaignData) {
        const result = await editCampaign(editCampaignData.id, {
          text: form.text,
          url: form.url,
          bidCents,
          blocks: blocksCount,
          brandName: form.brandName,
          showOnLeaderboard: form.showOnLeaderboard,
          // n'envoyer l'icône que si l'annonceur en a chargé une nouvelle
          ...(form.brandIcon ? { brandIcon: form.brandIcon } : {}),
        });
        if (result.checkoutUrl) {
          window.location.href = result.checkoutUrl; // payer la différence
          return;
        }
        setStatus({ kind: "success", message: "Campagne mise à jour." });
        onDone?.();
        return;
      }

      // --- Mode CRÉATION ---
      const result = await createCampaign({
        advertiserEmail: form.advertiserEmail,
        text: form.text,
        url: form.url,
        bidCents,
        blocks: blocksCount,
        brandName: form.brandName,
        brandIcon: form.brandIcon ?? undefined,
        showOnLeaderboard: form.showOnLeaderboard,
      });
      if (result.checkoutUrl) {
        window.location.href = result.checkoutUrl;
        return;
      }
      setStatus({
        kind: "success",
        message:
          result.message ??
          "Campagne créée. Connecte-toi a ton espace annonceur pour suivre son statut.",
        suffix: successSuffix,
      });
      setForm(initialState);
      setIconPreview(null);
    } catch (err) {
      if (err instanceof ApiErrorClass) {
        setStatus({ kind: "error", message: apiErrorMessage(err.code) });
      } else {
        setStatus({ kind: "error", message: "Une erreur est survenue. Réessayez." });
      }
    }
  }

  function handleIconFile(file: File | null) {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        brandIcon: "Format non supporté. Utilisez PNG, JPG ou WebP.",
      }));
      return;
    }
    if (file.size > 512 * 1024) {
      setErrors((prev) => ({
        ...prev,
        brandIcon: "L'icône doit faire moins de 512 Ko.",
      }));
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      set("brandIcon", dataUrl);
      setIconPreview(dataUrl);
      setErrors((prev) => ({ ...prev, brandIcon: undefined }));
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0] ?? null;
    handleIconFile(file);
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    handleIconFile(e.target.files?.[0] ?? null);
  }

  const bidAboveTop = bidCents > topBidCents;
  // En édition : différence à payer si le nouveau coût (bid x blocs) dépasse l'ancien.
  const editOldCost = editCampaignData ? editCampaignData.bid_cents * editCampaignData.blocks : 0;
  const editDiffCents = isEdit ? Math.max(0, bidCents * blocksCount - editOldCost) : 0;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      {/* Email annonceur : seulement à la création (en édition on garde l'existant). */}
      {!isEdit && (
        <Input
          label="Email annonceur"
          type="email"
          required
          autoComplete="email"
          placeholder="vous@votreentreprise.com"
          value={form.advertiserEmail}
          onChange={(e) => set("advertiserEmail", e.target.value)}
          error={errors.advertiserEmail}
        />
      )}

      {/* Texte publicitaire avec compteur */}
      <div>
        <label htmlFor="campaign-text" style={labelStyle}>
          Ligne de publicité <span style={{ color: "var(--color-gray-400)", fontWeight: 400 }}>(3-60 car.)</span>
        </label>
        <div style={{ position: "relative" }}>
          <input
            id="campaign-text"
            type="text"
            required
            minLength={3}
            maxLength={60}
            placeholder="Essayez Acme Cloud, 30 jours offerts"
            value={form.text}
            onChange={(e) => set("text", e.target.value)}
            aria-describedby="campaign-text-count"
            aria-invalid={errors.text ? true : undefined}
            style={errors.text
              ? { ...inputErrorStyle, paddingRight: "3.25rem" }
              : { ...inputStyle, paddingRight: "3.25rem" }
            }
          />
          <span
            id="campaign-text-count"
            aria-live="polite"
            aria-atomic="true"
            style={{
              position: "absolute",
              right: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "0.75rem",
              color: form.text.length > 55 ? "var(--color-black)" : "var(--color-gray-400)",
              fontFamily: "var(--font-body)",
              fontWeight: 500,
              pointerEvents: "none",
            }}
          >
            {form.text.length}/60
          </span>
        </div>
        {errors.text && <p role="alert" style={errorStyle}>{errors.text}</p>}
      </div>

      <Input
        label="URL de destination"
        type="url"
        required
        placeholder="https://votresite.com/landing"
        value={form.url}
        onChange={(e) => set("url", e.target.value)}
        error={errors.url}
      />

      {/* Nom de marque - obligatoire */}
      <div>
        <label htmlFor="campaign-brand" style={labelStyle}>
          Nom de marque <span style={{ color: "var(--color-black)", fontWeight: 600, fontSize: "0.8125rem" }}>*</span>
        </label>
        <input
          id="campaign-brand"
          type="text"
          required
          placeholder="Acme Cloud"
          maxLength={40}
          value={form.brandName}
          onChange={(e) => set("brandName", e.target.value)}
          aria-invalid={errors.brandName ? true : undefined}
          style={errors.brandName ? inputErrorStyle : inputStyle}
        />
        {errors.brandName && <p role="alert" style={errorStyle}>{errors.brandName}</p>}
      </div>

      {/* Icône - obligatoire */}
      <div>
        <p style={{ ...labelStyle, marginBottom: "0.375rem" }}>
          Icône de marque <span style={{ color: "var(--color-black)", fontWeight: 600, fontSize: "0.8125rem" }}>*</span>{" "}
          <span style={{ color: "var(--color-gray-400)", fontWeight: 400 }}>(PNG/JPG/WebP, max 512 Ko)</span>
        </p>
        <div
          role="button"
          tabIndex={0}
          aria-label="Zone de depot de l'icône. Cliquez ou deposez un fichier."
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${errors.brandIcon ? "var(--color-black)" : dragOver ? "var(--color-accent-deep)" : "var(--color-gray-200)"}`,
            borderRadius: "var(--radius-md)",
            padding: "1rem",
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: dragOver ? "var(--color-accent-soft)" : "var(--color-white)",
            transition: "all var(--transition-fast)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
          }}
        >
          {iconPreview ? (
            <>
              <img
                src={iconPreview}
                alt="Apercu de l'icône"
                style={{ width: "36px", height: "36px", objectFit: "contain", borderRadius: "6px" }}
              />
              <span style={{ fontSize: "0.875rem", color: "var(--color-gray-600)", fontFamily: "var(--font-body)" }}>
                Icône chargee. Cliquez pour changer.
              </span>
            </>
          ) : (
            <span style={{ fontSize: "0.875rem", color: "var(--color-gray-400)", fontFamily: "var(--font-body)" }}>
              Glissez un fichier ici ou cliquez
            </span>
          )}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          style={{ display: "none" }}
          aria-hidden="true"
        />
        {errors.brandIcon && <p role="alert" style={errorStyle}>{errors.brandIcon}</p>}
      </div>

      {/* Bid + blocs sur une ligne */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
        <div>
          <label htmlFor="campaign-bid" style={labelStyle}>
            Bid / bloc <span style={{ color: "var(--color-gray-400)", fontWeight: 400 }}>(min 1,00 EUR)</span>
          </label>
          <input
            id="campaign-bid"
            type="text"
            inputMode="decimal"
            placeholder="1,00"
            value={form.bid}
            onChange={(e) => set("bid", e.target.value)}
            aria-invalid={errors.bid ? true : undefined}
            style={errors.bid ? inputErrorStyle : inputStyle}
          />
          {errors.bid && <p role="alert" style={errorStyle}>{errors.bid}</p>}
        </div>

        <div>
          <label htmlFor="campaign-blocks" style={labelStyle}>
            Nombre de blocs
          </label>
          <input
            id="campaign-blocks"
            type="number"
            min={1}
            step={1}
            placeholder="1"
            value={form.blocks}
            onChange={(e) => set("blocks", e.target.value)}
            aria-invalid={errors.blocks ? true : undefined}
            style={errors.blocks ? inputErrorStyle : inputStyle}
          />
          {errors.blocks && <p role="alert" style={errorStyle}>{errors.blocks}</p>}
        </div>
      </div>

      {/* Note pedagogique compacte */}
      <p
        style={{
          fontSize: "0.8125rem",
          color: "var(--color-gray-500)",
          fontFamily: "var(--font-body)",
          lineHeight: 1.5,
        }}
      >
        1 bloc = 1 000 vues. Un bid plus élevé priorise votre diffusion, n'ajoute pas de vues.
      </p>

      {/* Leaderboard opt-in */}
      <label
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "0.625rem",
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={form.showOnLeaderboard}
          onChange={(e) => set("showOnLeaderboard", e.target.checked)}
          style={{ marginTop: "2px", width: "16px", height: "16px", flexShrink: 0, accentColor: "var(--color-accent-deep)" }}
        />
        <span style={{ fontSize: "0.9375rem", color: "var(--color-gray-700)", fontFamily: "var(--font-body)" }}>
          M'afficher sur le leaderboard public des annonceurs
        </span>
      </label>

      {/* Estimation live */}
      {blocksCount >= 1 && bidCents >= 100 && (
        <div
          aria-live="polite"
          aria-atomic="true"
          style={{
            backgroundColor: "var(--color-gray-50)",
            border: "1px solid var(--color-gray-200)",
            borderRadius: "var(--radius-md)",
            padding: "0.875rem 1rem",
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0.75rem",
            textAlign: "center",
          }}
        >
          <div>
            <p style={{ fontSize: "1.125rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-black)" }}>
              {formatEur(totalCents)}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--color-gray-500)", fontFamily: "var(--font-body)" }}>Total</p>
          </div>
          <div>
            <p style={{ fontSize: "1.125rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-black)" }}>
              {totalImpressions.toLocaleString("fr-FR")}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--color-gray-500)", fontFamily: "var(--font-body)" }}>Vues</p>
          </div>
          <div>
            <p style={{ fontSize: "1.125rem", fontWeight: 700, fontFamily: "var(--font-display)", color: "var(--color-black)" }}>
              {formatEur(bidCents)}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--color-gray-500)", fontFamily: "var(--font-body)" }}>Prix / bloc</p>
          </div>
        </div>
      )}

      {/* Indicateur top-bid */}
      {auctionData && (
        <p
          style={{
            fontSize: "0.8125rem",
            color: bidAboveTop ? "var(--color-accent-deep)" : "var(--color-gray-500)",
            fontFamily: "var(--font-body)",
            fontWeight: bidAboveTop ? 600 : 400,
          }}
        >
          {bidAboveTop
            ? `Votre bid dépasse le top actuel (${formatEur(topBidCents)}). Vous passerez en tête de file.`
            : `Bid actuel en tête de file : ${formatEur(topBidCents)}. Surenchérissez pour passer en premier.`}
        </p>
      )}

      {/* Feedback soumission */}
      {status.kind === "success" && (
        <div
          role="alert"
          style={{
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-accent-soft)",
            border: "1px solid rgba(97,160,26,0.3)",
            fontSize: "0.9375rem",
            color: "var(--color-accent-deep)",
            fontFamily: "var(--font-body)",
            fontWeight: 500,
          }}
        >
          {status.message}
          {status.suffix}
        </div>
      )}

      {status.kind === "error" && (
        <div
          role="alert"
          style={{
            padding: "1rem",
            borderRadius: "var(--radius-md)",
            backgroundColor: "var(--color-gray-50)",
            border: "1px solid var(--color-black)",
            fontSize: "0.9375rem",
            color: "var(--color-black)",
            fontFamily: "var(--font-body)",
            fontWeight: 500,
          }}
        >
          {status.message}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        loading={status.kind === "loading"}
        disabled={status.kind === "loading"}
        style={{ width: "100%" }}
      >
        {isEdit
          ? editDiffCents > 0
            ? `Payer la différence (${formatEur(editDiffCents)})`
            : "Enregistrer les modifications"
          : "Payer maintenant"}
      </Button>
    </form>
  );
}
