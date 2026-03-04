import {
  classifyKpIndex,
  estimateAuroraChance,
  formatKpValue,
  formatUtcDate,
  formatUtcDateTime,
  getCmeImpactLabel,
} from "@/features/spaceWeather/spaceWeatherModel";

function MetricCard({ label, value, helper }) {
  return (
    <div className="space-weather-card">
      <div className="space-weather-card__label">{label}</div>
      <div className="space-weather-card__value">{value}</div>
      {helper ? <div className="space-weather-card__helper">{helper}</div> : null}
    </div>
  );
}

function SpaceWeatherPanelContent({
  snapshot,
  location,
  loading,
  error,
  onRefresh,
}) {
  const stats = snapshot?.stats ?? null;
  const latestKp = stats?.latestKp ?? null;
  const peak72h = stats?.peakKp72h ?? latestKp;
  const kpCategory = classifyKpIndex(latestKp);
  const hasLatitude =
    typeof location?.lat === "number" && Number.isFinite(location.lat);
  const aurora = estimateAuroraChance({
    latitude: location?.lat,
    kpIndex: peak72h,
  });

  const recentStorms = snapshot?.gstEvents?.slice(0, 5) ?? [];
  const recentEarthCmes = snapshot?.earthDirectedCmes?.slice(0, 4) ?? [];

  return (
    <div className="space-weather-panel__content">
      <div className="space-weather-panel__status">
        <span className={`space-weather-badge ${kpCategory.tone}`}>
          {kpCategory.shortLabel}
        </span>
        <button
          type="button"
          className="space-weather-refresh"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Updating..." : "Refresh"}
        </button>
      </div>

      {error ? (
        <div className="space-weather-panel__error">
          <div>{error}</div>
          <div className="space-weather-panel__error-hint">
            If this keeps failing, check `VITE_NASA_API_KEY` in your `.env`.
          </div>
        </div>
      ) : null}

      <div className="space-weather-grid">
        <MetricCard
          label="Latest Kp"
          value={formatKpValue(latestKp)}
          helper={
            stats?.latestKpTime
              ? formatUtcDateTime(stats.latestKpTime)
              : "No recent sample"
          }
        />
        <MetricCard
          label="Peak (72h)"
          value={formatKpValue(stats?.peakKp72h)}
          helper={classifyKpIndex(stats?.peakKp72h).label}
        />
        <MetricCard
          label="Storms (30d)"
          value={String(stats?.stormCount30d ?? 0)}
          helper="Geomagnetic storm records"
        />
        <MetricCard
          label="Earth CMEs (21d)"
          value={String(stats?.earthDirectedCmeCount ?? 0)}
          helper="Modelled Earth-directed impacts"
        />
      </div>

      <div className="space-weather-aurora">
        <div className="space-weather-section__title">Aurora Outlook</div>
        <div className="space-weather-aurora__row">
          <span className={`space-weather-badge ${aurora.tone}`}>
            {aurora.label}
          </span>
          <span className="space-weather-aurora__meta">
            {hasLatitude
              ? `${Math.abs(location.lat).toFixed(1)} deg latitude`
              : "Location unavailable"}
          </span>
        </div>
        <div className="space-weather-aurora__detail">{aurora.detail}</div>
      </div>

      <div className="space-weather-section">
        <div className="space-weather-section__title">Recent Storm Timeline</div>
        {recentStorms.length === 0 ? (
          <div className="space-weather-empty">No GST events in the selected range</div>
        ) : (
          <div className="space-weather-list">
            {recentStorms.map((storm) => {
              const stormCategory = classifyKpIndex(storm.maxKp);
              return (
                <a
                  key={storm.id}
                  href={storm.link || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="space-weather-list__item"
                >
                  <div className="space-weather-list__main">
                    <div className="space-weather-list__headline">
                      {formatUtcDateTime(storm.startTime)}
                    </div>
                    <div className="space-weather-list__subline">
                      Peak Kp {formatKpValue(storm.maxKp)}
                    </div>
                  </div>
                  <span className={`space-weather-badge small ${stormCategory.tone}`}>
                    {stormCategory.scale}
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-weather-section">
        <div className="space-weather-section__title">Earth-Directed CME Models</div>
        {recentEarthCmes.length === 0 ? (
          <div className="space-weather-empty">No Earth-directed CME runs recently</div>
        ) : (
          <div className="space-weather-list">
            {recentEarthCmes.map((cme) => (
              <a
                key={cme.id}
                href={cme.link || undefined}
                target="_blank"
                rel="noreferrer"
                className="space-weather-list__item"
              >
                <div className="space-weather-list__main">
                  <div className="space-weather-list__headline">
                    {getCmeImpactLabel(cme)}
                  </div>
                  <div className="space-weather-list__subline">
                    {cme.modelTime
                      ? `Model ${formatUtcDate(cme.modelTime)}`
                      : cme.startTime
                        ? `CME ${formatUtcDate(cme.startTime)}`
                        : "Timing unavailable"}
                    {Number.isFinite(cme.speed) ? ` - ${Math.round(cme.speed)} km/s` : ""}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SpaceWeatherPanelContent;
