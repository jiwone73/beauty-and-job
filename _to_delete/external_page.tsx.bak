"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";

type ExtJob = {
  id: string;
  title: string;
  job_type: string;
  status: string;
  apply_method: string;
  external_apply_url: string | null;
  external_contact_email: string | null;
  deadline: string | null;
  created_at: string;
  company_name: string | null;
  homepage_url: string | null;
  external_company_id: string | null;
  claimed_company_id: string | null;
  application_count: number;
  pending_count: number;
};

const METHOD_LABEL: Record<string, { t: string; c: string }> = {
  REDIRECT: { t: "외부 링크형", c: "#8a8f98" },
  EMAIL: { t: "이메일 중계", c: "#0ea5e9" },
  MANAGED: { t: "관리자 대행", c: "#5f0080" },
};

const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);

const EMPTY = {
  company_name: "", homepage_url: "", contact_email: "", source_site: "", source_url: "",
  title: "", job_type: "STORE", location: "", deadline: "",
  apply_method: "MANAGED", external_apply_url: "", description: "",
};

export default function AdminExternalJobsPage() {
  const [list, setList] = useState<ExtJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [claimEc, setClaimEc] = useState<{ id: string; name: string } | null>(null);
  const [mq, setMq] = useState("");
  const [mres, setMres] = useState<any[]>([]);
  const [claiming, setClaiming] = useState(false);
  const openClaim = (id: string, name: string) => { setClaimEc({ id, name }); setMq(""); setMres([]); };
  const searchMembers = async (q: string) => {
    setMq(q);
    if (q.trim().length < 1) { setMres([]); return; }
    try {
      const res = await fetch(`/api/admin/company-search?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${token()}` } });
      const j = await res.json();
      if (j.success) setMres(j.data);
    } catch {}
  };
  const doClaim = async (companyId: string, companyName: string) => {
    if (!claimEc) return;
    if (!confirm(`「${claimEc.name}」의 외부 공고·지원을 회원기업 "${companyName}"으로 이관할까요?`)) return;
    setClaiming(true);
    try {
      const res = await fetch(`/api/admin/external-companies/${claimEc.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ company_id: companyId }),
      });
      const j = await res.json();
      if (j.success) { alert(`이관 완료: 공고 ${j.data.moved_jobs}건이 ${companyName}으로 넘어갔어요.`); setClaimEc(null); load(); }
      else alert(j.error?.message || "이관 실패");
    } catch { alert("오류가 발생했습니다."); }
    finally { setClaiming(false); }
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/external-jobs", { headers: { Authorization: `Bearer ${token()}` } });
      const j = await res.json();
      if (j.success) setList(j.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const [parseUrl, setParseUrl] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState("");
  const runParse = async () => {
    if (!parseUrl.trim()) { setParseMsg("URL을 입력해주세요."); return; }
    setParsing(true); setParseMsg("");
    try {
      const res = await fetch("/api/admin/external-jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ url: parseUrl.trim() }),
      });
      const j = await res.json();
      if (!j.success) { setParseMsg(j.error?.message || "불러오기에 실패했어요."); return; }
      const d = j.data;
      setForm((f) => ({
        ...f,
        company_name: d.company_name || f.company_name,
        homepage_url: d.homepage_url || f.homepage_url,
        contact_email: d.contact_email || f.contact_email,
        source_site: d.source_site || f.source_site,
        source_url: d.source_url || f.source_url,
        title: d.title || f.title,
        job_type: d.job_type || f.job_type,
        location: d.location || f.location,
        deadline: d.deadline || f.deadline,
        apply_method: d.apply_method || f.apply_method,
        external_apply_url: d.external_apply_url || f.external_apply_url,
        description: d.description || f.description,
      }));
      setParseMsg("✓ 불러왔어요. 내용을 확인하고 등록하세요.");
    } catch { setParseMsg("오류가 발생했습니다."); }
    finally { setParsing(false); }
  };
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.company_name.trim()) { alert("기업명을 입력해주세요."); return; }
    if (!form.title.trim()) { alert("공고 제목을 입력해주세요."); return; }
    if (form.apply_method === "REDIRECT" && !form.external_apply_url.trim()) { alert("링크형은 외부 지원 URL이 필요합니다."); return; }
    if (form.apply_method === "EMAIL" && !form.contact_email.trim()) { alert("이메일 중계형은 채용 이메일이 필요합니다."); return; }
    setSaving(true); setMsg("");
    try {
      const res = await fetch("/api/admin/external-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(form),
      });
      const j = await res.json();
      if (j.success) {
        setMsg("외부 공고가 등록되었습니다 ✓");
        setForm({ ...EMPTY });
        load();
        setTimeout(() => setMsg(""), 2500);
      } else {
        alert(j.error?.message || "등록에 실패했습니다.");
      }
    } catch (e) { alert("오류가 발생했습니다."); }
    finally { setSaving(false); }
  };

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" }) : "상시";

  return (
    <AdminLayout activeMenu="jobs-external">
      <div style={{ maxWidth: 1080 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>외부 공고 등록</h1>
        <p style={{ fontSize: 13.5, color: "#888", marginBottom: 20 }}>
          미가입 기업의 공고를 수집해 등록합니다. 지원방식에 따라 구직자 지원이 링크아웃 / 이메일 중계 / 관리자 대행으로 처리됩니다.
        </p>

        {/* 등록 폼 */}
        <div className="admin-card" style={{ marginBottom: 24 }}>
          <div className="admin-form-body">
            <div style={{ background: "#f6f3fb", border: "1px solid #e5e0eb", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#5f0080", marginBottom: 6 }}>URL로 불러오기 (자동 작성)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="admin-form-input" style={{ flex: 1 }} placeholder="공고 URL 붙여넣기 (https://...)" value={parseUrl} onChange={(e) => setParseUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") runParse(); }} />
                <button onClick={runParse} disabled={parsing} style={{ flexShrink: 0, padding: "0 18px", borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: parsing ? 0.6 : 1 }}>{parsing ? "불러오는 중..." : "불러오기"}</button>
              </div>
              {parseMsg && <p style={{ fontSize: 12.5, color: parseMsg.startsWith("✓") ? "#10b981" : "#c0392b", margin: "8px 0 0" }}>{parseMsg}</p>}
              <p style={{ fontSize: 12, color: "#999", margin: "6px 0 0" }}>페이지에서 항목을 발췌해 아래 폼을 자동 작성하고, 설명은 요약(큐레이션)돼요. 결과를 검토·수정한 뒤 등록하세요.</p>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#5f0080", marginBottom: 4 }}>기업 정보</div>
            <div className="admin-form-row-2col">
              <div className="admin-form-row">
                <label className="admin-form-label">기업명<span style={{ color: "#e74c3c" }}>*</span></label>
                <input className="admin-form-input" value={form.company_name} onChange={(e) => set("company_name", e.target.value)} placeholder="예) 라라헤어 살롱" />
              </div>
              <div className="admin-form-row">
                <label className="admin-form-label">홈페이지</label>
                <input className="admin-form-input" value={form.homepage_url} onChange={(e) => set("homepage_url", e.target.value)} placeholder="https://" />
              </div>
            </div>
            <div className="admin-form-row-2col">
              <div className="admin-form-row">
                <label className="admin-form-label">채용 이메일 <span style={{ color: "#aaa", fontWeight: 400 }}>(이메일 중계에 필요)</span></label>
                <input className="admin-form-input" value={form.contact_email} onChange={(e) => set("contact_email", e.target.value)} placeholder="hr@company.com" />
              </div>
              <div className="admin-form-row">
                <label className="admin-form-label">출처 사이트 / 원문 URL</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input className="admin-form-input" style={{ flex: "0 0 40%" }} value={form.source_site} onChange={(e) => set("source_site", e.target.value)} placeholder="출처명" />
                  <input className="admin-form-input" style={{ flex: 1 }} value={form.source_url} onChange={(e) => set("source_url", e.target.value)} placeholder="https://" />
                </div>
              </div>
            </div>

            <div style={{ fontWeight: 700, fontSize: 14, color: "#5f0080", margin: "10px 0 4px" }}>공고 정보</div>
            <div className="admin-form-row-2col">
              <div className="admin-form-row">
                <label className="admin-form-label">공고 제목<span style={{ color: "#e74c3c" }}>*</span></label>
                <input className="admin-form-input" value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="예) 헤어디자이너 모집" />
              </div>
              <div className="admin-form-row">
                <label className="admin-form-label">직군 유형</label>
                <select className="admin-form-select" value={form.job_type} onChange={(e) => set("job_type", e.target.value)}>
                  <option value="STORE">매장·살롱</option>
                  <option value="OFFICE">기업·브랜드</option>
                </select>
              </div>
            </div>
            <div className="admin-form-row-2col">
              <div className="admin-form-row">
                <label className="admin-form-label">지역</label>
                <input className="admin-form-input" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="예) 서울 강남" />
              </div>
              <div className="admin-form-row">
                <label className="admin-form-label">마감일</label>
                <input type="date" className="admin-form-input" value={form.deadline} onChange={(e) => set("deadline", e.target.value)} />
              </div>
            </div>
            <div className="admin-form-row-2col">
              <div className="admin-form-row">
                <label className="admin-form-label">지원방식<span style={{ color: "#e74c3c" }}>*</span></label>
                <select className="admin-form-select" value={form.apply_method} onChange={(e) => set("apply_method", e.target.value)}>
                  <option value="MANAGED">관리자 대행 (지원이 인박스로 → 관리자가 전달)</option>
                  <option value="EMAIL">이메일 중계 (기업 채용메일로 자동 전달)</option>
                  <option value="REDIRECT">외부 링크형 (기업 지원페이지로 이동)</option>
                </select>
              </div>
              <div className="admin-form-row">
                {form.apply_method === "REDIRECT" ? (
                  <>
                    <label className="admin-form-label">외부 지원 URL<span style={{ color: "#e74c3c" }}>*</span></label>
                    <input className="admin-form-input" value={form.external_apply_url} onChange={(e) => set("external_apply_url", e.target.value)} placeholder="https://기업지원페이지" />
                  </>
                ) : form.apply_method === "EMAIL" ? (
                  <>
                    <label className="admin-form-label">전달 대상</label>
                    <div style={{ fontSize: 13, color: "#0369a1", background: "#e0f2fe", borderRadius: 8, padding: "10px 12px" }}>
                      위 “채용 이메일”로 자동 전달됩니다.
                    </div>
                  </>
                ) : (
                  <>
                    <label className="admin-form-label">전달 대상</label>
                    <div style={{ fontSize: 13, color: "#5f0080", background: "#efeaf6", borderRadius: 8, padding: "10px 12px" }}>
                      지원이 “외부 지원 인박스”에 쌓이면 관리자가 전달합니다.
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="admin-form-row">
              <label className="admin-form-label">간단 설명</label>
              <textarea className="admin-form-textarea" rows={3} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="공고 요약 (원문 전체 복제 대신 요약 + 원문 링크 권장)" />
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
              <button className="admin-primary-btn" onClick={submit} disabled={saving}
                style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                {saving ? "등록 중..." : "외부 공고 등록"}
              </button>
              {msg && <span style={{ fontSize: 13, color: "#10b981", fontWeight: 600 }}>{msg}</span>}
            </div>
          </div>
        </div>

        {/* 목록 */}
        <div className="admin-card">
          <div className="company-card-head" style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0" }}>
            <h2 style={{ fontSize: 15, fontWeight: 700 }}>등록된 외부 공고 <span style={{ color: "#5f0080" }}>{list.length}</span></h2>
          </div>
          {loading ? (
            <div className="admin-empty">불러오는 중...</div>
          ) : list.length === 0 ? (
            <div className="admin-empty">등록된 외부 공고가 없습니다.</div>
          ) : (
            <table className="admin-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>기업</th>
                  <th style={{ textAlign: "left" }}>공고 제목</th>
                  <th>유형</th>
                  <th>지원방식</th>
                  <th>지원(대기)</th>
                  <th>마감</th>
                  <th>등록일</th>
                  <th>연결</th>
                </tr>
              </thead>
              <tbody>
                {list.map((j) => {
                  const m = METHOD_LABEL[j.apply_method] || { t: j.apply_method, c: "#888" };
                  return (
                    <tr key={j.id}>
                      <td style={{ fontWeight: 600 }}>
                        {j.company_name || "—"}
                        {j.claimed_company_id && <span style={{ fontSize: 11, marginLeft: 6, color: "#10b981", fontWeight: 700 }}>가입전환</span>}
                      </td>
                      <td>{j.title}</td>
                      <td style={{ textAlign: "center" }}>{j.job_type === "OFFICE" ? "기업" : "매장"}</td>
                      <td style={{ textAlign: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", background: m.c, borderRadius: 20, padding: "3px 10px" }}>{m.t}</span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {j.application_count}
                        {j.pending_count > 0 && <span style={{ color: "#e05252", fontWeight: 700 }}> ({j.pending_count})</span>}
                      </td>
                      <td style={{ textAlign: "center", color: "#888" }}>{fmt(j.deadline)}</td>
                      <td style={{ textAlign: "center", color: "#888" }}>{fmt(j.created_at)}</td>
                      <td style={{ textAlign: "center" }}>
                        {j.claimed_company_id ? (
                          <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>연결됨</span>
                        ) : j.external_company_id ? (
                          <button onClick={() => openClaim(j.external_company_id as string, j.company_name || "")}
                            style={{ fontSize: 12.5, fontWeight: 700, borderRadius: 7, padding: "5px 11px", cursor: "pointer", border: "1px solid #5f0080", background: "#fff", color: "#5f0080" }}>회원 연결</button>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
      {claimEc && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }} onClick={() => setClaimEc(null)}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 22, width: "100%", maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 4px" }}>회원 기업 연결</h3>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 14px" }}>「{claimEc.name}」의 외부 공고·지원을 아래에서 고른 회원 기업으로 이관합니다.</p>
            <input autoFocus className="admin-form-input" placeholder="기업명·사업자번호 검색" value={mq} onChange={(e) => searchMembers(e.target.value)} style={{ width: "100%", marginBottom: 10 }} />
            <div style={{ maxHeight: 300, overflowY: "auto", border: "1px solid #eee", borderRadius: 8 }}>
              {mres.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", color: "#aaa", fontSize: 13 }}>{mq.trim() ? "검색 결과가 없어요" : "기업명을 입력하세요"}</div>
              ) : mres.map((c) => (
                <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid #f4f4f4" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{c.company_name} {c.status !== "ACTIVE" && <span style={{ fontSize: 11, color: "#c0392b" }}>({c.status})</span>}</div>
                    <div style={{ fontSize: 12, color: "#999" }}>{[c.business_number, c.email].filter(Boolean).join(" · ")}</div>
                  </div>
                  <button onClick={() => doClaim(c.id, c.company_name)} disabled={claiming}
                    style={{ flexShrink: 0, fontSize: 12.5, fontWeight: 700, borderRadius: 7, padding: "6px 12px", border: "none", background: "#5f0080", color: "#fff", cursor: "pointer" }}>연결</button>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "right", marginTop: 14 }}>
              <button onClick={() => setClaimEc(null)} style={{ fontSize: 13, color: "#666", background: "none", border: "none", cursor: "pointer" }}>닫기</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
