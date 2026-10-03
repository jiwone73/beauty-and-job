"use client";
import AdminLayout from "@/components/admin/AdminLayout";
import { 상용화계획, 계획날짜 } from "@/lib/commercePlan";

// 상용화 계획 — 이벤트로 시작해 가산점을 거쳐 유료화로 가는 길을 표 하나로.
// 내용은 lib/commercePlan.ts 가 갖고 있고 docs/상용화계획.md 에도 같은 문서가 있다.

const 상태색: Record<string, string> = {
  완료: "#2f7a4d", "구현 전": "#582681", "오픈 후": "#582681", 점검: "#c0392b", 미정: "#8a8a90",
};

export default function LaunchPage() {
  // 같은 구분이 이어지면 첫 칸을 한 번만 적는다(rowSpan).
  const 칸수 = (i: number) => {
    if (i > 0 && 상용화계획[i - 1].구분 === 상용화계획[i].구분) return 0;
    let n = 1;
    while (i + n < 상용화계획.length && 상용화계획[i + n].구분 === 상용화계획[i].구분) n++;
    return n;
  };

  return (
    <AdminLayout activeMenu="launch">
      <div className="admin-card">
        <div className="admin-card-head">
          <h2 className="admin-card-title">상용화 계획</h2>
          <span style={{ fontSize: 13, color: "#8a8a90" }}>{계획날짜.replace(/-/g, ".")} 정리</span>
        </div>
        <div style={{ overflowX: "auto", padding: "0 20px 20px" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, color: "#555" }}>
            <thead>
              <tr>
                {["구분", "항목", "내용", "상태"].map((h) => (
                  <th key={h} style={{ textAlign: "left", fontWeight: 400, color: "#8a8a90", padding: "8px 10px", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {상용화계획.map((r, i) => {
                const n = 칸수(i);
                return (
                  <tr key={`${r.구분}-${r.항목}`}>
                    {n > 0 && (
                      <td rowSpan={n} style={{ padding: "10px", borderBottom: "1px solid #eee", verticalAlign: "top", color: "#582681", whiteSpace: "nowrap", background: "#fafafb" }}>{r.구분}</td>
                    )}
                    <td style={{ padding: "10px", borderBottom: "1px solid #f4f4f6", verticalAlign: "top", whiteSpace: "nowrap" }}>{r.항목}</td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f4f4f6", verticalAlign: "top", lineHeight: 1.65 }}>
                      {r.내용.map((t) => <div key={t} style={{ marginBottom: 2 }}>{t}</div>)}
                    </td>
                    <td style={{ padding: "10px", borderBottom: "1px solid #f4f4f6", verticalAlign: "top", whiteSpace: "nowrap", color: 상태색[r.상태] || "#555" }}>{r.상태}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
