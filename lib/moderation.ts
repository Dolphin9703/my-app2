const BANNED_WORDS = [
  '욕', '씨발', '시발', '좆', '병신', '개새', '존나', 'fuck', 'shit', '바카', '멍청',
  '광고', '도박', '카지노', '먹튀', '토토', '실시간게임', '성인', '19+', '출장마사지',
  '조건만남', '만남', '오피', '유흥', '룸싸롱', '대출', '카드발급',
];

const NICKNAME_REGEX = /^[가-힣a-zA-Z]{2,12}$/;

export function validateNickname(nickname: string): { valid: boolean; message: string } {
  if (!nickname.trim()) {
    return { valid: false, message: '닉네임을 입력해주세요.' };
  }
  if (!NICKNAME_REGEX.test(nickname.trim())) {
    return { valid: false, message: '닉네임은 순수 한글 또는 영어 2~12자만 가능합니다. (숫자, 특수기호, 이모지 불가)' };
  }
  return { valid: true, message: '' };
}

export function validateContent(content: string): { valid: boolean; message: string } {
  const lower = content.toLowerCase();
  for (const word of BANNED_WORDS) {
    if (lower.includes(word.toLowerCase())) {
      return { valid: false, message: `금지어("${word}")가 포함되어 있습니다. 수정해주세요.` };
    }
  }
  return { valid: true, message: '' };
}
