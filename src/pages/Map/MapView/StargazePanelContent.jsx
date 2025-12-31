import "./StargazePanel.css";

const IMAGE_EXT_REGEX = /\.(png|jpe?g|webp|gif|avif)(\?|#|$)/i;

const isImageUrl = (value) =>
  typeof value === "string" && IMAGE_EXT_REGEX.test(value);

const formatCoords = (lat, lng) =>
  `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;

const dedupeList = (items = []) => {
  const seen = new Set();
  return items
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    });
};

const getLinkHost = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "source";
  try {
    const { hostname } = new URL(raw);
    return hostname.replace(/^www\./, "");
  } catch {
    return raw.replace(/^https?:\/\//, "").split("/")[0] || "source";
  }
};

const getMapLink = (lat, lng, provider) => {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (provider === "waze") {
    const params = new URLSearchParams();
    params.set("ll", `${lat},${lng}`);
    params.set("navigate", "yes");
    return `https://www.waze.com/ul?${params.toString()}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
};

const renderLinkList = (title, links, labelPrefix) => {
  if (!links.length) return null;
  return (
    <section className="stargaze-panel__section">
      <div className="stargaze-panel__section-title">{title}</div>
      <div className="stargaze-panel__links">
        {links.map((link, index) => (
          <a
            key={`${title}-${index}`}
            className="stargaze-panel__link"
            href={link}
            target="_blank"
            rel="noreferrer"
          >
            <span className="stargaze-panel__link-label">
              {labelPrefix} {index + 1}
            </span>
            <span className="stargaze-panel__link-domain">
              {getLinkHost(link)}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
};

export default function StargazePanelContent({
  spot,
  directionsProvider = "google",
}) {
  if (!spot) return null;

  const rawImages = Array.isArray(spot.images) ? spot.images : [];
  const imageUrls = rawImages.filter(isImageUrl);
  const derivedPhotoLinks = rawImages.filter((url) => !isImageUrl(url));
  const photoLinks = dedupeList([
    ...(Array.isArray(spot.photoLinks) ? spot.photoLinks : []),
    ...derivedPhotoLinks,
  ]);
  const sourceLinks = dedupeList(
    Array.isArray(spot.sourceLinks) ? spot.sourceLinks : []
  );

  const coordsLabel =
    Number.isFinite(spot.lat) && Number.isFinite(spot.lng)
      ? formatCoords(spot.lat, spot.lng)
      : "";
  const facts = [
    { label: "Type", value: spot.type },
    { label: "Region", value: spot.region },
    { label: "Country", value: spot.country },
    { label: "Best time", value: spot.bestTime },
    { label: "Coordinates", value: coordsLabel },
  ].filter((fact) => fact.value);

  const mapUrl = getMapLink(spot.lat, spot.lng, directionsProvider);
  const mapLabel =
    directionsProvider === "waze" ? "Open in Waze" : "Open in Google Maps";

  const hasMedia = imageUrls.length || photoLinks.length || sourceLinks.length;

  return (
    <div className="stargaze-panel__content">
      <section className="stargaze-panel__section">
        <div className="stargaze-panel__section-title">Overview</div>
        {spot.description ? (
          <div className="stargaze-panel__desc">{spot.description}</div>
        ) : (
          <div className="stargaze-panel__empty">
            No description yet for this location.
          </div>
        )}
      </section>

      {facts.length > 0 ? (
        <section className="stargaze-panel__section">
          <div className="stargaze-panel__section-title">Quick facts</div>
          <div className="stargaze-panel__facts">
            {facts.map((fact) => (
              <div key={fact.label} className="stargaze-panel__fact">
                <div className="stargaze-panel__fact-label">{fact.label}</div>
                <div className="stargaze-panel__fact-value">{fact.value}</div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {mapUrl ? (
        <section className="stargaze-panel__section">
          <div className="stargaze-panel__section-title">Actions</div>
          <div className="stargaze-panel__actions">
            <a
              className="stargaze-panel__action"
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
            >
              {mapLabel}
            </a>
          </div>
        </section>
      ) : null}

      {imageUrls.length > 0 ? (
        <section className="stargaze-panel__section">
          <div className="stargaze-panel__section-title">Gallery</div>
          <div className="stargaze-panel__gallery">
            {imageUrls.slice(0, 6).map((imageUrl, index) => (
              <img
                key={`${spot.id}-image-${index}`}
                src={imageUrl}
                alt={`${spot.name} view ${index + 1}`}
                loading="lazy"
              />
            ))}
          </div>
        </section>
      ) : null}

      {renderLinkList("Photo sources", photoLinks, "Photo source")}
      {renderLinkList("Sources", sourceLinks, "Source")}

      {!hasMedia ? (
        <div className="stargaze-panel__empty">
          No photos or source links available yet.
        </div>
      ) : null}
    </div>
  );
}
