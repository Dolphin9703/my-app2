type AuthErrorLike = {
  message?: string;
  code?: string;
  status?: number;
};

const ERROR_MAP: Array<{ match: RegExp; korean: string }> = [
  { match: /User already registered/i, korean: '이미 가입된 이메일입니다. 로그인해주세요.' },
  { match: /Invalid login credentials/i, korean: '이메일 또는 비밀번호가 올바르지 않습니다.' },
  { match: /Email not confirmed/i, korean: '이메일 인증이 완료되지 않았습니다. 이메일함을 확인해주세요.' },
  { match: /Password should be at least/i, korean: '비밀번호는 6자 이상이어야 합니다.' },
  { match: /Unable to validate email address/i, korean: '올바른 이메일 주소를 입력해주세요.' },
  { match: /User not found/i, korean: '가입되지 않은 계정입니다. 회원가입 후 이용해주세요.' },
  { match: /Email rate limit exceeded/i, korean: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  { match: /For security purposes, you can only request this after/i, korean: '보안을 위해 잠시 후 다시 시도해주세요.' },
  { match: /signup is disabled/i, korean: '현재 회원가입이 중단되었습니다.' },
  { match: /Email link is invalid or has expired/i, korean: '이메일 링크가 만료되었거나 올바르지 않습니다.' },
  { match: /Token has expired or is invalid/i, korean: '인증 토큰이 만료되었습니다. 다시 시도해주세요.' },
  { match: /Session missing/i, korean: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.' },
  { match: /Network request failed/i, korean: '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.' },
  { match: /fetch/i, korean: '네트워크 연결에 실패했습니다. 인터넷 연결을 확인해주세요.' },
];

export function localizeAuthError(err: AuthErrorLike | null | undefined, fallback: string): string {
  if (!err) return fallback;
  const raw = err.message ?? '';
  for (const entry of ERROR_MAP) {
    if (entry.match.test(raw)) {
      return entry.korean;
    }
  }
  return raw || fallback;
}
