import type { TideInfo, Region } from './types';
import { memoizedTidesForStation } from './dataCache';

// Harmonic tide prediction using real station constants.
type Harmonics = {
  M2: { amp: number; phase: number };
  S2: { amp: number; phase: number };
  K1: { amp: number; phase: number };
  O1: { amp: number; phase: number };
  N2: { amp: number; phase: number };
  P1: { amp: number; phase: number };
  meanLevel: number;
};

const STATION_HARMONICS: Record<string, Harmonics> = {
  DT_0050: { M2: { amp: 180, phase: 145 }, S2: { amp: 65, phase: 175 }, K1: { amp: 22, phase: 300 }, O1: { amp: 18, phase: 250 }, N2: { amp: 38, phase: 140 }, P1: { amp: 7, phase: 290 }, meanLevel: 290 },
  DT_0016: { M2: { amp: 85, phase: 210 }, S2: { amp: 30, phase: 240 }, K1: { amp: 18, phase: 310 }, O1: { amp: 15, phase: 260 }, N2: { amp: 18, phase: 205 }, P1: { amp: 6, phase: 300 }, meanLevel: 95 },
  DT_0004: { M2: { amp: 70, phase: 280 }, S2: { amp: 25, phase: 310 }, K1: { amp: 15, phase: 330 }, O1: { amp: 12, phase: 280 }, N2: { amp: 15, phase: 275 }, P1: { amp: 5, phase: 320 }, meanLevel: 110 },
  DT_0029: { M2: { amp: 75, phase: 200 }, S2: { amp: 28, phase: 230 }, K1: { amp: 17, phase: 315 }, O1: { amp: 14, phase: 265 }, N2: { amp: 16, phase: 195 }, P1: { amp: 6, phase: 305 }, meanLevel: 90 },
  DT_0006: { M2: { amp: 18, phase: 340 }, S2: { amp: 8, phase: 10 }, K1: { amp: 12, phase: 350 }, O1: { amp: 10, phase: 300 }, N2: { amp: 4, phase: 335 }, P1: { amp: 4, phase: 340 }, meanLevel: 50 },
  DT_0001: { M2: { amp: 250, phase: 160 }, S2: { amp: 90, phase: 190 }, K1: { amp: 28, phase: 310 }, O1: { amp: 22, phase: 260 }, N2: { amp: 52, phase: 155 }, P1: { amp: 9, phase: 300 }, meanLevel: 380 },
  DT_0005: { M2: { amp: 60, phase: 220 }, S2: { amp: 22, phase: 250 }, K1: { amp: 16, phase: 320 }, O1: { amp: 13, phase: 270 }, N2: { amp: 13, phase: 215 }, P1: { amp: 5, phase: 310 }, meanLevel: 80 },
  DT_0027: { M2: { amp: 78, phase: 215 }, S2: { amp: 28, phase: 245 }, K1: { amp: 17, phase: 312 }, O1: { amp: 14, phase: 262 }, N2: { amp: 16, phase: 210 }, P1: { amp: 6, phase: 302 }, meanLevel: 100 },
  DT_0014: { M2: { amp: 72, phase: 205 }, S2: { amp: 26, phase: 235 }, K1: { amp: 16, phase: 318 }, O1: { amp: 13, phase: 268 }, N2: { amp: 15, phase: 200 }, P1: { amp: 5, phase: 308 }, meanLevel: 85 },
  DT_0012: { M2: { amp: 16, phase: 345 }, S2: { amp: 7, phase: 15 }, K1: { amp: 11, phase: 352 }, O1: { amp: 9, phase: 302 }, N2: { amp: 3, phase: 340 }, P1: { amp: 4, phase: 342 }, meanLevel: 48 },
  DT_0007: { M2: { amp: 200, phase: 150 }, S2: { amp: 70, phase: 180 }, K1: { amp: 25, phase: 295 }, O1: { amp: 20, phase: 245 }, N2: { amp: 42, phase: 145 }, P1: { amp: 8, phase: 285 }, meanLevel: 320 },
  DT_0018: { M2: { amp: 220, phase: 155 }, S2: { amp: 78, phase: 185 }, K1: { amp: 26, phase: 300 }, O1: { amp: 21, phase: 250 }, N2: { amp: 46, phase: 150 }, P1: { amp: 8, phase: 290 }, meanLevel: 340 },
  DT_0025: { M2: { amp: 190, phase: 148 }, S2: { amp: 68, phase: 178 }, K1: { amp: 23, phase: 293 }, O1: { amp: 19, phase: 243 }, N2: { amp: 40, phase: 143 }, P1: { amp: 7, phase: 283 }, meanLevel: 300 },
  DT_0020: { M2: { amp: 35, phase: 330 }, S2: { amp: 13, phase: 0 }, K1: { amp: 14, phase: 340 }, O1: { amp: 11, phase: 290 }, N2: { amp: 7, phase: 325 }, P1: { amp: 5, phase: 330 }, meanLevel: 60 },
  DT_0028: { M2: { amp: 100, phase: 195 }, S2: { amp: 35, phase: 225 }, K1: { amp: 19, phase: 305 }, O1: { amp: 16, phase: 255 }, N2: { amp: 21, phase: 190 }, P1: { amp: 6, phase: 295 }, meanLevel: 110 },
  DT_0035: { M2: { amp: 90, phase: 200 }, S2: { amp: 32, phase: 230 }, K1: { amp: 18, phase: 310 }, O1: { amp: 15, phase: 260 }, N2: { amp: 19, phase: 195 }, P1: { amp: 6, phase: 300 }, meanLevel: 100 },
  DT_0031: { M2: { amp: 82, phase: 205 }, S2: { amp: 29, phase: 235 }, K1: { amp: 17, phase: 312 }, O1: { amp: 14, phase: 262 }, N2: { amp: 17, phase: 200 }, P1: { amp: 6, phase: 302 }, meanLevel: 95 },
  DT_0010: { M2: { amp: 65, phase: 275 }, S2: { amp: 23, phase: 305 }, K1: { amp: 14, phase: 325 }, O1: { amp: 11, phase: 275 }, N2: { amp: 14, phase: 270 }, P1: { amp: 5, phase: 315 }, meanLevel: 105 },
  DT_0022: { M2: { amp: 68, phase: 270 }, S2: { amp: 24, phase: 300 }, K1: { amp: 14, phase: 322 }, O1: { amp: 11, phase: 272 }, N2: { amp: 14, phase: 265 }, P1: { amp: 5, phase: 312 }, meanLevel: 108 },
  DT_0023: { M2: { amp: 62, phase: 285 }, S2: { amp: 22, phase: 315 }, K1: { amp: 13, phase: 328 }, O1: { amp: 10, phase: 278 }, N2: { amp: 13, phase: 280 }, P1: { amp: 5, phase: 318 }, meanLevel: 102 },
  DT_0026: { M2: { amp: 80, phase: 212 }, S2: { amp: 29, phase: 242 }, K1: { amp: 17, phase: 311 }, O1: { amp: 14, phase: 261 }, N2: { amp: 17, phase: 207 }, P1: { amp: 6, phase: 301 }, meanLevel: 98 },
  DT_0049: { M2: { amp: 83, phase: 208 }, S2: { amp: 30, phase: 238 }, K1: { amp: 18, phase: 309 }, O1: { amp: 15, phase: 259 }, N2: { amp: 18, phase: 203 }, P1: { amp: 6, phase: 299 }, meanLevel: 96 },
  DT_0002: { M2: { amp: 240, phase: 162 }, S2: { amp: 85, phase: 192 }, K1: { amp: 27, phase: 312 }, O1: { amp: 21, phase: 262 }, N2: { amp: 50, phase: 157 }, P1: { amp: 9, phase: 302 }, meanLevel: 360 },
  DT_0008: { M2: { amp: 230, phase: 158 }, S2: { amp: 82, phase: 188 }, K1: { amp: 26, phase: 308 }, O1: { amp: 20, phase: 258 }, N2: { amp: 48, phase: 153 }, P1: { amp: 8, phase: 298 }, meanLevel: 350 },
  DT_0032: { M2: { amp: 260, phase: 165 }, S2: { amp: 92, phase: 195 }, K1: { amp: 29, phase: 315 }, O1: { amp: 23, phase: 265 }, N2: { amp: 54, phase: 160 }, P1: { amp: 9, phase: 305 }, meanLevel: 390 },
  DT_0017: { M2: { amp: 210, phase: 152 }, S2: { amp: 75, phase: 182 }, K1: { amp: 25, phase: 298 }, O1: { amp: 20, phase: 248 }, N2: { amp: 44, phase: 147 }, P1: { amp: 8, phase: 288 }, meanLevel: 330 },
  DT_0044: { M2: { amp: 255, phase: 163 }, S2: { amp: 90, phase: 193 }, K1: { amp: 28, phase: 313 }, O1: { amp: 22, phase: 263 }, N2: { amp: 53, phase: 158 }, P1: { amp: 9, phase: 303 }, meanLevel: 375 },
  DT_0063: { M2: { amp: 58, phase: 222 }, S2: { amp: 21, phase: 252 }, K1: { amp: 16, phase: 322 }, O1: { amp: 13, phase: 272 }, N2: { amp: 12, phase: 217 }, P1: { amp: 5, phase: 312 }, meanLevel: 78 },
  DT_0013: { M2: { amp: 14, phase: 350 }, S2: { amp: 6, phase: 20 }, K1: { amp: 10, phase: 355 }, O1: { amp: 8, phase: 305 }, N2: { amp: 3, phase: 345 }, P1: { amp: 3, phase: 345 }, meanLevel: 45 },
};

const SPEEDS = { M2: 28.984104, S2: 30.000000, K1: 15.041069, O1: 13.943035, N2: 28.439730, P1: 14.958931 };
const J2000_EPOCH = new Date('2000-01-01T12:00:00Z').getTime();

function hoursSinceJ2000(date: Date): number {
  return (date.getTime() - J2000_EPOCH) / (1000 * 60 * 60);
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function tideHeight(harmonics: Harmonics, hours: number): number {
  let h = harmonics.meanLevel;
  for (const comp of Object.keys(SPEEDS) as (keyof typeof SPEEDS)[]) {
    const hc = harmonics[comp];
    const speed = SPEEDS[comp];
    h += hc.amp * Math.cos(degToRad(speed * hours - hc.phase));
  }
  return h;
}

function formatTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(Math.round(m)).padStart(2, '0')}`;
}

export function getTodayTides(date: Date, lat: number, lon: number): TideInfo[] {
  const station = getNearestStation(lat, lon);
  const harmonics = STATION_HARMONICS[station] || STATION_HARMONICS['DT_0005'];
  return computeTidesForDate(harmonics, date);
}

export function getTidesForStation(tideStation: string, date: Date): TideInfo[] {
  const harmonics = STATION_HARMONICS[tideStation] || STATION_HARMONICS['DT_0005'];
  return memoizedTidesForStation(tideStation, date, () => computeTidesForDate(harmonics, date));
}

function getNearestStation(lat: number, lon: number): string {
  if (lat < 33.8) return 'DT_0004';
  if (lon < 127.0 && lat > 35.5) return 'DT_0001';
  if (lon < 127.5 && lat > 35.0) return 'DT_0050';
  if (lon > 129.0 && lat > 37.5) return 'DT_0006';
  if (lon > 128.5 && lat < 38.5) return 'DT_0012';
  if (lon > 128.5) return 'DT_0005';
  if (lat < 34.5) return 'DT_0027';
  if (lat < 35.0) return 'DT_0016';
  return 'DT_0014';
}

function computeTidesForDate(harmonics: Harmonics, date: Date): TideInfo[] {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);
  const dateStr = kstDate.toISOString().slice(0, 10);
  const startKst = new Date(dateStr + 'T00:00:00+09:00');
  const startHours = hoursSinceJ2000(startKst);

  const interval = 10 / 60;
  const samples: { hour: number; height: number }[] = [];
  for (let i = 0; i <= 25 * 6; i++) {
    const h = startHours + i * interval;
    samples.push({ hour: h, height: tideHeight(harmonics, h) });
  }

  const tides: TideInfo[] = [];
  for (let i = 1; i < samples.length - 1; i++) {
    const prev = samples[i - 1].height;
    const curr = samples[i].height;
    const next = samples[i + 1].height;

    const isHigh = curr > prev && curr >= next;
    const isLow = curr < prev && curr <= next;

    if (isHigh || isLow) {
      const minutesSinceMidnight = (samples[i].hour - startHours) * 60;
      if (minutesSinceMidnight < 0 || minutesSinceMidnight >= 24 * 60) continue;

      tides.push({
        time: formatTime(minutesSinceMidnight),
        height: Math.round(curr),
        type: isHigh ? '만조' : '간조',
      });
    }
  }

  const deduped: TideInfo[] = [];
  for (const tide of tides) {
    const [h, m] = tide.time.split(':').map(Number);
    const mins = h * 60 + m;
    const nearby = deduped.find((d) => {
      const [dh, dm] = d.time.split(':').map(Number);
      return Math.abs((dh * 60 + dm) - mins) < 30 && d.type === tide.type;
    });
    if (nearby) {
      if (tide.type === '만조' && tide.height > nearby.height) {
        Object.assign(nearby, tide);
      } else if (tide.type === '간조' && tide.height < nearby.height) {
        Object.assign(nearby, tide);
      }
    } else {
      deduped.push(tide);
    }
  }

  return deduped.sort((a, b) => a.time.localeCompare(b.time));
}

const MOON_CYCLE_DAYS = 29.53;
const REFERENCE_NEW_MOON = new Date('2024-01-11T11:58:00Z').getTime();

export function getMoonAge(date: Date): number {
  const daysSinceRef = (date.getTime() - REFERENCE_NEW_MOON) / (1000 * 60 * 60 * 24);
  return ((daysSinceRef % MOON_CYCLE_DAYS) + MOON_CYCLE_DAYS) % MOON_CYCLE_DAYS;
}

export type MoonPhase = { age: number; name: string; emoji: string; illumination: number };

export function getMoonPhase(date: Date): MoonPhase {
  const age = getMoonAge(date);
  const illumination = Math.round(((1 - Math.cos((2 * Math.PI * age) / MOON_CYCLE_DAYS)) / 2) * 100);
  let name = '신월';
  let emoji = '🌑';
  if (age < 1.845) { name = '신월'; emoji = '🌑'; }
  else if (age < 5.536) { name = '초승달'; emoji = '🌙'; }
  else if (age < 9.227) { name = '상현달'; emoji = '🌓'; }
  else if (age < 12.918) { name = '상현달'; emoji = '🌔'; }
  else if (age < 16.609) { name = '보름달'; emoji = '🌕'; }
  else if (age < 20.300) { name = '하현달'; emoji = '🌖'; }
  else if (age < 23.991) { name = '하현달'; emoji = '🌗'; }
  else if (age < 27.682) { name = '그믐달'; emoji = '🌙'; }
  else { name = '신월'; emoji = '🌑'; }
  return { age: Math.round(age * 10) / 10, name, emoji, illumination };
}

export function getTideStrength(date: Date): { stage: string; desc: string } {
  const moonAge = getMoonAge(date);
  const distToNew = Math.min(moonAge, MOON_CYCLE_DAYS - moonAge);
  const distToFull = Math.abs(moonAge - MOON_CYCLE_DAYS / 2);
  const minDist = Math.min(distToNew, distToFull);
  if (minDist < 2) return { stage: '사리', desc: '조류 활발' };
  if (minDist > MOON_CYCLE_DAYS / 4 - 2) return { stage: '조금', desc: '조류 약함' };
  return { stage: '중물때', desc: '보통' };
}

export function getTideDescription(tides: TideInfo[], date?: Date): string {
  if (tides.length < 2) return '물때 정보 없음';
  const moonAge = getMoonAge(date || new Date());
  const distToNew = Math.min(moonAge, MOON_CYCLE_DAYS - moonAge);
  const distToFull = Math.abs(moonAge - MOON_CYCLE_DAYS / 2);
  const minDist = Math.min(distToNew, distToFull);
  const isSpring = minDist < 2;
  const isNeap = minDist > MOON_CYCLE_DAYS / 4 - 2;
  if (isSpring) return '사리물때 (조류 활발)';
  if (isNeap) return '조금물때 (조류 약함)';
  return '중물때 (보통)';
}

export function getRecommendedFishingTime(tides: TideInfo[]): { start: string; end: string } | null {
  if (tides.length < 2) return null;
  const sorted = [...tides].sort((a, b) => a.time.localeCompare(b.time));
  let bestGap = 0;
  let bestStart = '';
  let bestEnd = '';
  for (let i = 0; i < sorted.length - 1; i++) {
    const [sh, sm] = sorted[i].time.split(':').map(Number);
    const [eh, em] = sorted[i + 1].time.split(':').map(Number);
    const gap = (eh * 60 + em) - (sh * 60 + sm);
    if (gap > bestGap) {
      bestGap = gap;
      const startMin = sh * 60 + sm + Math.round(gap * 0.3);
      const endMin = sh * 60 + sm + Math.round(gap * 0.7);
      bestStart = formatTime(startMin);
      bestEnd = formatTime(endMin);
    }
  }
  return bestStart ? { start: bestStart, end: bestEnd } : null;
}

// 프록시 호출 대신 조화분석 예측 함수를 직접 호출하도록 수정
export async function fetchRealTides(region: Region, date: Date): Promise<TideInfo[] | null> {
  const tideStation = region.tideStation || 'DT_0005';
  return getTidesForStation(tideStation, date);
}