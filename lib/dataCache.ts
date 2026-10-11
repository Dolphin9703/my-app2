import type { TideInfo, WeatherInfo, SunTimes } from './types';

// A day-level cache so that switching back to a previously viewed date is
// instantaneous — no re-fetch, no recompute. Keyed by a composite string
// combining the KST calendar date, the region name, and the tide station code.

interface CachedDayData {
  tides: TideInfo[];
  usingRealTide: boolean;
  weather: WeatherInfo | null;
  usingRealWeather: boolean;
  sunTimes: SunTimes | null;
}

const cache = new Map<string, CachedDayData>();
const MAX_ENTRIES = 60;

function kstDateKey(date: Date): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kst = new Date(date.getTime() + kstOffset);
  return kst.toISOString().slice(0, 10);
}

export function getCacheKey(date: Date, regionName: string, stationCode: string): string {
  return `${kstDateKey(date)}|${regionName}|${stationCode}`;
}

export function getCachedData(date: Date, regionName: string, stationCode: string): CachedDayData | undefined {
  return cache.get(getCacheKey(date, regionName, stationCode));
}

export function setCachedData(date: Date, regionName: string, stationCode: string, data: CachedDayData): void {
  const key = getCacheKey(date, regionName, stationCode);
  // Evict oldest entries to keep memory bounded
  if (cache.size >= MAX_ENTRIES && !cache.has(key)) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, data);
}

// --- Memoized compute helpers for the fallback (harmonic/synthetic) data ---

const tideComputeCache = new Map<string, TideInfo[]>();

export function memoizedTidesForStation(stationCode: string, date: Date, compute: () => TideInfo[]): TideInfo[] {
  const key = `${stationCode}|${kstDateKey(date)}`;
  const cached = tideComputeCache.get(key);
  if (cached) return cached;
  const result = compute();
  tideComputeCache.set(key, result);
  return result;
}

const sunComputeCache = new Map<string, SunTimes>();

export function memoizedSunTimes(lat: number, lon: number, date: Date, compute: () => SunTimes): SunTimes {
  const key = `${Math.round(lat * 1000)}_${Math.round(lon * 1000)}|${kstDateKey(date)}`;
  const cached = sunComputeCache.get(key);
  if (cached) return cached;
  const result = compute();
  sunComputeCache.set(key, result);
  return result;
}

const weatherFallbackCache = new Map<string, WeatherInfo>();

export function memoizedWeatherFallback(lat: number, lon: number, date: Date, compute: () => WeatherInfo): WeatherInfo {
  const key = `${Math.round(lat * 1000)}_${Math.round(lon * 1000)}|${kstDateKey(date)}`;
  const cached = weatherFallbackCache.get(key);
  if (cached) return cached;
  const result = compute();
  weatherFallbackCache.set(key, result);
  return result;
}
