"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

// 비회원 컨택 대상 업체 리스트(아웃리치 관리대장)
// 엑셀 "채용공고 등록 DB 정리본"을 인앱화. 체크박스 선택 → 상단 일괄 "업데이트"로 9개 채용사이트 조회(무료).
// 입력은 모두 자동저장(칸을 벗어나면 저장). 브랜드명 클릭 = 홈페이지 새창 이동.

type Row = {
  id: string;
  group_name: string;
  seq: number | null;
  brand_name: string;
  category: string | null;
  homepage: string | null;
  is_hiring: string;
  is_registered: string;
  phone: string | null;
  email: string | null;
  scale: string | null;
  features: string | null;
  note: string | null;
  found_jobs: { idx: number; title: string; url: string; source: string }[];
  found_count: number;
  last_checked_at: string | null;
  updated_at: string | null;
};
type CountRow = { group_name: string; cnt: number; hiring_cnt: number; registered_cnt: number };

const GROUPS = ["헤어샵", "메이크업", "네일&속눈썹", "스킨&바디케어", "두피&탈모", "리테일&커머스"];
const HIRING = ["미확인", "채용중", "없음", "확인필요"];
const REG = ["미등록", "등록완료", "보류"];

const PURPLE = "#5f0080";
const hiringColor: Record<string, string> = {
  채용중: "#0a7d34", 없음: "#9a92a6", 확인필요: "#c2410c", 미확인: "#9a92a6",
};
const regColor: Record<string, string> = {
  등록완료: "#0a7d34", 보류: "#c2410c", 미등록: "#9a92a6",
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}
function normUrl(u: string) {
  return u.startsWith("http") ? u : `https://${u}`;
}

export default function AdminOutreachPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [counts, setCounts] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<string>("헤어샵");
  const [hiringFilter, setHiringFilter] = useState("");
  const [regFilter, setRegFilter] = useState("");
  const [phoneFilter, setPhoneFilter] = useState("");
  const [emailFilter, setEmailFilter] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, Partial<Row>>>({});
  const [checking, setChecking] = useState<Set<string>>(new Set());
  const [bulkMsg, setBulkMsg] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editHomeId, setEditHomeId] = useState<string | null>(null);
  const [editMemoId, setEditMemoId] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  const authH = { Authorization: `Bearer ${token}` };

  const fetchList = useCallback(async () => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (group) sp.set("group", group);
    if (hiringFilter) sp.set("hiring", hiringFilter);
    if (regFilter) sp.set("reg", regFilter);
    if (phoneFilter) sp.set("phone", phoneFilter);
    if (emailFilter) sp.set("email", emailFilter);
    if (q.trim()) sp.set("q", q.trim());
    try {
      const res = await fetch(`/api/admin/target-companies?${sp.toString()}`, { headers: authH });
      const j = await res.json();
      setItems(j.data?.items || []);
      setCounts(j.data?.counts || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setSelected(new Set());
      setDrafts({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, hiringFilter, regFilter, phoneFilter, emailFilter, q]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const totalCount = useMemo(() => counts.reduce((a, c) => a + c.cnt, 0), [counts]);
  const countOf = (g: string) => counts.find((c) => c.group_name === g)?.cnt ?? 0;

  const setDraft = (id: string, patch: Partial<Row>) =>
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  const val = (row: Row, k: keyof Row) => {
    const dv = drafts[row.id]?.[k];
    return (dv !== undefined ? dv : row[k]) as string | null;
  };
  const clearDraftKey = (id: string, k: keyof Row) =>
    setDrafts((d) => {
      const n = { ...d };
      if (n[id]) { const r = { ...n[id] }; delete r[k]; if (Object.keys(r).length) n[id] = r; else delete n[id]; }
      return n;
    });

  // 자동저장: 칸을 벗어날 때 변경분만 PATCH
  const saveField = async (row: Row, k: keyof Row) => {
    const dv = drafts[row.id]?.[k];
    if (dv === undefined) return;
    const next = (typeof dv === "string" ? dv : "") as string;
    const cur = ((row[k] as string) ?? "");
    if (next.trim() === cur.trim()) { clearDraftKey(row.id, k); return; }
    try {
      const res = await fetch(`/api/admin/target-companies`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({ id: row.id, [k]: next }),
      });
      const j = await res.json();
      if (j.data?.item) setItems((its) => its.map((r) => (r.id === row.id ? j.data.item : r)));
    } finally {
      clearDraftKey(row.id, k);
    }
  };

  // 미저장(칸을 안 벗어난) 편집 개수
  const dirtyCount = Object.values(drafts).reduce((a, o) => a + Object.keys(o).length, 0);

  // 상단 "변경사항 저장" — 아직 blur 안 된 편집분까지 한 번에 PATCH
  const flushDrafts = async () => {
    const entries = Object.entries(drafts);
    for (const [id, patch] of entries) {
      const keys = Object.keys(patch);
      if (!keys.length) continue;
      const body: Record<string, unknown> = { id };
      keys.forEach((k) => { body[k] = (patch as Record<string, unknown>)[k]; });
      try {
        const res = await fetch(`/api/admin/target-companies`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authH },
          body: JSON.stringify(body),
        });
        const j = await res.json();
        if (j.data?.item) setItems((its) => its.map((r) => (r.id === id ? j.data.item : r)));
      } catch { /* noop */ }
    }
    setDrafts({});
  };

  // 미저장 편집이 있는 채로 페이지를 벗어날 때 경고
  useEffect(() => {
    if (!dirtyCount) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirtyCount]);

  // 즉시 저장(드롭다운)
  const quickPatch = async (row: Row, patch: Partial<Row>) => {
    setItems((its) => its.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
    await fetch(`/api/admin/target-companies`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authH },
      body: JSON.stringify({ id: row.id, ...patch }),
    }).catch(() => {});
  };

  const checkHiring = async (ids: string[]) => {
    if (!ids.length) return;
    setChecking((s) => new Set([...s, ...ids]));
    try {
      const res = await fetch(`/api/admin/target-companies/check-hiring`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify(ids.length === 1 ? { id: ids[0] } : { ids }),
      });
      const j = await res.json();
      const updated: Row[] = j.data?.items || [];
      if (updated.length) {
        const map = new Map(updated.map((u) => [u.id, u]));
        setItems((its) => its.map((r) => map.get(r.id) || r));
      }
    } finally {
      setChecking((s) => { const n = new Set(s); ids.forEach((i) => n.delete(i)); return n; });
    }
  };

  // 일괄: 50건씩 끊어 순차 호출
  const bulkCheck = async (ids: string[]) => {
    if (!ids.length) return;
    setBulkMsg(`0 / ${ids.length} 조회 중…`);
    for (let i = 0; i < ids.length; i += 50) {
      const chunk = ids.slice(i, i + 50);
      await checkHiring(chunk);
      setBulkMsg(`${Math.min(i + 50, ids.length)} / ${ids.length} 조회 완료`);
    }
    setBulkMsg(`${ids.length}건 조회 완료`);
    setTimeout(() => setBulkMsg(""), 4000);
  };

  // 6개 탭 전체(현재 필터 무시) 일괄 업데이트
  const updateAllTabs = async () => {
    setBulkMsg("전체 목록 불러오는 중…");
    let allIds: string[] = [];
    try {
      const res = await fetch(`/api/admin/target-companies`, { headers: authH });
      const j = await res.json();
      allIds = (j.data?.items || []).map((r: Row) => r.id);
    } catch { setBulkMsg(""); return; }
    if (!allIds.length) { setBulkMsg(""); return; }
    await bulkCheck(allIds);
    fetchList(); // 현재 탭 새로고침
  };

  const toggleSel = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allVisibleSelected = items.length > 0 && items.every((r) => selected.has(r.id));
  const toggleAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(items.map((r) => r.id)));

  // 스타일
  const th: React.CSSProperties = { padding: "8px 8px", fontSize: 12, color: "#6b6473", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap", borderBottom: "1px solid #eee" };
  const td: React.CSSProperties = { padding: "6px 8px", fontSize: 13, verticalAlign: "top", borderBottom: "1px solid #f3f0f7" };
  const inp: React.CSSProperties = { width: "100%", minWidth: 90, padding: "5px 7px", border: "1px solid #ddd", borderRadius: 6, fontSize: 12.5, boxSizing: "border-box" };
  const clamp2: React.CSSProperties = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis" };
  const chip = (active: boolean): React.CSSProperties => ({
    padding: "6px 12px", borderRadius: 999, fontSize: 13, fontWeight: 600, cursor: "pointer",
    border: active ? `1px solid ${PURPLE}` : "1px solid #e3dcec",
    background: active ? PURPLE : "#fff", color: active ? "#fff" : "#6b6473",
  });
  const badge = (color: string): React.CSSProperties => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 12, fontWeight: 600,
    color, background: `${color}18`,
  });

  return (
    <AdminLayout activeMenu="outreach">
      <div style={{ padding: "4px 4px 40px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#2b2533", margin: 0 }}>외부업체 컨택 리스트</h1>
          <span style={{ fontSize: 13, color: "#9a92a6" }}>총 {totalCount}개 · 비회원 공고 등록 대상</span>
        </div>
        <p style={{ fontSize: 12.5, color: "#9a92a6", margin: "0 0 14px" }}>
          체크박스로 업체를 선택하고 "선택/전체 업데이트"를 누르거나, "6개 탭 전체 업데이트"로 모든 탭을 한 번에 조회할 수 있습니다. 브랜드명으로 9개 채용사이트(헤어인잡·알바몬·잡코리아·사람인·뷰티잡·뷰티인잡·뷰티잡매니저·미용인잡·자사홈)를 조회해 채용유무를 자동 확인합니다. 입력값은 자동저장됩니다. 조회는 무료입니다.
        </p>

        {/* 그룹 탭 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {GROUPS.map((g) => (
            <button key={g} onClick={() => setGroup(g)} style={chip(group === g)}>
              {g} <span style={{ opacity: 0.7 }}>{countOf(g)}</span>
            </button>
          ))}
        </div>

        {/* 필터 + 일괄 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <input placeholder="브랜드·특징 검색" value={q} onChange={(e) => setQ(e.target.value)}
            style={{ ...inp, width: 180, minWidth: 150 }} />
          <select value={hiringFilter} onChange={(e) => setHiringFilter(e.target.value)} style={{ ...inp, width: 120 }}>
            <option value="">채용유무 전체</option>
            {HIRING.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
          <select value={regFilter} onChange={(e) => setRegFilter(e.target.value)} style={{ ...inp, width: 120 }}>
            <option value="">등록유무 전체</option>
            {REG.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={phoneFilter} onChange={(e) => setPhoneFilter(e.target.value)} style={{ ...inp, width: 110 }}>
            <option value="">연락처 전체</option>
            <option value="y">연락처 있음</option>
            <option value="n">연락처 없음</option>
          </select>
          <select value={emailFilter} onChange={(e) => setEmailFilter(e.target.value)} style={{ ...inp, width: 110 }}>
            <option value="">이메일 전체</option>
            <option value="y">이메일 있음</option>
            <option value="n">이메일 없음</option>
          </select>
          <div style={{ flex: 1 }} />
          {dirtyCount > 0 ? (
            <button onClick={flushDrafts}
              style={{ ...chip(false), borderColor: "#c2410c", color: "#c2410c", background: "#fff7ed" }}>
              변경사항 저장 ({dirtyCount})
            </button>
          ) : (
            <span style={{ fontSize: 12.5, color: "#0a7d34", fontWeight: 600, padding: "0 4px" }}>저장됨 ✓</span>
          )}
          <button onClick={() => bulkCheck([...selected])} disabled={!selected.size}
            style={{ ...chip(!!selected.size), opacity: selected.size ? 1 : 0.5, cursor: selected.size ? "pointer" : "default" }}>
            {selected.size > 0 && allVisibleSelected ? `전체 ${selected.size}건 업데이트` : `선택 ${selected.size}건 업데이트`}
          </button>
          <button onClick={updateAllTabs} disabled={!totalCount}
            title="현재 탭과 상관없이 6개 탭 전체를 조회합니다 (시간이 걸립니다)"
            style={{ ...chip(true), opacity: totalCount ? 1 : 0.5 }}>
            6개 탭 전체 업데이트{totalCount ? ` (${totalCount})` : ""}
          </button>
          <a href="/admin/jobs/new" target="_blank" rel="noreferrer"
            style={{ ...chip(false), textDecoration: "none", borderColor: PURPLE, color: PURPLE }}>
            + 공고 등록
          </a>
        </div>
        {bulkMsg && <div style={{ fontSize: 12.5, color: PURPLE, marginBottom: 8 }}>{bulkMsg}</div>}

        {/* 테이블 */}
        <div style={{ overflowX: "auto", border: "1px solid #eee", borderRadius: 10, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1220 }}>
            <thead>
              <tr style={{ background: "#faf8fc" }}>
                <th style={{ ...th, width: 32 }}>
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} />
                </th>
                <th style={{ ...th, width: 34 }}>#</th>
                <th style={{ ...th, minWidth: 230 }}>브랜드명 <span style={{ fontWeight: 400, color: "#b7b0c0" }}>(클릭=홈페이지)</span></th>
                <th style={{ ...th, minWidth: 150 }}>채용유무</th>
                <th style={{ ...th, width: 100 }}>등록유무</th>
                <th style={{ ...th, minWidth: 120 }}>연락처</th>
                <th style={{ ...th, minWidth: 150 }}>이메일</th>
                <th style={{ ...th, minWidth: 190 }}>주요특징</th>
                <th style={{ ...th, minWidth: 280 }}>메모</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ ...td, textAlign: "center", padding: 30, color: "#9a92a6" }}>불러오는 중…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={9} style={{ ...td, textAlign: "center", padding: 30, color: "#9a92a6" }}>데이터가 없습니다.</td></tr>
              ) : items.map((row) => {
                const isChecking = checking.has(row.id);
                const hv = String(val(row, "is_hiring"));
                const rv = String(val(row, "is_registered"));
                const home = val(row, "homepage");
                const subtitle = [row.category, row.scale].filter(Boolean).join(" · ");
                return (
                  <Fragment key={row.id}>
                    <tr style={{ background: selected.has(row.id) ? "#f6f0fb" : "#fff" }}>
                      <td style={td}><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSel(row.id)} /></td>
                      <td style={{ ...td, color: "#9a92a6" }}>{row.seq ?? "-"}</td>
                      {/* 브랜드명 = 홈페이지 링크, ✎로 URL 편집 */}
                      <td style={td}>
                        {editHomeId === row.id ? (
                          <input autoFocus style={{ ...inp, fontSize: 12 }} placeholder="홈페이지 URL"
                            value={home || ""} onChange={(e) => setDraft(row.id, { homepage: e.target.value })}
                            onBlur={() => { saveField(row, "homepage"); setEditHomeId(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {home ? (
                              <a href={normUrl(String(home))} target="_blank" rel="noreferrer"
                                style={{ fontWeight: 600, color: PURPLE, textDecoration: "none" }}>
                                {row.brand_name} <span style={{ fontSize: 11 }}>↗</span>
                              </a>
                            ) : (
                              <span style={{ fontWeight: 600, color: "#2b2533" }}>{row.brand_name}</span>
                            )}
                            <button onClick={() => setEditHomeId(row.id)} title={home ? "홈페이지 수정" : "홈페이지 링크 추가"}
                              style={{ border: "none", background: "none", cursor: "pointer", color: "#b7b0c0", fontSize: 12, padding: 0 }}>✎</button>
                          </div>
                        )}
                        {subtitle && <div style={{ fontSize: 11.5, color: "#9a92a6", marginTop: 2, maxWidth: 220 }}>{subtitle}</div>}
                      </td>
                      {/* 채용유무 */}
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <select value={hv} onChange={(e) => quickPatch(row, { is_hiring: e.target.value })}
                            style={{ ...inp, width: 90, color: hiringColor[hv], fontWeight: 600 }}>
                            {HIRING.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                          {isChecking && <span style={{ fontSize: 11, color: PURPLE }}>조회중…</span>}
                        </div>
                        {row.found_count > 0 && (
                          <button onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                            style={{ marginTop: 4, background: "none", border: "none", padding: 0, cursor: "pointer", ...badge("#0a7d34") }}>
                            공고 {row.found_count}건 {expanded === row.id ? "▲" : "▼"}
                          </button>
                        )}
                        {row.last_checked_at && (
                          <div style={{ fontSize: 10.5, color: "#b7b0c0", marginTop: 2 }}>확인 {fmtDate(row.last_checked_at)}</div>
                        )}
                      </td>
                      {/* 등록유무 */}
                      <td style={td}>
                        <select value={rv} onChange={(e) => quickPatch(row, { is_registered: e.target.value })}
                          style={{ ...inp, width: 90, color: regColor[rv], fontWeight: 600 }}>
                          {REG.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      {/* 연락처 (자동저장) */}
                      <td style={td}>
                        <input style={inp} placeholder="연락처" value={val(row, "phone") || ""}
                          onChange={(e) => setDraft(row.id, { phone: e.target.value })}
                          onBlur={() => saveField(row, "phone")} />
                      </td>
                      {/* 이메일 (자동저장) */}
                      <td style={td}>
                        <input style={inp} placeholder="이메일" value={val(row, "email") || ""}
                          onChange={(e) => setDraft(row.id, { email: e.target.value })}
                          onBlur={() => saveField(row, "email")} />
                      </td>
                      {/* 주요특징 (2줄 말줄임 + 툴팁) */}
                      <td style={{ ...td, maxWidth: 220 }}>
                        <div title={row.features || ""} style={{ ...clamp2, fontSize: 11.5, color: "#6b6473", lineHeight: 1.45 }}>
                          {row.features || "-"}
                        </div>
                      </td>
                      {/* 메모 (2줄 자동저장 · 미편집시 말줄임+툴팁) */}
                      <td style={{ ...td, minWidth: 280 }}>
                        {editMemoId === row.id ? (
                          <textarea autoFocus rows={2} placeholder="통화·컨택 메모"
                            style={{ ...inp, resize: "vertical", lineHeight: 1.4 }}
                            value={val(row, "note") || ""}
                            onChange={(e) => setDraft(row.id, { note: e.target.value })}
                            onBlur={() => { saveField(row, "note"); setEditMemoId(null); }} />
                        ) : (
                          <div onClick={() => setEditMemoId(row.id)} title={row.note || ""}
                            style={{ ...clamp2, minHeight: 34, padding: "5px 7px", border: "1px solid #eee", borderRadius: 6, fontSize: 12.5, color: row.note ? "#2b2533" : "#b7b0c0", cursor: "text", lineHeight: 1.4 }}>
                            {row.note || "메모 입력…"}
                          </div>
                        )}
                      </td>
                    </tr>
                    {expanded === row.id && row.found_jobs?.length > 0 && (
                      <tr>
                        <td style={{ ...td, background: "#faf8fc" }} colSpan={9}>
                          <div style={{ fontSize: 12, color: "#6b6473", marginBottom: 4, fontWeight: 600 }}>조회된 활성 공고</div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {row.found_jobs.map((jb, i) => (
                              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5 }}>
                                <span style={badge(PURPLE)}>{jb.source}</span>
                                <span style={{ color: "#2b2533" }}>{jb.title}</span>
                                <a href={normUrl(jb.url)} target="_blank" rel="noreferrer" style={{ color: PURPLE, textDecoration: "none" }}>원문 ↗</a>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
