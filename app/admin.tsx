import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Shield, Trash2, Flag, UserX, Eye, EyeOff, ChevronRight, Ban } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/useAuth';
import AdBanner from '@/components/AdBanner';
import type { PointPost, PointComment, Report, UserProfile, Catch } from '@/lib/types';

export default function AdminScreen() {
  const { user, profile, isAdmin } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'reports' | 'posts' | 'users'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [posts, setPosts] = useState<PointPost[]>([]);
  const [comments, setComments] = useState<PointComment[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [catches, setCatches] = useState<Catch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!isAdmin) { setLoading(false); return; }
    try {
      const [{ data: rData }, { data: pData }, { data: cData }, { data: uData }, { data: catchData }] = await Promise.all([
        supabase.from('reports').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('point_posts').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('point_comments').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('user_profiles').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('catches').select('*').order('created_at', { ascending: false }).limit(50),
      ]);
      setReports((rData as Report[]) || []);
      setPosts((pData as PointPost[]) || []);
      setComments((cData as PointComment[]) || []);
      setUsers((uData as UserProfile[]) || []);
      setCatches((catchData as Catch[]) || []);
    } catch (e) {
      console.warn('[Admin] data load error:', e);
    }
    setLoading(false);
    setRefreshing(false);
  }, [isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = () => { setRefreshing(true); loadData(); };

  const deletePost = (id: string) => {
    Alert.alert('게시글 삭제', '이 게시글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await supabase.from('point_posts').delete().eq('id', id);
        loadData();
      }},
    ]);
  };

  const toggleBlindPost = (post: PointPost) => {
    const newBlind = !post.is_blind;
    Alert.alert(newBlind ? '숨김 처리' : '숨김 해제', `이 게시글을 ${newBlind ? '숨김' : '공개'} 처리하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '확인', onPress: async () => {
        await supabase.from('point_posts').update({ is_blind: newBlind }).eq('id', post.id);
        loadData();
      }},
    ]);
  };

  const deleteComment = (id: string) => {
    Alert.alert('댓글 삭제', '이 댓글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await supabase.from('point_comments').delete().eq('id', id);
        loadData();
      }},
    ]);
  };

  const toggleBlindComment = (comment: PointComment) => {
    const newBlind = !comment.is_blind;
    Alert.alert(newBlind ? '숨김 처리' : '숨김 해제', `이 댓글을 ${newBlind ? '숨김' : '공개'} 처리하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '확인', onPress: async () => {
        await supabase.from('point_comments').update({ is_blind: newBlind }).eq('id', comment.id);
        loadData();
      }},
    ]);
  };

  const deleteReport = (id: string) => {
    Alert.alert('신고 삭제', '이 신고 내역을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await supabase.from('reports').delete().eq('id', id);
        loadData();
      }},
    ]);
  };

  const toggleBanUser = (u: UserProfile) => {
    const newBan = !u.is_banned;
    Alert.alert(newBan ? '계정 정지' : '계정 정지 해제', `${u.nickname}님을 ${newBan ? '정지' : '정지 해제'}하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      { text: '확인', onPress: async () => {
        await supabase.from('user_profiles').update({ is_banned: newBan }).eq('id', u.id);
        loadData();
      }},
    ]);
  };

  const deleteCatch = (id: string) => {
    Alert.alert('조과 기록 삭제', '이 조과 기록을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        await supabase.from('catches').delete().eq('id', id);
        loadData();
      }},
    ]);
  };

  if (!isAdmin) {
    return (
      <View style={styles.accessDenied}>
        <Shield size={48} color={Colors.neutral[300]} strokeWidth={1.5} />
        <Text style={styles.accessDeniedTitle}>접근 권한 없음</Text>
        <Text style={styles.accessDeniedDesc}>관리자 계정으로 로그인해야 접근할 수 있습니다.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)/settings')}>
          <Text style={styles.backBtnText}>설정으로 돌아가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.ocean[500]} />
        <Text style={styles.loadingText}>관리자 데이터를 불러오는 중...</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.ocean[500]} />}
      >
        <LinearGradient colors={[Colors.error[600], Colors.error[500], Colors.neutral[900]]} style={styles.header}>
          <View style={styles.headerContent}>
            <Shield size={28} color={Colors.neutral[0]} strokeWidth={2} />
            <Text style={styles.headerTitle}>관리자 모드</Text>
          </View>
          <Text style={styles.headerSubtitle}>신고 내역, 게시글, 사용자 관리</Text>
        </LinearGradient>

        <View style={styles.tabBar}>
          <TouchableOpacity style={[styles.tab, tab === 'reports' && styles.tabActive]} onPress={() => setTab('reports')}>
            <Flag size={16} color={tab === 'reports' ? Colors.neutral[0] : Colors.neutral[500]} strokeWidth={2} />
            <Text style={[styles.tabText, tab === 'reports' && styles.tabTextActive]}>신고 ({reports.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'posts' && styles.tabActive]} onPress={() => setTab('posts')}>
            <Eye size={16} color={tab === 'posts' ? Colors.neutral[0] : Colors.neutral[500]} strokeWidth={2} />
            <Text style={[styles.tabText, tab === 'posts' && styles.tabTextActive]}>게시글 ({posts.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tab, tab === 'users' && styles.tabActive]} onPress={() => setTab('users')}>
            <UserX size={16} color={tab === 'users' ? Colors.neutral[0] : Colors.neutral[500]} strokeWidth={2} />
            <Text style={[styles.tabText, tab === 'users' && styles.tabTextActive]}>사용자 ({users.length})</Text>
          </TouchableOpacity>
        </View>

        {tab === 'reports' && (
          <View style={styles.section}>
            {reports.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>신고 내역이 없습니다.</Text></View>
            ) : (
              reports.map((r) => (
                <View key={r.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Flag size={16} color={Colors.error[500]} strokeWidth={2} />
                    <Text style={styles.cardTitle}>신고 사유: {r.reason}</Text>
                  </View>
                  <Text style={styles.cardMeta}>신고자 ID: {r.reporter_id?.slice(0, 8) || '알 수 없음'}</Text>
                  {r.post_id && <Text style={styles.cardMeta}>게시글 ID: {r.post_id.slice(0, 8)}...</Text>}
                  {r.comment_id && <Text style={styles.cardMeta}>댓글 ID: {r.comment_id.slice(0, 8)}...</Text>}
                  <Text style={styles.cardMeta}>일시: {new Date(r.created_at).toLocaleString('ko-KR')}</Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.error[50] }]} onPress={() => deleteReport(r.id)}>
                      <Trash2 size={16} color={Colors.error[600]} strokeWidth={2} />
                      <Text style={[styles.actionBtnText, { color: Colors.error[600] }]}>신고 삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {tab === 'posts' && (
          <View style={styles.section}>
            {posts.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>게시글이 없습니다.</Text></View>
            ) : (
              posts.map((p) => (
                <View key={p.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle} numberOfLines={1}>{p.title}</Text>
                    {p.is_blind && <View style={styles.blindBadge}><Text style={styles.blindBadgeText}>숨김</Text></View>}
                  </View>
                  <Text style={styles.cardMeta}>작성자: {p.author_name}</Text>
                  <Text style={styles.cardMeta} numberOfLines={2}>{p.content || ''}</Text>
                  <Text style={styles.cardMeta}>일시: {new Date(p.created_at).toLocaleString('ko-KR')}</Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => toggleBlindPost(p)}>
                      {p.is_blind ? <Eye size={16} color={Colors.ocean[600]} strokeWidth={2} /> : <EyeOff size={16} color={Colors.warning[600]} strokeWidth={2} />}
                      <Text style={styles.actionBtnText}>{p.is_blind ? '공개' : '숨김'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.error[50] }]} onPress={() => deletePost(p.id)}>
                      <Trash2 size={16} color={Colors.error[600]} strokeWidth={2} />
                      <Text style={[styles.actionBtnText, { color: Colors.error[600] }]}>삭제</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            {comments.length > 0 && (
              <View style={styles.subSection}>
                <Text style={styles.subSectionTitle}>댓글 관리</Text>
                {comments.map((c) => (
                  <View key={c.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardMeta}>작성자: {c.author_name}</Text>
                      {c.is_blind && <View style={styles.blindBadge}><Text style={styles.blindBadgeText}>숨김</Text></View>}
                    </View>
                    <Text style={styles.cardMeta} numberOfLines={2}>{c.content}</Text>
                    <View style={styles.cardActions}>
                      <TouchableOpacity style={styles.actionBtn} onPress={() => toggleBlindComment(c)}>
                        {c.is_blind ? <Eye size={16} color={Colors.ocean[600]} strokeWidth={2} /> : <EyeOff size={16} color={Colors.warning[600]} strokeWidth={2} />}
                        <Text style={styles.actionBtnText}>{c.is_blind ? '공개' : '숨김'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.error[50] }]} onPress={() => deleteComment(c.id)}>
                        <Trash2 size={16} color={Colors.error[600]} strokeWidth={2} />
                        <Text style={[styles.actionBtnText, { color: Colors.error[600] }]}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {tab === 'users' && (
          <View style={styles.section}>
            {users.length === 0 ? (
              <View style={styles.emptyCard}><Text style={styles.emptyText}>사용자가 없습니다.</Text></View>
            ) : (
              users.map((u) => (
                <View key={u.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{u.nickname}</Text>
                    {u.is_admin && <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>관리자</Text></View>}
                    {u.is_banned && <View style={styles.banBadge}><Text style={styles.banBadgeText}>정지</Text></View>}
                  </View>
                  <Text style={styles.cardMeta}>가입: {new Date(u.created_at).toLocaleDateString('ko-KR')}</Text>
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={[styles.actionBtn, u.is_banned ? { backgroundColor: Colors.success[50] } : { backgroundColor: Colors.error[50] }]} onPress={() => toggleBanUser(u)}>
                      <Ban size={16} color={u.is_banned ? Colors.success[600] : Colors.error[600]} strokeWidth={2} />
                      <Text style={[styles.actionBtnText, { color: u.is_banned ? Colors.success[600] : Colors.error[600] }]}>{u.is_banned ? '정지 해제' : '계정 정지'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
            {catches.length > 0 && (
              <View style={styles.subSection}>
                <Text style={styles.subSectionTitle}>조과 기록 관리</Text>
                {catches.map((c) => (
                  <View key={c.id} style={styles.card}>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle}>{c.species}</Text>
                    </View>
                    <Text style={styles.cardMeta}>포인트: {c.point || '미지정'} · 지역: {c.region || '미지정'}</Text>
                    <Text style={styles.cardMeta}>날짜: {c.caught_at}</Text>
                    <View style={styles.cardActions}>
                      <TouchableOpacity style={[styles.actionBtn, { backgroundColor: Colors.error[50] }]} onPress={() => deleteCatch(c.id)}>
                        <Trash2 size={16} color={Colors.error[600]} strokeWidth={2} />
                        <Text style={[styles.actionBtnText, { color: Colors.error[600] }]}>삭제</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
      <AdBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  content: { paddingBottom: Spacing.xxl },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral[50] },
  loadingText: { marginTop: Spacing.sm, fontSize: 14, color: Colors.neutral[500] },
  accessDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.neutral[50], paddingHorizontal: Spacing.xl },
  accessDeniedTitle: { fontSize: Typography.h2.fontSize, fontWeight: '600', color: Colors.neutral[600], marginTop: Spacing.md },
  accessDeniedDesc: { fontSize: 14, color: Colors.neutral[400], marginTop: 4, textAlign: 'center' },
  backBtn: { marginTop: Spacing.lg, backgroundColor: Colors.ocean[600], paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.md },
  backBtnText: { fontSize: 15, fontWeight: '600', color: Colors.neutral[0] },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: Typography.h1.fontSize, fontWeight: '700', color: Colors.neutral[0] },
  headerSubtitle: { fontSize: 14, color: Colors.neutral[100], marginTop: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: Colors.neutral[0], borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Spacing.md },
  tabActive: { borderBottomWidth: 3, borderBottomColor: Colors.error[600] },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.neutral[500] },
  tabTextActive: { color: Colors.error[600] },
  section: { padding: Spacing.md, gap: Spacing.sm },
  subSection: { marginTop: Spacing.lg },
  subSectionTitle: { fontSize: Typography.h3.fontSize, fontWeight: '600', color: Colors.neutral[700], marginBottom: Spacing.sm },
  card: { backgroundColor: Colors.neutral[0], borderRadius: Radius.lg, padding: Spacing.md, shadowColor: Colors.neutral[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.neutral[800], flex: 1 },
  cardMeta: { fontSize: 12, color: Colors.neutral[500], marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: Spacing.sm },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.ocean[50], paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.sm },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: Colors.ocean[600] },
  blindBadge: { backgroundColor: Colors.warning[100], paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  blindBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.warning[600] },
  adminBadge: { backgroundColor: Colors.primary[100], paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  adminBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.primary[600] },
  banBadge: { backgroundColor: Colors.error[100], paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  banBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.error[600] },
  emptyCard: { backgroundColor: Colors.neutral[0], borderRadius: Radius.md, padding: Spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.neutral[400] },
});
