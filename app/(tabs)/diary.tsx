import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, FlatList, Image, Alert, Platform,
} from 'react-native';
import { BookHeart, Plus, Camera, Fish, Ruler, MapPin, Calendar, Trash2, X, ChevronDown, Flag, AlertTriangle, GripVertical, ArrowUp, ArrowDown, Check } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { FISH_SPECIES } from '@/lib/fishSpecies';
import { REGIONS } from '@/lib/regions';
import { validateContent, validateNickname } from '@/lib/moderation';
import { useAuth } from '@/lib/useAuth';
import AdBanner from '@/components/AdBanner';
import NotificationBell from '@/components/NotificationBell';
import type { Catch, FishingPoint } from '@/lib/types';

const STORAGE_KEY = 'diary_tag_order';
const STORAGE_SELECTED = 'diary_selected_tag';

function loadTagOrder(): string[] | null {
  if (Platform.OS !== 'web') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0) return arr;
  } catch {}
  return null;
}

function saveTagOrder(order: string[]) {
  if (Platform.OS !== 'web') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch {}
}

function loadSelectedTag(): string | null {
  if (Platform.OS !== 'web') return null;
  try { return localStorage.getItem(STORAGE_SELECTED) || null; } catch { return null; }
}

function saveSelectedTag(tag: string) {
  if (Platform.OS !== 'web') return;
  try { localStorage.setItem(STORAGE_SELECTED, tag); } catch {}
}

export default function DiaryScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [catches, setCatches] = useState<Catch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [species, setSpecies] = useState('');
  const [sizeCm, setSizeCm] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rig, setRig] = useState('');
  const [caughtAt, setCaughtAt] = useState(new Date().toISOString().slice(0, 10));
  const [point, setPoint] = useState('');
  const [region, setRegion] = useState('태안');
  const [memo, setMemo] = useState('');
  const [speciesPicker, setSpeciesPicker] = useState(false);
  const [regionPicker, setRegionPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState<string | null>(null);
  const [filterPoint, setFilterPoint] = useState<string | null>(null);
  const [allPoints, setAllPoints] = useState<FishingPoint[]>([]);
  const [filteredPoints, setFilteredPoints] = useState<FishingPoint[]>([]);
  const [tagOrder, setTagOrder] = useState<string[]>(() => {
    const saved = loadTagOrder();
    return saved || ['전체', ...REGIONS.map(r => r.name)];
  });
  const [editOrderMode, setEditOrderMode] = useState(false);

  const regionScrollRef = useRef<ScrollView>(null);
  const dragState = useRef<{ startX: number; scrollLeft: number; isDown: boolean }>({ startX: 0, scrollLeft: 0, isDown: false });

  const loadCatches = useCallback(async () => {
    let query = supabase.from('catches').select('*').order('caught_at', { ascending: false });
    if (filterRegion) query = query.eq('region', filterRegion);
    if (filterPoint) query = query.ilike('point', `%${filterPoint}%`);
    const { data, error } = await query;
    if (error) { setError('조과 기록을 불러오지 못했습니다.'); } else { setCatches((data as Catch[]) || []); setError(null); }
    setLoading(false);
  }, [filterRegion, filterPoint]);

  const loadPoints = useCallback(async () => {
    const { data } = await supabase.from('fishing_points').select('*').order('name');
    setAllPoints((data as FishingPoint[]) || []);
  }, []);

  useEffect(() => {
    loadCatches();
    loadPoints();
  }, [loadCatches, loadPoints]);

  useEffect(() => {
    if (filterRegion) {
      setFilteredPoints(allPoints.filter((p) => p.region === filterRegion));
    } else {
      setFilteredPoints(allPoints);
    }
  }, [filterRegion, allPoints]);

  useEffect(() => {
    const saved = loadSelectedTag();
    if (saved && tagOrder.includes(saved)) {
      if (saved === '전체') {
        setFilterRegion(null);
        setFilterPoint(null);
      } else {
        setFilterRegion(saved);
        setFilterPoint(null);
      }
    } else if (tagOrder.length > 1 && tagOrder[0] === '전체' && tagOrder.length > 1) {
      const firstCustom = tagOrder[1];
      setFilterRegion(firstCustom === '전체' ? null : firstCustom);
      setFilterPoint(null);
    }
  }, []);

  const handleSelectTag = (tag: string) => {
    if (tag === '전체') {
      setFilterRegion(null);
      setFilterPoint(null);
      saveSelectedTag('전체');
    } else {
      setFilterRegion(tag);
      setFilterPoint(null);
      saveSelectedTag(tag);
    }
  };

  const moveTag = (index: number, direction: 'up' | 'down') => {
    const newOrder = [...tagOrder];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    setTagOrder(newOrder);
    saveTagOrder(newOrder);
  };

  const requireAuth = () => {
    if (!user) {
      Alert.alert('로그인 필요', '조과 기록을 등록하려면 로그인이 필요합니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/login') },
      ]);
      return false;
    }
    if (profile?.is_banned) { Alert.alert('계정 제한', '신고 누적으로 글쓰기가 제한되었습니다.'); return false; }
    return true;
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled && result.assets.length > 0) setPhotoUri(result.assets[0].uri);
  };

  const resetForm = () => {
    setPhotoUri(null); setSpecies(''); setSizeCm(''); setQuantity(''); setRig('');
    setCaughtAt(new Date().toISOString().slice(0, 10)); setPoint(''); setRegion('태안'); setMemo(''); setError(null);
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type: `image/${fileExt}` } as any);
      const { error: uploadError } = await supabase.storage.from('fish-photos').upload(fileName, formData);
      if (uploadError) return null;
      const { data } = supabase.storage.from('fish-photos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch { return null; }
  };

  const handleSubmit = async () => {
    if (!species.trim()) { setError('어종을 선택해주세요.'); return; }
    if (!requireAuth()) return;
    const contentCheck = validateContent(species + ' ' + point + ' ' + memo);
    if (!contentCheck.valid) { setError(contentCheck.message); return; }
    setSubmitting(true); setError(null);
    let photoUrl: string | null = null;
    if (photoUri) {
      photoUrl = await uploadPhoto(photoUri);
      if (!photoUrl) { setError('사진 업로드에 실패했습니다.'); setSubmitting(false); return; }
    }
    const { error: insertError } = await supabase.from('catches').insert({
      user_id: user!.id, photo_url: photoUrl, species: species.trim(),
      size_cm: sizeCm ? parseFloat(sizeCm) : null, quantity: quantity ? parseInt(quantity) : null,
      rig: rig.trim() || null, caught_at: caughtAt, point: point.trim() || null, region,
      memo: memo.trim() || null,
    });
    if (insertError) { setError('기록 저장에 실패했습니다.'); setSubmitting(false); return; }
    setSubmitting(false); setModalVisible(false); resetForm(); loadCatches();
  };

  const handleDelete = (id: string) => {
    Alert.alert('삭제 확인', '이 조과 기록을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('catches').delete().eq('id', id);
        if (!error) loadCatches();
      }},
    ]);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
  };

  const canDelete = (item: Catch) => user && item.user_id === user.id;

  const renderCatch = ({ item }: { item: Catch }) => (
    <View style={styles.catchCard}>
      <View style={styles.catchCardHeader}>
        <View style={styles.catchCardLeft}>
          {item.photo_url ? <Image source={{ uri: item.photo_url }} style={styles.catchPhoto} /> : (
            <View style={styles.catchPhotoPlaceholder}><Fish size={28} color={Colors.neutral[300]} strokeWidth={2} /></View>
          )}
        </View>
        <View style={styles.catchInfo}>
          <View style={styles.catchTitleRow}>
            <Text style={styles.catchSpecies}>{item.species}</Text>
            {item.size_cm && <Text style={styles.catchSize}>{item.size_cm}cm</Text>}
            {item.quantity && <Text style={styles.catchQuantity}>{item.quantity}마리</Text>}
          </View>
          <View style={styles.catchMetaRow}>
            <Calendar size={13} color={Colors.neutral[400]} strokeWidth={2} />
            <Text style={styles.catchMeta}>{formatDate(item.caught_at)}</Text>
          </View>
          {item.point && (
            <View style={styles.catchMetaRow}>
              <MapPin size={13} color={Colors.neutral[400]} strokeWidth={2} />
              <Text style={styles.catchMeta}>{item.point}{item.region ? ` · ${item.region}` : ''}</Text>
            </View>
          )}
          {item.rig && <Text style={styles.catchRig}>채비: {item.rig}</Text>}
          {item.memo && <Text style={styles.catchMemo}>{item.memo}</Text>}
        </View>
        {canDelete(item) && (
          <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
            <Trash2 size={18} color={Colors.error[400]} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const onRegionScrollMouseDown = (e: any) => {
    if (Platform.OS !== 'web') return;
    const scrollView = regionScrollRef.current as any;
    const scrollEl = scrollView?.getScrollableNode?.() || scrollView?._scrollViewRef?.current;
    if (!scrollEl) return;
    dragState.current.isDown = true;
    dragState.current.startX = e.pageX || e.clientX || 0;
    dragState.current.scrollLeft = scrollEl.scrollLeft;
    scrollEl.style.cursor = 'grabbing';
  };

  const onRegionScrollMouseMove = (e: any) => {
    if (Platform.OS !== 'web' || !dragState.current.isDown) return;
    const scrollView = regionScrollRef.current as any;
    const scrollEl = scrollView?.getScrollableNode?.() || scrollView?._scrollViewRef?.current;
    if (!scrollEl) return;
    const x = e.pageX || e.clientX || 0;
    const walk = (x - dragState.current.startX) * 1.5;
    scrollEl.scrollLeft = dragState.current.scrollLeft - walk;
  };

  const onRegionScrollMouseUp = () => {
    if (Platform.OS !== 'web') return;
    dragState.current.isDown = false;
    const scrollView = regionScrollRef.current as any;
    const scrollEl = scrollView?.getScrollableNode?.() || scrollView?._scrollViewRef?.current;
    if (scrollEl) scrollEl.style.cursor = 'auto';
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.ocean[600], Colors.primary[700], Colors.primary[900]]} style={styles.header}>
        <View style={styles.headerContent}>
          <BookHeart size={28} color={Colors.neutral[0]} strokeWidth={2} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>조과 일기장</Text>
            <Text style={styles.headerSubtitle}>나의 낚시 기록 {catches.length}건</Text>
          </View>
          <NotificationBell userId={user?.id ?? null} />
        </View>
      </LinearGradient>

      <View style={styles.filterBar}>
        <View style={styles.filterScrollContainer}>
          <ScrollView
            ref={regionScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
            {...(Platform.OS === 'web' ? {
              onMouseDown: onRegionScrollMouseDown,
              onMouseMove: onRegionScrollMouseMove,
              onMouseUp: onRegionScrollMouseUp,
              onMouseLeave: onRegionScrollMouseUp,
            } : {})}
          >
            {tagOrder.map((tag) => {
              const isActive = tag === '전체' ? !filterRegion : filterRegion === tag;
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => handleSelectTag(tag)}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        <TouchableOpacity style={styles.editOrderBtn} onPress={() => setEditOrderMode(!editOrderMode)}>
          {editOrderMode ? <Check size={16} color={Colors.ocean[600]} strokeWidth={2} /> : <GripVertical size={16} color={Colors.neutral[500]} strokeWidth={2} />}
          <Text style={styles.editOrderText}>{editOrderMode ? '완료' : '순서 편집'}</Text>
        </TouchableOpacity>
      </View>

      {editOrderMode && (
        <View style={styles.orderEditBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.orderEditScroll}>
            {tagOrder.map((tag, idx) => (
              <View key={tag} style={styles.orderEditItem}>
                <Text style={styles.orderEditTagText}>{tag}</Text>
                <View style={styles.orderEditBtns}>
                  <TouchableOpacity onPress={() => moveTag(idx, 'up')} disabled={idx === 0}>
                    <ArrowUp size={16} color={idx === 0 ? Colors.neutral[300] : Colors.ocean[600]} strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveTag(idx, 'down')} disabled={idx === tagOrder.length - 1}>
                    <ArrowDown size={16} color={idx === tagOrder.length - 1 ? Colors.neutral[300] : Colors.ocean[600]} strokeWidth={2} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {filterRegion && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll} style={styles.filterSubBar}>
          <TouchableOpacity style={[styles.filterChip, !filterPoint && styles.filterChipActive]} onPress={() => setFilterPoint(null)}>
            <Text style={[styles.filterChipText, !filterPoint && styles.filterChipTextActive]}>전체 포인트</Text>
          </TouchableOpacity>
          {filteredPoints.map((p) => (
            <TouchableOpacity key={p.id} style={[styles.filterChip, filterPoint === p.name && styles.filterChipActive]} onPress={() => setFilterPoint(p.name)}>
              <Text style={[styles.filterChipText, filterPoint === p.name && styles.filterChipTextActive]}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.ocean[500]} />
          <Text style={styles.loadingText}>기록을 불러오는 중...</Text>
        </View>
      ) : catches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Fish size={48} color={Colors.neutral[300]} strokeWidth={1.5} />
          <Text style={styles.emptyTitle}>아직 기록이 없습니다</Text>
          <Text style={styles.emptySubtitle}>첫 조과를 기록해보세요!</Text>
        </View>
      ) : (
        <FlatList data={catches} keyExtractor={(item) => item.id} renderItem={renderCatch} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (requireAuth()) {
            setModalVisible(true);
          }
        }}
        activeOpacity={0.8}
      >
        <Plus size={28} color={Colors.neutral[0]} strokeWidth={2.5} />
      </TouchableOpacity>
      <AdBanner />

      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>새 조과 기록</Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); resetForm(); }}>
                <X size={24} color={Colors.neutral[500]} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={styles.modalRedWarning}>
                <AlertTriangle size={14} color={Colors.error[600]} strokeWidth={2} />
                <Text style={styles.modalRedWarningText}>욕설, 음란물, 광고성 내용 작성 시 즉시 삭제 및 글쓰기가 제한됩니다.</Text>
              </View>
              <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
                {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoPreview} /> : (
                  <View style={styles.photoPlaceholder}>
                    <Camera size={32} color={Colors.neutral[300]} strokeWidth={2} />
                    <Text style={styles.photoPlaceholderText}>물고기 사진 선택</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.fieldLabel}>어종 *</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setSpeciesPicker(true)}>
                <Fish size={18} color={Colors.ocean[600]} strokeWidth={2} />
                <Text style={[styles.pickerText, !species && { color: Colors.neutral[400] }]}>{species || '어종 선택'}</Text>
                <ChevronDown size={18} color={Colors.neutral[400]} strokeWidth={2} />
              </TouchableOpacity>
              <View style={styles.inputRow2}>
                <View style={styles.inputHalf}>
                  <Text style={styles.fieldLabel}>크기 (cm)</Text>
                  <View style={styles.inputRow}>
                    <Ruler size={18} color={Colors.ocean[600]} strokeWidth={2} />
                    <TextInput style={styles.input} value={sizeCm} onChangeText={setSizeCm} placeholder="예: 35" placeholderTextColor={Colors.neutral[400]} keyboardType="numeric" />
                  </View>
                </View>
                <View style={styles.inputHalf}>
                  <Text style={styles.fieldLabel}>마릿수</Text>
                  <View style={styles.inputRow}>
                    <Fish size={18} color={Colors.ocean[600]} strokeWidth={2} />
                    <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} placeholder="예: 3" placeholderTextColor={Colors.neutral[400]} keyboardType="numeric" />
                  </View>
                </View>
              </View>
              <Text style={styles.fieldLabel}>사용 채비</Text>
              <View style={styles.inputRow}>
                <TextInput style={styles.input} value={rig} onChangeText={setRig} placeholder="예: 찌낚시 3호, 원투" placeholderTextColor={Colors.neutral[400]} />
              </View>
              <Text style={styles.fieldLabel}>낚시 날짜</Text>
              <View style={styles.inputRow}>
                <Calendar size={18} color={Colors.ocean[600]} strokeWidth={2} />
                <TextInput style={styles.input} value={caughtAt} onChangeText={setCaughtAt} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.neutral[400]} />
              </View>
              <Text style={styles.fieldLabel}>지역</Text>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => setRegionPicker(true)}>
                <MapPin size={18} color={Colors.ocean[600]} strokeWidth={2} />
                <Text style={styles.pickerText}>{region}</Text>
                <ChevronDown size={18} color={Colors.neutral[400]} strokeWidth={2} />
              </TouchableOpacity>
              <Text style={styles.fieldLabel}>포인트 (장소)</Text>
              <View style={styles.inputRow}>
                <MapPin size={18} color={Colors.ocean[600]} strokeWidth={2} />
                <TextInput style={styles.input} value={point} onChangeText={setPoint} placeholder="예: 몽산포 방파제" placeholderTextColor={Colors.neutral[400]} />
              </View>
              <Text style={styles.fieldLabel}>메모</Text>
              <TextInput style={styles.memoInput} value={memo} onChangeText={setMemo} placeholder="낚시 방법, 미끼, 조건 등 자유롭게 기록" placeholderTextColor={Colors.neutral[400]} multiline numberOfLines={3} textAlignVertical="top" />
              {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator size="small" color={Colors.neutral[0]} /> : <Text style={styles.submitBtnText}>기록 저장</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={speciesPicker} animationType="slide" transparent={true} onRequestClose={() => setSpeciesPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>어종 선택</Text>
              <TouchableOpacity onPress={() => setSpeciesPicker(false)}><X size={24} color={Colors.neutral[500]} strokeWidth={2} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {FISH_SPECIES.map((s) => (
                <TouchableOpacity key={s} style={[styles.pickerItem, species === s && { backgroundColor: Colors.ocean[50] }]} onPress={() => { setSpecies(s); setSpeciesPicker(false); }}>
                  <Fish size={18} color={Colors.ocean[600]} strokeWidth={2} />
                  <Text style={[styles.pickerItemText, species === s && { color: Colors.ocean[700], fontWeight: '600' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={regionPicker} animationType="slide" transparent={true} onRequestClose={() => setRegionPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>지역 선택</Text>
              <TouchableOpacity onPress={() => setRegionPicker(false)}><X size={24} color={Colors.neutral[500]} strokeWidth={2} /></TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList} showsVerticalScrollIndicator={false}>
              {REGIONS.map((r) => (
                <TouchableOpacity key={r.name} style={[styles.pickerItem, region === r.name && { backgroundColor: Colors.ocean[50] }]} onPress={() => { setRegion(r.name); setRegionPicker(false); }}>
                  <MapPin size={18} color={Colors.ocean[600]} strokeWidth={2} />
                  <View>
                    <Text style={[styles.pickerItemText, region === r.name && { color: Colors.ocean[700], fontWeight: '600' }]}>{r.name}</Text>
                    <Text style={styles.pickerItemDesc}>{r.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: Typography.h1.fontSize, fontWeight: '700', color: Colors.neutral[0] },
  headerSubtitle: { fontSize: 14, color: Colors.neutral[100], marginTop: 2 },
  filterBar: { backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200], flexDirection: 'row', alignItems: 'center' },
  filterScrollContainer: { flex: 1 },
  filterScroll: { paddingHorizontal: Spacing.md, gap: Spacing.sm, paddingVertical: Spacing.sm },
  filterSubBar: { marginTop: 0, borderTopWidth: 1, borderTopColor: Colors.neutral[100] },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, backgroundColor: Colors.neutral[100], borderWidth: 1, borderColor: Colors.neutral[200] },
  filterChipActive: { backgroundColor: Colors.ocean[600], borderColor: Colors.ocean[600] },
  filterChipText: { fontSize: 13, fontWeight: '600', color: Colors.neutral[600] },
  filterChipTextActive: { color: Colors.neutral[0] },
  editOrderBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderLeftWidth: 1, borderLeftColor: Colors.neutral[200] },
  editOrderText: { fontSize: 12, fontWeight: '600', color: Colors.neutral[500] },
  orderEditBar: { backgroundColor: Colors.ocean[50], borderBottomWidth: 1, borderBottomColor: Colors.ocean[100] },
  orderEditScroll: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: Spacing.sm },
  orderEditItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.neutral[0], paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.neutral[200] },
  orderEditTagText: { fontSize: 13, fontWeight: '600', color: Colors.neutral[700] },
  orderEditBtns: { flexDirection: 'row', gap: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.sm, fontSize: 14, color: Colors.neutral[500] },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.xl },
  emptyTitle: { fontSize: Typography.h2.fontSize, fontWeight: '600', color: Colors.neutral[600], marginTop: Spacing.md },
  emptySubtitle: { fontSize: 14, color: Colors.neutral[400], marginTop: 4 },
  listContent: { padding: Spacing.md, gap: Spacing.sm },
  catchCard: { backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, shadowColor: Colors.neutral[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  catchCardHeader: { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' },
  catchCardLeft: { flexShrink: 0 },
  catchPhoto: { width: 96, height: 96, borderRadius: Radius.md, backgroundColor: Colors.neutral[100] },
  catchPhotoPlaceholder: { width: 96, height: 96, borderRadius: Radius.md, backgroundColor: Colors.neutral[100], justifyContent: 'center', alignItems: 'center' },
  catchInfo: { flex: 1, minWidth: 0 },
  catchTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  catchSpecies: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.neutral[800] },
  catchSize: { fontSize: 14, fontWeight: '600', color: Colors.ocean[600] },
  catchQuantity: { fontSize: 13, fontWeight: '600', color: Colors.success[600] },
  catchMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  catchMeta: { fontSize: 12, color: Colors.neutral[500] },
  catchRig: { fontSize: 12, color: Colors.neutral[500], marginTop: 4 },
  catchMemo: { fontSize: 13, color: Colors.neutral[600], marginTop: 6, lineHeight: 18 },
  deleteBtn: { padding: Spacing.xs },
  fab: { position: 'absolute', right: Spacing.lg, bottom: 80, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.ocean[600], justifyContent: 'center', alignItems: 'center', shadowColor: Colors.ocean[900], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6, zIndex: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.neutral[0], borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  modalTitle: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.neutral[800] },
  modalBody: { padding: Spacing.md },
  modalRedWarning: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.error[50], borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.sm, marginBottom: Spacing.md, borderWidth: 1, borderColor: Colors.error[100] },
  modalRedWarningText: { fontSize: 11, color: Colors.error[600], fontWeight: '600', flex: 1, lineHeight: 16 },
  photoPicker: { marginBottom: Spacing.md },
  photoPreview: { width: '100%', height: 180, borderRadius: Radius.md },
  photoPlaceholder: { width: '100%', height: 180, borderRadius: Radius.md, backgroundColor: Colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.neutral[200], borderStyle: 'dashed' },
  photoPlaceholderText: { fontSize: 14, color: Colors.neutral[400], marginTop: Spacing.sm },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.neutral[700], marginBottom: Spacing.xs, marginTop: Spacing.sm },
  inputRow2: { flexDirection: 'row', gap: Spacing.md },
  inputHalf: { flex: 1 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[50], borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.neutral[200], gap: 8 },
  input: { flex: 1, fontSize: 16, color: Colors.neutral[800], paddingVertical: 4 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[50], borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], gap: 8 },
  pickerText: { flex: 1, fontSize: 16, color: Colors.neutral[800] },
  memoInput: { backgroundColor: Colors.neutral[50], borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], fontSize: 15, color: Colors.neutral[800], minHeight: 80 },
  errorBox: { backgroundColor: Colors.error[50], borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md },
  errorText: { fontSize: 14, color: Colors.error[600], textAlign: 'center' },
  submitBtn: { backgroundColor: Colors.ocean[600], borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.lg, marginBottom: Spacing.xl },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.neutral[0] },
  pickerContent: { backgroundColor: Colors.neutral[0], borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '70%' },
  pickerList: { padding: Spacing.md },
  pickerItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm, borderRadius: Radius.md },
  pickerItemText: { fontSize: 16, color: Colors.neutral[800] },
  pickerItemDesc: { fontSize: 12, color: Colors.neutral[400], marginTop: 2 },
});
