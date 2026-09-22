import type { MetadataRoute } from "next";
import { 검색공개 } from "@/lib/robotsGate";
import { 스토리공개 } from "@/lib/storiesGate";

/**
 * 아직 오픈 전이다. 어디에도 걸리지 않게 막는다.
 *
 * `User-agent: *` 하나로 끝나야 맞지만, 실제로는 이름을 따로 불러 줘야
 * 멈추는 수집기가 있다. 특히 AI 학습용 수집기는 일반 규칙을 검색 색인용으로만
 * 읽고 지나가는 것들이 있어, 아래처럼 하나씩 적어 둔다.
 *
 * 검색공개 스위치는 lib/robotsGate.js 하나에 있다. next.config.js 의
 * X-Robots-Tag, app/layout.tsx 의 robots 메타도 같은 값을 본다 — 오픈일
 * (2026-10-12)에 그 파일 하나만 true 로 바꾸면 셋이 한 번에 풀린다.
 */
const 수집기 = [
  // 검색
  "Googlebot", "Googlebot-Image", "Googlebot-News", "Googlebot-Video",
  "Bingbot", "Yeti", "Daum", "DaumOA", "NaverBot",
  "Slurp", "DuckDuckBot", "Baiduspider", "YandexBot", "Sogou", "Exabot",
  // AI 학습·검색
  "GPTBot", "OAI-SearchBot", "ChatGPT-User",
  "ClaudeBot", "Claude-Web", "anthropic-ai",
  "Google-Extended", "Applebot", "Applebot-Extended",
  "PerplexityBot", "Perplexity-User",
  "CCBot", "Bytespider", "Amazonbot", "Meta-ExternalAgent",
  "FacebookBot", "cohere-ai", "Diffbot", "Omgilibot", "Timpibot",
  // 통째로 긁어가는 것들
  "AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "DataForSeoBot",
  "HTTrack", "wget", "curl", "Scrapy",
];

// 오픈 후에도 계속 막아 둘 자리 — 로그인 전용 관리 화면과 내부 API.
// prefix 매칭이라 "/api" 하나로 "/api/아무거나"까지 다 걸린다.
const 비공개경로 = [
  "/api", "/admin", "/company/dashboard", "/company/login",
  "/profile", "/login", "/signup", "/onboarding", "/search",
  // 현장이야기는 검색공개와 별개로 스토리공개(lib/storiesGate.js)가
  // true 일 때만 뺀다 — 오픈일에 검색은 풀려도 이야기는 그대로 막혀야 한다.
  ...(스토리공개 ? [] : ["/stories"]),
];

export default function robots(): MetadataRoute.Robots {
  if (!검색공개) {
    return {
      rules: [
        { userAgent: "*", disallow: "/" },
        ...수집기.map((userAgent) => ({ userAgent, disallow: "/" })),
      ],
    };
  }
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: 비공개경로 },
    ],
    sitemap: "https://beautywork.co.kr/sitemap.xml",
  };
}
