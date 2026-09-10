"use client";
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import {
  LAUNCH_TASKS, GROUPS, GROUP_COLOR, CRITICAL_PATH, 오픈일, 일정시작, 연휴, 영업일,
  type LaunchTask,
} from "@/lib/launchPlan";

// 상용화 일정 — 무엇이 언제까지고, 어디가 밀리면 오픈이 밀리는가.
//
// 목록만 두면 「어느 것이 급한지」가 안 보인다. 날짜 위에 막대로 눕히고,
// 가장 긴 사슬(critical path)을 따로 굵게 그린다.

type 상태 = "todo" | "doing" | "done" | "blocked";
const 상태이름: Record<상태, string> = { todo: "할 일", doing: "하는 중", done: "끝", blocked: "막힘" };
const 상태색: Record<상태, string> = { todo: "#b3adbd", doing: "#582681", done: "#2f7a4d", blocked: "#c0392b" };

const 날 = (iso: string) => new Date(`${iso}T00:00:00+09:00`).getTime();
const 하루 = 86400000;
const 짧게 = (iso: string) => `${Number(iso.slice(5, 7))}/${Number(iso.slice(8, 10))}`;

export default function LaunchPage() {
  const token = () => (typeof window === "undefined" ? "" : localStorage.getItem("admin_token") || "");
  const [상태맵, set상태맵] = useState<Record<string, 상태>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = () => {
    fetch("/api/admin/launch-tasks", { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) return;
        set상태맵(Object.fromEntries((res.data.items || []).map((x: any) => [x.id, x.status])));
      })
      .catch(() => {});
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const 바꾸기 = async (id: string, status: 상태) => {
    setBusy(id);
    set상태맵((m) => ({ ...m, [id]: status }));
    try {
      await fetch("/api/admin/launch-tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id, status }),
      });
    } finally { setBusy(null); }
  };

  // ── 가로 눈금: 일정시작 ~ 오픈일 ──
  const 시작 = 날(일정시작);
  const 끝 = 날(오픈일);
  const 총일 = Math.round((끝 - 시작) / 하루) + 1;
  const 왼쪽 = (iso: string) => ((날(iso) - 시작) / 하루 / 총일) * 100;
  const 너비 = (a: string, b: string) => (((날(b) - 날(a)) / 하루 + 1) / 총일) * 100;

  const 오늘 = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }); // YYYY-MM-DD
  const 남은날 = Math.max(0, Math.round((끝 - 날(오늘)) / 하루));
  const 남은영업일 = 영업일(오늘, 오픈일);

  const 눈금 = useMemo(() => {
    const out: { iso: string; left: number; 주말: boolean }[] = [];
    for (let t = 시작; t <= 끝; t += 하루) {
      const d = new Date(t);
      const iso = d.toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
      const 요일 = d.getDay();
      if (요일 === 1 || t === 시작 || t === 끝) out.push({ iso, left: 왼쪽(iso), 주말: false });
    }
    return out;
  }, [시작, 끝]); // eslint-disable-line react-hooks/exhaustive-deps

  const 막대 = (t: LaunchTask) => ({ a: t.start || t.due, b: t.due });
  const 급한것 = (t: LaunchTask) => CRITICAL_PATH.includes(t.id);

  const 사슬 = CRITICAL_PATH.map((id) => LAUNCH_TASKS.find((t) => t.id === id)!).filter(Boolean);
  const 사슬여유 = 영업일(사슬[사슬.length - 1].due, 오픈일) - 1;

  const 센다 = (s: 상태) => LAUNCH_TASKS.filter((t) => (상태맵[t.id] || "todo") === s).length;

  return (
    <AdminLayout activeMenu="launch">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

        <div className="admin-stat-grid">
          {[
            { label: "오픈까지", value: `D-${남은날}`, sub: "2026년 10월 1일" },
            { label: "남은 영업일", value: `${남은영업일}일`, sub: `추석 ${짧게(연휴.start)}~${짧게(연휴.end)} 제외` },
            { label: "끝난 일", value: `${센다("done")} / ${LAUNCH_TASKS.length}`, sub: `하는 중 ${센다("doing")}` },
            { label: "가장 긴 사슬 여유", value: `${사슬여유}일`, sub: "여기가 밀리면 오픈이 밀린다" },
          ].map((c) => (
            <div key={c.label} className="admin-stat-card">
              <div className="admin-stat-label">{c.label}</div>
              <div className="admin-stat-value">{c.value}</div>
              <div className="admin-stat-sub-text">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* ── 가장 긴 사슬 ── */}
        <div className="admin-card">
          <div className="admin-card-head"><h2 className="admin-card-title">가장 긴 사슬 (critical path)</h2></div>
          <div style={{ display: "flex", alignItems: "stretch", gap: 0, padding: "16px 20px", flexWrap: "wrap" }}>
            {사슬.map((t, i) => {
              const st = (상태맵[t.id] || "todo") as 상태;
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center" }}>
                  <div style={{ minWidth: 132, padding: "10px 12px", borderRadius: 10,
                    border: `1.5px solid ${st === "done" ? "#2f7a4d" : "#c0392b"}`,
                    background: st === "done" ? "#f1f8f3" : "#fff" }}>
                    <div style={{ fontSize: 12, color: "#9a9aa0", marginBottom: 3 }}>{짧게(t.due)}까지</div>
                    <div style={{ fontSize: 13.5, color: "#555", lineHeight: 1.4 }}>{t.title}</div>
                    <div style={{ fontSize: 11.5, color: 상태색[st], marginTop: 4 }}>{상태이름[st]}</div>
                  </div>
                  {i < 사슬.length - 1 && <span style={{ color: "#c8c8cd", padding: "0 8px", fontSize: 15 }}>→</span>}
                </div>
              );
            })}
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ color: "#c8c8cd", padding: "0 8px", fontSize: 15 }}>→</span>
              <div style={{ minWidth: 92, padding: "10px 12px", borderRadius: 10, border: "1.5px solid #582681", background: "#582681" }}>
                <div style={{ fontSize: 12, color: "#d8c9e8", marginBottom: 3 }}>{짧게(오픈일)}</div>
                <div style={{ fontSize: 13.5, color: "#fff" }}>오픈</div>
              </div>
            </div>
          </div>
          <div style={{ padding: "0 20px 16px", fontSize: 13, color: "#9a9aa0" }}>
            PG 가입이 늦으면 구매안전서비스 확인증이 안 나와 통신판매업 신고가 막히고, 그러면 결제 연동과 결제 시험이 통째로 추석 뒤로 넘어간다.
          </div>
        </div>

        {/* ── 간트 ── */}
        <div className="admin-card">
          <div className="admin-card-head"><h2 className="admin-card-title">일정</h2></div>
          <div style={{ padding: "14px 20px 20px" }}>
            {/* 눈금 */}
            <div style={{ display: "flex", marginBottom: 6 }}>
              <div style={{ width: 250, flexShrink: 0 }} />
              <div style={{ flex: 1, position: "relative", height: 16 }}>
                {눈금.map((g) => (
                  <span key={g.iso} style={{ position: "absolute", left: `${g.left}%`, fontSize: 11.5, color: "#b3adbd", transform: "translateX(-50%)" }}>
                    {짧게(g.iso)}
                  </span>
                ))}
              </div>
            </div>

            {GROUPS.map((g) => {
              const ts = LAUNCH_TASKS.filter((t) => t.group === g);
              if (!ts.length) return null;
              return (
                <div key={g} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 13, color: GROUP_COLOR[g], padding: "8px 0 4px" }}>{g}</div>
                  {ts.map((t) => {
                    const { a, b } = 막대(t);
                    const st = (상태맵[t.id] || "todo") as 상태;
                    const 급 = 급한것(t);
                    return (
                      <div key={t.id} style={{ display: "flex", alignItems: "center", padding: "3px 0" }}>
                        <div style={{ width: 250, flexShrink: 0, paddingRight: 12, fontSize: 13.5,
                          color: st === "done" ? "#b3adbd" : "#555",
                          textDecoration: st === "done" ? "line-through" : "none",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {급 && <span style={{ color: "#c0392b", marginRight: 4 }}>●</span>}
                          {t.title}
                        </div>
                        <div style={{ flex: 1, position: "relative", height: 22 }}>
                          {/* 연휴 — 못 쓰는 구간 */}
                          <div style={{ position: "absolute", left: `${왼쪽(연휴.start)}%`, width: `${너비(연휴.start, 연휴.end)}%`, top: 0, bottom: 0, background: "#f6f6f8" }} />
                          {/* 오늘 */}
                          <div style={{ position: "absolute", left: `${왼쪽(오늘)}%`, top: 0, bottom: 0, width: 1, background: "#d8c9e8" }} />
                          <div title={`${a} ~ ${b}`} style={{
                            position: "absolute", left: `${왼쪽(a)}%`, width: `${Math.max(너비(a, b), 2.5)}%`,
                            top: 4, height: 14, borderRadius: 7,
                            background: st === "done" ? "#dfeee4" : GROUP_COLOR[t.group],
                            opacity: st === "done" ? 1 : 0.9,
                            border: 급 ? "1.5px solid #7d1f13" : "none", boxSizing: "border-box",
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12, color: "#9a9aa0", flexWrap: "wrap" }}>
              <span><span style={{ color: "#c0392b" }}>●</span> 가장 긴 사슬</span>
              <span><span style={{ display: "inline-block", width: 18, height: 9, background: "#f6f6f8", verticalAlign: "middle", marginRight: 4 }} />추석 연휴</span>
              <span><span style={{ display: "inline-block", width: 1, height: 11, background: "#d8c9e8", verticalAlign: "middle", marginRight: 5 }} />오늘</span>
            </div>
          </div>
        </div>

        {/* ── 항목 ── */}
        <div className="admin-card">
          <div className="admin-card-head"><h2 className="admin-card-title">할 일</h2></div>
          {GROUPS.map((g) => (
            <div key={g}>
              <div style={{ padding: "9px 20px", background: "#fafafb", borderBottom: "1px solid #f2f2f4", fontSize: 13.5, color: GROUP_COLOR[g] }}>{g}</div>
              {LAUNCH_TASKS.filter((t) => t.group === g).map((t) => {
                const st = (상태맵[t.id] || "todo") as 상태;
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 20px", borderBottom: "1px solid #f6f6f8" }}>
                    <span style={{ width: 52, flexShrink: 0, fontSize: 13, color: "#9a9aa0", paddingTop: 1 }}>{짧게(t.due)}</span>
                    <span style={{ width: 52, flexShrink: 0, fontSize: 12.5, color: "#b3adbd", paddingTop: 2 }}>{t.owner}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, color: st === "done" ? "#b3adbd" : "#555", textDecoration: st === "done" ? "line-through" : "none" }}>
                        {급한것(t) && <span style={{ color: "#c0392b", marginRight: 4 }}>●</span>}
                        {t.title}
                      </div>
                      {t.note && <div style={{ fontSize: 12.5, color: "#9a9aa0", marginTop: 2 }}>{t.note}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      {(["todo", "doing", "done", "blocked"] as 상태[]).map((v) => (
                        <button key={v} type="button" disabled={busy === t.id} onClick={() => 바꾸기(t.id, v)}
                          style={{ padding: "4px 9px", borderRadius: 7, fontSize: 12.5, cursor: "pointer",
                            border: `1px solid ${st === v ? 상태색[v] : "#efeff1"}`,
                            background: st === v ? "#f7f7f8" : "#fff",
                            color: st === v ? 상태색[v] : "#b3adbd" }}>
                          {상태이름[v]}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
