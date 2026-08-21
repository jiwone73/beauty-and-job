"use client";

/**
 * 매장 · 본사 선택 아이콘 (가입·온보딩의 큰 선택 카드 전용).
 *
 * 범용 아이콘(가게/빌딩)은 어느 업종에나 붙어서 눈에 남지 않는다.
 * 여기서는 두 가지만 분명히 보이게 그린다.
 *   · 매장 — 차양(스캘럽) 달린 살롱 간판 + 거울 + 반짝임
 *   · 본사 — 층층이 창이 난 본사 건물 + 낮은 부속동
 * 선은 currentColor, 면은 같은 색을 옅게 깔아 선택 상태에서도 형태가 살아 있다.
 */

type Props = { size?: number; className?: string; style?: React.CSSProperties };

export function StoreIcon({ size = 26, className, style }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      className={className} style={style} aria-hidden focusable="false">
      {/* 차양: 위는 사다리꼴, 아래는 물결(스캘럽) */}
      <path
        d="M3.2 9.2 5.1 4.6Q5.4 3.9 6.2 3.9H17.8Q18.6 3.9 18.9 4.6L20.8 9.2a2.2 2.2 0 0 1-4.4 0a2.2 2.2 0 0 1-4.4 0a2.2 2.2 0 0 1-4.4 0a2.2 2.2 0 0 1-4.4 0Z"
        fill="currentColor" fillOpacity="0.14"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      {/* 매장 몸체 */}
      <path
        d="M5.2 11.5V19.4a1.2 1.2 0 0 0 1.2 1.2h11.2a1.2 1.2 0 0 0 1.2-1.2V11.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* 출입문 */}
      <path
        d="M10.1 20.6v-3.9a1.9 1.9 0 0 1 3.8 0v3.9"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* 거울 */}
      <circle cx="7.5" cy="15.2" r="1.35"
        stroke="currentColor" strokeWidth="1.4" />
      {/* 반짝임 */}
      <path
        d="M16.5 13.3 16.95 14.45 18.1 14.9 16.95 15.35 16.5 16.5 16.05 15.35 14.9 14.9 16.05 14.45Z"
        fill="currentColor" />
    </svg>
  );
}

export function OfficeIcon({ size = 26, className, style }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      className={className} style={style} aria-hidden focusable="false">
      {/* 본사 동 */}
      <path
        d="M12.6 20.6V5.2a1.3 1.3 0 0 1 1.3-1.3h5.1a1.3 1.3 0 0 1 1.3 1.3v15.4"
        fill="currentColor" fillOpacity="0.14"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      {/* 부속동 */}
      <path
        d="M3.7 20.6V10.7a1.3 1.3 0 0 1 1.3-1.3h7.6"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* 본사 창 */}
      <path d="M15.1 7.4h2.7M15.1 10.6h2.7M15.1 13.8h2.7"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* 부속동 창 */}
      <path d="M6.3 13h3M6.3 16.2h3"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* 정문 */}
      <path d="M15.1 20.6v-2.5a1.7 1.7 0 0 1 3.4 0v2.5"
        stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* 지면 */}
      <path d="M2.6 20.6h18.8"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
