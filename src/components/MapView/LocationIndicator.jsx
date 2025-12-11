import "./LocationIndicator.css";

export default function LocationIndicator({ status, onClick }) {
  const isClickable = status === "active";

  return (
    <div
      className={`location-indicator ${isClickable ? "clickable" : ""}`}
      onClick={isClickable ? onClick : undefined}
      title={isClickable ? "Click to go to your location" : ""}
    >
      <div className={`indicator-dot ${status}`}></div>
      <span className="indicator-text">
        {status === "active" && "Live Location"}
        {status === "searching" && "Searching..."}
        {status === "off" && "Location Off"}
      </span>
    </div>
  );
}
