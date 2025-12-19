import { useState, useRef, useEffect } from "react";
import "./SearchDistanceSelector.css";

export default function SearchDistanceSelector({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const OPTIONS = [10, 25, 50, 100, 200, 250];

  const toggleOpen = () => setIsOpen(!isOpen);

  const handleSelect = (dist) => {
    onChange(dist);
    setIsOpen(false);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="search-distance-selector" ref={containerRef}>
      <button
        className={`glass-btn distance-toggle ${isOpen ? "active" : ""}`}
        onClick={toggleOpen}
      >
        <span className="label">Radius: {value}km</span>
        <svg
          className={`chevron ${isOpen ? "open" : ""}`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div className={`glass-panel distance-menu ${isOpen ? "open" : ""}`}>
        {OPTIONS.map((dist) => (
          <button
            key={dist}
            className={`menu-option ${value === dist ? "selected" : ""}`}
            onClick={() => handleSelect(dist)}
          >
            {dist} km
          </button>
        ))}
      </div>
    </div>
  );
}
