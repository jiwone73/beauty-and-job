import type { MetadataRoute } from "next";

// 홈 화면에 추가했을 때 브라우저 바 없이 뜨게 하는 설정.
//
// 사파리의 주소창과 아래 도구모음은 페이지가 숨길 수 있는 것이 아니다. 그것을
// 없애는 길은 하나뿐 — 홈 화면에 추가한 뒤 그 아이콘으로 여는 것이고, 그러려면
// display 가 standalone 이어야 한다. 이 파일이 없으면 아이콘으로 열어도 그냥
// 사파리가 뜬다.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "뷰티워크",
    short_name: "뷰티워크",
    description: "뷰티 산업 종사자를 위한 채용 플랫폼",
    start_url: "/",
    // 브라우저 바를 걷어내는 값. minimal-ui 로 두면 주소창이 남는다.
    display: "standalone",
    background_color: "#fdfbff",
    theme_color: "#5f0080",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
