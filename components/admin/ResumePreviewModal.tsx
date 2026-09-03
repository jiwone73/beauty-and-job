"use client";
import { useState, useEffect, useRef } from "react";
import { Download, X, Printer } from "lucide-react";
import ApplicationDocument from "@/components/resume/ApplicationDocument";
import { downloadApplicationPdf, printApplication } from "@/lib/applicationPdf";
import { mapResume } from "@/lib/resumeView";


export default function ResumePreviewModal({
  resumeId,
  jobCategory,
  coverLetter,
  snapshot,
  onClose,
}: {
  resumeId: string;
  jobCategory?: string | null;
  coverLetter?: string | null;
  snapshot?: any | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 지원 시점 스냅샷이 있으면 그대로 렌더 (박제된 이력서)
    if (snapshot) {
      setData(snapshot);
      setLoading(false);
      return;
    }
    if (!resumeId) { setLoading(false); return; }
    const token = localStorage.getItem("admin_token");
    setLoading(true);
    fetch(`/api/admin/resumes/${resumeId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => { if (res.success) setData(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [resumeId, snapshot]);

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    try {
      const nm = data?.resume?.name;
      await downloadApplicationPdf(previewRef.current, nm ? `${nm}_이력서.pdf` : "이력서.pdf");
    } catch (e) {
      alert("다운로드 중 오류가 발생했습니다.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (!previewRef.current) return;
    try {
      await printApplication(previewRef.current);
    } catch (e) {
      alert("인쇄 준비 중 오류가 발생했습니다.");
    }
  };

  const r = data?.resume;
  const birthDisplay = r?.birth_date
    ? `${String(r.birth_date).slice(0, 4)}년 (${new Date().getFullYear() - Number(String(r.birth_date).slice(0, 4))}세, ${r.gender === "FEMALE" ? "여" : r.gender === "MALE" ? "남" : ""})`
    : "";

  return (
    <div className="rp-modal-overlay">
      <div className="rp-modal myapp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rp-modal-header">
          <h2 className="rp-modal-title">제출된 입사지원서</h2>
          <div className="rp-modal-actions">
            <button className="resume-action-btn" onClick={handleDownloadPdf} disabled={isDownloading || loading}>
              <Download size={16} />
              <span>{isDownloading ? "저장 중..." : "PDF 다운로드"}</span>
            </button>
            <button className="resume-action-btn" onClick={handlePrint}>
              <Printer size={16} />
              <span>인쇄</span>
            </button>
            <button className="rp-modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="rp-modal-body">
          {loading ? (
            <div style={{ padding: "60px", textAlign: "center", color: "#888" }}>불러오는 중...</div>
          ) : data ? (
            <ApplicationDocument
                제출본
              ref={previewRef}
              coverLetter={coverLetter}
              resume={{
                name: r?.name || "",
                birthDisplay,
                jobDisplay: jobCategory || "",
                phone: r?.phone || "",
                email: r?.email || "",
                portfolioImages: r?.portfolio_images || [],
                avatarUrl: r?.avatar_url || null,
                resumeType: r?.job_type === "STORE" ? "salon" : "office",
                ...mapResume(data),
              }}
            />
          ) : (
            <div style={{ padding: "60px", textAlign: "center", color: "#888" }}>이력서 정보가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}