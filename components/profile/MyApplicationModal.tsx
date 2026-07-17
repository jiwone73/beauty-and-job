"use client";
import { useState, useEffect, useRef } from "react";
import { X, Download, Printer } from "lucide-react";
import { genderLabel } from "@/lib/memberFormat";
import ApplicationDocument from "@/components/resume/ApplicationDocument";
import { downloadApplicationPdf, printApplication } from "@/lib/applicationPdf";

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

export default function MyApplicationModal({
  applicationId,
  onClose,
}: {
  applicationId: string;
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    if (!captureRef.current) return;
    setIsDownloading(true);
    try {
      const nm = data?.user_name;
      await downloadApplicationPdf(captureRef.current, nm ? `${nm}_이력서.pdf` : "이력서.pdf");
    } catch {
      alert("다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!captureRef.current) return;
    try {
      await printApplication(captureRef.current);
    } catch {
      alert("인쇄 준비 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/users/me/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => { if (res.success) setData(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [applicationId]);

  const r = data;
  const birthDisplay = r?.birth_date
    ? `${String(r.birth_date).slice(0, 4)}년 (${new Date().getFullYear() - Number(String(r.birth_date).slice(0, 4))}세${genderLabel(r.gender) ? ", " + genderLabel(r.gender) : ""})`
    : "";

  return (
    <div className="rp-modal-overlay">
      <div className="rp-modal myapp-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720, width: "94%", maxHeight: "92vh", display: "flex", flexDirection: "column" }}>
        <div className="rp-modal-header" style={{ flexShrink: 0 }}>
          <h2 className="rp-modal-title">제출한 입사지원서</h2>
          <div className="rp-modal-actions">
            <button className="resume-action-btn" onClick={handleDownloadPdf} disabled={isDownloading || loading}>
              <Download size={16} />
              <span>{isDownloading ? "저장 중..." : "PDF 다운로드"}</span>
            </button>
            <button className="resume-action-btn" onClick={handlePrint}>
              <Printer size={16} />
              <span>인쇄</span>
            </button>
            <button className="rp-modal-close" onClick={onClose}><X size={20} /></button>
          </div>
        </div>
        <div className="rp-modal-body" style={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#888" }}>불러오는 중...</div>
          ) : data ? (
            <ApplicationDocument
              ref={captureRef}
              coverLetter={data.cover_letter}
              subtitle={`${data.company_name} · ${data.job_title}`}
              resume={{
                name: data.user_name || "",
                birthDisplay,
                addressDisplay:
                  [data.address_road, data.address_detail].filter(Boolean).join(" ") ||
                  [data.region_sido, data.region_sigungu].filter(Boolean).join(" "),
                jobDisplay: data.user_job_type === "STORE" ? "매장직" : "사무직",
                phone: data.user_phone || "",
                email: data.user_email || "",
                portfolioUrl: data.portfolio_url || null,
                portfolioFilename: data.portfolio_filename || null,
                avatarUrl: data.user_avatar_url || null,
                resumeType: data.user_job_type === "STORE" ? "salon" : "office",
                ...mapResume(data.resume),
              }}
            />
          ) : (
            <div style={{ padding: "60px", textAlign: "center", color: "#888" }}>지원서를 불러올 수 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}
