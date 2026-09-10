"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { TEST_CASES, TEST_TEAM, type Area } from "@/lib/testCases";

// 클로드 테스트팀 근무현황 — 알바 근무현황과 같은 얼개.
//
// 누가 어디를 맡아 어디까지 갔는지, 마지막으로 언제 돌렸는지를 한 화면에 둔다.
// 시험은 클로드가 돌리지만 결정은 사람이 한다 — 그래서 「정해 주셔야 하는 것」이
// 몇 건인지가 이 화면에서 제일 먼저 보여야 한다.

type Run = { case_id: string; area: Area; result: "pass" | "fail" | "blocked"; note: string | null; ran_at: string };
type Report = { id: string; area: Area; title: string; severity: string; status: string; case_id: string | null; decided_by: string | null };

const 결과이름: Record<string, string> = { pass: "맞음", fail: "어긋남", blocked: "막힘" };
const 결과색: Record<string, string> = { pass: "#2f7a4d", fail: "#c0392b", blocked: "#c0392b" };

const 언제 = (iso: string) => {
  const d = new Date(iso);
  const 분 = Math.floor((Date.now() - d.getTime()) / 60000);
  if (분 < 1) return "방금";
  if (분 < 60) return `${분}분 전`;
  if (분 < 60 * 24) return `${Math.floor(분 / 60)}시간 전`;
  return `${d.getMonth() + 1}.${d.getDate()}`;
};

export default function TestTeamPage() {
  const token = () => (typeof window === "undefined" ? "" : localStorage.getItem("admin_token") || "");
  const [runs, setRuns] = useState<Run[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([
        fetch("/api/admin/test-runs", { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
        fetch("/api/admin/test-reports", { headers: { Authorization: `Bearer ${token()}` } }).then((r) => r.json()),
      ]);
      if (a.success) setRuns(a.data.items || []);
      if (b.success) setReports(b.data.items || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const 남은날 = Math.max(0, Math.ceil((new Date("2026-10-01T00:00:00+09:00").getTime() - Date.now()) / 86400000));
  const 결과맵 = useMemo(() => Object.fromEntries(runs.map((r) => [r.case_id, r])), [runs]);

  const 조별 = useMemo(() => TEST_TEAM.map((m) => {
    const 대기 = TEST_CASES.filter((c) => c.area === m.area && c.waiting).length;
    const cs = TEST_CASES.filter((c) => c.area === m.area && !c.waiting);
    const 돌린것 = cs.map((c) => 결과맵[c.id]).filter(Boolean) as Run[];
    const 어긋남 = 돌린것.filter((r) => r.result !== "pass").length;
    const 마지막 = 돌린것.map((r) => r.ran_at).sort().slice(-1)[0] || null;
    const 정해야 = reports.filter((r) => r.area === m.area && r.status === "open").length;
    return { ...m, 전체: cs.length, 해봄: 돌린것.length, 어긋남, 마지막, 정해야, 대기 };
  }), [결과맵, reports]);

  const 전체케이스 = TEST_CASES.filter((c) => !c.waiting).length;
  const 기다리는수 = TEST_CASES.filter((c) => c.waiting).length;
  const 해본것 = runs.length;
  const 정해야할것 = reports.filter((r) => r.status === "open").length;

  const 최근 = useMemo(() =>
    [...runs].sort((a, b) => (a.ran_at < b.ran_at ? 1 : -1)).slice(0, 20), [runs]);

  const 케이스이름 = (id: string) => TEST_CASES.find((c) => c.id === id)?.title || id;

  return (
    <AdminLayout activeMenu="test-team">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#777" }}>
          오픈 <b style={{ color: "#582681" }}>2026.10.01</b> · 남은 <b style={{ color: "#582681" }}>{남은날}일</b> ·
          {" "}케이스 {전체케이스}건 중 {해본것}건 돌림
          {기다리는수 > 0 && ` · PG·요금제 기다리는 것 ${기다리는수}건`}
          {정해야할것 > 0 && <span style={{ marginLeft: 8, color: "#c0392b" }}>● 정해 주셔야 할 것 {정해야할것}건</span>}
        </p>
        <button onClick={load} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
          <RefreshCw size={14} /> 새로고침
        </button>
      </div>

      <div className="admin-card" style={{ marginBottom: 14 }}>
        <div className="admin-card-head"><h2 className="admin-card-title">조별 현황</h2></div>
        {조별.map((m) => {
          const pct = m.전체 ? Math.round((m.해봄 / m.전체) * 100) : 0;
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 20px", borderBottom: "1px solid #f6f6f8" }}>
              <div style={{ width: 150, flexShrink: 0 }}>
                <div style={{ fontSize: 14.5, color: "#555" }}>{m.name}</div>
                <div style={{ fontSize: 12.5, color: "#9a9aa0" }}>{m.area}</div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: "#9a9aa0", marginBottom: 5 }}>{m.role}</div>
                <div style={{ height: 8, borderRadius: 4, background: "#f2f2f4", overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: m.어긋남 ? "#c0392b" : "#582681" }} />
                </div>
              </div>
              <div style={{ width: 96, flexShrink: 0, textAlign: "right", fontSize: 13.5, color: "#555" }}>{m.해봄} / {m.전체}</div>
              <div style={{ width: 92, flexShrink: 0, textAlign: "right", fontSize: 13.5, color: m.정해야 ? "#c0392b" : "#b3adbd" }}>
                {m.정해야 ? `정해야 ${m.정해야}` : m.어긋남 ? `어긋남 ${m.어긋남}` : m.대기 ? `대기 ${m.대기}` : "—"}
              </div>
              <div style={{ width: 74, flexShrink: 0, textAlign: "right", fontSize: 12.5, color: "#b3adbd" }}>
                {m.마지막 ? 언제(m.마지막) : "대기"}
              </div>
            </div>
          );
        })}
      </div>

      <div className="admin-card">
        <div className="admin-card-head">
          <h2 className="admin-card-title">최근 돌린 기록</h2>
          <Link href="/admin/test-reports" className="admin-card-more">리포트 보기</Link>
        </div>
        {loading ? (
          <div className="admin-empty" style={{ textAlign: "center" }}>불러오는 중…</div>
        ) : 최근.length === 0 ? (
          <div className="admin-empty" style={{ textAlign: "center" }}>아직 돌린 기록이 없습니다.</div>
        ) : (
          최근.map((r) => (
            <div key={r.case_id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px", borderBottom: "1px solid #f6f6f8" }}>
              <span style={{ width: 84, flexShrink: 0, fontSize: 12.5, color: "#9a9aa0" }}>{r.case_id}</span>
              <span style={{ width: 104, flexShrink: 0, fontSize: 13, color: "#9a9aa0" }}>{r.area}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {케이스이름(r.case_id)}
                {r.note && <span style={{ color: "#9a9aa0" }}> · {r.note}</span>}
              </span>
              <span style={{ width: 60, flexShrink: 0, textAlign: "right", fontSize: 13, color: 결과색[r.result] }}>{결과이름[r.result]}</span>
              <span style={{ width: 74, flexShrink: 0, textAlign: "right", fontSize: 12.5, color: "#b3adbd" }}>{언제(r.ran_at)}</span>
            </div>
          ))
        )}
      </div>
    </AdminLayout>
  );
}
