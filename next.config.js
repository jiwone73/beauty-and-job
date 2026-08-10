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
            value: "noindex, nofollow, noarchive, nosnippet",
          },
        ],
      },
    ];
  },
};
module.exports = nextConfig;