"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, X, Link2, Pencil, Trash2, ExternalLink } from "lucide-react";

type Job = { id: string; title: string; status: string; created_at: string };
type ExtCompany = {
  id: string;
  name: string;
  logo_url: string | null;
  homepage_url: string | null;
  contact_email: string | null;
  source_site: string | null;
  source_url: string | null;
  claimed_company_id: string | null;
  claimed_company_name: string | null;
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

export default function ExternalCompaniesPanel() {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  const authH = { Authorization: `Bearer ${token}` };

  const [items, setItems] = useState<ExtCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [editTarget, setEditTarget] = useState<ExtCompany | null>(null);
  const [editForm, setEditForm] = useState({ name: "", homepage_url: "", contact_email: "" });
  const [claimTarget, setClaimTarget] = useState<ExtCompany | null>(null);
  const [claimQuery, setClaimQuery] = useState("");
  const [claimHits, setClaimHits] = useState<MemberHit[]>([]);
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

  // 회원 기업 검색(연결 대상)
  useEffect(() => {
    if (!claimTarget) return;
    const q = claimQuery.trim();
    if (q.length < 1) { setClaimHits([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/company-search?q=${encodeURIComponent(q)}`, { headers: authH });
        const j = await res.json();
        if (alive && j.success) setClaimHits(j.data || []);
      } catch { /* noop */ }
    }, 250);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimQuery, claimTarget]);

  const openEdit = (ec: ExtCompany) => {
    setEditForm({ name: ec.name || "", homepage_url: ec.homepage_url || "", contact_email: ec.contact_email || "" });
    setEditTarget(ec);
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    if (!editForm.name.trim()) { setMsg("기업명을 입력해주세요."); return; }
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/admin/external-companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({ id: editTarget.id, name: editForm.name.trim(), homepage_url: editForm.homepage_url.trim(), contact_email: editForm.contact_email.trim() }),
      });
      const j = await res.json();
      if (!j.success) { setMsg(j.error?.message || "저장에 실패했어요."); return; }
      setEditTarget(null);
      await load();
    } finally { setBusy(false); }
  };

  const doClaim = async (memberId: string, memberName: string) => {
    if (!claimTarget) return;
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`/api/admin/external-companies/${claimTarget.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authH },
        body: JSON.stringify({ company_id: memberId }),
      });
      const j = await res.json();
      if (!j.success) { setMsg(j.error?.message || "연결에 실패했어요."); return; }
      const moved = j.data?.moved_jobs ?? 0;
      setClaimTarget(null); setClaimQuery(""); setClaimHits([]);
      setMsg(`✓ '${claimTarget.name}' → '${memberName}' 회원계정으로 연결했어요 (공고 ${moved}건 이관).`);
      await load();
    } finally { setBusy(false); }
  };

  const doDelete = async (ec: ExtCompany) => {
    if (ec.job_count > 0) { setMsg("연결된 공고가 있어 삭제할 수 없어요. 공고를 먼저 정리하세요."); return; }
    if (typeof window !== "undefined" && !window.confirm(`'${ec.name}'을(를) 삭제할까요?`)) return;
    setBusy(true); setMsg("");
    try {
      const res = await fetch(`/api/admin/external-companies?id=${ec.id}`, { method: "DELETE", headers: authH });
      const j = await res.json();
      if (!j.success) { setMsg(j.error?.message || "삭제에 실패했어요."); return; }
      await load();
    } finally { setBusy(false); }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((c) => (c.name || "").toLowerCase().includes(q) || (c.source_site || "").toLowerCase().includes(q) || (c.contact_email || "").toLowerCase().includes(q))
    : items;

  const totalCos = items.length;
  const totalJobs = items.reduce((s, c) => s + (c.job_count || 0), 0);
  const totalPending = items.reduce((s, c) => s + (c.pending_count || 0), 0);

  return (
    <>
      <div className="admin-mini-stats">
        {[["비회원 기업", totalCos, "개사"], ["외부 공고", totalJobs, "건"], ["전달 대기 지원", totalPending, "건"]].map(([label, count, unit]) => (
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
            <input className="admin-search-input" placeholder="기업명·출처·연락처 검색" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      {msg && (
        <div style={{ margin: "8px 0", fontSize: 13, padding: "8px 12px", borderRadius: 8, background: msg.startsWith("✓") ? "#e8f5e9" : "#fdeaea", color: msg.startsWith("✓") ? "#1b7a3d" : "#c0392b" }}>{msg}</div>
      )}

      <div className="admin-card">
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table" style={{ minWidth: 980, whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th>기업명</th>
                <th>출처</th>
                <th>연락처</th>
                <th style={{ textAlign: "center" }}>공고</th>
                <th style={{ textAlign: "center" }}>지원(대기)</th>
                <th>상태</th>
                <th>등록일</th>
                <th style={{ textAlign: "right" }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="admin-empty" style={{ textAlign: "center" }}>불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="admin-empty" style={{ textAlign: "center" }}>{items.length === 0 ? "비회원 기업이 아직 없어요. 외부 공고를 불러오면 여기에 쌓여요." : "검색 결과가 없습니다."}</td></tr>
              ) : (
                filtered.map((c) => (
                  <tr key={c.id}>
                    <td className="admin-td-brand">
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {c.logo_url
                          ? <img src={c.logo_url} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: "cover", background: "#f2f2f2" }} />
                          : <div style={{ width: 28, height: 28, borderRadius: 6, background: "#f2f2f2" }} />}
                        <span style={{ fontWeight: 600 }}>{c.name}</span>
                      </div>
                    </td>
                    <td className="admin-td-date">
                      {c.source_url
                        ? <a href={c.source_url} target="_blank" rel="noreferrer" style={{ color: "#5f0080", display: "inline-flex", alignItems: "center", gap: 3 }}>{c.source_site || "원문"}<ExternalLink size={12} /></a>
                        : (c.source_site || "-")}
                    </td>
                    <td className="admin-td-date">{c.contact_email || "-"}</td>
                    <td className="admin-td-date" style={{ textAlign: "center" }}>{c.job_count}</td>
                    <td className="admin-td-date" style={{ textAlign: "center" }}>
                      {c.application_count}
                      {c.pending_count > 0 && <span style={{ marginLeft: 4, color: "#a05a00", fontWeight: 700 }}>({c.pending_count})</span>}
                    </td>
                    <td className="admin-td-date">
                      {c.claimed_company_id
                        ? <span style={{ background: "#e8f5e9", color: "#1b7a3d", borderRadius: 6, padding: "2px 8px", fontSize: 12 }}>연결됨{c.claimed_company_name ? ` · ${c.claimed_company_name}` : ""}</span>
                        : <span style={{ background: "#f0f0f0", color: "#777", borderRadius: 6, padding: "2px 8px", fontSize: 12 }}>미연결</span>}
                    </td>
                    <td className="admin-td-date">{fmtDate(c.created_at)}</td>
                    <td className="admin-td-date">
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button className="resume-icon-btn" title="수정" onClick={() => openEdit(c)}><Pencil size={15} /></button>
                        {!c.claimed_company_id && (
                          <button className="resume-icon-btn" title="회원계정 연결" onClick={() => { setClaimQuery(""); setClaimHits([]); setClaimTarget(c); }}><Link2 size={15} /></button>
                        )}
                        <button className="resume-icon-btn danger" title="삭제" onClick={() => doDelete(c)}><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 수정 모달 */}
      {editTarget && (
        <div className="admin-modal-overlay" onClick={() => !busy && setEditTarget(null)}>
          <div className="admin-modal" style={{ maxWidth: 460, width: "92%", padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header" style={{ padding: "14px 18px" }}>
              <h2 className="admin-modal-title">비회원 기업 수정</h2>
              <button className="admin-modal-close" onClick={() => setEditTarget(null)}><X size={20} /></button>
            </div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ fontSize: 13, color: "#555" }}>기업명
                <input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} style={inp} />
              </label>
              <label style={{ fontSize: 13, color: "#555" }}>홈페이지
                <input value={editForm.homepage_url} onChange={(e) => setEditForm((f) => ({ ...f, homepage_url: e.target.value }))} placeholder="https://" style={inp} />
              </label>
              <label style={{ fontSize: 13, color: "#555" }}>채용 담당 이메일
                <input value={editForm.contact_email} onChange={(e) => setEditForm((f) => ({ ...f, contact_email: e.target.value }))} placeholder="hr@company.com" style={inp} />
              </label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                <button className="admin-page-btn" onClick={() => setEditTarget(null)} disabled={busy}>취소</button>
                <button className="admin-page-btn" style={{ background: "#5f0080", color: "#fff", borderColor: "#5f0080" }} onClick={saveEdit} disabled={busy}>{busy ? "저장 중..." : "저장"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 회원계정 연결(claim) 모달 */}
      {claimTarget && (
        <div className="admin-modal-overlay" onClick={() => !busy && setClaimTarget(null)}>
          <div className="admin-modal" style={{ maxWidth: 520, width: "92%", padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header" style={{ padding: "14px 18px" }}>
              <h2 className="admin-modal-title">‘{claimTarget.name}’ 회원계정 연결</h2>
              <button className="admin-modal-close" onClick={() => setClaimTarget(null)}><X size={20} /></button>
            </div>
            <div style={{ padding: 18 }}>
              <p style={{ fontSize: 12.5, color: "#888", margin: "0 0 10px", lineHeight: 1.5 }}>
                연결하면 이 비회원 기업의 외부 공고 {claimTarget.job_count}건이 선택한 회원 기업의 공고로 이관되고, 지원 관리도 회원 쪽으로 편입돼요.
              </p>
              <div className="admin-search-wrap" style={{ marginBottom: 10 }}>
                <Search size={16} className="admin-search-icon" />
                <input className="admin-search-input" autoFocus placeholder="회원 기업명·사업자번호 검색" value={claimQuery} onChange={(e) => setClaimQuery(e.target.value)} />
              </div>
              <div style={{ maxHeight: 300, overflow: "auto", border: "1px solid #eee", borderRadius: 8 }}>
                {claimQuery.trim().length < 1 ? (
                  <div style={{ padding: 16, color: "#aaa", fontSize: 13, textAlign: "center" }}>연결할 회원 기업을 검색하세요.</div>
                ) : claimHits.length === 0 ? (
                  <div style={{ padding: 16, color: "#aaa", fontSize: 13, textAlign: "center" }}>일치하는 회원 기업이 없어요.</div>
                ) : (
                  claimHits.map((m) => (
                    <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid #f3f3f3" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{m.company_name}{m.brand_name ? <span style={{ color: "#999", fontWeight: 400 }}> · {m.brand_name}</span> : null}</div>
                        <div style={{ fontSize: 11.5, color: "#999" }}>{m.business_number || "사업자번호 없음"} · {m.status === "ACTIVE" ? "승인완료" : m.status}</div>
                      </div>
                      <button className="admin-page-btn" style={{ background: "#5f0080", color: "#fff", borderColor: "#5f0080" }} disabled={busy} onClick={() => doClaim(m.id, m.company_name)}>연결</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inp: React.CSSProperties = { width: "100%", height: 40, marginTop: 4, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 14 };
