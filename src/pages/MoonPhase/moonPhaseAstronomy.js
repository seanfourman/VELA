const SYNODIC_MONTH_DAYS = 29.530588853;
const PRIMARY_PHASE_WINDOW = 0.015;
const LIVE_PHASE_THRESHOLD = 0.02;
const RAD = Math.PI / 180;
const EARTH_OBLIQUITY = RAD * 23.4397;
const JULIAN_UNIX_EPOCH = 2440588;
const JULIAN_J2000 = 2451545;
const SUN_DISTANCE_KM = 149598000;
const SOLAR_DISC_ALTITUDE = RAD * -0.833;

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

export function getMoonAltitude(date, latitude, longitude) {
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

export function getSunTimes(date, latitude, longitude) {
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

export function isMoonPhaseSimulation(sliderFraction, actualFraction) {
  return Math.abs(sliderFraction - actualFraction) > LIVE_PHASE_THRESHOLD;
}
