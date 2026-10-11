import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Waves } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';

type Provider = 'kakao' | 'naver' | 'google';

const KAKAO_COLOR = '#FEE500';
const KAKAO_TEXT = '#1A1A1A';
const NAVER_COLOR = '#03C75A';
const GOOGLE_BG = '#FFFFFF';
const GOOGLE_BORDER = '#E2E8F0';
const GOOGLE_TEXT = '#1A1A1A';

export default function LoginScreen() {
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session?.user) {
        router.replace('/(tabs)');
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace('/(tabs)');
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  const handleOAuth = async (provider: Provider) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setLoadingProvider(provider);
    try {
      const redirectTo =
        Platform.OS === 'web'
          ? `${window.location.origin}/login`
          : 'myapp://login';

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: provider as any,
        options: { redirectTo },
      });

      if (oauthError) {
        setError(
          provider === 'kakao'
            ? '카카오 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
            : provider === 'naver'
              ? '네이버 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
              : '구글 로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
        );
        return;
      }

      // On native, the OAuth flow opens a browser session.
      // The session is picked up by onAuthStateChange in useAuth.
      // On web, the browser redirects away so we don't need to do anything here.
    } catch (e) {
      setError('로그인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      submittingRef.current = false;
      setLoadingProvider(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[Colors.ocean[600], Colors.primary[700], Colors.primary[900]]} style={styles.header}>
        <View style={styles.headerIcon}>
          <Waves size={48} color={Colors.neutral[0]} strokeWidth={2} />
        </View>
        <Text style={styles.headerTitle}>낚시 정보</Text>
        <Text style={styles.headerSubtitle}>소셜 계정으로 간편하게 시작하세요</Text>
      </LinearGradient>

      <View style={styles.form}>
        <Text style={styles.sectionTitle}>간편 로그인</Text>
        <Text style={styles.sectionDesc}>
          아래 계정 중 하나를 선택하여 로그인하세요.{'\n'}처음이시면 자동으로 가입됩니다.
        </Text>

        <TouchableOpacity
          style={styles.kakaoBtn}
          onPress={() => handleOAuth('kakao')}
          disabled={loadingProvider !== null}
          activeOpacity={0.8}
        >
          {loadingProvider === 'kakao' ? (
            <ActivityIndicator size="small" color={KAKAO_TEXT} />
          ) : (
            <KakaoIcon />
          )}
          <Text style={styles.kakaoBtnText}>카카오로 시작하기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.naverBtn}
          onPress={() => handleOAuth('naver')}
          disabled={loadingProvider !== null}
          activeOpacity={0.8}
        >
          {loadingProvider === 'naver' ? (
            <ActivityIndicator size="small" color={Colors.neutral[0]} />
          ) : (
            <NaverIcon />
          )}
          <Text style={styles.naverBtnText}>네이버로 시작하기</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.googleBtn}
          onPress={() => handleOAuth('google')}
          disabled={loadingProvider !== null}
          activeOpacity={0.8}
        >
          {loadingProvider === 'google' ? (
            <ActivityIndicator size="small" color={GOOGLE_TEXT} />
          ) : (
            <GoogleIcon />
          )}
          <Text style={styles.googleBtnText}>구글로 시작하기</Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            로그인 시 이용약관 및 개인정보처리방침에 동의합니다.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function KakaoIcon() {
  return (
    <View style={styles.brandIconWrap}>
      <Text style={styles.kakaoIconText}>K</Text>
    </View>
  );
}

function NaverIcon() {
  return (
    <View style={styles.brandIconWrap}>
      <Text style={styles.naverIconText}>N</Text>
    </View>
  );
}

function GoogleIcon() {
  return (
    <View style={styles.googleIconWrap}>
      <GoogleLogo />
    </View>
  );
}

function GoogleLogo() {
  return (
    <View style={styles.googleLogo}>
      <View style={[styles.googleDot, { backgroundColor: '#4285F4', top: 0, left: 0 }]} />
      <View style={[styles.googleDot, { backgroundColor: '#EA4335', top: 0, right: 0 }]} />
      <View style={[styles.googleDot, { backgroundColor: '#FBBC05', bottom: 0, left: 0 }]} />
      <View style={[styles.googleDot, { backgroundColor: '#34A853', bottom: 0, right: 0 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  content: { flexGrow: 1 },
  header: { paddingTop: 80, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl, alignItems: 'center' },
  headerIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  headerTitle: { fontSize: Typography.hero.fontSize, fontWeight: '700', color: Colors.neutral[0] },
  headerSubtitle: { fontSize: 14, color: Colors.neutral[100], marginTop: 4 },
  form: { padding: Spacing.lg, marginTop: Spacing.xl },
  sectionTitle: { fontSize: Typography.h2.fontSize, fontWeight: '700', color: Colors.neutral[800], textAlign: 'center', marginBottom: Spacing.sm },
  sectionDesc: { fontSize: 14, color: Colors.neutral[500], textAlign: 'center', lineHeight: 20, marginBottom: Spacing.xl },
  brandIconWrap: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  kakaoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: KAKAO_COLOR, borderRadius: Radius.md, paddingVertical: Spacing.md + 2, marginBottom: Spacing.md },
  kakaoBtnText: { fontSize: 16, fontWeight: '700', color: KAKAO_TEXT },
  kakaoIconText: { fontSize: 18, fontWeight: '800', color: KAKAO_TEXT },
  naverBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: NAVER_COLOR, borderRadius: Radius.md, paddingVertical: Spacing.md + 2, marginBottom: Spacing.md },
  naverBtnText: { fontSize: 16, fontWeight: '700', color: Colors.neutral[0] },
  naverIconText: { fontSize: 18, fontWeight: '800', color: Colors.neutral[0] },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: GOOGLE_BG, borderRadius: Radius.md, paddingVertical: Spacing.md + 2, marginBottom: Spacing.md, borderWidth: 1, borderColor: GOOGLE_BORDER },
  googleBtnText: { fontSize: 16, fontWeight: '600', color: GOOGLE_TEXT },
  googleIconWrap: { width: 28, height: 28, justifyContent: 'center', alignItems: 'center' },
  googleLogo: { width: 18, height: 18, flexDirection: 'row', flexWrap: 'wrap' },
  googleDot: { width: 9, height: 9, position: 'absolute' },
  errorBox: { backgroundColor: Colors.error[50], borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md },
  errorText: { fontSize: 14, color: Colors.error[600], textAlign: 'center' },
  footer: { marginTop: Spacing.xxl, alignItems: 'center', paddingHorizontal: Spacing.lg },
  footerText: { fontSize: 12, color: Colors.neutral[400], textAlign: 'center', lineHeight: 18 },
});
