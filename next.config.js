const { 검색공개 } = require("./lib/robotsGate");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // jimp(이미지 해시)은 동적 플러그인 로드가 있어 서버 번들링 시 깨질 수 있음 → 외부 패키지로 처리
  experimental: { serverComponentsExternalPackages: ["jimp"] },
  async headers() {
    // 검색공개(lib/robotsGate.js)가 true 가 되면 이 헤더 자체를 안 붙인다 —
    // 이때부터는 app/robots.ts 의 세부 규칙(비공개경로)에 맡긴다.
    if (검색공개) return [];
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            // noai·noimageai 는 일부 AI 수집기가 보는 값이다. 표준은 아니지만
            // 읽는 곳이 있으니 같이 적는다.
            value: "noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate, nocache, noai, noimageai",
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
