import type { Region } from './types';

export const REGIONS: Region[] = [
  { name: '태안', lat: 36.7556, lon: 126.2975, description: '충남 태안반도, 서해 대표 갯바위 포인트', tideStation: 'DT_0050', gridX: 49, gridY: 130 },
  { name: '여수', lat: 34.7604, lon: 127.6622, description: '전남 여수, 남해안 다도해 낚시', tideStation: 'DT_0016', gridX: 73, gridY: 69 },
  { name: '제주', lat: 33.4996, lon: 126.5312, description: '제주도, 갯바위 선상 낚시의 천국', tideStation: 'DT_0004', gridX: 53, gridY: 38 },
  { name: '거제', lat: 34.8804, lon: 128.6214, description: '경남 거제, 남해안 대표 포인트', tideStation: 'DT_0029', gridX: 90, gridY: 75 },
  { name: '강릉', lat: 37.7519, lon: 128.8761, description: '강원 강릉, 동해안 대표 포인트', tideStation: 'DT_0006', gridX: 93, gridY: 133 },
  { name: '인천', lat: 37.4563, lon: 126.7052, description: '인천, 서해안 갯바위 및 방파제', tideStation: 'DT_0001', gridX: 53, gridY: 124 },
  { name: '부산', lat: 35.1796, lon: 129.0756, description: '부산, 남해안 갯바위 포인트', tideStation: 'DT_0005', gridX: 98, gridY: 74 },
  { name: '완도', lat: 34.3110, lon: 126.7547, description: '전남 완도, 다도해 낚시의 메카', tideStation: 'DT_0027', gridX: 57, gridY: 59 },
  { name: '통영', lat: 34.8540, lon: 128.4333, description: '경남 통영, 남해안 갯바위 낚시', tideStation: 'DT_0014', gridX: 87, gridY: 74 },
  { name: '속초', lat: 38.2078, lon: 128.5911, description: '강원 속초, 동해안 대표 포인트', tideStation: 'DT_0012', gridX: 82, gridY: 138 },
  { name: '독도', lat: 37.2423, lon: 131.8655, description: '경북 울릉군 독도, 동해 최동단 포인트', tideStation: 'DT_0013', gridX: 132, gridY: 89 },
];

export interface TideStation {
  code: string;
  name: string;
  region: string;
}

// Full KHOA tide forecast station catalog (국립해양조사원 조석예보 관측소)
export const TIDE_STATIONS: TideStation[] = [
  { code: 'DT_0001', name: '인천항', region: '인천' },
  { code: 'DT_0002', name: '평택항', region: '평택' },
  { code: 'DT_0003', name: '영광항', region: '영광' },
  { code: 'DT_0004', name: '제주항', region: '제주' },
  { code: 'DT_0005', name: '부산항', region: '부산' },
  { code: 'DT_0006', name: '묵호항', region: '강릉' },
  { code: 'DT_0007', name: '목포항', region: '목포' },
  { code: 'DT_0008', name: '안산항', region: '안산' },
  { code: 'DT_0010', name: '서귀포항', region: '제주' },
  { code: 'DT_0011', name: '후포항', region: '후포' },
  { code: 'DT_0012', name: '속초항', region: '속초' },
  { code: 'DT_0013', name: '울릉도', region: '울릉도' },
  { code: 'DT_0014', name: '통영항', region: '통영' },
  { code: 'DT_0016', name: '여수항', region: '여수' },
  { code: 'DT_0017', name: '대산항', region: '대산' },
  { code: 'DT_0018', name: '군산항', region: '군산' },
  { code: 'DT_0020', name: '울산항', region: '울산' },
  { code: 'DT_0021', name: '추자도', region: '제주' },
  { code: 'DT_0022', name: '성산포항', region: '제주' },
  { code: 'DT_0023', name: '모슬포항', region: '제주' },
  { code: 'DT_0024', name: '장항', region: '장항' },
  { code: 'DT_0025', name: '보령항', region: '보령' },
  { code: 'DT_0026', name: '고흥발포', region: '고흥' },
  { code: 'DT_0027', name: '완도항', region: '완도' },
  { code: 'DT_0028', name: '진도', region: '진도' },
  { code: 'DT_0029', name: '거제도', region: '거제' },
  { code: 'DT_0031', name: '거문도', region: '거문도' },
  { code: 'DT_0032', name: '강화대교', region: '인천' },
  { code: 'DT_0035', name: '흑산도', region: '흑산도' },
  { code: 'DT_0036', name: '대청도', region: '대청도' },
  { code: 'DT_0037', name: '어청도', region: '어청도' },
  { code: 'DT_0038', name: '굴업도', region: '굴업도' },
  { code: 'DT_0039', name: '왕돌초', region: '왕돌초' },
  { code: 'DT_0041', name: '복사초', region: '복사초' },
  { code: 'DT_0042', name: '교본초', region: '교본초' },
  { code: 'DT_0043', name: '영흥도', region: '인천' },
  { code: 'DT_0044', name: '영종대교', region: '인천' },
  { code: 'DT_0046', name: '쌍정초', region: '쌍정초' },
  { code: 'DT_0047', name: '도농탄', region: '도농탄' },
  { code: 'DT_0048', name: '속초등표', region: '속초' },
  { code: 'DT_0049', name: '광양항', region: '광양' },
  { code: 'DT_0050', name: '태안', region: '태안' },
  { code: 'DT_0063', name: '가덕도', region: '부산/경남' },
];

// Nationwide fishing sub-points mapped to their nearest KHOA tide station.
// stationId is the official KHOA code that the live API and harmonic fallback both use.
export interface FishingPoint {
  name: string;
  region: string;
  stationName: string;
  stationId: string;
  lat: number;
  lon: number;
}

export const FISHING_POINTS: FishingPoint[] = [
  // 부산 / 경남 권역 — 가덕도 세부 포인트들 (가덕도 관측소 DT_0063 사용)
  { name: '가덕도', region: '부산/경남', stationName: '가덕도', stationId: 'DT_0063', lat: 35.038, lon: 128.815 },
  { name: '천성항', region: '부산/경남', stationName: '가덕도', stationId: 'DT_0063', lat: 35.025, lon: 128.805 },
  { name: '대항항', region: '부산/경남', stationName: '가덕도', stationId: 'DT_0063', lat: 35.015, lon: 128.812 },
  { name: '새바지', region: '부산/경남', stationName: '가덕도', stationId: 'DT_0063', lat: 35.030, lon: 128.820 },
  { name: '부산항', region: '부산/경남', stationName: '부산항', stationId: 'DT_0005', lat: 35.102, lon: 129.039 },
  { name: '해운대', region: '부산/경남', stationName: '부산항', stationId: 'DT_0005', lat: 35.158, lon: 129.160 },
  { name: '영도', region: '부산/경남', stationName: '부산항', stationId: 'DT_0005', lat: 35.072, lon: 129.070 },
  { name: '다대포', region: '부산/경남', stationName: '부산항', stationId: 'DT_0005', lat: 35.050, lon: 129.004 },
  { name: '송정', region: '부산/경남', stationName: '부산항', stationId: 'DT_0005', lat: 35.155, lon: 129.123 },
  { name: '기장', region: '부산/경남', stationName: '부산항', stationId: 'DT_0005', lat: 35.240, lon: 129.220 },
  { name: '정관', region: '부산/경남', stationName: '부산항', stationId: 'DT_0005', lat: 35.095, lon: 128.960 },
  // 거제 권역 (거제도 관측소 DT_0029)
  { name: '거제도', region: '부산/경남', stationName: '거제도', stationId: 'DT_0029', lat: 34.880, lon: 128.620 },
  { name: '장승포', region: '부산/경남', stationName: '거제도', stationId: 'DT_0029', lat: 34.892, lon: 128.675 },
  { name: '옥포', region: '부산/경남', stationName: '거제도', stationId: 'DT_0029', lat: 34.902, lon: 128.748 },
  { name: '고현', region: '부산/경남', stationName: '거제도', stationId: 'DT_0029', lat: 34.884, lon: 128.825 },
  { name: '학동', region: '부산/경남', stationName: '거제도', stationId: 'DT_0029', lat: 34.826, lon: 128.712 },
  { name: '홍포', region: '부산/경남', stationName: '거제도', stationId: 'DT_0029', lat: 34.768, lon: 128.660 },
  { name: '외간문', region: '부산/경남', stationName: '통영항', stationId: 'DT_0014', lat: 34.765, lon: 128.550 },
  // 통영 권역 (통영항 관측소 DT_0014)
  { name: '통영', region: '부산/경남', stationName: '통영항', stationId: 'DT_0014', lat: 34.845, lon: 128.435 },
  { name: '욕지', region: '부산/경남', stationName: '통영항', stationId: 'DT_0014', lat: 34.762, lon: 128.255 },
  { name: '한산도', region: '부산/경남', stationName: '통영항', stationId: 'DT_0014', lat: 34.828, lon: 128.510 },
  { name: '사량도', region: '부산/경남', stationName: '통영항', stationId: 'DT_0014', lat: 34.732, lon: 128.382 },
  { name: '연화도', region: '부산/경남', stationName: '통영항', stationId: 'DT_0014', lat: 34.878, lon: 128.358 },
  { name: '미조', region: '부산/경남', stationName: '통영항', stationId: 'DT_0014', lat: 34.716, lon: 128.272 },
  // 충청 / 태안 권역 (태안 관측소 DT_0050)
  { name: '태안', region: '충청', stationName: '태안', stationId: 'DT_0050', lat: 36.756, lon: 126.298 },
  { name: '안흥', region: '충청', stationName: '태안', stationId: 'DT_0050', lat: 36.650, lon: 126.130 },
  { name: '근청', region: '충청', stationName: '태안', stationId: 'DT_0050', lat: 36.702, lon: 126.198 },
  { name: '천수만', region: '충청', stationName: '대산항', stationId: 'DT_0017', lat: 36.780, lon: 126.350 },
  { name: '원산도', region: '충청', stationName: '태안', stationId: 'DT_0050', lat: 36.730, lon: 126.170 },
  { name: '몽산포', region: '충청', stationName: '태안', stationId: 'DT_0050', lat: 36.680, lon: 126.220 },
  // 제주 권역
  { name: '제주', region: '제주', stationName: '제주항', stationId: 'DT_0004', lat: 33.515, lon: 126.529 },
  { name: '한림', region: '제주', stationName: '모슬포항', stationId: 'DT_0023', lat: 33.390, lon: 126.240 },
  { name: '애월', region: '제주', stationName: '제주항', stationId: 'DT_0004', lat: 33.466, lon: 126.325 },
  { name: '서귀포', region: '제주', stationName: '서귀포항', stationId: 'DT_0010', lat: 33.246, lon: 126.565 },
  { name: '모슬포', region: '제주', stationName: '모슬포항', stationId: 'DT_0023', lat: 33.230, lon: 126.260 },
  { name: '성산포', region: '제주', stationName: '성산포항', stationId: 'DT_0022', lat: 33.460, lon: 126.940 },
  { name: '추자도', region: '제주', stationName: '추자도', stationId: 'DT_0021', lat: 33.950, lon: 126.350 },
  { name: '한경', region: '제주', stationName: '모슬포항', stationId: 'DT_0023', lat: 33.350, lon: 126.150 },
  // 강릉 / 동해 권역 (묵호항 관측소 DT_0006)
  { name: '강릉', region: '강원', stationName: '묵호항', stationId: 'DT_0006', lat: 37.752, lon: 128.876 },
  { name: '묵호', region: '강원', stationName: '묵호항', stationId: 'DT_0006', lat: 37.788, lon: 128.858 },
  { name: '주문진', region: '강원', stationName: '묵호항', stationId: 'DT_0006', lat: 37.895, lon: 128.827 },
  { name: '연곡', region: '강원', stationName: '묵호항', stationId: 'DT_0006', lat: 37.816, lon: 128.890 },
  { name: '정동진', region: '강원', stationName: '묵호항', stationId: 'DT_0006', lat: 37.790, lon: 128.893 },
  { name: '사천진', region: '강원', stationName: '묵호항', stationId: 'DT_0006', lat: 37.860, lon: 128.835 },
  // 인천 / 경기 서해 권역
  { name: '인천', region: '인천/경기', stationName: '인천항', stationId: 'DT_0001', lat: 37.456, lon: 126.705 },
  { name: '영종도', region: '인천/경기', stationName: '영종대교', stationId: 'DT_0044', lat: 37.540, lon: 126.480 },
  { name: '강화', region: '인천/경기', stationName: '강화대교', stationId: 'DT_0032', lat: 37.710, lon: 126.480 },
  { name: '대부도', region: '인천/경기', stationName: '안산항', stationId: 'DT_0008', lat: 37.250, lon: 126.560 },
  { name: '제부도', region: '인천/경기', stationName: '안산항', stationId: 'DT_0008', lat: 37.190, lon: 126.830 },
  { name: '포승', region: '인천/경기', stationName: '평택항', stationId: 'DT_0002', lat: 36.980, lon: 126.950 },
  // 완도 / 전남 권역
  { name: '완도', region: '전남', stationName: '완도항', stationId: 'DT_0027', lat: 34.311, lon: 126.755 },
  { name: '청산도', region: '전남', stationName: '완도항', stationId: 'DT_0027', lat: 34.200, lon: 126.830 },
  { name: '소안도', region: '전남', stationName: '완도항', stationId: 'DT_0027', lat: 34.350, lon: 126.890 },
  { name: '금일', region: '전남', stationName: '완도항', stationId: 'DT_0027', lat: 34.390, lon: 126.960 },
  { name: '고금', region: '전남', stationName: '완도항', stationId: 'DT_0027', lat: 34.420, lon: 126.730 },
  { name: '신지', region: '전남', stationName: '완도항', stationId: 'DT_0027', lat: 34.270, lon: 126.720 },
  { name: '조약도', region: '전남', stationName: '완도항', stationId: 'DT_0027', lat: 34.120, lon: 126.910 },
  { name: '마량', region: '전남', stationName: '완도항', stationId: 'DT_0027', lat: 34.260, lon: 126.990 },
  // 여수 권역
  { name: '여수', region: '전남', stationName: '여수항', stationId: 'DT_0016', lat: 34.760, lon: 127.662 },
  { name: '돌산도', region: '전남', stationName: '여수항', stationId: 'DT_0016', lat: 34.690, lon: 127.740 },
  { name: '오동도', region: '전남', stationName: '여수항', stationId: 'DT_0016', lat: 34.747, lon: 127.748 },
  { name: '화태', region: '전남', stationName: '여수항', stationId: 'DT_0016', lat: 34.620, lon: 127.600 },
  { name: '적금', region: '전남', stationName: '여수항', stationId: 'DT_0016', lat: 34.580, lon: 127.690 },
  { name: '소두', region: '전남', stationName: '여수항', stationId: 'DT_0016', lat: 34.640, lon: 127.720 },
  // 속초 / 동해북부 권역
  { name: '속초', region: '강원', stationName: '속초항', stationId: 'DT_0012', lat: 38.208, lon: 128.591 },
  { name: '양양', region: '강원', stationName: '속초항', stationId: 'DT_0012', lat: 38.075, lon: 128.618 },
  { name: '낙산', region: '강원', stationName: '속초항', stationId: 'DT_0012', lat: 38.090, lon: 128.630 },
  // 기타 남해안 / 서해안
  { name: '목포', region: '전남', stationName: '목포항', stationId: 'DT_0007', lat: 34.780, lon: 126.380 },
  { name: '고흥', region: '전남', stationName: '고흥발포', stationId: 'DT_0026', lat: 34.580, lon: 127.280 },
  { name: '광양', region: '전남', stationName: '광양항', stationId: 'DT_0049', lat: 34.940, lon: 127.710 },
  { name: '보령', region: '충청', stationName: '보령항', stationId: 'DT_0025', lat: 36.350, lon: 126.540 },
  { name: '군산', region: '충청', stationName: '군산항', stationId: 'DT_0018', lat: 35.970, lon: 126.710 },
  { name: '울산', region: '경남', stationName: '울산항', stationId: 'DT_0020', lat: 35.500, lon: 129.410 },
  { name: '진도', region: '전남', stationName: '진도', stationId: 'DT_0028', lat: 34.480, lon: 126.260 },
  { name: '흑산도', region: '전남', stationName: '흑산도', stationId: 'DT_0035', lat: 34.690, lon: 125.430 },
  { name: '거문도', region: '전남', stationName: '거문도', stationId: 'DT_0031', lat: 34.030, lon: 127.320 },
  { name: '가거도', region: '전남', stationName: '흑산도', stationId: 'DT_0035', lat: 34.380, lon: 125.250 },
  { name: '비진도', region: '경남', stationName: '여수항', stationId: 'DT_0016', lat: 34.690, lon: 127.900 },
  { name: '외대병', region: '전남', stationName: '완도항', stationId: 'DT_0027', lat: 34.050, lon: 126.890 },
  // 독도 권역 (울릉도 관측소 DT_0013 — 독도에서 가장 가까운 KHOA 조석 관측소)
  { name: '독도', region: '경북', stationName: '울릉도', stationId: 'DT_0013', lat: 37.242, lon: 131.866 },
];

export function getRegionByName(name: string): Region | undefined {
  return REGIONS.find((r) => r.name === name);
}

export function getStationByCode(code: string): TideStation | undefined {
  return TIDE_STATIONS.find((s) => s.code === code);
}

export function getFishingPointByName(name: string): FishingPoint | undefined {
  return FISHING_POINTS.find((p) => p.name === name);
}

// Unified search result type — covers both KHOA stations and fishing sub-points.
export interface SearchResult {
  displayName: string;
  tideStation: string;
  stationName: string;
  region: string;
  description: string;
  isPoint: boolean;
  lat?: number;
  lon?: number;
}

// Search across both KHOA stations and fishing sub-points.
// Returns merged results sorted by relevance (name match > region match).
export function searchAll(query: string): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const results: SearchResult[] = [];
  const seenDisplayNames = new Set<string>();

  for (const s of TIDE_STATIONS) {
    const nameMatch = s.name.toLowerCase().includes(q);
    const regionMatch = s.region.toLowerCase().includes(q);
    if (nameMatch || regionMatch) {
      results.push({
        displayName: s.name,
        tideStation: s.code,
        stationName: s.name,
        region: s.region,
        description: `${s.region} · ${s.code}`,
        isPoint: false,
      });
      seenDisplayNames.add(s.name);
    }
  }

  for (const p of FISHING_POINTS) {
    const nameMatch = p.name.toLowerCase().includes(q);
    const regionMatch = p.region.toLowerCase().includes(q);
    const stationMatch = p.stationName.toLowerCase().includes(q);
    if (nameMatch || regionMatch || stationMatch) {
      if (seenDisplayNames.has(p.name)) continue;
      seenDisplayNames.add(p.name);
      results.push({
        displayName: p.name,
        tideStation: p.stationId,
        stationName: p.stationName,
        region: p.region,
        description: nameMatch
          ? `${p.region} → ${p.stationName} (${p.stationId})`
          : `${p.region} · ${p.stationName} (${p.stationId})`,
        isPoint: true,
        lat: p.lat,
        lon: p.lon,
      });
    }
  }

  // Sort: exact name starts-with > name includes > region/desc includes
  results.sort((a, b) => {
    const aStart = a.displayName.toLowerCase().startsWith(q) ? 0 : 1;
    const bStart = b.displayName.toLowerCase().startsWith(q) ? 0 : 1;
    if (aStart !== bStart) return aStart - bStart;
    return a.displayName.localeCompare(b.displayName);
  });

  return results;
}
