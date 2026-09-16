"use client";

import { useAuthStore } from "@/lib/store/authStore";

/**
 * 기업 화면에서 「이제 시작하세요」 단추가 갈 곳과 이름.
 *
 * 화면마다 따로 정하다가 한 화면에 같은 단추가 세 이름으로 섰다 —
 * 「1개월 무료로 시작하기」·「지금 무료로 시작하기」·「지금 공고 등록하기」가
 * 모두 같은 곳으로 갔다. 더 나쁜 것은 이벤트 안내가 로그인 여부를 보지 않아,
 * 이미 가입한 사장님이 눌러도 가입 화면으로 떨어진 일이다.
 *
 * 한 곳에서 정한다. 이름이 바뀌면 세 자리가 같이 바뀐다.
 */
export function use기업CTA() {
  const { isLoggedIn, ownerType } = useAuthStore();
  const 기업인가 = isLoggedIn && ownerType === "company";
  return {
    기업인가,
    갈곳: 기업인가 ? "/company/dashboard/jobs/new" : "/company/signup",
    글: 기업인가 ? "공고 등록하기" : "1개월 무료로 시작하기",
  };
}
