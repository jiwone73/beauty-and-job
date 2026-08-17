// '로그인 유지'를 끈 사람은 브라우저를 닫으면 로그아웃되어야 한다.
//
// 토큰을 sessionStorage 로 옮기면 간단하지만, 그렇게 하면 탭을 새로 열 때마다
// 로그아웃돼 링크를 새 탭으로 여는 흔한 동작이 깨진다(sessionStorage 는 탭마다 따로다).
// 그래서 토큰은 localStorage 에 그대로 두고, 대신 '브라우저가 살아 있는지'를
// 세션 쿠키로 표시한다. 세션 쿠키는 탭끼리 공유되고 브라우저를 닫을 때 사라지므로
// 다음에 열었을 때 쿠키가 없으면 = 브라우저가 닫혔다 = 정리할 때다.
//
// 실제 정리는 app/layout.tsx 의 부팅 스크립트가 화면을 그리기 전에 해 준다.
// (여기서 하면 로그인된 헤더가 한 번 번쩍인다.)

export const SESSION_ONLY_FLAG = "bw_login_session_only";
export const SESSION_ALIVE_COOKIE = "bw_sess";

/** 로그인 직후 호출한다. remember=false 면 브라우저를 닫을 때 로그아웃된다. */
export function setLoginPersistence(remember: boolean) {
  if (typeof window === "undefined") return;
  try {
    if (remember) {
      localStorage.removeItem(SESSION_ONLY_FLAG);
      document.cookie = `${SESSION_ALIVE_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
    } else {
      localStorage.setItem(SESSION_ONLY_FLAG, "1");
      // Max-Age·Expires 를 주지 않아야 세션 쿠키가 된다.
      document.cookie = `${SESSION_ALIVE_COOKIE}=1; path=/; SameSite=Lax`;
    }
  } catch {
    /* 시크릿 모드 등에서 저장이 막혀도 로그인 자체는 진행한다 */
  }
}

/** 로그아웃할 때 표시도 함께 지운다. */
export function clearLoginPersistence() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_ONLY_FLAG);
    document.cookie = `${SESSION_ALIVE_COOKIE}=; Max-Age=0; path=/; SameSite=Lax`;
  } catch {
    /* noop */
  }
}
