"use client";
import { useState, useEffect, useRef } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Search, BookmarkCheck, X, FileText, Paperclip, Download, Printer } from "lucide-react";
import ResumePreview from "@/components/profile/ResumePreview";
import { formatPhone } from "@/lib/phone";

function calcAgeFromBirth(birth: string | null): number {
  if (!birth) return 0;
  const y = parseInt(String(birth).slice(0, 4));
  return new Date().getFullYear() - y;
}

function careerLabel(years: number | null, count: number): string {
  if (!count || years === null || years === 0) return "신입";
  return `경력 ${years}년`;
}

function genderLabel(gender: string | null): string | null {
  if (gender === "FEMALE" || gender === "여성" || gender === "F") return "여";
  if (gender === "MALE" || gender === "남성" || gender === "M") return "남";
  return null;
}

function shortenRegion(region: string | null | undefined): string {
  if (!region) return "—";
  return region
    .replace(/특별자치도|특별자치시|특별시|광역시/g, "")
    .replace(/\s+/g, " ")
    .trim() || region;
}

export default function ScrappedTalentPage() {
  const [talents, setTalents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const token = typeof window !== "undefined"
    ? (localStorage.getItem("access_token") || "")
    : "";

  const mapResume = (data: any) => {
    const p = data?.profile || {};
    return {
      careers: (data?.careers || []).map((c: any) => ({
        id: String(c.id), company: c.company || "", department: c.department || "",
        position: c.position || "", startDate: c.start_date || "", endDate: c.end_date || "",
        isVerified: c.is_verified || false, description: c.description || "",
      })),
      educations: (data?.educations || []).map((e: any) => ({
        id: String(e.id), school: e.school || "", major: e.major || "",
        status: e.status || "", startDate: e.start_date || "", endDate: e.end_date || "",
        description: e.description || "",
      })),
      experiences: (data?.experiences || []).map((x: any) => ({
        id: String(x.id), category: x.category || "", title: x.title || "", description: x.description || "",
      })),
      languages: (data?.languages || []).map((l: any) => ({
        id: String(l.id), language: l.language || "", level: l.level || "", test: l.test || "",
      })),
      links: (data?.links || []).map((lk: any) => ({
        id: String(lk.id), category: lk.category || "", url: lk.url || "",
      })),
      skills: p.skills || [],
      skillAreas: p.skill_areas || [],
      officeJobAreas: p.office_job_areas || [],
      certificates: p.certificates || [],
      intro: p.intro || "",
      coreCompetencies: p.core_competencies || "",
      workTypePrefer: p.work_type_prefer || "",
      regionPrefer: p.region_prefer || "",
    };
  };

  useEffect(() => {
    const fetchScrapped = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/company/talent/scrapped", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setTalents(data.data?.talents || data.talents || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchScrapped();
  }, [token]);

  useEffect(() => {
    if (!selected) { setResumeData(null); return; }
    setResumeLoading(true);
    fetch(`/api/company/talent/${selected.user_id}/resume`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setResumeData(d.data || d))
      .catch(e => console.error(e))
      .finally(() => setResumeLoading(false));
  }, [selected]);

  const handleUnscrap = async (userId: string) => {
    if (!confirm("스크랩을 해제하시겠습니까?")) return;
    try {
      await fetch(`/api/company/talent/${userId}/scrap`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setTalents(prev => prev.filter(t => t.user_id !== userId));
      if (selected?.user_id === userId) setSelected(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current || !selected) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      let y = 0;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, -y, pageW, imgH);
        y += pageH;
      }
      pdf.save(`${selected.name || "이력서"}_이력서.pdf`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!previewRef.current) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>이력서</title><style>body{margin:0;padding:20px;font-family:sans-serif;}</style></head><body>${previewRef.current.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const filtered = talents.filter(t =>
    !search || (t.name || "").includes(search) || (t.job_category || "").includes(search)
  );

  return (
    <CompanyLayout activePage="scrapped">
      <div style={{ width: "fit-content", maxWidth: "100%" }}>
        <div className="admin-search-wrap" style={{ maxWidth: 400, marginBottom: 12 }}>
          <Search size={16} className="admin-search-icon" />
          <input className="admin-search-input" placeholder="이름, 직군 검색"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div style={{ fontSize: 14, color: "#888", margin: "0 0 8px" }}>총 <strong style={{ color: "#1a1a1a" }}>{filtered.length}</strong>명</div>

        {loading ? (
          <div className="admin-empty">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="admin-empty">스크랩한 인재가 없습니다.</div>
        ) : (
          <div className="company-card">
            <table className="company-table" style={{ whiteSpace: "nowrap" }}>
              <thead>
                <tr>
                  <th>이름</th>
                  <th>직군</th>
                  <th>지역</th>
                  <th>최근경력</th>
                  <th>재직여부</th>
                  <th>연락처</th>
                  <th>이력서/포트폴리오</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const gl = genderLabel(t.gender);
                  const region = shortenRegion(t.location || t.region_prefer);
                  const email = t.email as string | null;
                  const phone = t.phone as string | null;
                  return (
                    <tr key={t.user_id} style={{ cursor: "pointer" }} onClick={() => setSelected(t)}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                          <div className="talent-avatar" style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                            {t.avatar_url
                              ? <img src={t.avatar_url} alt={t.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : (t.name || "?").slice(0, 1)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 400, fontSize: 15, color: "#1a1a1a", display: "flex", alignItems: "center", gap: 4 }}>
                              <span>{t.name}</span>
                              {gl && <span style={{ fontSize: 12, fontWeight: 400, color: "#999" }}>{gl}</span>}
                            </div>
                            <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>
                              {[t.age ? `${t.age}세` : null, careerLabel(t.career_years, t.career_count)].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="company-td-sub">{t.job_category || "—"}</td>
                      <td className="company-td-sub">{region}</td>
                      <td className="company-td-sub">
                        {t.careerDetail ? (
                          <>
                            <div style={{ maxWidth: 160, margin: "0 auto", overflow: "hidden", textOverflow: "ellipsis" }} title={t.careerDetail.company}>{t.careerDetail.company}</div>
                            {t.careerDetail.position && (
                              <div style={{ maxWidth: 160, margin: "2px auto 0", overflow: "hidden", textOverflow: "ellipsis", color: "#aaa" }} title={t.careerDetail.position}>{t.careerDetail.position}</div>
                            )}
                          </>
                        ) : <span style={{ color: "#ccc" }}>—</span>}
                      </td>
                      <td className="company-td-sub">
                        {t.careerDetail ? (
                          t.careerDetail.end_date ? (
                            <>
                              <div style={{ color: "#888" }}>퇴직</div>
                              <div style={{ color: "#aaa", marginTop: 2 }}>{String(t.careerDetail.end_date).slice(0, 7).replace(/-/g, ".")}</div>
                            </>
                          ) : (
                            <span style={{ color: "#5f0080" }}>재직중</span>
                          )
                        ) : <span style={{ color: "#ccc" }}>—</span>}
                      </td>
                      <td className="company-td-sub">
                        <div style={{ marginBottom: 2, ...(email ? {} : { color: "#ccc" }) }}>{email || "이메일 없음"}</div>
                        <div style={phone ? undefined : { color: "#ccc" }}>{phone ? formatPhone(phone) : "전화번호 없음"}</div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "#5f0080", fontSize: 14, fontWeight: 500, padding: "2px 4px" }}
                              onClick={(e) => { e.stopPropagation(); setSelected(t); }}>
                              <FileText size={14} /><span>이력서</span>
                            </button>
                            <button className="talent-scrap-btn scrapped" style={{ padding: "6px 8px" }}
                              onClick={(e) => { e.stopPropagation(); handleUnscrap(t.user_id); }}>
                              <BookmarkCheck size={16} />
                            </button>
                          </div>
                          {t.portfolio_url ? (
                            <a href={t.portfolio_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                              style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#5f0080", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
                              <Paperclip size={13} /><span>포트폴리오</span>
                            </a>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, color: "#d0d0d0", fontSize: 13 }}>
                              <Paperclip size={13} /><span>포트폴리오</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 이력서 모달 */}
      {selected && (
        <div className="rp-modal-overlay">
          <div className="rp-modal" onClick={e => e.stopPropagation()}>
            <div className="rp-modal-header">
              <div className="rp-modal-actions">
                <button className="resume-action-btn" onClick={handleDownloadPdf} disabled={isDownloading || resumeLoading}>
                  <Download size={15} /><span>{isDownloading ? "저장 중..." : "PDF 저장"}</span>
                </button>
                <button className="resume-action-btn" onClick={handlePrint}>
                  <Printer size={15} /><span>인쇄</span>
                </button>
                <button className="resume-action-btn danger" onClick={() => handleUnscrap(selected.user_id)}>
                  스크랩 해제
                </button>
              </div>
              <button className="rp-modal-close" onClick={() => setSelected(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="rp-modal-body">
              {resumeLoading ? (
                <div className="admin-empty">이력서 불러오는 중...</div>
              ) : resumeData ? (
                <ResumePreview
                  ref={previewRef}
                  name={resumeData.user?.name || selected.name}
                  birthDisplay={
                    resumeData.user?.birth_date
                      ? `${String(resumeData.user.birth_date).slice(0, 4)}년 (${calcAgeFromBirth(resumeData.user.birth_date)}세, ${resumeData.user.gender === "FEMALE" ? "여" : resumeData.user.gender === "MALE" ? "남" : ""})`
                      : ""
                  }
                  jobDisplay={resumeData.user?.job_type === "STORE" ? "매장직" : "사무직"}
                  phone={resumeData.user?.phone || ""}
                  email={resumeData.user?.email || ""}
                  portfolioUrl={resumeData.user?.portfolio_url || null}
                  portfolioFilename={resumeData.user?.portfolio_filename || null}
                  avatarUrl={resumeData.user?.avatar_url || null}
                  resumeType={resumeData.user?.job_type === "STORE" ? "salon" : "office"}
                  {...mapResume(resumeData)}
                />
              ) : (
                <div className="admin-empty">이력서 데이터를 불러올 수 없습니다.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}