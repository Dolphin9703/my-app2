import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, ActivityIndicator, FlatList, Image, Alert, Platform, KeyboardAvoidingView,
} from 'react-native';
import { MapPin, Fish, MessageCircle, Send, X, Plus, ChevronLeft, Clock, Trash2, MapPinned, Waves, Anchor, Building2, Heart, LocateFixed, Camera, Flag } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { REGIONS, getRegionByName } from '@/lib/regions';
import { buildMapHtml } from '@/lib/mapHtml';
import { getTodayTides, getTideDescription } from '@/lib/tide';
import { validateContent } from '@/lib/moderation';
import { useAuth } from '@/lib/useAuth';
import MapView from '@/components/MapView';
import AdBanner from '@/components/AdBanner';
import NotificationBell from '@/components/NotificationBell';
import type { FishingPoint, PointPost, PointComment, TideInfo, FavoritePoint, Catch } from '@/lib/types';

interface MapMessage { type: string; id?: string; region?: string; }

export default function MapScreen() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [points, setPoints] = useState<FishingPoint[]>([]);
  const [favorites, setFavorites] = useState<FavoritePoint[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedPoint, setSelectedPoint] = useState<FishingPoint | null>(null);
  const [pointTides, setPointTides] = useState<TideInfo[]>([]);
  const [detailModal, setDetailModal] = useState(false);
  const [posts, setPosts] = useState<PointPost[]>([]);
  const [comments, setComments] = useState<Record<string, PointComment[]>>({});
  const [recentCatches, setRecentCatches] = useState<Catch[]>([]);
  const [communityModal, setCommunityModal] = useState(false);
  const [postModal, setPostModal] = useState(false);
  const [activePost, setActivePost] = useState<PointPost | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regionFocus, setRegionFocus] = useState<{ region: string; lat: number; lon: number; nonce: number } | null>(null);
  const [gpsFocus, setGpsFocus] = useState<{ lat: number; lon: number; nonce: number } | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostPhoto, setNewPostPhoto] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [reportModal, setReportModal] = useState(false);
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  const loadPoints = useCallback(async () => {
    const { data } = await supabase.from('fishing_points').select('*').order('region').order('name');
    setPoints((data as FishingPoint[]) || []);
    setLoading(false);
  }, []);

  const loadFavorites = useCallback(async () => {
    const { data } = await supabase.from('point_favorites').select('*').order('created_at', { ascending: false });
    setFavorites((data as FavoritePoint[]) || []);
  }, []);

  useEffect(() => { loadPoints(); loadFavorites(); }, [loadPoints, loadFavorites]);

  const loadPosts = useCallback(async (pointId: string) => {
    const { data } = await supabase.from('point_posts').select('*').eq('point_id', pointId).order('created_at', { ascending: false });
    const postList = (data as PointPost[]) || [];
    setPosts(postList);
    const commentMap: Record<string, PointComment[]> = {};
    for (const post of postList) {
      const { data: cData } = await supabase.from('point_comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
      commentMap[post.id] = (cData as PointComment[]) || [];
    }
    setComments(commentMap);
  }, []);

  const loadRecentCatches = useCallback(async (pointName: string) => {
    const { data } = await supabase.from('catches').select('*').ilike('point', `%${pointName}%`).not('photo_url', 'is', null).order('created_at', { ascending: false }).limit(6);
    setRecentCatches((data as Catch[]) || []);
  }, []);

  const handleMapMessage = useCallback((msg: MapMessage) => {
    if (msg.type === 'selectPoint' && msg.id) {
      const point = points.find((p) => p.id === msg.id);
      if (point) {
        setSelectedPoint(point);
        setPointTides(getTodayTides(new Date(), point.lat, point.lon));
        setIsFavorite(favorites.some((f) => f.point_id === point.id));
        setDetailModal(true);
        loadRecentCatches(point.name);
      }
    }
  }, [points, favorites, loadRecentCatches]);

  const focusRegion = (regionName: string) => {
    const region = getRegionByName(regionName);
    if (region) setRegionFocus({ region: regionName, lat: region.lat, lon: region.lon, nonce: Date.now() });
  };

  const handleGps = () => {
    if (Platform.OS === 'web') {
      if (!navigator.geolocation) { Alert.alert('오류', '이 브라우저에서는 위치 기능을 지원하지 않습니다.'); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => setGpsFocus({ lat: pos.coords.latitude, lon: pos.coords.longitude, nonce: Date.now() }),
        () => Alert.alert('위치 오류', '현재 위치를 가져올 수 없습니다.'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      Alert.alert('위치 기능', '위치 권한을 허용해주세요.');
    }
  };

  const toggleFavorite = async () => {
    if (!selectedPoint) return;
    const existing = favorites.find((f) => f.point_id === selectedPoint.id);
    if (existing) {
      await supabase.from('point_favorites').delete().eq('id', existing.id);
      setFavorites((prev) => prev.filter((f) => f.id !== existing.id));
      setIsFavorite(false);
    } else {
      const { data } = await supabase.from('point_favorites').insert({ point_id: selectedPoint.id, point_name: selectedPoint.name }).select().single();
      if (data) { setFavorites((prev) => [data as FavoritePoint, ...prev]); setIsFavorite(true); }
    }
  };

  const openCommunity = () => {
    if (!selectedPoint) return;
    setDetailModal(false);
    setCommunityModal(true);
    loadPosts(selectedPoint.id);
  };

  const requireAuth = () => {
    if (!user) {
      Alert.alert('로그인 필요', '이 기능을 사용하려면 로그인이 필요합니다.', [
        { text: '취소', style: 'cancel' },
        { text: '로그인', onPress: () => router.push('/login') },
      ]);
      return false;
    }
    if (profile?.is_banned) {
      Alert.alert('계정 제한', '신고 누적으로 글쓰기가 제한되었습니다.');
      return false;
    }
    return true;
  };

  const pickPostPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 });
    if (!result.canceled && result.assets.length > 0) setNewPostPhoto(result.assets[0].uri);
  };

  const uploadPhoto = async (uri: string): Promise<string | null> => {
    try {
      const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `post_${Date.now()}.${fileExt}`;
      const formData = new FormData();
      formData.append('file', { uri, name: fileName, type: `image/${fileExt}` } as any);
      const { error: uploadError } = await supabase.storage.from('fish-photos').upload(fileName, formData);
      if (uploadError) return null;
      const { data } = supabase.storage.from('fish-photos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch { return null; }
  };

  const handleSubmitPost = async () => {
    if (!selectedPoint || !newPostTitle.trim()) { setError('제목을 입력해주세요.'); return; }
    if (!requireAuth()) return;
    const contentCheck = validateContent(newPostTitle + ' ' + newPostContent);
    if (!contentCheck.valid) { setError(contentCheck.message); return; }
    setSubmitting(true); setError(null);
    let photoUrl: string | null = null;
    if (newPostPhoto) photoUrl = await uploadPhoto(newPostPhoto);
    const { error: insertError } = await supabase.from('point_posts').insert({
      point_id: selectedPoint.id, user_id: user!.id, author_name: profile?.nickname || '낚시꾼',
      title: newPostTitle.trim(), content: newPostContent.trim() || null, photo_url: photoUrl,
    });
    if (insertError) { setError('게시글 등록에 실패했습니다.'); setSubmitting(false); return; }
    setSubmitting(false); setPostModal(false);
    setNewPostTitle(''); setNewPostContent(''); setNewPostPhoto(null);
    loadPosts(selectedPoint.id);
  };

  const handleSubmitComment = async (postId: string) => {
    if (!newComment.trim()) return;
    if (!requireAuth()) return;
    const contentCheck = validateContent(newComment);
    if (!contentCheck.valid) { Alert.alert('금지어 감지', contentCheck.message); return; }
    const { data, error: insertError } = await supabase.from('point_comments').insert({
      post_id: postId, user_id: user!.id, author_name: profile?.nickname || '낚시꾼', content: newComment.trim(),
    }).select().single();
    if (!insertError && data) {
      setComments((prev) => ({ ...prev, [postId]: [...(prev[postId] || []), data as PointComment] }));
      setNewComment('');
    }
  };

  const handleDeletePost = (postId: string) => {
    Alert.alert('삭제 확인', '이 게시글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('point_posts').delete().eq('id', postId);
        if (!error && selectedPoint) { loadPosts(selectedPoint.id); setActivePost(null); }
      }},
    ]);
  };

  const handleDeleteComment = (commentId: string, postId: string) => {
    Alert.alert('삭제 확인', '이 댓글을 삭제하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: async () => {
        const { error } = await supabase.from('point_comments').delete().eq('id', commentId);
        if (!error) { setComments((prev) => ({ ...prev, [postId]: (prev[postId] || []).filter((c) => c.id !== commentId) })); }
      }},
    ]);
  };

  const openReport = (postId: string | null, commentId: string | null) => {
    if (!requireAuth()) return;
    setReportingPostId(postId);
    setReportingCommentId(commentId);
    setReportReason('');
    setReportModal(true);
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim()) { Alert.alert('사유 입력', '신고 사유를 입력해주세요.'); return; }
    if (!user) return;
    const { error } = await supabase.from('reports').insert({
      reporter_id: user.id, post_id: reportingPostId, comment_id: reportingCommentId, reason: reportReason.trim(),
    });
    if (error) {
      if (error.code === '23505') { Alert.alert('중복 신고', '이미 신고한 게시물입니다.'); }
      else { Alert.alert('오류', '신고 접수에 실패했습니다.'); }
      return;
    }
    Alert.alert('신고 완료', '신고가 접수되었습니다. 관리자가 검토 후 조치할 예정입니다.');
    setReportModal(false);
    setReportReason('');
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.ocean[500]} />
        <Text style={styles.loadingText}>지도를 불러오는 중...</Text>
      </View>
    );
  }

  const displayPoints = showFavoritesOnly ? points.filter((p) => favorites.some((f) => f.point_id === p.id)) : points;
  const mapHtml = buildMapHtml(displayPoints);
  const tideDesc = pointTides.length > 0 ? getTideDescription(pointTides) : '';

  const renderPointTypeIcon = (type: string | null | undefined) => {
    const t = type || '갯바위';
    if (t === '방파제') return <Building2 size={16} color={Colors.primary[600]} strokeWidth={2} />;
    if (t === '선착장') return <Anchor size={16} color={Colors.success[600]} strokeWidth={2} />;
    return <MapPin size={16} color={Colors.ocean[600]} strokeWidth={2} />;
  };

  const canManagePost = (post: PointPost) => user && post.user_id === user.id;
  const canManageComment = (comment: PointComment) => user && comment.user_id === user.id;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.ocean[600], Colors.primary[700], Colors.primary[900]]} style={styles.header}>
        <View style={styles.headerContent}>
          <MapPinned size={28} color={Colors.neutral[0]} strokeWidth={2} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>낚시 지도</Text>
            <Text style={styles.headerSubtitle}>지역을 선택하고 포인트를 탭해보세요</Text>
          </View>
          <NotificationBell userId={user?.id ?? null} />
        </View>
      </LinearGradient>

      <View style={styles.regionBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.regionScroll}>
          <TouchableOpacity style={[styles.regionChip, showFavoritesOnly && { backgroundColor: Colors.error[100], borderColor: Colors.error[400] }]} onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}>
            <Heart size={14} color={showFavoritesOnly ? Colors.error[500] : Colors.ocean[600]} strokeWidth={2} fill={showFavoritesOnly ? Colors.error[500] : 'none'} />
            <Text style={[styles.regionChipText, showFavoritesOnly && { color: Colors.error[600] }]}>즐겨찾기</Text>
          </TouchableOpacity>
          {REGIONS.map((r) => (
            <TouchableOpacity key={r.name} style={styles.regionChip} onPress={() => focusRegion(r.name)}>
              <MapPin size={14} color={Colors.ocean[600]} strokeWidth={2} />
              <Text style={styles.regionChipText}>{r.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.mapContainer}>
        <MapView html={mapHtml} onMessage={handleMapMessage} regionFocus={regionFocus} gpsFocus={gpsFocus} />
        <TouchableOpacity style={styles.gpsButton} onPress={handleGps} activeOpacity={0.8}>
          <LocateFixed size={24} color={Colors.ocean[700]} strokeWidth={2} />
        </TouchableOpacity>
      </View>
      <AdBanner />

      {error && (<View style={styles.errorBar}><Text style={styles.errorBarText}>{error}</Text></View>)}

      <Modal visible={detailModal} animationType="slide" transparent={true} onRequestClose={() => setDetailModal(false)}>
        <View style={styles.detailOverlay}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailHeaderLeft}>
                <View style={styles.detailPinIcon}><MapPin size={20} color={Colors.neutral[0]} strokeWidth={2} /></View>
                <View>
                  <Text style={styles.detailTitle}>{selectedPoint?.name}</Text>
                  <Text style={styles.detailRegion}>{selectedPoint?.region}</Text>
                </View>
              </View>
              <View style={styles.detailHeaderRight}>
                <TouchableOpacity onPress={toggleFavorite} style={styles.favBtn}>
                  <Heart size={24} color={isFavorite ? Colors.error[500] : Colors.neutral[300]} strokeWidth={2} fill={isFavorite ? Colors.error[500] : 'none'} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setDetailModal(false)}><X size={24} color={Colors.neutral[500]} strokeWidth={2} /></TouchableOpacity>
              </View>
            </View>
            {selectedPoint?.description && <Text style={styles.detailDesc}>{selectedPoint.description}</Text>}
            <View style={styles.detailInfoGrid}>
              <View style={styles.detailInfoItem}>
                {renderPointTypeIcon(selectedPoint?.point_type)}
                <Text style={styles.detailInfoLabel}>낚시터 유형</Text>
                <Text style={styles.detailInfoValue}>{selectedPoint?.point_type || '갯바위'}</Text>
              </View>
              <View style={styles.detailInfoItem}>
                <Fish size={16} color={Colors.ocean[600]} strokeWidth={2} />
                <Text style={styles.detailInfoLabel}>주요 어종</Text>
                <Text style={styles.detailInfoValue}>{selectedPoint?.fish_types || '정보 없음'}</Text>
              </View>
            </View>
            <View style={styles.tideSection}>
              <View style={styles.tideSectionHeader}>
                <Waves size={18} color={Colors.ocean[600]} strokeWidth={2} />
                <Text style={styles.tideSectionTitle}>오늘의 물때</Text>
                <View style={styles.tideBadge}><Text style={styles.tideBadgeText}>{tideDesc}</Text></View>
              </View>
              <View style={styles.tideList}>
                {pointTides.map((tide, idx) => (
                  <View key={idx} style={styles.tideRow}>
                    <View style={[styles.tideTypeBadge, { backgroundColor: tide.type === '만조' ? Colors.ocean[100] : Colors.warning[100] }]}>
                      <Text style={[styles.tideTypeText, { color: tide.type === '만조' ? Colors.ocean[700] : Colors.warning[600] }]}>{tide.type}</Text>
                    </View>
                    <Text style={styles.tideTimeText}>{tide.time}</Text>
                    <Text style={styles.tideHeightText}>{tide.height}cm</Text>
                  </View>
                ))}
              </View>
            </View>
            {recentCatches.length > 0 && (
              <View style={styles.recentCatchesSection}>
                <View style={styles.recentCatchesHeader}>
                  <Camera size={16} color={Colors.ocean[600]} strokeWidth={2} />
                  <Text style={styles.recentCatchesTitle}>최근 이 포인트 조과</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catchPhotoScroll}>
                  {recentCatches.map((c) => c.photo_url ? <Image key={c.id} source={{ uri: c.photo_url }} style={styles.catchPhoto} resizeMode="cover" /> : null)}
                </ScrollView>
              </View>
            )}
            <TouchableOpacity style={styles.communityBtn} onPress={openCommunity}>
              <MessageCircle size={20} color={Colors.neutral[0]} strokeWidth={2} />
              <Text style={styles.communityBtnText}>포인트 게시판 보기</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={communityModal} animationType="slide" transparent={true} onRequestClose={() => setCommunityModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <TouchableOpacity onPress={() => { setCommunityModal(false); setDetailModal(true); }}>
                  <ChevronLeft size={24} color={Colors.neutral[500]} strokeWidth={2} />
                </TouchableOpacity>
                <View>
                  <Text style={styles.modalTitle}>{selectedPoint?.name || '포인트'}</Text>
                  <Text style={styles.modalSubtitle}>{selectedPoint?.region} · {selectedPoint?.fish_types}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setCommunityModal(false)}><X size={24} color={Colors.neutral[500]} strokeWidth={2} /></TouchableOpacity>
            </View>
            <View style={styles.redWarningBar}>
              <Text style={styles.redWarningText}>⚠️ 욕설, 음란물, 광고성 내용 작성 시 즉시 삭제 및 글쓰기가 제한됩니다. 부적절한 글은 신고해 주세요.</Text>
            </View>
            <FlatList
              data={posts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.postCard}>
                  <View style={styles.postHeader}>
                    <View style={styles.postAvatar}><Text style={styles.postAvatarText}>{item.author_name.charAt(0)}</Text></View>
                    <View style={styles.postHeaderInfo}>
                      <Text style={styles.postAuthor}>{item.author_name}</Text>
                      <View style={styles.postTimeRow}><Clock size={11} color={Colors.neutral[400]} strokeWidth={2} /><Text style={styles.postTime}>{formatDate(item.created_at)}</Text></View>
                    </View>
                    <View style={styles.postActions}>
                      {canManagePost(item) && <TouchableOpacity onPress={() => handleDeletePost(item.id)}><Trash2 size={16} color={Colors.neutral[300]} strokeWidth={2} /></TouchableOpacity>}
                      {user && !canManagePost(item) && <TouchableOpacity onPress={() => openReport(item.id, null)}><Flag size={16} color={Colors.neutral[300]} strokeWidth={2} /></TouchableOpacity>}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setActivePost(activePost?.id === item.id ? null : item)} activeOpacity={0.9}>
                    <Text style={styles.postTitle}>{item.title}</Text>
                    {item.content && <Text style={styles.postContent}>{item.content}</Text>}
                    {item.photo_url && <Image source={{ uri: item.photo_url }} style={styles.postPhoto} resizeMode="cover" />}
                  </TouchableOpacity>
                  {activePost?.id === item.id && (
                    <View style={styles.commentSection}>
                      <View style={styles.commentDivider} />
                      <Text style={styles.commentSectionTitle}>댓글 {(comments[item.id] || []).length}개</Text>
                      {(comments[item.id] || []).map((c) => (
                        <View key={c.id} style={styles.commentItem}>
                          <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{c.author_name.charAt(0)}</Text></View>
                          <View style={styles.commentBody}>
                            <View style={styles.commentHeader}>
                              <Text style={styles.commentAuthor}>{c.author_name}</Text>
                              <Text style={styles.commentTime}>{formatDate(c.created_at)}</Text>
                              {canManageComment(c) && <TouchableOpacity onPress={() => handleDeleteComment(c.id, item.id)}><Trash2 size={12} color={Colors.neutral[300]} strokeWidth={2} /></TouchableOpacity>}
                              {user && !canManageComment(c) && <TouchableOpacity onPress={() => openReport(null, c.id)}><Flag size={12} color={Colors.neutral[300]} strokeWidth={2} /></TouchableOpacity>}
                            </View>
                            <Text style={styles.commentContent}>{c.content}</Text>
                          </View>
                        </View>
                      ))}
                      {user && (
                        <View style={styles.commentInputRow}>
                          <TextInput style={styles.commentInput} value={newComment} onChangeText={setNewComment} placeholder="댓글을 입력하세요..." placeholderTextColor={Colors.neutral[400]} />
                          <TouchableOpacity style={[styles.commentSendBtn, !newComment.trim() && { opacity: 0.4 }]} onPress={() => handleSubmitComment(item.id)} disabled={!newComment.trim()}>
                            <Send size={16} color={Colors.neutral[0]} strokeWidth={2} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}
                  {activePost?.id !== item.id && (
                    <TouchableOpacity style={styles.commentToggle} onPress={() => setActivePost(item)}>
                      <MessageCircle size={14} color={Colors.ocean[600]} strokeWidth={2} />
                      <Text style={styles.commentToggleText}>댓글 {(comments[item.id] || []).length}개</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              ListEmptyComponent={
                <View style={styles.emptyPosts}>
                  <Fish size={36} color={Colors.neutral[300]} strokeWidth={1.5} />
                  <Text style={styles.emptyPostsText}>아직 게시글이 없습니다</Text>
                  <Text style={styles.emptyPostsSub}>첫 조과를 공유해보세요!</Text>
                </View>
              }
              contentContainerStyle={styles.postList}
              showsVerticalScrollIndicator={false}
            />
            {user && (
              <TouchableOpacity style={styles.addPostFab} onPress={() => setPostModal(true)}>
                <Plus size={24} color={Colors.neutral[0]} strokeWidth={2.5} />
                <Text style={styles.addPostFabText}>글쓰기</Text>
              </TouchableOpacity>
            )}
            {!user && (
              <TouchableOpacity style={styles.addPostFab} onPress={() => router.push('/login')}>
                <Text style={styles.addPostFabText}>로그인 후 글쓰기</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={postModal} animationType="slide" transparent={true} onRequestClose={() => setPostModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.postModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>새 게시글</Text>
              <TouchableOpacity onPress={() => { setPostModal(false); setNewPostTitle(''); setNewPostContent(''); setNewPostPhoto(null); setError(null); }}>
                <X size={24} color={Colors.neutral[500]} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.postModalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>제목 *</Text>
              <TextInput style={styles.textInput} value={newPostTitle} onChangeText={setNewPostTitle} placeholder="예: 오늘 조과 공유합니다" placeholderTextColor={Colors.neutral[400]} />
              <Text style={styles.fieldLabel}>내용</Text>
              <TextInput style={styles.contentInput} value={newPostContent} onChangeText={setNewPostContent} placeholder="낚시 방법, 어종, 크기, 조건 등을 자유롭게 적어주세요" placeholderTextColor={Colors.neutral[400]} multiline numberOfLines={4} textAlignVertical="top" />
              <Text style={styles.fieldLabel}>사진</Text>
              <TouchableOpacity style={styles.photoPicker} onPress={pickPostPhoto}>
                {newPostPhoto ? <Image source={{ uri: newPostPhoto }} style={styles.photoPreview} /> : (
                  <View style={styles.photoPlaceholder}><Plus size={28} color={Colors.neutral[300]} strokeWidth={2} /><Text style={styles.photoPlaceholderText}>사진 추가</Text></View>
                )}
              </TouchableOpacity>
              {error && <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View>}
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitPost} disabled={submitting}>
                {submitting ? <ActivityIndicator size="small" color={Colors.neutral[0]} /> : <Text style={styles.submitBtnText}>게시글 등록</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={reportModal} animationType="slide" transparent={true} onRequestClose={() => setReportModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.postModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>신고하기</Text>
              <TouchableOpacity onPress={() => setReportModal(false)}><X size={24} color={Colors.neutral[500]} strokeWidth={2} /></TouchableOpacity>
            </View>
            <View style={styles.postModalBody}>
              <Text style={styles.fieldLabel}>신고 사유</Text>
              <TextInput style={styles.contentInput} value={reportReason} onChangeText={setReportReason} placeholder="욕설, 광고, 음란물, 스팸 등 사유를 적어주세요" placeholderTextColor={Colors.neutral[400]} multiline numberOfLines={3} textAlignVertical="top" />
              <TouchableOpacity style={styles.submitBtn} onPress={handleSubmitReport}>
                <Text style={styles.submitBtnText}>신고 접수</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: Spacing.sm, fontSize: 14, color: Colors.neutral[500] },
  header: { paddingTop: 56, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTextContainer: { flex: 1 },
  headerTitle: { fontSize: Typography.h1.fontSize, fontWeight: '700', color: Colors.neutral[0] },
  headerSubtitle: { fontSize: 13, color: Colors.neutral[100], marginTop: 2 },
  regionBar: { backgroundColor: Colors.neutral[0], paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.neutral[200] },
  regionScroll: { paddingHorizontal: Spacing.md, gap: Spacing.sm },
  regionChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.ocean[50], paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.ocean[200] },
  regionChipText: { fontSize: 13, fontWeight: '600', color: Colors.ocean[700] },
  mapContainer: { flex: 1 },
  gpsButton: { position: 'absolute', right: Spacing.md, bottom: Spacing.lg, width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.neutral[0], justifyContent: 'center', alignItems: 'center', shadowColor: Colors.neutral[900], shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4, borderWidth: 1, borderColor: Colors.ocean[200] },
  errorBar: { backgroundColor: Colors.error[50], paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  errorBarText: { fontSize: 13, color: Colors.error[600], textAlign: 'center' },
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailCard: { backgroundColor: Colors.neutral[0], borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg, paddingBottom: Spacing.xl, maxHeight: '85%' },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  detailHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  detailHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailPinIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.ocean[600], justifyContent: 'center', alignItems: 'center' },
  detailTitle: { fontSize: Typography.h2.fontSize, fontWeight: '700', color: Colors.neutral[800] },
  detailRegion: { fontSize: 14, color: Colors.neutral[500], marginTop: 2 },
  detailDesc: { fontSize: 14, color: Colors.neutral[600], lineHeight: 20, marginBottom: Spacing.md },
  detailInfoGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  detailInfoItem: { flex: 1, backgroundColor: Colors.neutral[50], borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: Colors.neutral[200] },
  detailInfoLabel: { fontSize: 11, color: Colors.neutral[400], marginTop: 6, marginBottom: 2 },
  detailInfoValue: { fontSize: 14, fontWeight: '600', color: Colors.neutral[800] },
  favBtn: { padding: Spacing.xs },
  tideSection: { backgroundColor: Colors.ocean[50], borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  tideSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  tideSectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.neutral[800], flex: 1 },
  tideBadge: { backgroundColor: Colors.ocean[100], paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  tideBadgeText: { fontSize: 11, fontWeight: '600', color: Colors.ocean[700] },
  tideList: { gap: Spacing.xs },
  tideRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  tideTypeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  tideTypeText: { fontSize: 12, fontWeight: '700' },
  tideTimeText: { fontSize: 15, fontWeight: '600', color: Colors.neutral[800], flex: 1 },
  tideHeightText: { fontSize: 14, color: Colors.ocean[600], fontWeight: '600' },
  recentCatchesSection: { marginBottom: Spacing.md },
  recentCatchesHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  recentCatchesTitle: { fontSize: 14, fontWeight: '600', color: Colors.neutral[700] },
  catchPhotoScroll: { gap: Spacing.sm },
  catchPhoto: { width: 80, height: 80, borderRadius: Radius.md },
  communityBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.ocean[600], paddingVertical: 14, borderRadius: Radius.md },
  communityBtnText: { fontSize: 16, fontWeight: '700', color: Colors.neutral[0] },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.neutral[0], borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, flex: 1, maxHeight: '92%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.neutral[800] },
  modalSubtitle: { fontSize: 12, color: Colors.neutral[500], marginTop: 2 },
  redWarningBar: { backgroundColor: Colors.error[50], paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.error[100] },
  redWarningText: { fontSize: 11, color: Colors.error[600], fontWeight: '600', lineHeight: 16 },
  postList: { paddingHorizontal: Spacing.md, paddingBottom: 100 },
  postCard: { backgroundColor: Colors.neutral[50], borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.neutral[200] },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: Spacing.sm },
  postAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.ocean[500], justifyContent: 'center', alignItems: 'center' },
  postAvatarText: { fontSize: 16, fontWeight: '700', color: Colors.neutral[0] },
  postHeaderInfo: { flex: 1 },
  postAuthor: { fontSize: 14, fontWeight: '600', color: Colors.neutral[800] },
  postTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  postTime: { fontSize: 11, color: Colors.neutral[400] },
  postActions: { flexDirection: 'row', gap: 8 },
  postTitle: { fontSize: 16, fontWeight: '700', color: Colors.neutral[800], marginBottom: 4 },
  postContent: { fontSize: 14, color: Colors.neutral[600], lineHeight: 20, marginBottom: 8 },
  postPhoto: { width: '100%', height: 180, borderRadius: Radius.md, marginBottom: 8 },
  commentToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  commentToggleText: { fontSize: 13, color: Colors.ocean[600], fontWeight: '600' },
  commentSection: { marginTop: Spacing.sm },
  commentDivider: { height: 1, backgroundColor: Colors.neutral[200], marginBottom: Spacing.sm },
  commentSectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.neutral[600], marginBottom: Spacing.sm },
  commentItem: { flexDirection: 'row', gap: 10, marginBottom: Spacing.sm },
  commentAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary[500], justifyContent: 'center', alignItems: 'center' },
  commentAvatarText: { fontSize: 12, fontWeight: '700', color: Colors.neutral[0] },
  commentBody: { flex: 1, backgroundColor: Colors.neutral[100], borderRadius: Radius.md, padding: Spacing.sm },
  commentHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  commentAuthor: { fontSize: 12, fontWeight: '600', color: Colors.neutral[700] },
  commentTime: { fontSize: 10, color: Colors.neutral[400], flex: 1 },
  commentContent: { fontSize: 13, color: Colors.neutral[700], lineHeight: 18 },
  commentInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.sm },
  commentInput: { flex: 1, fontSize: 13, borderWidth: 1, borderColor: Colors.neutral[200], borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, color: Colors.neutral[800] },
  commentSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.ocean[600], justifyContent: 'center', alignItems: 'center' },
  emptyPosts: { alignItems: 'center', paddingVertical: Spacing.xxl },
  emptyPostsText: { fontSize: 15, fontWeight: '600', color: Colors.neutral[500], marginTop: Spacing.sm },
  emptyPostsSub: { fontSize: 13, color: Colors.neutral[400], marginTop: 4 },
  addPostFab: { position: 'absolute', bottom: Spacing.lg, left: Spacing.md, right: Spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.ocean[600], paddingVertical: 14, borderRadius: Radius.md, shadowColor: Colors.ocean[900], shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  addPostFabText: { fontSize: 15, fontWeight: '700', color: Colors.neutral[0] },
  postModalContent: { backgroundColor: Colors.neutral[0], borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '85%' },
  postModalBody: { padding: Spacing.md },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.neutral[700], marginBottom: Spacing.xs, marginTop: Spacing.sm },
  textInput: { fontSize: 16, borderWidth: 1, borderColor: Colors.neutral[200], borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, color: Colors.neutral[800], backgroundColor: Colors.neutral[50] },
  contentInput: { fontSize: 15, borderWidth: 1, borderColor: Colors.neutral[200], borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, color: Colors.neutral[800], backgroundColor: Colors.neutral[50], minHeight: 100 },
  photoPicker: { marginBottom: Spacing.md },
  photoPreview: { width: '100%', height: 160, borderRadius: Radius.md },
  photoPlaceholder: { width: '100%', height: 160, borderRadius: Radius.md, backgroundColor: Colors.neutral[100], justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: Colors.neutral[200], borderStyle: 'dashed' },
  photoPlaceholderText: { fontSize: 14, color: Colors.neutral[400], marginTop: Spacing.xs },
  errorBox: { backgroundColor: Colors.error[50], borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.sm },
  errorText: { fontSize: 14, color: Colors.error[600], textAlign: 'center' },
  submitBtn: { backgroundColor: Colors.ocean[600], borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: Spacing.md, marginBottom: Spacing.xl },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.neutral[0] },
});
