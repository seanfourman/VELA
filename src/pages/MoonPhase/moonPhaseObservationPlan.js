import { getMoonAltitude, getSunTimes } from "./moonPhaseAstronomy";

const MOON_VISIBILITY_THRESHOLD = 0;
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

function getLocalNoon(date, dayOffset = 0) {
  const localNoon = new Date(date);
  localNoon.setHours(12, 0, 0, 0);
  localNoon.setDate(localNoon.getDate() + dayOffset);
  return localNoon;
}

function getNightBounds(date, latitude, longitude) {
  const todaySunTimes = getSunTimes(getLocalNoon(date), latitude, longitude);
  const tomorrowSunTimes = getSunTimes(
    getLocalNoon(date, 1),
    latitude,
    longitude,
  );
  const yesterdaySunTimes = getSunTimes(
    getLocalNoon(date, -1),
    latitude,
    longitude,
  );

  if (!todaySunTimes.sunrise || !todaySunTimes.sunset) {
    return null;
  }

  if (date >= todaySunTimes.sunset) {
    return {
      start: todaySunTimes.sunset,
      end: tomorrowSunTimes.sunrise,
    };
  }

  if (date < todaySunTimes.sunrise) {
    return {
      start: yesterdaySunTimes.sunset,
      end: todaySunTimes.sunrise,
    };
  }

  return {
    start: todaySunTimes.sunset,
    end: tomorrowSunTimes.sunrise,
  };
}

function getMoonlessIntervals(start, end, latitude, longitude) {
  if (!start || !end || end <= start) {
    return [];
  }

  const intervals = [];
  const stepMs = 10 * 60 * 1000;
  let previousTime = start;
  let previousAltitude = getMoonAltitude(start, latitude, longitude);
  let currentIntervalStart =
    previousAltitude <= MOON_VISIBILITY_THRESHOLD ? start : null;

  for (
    let time = start.getTime() + stepMs;
    time <= end.getTime();
    time += stepMs
  ) {
    const currentTime = new Date(Math.min(time, end.getTime()));
    const currentAltitude = getMoonAltitude(currentTime, latitude, longitude);
    const wasBelowHorizon = previousAltitude <= MOON_VISIBILITY_THRESHOLD;
    const isBelowHorizon = currentAltitude <= MOON_VISIBILITY_THRESHOLD;

    if (wasBelowHorizon !== isBelowHorizon) {
      const crossingRatio =
        (MOON_VISIBILITY_THRESHOLD - previousAltitude) /
        (currentAltitude - previousAltitude);
      const safeRatio = Number.isFinite(crossingRatio)
        ? Math.max(0, Math.min(1, crossingRatio))
        : 0.5;
      const crossingTime = new Date(
        previousTime.getTime() +
          (currentTime.getTime() - previousTime.getTime()) * safeRatio,
      );

      if (wasBelowHorizon) {
        intervals.push({
          start: currentIntervalStart ?? previousTime,
          end: crossingTime,
        });
        currentIntervalStart = null;
      } else {
        currentIntervalStart = crossingTime;
      }
    }

    previousTime = currentTime;
    previousAltitude = currentAltitude;
  }

  if (previousAltitude <= MOON_VISIBILITY_THRESHOLD) {
    intervals.push({
      start: currentIntervalStart ?? previousTime,
      end,
    });
  }

  return intervals.filter((interval) => interval.end > interval.start);
}

function formatClock(date) {
  return date ? TIME_FORMATTER.format(date) : "Unavailable";
}

function formatDuration(durationMs) {
  const totalMinutes = Math.max(0, Math.round(durationMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours && minutes) {
    return `${hours}h ${minutes}m`;
  }

  if (hours) {
    return `${hours}h`;
  }

  return `${minutes}m`;
}

function getObservationScore(moonlessRatio, moonIllumination) {
  const score = Math.round(moonlessRatio * 60 + (100 - moonIllumination) * 0.4);

  return Math.max(0, Math.min(100, score));
}

function getIlluminationOnlyScore(moonIllumination) {
  return Math.max(0, Math.min(100, Math.round(100 - moonIllumination)));
}

function getScoreLabel(score) {
  if (score >= 75) return "Excellent";
  if (score >= 50) return "Good";
  if (score >= 25) return "Fair";
  return "Poor conditions";
}

function getRecommendedTargets(moonlessRatio, moonIllumination) {
  if (moonlessRatio >= 0.65 && moonIllumination <= 45) {
    return {
      label: "Deep-Sky Objects",
      subtext:
        "Long moon-free darkness makes faint galaxies and nebulae realistic tonight.",
    };
  }

  if (moonlessRatio >= 0.35 || moonIllumination <= 65) {
    return {
      label: "Clusters & Nebulae",
      subtext:
        "Partial moon-free windows improve contrast for bright deep-sky targets.",
    };
  }

  return {
    label: "Planets & Stars",
    subtext:
      "Moonlight dominates tonight, so high-contrast targets will hold up best.",
  };
}

function getLongestInterval(intervals) {
  return intervals.reduce((longest, interval) => {
    if (!longest) return interval;
    return interval.end - interval.start > longest.end - longest.start
      ? interval
      : longest;
  }, null);
}

function getBestWindow(intervals, nightBounds) {
  const toleranceMs = 15 * 60 * 1000;
  const nightDurationMs = nightBounds.end - nightBounds.start;
  const longestInterval = getLongestInterval(intervals);

  if (!longestInterval) {
    return {
      label: "Moonlit all night",
      subtext: `The moon stays above the horizon from ${formatClock(nightBounds.start)} to ${formatClock(nightBounds.end)}.`,
    };
  }

  const longestDurationMs = longestInterval.end - longestInterval.start;

  if (longestDurationMs >= nightDurationMs - toleranceMs) {
    return {
      label: "All night",
      subtext: `The moon stays below the horizon from ${formatClock(nightBounds.start)} to ${formatClock(nightBounds.end)}.`,
    };
  }

  if (
    Math.abs(longestInterval.start.getTime() - nightBounds.start.getTime()) <=
    toleranceMs
  ) {
    return {
      label: `Until ${formatClock(longestInterval.end)}`,
      subtext: "Best observing starts right at nightfall before moonrise.",
    };
  }

  if (
    Math.abs(nightBounds.end.getTime() - longestInterval.end.getTime()) <=
    toleranceMs
  ) {
    return {
      label: `After ${formatClock(longestInterval.start)}`,
      subtext: "The darkest stretch begins after moonset.",
    };
  }

  return {
    label: `${formatClock(longestInterval.start)} - ${formatClock(longestInterval.end)}`,
    subtext: "Moon below the horizon for the longest stretch of tonight.",
  };
}

export function buildLiveObservationPlan(date, location, moonIllumination) {
  if (!location) return null;

  const nightBounds = getNightBounds(date, location.lat, location.lng);
  if (
    !nightBounds?.start ||
    !nightBounds?.end ||
    nightBounds.end <= nightBounds.start
  ) {
    return null;
  }

  const moonlessIntervals = getMoonlessIntervals(
    nightBounds.start,
    nightBounds.end,
    location.lat,
    location.lng,
  );
  const nightDurationMs = nightBounds.end - nightBounds.start;
  const moonlessDurationMs = moonlessIntervals.reduce(
    (total, interval) => total + (interval.end - interval.start),
    0,
  );
  const moonlessRatio =
    nightDurationMs > 0 ? moonlessDurationMs / nightDurationMs : 0;
  const score = getObservationScore(moonlessRatio, moonIllumination);
  const bestWindow = getBestWindow(moonlessIntervals, nightBounds);
  const recommendedTargets = getRecommendedTargets(
    moonlessRatio,
    moonIllumination,
  );

  return {
    score,
    scoreLabel: getScoreLabel(score),
    scoreSubtext: `Dark sky for ${formatDuration(moonlessDurationMs)} of tonight's ${formatDuration(nightDurationMs)}.`,
    bestWindow: bestWindow.label,
    bestWindowSubtext: bestWindow.subtext,
    recommendedTarget: recommendedTargets.label,
    recommendedTargetSubtext: recommendedTargets.subtext,
  };
}

export function buildFallbackObservationPlan(moonIllumination, locationStatus) {
  const score = getIlluminationOnlyScore(moonIllumination);
  const recommendedTargets = getRecommendedTargets(
    moonIllumination <= 45 ? 0.45 : 0.2,
    moonIllumination,
  );

  return {
    score,
    scoreLabel: getScoreLabel(score),
    scoreSubtext:
      locationStatus === "active"
        ? "Local night timing is still loading."
        : "Enable location for live moon timing.",
    bestWindow:
      locationStatus === "active" ? "Calculating..." : "Enable location",
    bestWindowSubtext:
      "This switches to a real local moonrise/moonset window once location is available.",
    recommendedTarget: recommendedTargets.label,
    recommendedTargetSubtext: recommendedTargets.subtext,
  };
}

export function buildSimulatedObservationPlan(moonIllumination) {
  const score = getIlluminationOnlyScore(moonIllumination);
  const recommendedTargets = getRecommendedTargets(
    moonIllumination <= 45 ? 0.5 : 0.2,
    moonIllumination,
  );
  const scoreSubtext =
    moonIllumination > 65
      ? "Bright moonlight will wash out faint targets."
      : moonIllumination > 40
        ? "Some moonlight will soften faint detail."
        : "Low moonlight leaves better contrast tonight.";

  return {
    score,
    scoreLabel: getScoreLabel(score),
    scoreSubtext,
    bestWindow:
      moonIllumination > 65
        ? "After moonset"
        : moonIllumination > 40
          ? "Later tonight"
          : "All night",
    bestWindowSubtext: "Only applies to the current moon.",
    recommendedTarget: recommendedTargets.label,
    recommendedTargetSubtext: recommendedTargets.subtext,
  };
}
