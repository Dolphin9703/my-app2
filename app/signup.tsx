import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Waves, Mail, Lock, User, ChevronRight, Check, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Spacing, Radius } from '@/lib/theme';
import { supabase } from '@/lib/supabase';
import { localizeAuthError } from '@/lib/authErrors';
import { useRouter } from 'expo-router';
import { validateNickname } from '@/lib/moderation';

export default function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [ageCheck, setAgeCheck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupDone, setSignupDone] = useState(false);
  const submittingRef = useRef(false);

  const handleSignup = async () => {
    if (submittingRef.current || loading) return;
    submittingRef.current = true;
    setError(null);
    if (!email.trim() || !password.trim() || !nickname.trim()) {
      setError('모든 항목을 입력해주세요.');
      submittingRef.current = false;
      return;
    }
    if (!ageCheck) {
      setError('만 14세 이상 확인에 체크해주세요.');
      submittingRef.current = false;
      return;
    }
    const nickResult = validateNickname(nickname);
    if (!nickResult.valid) {
      setError(nickResult.message);
      submittingRef.current = false;
      return;
    }
    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      submittingRef.current = false;
      return;
    }
    setLoading(true);
    let signupSuccess = false;
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
        options: { data: { nickname: nickname.trim() } },
      });
      if (signUpError) {
        setError(localizeAuthError(signUpError, '회원가입에 실패했습니다.'));
        return;
      }
      if (data.user) {
        signupSuccess = true;
        setSignupDone(true);
      }
    } catch (e) {
      setError('회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      if (!signupSuccess) {
        submittingRef.current = false;
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!signupDone) return;
    const timer = setTimeout(() => {
      router.replace('/login');
    }, 1800);
    return () => clearTimeout(timer);
  }, [signupDone, router]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[Colors.ocean[600], Colors.primary[700], Colors.primary[900]]} style={styles.header}>
        <View style={styles.headerIcon}>
          <Waves size={48} color={Colors.neutral[0]} strokeWidth={2} />
        </View>
        <Text style={styles.headerTitle}>회원가입</Text>
        <Text style={styles.headerSubtitle}>낚시 커뮤니티에 가입하세요</Text>
      </LinearGradient>

      <View style={styles.form}>
        <Text style={styles.fieldLabel}>닉네임</Text>
        <View style={styles.inputRow}>
          <User size={20} color={Colors.ocean[600]} strokeWidth={2} />
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="순수 한글 또는 영어 2~12자"
            placeholderTextColor={Colors.neutral[400]}
            maxLength={12}
            editable={!loading}
          />
        </View>
        <Text style={styles.hint}>숫자, 특수기호, 이모지, 로마자 확장 문자 불가</Text>

        <Text style={styles.fieldLabel}>이메일</Text>
        <View style={styles.inputRow}>
          <Mail size={20} color={Colors.ocean[600]} strokeWidth={2} />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="이메일 주소"
            placeholderTextColor={Colors.neutral[400]}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            editable={!loading}
          />
        </View>

        <Text style={styles.fieldLabel}>비밀번호</Text>
        <View style={styles.inputRow}>
          <Lock size={20} color={Colors.ocean[600]} strokeWidth={2} />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="6자 이상"
            placeholderTextColor={Colors.neutral[400]}
            secureTextEntry
            editable={!loading}
          />
        </View>

        <TouchableOpacity style={styles.ageCheckRow} onPress={() => setAgeCheck(!ageCheck)} disabled={loading}>
          <View style={[styles.checkbox, ageCheck && { backgroundColor: Colors.ocean[600], borderColor: Colors.ocean[600] }]}>
            {ageCheck && <Check size={16} color={Colors.neutral[0]} strokeWidth={3} />}
          </View>
          <Text style={styles.ageCheckText}>만 14세 이상만 가입 가능합니다</Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity style={[styles.signupBtn, !ageCheck && { opacity: 0.5 }]} onPress={handleSignup} disabled={loading || !ageCheck}>
          {loading ? (
            <ActivityIndicator size="small" color={Colors.neutral[0]} />
          ) : (
            <>
              <Text style={styles.signupBtnText}>회원가입</Text>
              <ChevronRight size={20} color={Colors.neutral[0]} strokeWidth={2} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/login')} disabled={loading}>
          <Text style={styles.loginLinkText}>이미 회원이신가요? 로그인</Text>
        </TouchableOpacity>
      </View>

      {signupDone && (
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <View style={styles.successIconWrap}>
              <CheckCircle2 size={40} color={Colors.success[600]} strokeWidth={2} />
            </View>
            <Text style={styles.successTitle}>가입이 완료되었습니다!</Text>
            <Text style={styles.successDesc}>이메일 인증 후 로그인해주세요.</Text>
            <Text style={styles.successRedirect}>잠시 후 로그인 화면으로 이동합니다...</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.neutral[50] },
  content: { flexGrow: 1 },
  header: { paddingTop: 80, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl, alignItems: 'center' },
  headerIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  headerTitle: { fontSize: Typography.hero.fontSize, fontWeight: '700', color: Colors.neutral[0] },
  headerSubtitle: { fontSize: 14, color: Colors.neutral[100], marginTop: 4 },
  form: { padding: Spacing.lg, marginTop: Spacing.lg },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.neutral[700], marginBottom: Spacing.xs },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.neutral[0], borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.neutral[200], gap: 10, marginBottom: Spacing.xs },
  input: { flex: 1, fontSize: 16, color: Colors.neutral[800] },
  hint: { fontSize: 11, color: Colors.neutral[400], marginBottom: Spacing.md },
  ageCheckRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: Spacing.md, marginBottom: Spacing.md },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.neutral[300], justifyContent: 'center', alignItems: 'center' },
  ageCheckText: { fontSize: 14, fontWeight: '600', color: Colors.neutral[700] },
  errorBox: { backgroundColor: Colors.error[50], borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
  errorText: { fontSize: 14, color: Colors.error[600], textAlign: 'center' },
  signupBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.ocean[600], borderRadius: Radius.md, paddingVertical: Spacing.md, marginTop: Spacing.sm },
  signupBtnText: { fontSize: 16, fontWeight: '700', color: Colors.neutral[0] },
  loginLink: { alignItems: 'center', marginTop: Spacing.lg },
  loginLinkText: { fontSize: 14, color: Colors.ocean[600], fontWeight: '600' },
  successOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  successCard: { backgroundColor: Colors.neutral[0], borderRadius: Radius.xl, padding: Spacing.xl, width: '100%', maxWidth: 360, alignItems: 'center' },
  successIconWrap: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.success[50], justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md },
  successTitle: { fontSize: Typography.h2.fontSize, fontWeight: '700', color: Colors.neutral[800], marginBottom: Spacing.sm },
  successDesc: { fontSize: 15, color: Colors.neutral[600], textAlign: 'center', marginBottom: Spacing.md },
  successRedirect: { fontSize: 13, color: Colors.neutral[400], textAlign: 'center' },
});
