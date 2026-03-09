import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const pad2 = (value) => String(value).padStart(2, "0");
const ITEM_HEIGHT = 34;
const LOOP_REPEAT_COUNT = 9;
const LOOP_CENTER_BLOCK = Math.floor(LOOP_REPEAT_COUNT / 2);
const DIGIT_BUFFER_TIMEOUT_MS = 1100;

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

const roundNow = (stepMinutes) => {
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const rounded = Math.round(minutes / stepMinutes) * stepMinutes;
  const normalized = ((rounded % (24 * 60)) + 24 * 60) % (24 * 60);
  const hours = Math.floor(normalized / 60);
  const remainder = normalized % 60;
  return `${pad2(hours)}:${pad2(remainder)}`;
};

const wrapIndex = (index, length) => {
  if (!length) return 0;
  return ((index % length) + length) % length;
};

const toLoopIndex = (baseIndex, baseLength) =>
  LOOP_CENTER_BLOCK * baseLength + baseIndex;

const buildLoopValues = (baseValues) =>
  Array.from(
    { length: baseValues.length * LOOP_REPEAT_COUNT },
    (_, index) => baseValues[index % baseValues.length],
  );

const closestMinuteOption = (minuteOptions, minuteValue) => {
  if (!minuteOptions.length) return "00";
  const target = Number.parseInt(minuteValue, 10);
  if (!Number.isFinite(target)) return minuteOptions[0];

  let closest = minuteOptions[0];
  let bestDistance = Infinity;
  minuteOptions.forEach((option) => {
    const current = Number.parseInt(option, 10);
    const distance = Math.abs(current - target);
    if (distance < bestDistance) {
      bestDistance = distance;
      closest = option;
    }
  });
  return closest;
};

export default function AdminTimePicker({
  value,
  onChange,
  placeholder = "hh:mm",
  disabled = false,
  stepMinutes = 1,
}) {
  const rootRef = useRef(null);
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const hourTimerRef = useRef(null);
  const minuteTimerRef = useRef(null);
  const hourInputBufferRef = useRef("");
  const minuteInputBufferRef = useRef("");
  const hourInputAtRef = useRef(0);
  const minuteInputAtRef = useRef(0);
  const selectedHourRef = useRef("00");
  const selectedMinuteRef = useRef("00");
  const activeColumnRef = useRef("hour");

  const [isOpen, setIsOpen] = useState(false);
  const [activeColumn, setActiveColumn] = useState("hour");

  const menuOpen = isOpen && !disabled;
  const hourValues = useMemo(
    () => Array.from({ length: 24 }, (_, index) => pad2(index)),
    [],
  );
  const minuteValues = useMemo(() => {
    const values = [];
    const minuteStep = Math.max(1, Math.min(60, Number(stepMinutes) || 1));
    for (let minute = 0; minute < 60; minute += minuteStep) {
      values.push(pad2(minute));
    }
    return values;
  }, [stepMinutes]);

  const hourLoopValues = useMemo(() => buildLoopValues(hourValues), [hourValues]);
  const minuteLoopValues = useMemo(
    () => buildLoopValues(minuteValues),
    [minuteValues],
  );

  const selectedTime = normalizeTimeValue(value);
  const fallbackTime = roundNow(stepMinutes);
  const [rawHour = "00", rawMinute = "00"] = (selectedTime || fallbackTime).split(":");
  const selectedHour = hourValues.includes(rawHour) ? rawHour : "00";
  const selectedMinute = closestMinuteOption(minuteValues, rawMinute);

  useEffect(() => {
    selectedHourRef.current = selectedHour;
    selectedMinuteRef.current = selectedMinute;
  }, [selectedHour, selectedMinute]);

  useEffect(() => {
    activeColumnRef.current = activeColumn;
  }, [activeColumn]);

  const updateTime = useCallback(
    (nextHour, nextMinute) => {
      onChange?.(`${nextHour}:${nextMinute}`);
    },
    [onChange],
  );

  const scrollColumnToValue = (elementRef, values, value) => {
    const index = values.indexOf(value);
    if (index < 0 || !elementRef.current) return;

    const currentIndex = Math.round(elementRef.current.scrollTop / ITEM_HEIGHT);
    const totalLength = values.length * LOOP_REPEAT_COUNT;
    const minSafe = values.length;
    const maxSafe = totalLength - values.length - 1;
    const currentCycle = Math.floor(currentIndex / values.length);

    let targetLoopIndex = toLoopIndex(index, values.length);
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let cycle = currentCycle - 2; cycle <= currentCycle + 2; cycle += 1) {
      let candidate = cycle * values.length + index;
      while (candidate < minSafe) candidate += values.length;
      while (candidate > maxSafe) candidate -= values.length;

      const distance = Math.abs(candidate - currentIndex);
      if (distance < bestDistance) {
        bestDistance = distance;
        targetLoopIndex = candidate;
      }
    }

    elementRef.current.scrollTo({
      top: targetLoopIndex * ITEM_HEIGHT,
      behavior: "smooth",
    });
  };

  const clampLoopIndex = (loopIndex, baseLength) => {
    const totalLength = baseLength * LOOP_REPEAT_COUNT;
    const minSafe = baseLength;
    const maxSafe = totalLength - baseLength - 1;
    if (loopIndex < minSafe || loopIndex > maxSafe) {
      return toLoopIndex(wrapIndex(loopIndex, baseLength), baseLength);
    }
    return loopIndex;
  };

  const settleColumn = (element, values, onSelect) => {
    const rawIndex = Math.round(element.scrollTop / ITEM_HEIGHT);
    const normalizedLoopIndex = clampLoopIndex(rawIndex, values.length);
    if (normalizedLoopIndex !== rawIndex) {
      element.scrollTop = normalizedLoopIndex * ITEM_HEIGHT;
    }

    const wrappedIndex = wrapIndex(normalizedLoopIndex, values.length);
    onSelect(values[wrappedIndex]);
  };

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target)) return;
      setIsOpen(false);
    };

    const applyDigitToHour = (digit, nowTime) => {
      const isRecent = nowTime - hourInputAtRef.current <= DIGIT_BUFFER_TIMEOUT_MS;
      const previous = isRecent ? hourInputBufferRef.current : "";
      let nextBuffer = `${previous}${digit}`.slice(-2);
      let candidate = Number.parseInt(nextBuffer, 10);
      if (!Number.isFinite(candidate)) return;

      if (candidate > 23 && nextBuffer.length === 2) {
        nextBuffer = digit;
        candidate = Number.parseInt(nextBuffer, 10);
      }
      if (!Number.isFinite(candidate) || candidate > 23) return;

      hourInputBufferRef.current = nextBuffer;
      hourInputAtRef.current = nowTime;

      const nextHour = pad2(candidate);
      updateTime(nextHour, selectedMinuteRef.current);
      scrollColumnToValue(hoursRef, hourValues, nextHour);
    };

    const applyDigitToMinute = (digit, nowTime) => {
      const isRecent = nowTime - minuteInputAtRef.current <= DIGIT_BUFFER_TIMEOUT_MS;
      const previous = isRecent ? minuteInputBufferRef.current : "";
      let nextBuffer = `${previous}${digit}`.slice(-2);
      let candidate = Number.parseInt(nextBuffer, 10);
      if (!Number.isFinite(candidate)) return;

      if (candidate > 59 && nextBuffer.length === 2) {
        nextBuffer = digit;
        candidate = Number.parseInt(nextBuffer, 10);
      }
      if (!Number.isFinite(candidate) || candidate > 59) return;

      minuteInputBufferRef.current = nextBuffer;
      minuteInputAtRef.current = nowTime;

      const nextMinute = closestMinuteOption(minuteValues, pad2(candidate));
      updateTime(selectedHourRef.current, nextMinute);
      scrollColumnToValue(minutesRef, minuteValues, nextMinute);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setActiveColumn("hour");
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        setActiveColumn("minute");
        return;
      }

      if (!/^\d$/.test(event.key)) return;
      event.preventDefault();

      const nowTime = performance.now();
      if (activeColumnRef.current === "minute") {
        applyDigitToMinute(event.key, nowTime);
      } else {
        applyDigitToHour(event.key, nowTime);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(hourTimerRef.current);
      clearTimeout(minuteTimerRef.current);
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, minuteValues, hourValues, updateTime]);

  useEffect(() => {
    if (!menuOpen) return;
    const hourIndex = hourValues.indexOf(selectedHourRef.current);
    const minuteIndex = minuteValues.indexOf(selectedMinuteRef.current);
    if (hourIndex >= 0 && hoursRef.current) {
      hoursRef.current.scrollTop =
        toLoopIndex(hourIndex, hourValues.length) * ITEM_HEIGHT;
    }
    if (minuteIndex >= 0 && minutesRef.current) {
      minutesRef.current.scrollTop =
        toLoopIndex(minuteIndex, minuteValues.length) * ITEM_HEIGHT;
    }
  }, [menuOpen, hourValues, minuteValues]);

  const handleHourScroll = (event) => {
    clearTimeout(hourTimerRef.current);
    hourTimerRef.current = setTimeout(() => {
      settleColumn(event.currentTarget, hourValues, (nextHour) => {
        updateTime(nextHour, selectedMinuteRef.current);
      });
    }, 70);
  };

  const handleMinuteScroll = (event) => {
    clearTimeout(minuteTimerRef.current);
    minuteTimerRef.current = setTimeout(() => {
      settleColumn(event.currentTarget, minuteValues, (nextMinute) => {
        updateTime(selectedHourRef.current, nextMinute);
      });
    }, 70);
  };

  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && !selectedTime) {
      onChange?.(fallbackTime);
    }
    if (!isOpen) {
      setActiveColumn("hour");
    }
    setIsOpen((prev) => !prev);
  };

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
        onClick={handleToggle}
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
        <div className="admin-time-picker__wheel" aria-label="Time picker">
          <div
            className={`admin-time-picker__wheel-column${
              activeColumn === "hour" ? " is-active" : ""
            }`}
          >
            <div className="admin-time-picker__wheel-label">Hour</div>
            <div className="admin-time-picker__wheel-window" aria-hidden="true" />
            <div
              className="admin-time-picker__wheel-list"
              ref={hoursRef}
              onPointerDown={() => setActiveColumn("hour")}
              onScroll={handleHourScroll}
            >
              {hourLoopValues.map((hour, index) => (
                <button
                  key={`${hour}-${index}`}
                  type="button"
                  className={`admin-time-picker__wheel-item${
                    selectedHour === hour ? " selected" : ""
                  }`}
                  onClick={() => {
                    updateTime(hour, selectedMinuteRef.current);
                    scrollColumnToValue(hoursRef, hourValues, hour);
                  }}
                >
                  {hour}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-time-picker__wheel-separator">:</div>

          <div
            className={`admin-time-picker__wheel-column${
              activeColumn === "minute" ? " is-active" : ""
            }`}
          >
            <div className="admin-time-picker__wheel-label">Min</div>
            <div className="admin-time-picker__wheel-window" aria-hidden="true" />
            <div
              className="admin-time-picker__wheel-list"
              ref={minutesRef}
              onPointerDown={() => setActiveColumn("minute")}
              onScroll={handleMinuteScroll}
            >
              {minuteLoopValues.map((minute, index) => (
                <button
                  key={`${minute}-${index}`}
                  type="button"
                  className={`admin-time-picker__wheel-item${
                    selectedMinute === minute ? " selected" : ""
                  }`}
                  onClick={() => {
                    updateTime(selectedHourRef.current, minute);
                    scrollColumnToValue(minutesRef, minuteValues, minute);
                  }}
                >
                  {minute}
                </button>
              ))}
            </div>
          </div>
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
