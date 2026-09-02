"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { X, Download, Printer, FileText } from "lucide-react";
import ApplicationDocument from "@/components/resume/ApplicationDocument";
import { mapResume } from "@/lib/resumeView";
import { companyApplicationsApi } from "@/lib/api/company";
import type { ApplicationStatus } from "@/lib/types/company";

// 지원서. 공고 카드 안에서 지원자를 누르면 이 창이 뜬다 — 화면을 옮기면 어느
// 공고를 보고 있었는지 잃고, 판 폭에 맞춰 이력서가 필요 이상으로 벌어진다.

// 진행 단계 셋. 미열람은 지원서를 열면 저절로 넘어가니 고를 것이 아니고,
// 불합격은 매장이 따로 통보하는 문화가 아니라 두지 않는다.
const 상태들: [ApplicationStatus, string][] = [
  ["VIEWED", "열람"], ["INTERVIEW", "면접"], ["PASSED", "최종합격"],
];

const 나이 = (birth: string | null) => {
  if (!birth) return null;
  const y = new Date(birth).getFullYear();
  return y ? new Date().getFullYear() - y : null;
};
const 성별 = (g: string | null) =>
  g === "FEMALE" || g === "여성" ? "여" : g === "MALE" || g === "남성" ? "남" : "";

export default function ApplicationModal({
  applicationId, onClose, onStatus,
}: {
  applicationId: string;
  onClose: () => void;
  /** 창에서 상태를 바꾸면 뒤의 목록도 같이 바뀌어야 한다. */
  onStatus?: (id: string, s: ApplicationStatus) => void;
}) {
  const [자료, set자료] = useState<any>(null);
  const [로딩, set로딩] = useState(true);
  const [상태, set상태] = useState<ApplicationStatus | null>(null);
  const [내려받는중, set내려받는중] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const 불러오기 = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const r = await fetch(`/api/company/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((x) => x.json()).catch(() => null);
    if (r?.success && r.data) {
      set자료(r.data);
      set상태(r.data.status);
      // 지원서를 열면 미열람 → 열람.
      if (r.data.status === "APPLIED") {
        companyApplicationsApi.updateStatus(applicationId, "VIEWED").catch(() => {});
        set상태("VIEWED");
        onStatus?.(applicationId, "VIEWED");
      }
    }
    set로딩(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);
  useEffect(() => { 불러오기(); }, [불러오기]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const 상태바꾸기 = async (s: ApplicationStatus) => {
    const 이전 = 상태;
    set상태(s);
    onStatus?.(applicationId, s);
    try {
      await companyApplicationsApi.updateStatus(applicationId, s);
    } catch {
      set상태(이전);
      if (이전) onStatus?.(applicationId, 이전);
      alert("상태를 바꾸지 못했어요.");
    }
  };

  const 이름 = 자료?.user_name || "";

  const PDF받기 = async () => {
    if (!previewRef.current) return;
    set내려받는중(true);
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
      pdf.save(`${이름 || "지원서"}_지원서.pdf`);
    } finally {
      set내려받는중(false);
    }
  };

  const 인쇄 = () => {
    if (!previewRef.current) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>지원서</title><style>body{margin:0;padding:20px;font-family:sans-serif;}</style></head><body>${previewRef.current.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const 주소 = [자료?.user_address_road, 자료?.user_address_detail].filter(Boolean).join(" ")
    || [자료?.user_region_sido, 자료?.user_region_sigungu].filter(Boolean).join(" ");

  return (
    <div className="rp-modal-overlay" onClick={onClose}>
      <div className="rp-modal resume-modal-flat" style={{ maxWidth: 720, maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="rp-modal-header">
          <h2 style={{ fontSize: 18, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{이름}</h2>
          <div className="rp-modal-actions">
            {/* 지원서를 읽고 나면 바로 다음 단계를 정한다. */}
            <select className="jp-cond-sel" value={상태 || ""} style={{ fontSize: 13, padding: "5px 8px" }}
              onChange={(e) => 상태바꾸기(e.target.value as ApplicationStatus)}>
              {상태들.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <button onClick={PDF받기} disabled={내려받는중 || 로딩} title="PDF 다운로드"
              style={{ display: "inline-flex", padding: 6, border: "none", background: "none", color: "#582681", cursor: "pointer" }}>
              <Download size={20} />
            </button>
            <button onClick={인쇄} disabled={로딩} title="인쇄"
              style={{ display: "inline-flex", padding: 6, border: "none", background: "none", color: "#582681", cursor: "pointer" }}>
              <Printer size={20} />
            </button>
            <button onClick={onClose} title="닫기"
              style={{ display: "inline-flex", padding: 4, border: "none", background: "none", color: "#888", cursor: "pointer" }}>
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="rp-modal-body">
          {로딩 ? (
            <div className="admin-empty">지원서 불러오는 중...</div>
          ) : !자료 ? (
            <div className="admin-empty">지원서를 불러오지 못했어요.</div>
          ) : (
            <>
              <ApplicationDocument
                ref={previewRef}
                coverLetter={자료.cover_letter}
                subtitle={자료.job_title}
                resume={{
                  name: 이름,
                  birthDisplay: 자료.user_birth_date ? `${new Date(자료.user_birth_date).getFullYear()}년생` : "",
                  ageDisplay: 나이(자료.user_birth_date) != null ? `${나이(자료.user_birth_date)}세` : "",
                  genderDisplay: 성별(자료.user_gender),
                  addressDisplay: 주소,
                  jobDisplay: 자료.user_job_type === "STORE" ? "매장" : "본사",
                  phone: 자료.user_phone || "",
                  email: 자료.user_email || "",
                  portfolioImages: 자료.portfolio_images || [],
                  avatarUrl: 자료.user_avatar_url || null,
                  resumeType: 자료.user_job_type === "STORE" ? "salon" : "office",
                  ...mapResume(자료.resume),
                }}
              />
              {자료.resume_file_preview_url && (
                <div style={{ margin: "20px 40px 0", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#f7f7f8", border: "1.5px solid #efeff1", borderRadius: 10 }}>
                  <FileText size={22} color="#582681" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {자료.resume_file_name || "첨부 이력서"}
                    </p>
                    <p style={{ fontSize: 13, color: "#888", margin: "2px 0 0" }}>지원자가 첨부한 이력서 파일</p>
                  </div>
                  <a href={자료.resume_file_preview_url} target="_blank" rel="noopener noreferrer"
                    style={{ padding: "8px 14px", borderRadius: 8, background: "#582681", color: "#fff", fontSize: 14, textDecoration: "none", whiteSpace: "nowrap" }}>
                    다운로드
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
