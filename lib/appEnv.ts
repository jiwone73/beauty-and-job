/**
 * 지금 도는 곳이 시험(staging) 사이트인가.
 *
 * 시험 사이트는 운영과 같은 코드를 다른 DB 에 붙여 돌린다. 그래서 「여기는 시험」이라는 표시가 환경변수
 * 하나(NEXT_PUBLIC_APP_ENV=staging)로만 켜지고, 실제 사람에게 닿거나 요금이 나가는 일(메일·소셜 로그인·크론)은
 * 이 값을 보고 막는다. 운영에는 이 값이 없다.
 *
 * 문자(SMS)는 이미 SMS_ENABLED 가 켜져야만 나가고, AI 는 ANTHROPIC_API_KEY 가 있어야 불린다 —
 * 시험 사이트에는 그 값들을 넣지 않는다(코드로 막는 것은 그 앞의 안전망이다).
 */
export const 시험환경 = process.env.NEXT_PUBLIC_APP_ENV === "staging";
