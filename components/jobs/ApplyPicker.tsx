"use client";

// 지원 버튼 위 — 무엇에, 어디로 내는가.
//
// 공고 하나에 모집부문이 넷이고 지점이 둘이면 「지원했다」만으로는 매장이
// 무엇을 받았는지 알 수 없다. 고를 것이 하나뿐이어도 목록에 그 하나를 둔다 —
// 있다가 없다가 하면 어느 자리에 냈는지 화면마다 달라진다.

export type 지원자리 = { 부문: string; 근무지: string };

export const 부문이름 = (p: any) =>
  [p?.category, p?.career].filter((v) => String(v || "").trim()).join(" · ");

/** 모집부문 행이 근무지를 「서울 강동구」처럼 시/구로 들고 있어, 주소 목록에서
 *  그 시/구를 품은 것을 찾아 잠근다. 없으면 고른 대로 둔다. */
export function 부문근무지(p: any, 근무지들: string[]): string | null {
  const v = String(p?.location || "").trim();
  if (!v) return null;
  const 맞는것 = 근무지들.find((a) => a.replace(/특별시|광역시|특별자치시|특별자치도/g, "").includes(v.replace(/특별시|광역시|특별자치시|특별자치도/g, "")));
  return 맞는것 || null;
}

export default function ApplyPicker({
  positions, 근무지들, 부문, set부문, 근무지, set근무지,
}: {
  positions: any[];
  근무지들: string[];
  부문: number;
  set부문: (i: number) => void;
  근무지: string;
  set근무지: (v: string) => void;
}) {
  const 부문잠김 = 부문근무지(positions[부문], 근무지들);

  return (
    <div className="apply-pick">
      {positions.length > 0 && (
        <label className="apply-pick-f">
          <span>모집분야</span>
          <select value={부문} onChange={(e) => set부문(Number(e.target.value))}>
            {positions.map((p, i) => (
              <option key={i} value={i}>
                {부문이름(p) || `모집부문 ${i + 1}`}
                {p?.salary ? ` · ${p.salary}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      {근무지들.length > 0 && (
        <label className="apply-pick-f">
          <span>근무지</span>
          <select value={부문잠김 || 근무지} disabled={!!부문잠김 || 근무지들.length < 2}
            onChange={(e) => set근무지(e.target.value)}>
            {근무지들.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}
