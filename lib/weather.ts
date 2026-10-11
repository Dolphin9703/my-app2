import type { WeatherInfo, WeatherAlert, Region } from './types';
import { memoizedWeatherFallback } from './dataCache';

const WEATHER_CONDITIONS = ['맑음', '흐림', '구름많음', '비', '눈'];
const WIND_DIRECTIONS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const WIND_DIR_KR: Record<string, string> = {
  N: '북', NNE: '북북동', NE: '북동', ENE: '동북동', E: '동', ESE: '동남동', SE: '남동', SSE: '남남동',
  S: '남', SSW: '남남서', SW: '남서', WSW: '서남서', W: '서', WNW: '서북서', NW: '북서', NNW: '북북서',
};

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function getWeatherForRegion(lat: number, lon: number, date: Date): WeatherInfo {
  return memoizedWeatherFallback(lat, lon, date, () => {
    const seed = Math.floor(lat * 1000) + Math.floor(lon * 1000) + Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
    const rand = seededRandom(seed);
    const windSpeed = Math.round(2 + rand() * 8);
    const waveHeight = Math.round((0.5 + rand() * 2.5) * 10) / 10;
    const waterTemp = Math.round((10 + rand() * 18) * 10) / 10;
    const airTemp = Math.round((5 + rand() * 25) * 10) / 10;
    const sky = WEATHER_CONDITIONS[Math.floor(rand() * 3)];
    const windDirIndex = Math.floor(rand() * 16);
    const windDir = WIND_DIRECTIONS[windDirIndex];
    const windDirKr = WIND_DIR_KR[windDir] || '북';
    const windDirAngle = windDirIndex * 22.5;
    return {
      windSpeed, waveHeight, waterTemp, airTemp, sky,
      windDir, windDirKr, windDirAngle,
      updatedAt: date.toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
  });
}

function getSupabaseUrl(): string {
  return (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
}

function getKmaBaseTime(date: Date): { baseDate: string; baseTime: string } {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(date.getTime() + kstOffset);
  const baseDate = kstDate.toISOString().slice(0, 10).replace(/-/g, '');
  const kstHour = kstDate.getUTCHours();
  // KMA allowed base_times: 0200, 0500, 0800, 1100, 1400, 1700, 2000, 2300
  const allowedTimes = [2, 5, 8, 11, 14, 17, 20, 23];
  let selectedHour = 2;
  for (const h of allowedTimes) {
    if (kstHour >= h) selectedHour = h;
  }
  // If before 2 AM KST, use previous day's 2300
  if (kstHour < 2) {
    const prevDate = new Date(kstDate.getTime() - 24 * 60 * 60 * 1000);
    const prevDateStr = prevDate.toISOString().slice(0, 10).replace(/-/g, '');
    return { baseDate: prevDateStr, baseTime: '2300' };
  }
  return { baseDate, baseTime: String(selectedHour).padStart(2, '0') + '00' };
}

export async function fetchRealWeather(region: Region, date: Date): Promise<WeatherInfo | null> {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    console.warn('[Weather] EXPO_PUBLIC_SUPABASE_URL이 설정되지 않아 가상 데이터를 사용합니다.');
    return null;
  }
  try {
    const { baseDate, baseTime } = getKmaBaseTime(date);
    const proxyUrl = `${supabaseUrl}/functions/v1/api-proxy/weather?nx=${region.gridX}&ny=${region.gridY}&base_date=${baseDate}&base_time=${baseTime}`;
    console.log(`[Weather] 프록시 호출: URL=${proxyUrl}, 격자=(${region.gridX},${region.gridY}), base_date=${baseDate}, base_time=${baseTime}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    console.log(`[Weather] 프록시 응답: HTTP ${res.status} ${res.statusText}`);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[Weather] 프록시 응답 오류: HTTP ${res.status}, body=${errText.slice(0, 300)}`);
      return null;
    }
    const data = await res.json();
    console.log(`[Weather] 프록시 응답 원문 (요약):`, JSON.stringify(data).slice(0, 500));
    if (data.error) {
      console.warn(`[Weather] 프록시 에러: ${data.error}`, data.detail || '');
      return null;
    }
    // Handle non-standard OpenAPI error response from data.go.kr
    if (data?.OpenAPI_ServiceResponse?.cmmMsgHeader?.errMsg) {
      const errMsg = data.OpenAPI_ServiceResponse.cmmMsgHeader.errMsg;
      const reasonCode = data.OpenAPI_ServiceResponse.cmmMsgHeader.returnReasonCode || '';
      console.warn(`[Weather] OpenAPI 서비스 에러: ${errMsg} (코드 ${reasonCode})`);
      return null;
    }
    const resultMsg = data?.response?.header?.resultMsg || '';
    const resultCode = data?.response?.header?.resultCode || '';
    console.log(`[Weather] API 결과: resultCode=${resultCode}, resultMsg=${resultMsg}`);
    if (resultMsg && resultMsg !== 'NORMAL_SERVICE') {
      console.warn(`[Weather] API 결과 메시지: ${resultMsg} (정상 서비스가 아님)`);
      return null;
    }
    const items = data?.response?.body?.items?.item;
    if (!items || !Array.isArray(items)) {
      console.warn(`[Weather] API 응답에 items가 없거나 배열이 아님. resultMsg=${resultMsg}, items=`, JSON.stringify(items)?.slice(0, 300));
      return null;
    }
    console.log(`[Weather] API 응답: ${items.length}개 전체 예측 항목`);
    // Use all items — ultra-short-term and observation APIs may return only current-hour data
    // so filtering by fcstDate===baseDate may exclude valid real-time items
    const todayItems = items.filter((it: any) => it.fcstDate === baseDate);
    const usableItems = todayItems.length > 0 ? todayItems : items;
    console.log(`[Weather] 사용 가능 항목: ${usableItems.length}개 (today=${todayItems.length})`);
    if (usableItems.length === 0) {
      console.warn('[Weather] 사용 가능한 데이터 항목이 없음.');
      return null;
    }
    // Use the closest forecast time to "now" for current conditions
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(date.getTime() + kstOffset);
    const currentKstHour = String(kstNow.getUTCHours()).padStart(2, '0') + '00';
    const getVal = (category: string): string | undefined => {
      // Find the item matching this category with the closest forecast time >= now
      const catItems = usableItems
        .filter((it: any) => it.category === category)
        .sort((a: any, b: any) => a.fcstTime.localeCompare(b.fcstTime));
      if (catItems.length === 0) return undefined;
      // Try to find the first forecast at or after current hour
      const upcoming = catItems.find((it: any) => it.fcstTime >= currentKstHour);
      const item = upcoming || catItems[0];
      return String(item.fcstValue);
    };
    const windSpeed = parseFloat(getVal('WSD') || '0') || 0;
    const windDirRaw = parseInt(getVal('VEC') || '0') || 0;
    const airTemp = parseFloat(getVal('TMP') || '0') || 0;
    const skyCode = parseInt(getVal('SKY') || '1') || 1;
    const ptyCode = parseInt(getVal('PTY') || '0') || 0;
    const wavRaw = getVal('WAV');
    const humidity = parseFloat(getVal('REH') || '0') || 0;
    // KMA sky codes: 1=맑음, 3=구름많음, 4=흐림
    // KMA PTY codes: 0=없음, 1=비, 2=비/눈, 3=눈, 4=소나기
    const skyMap: Record<number, string> = { 1: '맑음', 3: '구름많음', 4: '흐림' };
    const ptyMap: Record<number, string> = { 0: '', 1: '비', 2: '비/눈', 3: '눈', 4: '소나기' };
    let sky = skyMap[skyCode] || '맑음';
    const pty = ptyMap[ptyCode] || '';
    if (pty) sky = pty; // Override sky with precipitation type if present
    const windDirIndex = Math.round(windDirRaw / 22.5) % 16;
    const windDir = WIND_DIRECTIONS[windDirIndex];
    const windDirKr = WIND_DIR_KR[windDir] || '북';
    const windDirAngle = windDirIndex * 22.5;
    // Use real wave height from KMA WAV category if available, otherwise estimate from wind
    let waveHeight: number;
    if (wavRaw !== undefined && wavRaw !== null) {
      const wavVal = parseFloat(wavRaw);
      // KMA WAV can return 0 for inland grid points; only use if > 0
      if (!isNaN(wavVal) && wavVal > 0) {
        waveHeight = wavVal;
      } else {
        waveHeight = 0.5 + (windSpeed / 10) * 2;
      }
    } else {
      waveHeight = 0.5 + (windSpeed / 10) * 2;
    }
    // Estimate water temp (KMA doesn't provide sea temp in VilageFcst; typical offset is 2-5°C below air in autumn)
    const month = kstNow.getUTCMonth() + 1;
    const seasonalOffset = month >= 6 && month <= 9 ? 2 : month >= 3 && month <= 5 ? 3 : 4;
    const waterTemp = airTemp - seasonalOffset;
    console.log(`[Weather] 파싱 완료: 풍속=${windSpeed}m/s, 풍향=${windDir}(${windDirKr}), 기온=${airTemp}°C, 하늘=${sky}(SKY=${skyCode},PTY=${ptyCode}), 파고=${waveHeight}m, 습도=${humidity}%`);
    return {
      windSpeed: Math.round(windSpeed * 10) / 10,
      waveHeight: Math.round(waveHeight * 10) / 10,
      waterTemp: Math.round(waterTemp * 10) / 10,
      airTemp: Math.round(airTemp * 10) / 10,
      sky, windDir, windDirKr, windDirAngle,
      updatedAt: date.toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.warn('[Weather] 프록시 호출 타임아웃 (10초). 가상 데이터로 폴백.');
    } else {
      console.warn('[Weather] 프록시 호출 중 예외:', e?.message || e, e?.stack || '');
    }
    return null;
  }
}

export async function fetchWeatherAlerts(): Promise<WeatherAlert[]> {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    console.warn('[WeatherAlert] Supabase URL이 설정되지 않아 빈 배열 반환.');
    return [];
  }
  try {
    const proxyUrl = `${supabaseUrl}/functions/v1/api-proxy/weather-alerts`;
    console.log(`[WeatherAlert] 프록시 호출: URL=${proxyUrl}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(proxyUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    console.log(`[WeatherAlert] 프록시 응답: HTTP ${res.status} ${res.statusText}`);
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[WeatherAlert] 프록시 응답 오류: HTTP ${res.status}, body=${errText.slice(0, 300)}`);
      return [];
    }
    const data = await res.json();
    console.log(`[WeatherAlert] 프록시 응답 원문 (요약):`, JSON.stringify(data).slice(0, 500));
    if (data.error) {
      console.warn(`[WeatherAlert] 프록시 에러: ${data.error}`, data.detail || '');
      return [];
    }
    const items = data?.response?.body?.items?.item;
    if (!items || !Array.isArray(items)) {
      console.warn(`[WeatherAlert] API 응답에 items가 없거나 배열이 아님.`);
      return [];
    }
    console.log(`[WeatherAlert] API 응답: ${items.length}개 기상 특보`);
    return items.map((item: any, idx: number) => ({
      id: String(item.stnId || idx),
      region: item.areaName || '전국',
      alertType: item.wrnType || '',
      level: item.wrnLevel || '',
      message: item.wrnText || '',
      issuedAt: item.announceTime || '',
    }));
  } catch (e: any) {
    if (e.name === 'AbortError') {
      console.warn('[WeatherAlert] 프록시 호출 타임아웃 (8초).');
    } else {
      console.warn('[WeatherAlert] 프록시 호출 중 예외:', e?.message || e, e?.stack || '');
    }
    return [];
  }
}

export function getWeatherAdvice(weather: WeatherInfo): string {
  if (weather.windSpeed >= 10) return '풍속 매우 강함. 출조 권장하지 않습니다.';
  if (weather.windSpeed > 8) return '풍속이 강합니다. 갯바위 낚시 주의하세요.';
  if (weather.waveHeight > 2) return '파고가 높습니다. 안전에 유의하세요.';
  if (weather.windSpeed < 4 && weather.waveHeight < 1.5) return '날씨가 좋아 낚시에 적합합니다.';
  return '보통의 날씨 조건입니다. 포인트에 맞게 대비하세요.';
}

export function getFishingScore(weather: WeatherInfo): number {
  let score = 100;
  score -= Math.max(0, weather.windSpeed - 4) * 6;
  score -= Math.max(0, weather.waveHeight - 1.5) * 15;
  return Math.max(20, Math.min(100, Math.round(score)));
}

export function convertWindSpeed(speedMs: number, unit: string): { primary: number; secondary: number; unit: string; secondaryUnit: string } {
  if (unit === 'knot') {
    return { primary: Math.round(speedMs * 1.94384 * 10) / 10, secondary: Math.round(speedMs * 10) / 10, unit: 'knot', secondaryUnit: 'm/s' };
  }
  return { primary: Math.round(speedMs * 10) / 10, secondary: Math.round(speedMs * 1.94384 * 10) / 10, unit: 'm/s', secondaryUnit: 'knot' };
}
