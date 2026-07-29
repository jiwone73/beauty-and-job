"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, X, Trash2 } from "lucide-react";
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
  created_at: string;
  job_count: number;
  application_count: number;
  pending_count: number;
  jobs: Job[];
};
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

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/external-companies", { headers: authH });
      const j = await res.json();
      if (j.success) setItems(j.data.items || []);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => { load(); }, [load]);

  // 연결 대상 회원기업 검색
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

  const totalCos = items.length;
  const totalJobs = items.reduce((s, c) => s + (Number(c.job_count) || 0), 0);
  const linkedCnt = items.filter((c) => c.merged_into_company_id).length;

  const btn = (active: boolean, color: string): React.CSSProperties => ({
    padding: "6px 14px", borderRadius: 6, border: "none",
    background: active ? color : "#ededed", color: active ? "#fff" : "#aaa",
    fontSize: 14, fontWeight: 400, cursor: active ? "pointer" : "default",
    display: "inline-flex", alignItems: "center", gap: 6,
  });

  return (
    <>
      <div className="admin-mini-stats">
        {[["비회원 기업", totalCos, "개사"], ["외부 공고", totalJobs, "건"], ["회원 연결됨", linkedCnt, "개사"]].map(([label, count, unit]) => (
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
          <span>총 <strong>{filtered.length}</strong>개사</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => { if (selectedIds.length) { setBroadcastChannel("email"); setBroadcastOpen(true); } }} disabled={selectedIds.length === 0} style={btn(selectedIds.length > 0, "#5f0080")}>
              이메일 발송{selectedIds.length ? ` (${selectedIds.length})` : ""}
            </button>
            <button onClick={() => { if (selectedIds.length) { setBroadcastChannel("sms"); setBroadcastOpen(true); } }} disabled={selectedIds.length === 0} style={btn(selectedIds.length > 0, "#5f0080")}>
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
          <table className="admin-table" style={{ minWidth: 940, whiteSpace: "nowrap" }}>
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
                filtered.map((c) => (
                  <tr key={c.id} style={{ background: selectedIds.includes(c.id) ? "#faf5ff" : undefined }}>
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
                      {c.application_count}
                      {c.pending_count > 0 && <span style={{ marginLeft: 4, color: "#a05a00", fontWeight: 700 }}>({c.pending_count})</span>}
                    </td>
                    <td className="admin-td-date">
                      {c.merged_into_company_id
                        ? <span style={{ background: "#e8f5e9", color: "#1b7a3d", borderRadius: 6, padding: "2px 8px", fontSize: 12 }}>연결됨{c.merged_into_name ? ` · ${c.merged_into_name}` : ""}</span>
                        : <span style={{ background: "#f0f0f0", color: "#777", borderRadius: 6, padding: "2px 8px", fontSize: 12 }}>미연결</span>}
                    </td>
                    <td className="admin-td-date">{fmtDate(c.created_at)}</td>
                  </tr>
                ))
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
        />
      )}
    </>
  );
}

const inp: React.CSSProperties = { width: "100%", height: 40, marginTop: 4, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 14 };
