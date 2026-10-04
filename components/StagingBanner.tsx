import { 시험환경 } from "@/lib/appEnv";

// 시험 사이트에서만 보이는 표시. 운영과 헷갈려 실제 공고를 시험 사이트에 올리거나 그 반대가 되지 않게 한다.
// 머리글을 밀지 않도록 맨 위에 겹쳐 두고(pointer-events 없음), 눌러도 아래 화면이 그대로 눌린다.
export default function StagingBanner() {
  if (!시험환경) return null;
  return (
    <div
      aria-hidden
      style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", zIndex: 2147483000,
        pointerEvents: "none", padding: "2px 12px", borderRadius: "0 0 8px 8px",
        background: "#582681", color: "#fff", fontSize: 11.5, whiteSpace: "nowrap",
      }}
    >
      시험 환경 · 실제 서비스가 아니에요
    </div>
  );
}
