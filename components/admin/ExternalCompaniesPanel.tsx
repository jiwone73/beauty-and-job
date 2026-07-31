"use client";
import { useState, useEffect, useCallback, Fragment } from "react";
import { Search, X, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import BroadcastModal from "@/components/admin/BroadcastModal";

type Job = { id: string; title: string; status: string; created_at: string };
type NmCompany = {
  id: string;
  company_name: string;
  brand_name: string | null;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  website_url: string | null;
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
};
type MemberHit = { id: string; company_name: string; brand_name: string | null; business_number: string | null; email: string | null; status: string };

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}
function fmtMd(d: string | null) { return d ? new Date(d).toLocaleDateString("ko-KR", { month: "2-digit", day: "2-digit" }) : "-"; }
function fmtPhone(p: string | null) {
  if (!p) return "";
  const d = p.replace(/[^0-9]/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}`;
  return p;
}
const SIDO_SHORT: Record<string, string> = {
  "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
  "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
  "경기도": "경기", "강원특별자치도": "강원", "강원도": "강원", "충청북도": "충북", "충청남도": "충남",
  "전북특별자치도": "전북", "전라북도": "전북", "전라남도": "전남", "경상북도": "경북",
  "경상남도": "경남", "제주특별자치도": "제주",
};
// 비회원 기업 온보딩 단계 배지
const STAGE: Record<string, { label: string; bg: string; color: string }> = {
  RECEIVED:      { label: "지원접수", bg: "#eef1f5", color: "#556" },
  INVITED:       { label: "안내발송", bg: "#fff4e5", color: "#a05a00" },
  JOINED:        { label: "가입완료", bg: "#e7f0ff", color: "#1f5fbf" },
  LINKED:        { label: "연결완료", bg: "#e8f5e9", color: "#1b7a3d" },
  INVITE_FAILED: { label: "발송실패", bg: "#fdecec", color: "#c0392b" },
  DECLINED:      { label: "거절",     bg: "#fdecec", color: "#c0392b" },
  EXPIRED:       { label: "파기",     bg: "#f0f0f0", color: "#999" },
};
function fmtRegion(c: NmCompany) {
  const sido = c.region_sido ? (SIDO_SHORT[c.region_sido] || c.region_sido) : "";
  const s = [sido, c.region_sigungu].filter(Boolean).join(" ");
  if (s) return s;
  if (c.address) { const p = c.address.trim().split(/\s+/); return [SIDO_SHORT[p[0]] || p[0], p[1]].filter(Boolean).join(" ") || "-"; }
  return "-";
}
const METHOD: Record<string, string> = { EMAIL: "이메일 중계", MANAGED: "관리자 대행", REDIRECT: "외부 링크" };

export default function ExternalCompaniesPanel() {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  const authH = { Authorization: `Bearer ${token}` };

  const [items, setItems] = useState<NmCompany[]>([]);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<NmCompany | null>(null);
  const [editForm, setEditForm] = useState({ company_name: "", website_url: "", phone: "" });
  const [linkTarget, setLinkTarget] = useState<NmCompany | null>(null);
  const [linkQuery, setLinkQuery] = useState("");
  const [linkHits, setLinkHits] = useState<MemberHit[]>([]);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastChannel, setBroadcastChannel] = useState<"email" | "sms">("email");
  const [busy, setBusy] = useState(false);
  const [busyApp, setBusyApp] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

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
  const pendingOf = (id: string) => (appsByCompany[id] || []).filter((a) => a.delivery_status === "PENDING").length;

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((c) => (c.company_name || "").toLowerCase().includes(q) || (c.phone || "").includes(q) || (c.email || "").toLowerCase().includes(q))
    : items;

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
    if (typeof window !== "undefined" && !window.confirm(`선택한 ${selectedIds.length}개 비회원 기업을 삭제할까요? (공고가 있는 기업은 건너뜁니다)`)) return;
    setBusy(true); setMsg("");
    let done = 0, skipped = 0;
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/admin/external-companies?id=${id}`, { method: "DELETE", headers: authH });
        const j = await res.json().catch(() => ({}));
        if (j.success) done++; else skipped++;
      }
      setSelectedIds([]);
      setMsg(`삭제 ${done}개 완료${skipped ? ` · ${skipped}개는 공고가 있어 건너뜀(먼저 공고 정리 필요)` : ""}.`);
      await load();
    } finally { setBusy(false); }
  };

  // 지원자 → 기업 전달
  const forward = async (r: App) => {
    const target = (r.external_contact_email || r.ec_contact_email || "").trim();
    const m = target
      ? `${r.company_name}(${target})에 「${r.job_title}」 지원자 ${r.applicant_name}님을 이메일로 전달할까요?`
      : `${r.company_name}에 전달할 채용 이메일이 없어요. ‘수동 전달함’으로만 표시할까요? (실제 전달은 관리자가 직접)`;
    if (typeof window !== "undefined" && !window.confirm(m)) return;
    setBusyApp(r.id); setMsg("");
    try {
      const res = await fetch(`/api/admin/external-applications/${r.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({ action: "forward" }),
      });
      const j = await res.json();
      if (!j.success) { setMsg(j.error?.message || "전달 실패"); }
      await load();
    } finally { setBusyApp(null); }
  };

  const totalCos = items.length;
  const totalJobs = items.reduce((s, c) => s + (Number(c.job_count) || 0), 0);
  const totalPending = apps.filter((a) => a.delivery_status === "PENDING").length;
  const linkedCnt = items.filter((c) => c.merged_into_company_id).length;

  const selectedItems = items.filter((c) => selectedIds.includes(c.id));
  const canEmail = selectedItems.some((c) => !!c.email && c.email.includes("@"));
  const canSms = selectedItems.some((c) => !!c.phone && c.phone.replace(/[^0-9]/g, "").length >= 10);

  const btn = (active: boolean, color: string): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 6, border: "none",
    background: active ? color : "#ededed", color: active ? "#fff" : "#aaa",
    fontSize: 14, fontWeight: 400, cursor: active ? "pointer" : "default",
    display: "inline-flex", alignItems: "center", gap: 6,
  });

  return (
    <>
      <div className="admin-mini-stats">
        {[["비회원 기업", totalCos, "개사"], ["외부 공고", totalJobs, "건"], ["전달 대기 지원", totalPending, "건"], ["회원 연결됨", linkedCnt, "개사"]].map(([label, count, unit]) => (
          <div key={label as string} className="admin-mini-stat">
            <span className="admin-mini-stat-label">{label}</span>
            <span className="admin-mini-stat-value">{count as number}<span className="admin-mini-unit">{unit}</span></span>
          </div>
        ))}
      </div>

      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input" placeholder="기업명·연락처 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {msg && (
        <div style={{ margin: "8px 0", fontSize: 13, padding: "8px 12px", borderRadius: 8, background: msg.startsWith("✓") ? "#e8f5e9" : "#fdeaea", color: msg.startsWith("✓") ? "#1b7a3d" : "#c0392b" }}>{msg}</div>
      )}

      <div className="admin-card">
        <div className="admin-table-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>총 <strong>{filtered.length}</strong>개사 · 지원 행을 펼쳐 전달하세요</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => { if (canEmail) { setBroadcastChannel("email"); setBroadcastOpen(true); } }} disabled={!canEmail} title={!canEmail && selectedIds.length ? "선택한 기업 중 이메일이 있는 곳이 없어요" : undefined} style={btn(canEmail, "#5f0080")}>
              이메일 발송{selectedIds.length ? ` (${selectedIds.length})` : ""}
            </button>
            <button onClick={() => { if (canSms) { setBroadcastChannel("sms"); setBroadcastOpen(true); } }} disabled={!canSms} title={!canSms && selectedIds.length ? "선택한 기업 중 전화번호가 있는 곳이 없어요" : undefined} style={btn(canSms, "#5f0080")}>
              SMS 발송{selectedIds.length ? ` (${selectedIds.length})` : ""}
            </button>
            <button onClick={openLink} disabled={selectedIds.length !== 1} style={btn(selectedIds.length === 1, "#0a7d4b")}>
              회원 연결
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
                <th>기업명</th>
                <th>지역</th>
                <th>연락처</th>
                <th style={{ textAlign: "center" }}>공고</th>
                <th style={{ textAlign: "center" }}>지원(대기)</th>
                <th>상태</th>
                <th>등록일</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="admin-empty" style={{ textAlign: "center" }}>불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="admin-empty" style={{ textAlign: "center" }}>{items.length === 0 ? "비회원 기업이 아직 없어요. 외부 공고를 등록하면 여기에 쌓여요." : "검색 결과가 없습니다."}</td></tr>
              ) : (
                filtered.map((c) => {
                  const cApps = appsByCompany[c.id] || [];
                  const pend = pendingOf(c.id);
                  const open = expandedId === c.id;
                  return (
                    <Fragment key={c.id}>
                      <tr style={{ background: selectedIds.includes(c.id) ? "#faf5ff" : undefined }}>
                        <td style={{ textAlign: "center" }}>
                          <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleOne(c.id)} style={{ cursor: "pointer" }} />
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
                        <td className="admin-td-date">{fmtPhone(c.phone) || c.email || "-"}</td>
                        <td className="admin-td-date" style={{ textAlign: "center" }}>{c.job_count}</td>
                        <td className="admin-td-date" style={{ textAlign: "center" }}>
                          <button onClick={() => setExpandedId(open ? null : c.id)} disabled={cApps.length === 0}
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, border: "none", background: "none", cursor: cApps.length ? "pointer" : "default", color: cApps.length ? "#5f0080" : "#bbb", fontWeight: 600, fontSize: 13 }}>
                            {cApps.length ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
                            {cApps.length}
                            {pend > 0 && <span style={{ color: "#a05a00", fontWeight: 700 }}>({pend})</span>}
                          </button>
                        </td>
                        <td className="admin-td-date">
                          {(() => {
                            const s = c.merged_into_company_id ? "LINKED" : (c.onboarding_status || "RECEIVED");
                            const st = STAGE[s] || STAGE.RECEIVED;
                            return (
                              <span style={{ background: st.bg, color: st.color, borderRadius: 6, padding: "2px 8px", fontSize: 12, whiteSpace: "nowrap" }}>
                                {st.label}{s === "LINKED" && c.merged_into_name ? ` · ${c.merged_into_name}` : ""}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="admin-td-date">{fmtDate(c.created_at)}</td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={8} style={{ background: "#faf9fc", padding: "10px 16px" }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#5f0080", margin: "2px 0 8px" }}>외부 지원 {cApps.length}건</div>
                            {cApps.length === 0 ? (
                              <div style={{ color: "#999", fontSize: 13, padding: "6px 0" }}>이 기업에 들어온 지원이 없어요.</div>
                            ) : (
                              <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
                                <thead>
                                  <tr style={{ color: "#888", textAlign: "left" }}>
                                    <th style={{ padding: "4px 8px", fontWeight: 600 }}>지원자</th>
                                    <th style={{ padding: "4px 8px", fontWeight: 600 }}>지원 공고</th>
                                    <th style={{ padding: "4px 8px", fontWeight: 600 }}>지원방식</th>
                                    <th style={{ padding: "4px 8px", fontWeight: 600, textAlign: "center" }}>제3자동의</th>
                                    <th style={{ padding: "4px 8px", fontWeight: 600, textAlign: "center" }}>지원일</th>
                                    <th style={{ padding: "4px 8px", fontWeight: 600, textAlign: "center" }}>상태</th>
                                    <th style={{ padding: "4px 8px", fontWeight: 600, textAlign: "right" }}>처리</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cApps.map((r) => {
                                    const st = r.delivery_status;
                                    return (
                                      <tr key={r.id} style={{ borderTop: "1px solid #eee" }}>
                                        <td style={{ padding: "6px 8px" }}>
                                          <div style={{ fontWeight: 700 }}>{r.applicant_name}</div>
                                          <div style={{ fontSize: 11.5, color: "#999" }}>{[r.applicant_phone, r.applicant_email].filter(Boolean).join(" · ") || "-"}</div>
                                        </td>
                                        <td style={{ padding: "6px 8px", color: "#555" }}>{r.job_title}</td>
                                        <td style={{ padding: "6px 8px", color: "#555" }}>{METHOD[r.apply_method] || r.apply_method}</td>
                                        <td style={{ padding: "6px 8px", textAlign: "center", fontWeight: 700, color: r.third_party_consent ? "#0a9d6e" : "#c0392b" }}>{r.third_party_consent ? "✔" : "✘"}</td>
                                        <td style={{ padding: "6px 8px", textAlign: "center", color: "#888" }}>{fmtMd(r.applied_at)}</td>
                                        <td style={{ padding: "6px 8px", textAlign: "center" }}>
                                          {st === "FORWARDED"
                                            ? <span style={{ fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: "#0a7d55", background: "#e9f9f1" }}>전달됨{r.forwarded_channel === "MANUAL" ? "(수동)" : ""}</span>
                                            : st === "FAILED"
                                              ? <span style={{ fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: "#b91c1c", background: "#fee2e2" }}>실패</span>
                                              : <span style={{ fontSize: 11.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, color: "#b23b00", background: "#fff3ea" }}>대기</span>}
                                        </td>
                                        <td style={{ padding: "6px 8px", textAlign: "right" }}>
                                          {st === "FORWARDED"
                                            ? <button onClick={() => forward(r)} disabled={busyApp === r.id} style={{ fontSize: 12, fontWeight: 700, borderRadius: 6, padding: "5px 10px", cursor: "pointer", border: "1px solid #ddd", background: "#fff", color: "#666" }}>재전송</button>
                                            : <button onClick={() => forward(r)} disabled={busyApp === r.id || !r.third_party_consent}
                                                style={{ fontSize: 12, fontWeight: 700, borderRadius: 6, padding: "5px 11px", cursor: r.third_party_consent ? "pointer" : "default", border: "none", background: r.third_party_consent ? "#5f0080" : "#ccc", color: "#fff" }}>
                                                {busyApp === r.id ? "처리 중..." : (r.external_contact_email || r.ec_contact_email) ? "기업에 전달" : "수동 전달함"}
                                              </button>}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
            return { id, name: c?.company_name || "", email: c?.email || null, phone: c?.phone || null };
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
