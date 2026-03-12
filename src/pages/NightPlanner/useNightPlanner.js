import { useEffect, useMemo, useState } from "react";

const SYNODIC_MONTH_DAYS = 29.530588853;
const PRIMARY_PHASE_WINDOW = 0.015;
const LIVE_PHASE_THRESHOLD = 0.02;
const RAD = Math.PI / 180;
const EARTH_OBLIQUITY = RAD * 23.4397;
const JULIAN_UNIX_EPOCH = 2440588;
const JULIAN_J2000 = 2451545;
const SUN_DISTANCE_KM = 149598000;
const SOLAR_DISC_ALTITUDE = RAD * -0.833;
const MOON_VISIBILITY_THRESHOLD = 0;
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
});

export const MOON_MARKS = Array.from({ length: 65 }).map((_, i) => {
  const value = i / 64;

  if (i === 0 || i === 64) return { value, label: "New" };
  if (i === 8) return { value, label: "Waxing" };
  if (i === 16) return { value, label: "1st Qtr" };
  if (i === 24) return { value, label: "Gibbous" };
  if (i === 32) return { value, label: "Full" };
  if (i === 40) return { value, label: "Gibbous" };
  if (i === 48) return { value, label: "3rd Qtr" };
  if (i === 56) return { value, label: "Waning" };

  return { value };
});

function normalizePhaseFraction(fraction) {
  return ((fraction % 1) + 1) % 1;
}

function getMoonPhaseName(fraction) {
  const phase = normalizePhaseFraction(fraction);

  if (phase <= PRIMARY_PHASE_WINDOW || phase >= 1 - PRIMARY_PHASE_WINDOW) {
    return "New Moon";
  }

  if (Math.abs(phase - 0.25) <= PRIMARY_PHASE_WINDOW) {
    return "First Quarter";
  }

  if (Math.abs(phase - 0.5) <= PRIMARY_PHASE_WINDOW) {
    return "Full Moon";
  }

  if (Math.abs(phase - 0.75) <= PRIMARY_PHASE_WINDOW) {
    return "Last Quarter";
  }

  if (phase < 0.25) return "Waxing Crescent";
  if (phase < 0.5) return "Waxing Gibbous";
  if (phase < 0.75) return "Waning Gibbous";
  return "Waning Crescent";
}

function toJulianDate(date) {
  return date.valueOf() / 86400000 - 0.5 + JULIAN_UNIX_EPOCH;
}

function fromJulianDate(julianDate) {
  return new Date((julianDate + 0.5 - JULIAN_UNIX_EPOCH) * 86400000);
}

function toDaysSinceJ2000(date) {
  return toJulianDate(date) - JULIAN_J2000;
}

function getRightAscension(longitude, latitude) {
  return Math.atan2(
    Math.sin(longitude) * Math.cos(EARTH_OBLIQUITY) -
      Math.tan(latitude) * Math.sin(EARTH_OBLIQUITY),
    Math.cos(longitude),
  );
}

function getDeclination(longitude, latitude) {
  return Math.asin(
    Math.sin(latitude) * Math.cos(EARTH_OBLIQUITY) +
      Math.cos(latitude) * Math.sin(EARTH_OBLIQUITY) * Math.sin(longitude),
  );
}

function getSolarMeanAnomaly(daysSinceJ2000) {
  return RAD * (357.5291 + 0.98560028 * daysSinceJ2000);
}

function getEclipticLongitude(meanAnomaly) {
  const equationOfCenter =
    RAD *
    (1.9148 * Math.sin(meanAnomaly) +
      0.02 * Math.sin(2 * meanAnomaly) +
      0.0003 * Math.sin(3 * meanAnomaly));
  const perihelion = RAD * 102.9372;

  return meanAnomaly + equationOfCenter + perihelion + Math.PI;
}

function getSunCoordinates(daysSinceJ2000) {
  const meanAnomaly = getSolarMeanAnomaly(daysSinceJ2000);
  const longitude = getEclipticLongitude(meanAnomaly);

  return {
    rightAscension: getRightAscension(longitude, 0),
    declination: getDeclination(longitude, 0),
  };
}

function getMoonCoordinates(daysSinceJ2000) {
  const longitude = RAD * (218.316 + 13.176396 * daysSinceJ2000);
  const meanAnomaly = RAD * (134.963 + 13.064993 * daysSinceJ2000);
  const latitudeArgument = RAD * (93.272 + 13.22935 * daysSinceJ2000);
  const correctedLongitude = longitude + RAD * 6.289 * Math.sin(meanAnomaly);
  const latitude = RAD * 5.128 * Math.sin(latitudeArgument);
  const distanceKm = 385001 - 20905 * Math.cos(meanAnomaly);

  return {
    rightAscension: getRightAscension(correctedLongitude, latitude),
    declination: getDeclination(correctedLongitude, latitude),
    distanceKm,
  };
}

function getLiveMoonData(date = new Date()) {
  const daysSinceJ2000 = toDaysSinceJ2000(date);
  const sun = getSunCoordinates(daysSinceJ2000);
  const moon = getMoonCoordinates(daysSinceJ2000);
  const phaseAngle = Math.acos(
    Math.sin(sun.declination) * Math.sin(moon.declination) +
      Math.cos(sun.declination) *
        Math.cos(moon.declination) *
        Math.cos(sun.rightAscension - moon.rightAscension),
  );
  const incidenceAngle = Math.atan2(
    SUN_DISTANCE_KM * Math.sin(phaseAngle),
    moon.distanceKm - SUN_DISTANCE_KM * Math.cos(phaseAngle),
  );
  const brightLimbAngle = Math.atan2(
    Math.cos(sun.declination) *
      Math.sin(sun.rightAscension - moon.rightAscension),
    Math.sin(sun.declination) * Math.cos(moon.declination) -
      Math.cos(sun.declination) *
        Math.sin(moon.declination) *
        Math.cos(sun.rightAscension - moon.rightAscension),
  );
  const illuminationFraction = (1 + Math.cos(incidenceAngle)) / 2;
  const phaseFraction =
    0.5 +
    (0.5 * incidenceAngle * (brightLimbAngle < 0 ? -1 : 1)) / Math.PI;
  const normalizedPhase = normalizePhaseFraction(phaseFraction);

  return {
    fraction: normalizedPhase,
    illumination: Math.round(illuminationFraction * 100),
    name: getMoonPhaseName(normalizedPhase),
    dayInCycle: Math.round(normalizedPhase * SYNODIC_MONTH_DAYS),
  };
}

export function computeMoonPhase(fractionOverride) {
  if (fractionOverride === undefined) {
    return getLiveMoonData();
  }

  const fraction = normalizePhaseFraction(fractionOverride);
  const illumination = Math.round(
    ((1 - Math.cos(fraction * 2 * Math.PI)) / 2) * 100,
  );

  return {
    fraction,
    illumination,
    name: getMoonPhaseName(fraction),
    dayInCycle: Math.round(fraction * SYNODIC_MONTH_DAYS),
  };
}

function getSiderealTime(daysSinceJ2000, longitudeRadians) {
  return RAD * (280.16 + 360.9856235 * daysSinceJ2000) - longitudeRadians;
}

function getAltitude(hourAngle, latitude, declination) {
  return Math.asin(
    Math.sin(latitude) * Math.sin(declination) +
      Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle),
  );
}

function getMoonAltitude(date, latitude, longitude) {
  const daysSinceJ2000 = toDaysSinceJ2000(date);
  const longitudeRadians = -longitude * RAD;
  const latitudeRadians = latitude * RAD;
  const moon = getMoonCoordinates(daysSinceJ2000);
  const hourAngle =
    getSiderealTime(daysSinceJ2000, longitudeRadians) - moon.rightAscension;

  return getAltitude(hourAngle, latitudeRadians, moon.declination);
}

function getJulianCycle(daysSinceJ2000, longitudeRadians) {
  return Math.round(daysSinceJ2000 - 0.0009 - longitudeRadians / (2 * Math.PI));
}

function getApproxSolarTransit(hourAngle, longitudeRadians, julianCycle) {
  return 0.0009 + (hourAngle + longitudeRadians) / (2 * Math.PI) + julianCycle;
}

function getSolarTransitJulian(approxTransit, meanAnomaly, eclipticLongitude) {
  return (
    JULIAN_J2000 +
    approxTransit +
    0.0053 * Math.sin(meanAnomaly) -
    0.0069 * Math.sin(2 * eclipticLongitude)
  );
}

function getHourAngleForAltitude(targetAltitude, latitude, declination) {
  const cosine =
    (Math.sin(targetAltitude) -
      Math.sin(latitude) * Math.sin(declination)) /
    (Math.cos(latitude) * Math.cos(declination));

  if (cosine < -1 || cosine > 1) {
    return null;
  }

  return Math.acos(cosine);
}

function getSunTimes(date, latitude, longitude) {
  const longitudeRadians = -longitude * RAD;
  const latitudeRadians = latitude * RAD;
  const daysSinceJ2000 = toDaysSinceJ2000(date);
  const julianCycle = getJulianCycle(daysSinceJ2000, longitudeRadians);
  const approxTransit = getApproxSolarTransit(
    0,
    longitudeRadians,
    julianCycle,
  );
  const meanAnomaly = getSolarMeanAnomaly(approxTransit);
  const eclipticLongitude = getEclipticLongitude(meanAnomaly);
  const declination = getDeclination(eclipticLongitude, 0);
  const solarNoon = getSolarTransitJulian(
    approxTransit,
    meanAnomaly,
    eclipticLongitude,
  );
  const setHourAngle = getHourAngleForAltitude(
    SOLAR_DISC_ALTITUDE,
    latitudeRadians,
    declination,
  );

  if (setHourAngle === null) {
    return {
      sunrise: null,
      sunset: null,
      solarNoon: fromJulianDate(solarNoon),
    };
  }

  const sunset = getSolarTransitJulian(
    getApproxSolarTransit(setHourAngle, longitudeRadians, julianCycle),
    meanAnomaly,
    eclipticLongitude,
  );
  const sunrise = solarNoon - (sunset - solarNoon);

  return {
    sunrise: fromJulianDate(sunrise),
    sunset: fromJulianDate(sunset),
    solarNoon: fromJulianDate(solarNoon),
  };
}

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
  const score = Math.round(
    moonlessRatio * 60 + (100 - moonIllumination) * 0.4,
  );

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
        "Partial moon-free windows favor brighter deep-sky targets with more contrast.",
    };
  }

  return {
    label: "Planets & Stars",
    subtext: "Moonlight dominates tonight, so high-contrast targets will hold up best.",
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

function buildLiveObservationPlan(date, location, moonIllumination) {
  if (!location) return null;

  const nightBounds = getNightBounds(date, location.lat, location.lng);
  if (!nightBounds?.start || !nightBounds?.end || nightBounds.end <= nightBounds.start) {
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

function buildFallbackObservationPlan(moonIllumination, locationStatus) {
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

function buildSimulatedObservationPlan(moonIllumination) {
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
    bestWindowSubtext:
      "Moonrise and moonset windows only apply to the actual current moon.",
    recommendedTarget: recommendedTargets.label,
    recommendedTargetSubtext: recommendedTargets.subtext,
  };
}

export function isMoonPhaseSimulation(sliderFraction, actualFraction) {
  return Math.abs(sliderFraction - actualFraction) > LIVE_PHASE_THRESHOLD;
}

export function useLiveMoonPhase(refreshIntervalMs = 60000) {
  const [actualMoon, setActualMoon] = useState(() => computeMoonPhase());

  useEffect(() => {
    const refreshMoon = () => {
      setActualMoon(computeMoonPhase());
    };

    refreshMoon();
    const refreshIntervalId = window.setInterval(refreshMoon, refreshIntervalMs);

    return () => {
      window.clearInterval(refreshIntervalId);
    };
  }, [refreshIntervalMs]);

  return actualMoon;
}

export function useMoonSliderEffects(sliderRootRef, activeFraction) {
  useEffect(() => {
    const sliderRoot = sliderRootRef.current;
    if (!sliderRoot) return;

    const thumbIndex = Math.round(activeFraction * 64);
    const marks = sliderRoot.querySelectorAll(".MuiSlider-mark");

    marks.forEach((mark) => {
      const idx = parseInt(mark.getAttribute("data-index"), 10);
      if (Number.isNaN(idx)) return;

      const distance = Math.abs(idx - thumbIndex);
      let scaleY = 1;
      let scaleX = 1;

      if (distance === 0) {
        scaleY = 1.8;
        scaleX = 1.25;
      } else if (distance === 1) {
        scaleY = 1.4;
        scaleX = 1.15;
      } else if (distance === 2) {
        scaleY = 1.2;
        scaleX = 1.05;
      } else if (distance === 3) {
        scaleY = 1.05;
        scaleX = 1.02;
      }

      mark.style.transform = `translate(-50%, -50%) scale(${scaleX}, ${scaleY})`;
      mark.style.transition = "transform 0.1s ease-out";
    });

    const labels = sliderRoot.querySelectorAll(".MuiSlider-markLabel");

    labels.forEach((label) => {
      const idx = parseInt(label.getAttribute("data-index"), 10);
      if (Number.isNaN(idx)) return;

      const distance = Math.abs(idx - thumbIndex);
      let scale = 1;
      let color = "rgba(255, 255, 255, 0.5)";
      let textShadow = "none";

      if (distance <= 2) {
        scale = 1.25;
        color = "rgba(255, 255, 255, 1)";
        textShadow = "0 0 10px rgba(255,255,255,0.8)";
      } else if (distance <= 4) {
        scale = 1.1;
        color = "rgba(255, 255, 255, 0.8)";
        textShadow = "0 0 5px rgba(255,255,255,0.3)";
      }

      label.style.transform = `translateX(-50%) scale(${scale})`;
      label.style.transition =
        "transform 0.1s ease-out, color 0.1s ease-out, text-shadow 0.1s ease-out";
      label.style.color = color;
      label.style.textShadow = textShadow;
    });
  }, [activeFraction, sliderRootRef]);
}

export function useObservationPlan({
  actualMoon,
  moon,
  isSimulating,
  location,
  locationStatus,
}) {
  const liveObservationPlan = useMemo(
    () =>
      buildLiveObservationPlan(new Date(), location, actualMoon.illumination) ??
      buildFallbackObservationPlan(actualMoon.illumination, locationStatus),
    [actualMoon.illumination, location, locationStatus],
  );
  const simulatedObservationPlan = useMemo(
    () => buildSimulatedObservationPlan(moon.illumination),
    [moon.illumination],
  );

  return isSimulating ? simulatedObservationPlan : liveObservationPlan;
}
