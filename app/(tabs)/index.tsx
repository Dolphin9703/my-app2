import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Platform, TextInput } from 'react-native';
import { Waves, Wind, Droplets, Thermometer, Cloud, TrendingUp, MapPin, Sunrise, Sunset, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Flame, Navigation, AlertTriangle, Search, Info, X, Calendar, Clock, RotateCcw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { getRegionByName, getStationByCode, REGIONS, searchAll, type SearchResult } from '@/lib/regions';
import { getTidesForStation, getTideDescription, getRecommendedFishingTime, fetchRealTides, getMoonPhase, getTideStrength } from '@/lib/tide';
import { getWeatherForRegion, getWeatherAdvice, getFishingScore, fetchRealWeather, convertWindSpeed } from '@/lib/weather';
import { getSunTimes } from '@/lib/sunrise';
import { getCachedData, setCachedData } from '@/lib/dataCache';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import AdBanner from '@/components/AdBanner';
import NotificationBell from '@/components/NotificationBell';
import type { TideInfo, WeatherInfo, SunTimes } from '@/lib/types';

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

export default function HomeScreen() {
  const { user } = useAuth();
  const [regionName, setRegionName] = useState('태안');
  const [tides, setTides] = useState<TideInfo[]>([]);
  const [weather, setWeather] = useState<WeatherInfo | null>(null);
  const [sunTimes, setSunTimes] = useState<SunTimes | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [regionDropdown, setRegionDropdown] = useState(false);
  const [stationQuery, setStationQuery] = useState('');
  const [activeTideStation, setActiveTideStation] = useState<string | null>(null);
  const [activeDisplayName, setActiveDisplayName] = useState<string | null>(null);
  const [activeStationName, setActiveStationName] = useState<string | null>(null);
  const [windUnit, setWindUnit] = useState('m/s');
  const [usingRealTide, setUsingRealTide] = useState(false);
  const [usingRealWeather, setUsingRealWeather] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const fetchTokenRef = useRef(0);
  const [showScoreGuide, setShowScoreGuide] = useState(false);
  const [showWeatherGuide, setShowWeatherGuide] = useState(false);
  const [showTideGuide, setShowTideGuide] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const loadDataForDate = useCallback(async (date: Date, region: string, stationOverride: string | null, isInitial?: boolean) => {
    const token = ++fetchTokenRef.current;
    if (!isInitial) setDataLoading(true);
    const regionInfo = getRegionByName(region) || REGIONS[0];
    const stationCode = stationOverride || regionInfo.tideStation;

    const isToday = isSameDay(date, new Date());

    // Serve from day-level cache for non-today dates only.
    // Today's real-time data must always be re-fetched fresh.
    if (!isToday) {
      const cached = getCachedData(date, region, stationCode);
      if (cached) {
        setTides(cached.tides);
        setUsingRealTide(cached.usingRealTide);
        setWeather(cached.weather);
        setUsingRealWeather(cached.usingRealWeather);
        setSunTimes(cached.sunTimes);
        setDataLoading(false);
        return;
      }
    }

    // Reset stale state so the badge doesn't briefly show the previous date's
    // "예측 조석" while today's fetch is in flight.
    if (isToday) {
      setUsingRealTide(false);
    }

    // For today, retry the real-time tide fetch up to 2 times — the edge function
    // may be cold on first call, and we want to avoid falling back to forecast mode.
    let realTides: TideInfo[] | null = null;
    if (isToday) {
      for (let attempt = 0; attempt < 2 && !realTides; attempt++) {
        realTides = await fetchRealTides({ ...regionInfo, tideStation: stationCode }, date);
        if (token !== fetchTokenRef.current) { setDataLoading(false); return; }
      }
    } else {
      realTides = await fetchRealTides({ ...regionInfo, tideStation: stationCode }, date);
      if (token !== fetchTokenRef.current) { setDataLoading(false); return; }
    }

    const hasRealTides = !!(realTides && realTides.length > 0);
    const resolvedTides = hasRealTides ? realTides! : getTidesForStation(stationCode, date);
    setUsingRealTide(hasRealTides);
    setTides(resolvedTides);

    const realWeather = await fetchRealWeather(regionInfo, date);
    if (token !== fetchTokenRef.current) { setDataLoading(false); return; }
    const hasRealWeather = !!realWeather;
    const resolvedWeather = hasRealWeather ? realWeather : getWeatherForRegion(regionInfo.lat, regionInfo.lon, date);
    setUsingRealWeather(hasRealWeather);
    setWeather(resolvedWeather);

    const sun = getSunTimes(regionInfo.lat, regionInfo.lon, date);
    setSunTimes(sun);

    // Only cache non-today data — today's real-time data must always be re-fetched
    // so the "실시간 조석" badge reflects the current state, not a stale snapshot.
    if (!isToday) {
      setCachedData(date, region, stationCode, {
        tides: resolvedTides,
        usingRealTide: hasRealTides,
        weather: resolvedWeather,
        usingRealWeather: hasRealWeather,
        sunTimes: sun,
      });
    }

    setDataLoading(false);
  }, []);

  const loadData = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('selected_region, wind_unit').limit(1).maybeSingle();
    const region = data?.selected_region || '태안';
    setRegionName(region);
    if (data?.wind_unit) setWindUnit(data.wind_unit);

    const now = new Date();
    setSelectedDate(now);
    await loadDataForDate(now, region, null, true);
    setLoading(false);
    setRefreshing(false);
  }, [loadDataForDate]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const resetToToday = useCallback(() => {
    const now = new Date();
    setSelectedDate(now);
    setUsingRealTide(false);
    setUsingRealWeather(false);
    setDataLoading(true);
    loadDataForDate(now, regionName, activeTideStation);
  }, [regionName, activeTideStation, loadDataForDate]);

  const changeDate = useCallback((delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d);
    loadDataForDate(d, regionName, activeTideStation);
  }, [selectedDate, regionName, activeTideStation, loadDataForDate]);

  const pickDate = useCallback((day: number) => {
    const d = new Date(calendarMonth);
    d.setDate(day);
    setSelectedDate(d);
    setShowDatePicker(false);
    loadDataForDate(d, regionName, activeTideStation);
  }, [calendarMonth, regionName, activeTideStation, loadDataForDate]);

  const selectRegion = async (name: string) => {
    setRegionName(name);
    setActiveTideStation(null);
    setActiveDisplayName(null);
    setActiveStationName(null);
    setRegionDropdown(false);
    setStationQuery('');
    const d = new Date();
    setSelectedDate(d);
    await loadDataForDate(d, name, null);

    const { data: existing } = await supabase.from('app_settings').select('id').limit(1).maybeSingle();
    if (existing?.id) {
      await supabase.from('app_settings').update({ selected_region: name, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('app_settings').insert({ selected_region: name });
    }
  };

  // Unified handler for any search result — a fishing sub-point or a KHOA station.
  // Always resets state and re-fetches live tide data for the resolved station code.
  const selectSearchResult = async (result: SearchResult) => {
    setRegionDropdown(false);
    setStationQuery('');
    setActiveTideStation(result.tideStation);
    setActiveDisplayName(result.displayName);
    setActiveStationName(result.stationName);
    const d = selectedDate;
    await loadDataForDate(d, regionName, result.tideStation);
  };

  const searchResults = useMemo(() => searchAll(stationQuery), [stationQuery]);

  // Header shows the selected point name (or region name if no custom point selected)
  const headerLocationText = activeDisplayName || regionName;

  // Subtitle always shows the resolved station name and code
  const subtitleText = (() => {
    const stationCode = activeTideStation;
    if (stationCode) {
      const st = getStationByCode(stationCode);
      const sName = st?.name || activeStationName || stationCode;
      return `기준 관측소: ${sName} (${stationCode})`;
    }
    const ri = getRegionByName(regionName);
    if (ri) {
      const st = getStationByCode(ri.tideStation);
      return st ? `기준 관측소: ${st.name} (${st.code})` : ri.description;
    }
    return null;
  })();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.ocean[500]} />
        <Text style={styles.loadingText}>물때 정보를 불러오는 중...</Text>
      </View>
    );
  }

  const regionInfo = getRegionByName(regionName);
  const tideDesc = getTideDescription(tides, selectedDate);
  const advice = weather ? getWeatherAdvice(weather) : '';
  const score = weather ? getFishingScore(weather) : 0;
  const recommendedTime = getRecommendedFishingTime(tides);
  const moonPhase = getMoonPhase(selectedDate);
  const tideStrength = getTideStrength(selectedDate);
  const isToday = isSameDay(selectedDate, new Date());
  const selectedDateStr = selectedDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
  const windConverted = weather ? convertWindSpeed(weather.windSpeed, windUnit) : null;

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.ocean[500]} />}>
        <LinearGradient colors={[Colors.ocean[600], Colors.primary[700], Colors.primary[900]]} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.locationRow} onPress={() => setRegionDropdown(!regionDropdown)} activeOpacity={0.8}>
              <MapPin size={22} color={Colors.neutral[0]} strokeWidth={2} />
              <Text style={styles.headerLocation}>{headerLocationText}</Text>
              {regionDropdown
                ? <ChevronUp size={20} color={Colors.neutral[0]} strokeWidth={2.5} />
                : <ChevronDown size={20} color={Colors.neutral[0]} strokeWidth={2.5} />}
            </TouchableOpacity>
            <View style={styles.headerRight}>
              <NotificationBell userId={user?.id ?? null} />
            </View>
          </View>
          <Text style={styles.headerTitle}>오늘의 낚시 정보</Text>
          {subtitleText && <Text style={styles.headerSubtitle}>{subtitleText}</Text>}
          <Text style={styles.headerDate}>{todayStr}</Text>

          {regionDropdown && (
            <View style={styles.dropdown}>
              <View style={styles.searchContainer}>
                <Search size={16} color={Colors.neutral[400]} strokeWidth={2} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="포인트/관측소 검색"
                  placeholderTextColor={Colors.neutral[400]}
                  value={stationQuery}
                  onChangeText={setStationQuery}
                  autoCorrect={false}
                />
              </View>
              {stationQuery.trim() === '' ? (
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                  <Text style={styles.sectionLabel}>주요 지역</Text>
                  {REGIONS.map((r) => (
                    <TouchableOpacity
                      key={r.name}
                      style={[styles.dropdownItem, regionName === r.name && !activeTideStation && { backgroundColor: Colors.ocean[50] }]}
                      onPress={() => selectRegion(r.name)}>
                      <MapPin size={16} color={regionName === r.name && !activeTideStation ? Colors.ocean[600] : Colors.neutral[500]} strokeWidth={2} />
                      <View style={styles.dropdownItemTextContainer}>
                        <Text style={[styles.dropdownItemText, regionName === r.name && !activeTideStation && { color: Colors.ocean[700] }]}>{r.name}</Text>
                        <Text style={styles.dropdownItemDesc}>{r.description}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <ScrollView style={styles.dropdownScroll} nestedScrollEnabled={true}>
                  <Text style={styles.sectionLabel}>검색 결과 ({searchResults.length})</Text>
                  {searchResults.map((r) => (
                    <TouchableOpacity
                      key={`${r.displayName}-${r.tideStation}`}
                      style={[styles.dropdownItem, activeTideStation === r.tideStation && activeDisplayName === r.displayName && { backgroundColor: Colors.ocean[50] }]}
                      onPress={() => selectSearchResult(r)}>
                      {r.isPoint
                        ? <MapPin size={16} color={activeTideStation === r.tideStation ? Colors.ocean[600] : Colors.neutral[500]} strokeWidth={2} />
                        : <Waves size={16} color={activeTideStation === r.tideStation ? Colors.ocean[600] : Colors.neutral[500]} strokeWidth={2} />}
                      <View style={styles.dropdownItemTextContainer}>
                        <Text style={[styles.dropdownItemText, activeTideStation === r.tideStation && activeDisplayName === r.displayName && { color: Colors.ocean[700] }]}>{r.displayName}</Text>
                        <Text style={styles.dropdownItemDesc}>{r.description}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                  {searchResults.length === 0 && (
                    <Text style={styles.noResultText}>검색 결과가 없습니다</Text>
                  )}
                </ScrollView>
              )}
            </View>
          )}
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.dateBar}>
            <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(-1)} activeOpacity={0.6} disabled={dataLoading}>
              <ChevronLeft size={22} color={dataLoading ? Colors.neutral[300] : Colors.ocean[600]} strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateCenter} onPress={() => { setCalendarMonth(new Date(selectedDate)); setShowDatePicker(true); }} activeOpacity={0.7}>
              <Text style={styles.dateText}>{isToday ? '오늘' : selectedDateStr}</Text>
              <View style={styles.dateMetaRow}>
                <View style={styles.moonBadge}>
                  <Text style={styles.moonEmoji}>{moonPhase.emoji}</Text>
                  <Text style={styles.moonText}>{moonPhase.name} · {moonPhase.illumination}%</Text>
                </View>
                <View style={[styles.tideStrengthBadge, tideStrength.stage === '사리' ? styles.tideStrengthSpring : tideStrength.stage === '조금' ? styles.tideStrengthNeap : styles.tideStrengthMid]}>
                  {tideStrength.stage === '사리'
                    ? <Flame size={13} color={Colors.warning[600]} strokeWidth={2.5} />
                    : tideStrength.stage === '조금'
                      ? <Droplets size={13} color={Colors.ocean[600]} strokeWidth={2.5} />
                      : <TrendingUp size={13} color={Colors.neutral[600]} strokeWidth={2.5} />}
                  <Text style={styles.tideStrengthText}>{tideStrength.stage} · {tideStrength.desc}</Text>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={styles.dateArrow} onPress={() => changeDate(1)} activeOpacity={0.6} disabled={dataLoading}>
              <ChevronRight size={22} color={dataLoading ? Colors.neutral[300] : Colors.ocean[600]} strokeWidth={2.5} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.todayBtn, isToday && styles.todayBtnActive]}
              onPress={resetToToday}
              activeOpacity={0.6}
              disabled={dataLoading || isToday}>
              <RotateCcw size={18} color={isToday ? Colors.neutral[300] : Colors.ocean[600]} strokeWidth={2.5} />
              <Text style={[styles.todayBtnText, isToday && { color: Colors.neutral[300] }]}>오늘</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleRow}>
                <Waves size={22} color={Colors.ocean[600]} strokeWidth={2} />
                <Text style={styles.cardTitle}>{isToday ? '오늘의 물때' : selectedDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) + ' 물때'}</Text>
                <TouchableOpacity
                  style={styles.infoBadge}
                  onPress={() => setShowTideGuide(true)}
                  activeOpacity={0.6}>
                  <Info size={14} color={Colors.primary[600]} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
              <View style={styles.tideBadge}><Text style={styles.tideBadgeText}>{tideDesc}</Text></View>
            </View>
            <View style={styles.dataSourceRow}>
              {dataLoading ? (
                <View style={styles.dataSourceLoading}>
                  <ActivityIndicator size="small" color={Colors.ocean[500]} />
                </View>
              ) : (
                <View style={[styles.dataSourceBadge, usingRealTide && isToday ? styles.dataSourceReal : styles.dataSourceMock]}>
                  <Text style={styles.dataSourceText}>{usingRealTide && isToday ? '실시간 조석' : '예측 조석'}</Text>
                </View>
              )}
            </View>
            {recommendedTime && (
              <View style={styles.recommendBadge}>
                <Clock size={16} color={Colors.accent[500]} strokeWidth={2} />
                <Text style={styles.recommendText}>추천 낚시 시간</Text>
                <Text style={styles.recommendTime}>{recommendedTime.start} ~ {recommendedTime.end}</Text>
              </View>
            )}
            <View style={styles.tideList}>
              {tides.map((tide, idx) => (
                <View key={idx} style={styles.tideItem}>
                  <View style={[styles.tideIcon, { backgroundColor: tide.type === '만조' ? Colors.ocean[100] : Colors.warning[100] }]}>
                    <Waves size={20} color={tide.type === '만조' ? Colors.ocean[600] : Colors.warning[600]} strokeWidth={2} />
                  </View>
                  <View style={styles.tideInfo}>
                    <Text style={styles.tideType}>{tide.type}</Text>
                    <Text style={styles.tideTime}>{tide.time}</Text>
                  </View>
                  <Text style={styles.tideHeight}>{tide.height}cm</Text>
                </View>
              ))}
            </View>
          </View>

          {weather && windConverted && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <Cloud size={22} color={Colors.ocean[600]} strokeWidth={2} />
                  <Text style={styles.cardTitle}>바다 날씨</Text>
                  <TouchableOpacity
                    style={styles.infoBadge}
                    onPress={() => setShowWeatherGuide(true)}
                    activeOpacity={0.6}>
                    <Info size={14} color={Colors.primary[600]} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.updatedText}>업데이트 {weather.updatedAt}</Text>
              </View>
              <View style={styles.dataSourceRow}>
                {dataLoading ? (
                  <View style={styles.dataSourceLoading}>
                    <ActivityIndicator size="small" color={Colors.ocean[500]} />
                  </View>
                ) : (
                  <View style={[styles.dataSourceBadge, usingRealWeather && isToday ? styles.dataSourceReal : styles.dataSourceMock]}>
                    <Text style={styles.dataSourceText}>{usingRealWeather && isToday ? '실시간 날씨' : '예측 날씨'}</Text>
                  </View>
                )}
              </View>
              <View style={styles.weatherGrid}>
                <View style={styles.weatherItem}>
                  <View style={styles.windIconContainer}>
                    <Navigation size={24} color={Colors.primary[600]} strokeWidth={2} style={{ transform: [{ rotate: `${weather.windDirAngle}deg` }] }} />
                  </View>
                  <Text style={styles.weatherLabel}>{weather.windDirKr}풍</Text>
                  <Text style={styles.weatherValue}>{windConverted.primary} {windConverted.unit}</Text>
                  <Text style={styles.weatherSubValue}>({windConverted.secondary} {windConverted.secondaryUnit})</Text>
                </View>
                <View style={styles.weatherItem}>
                  <Waves size={24} color={Colors.ocean[600]} strokeWidth={2} />
                  <Text style={styles.weatherLabel}>파고</Text>
                  <Text style={styles.weatherValue}>{weather.waveHeight}m</Text>
                </View>
                <View style={styles.weatherItem}>
                  <Droplets size={24} color={Colors.primary[500]} strokeWidth={2} />
                  <Text style={styles.weatherLabel}>수온</Text>
                  <Text style={styles.weatherValue}>{weather.waterTemp}°C</Text>
                </View>
                <View style={styles.weatherItem}>
                  <Thermometer size={24} color={Colors.accent[500]} strokeWidth={2} />
                  <Text style={styles.weatherLabel}>기온</Text>
                  <Text style={styles.weatherValue}>{weather.airTemp}°C</Text>
                </View>
              </View>
              <View style={styles.weatherSkyRow}>
                <Text style={styles.weatherSkyLabel}>하늘:</Text>
                <Text style={styles.weatherSkyValue}>{weather.sky}</Text>
              </View>
            </View>
          )}

          {weather && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleRow}>
                  <TrendingUp size={22} color={Colors.success[600]} strokeWidth={2} />
                  <Text style={styles.cardTitle}>낚시 지수</Text>
                  <TouchableOpacity
                    style={styles.infoBadge}
                    onPress={() => setShowScoreGuide(true)}
                    activeOpacity={0.6}>
                    <Info size={14} color={Colors.primary[600]} strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.scoreContainer}>
                <View style={[styles.scoreCircle, { backgroundColor: score >= 60 ? Colors.success[100] : score >= 40 ? Colors.warning[100] : Colors.error[100], borderColor: score >= 60 ? Colors.success[500] : score >= 40 ? Colors.warning[500] : Colors.error[500] }]}>
                  <Text style={[styles.scoreValue, { color: score >= 60 ? Colors.success[600] : score >= 40 ? Colors.warning[600] : Colors.error[600] }]}>{score}</Text>
                  <Text style={[styles.scoreUnit, { color: score >= 60 ? Colors.success[600] : score >= 40 ? Colors.warning[600] : Colors.error[600] }]}>점</Text>
                </View>
                <View style={styles.scoreInfo}>
                  <Text style={styles.scoreLevel}>{score >= 80 ? '최상' : score >= 60 ? '양호' : score >= 40 ? '보통' : '주의'}</Text>
                  <Text style={styles.scoreAdvice}>{advice}</Text>
                </View>
              </View>
            </View>
          )}

          {sunTimes && (
            <View style={styles.sunCard}>
              <View style={styles.sunItem}>
                <Sunrise size={20} color={Colors.accent[500]} strokeWidth={2} />
                <Text style={styles.sunLabel}>일출</Text>
                <Text style={styles.sunValue}>{sunTimes.sunrise}</Text>
              </View>
              <View style={styles.sunDivider} />
              <View style={styles.sunItem}>
                <Sunset size={20} color={Colors.primary[600]} strokeWidth={2} />
                <Text style={styles.sunLabel}>일몰</Text>
                <Text style={styles.sunValue}>{sunTimes.sunset}</Text>
              </View>
            </View>
          )}

          <View style={styles.disclaimerCard}>
            <AlertTriangle size={16} color={Colors.error[500]} strokeWidth={2} />
            <Text style={styles.disclaimerText}>
              ⚠️ 본 정보는 참고용이며 출조 전 반드시 현장 기상을 확인하세요. (안전사고 발생 시 개발자는 법적 책임을 지지 않습니다)
            </Text>
          </View>
        </View>
      </ScrollView>
      <AdBanner />

      {showDatePicker && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setShowDatePicker(false)} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>날짜 선택</Text>
              <TouchableOpacity onPress={() => setShowDatePicker(false)} activeOpacity={0.6}>
                <X size={20} color={Colors.neutral[400]} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <View style={styles.calContainer}>
              <View style={styles.calNavRow}>
                <TouchableOpacity onPress={() => { const m = new Date(calendarMonth); m.setMonth(m.getMonth() - 1); setCalendarMonth(m); }} activeOpacity={0.6}>
                  <ChevronLeft size={24} color={Colors.ocean[600]} strokeWidth={2} />
                </TouchableOpacity>
                <Text style={styles.calMonthText}>{calendarMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}</Text>
                <TouchableOpacity onPress={() => { const m = new Date(calendarMonth); m.setMonth(m.getMonth() + 1); setCalendarMonth(m); }} activeOpacity={0.6}>
                  <ChevronRight size={24} color={Colors.ocean[600]} strokeWidth={2} />
                </TouchableOpacity>
              </View>
              <View style={styles.calWeekRow}>
                {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
                  <Text key={d} style={[styles.calWeekDay, d === '일' && { color: Colors.error[500] }, d === '토' && { color: Colors.ocean[500] }]}>{d}</Text>
                ))}
              </View>
              <View style={styles.calDayGrid}>
                {(() => {
                  const year = calendarMonth.getFullYear();
                  const month = calendarMonth.getMonth();
                  const firstDay = new Date(year, month, 1).getDay();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  const cells: (number | null)[] = [];
                  for (let i = 0; i < firstDay; i++) cells.push(null);
                  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
                  while (cells.length % 7 !== 0) cells.push(null);
                  return cells.map((day, idx) => {
                    if (day === null) return <View key={idx} style={styles.calDayCell} />;
                    const cellDate = new Date(year, month, day);
                    const isSelected = isSameDay(cellDate, selectedDate);
                    const isTodayCell = isSameDay(cellDate, new Date());
                    const weekday = idx % 7;
                    return (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.calDayCell,
                          isSelected && styles.calDaySelected,
                          isTodayCell && !isSelected && styles.calDayToday,
                        ]}
                        onPress={() => pickDate(day)}
                        activeOpacity={0.6}>
                        <Text style={[
                          styles.calDayText,
                          weekday === 0 && !isSelected && { color: Colors.error[500] },
                          weekday === 6 && !isSelected && { color: Colors.ocean[500] },
                          isSelected && styles.calDayTextSelected,
                        ]}>{day}</Text>
                      </TouchableOpacity>
                    );
                  });
                })()}
              </View>
              <TouchableOpacity
                style={styles.calTodayBtn}
                onPress={() => { const d = new Date(); setCalendarMonth(d); pickDate(d.getDate()); }}
                activeOpacity={0.6}>
                <Calendar size={16} color={Colors.ocean[600]} strokeWidth={2} />
                <Text style={styles.calTodayText}>오늘로 이동</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {showTideGuide && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setShowTideGuide(false)} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>물때 안내</Text>
              <TouchableOpacity onPress={() => setShowTideGuide(false)} activeOpacity={0.6}>
                <X size={20} color={Colors.neutral[400]} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetIntro}>
                물때는 달과 태양의 인력에 의해 바다 수위가 오르내리는 주기적 현상입니다. 낚시에서 조류 흐름은 어의 활성도와 직결되므로, 물때를 이해하는 것이 출조 성공의 핵심입니다.
              </Text>

              <View style={styles.sheetMetricCard}>
                <View style={[styles.sheetMetricIcon, { backgroundColor: Colors.ocean[100] }]}>
                  <Waves size={20} color={Colors.ocean[600]} strokeWidth={2} />
                </View>
                <View style={styles.sheetMetricBody}>
                  <Text style={styles.sheetMetricTitle}>만조 (고조)</Text>
                  <Text style={styles.sheetMetricDesc}>
                    수위가 가장 높아지는 시점입니다. 만조 전후로 조류 흐름이 빨라지며 어의 먹이 활동이 활발해집니다. 만조 직전 1~2시간과 직후 1시간이 낚시에 가장 유리한 시간대 중 하나입니다.
                  </Text>
                </View>
              </View>

              <View style={styles.sheetMetricCard}>
                <View style={[styles.sheetMetricIcon, { backgroundColor: Colors.warning[100] }]}>
                  <Waves size={20} color={Colors.warning[600]} strokeWidth={2} />
                </View>
                <View style={styles.sheetMetricBody}>
                  <Text style={styles.sheetMetricTitle}>간조 (저조)</Text>
                  <Text style={styles.sheetMetricDesc}>
                    수위가 가장 낮아지는 시점입니다. 간조 시 갯바위와 여가 드러나고 수심이 얕아져 어의 경계심이 높아집니다. 간조에서 만조로 전환되는 '밀물' 시작 시점이 입질이 좋습니다.
                  </Text>
                </View>
              </View>

              <View style={styles.sheetMetricCard}>
                <View style={[styles.sheetMetricIcon, { backgroundColor: Colors.warning[100] }]}>
                  <Flame size={20} color={Colors.warning[600]} strokeWidth={2} />
                </View>
                <View style={styles.sheetMetricBody}>
                  <Text style={styles.sheetMetricTitle}>사리 (Spring Tide)</Text>
                  <Text style={styles.sheetMetricDesc}>
                    보름(보름달)과 그믐(신월) 무렵, 달과 태양이 일직선으로 정렬해 조석력이 최대가 되는 시기입니다. 만조와 간조의 수위 차가 크고 조류 흐름이 강해 원투 낚시에 유리하지만, 갯바위에서는 넘파람 위험이 커집니다.
                  </Text>
                  <View style={styles.sheetMetricTags}>
                    <View style={[styles.sheetMetricTag, { backgroundColor: Colors.success[100] }]}><Text style={[styles.sheetMetricTagText, { color: Colors.success[600] }]}>조류 활발</Text></View>
                    <View style={[styles.sheetMetricTag, { backgroundColor: Colors.warning[100] }]}><Text style={[styles.sheetMetricTagText, { color: Colors.warning[600] }]}>넘파람 주의</Text></View>
                  </View>
                </View>
              </View>

              <View style={styles.sheetMetricCard}>
                <View style={[styles.sheetMetricIcon, { backgroundColor: Colors.ocean[100] }]}>
                  <Droplets size={20} color={Colors.ocean[600]} strokeWidth={2} />
                </View>
                <View style={styles.sheetMetricBody}>
                  <Text style={styles.sheetMetricTitle}>조금 (Neap Tide)</Text>
                  <Text style={styles.sheetMetricDesc}>
                    상현(상현달)과 하현(하현달) 무렵, 달과 태양이 직각으로 배치되어 조석력이 최소가 되는 시기입니다. 수위 차가 작고 조류 흐름이 약합니다. 수심이 얕은 곳이나 감성돔처럼 조류가 약한 것을 선호하는 어종에 유리합니다.
                  </Text>
                  <View style={styles.sheetMetricTags}>
                    <View style={[styles.sheetMetricTag, { backgroundColor: Colors.ocean[100] }]}><Text style={[styles.sheetMetricTagText, { color: Colors.ocean[600] }]}>조류 약함</Text></View>
                    <View style={[styles.sheetMetricTag, { backgroundColor: Colors.success[100] }]}><Text style={[styles.sheetMetricTagText, { color: Colors.success[600] }]}>안전 출조</Text></View>
                  </View>
                </View>
              </View>

              <View style={styles.sheetMetricCard}>
                <View style={[styles.sheetMetricIcon, { backgroundColor: Colors.neutral[100] }]}>
                  <TrendingUp size={20} color={Colors.neutral[600]} strokeWidth={2} />
                </View>
                <View style={styles.sheetMetricBody}>
                  <Text style={styles.sheetMetricTitle}>중물때</Text>
                  <Text style={styles.sheetMetricDesc}>
                    사리와 조금 사이의 보통 물때입니다. 조류 흐름이 극단적이지 않아 무난한 출조가 가능하며, 다양한 낚시 방식에 적합합니다.
                  </Text>
                </View>
              </View>

              <Text style={styles.sheetFactorTitle}>조류와 낚시 팁</Text>
              <View style={styles.sheetFactorRow}>
                <Waves size={16} color={Colors.ocean[600]} strokeWidth={2} />
                <Text style={styles.sheetFactorText}>밀물(간조→만조) 시작 시 입질이 가장 활발</Text>
              </View>
              <View style={styles.sheetFactorRow}>
                <Flame size={16} color={Colors.accent[500]} strokeWidth={2} />
                <Text style={styles.sheetFactorText}>사리물때는 조류가 강해 밑밥이 빨리 흩어짐 — 자주 보충</Text>
              </View>
              <View style={styles.sheetFactorRow}>
                <Droplets size={16} color={Colors.ocean[600]} strokeWidth={2} />
                <Text style={styles.sheetFactorText}>조금물때는 수심 얕은 곳 공략 효과적</Text>
              </View>
              <View style={styles.sheetFactorRow}>
                <Clock size={16} color={Colors.accent[500]} strokeWidth={2} />
                <Text style={styles.sheetFactorText}>추천 낚시 시간은 만조·간조 사이 가장 긴 간격 기준</Text>
              </View>

              <Text style={styles.sheetDisclaimer}>
                ※ 본 물때 정보는 참고용이며, 실제 출조 전 현장 조류 및 해상 상황을 반드시 확인하세요.
              </Text>
            </ScrollView>
          </View>
        </View>
      )}

      {showWeatherGuide && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setShowWeatherGuide(false)} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>바다 날씨 안내</Text>
              <TouchableOpacity onPress={() => setShowWeatherGuide(false)} activeOpacity={0.6}>
                <X size={20} color={Colors.neutral[400]} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetIntro}>
                바다 날씨는 기상청 해양 기상 데이터를 기반으로 낚시에 직접 영향을 미치는 요소들을 표시합니다. 각 항목의 의미와 출조 시 주의사항을 확인하세요.
              </Text>

              <View style={styles.sheetMetricCard}>
                <View style={[styles.sheetMetricIcon, { backgroundColor: Colors.primary[50] }]}>
                  <Wind size={20} color={Colors.primary[600]} strokeWidth={2} />
                </View>
                <View style={styles.sheetMetricBody}>
                  <Text style={styles.sheetMetricTitle}>풍속 · 풍향</Text>
                  <Text style={styles.sheetMetricDesc}>
                    바람의 세기와 방향입니다. 풍속 4m/s 이하면 양호, 8m/s 이상이면 갯바위 출조 위험. 풍향은 조류 흐름과 함께 고려해야 하며, 육지에서 바다로 부는 바람(해풍)은 파고를 높입니다.
                  </Text>
                  <View style={styles.sheetMetricTags}>
                    <View style={[styles.sheetMetricTag, { backgroundColor: Colors.success[100] }]}><Text style={[styles.sheetMetricTagText, { color: Colors.success[600] }]}>4m/s 이하 양호</Text></View>
                    <View style={[styles.sheetMetricTag, { backgroundColor: Colors.warning[100] }]}><Text style={[styles.sheetMetricTagText, { color: Colors.warning[600] }]}>8m/s 이상 주의</Text></View>
                    <View style={[styles.sheetMetricTag, { backgroundColor: Colors.error[100] }]}><Text style={[styles.sheetMetricTagText, { color: Colors.error[600] }]}>10m/s 이상 위험</Text></View>
                  </View>
                </View>
              </View>

              <View style={styles.sheetMetricCard}>
                <View style={[styles.sheetMetricIcon, { backgroundColor: Colors.ocean[100] }]}>
                  <Waves size={20} color={Colors.ocean[600]} strokeWidth={2} />
                </View>
                <View style={styles.sheetMetricBody}>
                  <Text style={styles.sheetMetricTitle}>파고</Text>
                  <Text style={styles.sheetMetricDesc}>
                    해상의 파도 높이입니다. 1.5m 이하면 안전, 2m 이상이면 출조를 권장하지 않습니다. 파고가 높으면 선상 낚시 시 멀미 유발하고 갯바위에서는 넘파람 위험이 큽니다.
                  </Text>
                  <View style={styles.sheetMetricTags}>
                    <View style={[styles.sheetMetricTag, { backgroundColor: Colors.success[100] }]}><Text style={[styles.sheetMetricTagText, { color: Colors.success[600] }]}>1.5m 이하 안전</Text></View>
                    <View style={[styles.sheetMetricTag, { backgroundColor: Colors.warning[100] }]}><Text style={[styles.sheetMetricTagText, { color: Colors.warning[600] }]}>2m 이상 주의</Text></View>
                    <View style={[styles.sheetMetricTag, { backgroundColor: Colors.error[100] }]}><Text style={[styles.sheetMetricTagText, { color: Colors.error[600] }]}>3m 이상 위험</Text></View>
                  </View>
                </View>
              </View>

              <View style={styles.sheetMetricCard}>
                <View style={[styles.sheetMetricIcon, { backgroundColor: Colors.primary[50] }]}>
                  <Droplets size={20} color={Colors.primary[500]} strokeWidth={2} />
                </View>
                <View style={styles.sheetMetricBody}>
                  <Text style={styles.sheetMetricTitle}>수온</Text>
                  <Text style={styles.sheetMetricDesc}>
                    바다 표층의 온도입니다. 어종별 활성도에 직접 영향을 미칩니다. 봄철 수온 10~15도는 갯바위 낚시 황금기, 여름 20도 이상에서는 참돔·벵에돔 활발. 수온 급변 시 입질이 줄 수 있습니다.
                  </Text>
                </View>
              </View>

              <View style={styles.sheetMetricCard}>
                <View style={[styles.sheetMetricIcon, { backgroundColor: Colors.accent[50] }]}>
                  <Thermometer size={20} color={Colors.accent[500]} strokeWidth={2} />
                </View>
                <View style={styles.sheetMetricBody}>
                  <Text style={styles.sheetMetricTitle}>기온</Text>
                  <Text style={styles.sheetMetricDesc}>
                    대기 온도입니다. 여름철 30도 이상은 폭염 주의, 겨울철 영하권에서는 동상 및 저체온증 위험이 있습니다. 기온과 수온 차이가 클수록 어의 활성도 변화가 커집니다.
                  </Text>
                </View>
              </View>

              <Text style={styles.sheetDisclaimer}>
                ※ 본 날씨 정보는 참고용이며, 실제 출조 전 현장 기상 및 해상 상황을 반드시 확인하세요.
              </Text>
            </ScrollView>
          </View>
        </View>
      )}

      {showScoreGuide && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setShowScoreGuide(false)} />
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>낚시 지수 안내</Text>
              <TouchableOpacity onPress={() => setShowScoreGuide(false)} activeOpacity={0.6}>
                <X size={20} color={Colors.neutral[400]} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetIntro}>
                낚시 지수는 바다 날씨 데이터를 종합하여 출조 적합성을 점수로 나타냅니다. 점수가 높을수록 낚시에 유리한 조건입니다.
              </Text>
              <View style={styles.sheetSection}>
                <View style={[styles.sheetScoreRow, { borderColor: Colors.success[500] }]}>
                  <View style={[styles.sheetScoreBadge, { backgroundColor: Colors.success[100] }]}>
                    <Text style={[styles.sheetScoreBadgeText, { color: Colors.success[600] }]}>80~100</Text>
                  </View>
                  <View style={styles.sheetScoreDesc}>
                    <Text style={styles.sheetScoreLevel}>최상</Text>
                    <Text style={styles.sheetScoreDetail}>바람 약하고 파고 낮아 최적의 출조 조건</Text>
                  </View>
                </View>
                <View style={[styles.sheetScoreRow, { borderColor: Colors.success[400] }]}>
                  <View style={[styles.sheetScoreBadge, { backgroundColor: Colors.success[50] }]}>
                    <Text style={[styles.sheetScoreBadgeText, { color: Colors.success[600] }]}>60~79</Text>
                  </View>
                  <View style={styles.sheetScoreDesc}>
                    <Text style={styles.sheetScoreLevel}>양호</Text>
                    <Text style={styles.sheetScoreDetail}>무난한 출조 가능, 조류 흐름 양호</Text>
                  </View>
                </View>
                <View style={[styles.sheetScoreRow, { borderColor: Colors.warning[500] }]}>
                  <View style={[styles.sheetScoreBadge, { backgroundColor: Colors.warning[100] }]}>
                    <Text style={[styles.sheetScoreBadgeText, { color: Colors.warning[600] }]}>40~59</Text>
                  </View>
                  <View style={styles.sheetScoreDesc}>
                    <Text style={styles.sheetScoreLevel}>보통</Text>
                    <Text style={styles.sheetScoreDetail}>주의 필요, 풍파 다소 강함</Text>
                  </View>
                </View>
                <View style={[styles.sheetScoreRow, { borderColor: Colors.error[500] }]}>
                  <View style={[styles.sheetScoreBadge, { backgroundColor: Colors.error[100] }]}>
                    <Text style={[styles.sheetScoreBadgeText, { color: Colors.error[600] }]}>0~39</Text>
                  </View>
                  <View style={styles.sheetScoreDesc}>
                    <Text style={styles.sheetScoreLevel}>주의</Text>
                    <Text style={styles.sheetScoreDetail}>출조 비권장, 악천후 가능성 높음</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.sheetFactorTitle}>반영 요소</Text>
              <View style={styles.sheetFactorRow}>
                <Wind size={16} color={Colors.primary[600]} strokeWidth={2} />
                <Text style={styles.sheetFactorText}>풍속 — 강할수록 위험도 증가</Text>
              </View>
              <View style={styles.sheetFactorRow}>
                <Waves size={16} color={Colors.ocean[600]} strokeWidth={2} />
                <Text style={styles.sheetFactorText}>파고 — 높을수록 출조 불리</Text>
              </View>
              <View style={styles.sheetFactorRow}>
                <Droplets size={16} color={Colors.primary[500]} strokeWidth={2} />
                <Text style={styles.sheetFactorText}>수온 — 어종 활성도에 영향</Text>
              </View>
              <View style={styles.sheetFactorRow}>
                <Thermometer size={16} color={Colors.accent[500]} strokeWidth={2} />
                <Text style={styles.sheetFactorText}>기온 — 극단적 온도는 불리</Text>
              </View>
              <Text style={styles.sheetDisclaimer}>
                ※ 본 지수는 참고용이며, 실제 출조 전 현장 기상 및 조류 상황을 반드시 확인하세요.
              </Text>
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  content: { paddingBottom: Spacing.xl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral[50] },
  loadingText: { marginTop: Spacing.sm, fontSize: 14, color: Colors.neutral[500] },
  header: { paddingTop: 60, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerLocation: { fontSize: 22, fontWeight: '700', color: Colors.neutral[0] },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: Typography.hero.fontSize, fontWeight: '700', color: Colors.neutral[0], marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: Colors.neutral[100] },
  headerDate: { fontSize: 13, color: Colors.neutral[100], fontWeight: '500', marginTop: 4 },
  dropdown: { marginTop: Spacing.md, backgroundColor: Colors.neutral[0], borderRadius: Radius.md, maxHeight: 340 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  searchInput: { flex: 1, fontSize: 14, color: Colors.neutral[800], paddingVertical: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.neutral[400], paddingHorizontal: Spacing.sm, paddingTop: Spacing.sm, paddingBottom: 4, letterSpacing: 0.5 },
  noResultText: { fontSize: 13, color: Colors.neutral[400], textAlign: 'center', paddingVertical: Spacing.lg },
  dropdownScroll: { padding: Spacing.xs },
  dropdownItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, borderRadius: Radius.sm },
  dropdownItemTextContainer: { flex: 1 },
  dropdownItemText: { fontSize: 15, fontWeight: '600', color: Colors.neutral[800] },
  dropdownItemDesc: { fontSize: 11, color: Colors.neutral[400], marginTop: 2 },
  body: { padding: Spacing.md, gap: Spacing.md },
  card: { backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, shadowColor: Colors.neutral[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: Typography.h3.fontSize, fontWeight: '600', color: Colors.neutral[800] },
  tideBadge: { backgroundColor: Colors.ocean[100], paddingHorizontal: 12, paddingVertical: 4, borderRadius: Radius.full },
  tideBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.ocean[700] },
  recommendBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.accent[50], borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.accent[100] },
  recommendText: { fontSize: 13, fontWeight: '600', color: Colors.neutral[700] },
  recommendTime: { fontSize: 14, fontWeight: '700', color: Colors.accent[600], marginLeft: 'auto' },
  tideList: { gap: Spacing.sm },
  tideItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  tideIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  tideInfo: { flex: 1, marginLeft: Spacing.sm },
  tideType: { fontSize: 16, fontWeight: '600', color: Colors.neutral[800] },
  tideTime: { fontSize: 14, color: Colors.neutral[500] },
  tideHeight: { fontSize: 16, fontWeight: '600', color: Colors.ocean[600] },
  weatherGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm },
  weatherItem: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm },
  windIconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primary[50], justifyContent: 'center', alignItems: 'center' },
  weatherLabel: { fontSize: 12, color: Colors.neutral[500], marginTop: 4 },
  weatherValue: { fontSize: 16, fontWeight: '700', color: Colors.neutral[800], marginTop: 2 },
  weatherSubValue: { fontSize: 11, color: Colors.neutral[400], marginTop: 1 },
  weatherSkyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: Spacing.sm, paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.neutral[100] },
  weatherSkyLabel: { fontSize: 14, color: Colors.neutral[500] },
  weatherSkyValue: { fontSize: 14, fontWeight: '600', color: Colors.neutral[700], marginLeft: 4 },
  updatedText: { fontSize: 11, color: Colors.neutral[400] },
  dataSourceRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  dataSourceBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  dataSourceLoading: { paddingVertical: 2 },
  dataSourceReal: { backgroundColor: Colors.success[100] },
  dataSourceMock: { backgroundColor: Colors.warning[100] },
  dataSourceText: { fontSize: 11, fontWeight: '600', color: Colors.neutral[700] },
  scoreContainer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  scoreCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 3 },
  scoreValue: { fontSize: 28, fontWeight: '700' },
  scoreUnit: { fontSize: 10, fontWeight: '500' },
  scoreInfo: { flex: 1 },
  scoreLevel: { fontSize: 18, fontWeight: '700', color: Colors.neutral[800], marginBottom: 4 },
  scoreAdvice: { fontSize: 13, color: Colors.neutral[500], lineHeight: 20 },
  sunCard: { flexDirection: 'row', backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, justifyContent: 'space-around', alignItems: 'center', shadowColor: Colors.neutral[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  sunItem: { alignItems: 'center', gap: 4 },
  sunLabel: { fontSize: 12, color: Colors.neutral[500] },
  sunValue: { fontSize: 16, fontWeight: '600', color: Colors.neutral[800] },
  sunDivider: { width: 1, height: 40, backgroundColor: Colors.neutral[200] },
  disclaimerCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.error[50], borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.error[100] },
  disclaimerText: { fontSize: 12, color: Colors.error[600], fontWeight: '600', lineHeight: 18, flex: 1 },
  infoBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.primary[50], justifyContent: 'center', alignItems: 'center', marginLeft: 2, borderWidth: 1, borderColor: Colors.primary[100] },
  sheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 1000 },
  sheetBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetContainer: { backgroundColor: Colors.neutral[0], borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '70%', paddingBottom: 20 },
  sheetHandle: { width: 36, height: 4, backgroundColor: Colors.neutral[200], borderRadius: 2, alignSelf: 'center', marginTop: Spacing.sm, marginBottom: Spacing.sm },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  sheetTitle: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.neutral[800] },
  sheetScroll: { paddingHorizontal: Spacing.lg },
  sheetIntro: { fontSize: 14, color: Colors.neutral[600], lineHeight: 22, marginBottom: Spacing.md },
  sheetSection: { gap: Spacing.sm, marginBottom: Spacing.lg },
  sheetScoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, borderRadius: Radius.md, borderWidth: 1, backgroundColor: Colors.neutral[50] },
  sheetScoreBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  sheetScoreBadgeText: { fontSize: 12, fontWeight: '700' },
  sheetScoreDesc: { flex: 1 },
  sheetScoreLevel: { fontSize: 15, fontWeight: '700', color: Colors.neutral[800], marginBottom: 2 },
  sheetScoreDetail: { fontSize: 12, color: Colors.neutral[500], lineHeight: 18 },
  sheetFactorTitle: { fontSize: 14, fontWeight: '700', color: Colors.neutral[700], marginBottom: Spacing.sm },
  sheetFactorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  sheetFactorText: { fontSize: 13, color: Colors.neutral[600] },
  sheetDisclaimer: { fontSize: 11, color: Colors.neutral[400], marginTop: Spacing.md, marginBottom: Spacing.sm, lineHeight: 17 },
  sheetMetricCard: { flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  sheetMetricIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  sheetMetricBody: { flex: 1 },
  sheetMetricTitle: { fontSize: 15, fontWeight: '700', color: Colors.neutral[800], marginBottom: 4 },
  sheetMetricDesc: { fontSize: 13, color: Colors.neutral[500], lineHeight: 20 },
  sheetMetricTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: Spacing.sm },
  sheetMetricTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  sheetMetricTagText: { fontSize: 11, fontWeight: '600' },
  dateBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.sm, shadowColor: Colors.neutral[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  dateArrow: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.ocean[50] },
  todayBtn: { width: 48, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', gap: 1, backgroundColor: Colors.ocean[50], marginLeft: 6 },
  todayBtnActive: { backgroundColor: Colors.neutral[100] },
  todayBtnText: { fontSize: 9, fontWeight: '700', color: Colors.ocean[600] },
  dateCenter: { flex: 1, alignItems: 'center', paddingHorizontal: Spacing.sm },
  dateText: { fontSize: 15, fontWeight: '700', color: Colors.neutral[800], marginBottom: 6 },
  dateMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  moonBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: Colors.neutral[100], paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  moonEmoji: { fontSize: 13 },
  moonText: { fontSize: 11, fontWeight: '600', color: Colors.neutral[600] },
  tideStrengthBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full },
  tideStrengthSpring: { backgroundColor: Colors.warning[100] },
  tideStrengthNeap: { backgroundColor: Colors.ocean[100] },
  tideStrengthMid: { backgroundColor: Colors.neutral[100] },
  tideStrengthText: { fontSize: 11, fontWeight: '600', color: Colors.neutral[600] },
  calContainer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  calNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  calMonthText: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.neutral[800] },
  calWeekRow: { flexDirection: 'row', marginBottom: Spacing.xs },
  calWeekDay: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '600', color: Colors.neutral[400] },
  calDayGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calDayCell: { width: '14.2857%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center' },
  calDayText: { fontSize: 15, fontWeight: '500', color: Colors.neutral[700] },
  calDaySelected: { backgroundColor: Colors.ocean[500], borderRadius: 999 },
  calDayTextSelected: { color: Colors.neutral[0], fontWeight: '700' },
  calDayToday: { borderWidth: 1.5, borderColor: Colors.ocean[400], borderRadius: 999 },
  calTodayBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.ocean[50] },
  calTodayText: { fontSize: 14, fontWeight: '600', color: Colors.ocean[600] },
});
