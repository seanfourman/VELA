import { useEffect, useMemo, useRef, useState } from "react";

const pad2 = (value) => String(value).padStart(2, "0");

const normalizeTimeValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (/^\d{2}:\d{2}$/.test(raw)) {
    return raw;
  }

  const dateTimeMatch = raw.match(/T(\d{2}:\d{2})/);
  if (dateTimeMatch?.[1]) {
    return dateTimeMatch[1];
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${pad2(parsed.getHours())}:${pad2(parsed.getMinutes())}`;
};

const buildOptions = (stepMinutes) => {
  const values = [];
  for (let totalMinutes = 0; totalMinutes < 24 * 60; totalMinutes += stepMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    values.push(`${pad2(hours)}:${pad2(minutes)}`);
  }
  return values;
};

const roundNow = (stepMinutes) => {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.round(minutes / stepMinutes) * stepMinutes;
  const normalized = ((rounded % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const remainder = normalized % 60;
  return `${pad2(hours)}:${pad2(remainder)}`;
};

export default function AdminTimePicker({
  value,
  onChange,
  placeholder = "hh:mm",
  disabled = false,
  stepMinutes = 15,
}) {
  const rootRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const menuOpen = isOpen && !disabled;
  const options = useMemo(() => buildOptions(stepMinutes), [stepMinutes]);
  const selectedTime = normalizeTimeValue(value);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const selectTime = (nextValue) => {
    onChange?.(nextValue);
    setIsOpen(false);
  };

  return (
    <div
      className={`admin-time-picker${disabled ? " is-disabled" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        className={`profile-input admin-time-picker__toggle${
          menuOpen ? " open" : ""
        }${selectedTime ? "" : " is-placeholder"}`}
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{selectedTime || placeholder}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 7v5l3 3M21 12a9 9 0 1 1-18 0a9 9 0 0 1 18 0z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className={`glass-panel admin-time-picker__menu${menuOpen ? " open" : ""}`}>
        <div className="admin-time-picker__list" role="listbox" aria-label="Select time">
          {options.map((time) => (
            <button
              key={time}
              type="button"
              className={`admin-time-picker__option${
                selectedTime === time ? " selected" : ""
              }`}
              onClick={() => selectTime(time)}
            >
              {time}
            </button>
          ))}
        </div>

        <div className="admin-time-picker__actions">
          <button
            type="button"
            className="glass-btn admin-time-picker__action"
            onClick={() => {
              onChange?.("");
              setIsOpen(false);
            }}
          >
            Clear
          </button>
          <button
            type="button"
            className="glass-btn admin-time-picker__action"
            onClick={() => selectTime(roundNow(stepMinutes))}
          >
            Now
          </button>
        </div>
      </div>
    </div>
  );
}
