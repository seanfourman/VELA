import "./MapTypeSwitcher.css";

export default function MapTypeSwitcher({ mapType, onChange, previewKey }) {
  return (
    <div className="map-type-switcher">
      <button
        className={`map-type-btn ${mapType === "dark" ? "active" : ""}`}
        onClick={() => onChange("dark")}
        title="Dark Mode"
      >
        <div
          className="map-preview"
          style={{
            backgroundImage:
              "url('https://api.maptiler.com/maps/streets-v2-dark/0/0/0.png?key=" +
              previewKey +
              "')",
          }}
        ></div>
      </button>
      <button
        className={`map-type-btn ${mapType === "light" ? "active" : ""}`}
        onClick={() => onChange("light")}
        title="Light Mode"
      >
        <div
          className="map-preview"
          style={{
            backgroundImage:
              "url('https://api.maptiler.com/maps/streets-v2/0/0/0.png?key=" +
              previewKey +
              "')",
          }}
        ></div>
      </button>
      <button
        className={`map-type-btn ${mapType === "satellite" ? "active" : ""}`}
        onClick={() => onChange("satellite")}
        title="Satellite Mode"
      >
        <div
          className="map-preview"
          style={{
            backgroundImage:
              "url('https://api.maptiler.com/maps/hybrid/0/0/0.jpg?key=" +
              previewKey +
              "')",
          }}
        ></div>
      </button>
    </div>
  );
}
