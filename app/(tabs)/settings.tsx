import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Switch, Alert, Modal, TextInput, Platform } from 'react-native';
import { Settings, MapPin, Check, Info, Bell, BellOff, Gauge, FileText, Shield, MessageSquare, ChevronRight, UserX, LogIn, LogOut, ShieldAlert } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { REGIONS } from '@/lib/regions';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import { validateContent } from '@/lib/moderation';
import { localizeAuthError } from '@/lib/authErrors';
import AdBanner from '@/components/AdBanner';
import NotificationBell from '@/components/NotificationBell';

const PRIVACY_POLICY = `1. 수집하는 개인정보 항목
- 이메일 주소, 닉네임, 조과 기록(사진, 어종, 위치 정보), 게시글 및 댓글 내용

2. 수집 및 이용 목적
- 회원 식별, 낚시 커뮤니티 서비스 제공, 조과 기록 관리, 위치 기반 낚시 포인트 정보 제공

3. 보유 및 이용 기간
- 회원 탈퇴 시 즉시 영구 삭제

4. 위치기반서비스 안내
- 본 앱은 사용자의 위치 정보를 활용하여 주변 낚시 포인트, 물때, 날씨 정보를 제공합니다.
- 위치 정보는 사용자가 GPS 버튼을 클릭한 경우에만 수집되며, 서버에 저장되지 않습니다.

5. 공공데이터 활용 안내
- 본 앱은 국립해양조사원(조석예보, 해양예보), 기상청(단기예보, 기상특보)의 공공데이터를 활용합니다.
- 공공데이터의 오차로 인해 발생하는 손해에 대해 당사는 법적 책임을 지지 않습니다.

6. 면책 조항
- 본 앱이 제공하는 물때, 날씨, 낚시지수 등 모든 정보는 참고용이며, 출조 전 반드시 현장 기상을 확인하셔야 합니다.
- 안전사고 발생 시 개발자는 법적 책임을 지지 않습니다.`;

const TERMS_OF_SERVICE = `1. 서비스의 목적
- 본 서비스는 낚시 정보(물때, 날씨, 낚시지수) 제공 및 낚시 커뮤니티 플랫폼을 운영합니다.

2. 이용자 의무
- 타인에게 불쾌감을 주는 내용(욕설, 음란물, 광고성 내용) 작성을 금지합니다.
- 신고 3회 누적 시 자동으로 게시글이 숨김 처리되며, 글쓰기 권한이 제한됩니다.
- 허위 신고, 악성 신고 시 서비스 이용이 제한될 수 있습니다.

3. 저작권
- 사용자가 업로드한 사진의 저작권은 작성자에게 있으며, 서비스 내 표시 목적으로만 활용됩니다.

4. 공공데이터 면책
- 국립해양조사원 및 기상청의 공공데이터 오차로 인한 손해에 대해 당사는 책임지지 않습니다.
- 모든 정보는 참고용이며, 출조 전 현장 확인은 이용자의 책임입니다.

5. 위치기반서비스
- GPS 기반 위치 정보는 사용자 요청 시에만 활용되며 서버에 저장되지 않습니다.

6. 안전 고지
- 갯바위 낚시 시 안전복 착용, 구조조끼 휴대를 권장합니다.
- 악천후 출조를 금지하며, 기상 악화 시 즉시 대피해야 합니다.`;

export default function SettingsScreen() {
  const { user, profile, signOut, isAdmin } = useAuth();
  const router = useRouter();
  const [selectedRegion, setSelectedRegion] = useState('태안');
  const [windUnit, setWindUnit] = useState('m/s');
  const [notifTide, setNotifTide] = useState(false);
  const [notifCommunity, setNotifCommunity] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [regionPicker, setRegionPicker] = useState(false);
  const [termsModal, setTermsModal] = useState<'privacy' | 'terms' | null>(null);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    const { data } = await supabase.from('app_settings').select('*').limit(1).maybeSingle();
    if (data?.selected_region) setSelectedRegion(data.selected_region);
    if (data?.wind_unit) setWindUnit(data.wind_unit);
    if (data?.notif_tide !== null && data?.notif_tide !== undefined) setNotifTide(data.notif_tide);
    if (data?.notif_community !== null && data?.notif_community !== undefined) setNotifCommunity(data.notif_community);
    setLoading(false);
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const saveSetting = async (field: string, value: string | boolean) => {
    setSaving(true);
    const { data: existing } = await supabase.from('app_settings').select('id').limit(1).maybeSingle();
    if (existing?.id) {
      await supabase.from('app_settings').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', existing.id);
    } else {
      await supabase.from('app_settings').insert({ [field]: value });
    }
    setSaving(false);
  };

  const handleSelectRegion = (name: string) => { setSelectedRegion(name); setRegionPicker(false); saveSetting('selected_region', name); };
  const handleWindUnit = (unit: string) => { setWindUnit(unit); saveSetting('wind_unit', unit); };
  const handleNotifTide = (val: boolean) => { setNotifTide(val); saveSetting('notif_tide', val); };
  const handleNotifCommunity = (val: boolean) => { setNotifCommunity(val); saveSetting('notif_community', val); };

  const handleSubmitFeedback = async () => {
    if (!feedbackContent.trim()) { Alert.alert('내용 입력', '피드백 내용을 입력해주세요.'); return; }
    const contentCheck = validateContent(feedbackContent);
    if (!contentCheck.valid) { Alert.alert('금지어 감지', contentCheck.message); return; }
    setFeedbackSubmitting(true);
    const { error } = await supabase.from('feedback').insert({
      user_id: user?.id ?? null,
      email: user?.email ?? null,
      content: feedbackContent.trim(),
    });
    setFeedbackSubmitting(false);
    if (error) { Alert.alert('오류', '피드백 전송에 실패했습니다.'); return; }
    Alert.alert('전송 완료', '피드백이 접수되었습니다. 감사합니다!');
    setFeedbackModal(false);
    setFeedbackContent('');
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  const handleDeleteAccount = () => {
    setDeleteError(null);
    setDeleteConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('delete_user_account', { p_user_id: user.id });

      console.log('[delete-account] rpcError:', rpcError);
      console.log('[delete-account] rpcData:', rpcData);

      if (rpcError) {
        const koreanMsg = localizeAuthError(rpcError, '회원 탈퇴 처리 중 오류가 발생했습니다.');
        const detail = `오류: ${koreanMsg}`;
        console.log('[delete-account] FULL ERROR:', detail);
        setDeleteError(detail);
        setDeleting(false);
        return;
      }

      if (rpcData && typeof rpcData === 'object' && 'success' in rpcData && rpcData.success === true) {
        console.log('[delete-account] Success:', rpcData);
        setDeleteConfirm(false);
        setDeleting(false);
        await signOut();
        router.replace('/login');
        return;
      }

      const detail = '예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      console.log('[delete-account] Unexpected response:', detail);
      setDeleteError(detail);
      setDeleting(false);
    } catch (e) {
      console.log('[delete-account] CATCH error:', e);
      const detail = `네트워크 오류: 인터넷 연결을 확인하고 다시 시도해주세요.`;
      setDeleteError(detail);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.ocean[500]} />
        <Text style={styles.loadingText}>설정을 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <LinearGradient colors={[Colors.ocean[600], Colors.primary[700], Colors.primary[900]]} style={styles.header}>
          <View style={styles.headerContent}>
            <Settings size={28} color={Colors.neutral[0]} strokeWidth={2} />
            <Text style={styles.headerTitle}>설정</Text>
            <View style={styles.headerRight}>
              <NotificationBell userId={user?.id ?? null} />
            </View>
          </View>
          {user ? (
            <View style={styles.userInfo}>
              <Text style={styles.userEmail}>{user.email}</Text>
              <Text style={styles.userNick}>{profile?.nickname || '낚시꾼'}{profile?.is_admin ? ' (관리자)' : ''}</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.loginPrompt} onPress={() => router.push('/login')}>
              <LogIn size={16} color={Colors.neutral[0]} strokeWidth={2} />
              <Text style={styles.loginPromptText}>로그인하여 모든 기능을 이용하세요</Text>
            </TouchableOpacity>
          )}
        </LinearGradient>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell size={20} color={Colors.ocean[600]} strokeWidth={2} />
            <Text style={styles.sectionTitle}>알림 설정</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.ocean[100] }]}>
                  {notifTide ? <Bell size={18} color={Colors.ocean[600]} strokeWidth={2} /> : <BellOff size={18} color={Colors.neutral[400]} strokeWidth={2} />}
                </View>
                <View>
                  <Text style={styles.settingLabel}>물때/날씨 알림</Text>
                  <Text style={styles.settingDesc}>선택한 지역의 물때와 날씨 변화를 알려드려요</Text>
                </View>
              </View>
              <Switch value={notifTide} onValueChange={handleNotifTide} trackColor={{ false: Colors.neutral[200], true: Colors.ocean[500] }} thumbColor={Colors.neutral[0]} />
            </View>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.ocean[100] }]}>
                  {notifCommunity ? <Bell size={18} color={Colors.ocean[600]} strokeWidth={2} /> : <BellOff size={18} color={Colors.neutral[400]} strokeWidth={2} />}
                </View>
                <View>
                  <Text style={styles.settingLabel}>커뮤니티 댓글/좋아요 알림</Text>
                  <Text style={styles.settingDesc}>내 게시글의 새 댓글과 반응을 알려드려요</Text>
                </View>
              </View>
              <Switch value={notifCommunity} onValueChange={handleNotifCommunity} trackColor={{ false: Colors.neutral[200], true: Colors.ocean[500] }} thumbColor={Colors.neutral[0]} />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Gauge size={20} color={Colors.ocean[600]} strokeWidth={2} />
            <Text style={styles.sectionTitle}>데이터 / 단위 설정</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow} onPress={() => setRegionPicker(!regionPicker)}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.ocean[100] }]}>
                  <MapPin size={18} color={Colors.ocean[600]} strokeWidth={2} />
                </View>
                <View>
                  <Text style={styles.settingLabel}>기본 시작 지역</Text>
                  <Text style={styles.settingDesc}>앱 시작 시 표시할 지역을 선택하세요</Text>
                </View>
              </View>
              <View style={styles.chevronRow}>
                <Text style={styles.chevronValue}>{selectedRegion}</Text>
                <ChevronRight size={18} color={Colors.neutral[400]} strokeWidth={2} />
              </View>
            </TouchableOpacity>
            {regionPicker && (
              <View style={styles.regionPickerList}>
                <ScrollView style={styles.regionScroll} nestedScrollEnabled={true}>
                  {REGIONS.map((r) => (
                    <TouchableOpacity key={r.name} style={[styles.regionPickerItem, selectedRegion === r.name && { backgroundColor: Colors.ocean[50] }]} onPress={() => handleSelectRegion(r.name)}>
                      <MapPin size={16} color={selectedRegion === r.name ? Colors.ocean[600] : Colors.neutral[500]} strokeWidth={2} />
                      <Text style={[styles.regionPickerText, selectedRegion === r.name && { color: Colors.ocean[700] }]}>{r.name}</Text>
                      {selectedRegion === r.name && <Check size={16} color={Colors.ocean[600]} strokeWidth={2} style={{ marginLeft: 'auto' }} />}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.ocean[100] }]}>
                  <Gauge size={18} color={Colors.ocean[600]} strokeWidth={2} />
                </View>
                <View>
                  <Text style={styles.settingLabel}>풍속 단위</Text>
                  <Text style={styles.settingDesc}>바다 날씨 풍속 표시 단위</Text>
                </View>
              </View>
              <View style={styles.unitToggle}>
                <TouchableOpacity style={[styles.unitBtn, windUnit === 'm/s' && { backgroundColor: Colors.ocean[600] }]} onPress={() => handleWindUnit('m/s')}>
                  <Text style={[styles.unitBtnText, windUnit === 'm/s' && { color: Colors.neutral[0] }]}>m/s</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.unitBtn, windUnit === 'knot' && { backgroundColor: Colors.ocean[600] }]} onPress={() => handleWindUnit('knot')}>
                  <Text style={[styles.unitBtnText, windUnit === 'knot' && { color: Colors.neutral[0] }]}>knot</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={20} color={Colors.ocean[600]} strokeWidth={2} />
            <Text style={styles.sectionTitle}>앱 정보 및 지원</Text>
          </View>
          <View style={styles.card}>
            <TouchableOpacity style={styles.settingRow} onPress={() => setTermsModal('privacy')}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.primary[100] }]}>
                  <Shield size={18} color={Colors.primary[600]} strokeWidth={2} />
                </View>
                <Text style={styles.settingLabel}>개인정보 처리방침</Text>
              </View>
              <ChevronRight size={18} color={Colors.neutral[400]} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={() => setTermsModal('terms')}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.primary[100] }]}>
                  <FileText size={18} color={Colors.primary[600]} strokeWidth={2} />
                </View>
                <Text style={styles.settingLabel}>서비스 이용약관</Text>
              </View>
              <ChevronRight size={18} color={Colors.neutral[400]} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.settingRow} onPress={() => setFeedbackModal(true)}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.accent[100] }]}>
                  <MessageSquare size={18} color={Colors.accent[600]} strokeWidth={2} />
                </View>
                <Text style={styles.settingLabel}>오류 제보 및 피드백</Text>
              </View>
              <ChevronRight size={18} color={Colors.neutral[400]} strokeWidth={2} />
            </TouchableOpacity>
            <View style={styles.divider} />
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: Colors.neutral[100] }]}>
                  <Info size={18} color={Colors.neutral[500]} strokeWidth={2} />
                </View>
                <Text style={styles.settingLabel}>앱 버전</Text>
              </View>
              <Text style={styles.versionText}>v1.0.0</Text>
            </View>
          </View>
          <Text style={styles.attributionText}>조석 데이터 제공: 국립해양조사원 (KHOA)</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info size={20} color={Colors.neutral[500]} strokeWidth={2} />
            <Text style={styles.sectionTitle}>계정 관리</Text>
          </View>
          <View style={styles.card}>
            {user ? (
              <>
                <TouchableOpacity style={styles.settingRow} onPress={handleSignOut}>
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: Colors.neutral[100] }]}>
                      <LogOut size={18} color={Colors.neutral[500]} strokeWidth={2} />
                    </View>
                    <Text style={styles.settingLabel}>로그아웃</Text>
                  </View>
                  <ChevronRight size={18} color={Colors.neutral[400]} strokeWidth={2} />
                </TouchableOpacity>
                <View style={styles.divider} />
                <TouchableOpacity style={styles.settingRow} onPress={handleDeleteAccount}>
                  <View style={styles.settingLeft}>
                    <View style={[styles.settingIcon, { backgroundColor: Colors.error[100] }]}>
                      <UserX size={18} color={Colors.error[500]} strokeWidth={2} />
                    </View>
                    <Text style={[styles.settingLabel, { color: Colors.error[600] }]}>회원 탈퇴</Text>
                  </View>
                  <ChevronRight size={18} color={Colors.error[400]} strokeWidth={2} />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/login')}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: Colors.ocean[100] }]}>
                    <LogIn size={18} color={Colors.ocean[600]} strokeWidth={2} />
                  </View>
                  <Text style={styles.settingLabel}>로그인</Text>
                </View>
                <ChevronRight size={18} color={Colors.neutral[400]} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isAdmin && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ShieldAlert size={20} color={Colors.error[600]} strokeWidth={2} />
              <Text style={styles.sectionTitle}>관리자</Text>
            </View>
            <View style={styles.card}>
              <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/admin')}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: Colors.error[100] }]}>
                    <ShieldAlert size={18} color={Colors.error[600]} strokeWidth={2} />
                  </View>
                  <Text style={[styles.settingLabel, { color: Colors.error[600] }]}>관리자 모드</Text>
                </View>
                <ChevronRight size={18} color={Colors.error[400]} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.ageNotice}>
          <Info size={14} color={Colors.neutral[400]} strokeWidth={2} />
          <Text style={styles.ageNoticeText}>만 14세 이상만 가입 가능합니다</Text>
        </View>

        {saving && (
          <View style={styles.savingOverlay}>
            <ActivityIndicator size="small" color={Colors.neutral[0]} />
          </View>
        )}
      </ScrollView>
      <AdBanner />

      <Modal visible={termsModal !== null} animationType="slide" transparent={true} onRequestClose={() => setTermsModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.termsContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{termsModal === 'privacy' ? '개인정보 처리방침' : '서비스 이용약관'}</Text>
              <TouchableOpacity onPress={() => setTermsModal(null)}><Text style={{ fontSize: 24, color: Colors.neutral[500] }}>×</Text></TouchableOpacity>
            </View>
            <ScrollView style={styles.termsBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.termsText}>{termsModal === 'privacy' ? PRIVACY_POLICY : TERMS_OF_SERVICE}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={feedbackModal} animationType="slide" transparent={true} onRequestClose={() => setFeedbackModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.feedbackContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>오류 제보 및 피드백</Text>
              <TouchableOpacity onPress={() => setFeedbackModal(false)}><Text style={{ fontSize: 24, color: Colors.neutral[500] }}>×</Text></TouchableOpacity>
            </View>
            <View style={styles.feedbackBody}>
              <Text style={styles.feedbackHint}>접수처: dolphin9703@naver.com</Text>
              <TextInput style={styles.feedbackInput} value={feedbackContent} onChangeText={setFeedbackContent} placeholder="오류 내용, 개선 제안 등을 자유롭게 적어주세요" placeholderTextColor={Colors.neutral[400]} multiline numberOfLines={5} textAlignVertical="top" />
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitFeedback} disabled={feedbackSubmitting}>
                {feedbackSubmitting ? <ActivityIndicator size="small" color={Colors.neutral[0]} /> : <Text style={styles.submitBtnText}>전송</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={deleteConfirm} animationType="fade" transparent={true} onRequestClose={() => !deleting && setDeleteConfirm(false)}>
        <View style={styles.deleteOverlay}>
          <View style={styles.deleteCard}>
            <View style={styles.deleteIconWrap}>
              <UserX size={32} color={Colors.error[600]} strokeWidth={2} />
            </View>
            <Text style={styles.deleteTitle}>회원 탈퇴</Text>
            <Text style={styles.deleteDesc}>정말 탈퇴하시겠습니까?</Text>
            <Text style={styles.deleteWarning}>조과 기록, 게시글, 댓글, 프로필 등 모든 데이터가 즉시 영구 삭제되며 되돌릴 수 없습니다.</Text>
            {deleteError && (
              <ScrollView style={styles.deleteErrorScroll} nestedScrollEnabled={true}>
                <Text style={styles.deleteErrorText}>{deleteError}</Text>
              </ScrollView>
            )}
            <View style={styles.deleteBtnRow}>
              <TouchableOpacity style={styles.deleteCancelBtn} onPress={() => setDeleteConfirm(false)} disabled={deleting} activeOpacity={0.7}>
                <Text style={styles.deleteCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmDeleteAccount} disabled={deleting} activeOpacity={0.7}>
                {deleting
                  ? <ActivityIndicator size="small" color={Colors.neutral[0]} />
                  : <Text style={styles.deleteConfirmText}>탈퇴 확정</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  content: { paddingBottom: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral[50] },
  loadingText: { marginTop: Spacing.sm, fontSize: 14, color: Colors.neutral[500] },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: Typography.h1.fontSize, fontWeight: '700', color: Colors.neutral[0], flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  userInfo: { marginTop: Spacing.md },
  userEmail: { fontSize: 14, color: Colors.neutral[100] },
  userNick: { fontSize: 16, fontWeight: '600', color: Colors.neutral[0], marginTop: 2 },
  loginPrompt: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.md, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.md, alignSelf: 'flex-start' },
  loginPromptText: { fontSize: 13, color: Colors.neutral[0], fontWeight: '600' },
  section: { paddingHorizontal: Spacing.md, paddingTop: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: Typography.h3.fontSize, fontWeight: '600', color: Colors.neutral[800] },
  card: { backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, overflow: 'hidden', shadowColor: Colors.neutral[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.md },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  settingLabel: { fontSize: 15, fontWeight: '600', color: Colors.neutral[800] },
  settingDesc: { fontSize: 12, color: Colors.neutral[400], marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.neutral[100], marginLeft: 60 },
  chevronRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chevronValue: { fontSize: 14, fontWeight: '600', color: Colors.ocean[600] },
  regionPickerList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.md },
  regionScroll: { maxHeight: 200 },
  regionPickerItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: Spacing.sm, borderRadius: Radius.sm },
  regionPickerText: { fontSize: 14, fontWeight: '500', color: Colors.neutral[700] },
  unitToggle: { flexDirection: 'row', backgroundColor: Colors.neutral[100], borderRadius: Radius.sm, padding: 2 },
  unitBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  unitBtnText: { fontSize: 13, fontWeight: '600', color: Colors.neutral[500] },
  versionText: { fontSize: 14, fontWeight: '600', color: Colors.neutral[400] },
  attributionText: { fontSize: 11, color: Colors.neutral[400], textAlign: 'center', marginTop: Spacing.sm, fontWeight: '500' },
  ageNotice: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingVertical: Spacing.lg },
  ageNoticeText: { fontSize: 12, color: Colors.neutral[400] },
  savingOverlay: { position: 'absolute', bottom: Spacing.lg, alignSelf: 'center', backgroundColor: Colors.neutral[800], paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  termsContent: { backgroundColor: Colors.neutral[0], borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  modalTitle: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.neutral[800] },
  termsBody: { padding: Spacing.md },
  termsText: { fontSize: 14, color: Colors.neutral[600], lineHeight: 22 },
  feedbackContent: { backgroundColor: Colors.neutral[0], borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '60%' },
  feedbackBody: { padding: Spacing.md },
  feedbackHint: { fontSize: 12, color: Colors.neutral[400], marginBottom: Spacing.sm },
  feedbackInput: { backgroundColor: Colors.neutral[50], borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200], fontSize: 15, color: Colors.neutral[800], minHeight: 120, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: Colors.ocean[600], borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.neutral[0] },
  deleteOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  deleteCard: { backgroundColor: Colors.neutral[0], borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', maxWidth: 380, maxHeight: '85%' },
  deleteIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.error[100], justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  deleteTitle: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.neutral[800], marginBottom: 6 },
  deleteDesc: { fontSize: 14, color: Colors.neutral[600], textAlign: 'center', marginBottom: Spacing.sm },
  deleteWarning: { fontSize: 12, color: Colors.error[500], textAlign: 'center', lineHeight: 18, marginBottom: Spacing.lg },
  deleteErrorScroll: { maxHeight: 300, marginBottom: Spacing.md, width: '100%', backgroundColor: Colors.error[50], borderRadius: Radius.md, padding: Spacing.sm, borderWidth: 1, borderColor: Colors.error[100] },
  deleteErrorText: { fontSize: 11, color: Colors.error[600], fontWeight: '500', lineHeight: 16, fontFamily: 'monospace' },
  deleteBtnRow: { flexDirection: 'row', gap: 10, width: '100%' },
  deleteCancelBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.neutral[100], alignItems: 'center', justifyContent: 'center' },
  deleteCancelText: { fontSize: 15, fontWeight: '700', color: Colors.neutral[600] },
  deleteConfirmBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.error[600], alignItems: 'center', justifyContent: 'center' },
  deleteConfirmText: { fontSize: 15, fontWeight: '700', color: Colors.neutral[0] },
});
