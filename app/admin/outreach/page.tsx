"use client";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import FilterDropdown from "@/components/company/FilterDropdown";

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
  found_jobs: { idx: number; title: string; url: string; source: string; date?: string; email?: string }[];
  found_count: number;
  last_checked_at: string | null;
  updated_at: string | null;
};
type CountRow = { group_name: string; cnt: number; hiring_cnt: number; registered_cnt: number };

const GROUPS = ["헤어샵", "메이크업", "네일&속눈썹", "스킨&바디케어", "두피&탈모", "리테일&커머스"];
const SITE_ORDER = ["헤어인잡", "알바몬", "잡코리아", "사람인", "뷰티잡", "셀렉미", "자사홈페이지"]; // 사이트별 집계 표시 순서
const HIRING = ["채용중", "없음"];
const REG = ["미등록", "등록완료"];

const PURPLE = "#5f0080";

// 중복 판정용 '지점' 시그니처: 제목에서 지점 토큰(○○역/○○동/○○점/○○센터)을 뽑아 정규화.
//   같은 업체(=브랜드)에서 지점이 같으면 중복으로 본다. 사이트마다 형식이 달라(강남역점/강남역 등)
//   끝의 '점·지점·센터'는 떼어 맞춘다. 지점 신호가 없으면 판정 불가 → 제외(과다집계 방지).
// 활성공고 제목으로 매장/오피스 추정(found_jobs엔 job_type이 없어 제목 기반).
//   ① 뚜렷한 본사 사무직 신호 → OFFICE  ② 뚜렷한 매장 시술 신호 → STORE
//   ③ 그 외: '제목에 지점이 있으면 매장, 없으면 오피스'(현장직은 지점명이 붙는다).
function guessStoreOffice(title: string): "STORE" | "OFFICE" {
  const t = (title || "").replace(/\s/g, "");
  if (/인허가|regulatory|품질관리|머천다이저|상품기획|브랜드매니저|퍼포먼스마케팅|재무|회계|세무|법무|구매담당|물류|SCM|인사담당|채용담당|경영지원|전략기획|해외영업|수출입|개발자|엔지니어|데이터분석|약무|약사|고객센터|상담사|콜센터|본사|사무직|디렉터|기획자|마케터|영업|리크루터|헤드헌터|MD채용|재택|자산운용|펀드|운용역|증권|투자|금융|렌탈|설치기사|생산직|제조|영양사/i.test(t)) return "OFFICE";
  if (/디자이너|스타일리스트|스탭|스태프|스텝|인턴|네일|속눈썹|왁싱|피부관리|에스테틱|메이크업|바버|헤어|원장|실장|미용사|점장|샵마스터|관리사|테라피|두피|시술|샴푸|왁서/.test(t)) return "STORE";
  return branchSignature(title) ? "STORE" : "OFFICE"; // 지점 있으면 매장, 없으면 오피스
}
function branchSignature(title: string): string {
  const t = title || "";
  // ○○점/○○역/○○동/○○지점만 지점으로. '센터'(고객센터·물류센터 등 부서명)는 지점이 아니므로 제외.
  const branches = [...new Set([...t.matchAll(/([가-힣A-Za-z0-9]{2,}(?:역|동|점|지점))/g)]
    .map((m) => m[1].replace(/(지점|점)$/, "")).filter((b) => b.length >= 2))].sort();
  return branches.length ? branches.join(",") : "";
}
const hiringColor: Record<string, string> = {
  채용중: "#0a7d34", 없음: "#9a92a6",
};
const regColor: Record<string, string> = {
  등록완료: "#0a7d34", 미등록: "#9a92a6",
};

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
  const [srcTab, setSrcTab] = useState<string>(""); // 확장된 활성공고 목록의 사이트별 필터("" = 전체)
  const [editHomeId, setEditHomeId] = useState<string | null>(null);
  const [editMemoId, setEditMemoId] = useState<string | null>(null);
  const [pickedJobUrl, setPickedJobUrl] = useState<string | null>(null); // 조회된 공고 중 라디오 선택 → 공고 등록으로 전달

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
  // 현재 탭의 총 활성공고 건수 + 중복(추정): 같은 업체(브랜드)에서 '지점'이 같은 공고는 중복으로 본다.
  //   업체 내 found_jobs를 지점 시그니처로 그룹핑 → 각 지점 그룹의 초과분(개수 - 1)을 중복으로 카운트.
  const tabStats = useMemo(() => {
    let total = 0, dup = 0;
    for (const r of items) {
      total += r.found_count || 0;
      const jobs = Array.isArray(r.found_jobs) ? r.found_jobs : [];
      // 중복은 매장(브랜드+지점)에만 의미 → STORE 공고만, 지점 시그니처로 그룹핑.
      const byBranch = new Map<string, number>();
      for (const j of jobs) {
        if (guessStoreOffice(j?.title || "") !== "STORE") continue;
        const sig = branchSignature(j?.title || "");
        if (!sig) continue;
        byBranch.set(sig, (byBranch.get(sig) || 0) + 1);
      }
      for (const n of byBranch.values()) if (n >= 2) dup += n - 1;
    }
    return { total, dup };
  }, [items]);
  // 현재 탭의 사이트별 활성 공고수 + 매장/오피스 추정
  const { bySite, storeCnt, officeCnt } = useMemo(() => {
    const m: Record<string, number> = {};
    let store = 0, office = 0;
    for (const r of items) for (const j of (Array.isArray(r.found_jobs) ? r.found_jobs : [])) {
      const s = j?.source || "기타";
      m[s] = (m[s] || 0) + 1;
      if (guessStoreOffice(j?.title || "") === "STORE") store += 1; else office += 1;
    }
    return { bySite: m, storeCnt: store, officeCnt: office };
  }, [items]);

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

  const checkHiring = async (ids: string[]): Promise<number> => {
    if (!ids.length) return 0;
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
      return updated.reduce((n, u) => n + (u.found_count || 0), 0);
    } finally {
      setChecking((s) => { const n = new Set(s); ids.forEach((i) => n.delete(i)); return n; });
    }
  };

  // 일괄: 업체 1개씩 동시성 풀(병렬)로 처리 → 빠르고, 완료마다 카운터가 1씩 올라 개별 단위로 보인다.
  //   (서버가 배치를 순차 처리하던 기존 50개 청크 방식은 느리고 진행률이 50·100 단위로만 튀었음)
  // 동시성 = "사이트 1곳당 순간 동시 요청 수". 이게 차단 위험을 좌우한다(총 소켓 C×6이 아니라 C가 기준).
  //   기존 순차=1(가장 안전·느림). 5는 순차 대비 ~5배 빠르면서 사이트당 5건으로 부담이 낮은 편.
  const BULK_CONCURRENCY = 5;
  const bulkCheck = async (ids: string[]) => {
    if (!ids.length) return;
    const total = ids.length;
    let done = 0, hit = 0;
    setBulkMsg(`0 / ${total} 조회 중…`);
    let cursor = 0;
    const worker = async () => {
      while (cursor < ids.length) {
        const id = ids[cursor++];
        try {
          const found = await checkHiring([id]); // 1건 = 6개 소스 병렬. 반환: 조회된 공고 수
          if (found > 0) hit++;
        } catch { /* 개별 실패는 건너뜀 */ }
        done++;
        setBulkMsg(`${done} / ${total} 조회 중…  (채용중 ${hit}곳)`);
      }
    };
    await Promise.all(Array.from({ length: Math.min(BULK_CONCURRENCY, ids.length) }, worker));
    setBulkMsg(`완료 · ${total}곳 조회 (채용중 ${hit}곳)`);
    setTimeout(() => setBulkMsg(""), 5000);
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
  const th: React.CSSProperties = { padding: "8px 8px", fontSize: 13, color: "#6b6473", fontWeight: 400, textAlign: "left", whiteSpace: "nowrap", borderBottom: "1px solid #eee", position: "sticky", top: 0, zIndex: 2, background: "#faf8fc" };
  const td: React.CSSProperties = { padding: "6px 8px", fontSize: 14, verticalAlign: "top", borderBottom: "1px solid #f3f0f7" };
  const inp: React.CSSProperties = { width: "100%", minWidth: 90, padding: "5px 7px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13.5, boxSizing: "border-box" };
  const clamp2: React.CSSProperties = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis" };
  const chip = (active: boolean): React.CSSProperties => ({
    padding: "6px 12px", borderRadius: 999, fontSize: 14, fontWeight: 400, cursor: "pointer",
    border: active ? `1px solid ${PURPLE}` : "1px solid #e3dcec",
    background: active ? PURPLE : "#fff", color: active ? "#fff" : "#6b6473",
  });
  const badge = (color: string): React.CSSProperties => ({
    display: "inline-block", padding: "2px 8px", borderRadius: 999, fontSize: 13, fontWeight: 400,
    color, background: `${color}18`,
  });

  return (
    <AdminLayout activeMenu="outreach">
      <div style={{ padding: "4px 4px 40px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
          <h1 style={{ fontSize: 20, fontWeight: 400, color: "#2b2533", margin: 0 }}>외부업체 컨택 리스트</h1>
          <span style={{ fontSize: 14, color: "#9a92a6" }}>총 {totalCount}개 · 비회원 공고 등록 대상</span>
        </div>
        <p style={{ fontSize: 13.5, color: "#9a92a6", margin: "0 0 14px" }}>
          체크박스로 업체를 선택해 "선택 업데이트"를 누르거나, "전체 업데이트"로 모든 탭의 업체를 한 번에 조회할 수 있습니다. 브랜드명으로 7개 채용사이트(헤어인잡·알바몬·잡코리아·사람인·뷰티잡·셀렉미·자사홈)를 조회해 채용유무를 자동 확인합니다. 입력값은 자동저장됩니다. 조회는 무료입니다.
        </p>

        {/* 사이트별 활성 공고수(현재 탭) — 그룹 칩 위 */}
        {(() => {
          const known = SITE_ORDER.filter((s) => bySite[s]);
          const etc = Object.keys(bySite).filter((s) => !SITE_ORDER.includes(s));
          const sum = Object.values(bySite).reduce((a, b) => a + b, 0);
          if (!sum) return null;
          const label = (s: string) => s === "자사홈페이지" ? "자사홈" : s;
          return (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: "4px 14px", marginBottom: 10, fontSize: 12.5, color: "#6b6473" }}>
              <span style={{ color: "#9a92a6" }}>사이트별 활성공고</span>
              {[...known, ...etc].map((s) => (
                <span key={s}><b style={{ color: "#2b2533", fontWeight: 600 }}>{label(s)}</b> {bySite[s].toLocaleString()}</span>
              ))}
              {(storeCnt > 0 || officeCnt > 0) && (
                <span style={{ marginLeft: 4, paddingLeft: 12, borderLeft: "1px solid #e3dcec" }} title="공고 제목 기반 추정(정확한 매장/오피스는 불러오기 시 분류됨)">
                  <b style={{ color: "#5f0080", fontWeight: 600 }}>매장</b> {storeCnt.toLocaleString()} · <b style={{ color: "#5f0080", fontWeight: 600 }}>오피스</b> {officeCnt.toLocaleString()} <span style={{ color: "#b7b0c0" }}>(추정)</span>
                </span>
              )}
            </div>
          );
        })()}

        {/* 그룹 탭 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          {GROUPS.map((g) => (
            <button key={g} onClick={() => setGroup(g)} style={chip(group === g)}>
              {g}
            </button>
          ))}
        </div>

        {/* 필터 + 일괄 */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          {/* 검색·필터 — 다른 관리자 페이지(입사지원·채용공고)와 동일 UI */}
          <div className="admin-search-wrap" style={{ width: 240 }}>
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="브랜드·특징 검색"
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <FilterDropdown label="채용유무"
            value={hiringFilter || "전체"}
            options={["전체", ...HIRING]}
            onChange={(v) => setHiringFilter(v === "전체" ? "" : v)} />
          <FilterDropdown label="등록유무"
            value={regFilter || "전체"}
            options={["전체", ...REG]}
            onChange={(v) => setRegFilter(v === "전체" ? "" : v)} />
          <FilterDropdown label="연락처"
            value={phoneFilter === "y" ? "있음" : phoneFilter === "n" ? "없음" : "전체"}
            options={["전체", "있음", "없음"]}
            onChange={(v) => setPhoneFilter(v === "있음" ? "y" : v === "없음" ? "n" : "")} />
          <FilterDropdown label="이메일"
            value={emailFilter === "y" ? "있음" : emailFilter === "n" ? "없음" : "전체"}
            options={["전체", "있음", "없음"]}
            onChange={(v) => setEmailFilter(v === "있음" ? "y" : v === "없음" ? "n" : "")} />
          <div style={{ flex: 1 }} />
          {dirtyCount > 0 ? (
            <button onClick={flushDrafts}
              style={{ ...chip(false), borderColor: "#c2410c", color: "#c2410c", background: "#fff7ed" }}>
              변경사항 저장 ({dirtyCount})
            </button>
          ) : (
            <span style={{ fontSize: 13.5, color: "#0a7d34", fontWeight: 400, padding: "0 4px" }}>저장됨 ✓</span>
          )}
          <button onClick={updateAllTabs} disabled={!totalCount}
            title="현재 탭과 상관없이 6개 탭 전체를 조회합니다 (시간이 걸립니다)"
            style={{ ...chip(true), opacity: totalCount ? 1 : 0.5 }}>
            전체 업데이트{totalCount ? `(${totalCount})` : ""}
          </button>
          <button onClick={() => bulkCheck([...selected])} disabled={!selected.size}
            style={{ ...chip(!!selected.size), opacity: selected.size ? 1 : 0.5, cursor: selected.size ? "pointer" : "default" }}>
            {selected.size > 0 && allVisibleSelected ? `전체 ${selected.size}건 업데이트` : `선택 ${selected.size}건 업데이트`}
          </button>
          {/* 선택 공고 등록: 조회된 활성 공고에서 라디오 선택(pickedJobUrl) 시에만 활성화 */}
          {pickedJobUrl ? (
            <a href={`/admin/jobs/new?url=${encodeURIComponent(pickedJobUrl)}`}
              target="_blank" rel="noreferrer"
              title="선택한 공고 URL이 등록 페이지 검색창에 채워집니다"
              style={{ ...chip(true), textDecoration: "none" }}>
              선택 공고 등록 ↗
            </a>
          ) : (
            <button type="button" disabled
              title="조회된 활성 공고 목록에서 라디오로 공고를 선택하면 활성화돼요"
              style={{ ...chip(false), opacity: 0.5, cursor: "default", borderColor: "#e0d5ee", color: "#b7b0c0" }}>
              선택 공고 등록
            </button>
          )}
        </div>
        {bulkMsg && <div style={{ fontSize: 13.5, color: PURPLE, marginBottom: 8 }}>{bulkMsg}</div>}

        {/* 탭별 총 활성공고 건수(+중복) — 테이블 위 왼쪽 */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "0 2px 8px" }}>
          <span style={{ fontSize: 14, color: "#2b2533", fontWeight: 600 }}>
            {group} · 활성공고 <span style={{ color: PURPLE }}>{tabStats.total.toLocaleString()}</span>건
          </span>
          {tabStats.dup > 0 && <span style={{ fontSize: 12.5, color: "#c2410c" }} title="같은 브랜드·지점이 여러 번 잡힌 추정 중복 건수(제목의 지점명으로 매칭)">· 중복(추정) {tabStats.dup.toLocaleString()}건</span>}
        </div>

        {/* 테이블 */}
        <div style={{ overflow: "auto", maxHeight: "calc(100vh - 250px)", border: "1px solid #eee", borderRadius: 10, background: "#fff" }}>
          <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, minWidth: 1220 }}>
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
              ) : items.map((row, rowIdx) => {
                const isChecking = checking.has(row.id);
                const hv = String(val(row, "is_hiring"));
                const rv = String(val(row, "is_registered"));
                const home = val(row, "homepage");
                const subtitle = [row.category, row.scale].filter(Boolean).join(" · ");
                return (
                  <Fragment key={row.id}>
                    <tr style={{ background: selected.has(row.id) ? "#f6f0fb" : "#fff" }}>
                      <td style={td}><input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSel(row.id)} /></td>
                      <td style={{ ...td, color: "#9a92a6" }}>{rowIdx + 1}</td>
                      {/* 브랜드명 = 홈페이지 링크, ✎로 URL 편집 */}
                      <td style={td}>
                        {editHomeId === row.id ? (
                          <input autoFocus style={{ ...inp, fontSize: 13 }} placeholder="홈페이지 URL"
                            value={home || ""} onChange={(e) => setDraft(row.id, { homepage: e.target.value })}
                            onBlur={() => { saveField(row, "homepage"); setEditHomeId(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            {home ? (
                              <a href={normUrl(String(home))} target="_blank" rel="noreferrer"
                                style={{ fontWeight: 400, color: PURPLE, textDecoration: "none" }}>
                                {row.brand_name} <span style={{ fontSize: 12 }}>↗</span>
                              </a>
                            ) : (
                              <span style={{ fontWeight: 400, color: "#2b2533" }}>{row.brand_name}</span>
                            )}
                            <button onClick={() => setEditHomeId(row.id)} title={home ? "홈페이지 수정" : "홈페이지 링크 추가"}
                              style={{ border: "none", background: "none", cursor: "pointer", color: "#b7b0c0", fontSize: 13, padding: 0 }}>✎</button>
                          </div>
                        )}
                        {subtitle && <div style={{ fontSize: 12.5, color: "#9a92a6", marginTop: 2, maxWidth: 220 }}>{subtitle}</div>}
                      </td>
                      {/* 채용유무 */}
                      <td style={td}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <select value={HIRING.includes(hv) ? hv : "없음"} onChange={(e) => quickPatch(row, { is_hiring: e.target.value })}
                            style={{ ...inp, width: 90, color: hiringColor[HIRING.includes(hv) ? hv : "없음"], fontWeight: 400 }}>
                            {HIRING.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                          {isChecking && <span style={{ fontSize: 12, color: PURPLE }}>조회중…</span>}
                        </div>
                        {row.found_count > 0 && (
                          <button onClick={() => { setSrcTab(""); setExpanded(expanded === row.id ? null : row.id); }}
                            style={{ marginTop: 4, background: "none", border: "none", padding: 0, cursor: "pointer", ...badge("#0a7d34") }}>
                            공고 {row.found_count}건 {expanded === row.id ? "▲" : "▼"}
                          </button>
                        )}
                      </td>
                      {/* 등록유무 */}
                      <td style={td}>
                        <select value={REG.includes(rv) ? rv : "미등록"} onChange={(e) => quickPatch(row, { is_registered: e.target.value })}
                          style={{ ...inp, width: 90, color: regColor[REG.includes(rv) ? rv : "미등록"], fontWeight: 400 }}>
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
                        <div title={row.features || ""} style={{ ...clamp2, fontSize: 12.5, color: "#6b6473", lineHeight: 1.45 }}>
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
                            style={{ ...clamp2, minHeight: 34, padding: "5px 7px", border: "1px solid #eee", borderRadius: 6, fontSize: 13.5, color: row.note ? "#2b2533" : "#b7b0c0", cursor: "text", lineHeight: 1.4 }}>
                            {row.note || "메모 입력…"}
                          </div>
                        )}
                      </td>
                    </tr>
                    {expanded === row.id && row.found_jobs?.length > 0 && (() => {
                      // 사이트별 개수 집계(원문 순서 유지) + 탭 필터
                      const bySrc: Record<string, number> = {};
                      for (const jb of row.found_jobs) bySrc[jb.source] = (bySrc[jb.source] || 0) + 1;
                      const srcList = Object.keys(bySrc).sort((a, b) => bySrc[b] - bySrc[a]);
                      const activeTab = srcTab && bySrc[srcTab] ? srcTab : "";
                      const shown = activeTab ? row.found_jobs.filter((jb) => jb.source === activeTab) : row.found_jobs;
                      return (
                      <tr>
                        <td style={{ ...td, background: "#faf8fc" }} colSpan={9}>
                          <div style={{ fontSize: 13, color: "#6b6473", marginBottom: 6 }}>
                            조회된 활성 공고 <span style={{ color: "#9a92a6" }}>· 라디오 선택 후 상단 &quot;선택 공고 등록&quot;</span>
                          </div>
                          {/* 사이트별 탭 */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                            <button type="button" onClick={() => setSrcTab("")} style={{ ...chip(activeTab === ""), padding: "4px 11px", fontSize: 13 }}>
                              전체 <span style={{ opacity: 0.7 }}>{row.found_jobs.length}</span>
                            </button>
                            {srcList.map((s) => (
                              <button key={s} type="button" onClick={() => setSrcTab(s)} style={{ ...chip(activeTab === s), padding: "4px 11px", fontSize: 13 }}>
                                {s} <span style={{ opacity: 0.7 }}>{bySrc[s]}</span>
                              </button>
                            ))}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            {shown.map((jb, i) => (
                              <label key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, cursor: "pointer" }}>
                                <input type="radio" name="pickedFoundJob" checked={pickedJobUrl === jb.url} onChange={() => setPickedJobUrl(jb.url)} style={{ width: 14, height: 14, flexShrink: 0 }} />
                                <span style={badge(PURPLE)}>{jb.source}</span>
                                {jb.date && <span style={{ fontSize: 12.5, color: "#9a92a6", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>{jb.date}</span>}
                                <span style={{ color: "#2b2533" }}>{jb.title}</span>
                                {jb.email && (
                                  <button type="button" title="매장 채용 이메일 · 클릭하면 이 업체 이메일칸에 입력"
                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); quickPatch(row, { email: jb.email }); }}
                                    style={{ ...badge("#0a7d34"), border: "none", cursor: "pointer", flexShrink: 0 }}>
                                    ✉ {jb.email}
                                  </button>
                                )}
                                <a href={normUrl(jb.url)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} style={{ color: PURPLE, textDecoration: "none" }}>원문 ↗</a>
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                      );
                    })()}
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
