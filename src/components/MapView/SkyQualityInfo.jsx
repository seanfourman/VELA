import { useEffect, useMemo, useState } from "react";
import { fetchSkyQualityMetrics } from "../../utils/skyQuality";
import "./SkyQualityInfo.css";

function formatMaybeNumber(value, digits = 2) {
  if (value == null) return "—";
  if (typeof value !== "number" || !Number.isFinite(value)) return String(value);
  return value.toFixed(digits);
}

export default function SkyQualityInfo({ lat, lng }) {
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
          error instanceof Error ? error.message : "Failed to load WA2015 data";
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
    <div className="sky-quality-info">
      <div className="sky-quality-title">Sky Quality</div>

      {loading && (
        <div className="sky-quality-status">Loading sky brightness…</div>
      )}

      {error && (
        <div className="sky-quality-status sky-quality-error">{error}</div>
      )}

      {metrics && (
        <div className="sky-quality-grid">
          <div className="sky-quality-label">Bortle</div>
          <div className="sky-quality-value">{metrics.Bortle}</div>

          <div className="sky-quality-label">SQM</div>
          <div className="sky-quality-value">
            {formatMaybeNumber(metrics.SQM, 2)}
          </div>

          <div className="sky-quality-label">Brightness</div>
          <div className="sky-quality-value">
            {formatMaybeNumber(metrics.Brightness_mcd_m2, 1)} mcd/m²
          </div>

          <div className="sky-quality-label">Artificial</div>
          <div className="sky-quality-value">
            {formatMaybeNumber(metrics.Artif_bright_uccd_m2, 0)} µcd/m²
          </div>

          <div className="sky-quality-label">Ratio</div>
          <div className="sky-quality-value">
            {formatMaybeNumber(metrics.Ratio, 1)}×
          </div>
        </div>
      )}
    </div>
  );
}
