"use client";
import { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { TEST_CASES, AREAS, type Area } from "@/lib/testCases";

// 테스트 리포트 — 왼쪽에서 고르고 오른쪽에서 본다(공지사항과 같은 짜임).
//
// 시험은 클로드가 돌린다. 고칠 길이 하나뿐이면 고치고 「처리됨」으로 올리고,
// 갈래가 둘 이상이면 손대지 않고 「정해야 함」으로 올려 여기서 고르게 한다.

type Report = {
  id: string; case_id: string | null; area: Area; title: string;
  severity: "막힘" | "정해야 함" | "알림";
  status: "open" | "done" | "wontfix";
  steps: string | null; expected: string | null; actual: string | null;
  options: { text: string; recommend?: boolean }[];
  decided_by: "admin" | "alba" | null;
  decision: string | null; decided_at: string | null;
  ref_url: string | null; created_at: string;
};

const 무게색: Record<string, { bg: string; fg: string }> = {
  "막힘": { bg: "#fdecea", fg: "#c0392b" },
  "정해야 함": { bg: "#fdf3e3", fg: "#a2701a" },
  "알림": { bg: "#f2f2f4", fg: "#666" },
};
const 상태이름: Record<string, string> = { open: "정해야 함", done: "처리됨", wontfix: "안 함" };

const 날짜 = (s: string | null) => (s ? `${new Date(s).getMonth() + 1}.${new Date(s).getDate()}` : "");

export default function TestReportsPage() {
  const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);
  const [list, setList] = useState<Report[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [보기, set보기] = useState<"현황" | "리포트" | "케이스">("현황");
  const [runs, setRuns] = useState<{ case_id: string; area: Area; result: "pass" | "fail" | "blocked"; ran_at: string }[]>([]);
  const [메일실패, set메일실패] = useState<{ total: number; items: { to_addr: string; subject: string; reason: string; created_at: string }[] }>({ total: 0, items: [] });
  const [거르기, set거르기] = useState<"open" | "done" | "">("open");
  const [고른것, set고른것] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    fetch(`/api/admin/test-reports${거르기 ? `?status=${거르기}` : ""}`, { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) { setList(res.data.items || []); setCounts(res.data.counts || {}); } })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [거르기]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch("/api/admin/test-runs", { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setRuns(res.data.items || []); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch("/api/admin/email-failures", { headers: { Authorization: `Bearer ${token()}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) set메일실패(res.data); })
      .catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 오픈까지 며칠 남았나 — 목표일 2026-10-01.
  const 남은날 = Math.max(0, Math.ceil((new Date("2026-10-01T00:00:00+09:00").getTime() - Date.now()) / 86400000));

  const 결과맵 = useMemo(() => Object.fromEntries(runs.map((r) => [r.case_id, r.result])), [runs]);
  // 아직 못 도는 것(PG·요금제 대기)은 분모에서 뺀다. 넣어 두면 진행률이 영영
  // 100 이 안 돼 「어디까지 왔나」를 말해 주지 못한다.
  const 지금할것 = useMemo(() => TEST_CASES.filter((c) => !c.waiting), []);
  const 기다림 = useMemo(() => TEST_CASES.filter((c) => c.waiting), []);
  const 영역현황 = useMemo(() => AREAS.map((area) => {
    const cs = 지금할것.filter((c) => c.area === area);
    const 대기 = 기다림.filter((c) => c.area === area).length;
    const 해봄 = cs.filter((c) => 결과맵[c.id]).length;
    const 걸림 = cs.filter((c) => 결과맵[c.id] === "fail" || 결과맵[c.id] === "blocked").length;
    return { area, 전체: cs.length, 해봄, 걸림, 대기 };
  }).filter((x) => x.전체 > 0 || x.대기 > 0), [결과맵, 지금할것, 기다림]);
  const 전체 = 지금할것.length;
  const 해본것 = 지금할것.filter((c) => 결과맵[c.id]).length;

  const 지금것 = list.find((r) => r.id === 고른것) || null;

  const 정하기 = async (id: string, decision: string, status: Report["status"]) => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/test-reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id, decision, status }),
      });
      const d = await res.json();
      if (!d.success) { alert(d.error?.message || "저장하지 못했습니다."); return; }
      load();
    } finally { setBusy(false); }
  };

  // 케이스마다 마지막 결과 — 리포트가 있으면 그 케이스는 걸린 것이다.
  const 케이스결과 = useMemo(() => {
    const m: Record<string, Report> = {};
    for (const r of list) if (r.case_id && !m[r.case_id]) m[r.case_id] = r;
    return m;
  }, [list]);

  return (
    <AdminLayout activeMenu="test-reports">
      <div style={{ display: "flex", gap: 8, marginBottom: 12, justifyContent: "center" }}>
        {(["현황", "리포트", "케이스"] as const).map((v) => (
          <button key={v} type="button" onClick={() => set보기(v)}
            style={{ padding: "6px 14px", borderRadius: 8, fontSize: 14, cursor: "pointer",
              border: `1px solid ${보기 === v ? "#582681" : "#efeff1"}`,
              background: 보기 === v ? "#582681" : "#fff", color: 보기 === v ? "#fff" : "#555" }}>
            {v === "현황" ? "현황" : v === "리포트" ? `리포트${counts.open ? ` ${counts.open}` : ""}` : `테스트 케이스 ${TEST_CASES.length}`}
          </button>
        ))}
      </div>

      {보기 === "현황" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="admin-stat-grid">
            {[
              { label: "오픈까지", value: `D-${남은날}`, sub: "10월 1일" },
              { label: "테스트 케이스", value: `${해본것} / ${전체}`, sub: `안 해본 것 ${전체 - 해본것}건` },
              { label: "정해야 할 것", value: String(counts.open ?? 0), sub: "사람이 골라야 진행됨" },
              { label: "기다리는 것", value: String(기다림.length), sub: "PG·요금제가 정해져야 돌림" },
            ].map((c) => (
              <div key={c.label} className="admin-stat-card">
                <div className="admin-stat-label">{c.label}</div>
                <div className="admin-stat-value">{c.value}</div>
                <div className="admin-stat-sub-text" style={{ color: "#555" }}>{c.sub}</div>
              </div>
            ))}
          </div>

          <div className="admin-card">
            <div className="admin-card-head"><h2 className="admin-card-title">영역별 진행</h2></div>
            {영역현황.map((x) => (
              <div key={x.area} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: "1px solid #f6f6f8" }}>
                <span style={{ width: 110, flexShrink: 0, fontSize: 14.5, color: "#555" }}>{x.area}</span>
                <div style={{ flex: 1, minWidth: 0, height: 8, borderRadius: 4, background: "#f2f2f4", overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((x.해봄 / x.전체) * 100)}%`, height: "100%", background: x.걸림 ? "#c0392b" : "#582681" }} />
                </div>
                <span style={{ width: 96, flexShrink: 0, textAlign: "right", fontSize: 13.5, color: "#555" }}>
                  {x.해봄} / {x.전체}
                </span>
                <span style={{ width: 78, flexShrink: 0, textAlign: "right", fontSize: 13.5, color: "#555" }}>
                  {x.걸림 ? `걸림 ${x.걸림}` : x.대기 ? `대기 ${x.대기}` : "—"}
                </span>
              </div>
            ))}
          </div>

          {/* 못 보낸 메일 — 외부 서비스가 흔들린 흔적. 없으면 이 칸도 없다. */}
          {메일실패.total > 0 && (
            <div className="admin-card">
              <div className="admin-card-head"><h2 className="admin-card-title">못 보낸 메일 {메일실패.total}건</h2></div>
              {메일실패.items.slice(0, 8).map((m, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 16px", borderBottom: "1px solid #f6f6f8" }}>
                  <span style={{ width: 70, flexShrink: 0, fontSize: 12.5, color: "#555" }}>{날짜(m.created_at)}</span>
                  <span style={{ width: 200, flexShrink: 0, fontSize: 13.5, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.to_addr}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.subject}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.reason}</span>
                </div>
              ))}
            </div>
          )}

          <div className="admin-card">
            <div className="admin-card-head"><h2 className="admin-card-title">지금 막고 있는 것</h2></div>
            {list.filter((r) => r.status === "open").length === 0 ? (
              <div className="admin-empty" style={{ textAlign: "center" }}>정해야 할 것이 없습니다.</div>
            ) : (
              list.filter((r) => r.status === "open").slice(0, 8).map((r) => (
                <button key={r.id} type="button" onClick={() => { set보기("리포트"); set고른것(r.id); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", border: "none", background: "#fff", cursor: "pointer", padding: "10px 16px", borderBottom: "1px solid #f6f6f8", font: "inherit" }}>
                  <span style={{ fontSize: 11.5, padding: "2px 7px", borderRadius: 6, flexShrink: 0, background: 무게색[r.severity].bg, color: 무게색[r.severity].fg }}>{r.severity}</span>
                  <span style={{ fontSize: 12.5, color: "#555", flexShrink: 0 }}>{r.area}</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</span>
                  <span style={{ fontSize: 12.5, color: "#555", flexShrink: 0 }}>
                    {r.decided_by === "alba" ? "알바" : r.decided_by === "admin" ? "관리자" : ""}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      ) : 보기 === "케이스" ? (
        <div className="admin-card" style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          {AREAS.map((area) => {
            const cs = TEST_CASES.filter((c) => c.area === area);
            if (!cs.length) return null;
            return (
              <div key={area}>
                <div style={{ padding: "10px 14px", borderBottom: "1px solid #f2f2f4", background: "#fafafb", fontSize: 14, color: "#555" }}>
                  {area} <span style={{ color: "#555", fontSize: 13 }}>{cs.length}건</span>
                </div>
                {cs.map((c) => {
                  const r = 케이스결과[c.id];
                  return (
                    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", borderBottom: "1px solid #f6f6f8" }}>
                      <span style={{ width: 84, flexShrink: 0, fontSize: 12.5, color: "#555" }}>{c.id}</span>
                      <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, color: "#555" }}>{c.title}</span>
                      <span style={{ flex: 1.4, minWidth: 0, fontSize: 13, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.expect}</span>
                      <span style={{ flexShrink: 0, fontSize: 12.5, width: 108, textAlign: "right", color: "#555" }}>
                        {c.waiting ? c.waiting : r ? (r.status === "open" ? "리포트 있음" : 상태이름[r.status]) : "안 해봄"}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 18, alignItems: "stretch", flex: 1, minHeight: 0 }}>
          <div className="admin-card" style={{ width: 460, flexShrink: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className="admin-table-meta" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {([["open", `정해야 함 ${counts.open ?? 0}`], ["done", `처리됨 ${counts.done ?? 0}`], ["", "전체"]] as const).map(([v, l]) => (
                <button key={v} type="button" onClick={() => { set거르기(v as any); set고른것(null); }}
                  style={{ padding: "5px 11px", borderRadius: 8, fontSize: 13.5, cursor: "pointer",
                    border: "1px solid #efeff1", background: 거르기 === v ? "#f7f7f8" : "#fff",
                    color: 거르기 === v ? "#582681" : "#555" }}>{l}</button>
              ))}
            </div>
            {loading ? (
              <div className="admin-empty" style={{ textAlign: "center" }}>불러오는 중…</div>
            ) : list.length === 0 ? (
              <div className="admin-empty" style={{ textAlign: "center" }}>올라온 리포트가 없습니다.</div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1, overflowY: "auto" }}>
                {list.map((r) => (
                  <li key={r.id}>
                    <button type="button" onClick={() => set고른것(r.id)}
                      style={{ width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                        borderBottom: "1px solid #f6f6f8", padding: "10px 14px",
                        background: 고른것 === r.id ? "#f7f7f8" : "#fff", font: "inherit" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                        <span style={{ fontSize: 11.5, padding: "2px 7px", borderRadius: 6, background: 무게색[r.severity].bg, color: 무게색[r.severity].fg }}>{r.severity}</span>
                        <span style={{ fontSize: 12.5, color: "#555" }}>{r.area}</span>
                        {r.case_id && <span style={{ fontSize: 12.5, color: "#555" }}>{r.case_id}</span>}
                        <span style={{ marginLeft: "auto", fontSize: 12.5, color: "#555" }}>{날짜(r.created_at)}</span>
                      </div>
                      <div style={{ fontSize: 14.5, color: "#555", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.title}</div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="admin-card" style={{ flex: 1, minWidth: 0, overflowY: "auto", padding: 지금것 ? "16px 18px" : undefined }}>
            {!지금것 ? (
              <div className="admin-empty" style={{ textAlign: "center" }}>왼쪽에서 리포트를 고르세요.</div>
            ) : (
              <>
                <div style={{ fontSize: 16, color: "#555", marginBottom: 4 }}>{지금것.title}</div>
                <div style={{ fontSize: 12.5, color: "#555", marginBottom: 14 }}>
                  {지금것.area}
                  {지금것.case_id ? ` · ${지금것.case_id}` : ""}
                  {` · ${날짜(지금것.created_at)}`}
                  {지금것.decided_by ? ` · ${지금것.decided_by === "alba" ? "알바가 정할 일" : "관리자가 정할 일"}` : ""}
                  {지금것.status !== "open" ? ` · ${상태이름[지금것.status]}` : ""}
                </div>

                {지금것.steps && (
                  <>
                    <div style={{ fontSize: 12.5, color: "#555", marginBottom: 3 }}>이렇게 하면 나온다</div>
                    <div style={{ fontSize: 14, color: "#555", whiteSpace: "pre-line", lineHeight: 1.7, marginBottom: 12 }}>{지금것.steps}</div>
                  </>
                )}

                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <div style={{ flex: 1, background: "#f1f8f3", borderRadius: 8, padding: "9px 12px" }}>
                    <div style={{ fontSize: 12, color: "#2f7a4d", marginBottom: 2 }}>이래야 한다</div>
                    <div style={{ fontSize: 13.5, color: "#555", whiteSpace: "pre-line" }}>{지금것.expected || "-"}</div>
                  </div>
                  <div style={{ flex: 1, background: "#fdecea", borderRadius: 8, padding: "9px 12px" }}>
                    <div style={{ fontSize: 12, color: "#c0392b", marginBottom: 2 }}>이렇게 됐다</div>
                    <div style={{ fontSize: 13.5, color: "#555", whiteSpace: "pre-line" }}>{지금것.actual || "-"}</div>
                  </div>
                </div>

                {지금것.ref_url && (
                  <div style={{ marginBottom: 12 }}>
                    <a href={지금것.ref_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13.5, color: "#582681", textDecoration: "none" }}>
                      그 화면 열기 ↗
                    </a>
                  </div>
                )}

                {지금것.options.length > 0 && (
                  <div style={{ borderTop: "1px solid #f2f2f4", paddingTop: 12 }}>
                    <div style={{ fontSize: 12.5, color: "#555", marginBottom: 8 }}>
                      {지금것.decision ? "고른 것" : "정해 주세요"}
                    </div>
                    {지금것.options.map((o, i) => {
                      const 고름 = 지금것.decision === o.text;
                      return (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: 고름 ? "#582681" : "#555" }}>
                            {o.text}
                            {o.recommend && <span style={{ marginLeft: 8, fontSize: 12, color: "#555" }}>클로드 의견</span>}
                          </span>
                          {!지금것.decision && (
                            <button type="button" disabled={busy} onClick={() => 정하기(지금것.id, o.text, "open")}
                              style={{ flexShrink: 0, padding: "5px 12px", borderRadius: 8, border: "1px solid #efeff1", background: "#fff", color: "#582681", fontSize: 13, cursor: "pointer" }}>
                              이걸로
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 14, borderTop: "1px solid #f2f2f4", paddingTop: 12 }}>
                  {지금것.status !== "done" && (
                    <button type="button" disabled={busy} onClick={() => 정하기(지금것.id, 지금것.decision || "", "done")}
                      className="admin-primary-btn">처리됨으로</button>
                  )}
                  {지금것.status !== "wontfix" && (
                    <button type="button" disabled={busy} onClick={() => 정하기(지금것.id, 지금것.decision || "", "wontfix")}
                      style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #efeff1", background: "#fff", color: "#555", fontSize: 13.5, cursor: "pointer" }}>안 함</button>
                  )}
                  {지금것.status !== "open" && (
                    <button type="button" disabled={busy} onClick={() => 정하기(지금것.id, 지금것.decision || "", "open")}
                      style={{ padding: "7px 12px", borderRadius: 8, border: "1px solid #efeff1", background: "#fff", color: "#555", fontSize: 13.5, cursor: "pointer" }}>다시 열기</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
