"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import { ALBA_IDLE_GAP_MIN, formatMinutes } from "@/lib/alba";
import { ExternalLink, Plus, Trash2, RefreshCw } from "lucide-react";

type Week = {
  index: number; start: string; end: string;
  minutes: number; postings: number;
  isCurrent: boolean; isFuture: boolean;
};
type Session = {
  id: string; date: string; started_at: string; ended_at: string | null;
  minutes: number; note: string | null; isRunning: boolean;
};
type Posting = {
  id: string; title: string; company_name: string | null;
  status: string; created_at: string; date: string; week: number;
};
type Data = {
  adminId: string; startDate: string; today: string;
  weeklyTargetHours: number; currentWeekTargetMinutes?: number; reliefMinutes?: number;
  totalTargetHours: number;
  targetMinutes: number;      // 실제 총량(기본 + 미달 벌점 + 옮긴 시간) plannedWeeks: number;
  totalMinutes: number; remainingMinutes: number; weeksLeft: number;
  blockedWeeks?: Record<number, string>;
  neededPerWeekMinutes: number;
  currentWeek: Week | null; weeks: Week[];
  sessions: Session[]; postings: Posting[];
  running: { id: string; started_at: string; minutes: number } | null;
  penaltyPerShortfallHours: number;
  shortfallWeeks: number;
  penaltyHours: number;
  adjustedTargetHours: number;
  viewerIsOwner: boolean;
};

const fmtDate = (s: string) => s.slice(5).replace("-", "/");
const fmtClock = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso)) : "—";

export default function AlbaPage() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: "", start: "", end: "", note: "" });

  const token = () => (typeof window === "undefined" ? "" : localStorage.getItem("admin_token") || "");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/alba", { headers: { Authorization: `Bearer ${token()}` } });
      const d = await res.json();
      if (d.success) setData(d.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addSession = async () => {
    if (!form.date || !form.start || !form.end) return;
    const res = await fetch("/api/admin/alba/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify(form),
    });
    const d = await res.json();
    if (!d.success) { alert(d.error?.message || "추가하지 못했어요."); return; }
    setForm({ date: "", start: "", end: "", note: "" });
    setAdding(false);
    load();
  };

  const removeSession = async (id: string) => {
    if (!confirm("이 근무 기록을 지울까요?")) return;
    await fetch(`/api/admin/alba/sessions?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token()}` },
    });
    load();
  };

  if (loading && !data) {
    return <AdminLayout activeMenu="members-alba"><div className="admin-empty">불러오는 중...</div></AdminLayout>;
  }
  if (!data) {
    return <AdminLayout activeMenu="members-alba"><div className="admin-empty">불러오지 못했어요.</div></AdminLayout>;
  }

  // 본인은 자기 기록에 손대지 못한다 — 스스로 적을 수 있으면 근거가 되지 못한다.
  const canEdit = !data.viewerIsOwner;
  // 미달한 주가 있으면 채워야 할 총 시간이 늘어난다.
  const targetMin = data.adjustedTargetHours * 60;
  const pct = Math.min(100, Math.round((data.totalMinutes / targetMin) * 100));
  const weeklyTargetMin = data.currentWeekTargetMinutes ?? data.weeklyTargetHours * 60;
  const cw = data.currentWeek;
  const cwPct = cw ? Math.min(100, Math.round((cw.minutes / weeklyTargetMin) * 100)) : 0;

  const card: React.CSSProperties = {
    background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 18,
  };
  const label: React.CSSProperties = { fontSize: 12, color: "#888", marginBottom: 6 };
  const big: React.CSSProperties = { fontSize: 24, color: "#1a1a1a" };

  return (
    <AdminLayout activeMenu="members-alba">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 13, color: "#777" }}>
          아이디 <b style={{ color: "#582681" }}>{data.adminId}</b> · {data.startDate} 시작 ·
          {" "}매주 월~일 기준 주 {data.weeklyTargetHours}시간, 합계 {formatMinutes(data.targetMinutes)}
          {data.running && (
            <span style={{ marginLeft: 8, color: "#0f6e56" }}>● 지금 근무 중</span>
          )}
        </p>
        <button onClick={load} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
          <RefreshCw size={14} /> 새로고침
        </button>
      </div>

      {/* 요약 */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 20 }}>
        <div style={card}>
          <p style={label}>총 근무 할당 시간</p>
          <p style={big}>{formatMinutes(data.targetMinutes)}</p>
          <div style={{ height: 6, background: "#f1f1f1", borderRadius: 999, marginTop: 10, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "#582681" }} />
          </div>
          <p style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
            {formatMinutes(data.totalMinutes)} 완료 · {pct}%
            {data.penaltyHours > 0 && (
              <span style={{ color: "#e74c3c" }}>
                {" "}(기본 {data.totalTargetHours} + 미달 {data.shortfallWeeks}주 × {data.penaltyPerShortfallHours}시간)
              </span>
            )}
          </p>
        </div>

        <div style={card}>
          <p style={label}>이번 주 근무시간 ({cw ? `${fmtDate(cw.start)}~${fmtDate(cw.end)}` : "-"})</p>
          <p style={{ ...big, color: cw && cw.minutes >= weeklyTargetMin ? "#0f6e56" : "#1a1a1a" }}>
            {formatMinutes(cw?.minutes || 0)}
          </p>
          <div style={{ height: 6, background: "#f1f1f1", borderRadius: 999, marginTop: 10, overflow: "hidden" }}>
            <div style={{ width: `${cwPct}%`, height: "100%", background: cwPct >= 100 ? "#0f6e56" : "#582681" }} />
          </div>
          <p style={{ fontSize: 12, color: "#888", marginTop: 6 }}>
            최소 {formatMinutes(weeklyTargetMin)} · {cw && cw.minutes >= weeklyTargetMin
              ? "달성"
              : `${formatMinutes(Math.max(0, weeklyTargetMin - (cw?.minutes || 0)))} 남음`}
          </p>
        </div>

        <div style={card}>
          <p style={label}>남은 근무시간</p>
          <p style={big}>{formatMinutes(data.remainingMinutes)}</p>
          <p style={{ fontSize: 12, color: "#888", marginTop: 10 }}>
            주 {formatMinutes(data.neededPerWeekMinutes)}씩 · {data.weeksLeft}주 더
          </p>
        </div>

        {/* 시간만으로는 일을 했는지 알 수 없다. 결과물과 나란히 놓고 봐야 한다. */}
        <div style={card}>
          <p style={label}>등록한 비회원 공고</p>
          <p style={big}>{data.postings.length}건</p>
          <p style={{ fontSize: 12, color: "#888", marginTop: 10 }}>
            이번 주 {cw?.postings || 0}건 ·{" "}
            {data.totalMinutes >= 30
              ? `시간당 ${(data.postings.length / (data.totalMinutes / 60)).toFixed(1)}건`
              : "시간당 —"}
          </p>
        </div>
      </div>

      {/* 주차별 */}
      <h3 style={{ fontSize: 15, margin: "0 0 10px", color: "#1a1a1a" }}>주차별 진행</h3>
      <div style={{ ...card, padding: 0, overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
          <thead>
            <tr style={{ background: "#fafafa", color: "#666" }}>
              <th style={{ textAlign: "left", padding: "10px 14px", whiteSpace: "nowrap" }}>주차</th>
              <th style={{ textAlign: "left", padding: "10px 14px", whiteSpace: "nowrap" }}>기간 (월~일)</th>
              <th style={{ textAlign: "right", padding: "10px 14px", whiteSpace: "nowrap" }}>근무</th>
              <th style={{ textAlign: "right", padding: "10px 14px", whiteSpace: "nowrap" }}>공고</th>
              <th style={{ textAlign: "left", padding: "10px 14px", whiteSpace: "nowrap" }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {data.weeks.map((w) => {
              const done = w.minutes >= weeklyTargetMin;
              return (
                <tr key={w.index} style={{ borderTop: "1px solid #f2f2f2", background: w.isCurrent ? "#f7f7f8" : undefined }}>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    {w.index}주차{w.isCurrent && <span style={{ marginLeft: 6, fontSize: 11, color: "#582681" }}>이번 주</span>}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#666", whiteSpace: "nowrap" }}>{fmtDate(w.start)} ~ {fmtDate(w.end)}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>{w.minutes ? formatMinutes(w.minutes) : "—"}</td>
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>{w.postings || "—"}</td>
                  <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                    {w.isFuture ? <span style={{ color: "#bbb" }}>예정</span>
                      : done ? <span style={{ color: "#0f6e56" }}>달성</span>
                      : w.isCurrent ? <span style={{ color: "#582681" }}>{formatMinutes(weeklyTargetMin - w.minutes)} 남음</span>
                      : data.blockedWeeks?.[w.index] ? <span style={{ color: "#8a8a90" }}>
                          미달 {formatMinutes(weeklyTargetMin - w.minutes)} · {data.blockedWeeks[w.index]}
                        </span>
                      : <span style={{ color: "#e74c3c" }}>
                          미달 {formatMinutes(weeklyTargetMin - w.minutes)} · 목표 +{data.penaltyPerShortfallHours}시간
                        </span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 근무 기록 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 10px" }}>
        <h3 style={{ fontSize: 15, margin: 0, color: "#1a1a1a" }}>근무 기록</h3>
        {canEdit && (
          <button onClick={() => setAdding(!adding)} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, background: "none", border: "1px solid #ddd", borderRadius: 8, padding: "6px 12px", cursor: "pointer" }}>
            <Plus size={14} /> 직접 추가
          </button>
        )}
      </div>
      <p style={{ fontSize: 12, color: "#999", margin: "0 0 10px" }}>
        관리자 창이 화면에 떠 있는 동안 자동으로 쌓입니다. {ALBA_IDLE_GAP_MIN}분 넘게 조작이 없으면
        마지막 활동 시각에서 끊깁니다.
        {canEdit
          ? " 자동 측정이 놓친 시간은 직접 추가하세요."
          : " 빠지거나 잘못 잡힌 시간이 있으면 관리자에게 알려 주세요."}
      </p>

      {canEdit && adding && (
        <div style={{ ...card, marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
            style={{ height: 36, padding: "0 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} />
          <input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })}
            style={{ height: 36, padding: "0 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} />
          <span style={{ color: "#999" }}>~</span>
          <input type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })}
            style={{ height: 36, padding: "0 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} />
          <input type="text" placeholder="사유 (선택)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
            style={{ flex: 1, minWidth: 140, height: 36, padding: "0 10px", border: "1px solid #ddd", borderRadius: 8, fontSize: 13 }} />
          <button onClick={addSession} style={{ height: 36, padding: "0 16px", background: "#582681", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, cursor: "pointer" }}>추가</button>
        </div>
      )}

      <div style={{ ...card, padding: 0, overflowX: "auto", marginBottom: 24 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
          <thead>
            <tr style={{ background: "#fafafa", color: "#666" }}>
              <th style={{ textAlign: "left", padding: "10px 14px", whiteSpace: "nowrap" }}>날짜</th>
              <th style={{ textAlign: "left", padding: "10px 14px", whiteSpace: "nowrap" }}>시작~종료</th>
              <th style={{ textAlign: "right", padding: "10px 14px", whiteSpace: "nowrap" }}>시간</th>
              <th style={{ textAlign: "left", padding: "10px 14px" }}>메모</th>
              {canEdit && <th style={{ width: 40 }} />}
            </tr>
          </thead>
          <tbody>
            {data.sessions.length === 0 && (
              <tr><td colSpan={canEdit ? 5 : 4} style={{ padding: 20, textAlign: "center", color: "#999" }}>아직 기록이 없어요.</td></tr>
            )}
            {data.sessions.map((s) => (
              <tr key={s.id} style={{ borderTop: "1px solid #f2f2f2" }}>
                <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                  {fmtDate(s.date)}
                  {s.isRunning && <span style={{ marginLeft: 6, fontSize: 11, color: "#0f6e56" }}>● 진행 중</span>}
                </td>
                <td style={{ padding: "10px 14px", color: "#666", whiteSpace: "nowrap" }}>{fmtClock(s.started_at)} ~ {fmtClock(s.ended_at)}</td>
                <td style={{ padding: "10px 14px", textAlign: "right" }}>{formatMinutes(s.minutes)}</td>
                <td style={{ padding: "10px 14px", color: "#888" }}>{s.note || ""}</td>
                {canEdit && (
                  <td style={{ padding: "10px 6px", textAlign: "center" }}>
                    <button onClick={() => removeSession(s.id)} title="삭제"
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#c8c8c8" }}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 등록한 공고 */}
      <h3 style={{ fontSize: 15, margin: "0 0 10px", color: "#1a1a1a" }}>등록한 비회원 공고 ({data.postings.length}건)</h3>
      <div style={{ ...card, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 620 }}>
          <thead>
            <tr style={{ background: "#fafafa", color: "#666" }}>
              <th style={{ textAlign: "left", padding: "10px 14px", whiteSpace: "nowrap" }}>등록일</th>
              <th style={{ textAlign: "left", padding: "10px 14px", whiteSpace: "nowrap" }}>주차</th>
              <th style={{ textAlign: "left", padding: "10px 14px", minWidth: 220 }}>공고명</th>
              <th style={{ textAlign: "left", padding: "10px 14px" }}>업체</th>
              <th style={{ textAlign: "left", padding: "10px 14px", whiteSpace: "nowrap" }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {data.postings.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: "center", color: "#999" }}>아직 등록한 공고가 없어요.</td></tr>
            )}
            {data.postings.map((p) => (
              <tr key={p.id} style={{ borderTop: "1px solid #f2f2f2" }}>
                <td style={{ padding: "10px 14px", color: "#666", whiteSpace: "nowrap" }}>{fmtDate(p.date)} {fmtClock(p.created_at)}</td>
                <td style={{ padding: "10px 14px", color: "#666", whiteSpace: "nowrap" }}>{p.week}주차</td>
                <td style={{ padding: "10px 14px" }}>
                  <Link href={`/jobs/${p.id}`} target="_blank"
                    style={{ color: "#582681", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    {p.title} <ExternalLink size={12} />
                  </Link>
                </td>
                <td style={{ padding: "10px 14px", color: "#666" }}>{p.company_name || "—"}</td>
                <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: p.status === "ACTIVE" ? "#0f6e56" : "#999" }}>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
