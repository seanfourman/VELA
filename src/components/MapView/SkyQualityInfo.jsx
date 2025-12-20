import { useEffect, useMemo, useState } from "react";
import { fetchSkyQualityMetrics } from "../../utils/skyQuality";
import "./SkyQualityInfo.css";

function formatMaybeNumber(value, digits = 2) {
  if (value == null) return "N/A";
  if (typeof value !== "number" || !Number.isFinite(value))
    return String(value);
  return value.toFixed(digits);
}

export default function SkyQualityInfo({ lat, lng, variant = "compact" }) {
  const coordKey = useMemo(() => {
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    return `${lat.toFixed(5)},${lng.toFixed(5)}`;
  }, [lat, lng]);

  const [state, setState] = useState({ key: null, metrics: null, error: null });

  useEffect(() => {
    if (!coordKey) return;
    let cancelled = false;
    fetchSkyQualityMetrics(lat, lng)
      .then((metrics) => {
        if (cancelled) return;
        setState({ key: coordKey, metrics, error: null });
      })
      .catch((error) => {
        if (cancelled) return;
        const message =
          error instanceof Error ? error.message : "Failed to load sky quality";
        setState({ key: coordKey, metrics: null, error: message });
      });
    return () => {
      cancelled = true;
    };
  }, [coordKey, lat, lng]);

  if (!coordKey) return null;

  const loading = state.key !== coordKey;
  const metrics = state.key === coordKey ? state.metrics : null;
  const error = state.key === coordKey ? state.error : null;

  return (
    <div className={`sky-quality-info ${variant}`}>
      <div className="sky-quality-heading">
        <span className="sky-quality-label">Sky quality</span>
        <span className="sky-quality-chip">WA2015</span>
      </div>

      {loading && (
        <div className="sky-quality-placeholder">
          <div className="sky-quality-main placeholder">
            <div className="sky-quality-block">
              <div className="placeholder-line short" />
              <div className="placeholder-line" />
            </div>
            <div className="sky-quality-block">
              <div className="placeholder-line short" />
              <div className="placeholder-line" />
            </div>
          </div>
          <div className="sky-quality-meta placeholder">
            <div className="placeholder-line wide" />
            <div className="placeholder-line wide" />
            <div className="placeholder-line wide" />
          </div>
        </div>
      )}

      {error && (
        <div className="sky-quality-status sky-quality-error">{error}</div>
      )}

      {metrics && (
        <>
          <div className="sky-quality-main">
            <a
              className="sky-quality-block sky-quality-link-block"
              href="https://www.handprint.com/ASTRO/bortle.html"
              target="_blank"
              rel="noreferrer"
            >
              <div className="sky-quality-block-label">Bortle</div>
              <div className="sky-quality-block-value">{metrics.Bortle}</div>
            </a>
            <div className="sky-quality-block">
              <div className="sky-quality-block-label">SQM</div>
              <div className="sky-quality-block-value">
                {formatMaybeNumber(metrics.SQM, 2)}
              </div>
            </div>
          </div>

          <div className="sky-quality-meta">
            <div className="meta-row">
              <span>Brightness</span>
              <span>
                {formatMaybeNumber(metrics.Brightness_mcd_m2, 1)} mcd/m²
              </span>
            </div>
            <div className="meta-row">
              <span>Artificial</span>
              <span>
                {formatMaybeNumber(metrics.Artif_bright_uccd_m2, 0)} ucd/m²
              </span>
            </div>
            <div className="meta-row">
              <span>Ratio</span>
              <span>{formatMaybeNumber(metrics.Ratio, 1)}x</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
