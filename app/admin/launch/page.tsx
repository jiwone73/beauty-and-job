"use client";
import AdminLayout from "@/components/admin/AdminLayout";
import { 상용화계획, 계획날짜, type 블록 } from "@/lib/commercePlan";

// 상용화 계획 — 이벤트로 시작해 가산점을 거쳐 유료화로 가는 길.
// 내용은 lib/commercePlan.ts 가 갖고 있고 docs/상용화계획.md 에도 같은 문서가 있다.

function 그리기(b: 블록, i: number) {
  if (b.종류 === "글") {
    return <p key={i} style={{ margin: 0, fontSize: 14, color: "#555", lineHeight: 1.7 }}>{b.글}</p>;
  }
  if (b.종류 === "목록") {
    return (
      <ul key={i} style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: "#555", lineHeight: 1.7 }}>
        {b.줄.map((x) => <li key={x} style={{ marginBottom: 4 }}>{x}</li>)}
      </ul>
    );
  }
  return (
    <div key={i} style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5, color: "#555" }}>
        <thead>
          <tr>
            {b.머리.map((h, k) => (
              <th key={k} style={{ textAlign: "left", fontWeight: 400, color: "#8a8a90", padding: "7px 10px", borderBottom: "1px solid #eee", whiteSpace: "nowrap" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.줄.map((r, k) => (
            <tr key={k}>
              {r.map((c, j) => (
                <td key={j} style={{ padding: "8px 10px", borderBottom: "1px solid #f4f4f6", verticalAlign: "top", lineHeight: 1.6, whiteSpace: j === 0 ? "nowrap" : "normal", color: j === 0 ? "#582681" : "#555" }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LaunchPage() {
  return (
    <AdminLayout activeMenu="launch">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#8a8a90" }}>{계획날짜.replace(/-/g, ".")} 정리</p>
        {상용화계획.map((s) => (
          <div key={s.제목} className="admin-card">
            <div className="admin-card-head"><h2 className="admin-card-title">{s.제목}</h2></div>
            <div style={{ padding: "4px 20px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
              {s.부제 && <p style={{ margin: 0, fontSize: 13, color: "#8a8a90" }}>{s.부제}</p>}
              {s.블록.map(그리기)}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
}
