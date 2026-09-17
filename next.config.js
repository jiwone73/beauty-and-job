/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // jimp(이미지 해시)은 동적 플러그인 로드가 있어 서버 번들링 시 깨질 수 있음 → 외부 패키지로 처리
  experimental: { serverComponentsExternalPackages: ["jimp"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Robots-Tag",
            // noai·noimageai 는 일부 AI 수집기가 보는 값이다. 표준은 아니지만
            // 읽는 곳이 있으니 같이 적는다. 오픈하면 이 줄을 통째로 뺀다.
            value: "noindex, nofollow, noarchive, nosnippet, noimageindex, notranslate, nocache, noai, noimageai",
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;