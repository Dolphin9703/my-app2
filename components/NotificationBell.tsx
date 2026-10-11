import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Bell, X, AlertTriangle, MessageCircle } from 'lucide-react-native';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import type { AppNotification, WeatherAlert } from '@/lib/types';
import { fetchWeatherAlerts } from '@/lib/weather';

interface NotificationBellProps {
  userId: string | null;
}

export default function NotificationBell({ userId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setUnreadCount(0);
      return;
    }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    const notifs = (data as AppNotification[]) || [];
    setNotifications(notifs);
    setUnreadCount(notifs.filter((n) => !n.is_read).length);
  }, [userId]);

  const loadWeatherAlerts = useCallback(async () => {
    const alerts = await fetchWeatherAlerts();
    setWeatherAlerts(alerts);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handlePress = () => {
    setModalVisible(true);
    setLoading(true);
    loadWeatherAlerts().finally(() => setLoading(false));
    loadNotifications();
  };

  const markAllRead = async () => {
    if (!userId) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = (now.getTime() - d.getTime()) / 1000;
    if (diff < 60) return '방금 전';
    if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
    return d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  };

  return (
    <>
      <TouchableOpacity style={styles.bellContainer} onPress={handlePress} activeOpacity={0.7}>
        <Bell size={24} color="#fbbf24" strokeWidth={2} fill="#fbbf24" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Bell size={20} color="#fbbf24" strokeWidth={2} fill="#fbbf24" />
                <Text style={styles.modalTitle}>알림함</Text>
              </View>
              <View style={styles.modalHeaderRight}>
                {unreadCount > 0 && (
                  <TouchableOpacity onPress={markAllRead}>
                    <Text style={styles.markReadBtn}>모두 읽음</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <X size={24} color={Colors.neutral[500]} strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {loading && (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={Colors.ocean[500]} />
                  <Text style={styles.loadingText}>기상특보 불러오는 중...</Text>
                </View>
              )}

              {weatherAlerts.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <AlertTriangle size={16} color={Colors.error[500]} strokeWidth={2} />
                    <Text style={styles.sectionTitle}>기상 특보</Text>
                  </View>
                  {weatherAlerts.map((alert, idx) => (
                    <View key={idx} style={styles.alertCard}>
                      <View style={styles.alertHeader}>
                        <Text style={styles.alertRegion}>{alert.region}</Text>
                        <Text style={styles.alertLevel}>{alert.level}</Text>
                      </View>
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                      {alert.issuedAt && <Text style={styles.alertTime}>{alert.issuedAt}</Text>}
                    </View>
                  ))}
                </View>
              )}

              {!loading && weatherAlerts.length === 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <AlertTriangle size={16} color={Colors.neutral[400]} strokeWidth={2} />
                    <Text style={styles.sectionTitle}>기상 특보</Text>
                  </View>
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>현재 발령된 특보가 없습니다.</Text>
                  </View>
                </View>
              )}

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MessageCircle size={16} color={Colors.ocean[600]} strokeWidth={2} />
                  <Text style={styles.sectionTitle}>커뮤니티 알림</Text>
                </View>
                {notifications.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>알림이 없습니다.</Text>
                  </View>
                ) : (
                  notifications.map((notif) => (
                    <View key={notif.id} style={[styles.notifCard, !notif.is_read && { backgroundColor: Colors.ocean[50] }]}>
                      <View style={styles.notifHeader}>
                        {!notif.is_read && <View style={styles.unreadDot} />}
                        <Text style={styles.notifTitle}>{notif.title}</Text>
                      </View>
                      {notif.body && <Text style={styles.notifBody}>{notif.body}</Text>}
                      <Text style={styles.notifTime}>{formatTime(notif.created_at)}</Text>
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellContainer: { position: 'relative', padding: 4 },
  badge: { position: 'absolute', right: -2, bottom: -2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.neutral[0], borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.neutral[100] },
  modalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitle: { fontSize: Typography.h3.fontSize, fontWeight: '700', color: Colors.neutral[800] },
  markReadBtn: { fontSize: 13, fontWeight: '600', color: Colors.ocean[600] },
  list: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: Spacing.md },
  loadingText: { fontSize: 13, color: Colors.neutral[400] },
  section: { marginBottom: Spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.neutral[700] },
  alertCard: { backgroundColor: Colors.error[50], borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.error[100] },
  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  alertRegion: { fontSize: 14, fontWeight: '700', color: Colors.error[600] },
  alertLevel: { fontSize: 12, fontWeight: '600', color: Colors.error[500], backgroundColor: Colors.error[100], paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  alertMessage: { fontSize: 13, color: Colors.neutral[700], lineHeight: 18 },
  alertTime: { fontSize: 11, color: Colors.neutral[400], marginTop: 4 },
  emptyCard: { backgroundColor: Colors.neutral[50], borderRadius: Radius.md, padding: Spacing.lg, alignItems: 'center' },
  emptyText: { fontSize: 13, color: Colors.neutral[400] },
  notifCard: { backgroundColor: Colors.neutral[50], borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.neutral[200] },
  notifHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.ocean[500] },
  notifTitle: { fontSize: 14, fontWeight: '600', color: Colors.neutral[800] },
  notifBody: { fontSize: 13, color: Colors.neutral[600], lineHeight: 18 },
  notifTime: { fontSize: 11, color: Colors.neutral[400], marginTop: 4 },
});
