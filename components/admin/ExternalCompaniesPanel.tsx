"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, X, Trash2 } from "lucide-react";
import BroadcastModal from "@/components/admin/BroadcastModal";
import FilterDropdown from "@/components/company/FilterDropdown";

const SORT_LABELS: Record<string, string> = { recent: "등록일순", name: "기업명순", stage: "진행 단계순" };
const SORT_VALUES: Record<string, "recent" | "name" | "stage"> = { "등록일순": "recent", "기업명순": "name", "진행 단계순": "stage" };

type Job = {
  id: string; title: string; status: string; created_at: string;
  source_url: string | null; external_apply_url: string | null;
  contact_phone: string | null; contact_email: string | null;
};
type NmCompany = {
  id: string;
  company_name: string;
  brand_name: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  website_url: string | null;
  contact_phone: string | null;   // 기업 전화가 없으면 공고에 적힌 연락처
  contact_email: string | null;
  region_sido: string | null;
  region_sigungu: string | null;
  address: string | null;
  merged_into_company_id: string | null;
  merged_into_name: string | null;
  onboarding_status: string | null;
  invited_at: string | null;
  invite_channel: string | null;
  invite_count: number | null;
  joined_at: string | null;
  linked_at: string | null;
  created_at: string;
  job_count: number;
  application_count: number;
  pending_count: number;
  jobs: Job[];
};
type App = {
  id: string;
  applied_at: string;
  delivery_status: string | null;
  forwarded_at: string | null;
  forwarded_channel: string | null;
  third_party_consent: boolean;
  applicant_name: string;
  applicant_phone: string | null;
  applicant_email: string | null;
  job_id: string;
  job_title: string;
  apply_method: string;
  external_contact_email: string | null;
  ec_contact_email: string | null;
  company_id: string | null;
  company_name: string | null;
  notified_at: string | null;
  linked_at: string | null;
  viewed_at: string | null;
  company_is_member: boolean | null;
  job_source: string | null;
};

// 지원 진행 6단계 (1~6). 상태 열 · 선택 시 프로그레스 공용.
const STAGES = ["공고등록", "지원서 접수", "지원서 통보", "회원가입", "지원서 연결", "지원서 확인"];
// 지원서 1건의 단계(2~6). 지원서가 있으면 최소 '지원서 접수'(2).
function appStage(a: App): number {
  if (a.viewed_at) return 6;          // 지원서 확인
  if (a.linked_at) return 5;          // 지원서 전달
  if (a.company_is_member) return 4;  // 회원가입
  if (a.notified_at) return 3;        // 지원서 통보
  return 2;                           // 지원서 접수
}
// 기업 행의 대표 단계(1~6): 지원서 중 가장 앞선 단계, 없으면 1(공고등록).
function companyStage(c: NmCompany, cApps: App[]): number {
  let s = 1; // 공고등록
  if (c.onboarding_status === "JOINED") s = Math.max(s, 4); // 회원가입 완료(미연결)
  if (c.merged_into_company_id) s = Math.max(s, 4); // 회원 연결됨
  for (const a of cApps) s = Math.max(s, appStage(a));
  return s;
}
type MemberHit = { id: string; company_name: string; brand_name: string | null; business_number: string | null; email: string | null; status: string };

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}
function fmtPhone(p: string | null) {
  if (!p) return "";
  const d = p.replace(/[^0-9]/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  return p;
}
// 비회원 기업은 기업 연락처가 비어 있고 공고에만 적혀 있는 경우가 대부분이다.
// 안내 발송·표시 모두 같은 값을 쓰도록 여기서 한 번에 정한다.
function contactPhone(c: NmCompany): string | null {
  if (c.phone) return c.phone;
  if (c.contact_phone) return c.contact_phone;
  return c.jobs?.find((j) => j.contact_phone)?.contact_phone || null;
}
function contactEmail(c: NmCompany): string | null {
  if (c.email) return c.email;
  if (c.contact_email) return c.contact_email;
  return c.jobs?.find((j) => j.contact_email)?.contact_email || null;
}
const SIDO_SHORT: Record<string, string> = {
  "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
  "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
  "경기도": "경기", "강원특별자치도": "강원", "강원도": "강원", "충청북도": "충북", "충청남도": "충남",
  "전북특별자치도": "전북", "전라북도": "전북", "전라남도": "전남", "경상북도": "경북",
  "경상남도": "경남", "제주특별자치도": "제주",
};
function fmtRegion(c: NmCompany) {
  const sido = c.region_sido ? (SIDO_SHORT[c.region_sido] || c.region_sido) : "";
  const s = [sido, c.region_sigungu].filter(Boolean).join(" ");
  if (s) return s;
  if (c.address) { const p = c.address.trim().split(/\s+/); return [SIDO_SHORT[p[0]] || p[0], p[1]].filter(Boolean).join(" ") || "-"; }
  return "-";
}

export default function ExternalCompaniesPanel() {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  const authH = { Authorization: `Bearer ${token}` };

  const [items, setItems] = useState<NmCompany[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [editTarget, setEditTarget] = useState<NmCompany | null>(null);
  const [editForm, setEditForm] = useState({ company_name: "", website_url: "", phone: "" });
  const [linkTarget, setLinkTarget] = useState<NmCompany | null>(null);
  const [linkQuery, setLinkQuery] = useState("");
  const [linkHits, setLinkHits] = useState<MemberHit[]>([]);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastChannel, setBroadcastChannel] = useState<"email" | "sms">("email");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "name" | "stage">("recent");
  const [stageFilter, setStageFilter] = useState<number | null>(null);
  // 누가 올린 공고인지로 거르기. 공고를 저장할 때 로그인한 관리자 아이디가 created_by 에 남는다.
  const [byFilter, setByFilter] = useState<"" | "alba" | "admin">("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [rc, ra] = await Promise.all([
        fetch("/api/admin/external-companies", { headers: authH }).then((r) => r.json()).catch(() => ({})),
        fetch("/api/admin/external-applications", { headers: authH }).then((r) => r.json()).catch(() => ({})),
      ]);
      if (rc.success) setItems(rc.data.items || []);
      if (ra.success) setApps(ra.data || []);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!linkTarget) return;
    const q = linkQuery.trim();
    if (q.length < 1) { setLinkHits([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/company-search?member=true&q=${encodeURIComponent(q)}`, { headers: authH });
        const j = await res.json();
        if (alive && j.success) setLinkHits((j.data || []).filter((m: MemberHit) => m.id !== linkTarget.id));
      } catch { /* noop */ }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkQuery, linkTarget]);

  // 회사별 지원 그룹핑
  const appsByCompany: Record<string, App[]> = {};
  for (const a of apps) { const k = a.company_id || ""; (appsByCompany[k] = appsByCompany[k] || []).push(a); }

  const stageOfCompany = (c: NmCompany) => companyStage(c, appsByCompany[c.id] || []);
  const stageCounts = STAGES.map((_, i) => items.filter((c) => stageOfCompany(c) === i + 1).length);

  const q = search.trim().toLowerCase();
  const searched = q
    ? items.filter((c) => (c.company_name || "").toLowerCase().includes(q) || (contactPhone(c) || "").includes(q) || (contactEmail(c) || "").toLowerCase().includes(q))
    : items;
  const staged = stageFilter ? searched.filter((c) => stageOfCompany(c) === stageFilter) : searched;
  // 그 업체 공고 중 한 건이라도 해당 작성자가 올린 게 있으면 남긴다.
  //  · 알바: created_by = 'alba'
  //  · 관리자: 그 밖(admin·beauty, 그리고 작성자를 안 남기던 시절의 빈 값)
  const isAlba = (j: any) => j?.created_by === "alba";
  const byFiltered = byFilter
    ? staged.filter((c) => (c.jobs || []).some((j: any) => (byFilter === "alba" ? isAlba(j) : !isAlba(j))))
    : staged;
  const filtered = [...byFiltered].sort((a, b) => {
    if (sortBy === "name") return (a.company_name || "").localeCompare(b.company_name || "", "ko");
    if (sortBy === "stage") {
      const d = stageOfCompany(b) - stageOfCompany(a);
      if (d !== 0) return d;
    }
    return (b.created_at || "").localeCompare(a.created_at || "");
  });

  const allSelected = filtered.length > 0 && filtered.every((c) => selectedIds.includes(c.id));
  const toggleAll = () => setSelectedIds(allSelected ? [] : filtered.map((c) => c.id));
  const toggleOne = (id: string) => setSelectedIds((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const openEdit = (c: NmCompany) => {
    setEditForm({ company_name: c.company_name || "", website_url: c.website_url || "", phone: c.phone || "" });
    setEditTarget(c);
  };
  const saveEdit = async () => {
    if (!editTarget) return;
    if (!editForm.company_name.trim()) { setMsg("기업명을 입력해주세요."); return; }
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/admin/external-companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({ id: editTarget.id, company_name: editForm.company_name.trim(), website_url: editForm.website_url.trim(), phone: editForm.phone }),
      });
      const j = await res.json();
      if (!j.success) { setMsg(j.error?.message || "저장에 실패했어요."); return; }
      setEditTarget(null);
      await load();
    } finally { setBusy(false); }
  };

  const openLink = () => {
    if (selectedIds.length !== 1) return;
    const c = items.find((x) => x.id === selectedIds[0]);
    if (!c) return;
    if (c.merged_into_company_id) { setMsg("이미 회원 기업으로 연결된 곳이에요."); return; }
    setLinkQuery(""); setLinkHits([]); setLinkTarget(c);
  };
  const doLink = async (memberId: string, memberName: string) => {
    if (!linkTarget) return;
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`/api/admin/external-companies/${linkTarget.id}/link`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({ company_id: memberId }),
      });
      const j = await res.json();
      if (!j.success) { setMsg(j.error?.message || "연결에 실패했어요."); return; }
      const moved = j.data?.moved_jobs ?? 0;
      const nm = linkTarget.company_name;
      setLinkTarget(null); setLinkQuery(""); setLinkHits([]); setSelectedIds([]);
      setMsg(`✓ '${nm}' → '${memberName}' 회원 기업으로 연결했어요 (공고 ${moved}건 이관). 비회원 목록엔 '연결됨'으로 남겨뒀어요.`);
      await load();
    } finally { setBusy(false); }
  };

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (typeof window !== "undefined" && !window.confirm(`선택한 ${selectedIds.length}개 비회원 기업을 삭제할까요?\n연결된 공고·지원서도 함께 삭제됩니다. (복구 불가)`)) return;
    setBusy(true); setMsg("");
    let done = 0, skipped = 0, jobs = 0;
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/admin/external-companies?id=${id}`, { method: "DELETE", headers: authH });
        const j = await res.json().catch(() => ({}));
        if (j.success) { done++; jobs += j.data?.deleted_jobs ?? 0; } else skipped++;
      }
      setSelectedIds([]);
      setMsg(`삭제 ${done}개 완료${jobs ? `(공고 ${jobs}건 포함)` : ""}${skipped ? ` · ${skipped}개 실패` : ""}.`);
      await load();
    } finally { setBusy(false); }
  };

  const selectedItems = items.filter((c) => selectedIds.includes(c.id));
  const canEmail = selectedItems.some((c) => { const e = contactEmail(c); return !!e && e.includes("@"); });
  // 문자는 휴대폰으로만 간다. 02·031 같은 일반전화로 보내면 그냥 실패한다.
  // 고른 것 중 하나라도 휴대폰이 아니면 아예 못 누르게 막아, 일부만 나가고
  // 나머지는 조용히 실패하는 일이 없게 한다.
  const isMobile = (p: string | null) => !!p && /^010\d{7,8}$/.test(p.replace(/[^0-9]/g, ""));
  const smsBad = selectedItems.filter((c) => !isMobile(contactPhone(c)));
  const canSms = selectedItems.length > 0 && smsBad.length === 0;
  // 지원서 연결: 4.회원가입 완료 상태의 1개사만 활성화
  const linkOne = selectedItems.length === 1 ? selectedItems[0] : null;
  const canLink = !!linkOne && stageOfCompany(linkOne) === 4;

  const btn = (active: boolean, color: string): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 6, border: "none",
    background: active ? color : "#ededed", color: active ? "#fff" : "#aaa",
    fontSize: 14, fontWeight: 400, cursor: active ? "pointer" : "default",
    display: "inline-flex", alignItems: "center", gap: 6,
  });

  return (
    <>
      <div className="admin-mini-stats">
        {STAGES.map((label, i) => {
          const n = i + 1;
          const active = stageFilter === n;
          return (
            <div key={label} className="admin-mini-stat"
              onClick={() => setStageFilter(active ? null : n)}
              style={{ cursor: "pointer", ...(active ? { outline: "2px solid #5f0080", outlineOffset: "-2px" } : {}) }}>
              <span className="admin-mini-stat-label">{n}. {label}</span>
              <span className="admin-mini-stat-value">{stageCounts[i]}<span className="admin-mini-unit">개사</span></span>
            </div>
          );
        })}
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="기업명·연락처 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <FilterDropdown label="정렬"
            value={SORT_LABELS[sortBy]}
            options={["등록일순", "기업명순", "진행 단계순"]}
            onChange={(v) => setSortBy(SORT_VALUES[v] ?? "recent")} />
          <FilterDropdown label="공고 등록자"
            value={byFilter === "alba" ? "알바" : byFilter === "admin" ? "관리자" : "전체"}
            options={["전체", "알바", "관리자"]}
            onChange={(v) => setByFilter(v === "알바" ? "alba" : v === "관리자" ? "admin" : "")} />
          {stageFilter && (
            <FilterDropdown label="단계"
              value={`${stageFilter}. ${STAGES[stageFilter - 1]}`}
              options={["전체", ...STAGES.map((s, i) => `${i + 1}. ${s}`)]}
              onChange={(v) => setStageFilter(v === "전체" ? null : STAGES.findIndex((s, i) => `${i + 1}. ${s}` === v) + 1)} />
          )}
        </div>
      </div>

      {msg && (
        <div style={{ margin: "8px 0", fontSize: 13, padding: "8px 12px", borderRadius: 8, background: msg.startsWith("✓") ? "#e8f5e9" : "#fdeaea", color: msg.startsWith("✓") ? "#1b7a3d" : "#c0392b" }}>{msg}</div>
      )}

      <div className="admin-card">
        {/* 선택 기업 진행 단계 게이지 (1~6) — 표 카드 안이라 표 콘텐츠 폭에 정확히 맞음 */}
        {selectedItems.length > 0 && (
          <div style={{ padding: "22px 24px", borderBottom: "1px solid #f0f0f0" }}>
            <div style={{ fontSize: 14, color: "#333", marginBottom: 16 }}>선택 기업 진행 단계 <span style={{ color: "#999" }}>({selectedItems.length})</span></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {selectedItems.map((c) => {
                const cApps = appsByCompany[c.id] || [];
                const stage = companyStage(c, cApps);
                const jobTitle = (c.jobs && c.jobs[0]?.title) || "-";
                return (
                  <div key={c.id}>
                    <div style={{ fontSize: 14, color: "#333", marginBottom: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.company_name}<span style={{ color: "#aaa" }}> · {jobTitle}</span>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {STAGES.map((label, i) => {
                        const n = i + 1;
                        const filled = n <= stage, cur = n === stage;
                        return (
                          <div key={label} style={{ flex: 1 }}>
                            <div style={{ height: 12, borderRadius: 6, background: cur ? "#5f0080" : filled ? "#c9b3e6" : "#eee" }} />
                            <div style={{ marginTop: 8, fontSize: 14, textAlign: "center", lineHeight: 1.3, color: cur ? "#5f0080" : "#999", fontWeight: cur ? 700 : 400 }}>{n}. {label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="admin-table-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>총 <strong>{filtered.length}</strong>개사 · 체크박스를 선택하면 진행 단계가 표시돼요</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => { if (canEmail) { setBroadcastChannel("email"); setBroadcastOpen(true); } }} disabled={!canEmail} title={!canEmail && selectedIds.length ? "선택한 기업 중 이메일이 있는 곳이 없어요" : undefined} style={btn(canEmail, "#5f0080")}>
              이메일 발송{selectedIds.length ? ` (${selectedIds.length})` : ""}
            </button>
            <button onClick={() => { if (canSms) { setBroadcastChannel("sms"); setBroadcastOpen(true); } }} disabled={!canSms}
              title={!canSms && selectedIds.length
                ? `문자는 휴대폰(010)으로만 보낼 수 있어요. 휴대폰이 아닌 곳 ${smsBad.length}곳: ${smsBad.slice(0, 3).map((c) => `${c.company_name}(${contactPhone(c) || "번호 없음"})`).join(", ")}${smsBad.length > 3 ? " 외" : ""}`
                : undefined}
              style={btn(canSms, "#5f0080")}>
              SMS 발송{selectedIds.length ? ` (${selectedIds.length})` : ""}
            </button>
            <button onClick={openLink} disabled={!canLink}
              title={!canLink && selectedIds.length === 1 ? "4. 회원가입 완료 상태에서만 연결할 수 있어요" : undefined}
              style={btn(canLink, "#0a7d4b")}>
              지원서 연결
            </button>
            <button onClick={bulkDelete} disabled={selectedIds.length === 0 || busy} style={{ ...btn(selectedIds.length > 0, "#e74c3c"), fontWeight: 600 }}>
              <Trash2 size={15} /> 선택 삭제{selectedIds.length ? ` (${selectedIds.length})` : ""}
            </button>
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ minWidth: 960, whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: "center" }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: "pointer" }} />
                </th>
                <th>외부공고명</th>
                <th style={{ width: 78 }}>등록자</th>
                <th>기업명</th>
                <th>지역</th>
                <th>연락처</th>
                <th style={{ textAlign: "center" }}>입사지원</th>
                <th>상태</th>
                <th>등록일</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="admin-empty" style={{ textAlign: "center" }}>불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="admin-empty" style={{ textAlign: "center" }}>{items.length === 0 ? "비회원 기업이 아직 없어요. 외부 공고를 등록하면 여기에 쌓여요." : "검색 결과가 없습니다."}</td></tr>
              ) : (
                filtered.map((c) => {
                  const cApps = appsByCompany[c.id] || [];
                  const stage = companyStage(c, cApps);
                  const selected = selectedIds.includes(c.id);
                  const jobTitle = (c.jobs && c.jobs[0]?.title) || "-";
                  const jobExtra = c.job_count > 1 ? ` 외 ${c.job_count - 1}` : "";
                  // 크롤링한 공고는 원문 주소가 있다. 없으면(직접 등록) 링크 없이 제목만.
                  const j0 = c.jobs && c.jobs[0];
                  const jobUrl = j0?.source_url || j0?.external_apply_url || null;
                  return (
                    <tr key={c.id} style={{ background: selected ? "#faf5ff" : undefined }}>
                      <td style={{ textAlign: "center" }}>
                        <input type="checkbox" checked={selected} onChange={() => toggleOne(c.id)} style={{ cursor: "pointer" }} />
                      </td>
                      {/* 제목만 말줄임하고, 원문 링크와 배지는 오른쪽에 고정한다.
                          셀 전체에 말줄임을 걸면 제목이 길 때 뒤의 것들이 통째로 잘려 안 보인다. */}
                      <td style={{ maxWidth: 320, color: "#333" }} title={jobTitle}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                          {/* 공고명은 우리가 올린 공고로 — 실제로 어떻게 나갔는지 바로 확인하는 게 먼저다. */}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
                            {j0?.id ? (
                              <a href={`/jobs/${j0.id}`} target="_blank" rel="noopener noreferrer" title={`뷰티워크 공고 보기 · ${jobTitle}`}
                                style={{ color: "#5f0080", textDecoration: "none" }}>
                                {jobTitle}
                              </a>
                            ) : jobTitle}
                            {jobExtra && <span style={{ color: "#aaa" }}>{jobExtra}</span>}
                          </span>
                          {/* 원문은 따로 — 옮겨 온 값이 맞는지 대조할 때 쓴다. */}
                          {jobUrl && (
                            <a href={jobUrl} target="_blank" rel="noopener noreferrer" title="원문 보기"
                              onClick={(e) => e.stopPropagation()}
                              style={{ flexShrink: 0, fontSize: 11, color: "#9a92a6", textDecoration: "none", whiteSpace: "nowrap" }}>
                              원문 ↗
                            </a>
                          )}
                        </div>
                      </td>
                      {/* 누가 올린 공고인지 — 알바 실적과 관리자 등록을 눈으로 가른다 */}
                      <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                        {j0 ? (
                          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 999,
                            background: isAlba(j0) ? "#eef7f0" : "#f3f0f7",
                            color: isAlba(j0) ? "#0a7d34" : "#7b7387" }}>
                            {isAlba(j0) ? "알바" : "관리자"}
                          </span>
                        ) : <span style={{ color: "#ccc" }}>-</span>}
                      </td>
                      <td className="admin-td-brand">
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          {c.logo_url
                            ? <img src={c.logo_url} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover", background: "#f2f2f2" }} />
                            : <div style={{ width: 28, height: 28, borderRadius: 6, background: "#f2f2f2" }} />}
                          <span onClick={() => openEdit(c)} title="정보 수정" style={{ fontWeight: 600, color: "#1a1a1a", cursor: "pointer" }}>{c.company_name}</span>
                        </div>
                      </td>
                      <td className="admin-td-date">{fmtRegion(c)}</td>
                      <td className="admin-td-date">{fmtPhone(contactPhone(c)) || contactEmail(c) || "-"}</td>
                      <td className="admin-td-date" style={{ textAlign: "center" }}>
                        {cApps.length > 0 ? (
                          <a href={`/admin/resumes/applications?search=${encodeURIComponent(c.company_name)}`}
                            title={`${c.company_name} 입사지원 보기`}
                            style={{ color: "#5f0080", fontWeight: 600, textDecoration: "none" }}>
                            {cApps.length}
                          </a>
                        ) : (
                          <span style={{ color: "#bbb" }}>0</span>
                        )}
                      </td>
                      <td className="admin-td-date">
                        <span style={{ background: "#f3edfa", color: "#5f0080", borderRadius: 6, padding: "2px 8px", fontSize: 12, whiteSpace: "nowrap" }}>
                          {STAGES[stage - 1]}
                        </span>
                      </td>
                      <td className="admin-td-date">{fmtDate(c.created_at)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 수정 모달 (기업명 클릭 시) */}
      {editTarget && (
        <div className="admin-modal-overlay" onClick={() => !busy && setEditTarget(null)}>
          <div className="admin-modal" style={{ maxWidth: 460, width: "92%", padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header" style={{ padding: "14px 18px" }}>
              <h2 className="admin-modal-title">비회원 기업 수정</h2>
              <button className="admin-modal-close" onClick={() => setEditTarget(null)}><X size={20} /></button>
            </div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 13, color: "#555" }}>기업명
                <input value={editForm.company_name} onChange={(e) => setEditForm((f) => ({ ...f, company_name: e.target.value }))} style={inp} />
              </label>
              <label style={{ fontSize: 13, color: "#555" }}>홈페이지
                <input value={editForm.website_url} onChange={(e) => setEditForm((f) => ({ ...f, website_url: e.target.value }))} placeholder="https://" style={inp} />
              </label>
              <label style={{ fontSize: 13, color: "#555" }}>연락처(전화)
                <input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="010-0000-0000" style={inp} />
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <button className="admin-page-btn" onClick={() => setEditTarget(null)} disabled={busy}>취소</button>
                <button className="admin-page-btn" style={{ background: "#5f0080", color: "#fff", borderColor: "#5f0080" }} onClick={saveEdit} disabled={busy}>{busy ? "저장 중..." : "저장"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 회원 기업 연결(병합) 모달 */}
      {linkTarget && (
        <div className="admin-modal-overlay" onClick={() => !busy && setLinkTarget(null)}>
          <div className="admin-modal" style={{ maxWidth: 520, width: "92%", padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header" style={{ padding: "14px 18px" }}>
              <h2 className="admin-modal-title">‘{linkTarget.company_name}’ 회원 기업으로 연결</h2>
              <button className="admin-modal-close" onClick={() => setLinkTarget(null)}><X size={20} /></button>
            </div>
            <div style={{ padding: 18 }}>
              <p style={{ fontSize: 12.5, color: "#888", margin: "0 0 10px", lineHeight: 1.5 }}>
                연결하면 이 비회원의 공고 {linkTarget.job_count}건이 선택한 회원 기업의 공고로 이관돼요. 비회원 행은 삭제되지 않고 ‘연결됨’으로 남아요.
              </p>
              <div className="admin-search-wrap" style={{ marginBottom: 10 }}>
                <Search size={16} className="admin-search-icon" />
                <input className="admin-search-input" autoFocus placeholder="회원 기업명·사업자번호 검색" value={linkQuery} onChange={(e) => setLinkQuery(e.target.value)} />
              </div>
              <div style={{ maxHeight: 300, overflow: "auto", border: "1px solid #eee", borderRadius: 8 }}>
                {linkQuery.trim().length < 1 ? (
                  <div style={{ padding: 16, color: "#aaa", fontSize: 13, textAlign: "center" }}>연결할 회원 기업을 검색하세요.</div>
                ) : linkHits.length === 0 ? (
                  <div style={{ padding: 16, color: "#aaa", fontSize: 13, textAlign: "center" }}>일치하는 회원 기업이 없어요.</div>
                ) : (
                  linkHits.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid #f3f3f3" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{m.company_name}{m.brand_name ? <span style={{ color: "#999", fontWeight: 400 }}> · {m.brand_name}</span> : null}</div>
                        <div style={{ fontSize: 11.5, color: "#999" }}>{m.business_number || "사업자번호 없음"} · {m.status === "ACTIVE" ? "승인완료" : m.status}</div>
                      </div>
                      <button className="admin-page-btn" style={{ background: "#5f0080", color: "#fff", borderColor: "#5f0080" }} disabled={busy} onClick={() => doLink(m.id, m.company_name)}>연결</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {broadcastOpen && (
        <BroadcastModal
          initialChannel={broadcastChannel}
          targets={selectedIds.map((id) => {
            const c = items.find((x) => x.id === id);
            return { id, name: c?.company_name || "", email: c ? contactEmail(c) : null, phone: c ? contactPhone(c) : null };
          })}
          onClose={() => setBroadcastOpen(false)}
          onSent={async (channel, ids) => {
            try {
              await fetch("/api/admin/external-companies/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...authH },
                body: JSON.stringify({ ids, channel }),
              });
              load();
            } catch { /* 발송은 됐으니 상태 갱신 실패는 조용히 무시 */ }
          }}
        />
      )}
    </>
  );
}

const inp: React.CSSProperties = { width: "100%", height: 40, marginTop: 4, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 14 };
