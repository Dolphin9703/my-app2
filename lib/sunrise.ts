import type { SunTimes } from './types';
import { memoizedSunTimes } from './dataCache';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

// Julian Day from a Date (UTC milliseconds since epoch).
function toJulian(date: Date): number {
  return date.getTime() / 86400000 + 2440580.0;
}

// Julian Century since J2000 (2000-01-01 12:00 UTC).
function julianCentury(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

// Geometric mean longitude of the sun (degrees).
function geomMeanLongSun(t: number): number {
  let l0 = 280.46646 + t * (36000.76983 + 0.0003032 * t);
  l0 = l0 % 360;
  if (l0 < 0) l0 += 360;
  return l0;
}

// Geometric mean anomaly of the sun (degrees).
function geomMeanAnomSun(t: number): number {
  return 357.52911 + t * (35999.05029 - 0.0001537 * t);
}

// Eccentricity of Earth's orbit.
function eccentEarthOrbit(t: number): number {
  return 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
}

// Sun's equation of center (degrees).
function sunEqOfCenter(t: number): number {
  const m = geomMeanAnomSun(t) * RAD;
  return (
    Math.sin(m) * (1.914602 - 0.004817 * t - 0.000014 * t * t) +
    Math.sin(2 * m) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * m) * 0.000289
  );
}

// Sun's true longitude (degrees).
function sunTrueLong(t: number): number {
  return geomMeanLongSun(t) + sunEqOfCenter(t);
}

// Sun's apparent longitude (degrees), corrected for aberration and nutation.
function sunApparentLong(t: number): number {
  return sunTrueLong(t) - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * t) * RAD);
}

// Mean obliquity of the ecliptic (degrees).
function meanObliqEcliptic(t: number): number {
  const seconds = 21.448 - t * (46.815 + 0.00059 * t - 0.001813 * t * t);
  return 23.0 + (26.0 + seconds / 60.0) / 60.0;
}

// Obliquity correction (degrees).
function obliqCorrection(t: number): number {
  return meanObliqEcliptic(t) + 0.00256 * Math.cos((125.04 - 1934.136 * t) * RAD);
}

// Sun declination (degrees).
function sunDeclination(t: number): number {
  const oc = obliqCorrection(t) * RAD;
  const sal = sunApparentLong(t) * RAD;
  return Math.asin(Math.sin(oc) * Math.sin(sal)) * DEG;
}

// Equation of time (minutes). This is the difference between apparent solar time
// and mean solar time, caused by Earth's elliptical orbit and axial tilt.
function equationOfTime(t: number): number {
  const epsilon = obliqCorrection(t) * RAD;
  const l0 = geomMeanLongSun(t) * RAD;
  const e = eccentEarthOrbit(t);
  const m = geomMeanAnomSun(t) * RAD;

  const y = Math.tan(epsilon / 2) * Math.tan(epsilon / 2);

  const eqTime =
    y * Math.sin(2 * l0) -
    2 * e * Math.sin(m) +
    4 * e * y * Math.sin(m) * Math.cos(2 * l0) -
    0.5 * y * y * Math.sin(4 * l0) -
    1.25 * e * e * Math.sin(2 * m);

  return eqTime * 4 * DEG; // in minutes
}

// Hour angle for sunrise/sunset (degrees). Uses -0.833° for standard atmospheric refraction.
function hourAngleSunrise(lat: number, decl: number): number {
  const latR = lat * RAD;
  const declR = decl * RAD;
  const cosHa =
    (Math.cos(90.833 * RAD) - Math.sin(latR) * Math.sin(declR)) /
    (Math.cos(latR) * Math.cos(declR));
  if (cosHa < -1 || cosHa > 1) return NaN; // Polar day or polar night.
  return Math.acos(cosHa) * DEG;
}

// Compute sunrise and sunset as minutes from local midnight for a given timezone.
// timezone is in hours (e.g., 9 for KST).
function computeSunTimes(lat: number, lon: number, date: Date, timezone: number): {
  sunrise: number | null;
  sunset: number | null;
} {
  const jd = toJulian(date);
  const t = julianCentury(jd);
  const decl = sunDeclination(t);
  const eqTime = equationOfTime(t);
  const ha = hourAngleSunrise(lat, decl);

  if (isNaN(ha)) return { sunrise: null, sunset: null };

  // Solar noon in minutes from local midnight.
  const solarNoon = 720 - 4 * lon - eqTime + timezone * 60;
  const sunriseMin = solarNoon - ha * 4;
  const sunsetMin = solarNoon + ha * 4;

  return { sunrise: sunriseMin, sunset: sunsetMin };
}

function minutesToHHMM(totalMinutes: number): string {
  let m = Math.round(totalMinutes);
  // Wrap into 0–1440 range.
  m = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function getSunTimes(lat: number, lon: number, date: Date): SunTimes {
  return memoizedSunTimes(lat, lon, date, () => {
    const { sunrise, sunset } = computeSunTimes(lat, lon, date, 9);
    return {
      sunrise: sunrise !== null ? minutesToHHMM(sunrise) : '--:--',
      sunset: sunset !== null ? minutesToHHMM(sunset) : '--:--',
    };
  });
}
