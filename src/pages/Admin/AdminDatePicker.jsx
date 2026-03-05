import { useEffect, useMemo, useRef, useState } from "react";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const pad2 = (value) => String(value).padStart(2, "0");

const isSameDay = (a, b) =>
  Boolean(a) &&
  Boolean(b) &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const parseDateValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [year, month, day] = raw.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateValue = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const formatDateLabel = (date) =>
  `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;

const getMonthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const buildCalendarDays = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const firstWeekdayIndex = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const items = [];

  for (let index = 0; index < 42; index += 1) {
    if (index < firstWeekdayIndex) {
      const day = daysInPrevMonth - firstWeekdayIndex + index + 1;
      const date = new Date(year, month - 1, day);
      items.push({ date, isCurrentMonth: false });
      continue;
    }

    if (index < firstWeekdayIndex + daysInMonth) {
      const day = index - firstWeekdayIndex + 1;
      const date = new Date(year, month, day);
      items.push({ date, isCurrentMonth: true });
      continue;
    }

    const day = index - (firstWeekdayIndex + daysInMonth) + 1;
    const date = new Date(year, month + 1, day);
    items.push({ date, isCurrentMonth: false });
  }

  return items;
};

export default function AdminDatePicker({
  value,
  onChange,
  placeholder = "dd/mm/yyyy",
}) {
  const rootRef = useRef(null);
  const selectedDate = parseDateValue(value);
  const today = useMemo(() => new Date(), []);
  const [isOpen, setIsOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getMonthStart(selectedDate || today),
  );

  useEffect(() => {
    if (!isOpen) return undefined;

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
  }, [isOpen]);

  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const monthLabel = visibleMonth.toLocaleString(undefined, {
    month: "long",
    year: "numeric",
  });

  const handleSelectDate = (date) => {
    onChange?.(toDateValue(date));
    setVisibleMonth(getMonthStart(date));
    setIsOpen(false);
  };

  const handleToggle = () => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        setVisibleMonth(getMonthStart(selectedDate || today));
      }
      return next;
    });
  };

  return (
    <div className="admin-date-picker" ref={rootRef}>
      <button
        type="button"
        className={`profile-input admin-date-picker__toggle${
          isOpen ? " open" : ""
        }${selectedDate ? "" : " is-placeholder"}`}
        onClick={handleToggle}
      >
        <span>{selectedDate ? formatDateLabel(selectedDate) : placeholder}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M7 2v3M17 2v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <div className={`glass-panel admin-date-picker__menu${isOpen ? " open" : ""}`}>
        <div className="admin-date-picker__header">
          <button
            type="button"
            className="glass-btn admin-date-picker__nav"
            onClick={() =>
              setVisibleMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() - 1, 1),
              )
            }
            aria-label="Previous month"
          >
            &#8249;
          </button>
          <div className="admin-date-picker__month">{monthLabel}</div>
          <button
            type="button"
            className="glass-btn admin-date-picker__nav"
            onClick={() =>
              setVisibleMonth(
                (current) =>
                  new Date(current.getFullYear(), current.getMonth() + 1, 1),
              )
            }
            aria-label="Next month"
          >
            &#8250;
          </button>
        </div>

        <div className="admin-date-picker__weekdays">
          {WEEKDAY_LABELS.map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>

        <div className="admin-date-picker__days">
          {days.map(({ date, isCurrentMonth }) => {
            const selected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            return (
              <button
                key={toDateValue(date)}
                type="button"
                className={`admin-date-picker__day${
                  isCurrentMonth ? "" : " muted"
                }${selected ? " selected" : ""}${isToday ? " today" : ""}`}
                onClick={() => handleSelectDate(date)}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <div className="admin-date-picker__actions">
          <button
            type="button"
            className="glass-btn admin-date-picker__action"
            onClick={() => {
              onChange?.("");
              setIsOpen(false);
            }}
          >
            Clear
          </button>
          <button
            type="button"
            className="glass-btn admin-date-picker__action"
            onClick={() => handleSelectDate(today)}
          >
            Today
          </button>
        </div>
      </div>
    </div>
  );
}
