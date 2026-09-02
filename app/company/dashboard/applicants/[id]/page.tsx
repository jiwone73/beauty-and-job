"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import ApplicationDocument from "@/components/resume/ApplicationDocument";
import { mapResume } from "@/lib/resumeView";
import { companyApplicationsApi } from "@/lib/api/company";
import type { ApplicationStatus } from "@/lib/types/company";
import { ArrowLeft, Download, Printer, FileText } from "lucide-react";

// 지원서. 모달이 아니라 페이지다 — 이력서와 같은 이유로, 한 사람을 앉아서 읽는
// 자리는 제 주소를 가져야 한다(뒤로가기가 목록으로 가고, 링크로 건넬 수 있고,
// 두 사람을 새 탭으로 나란히 볼 수 있다).

const 나이 = (birth: string | null) => {
  if (!birth) return null;
  const y = new Date(birth).getFullYear();
  return y ? new Date().getFullYear() - y : null;
};
const 성별 = (g: string | null) =>
  g === "FEMALE" || g === "여성" ? "여" : g === "MALE" || g === "남성" ? "남" : "";

export default function ApplicationPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const base = pathname.split("/").filter(Boolean)[0] === "company"
    ? "/company/dashboard"
    : `/${pathname.split("/").filter(Boolean)[0]}`;

  const [자료, set자료] = useState<any>(null);
  const [로딩, set로딩] = useState(true);
  const [내려받는중, set내려받는중] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const 불러오기 = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const r = await fetch(`/api/company/applications/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((x) => x.json()).catch(() => null);
    if (r?.success && r.data) {
      set자료(r.data);
      // 지원서를 열면 미열람 → 열람. 손으로 바꾸는 상태는 두지 않는다.
      if (r.data.status === "APPLIED") {
        companyApplicationsApi.updateStatus(params.id, "VIEWED").catch(() => {});
      }
    }
    set로딩(false);
  }, [params.id]);
  useEffect(() => { 불러오기(); }, [불러오기]);


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
      pdf.save(`${자료?.user_name || "지원서"}_지원서.pdf`);
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

  const 이름 = 자료?.user_name || "";
  const 주소 = [자료?.user_address_road, 자료?.user_address_detail].filter(Boolean).join(" ")
    || [자료?.user_region_sido, 자료?.user_region_sigungu].filter(Boolean).join(" ");

  return (
    <CompanyLayout activePage="applicants" title={이름 ? `${이름} 님의 지원서` : "지원서"}>
      <div style={{ width: "100%" }}>
        <div className="tres-bar">
          <button type="button" className="tres-back" onClick={() => router.back()}>
            <ArrowLeft size={15} /> 목록으로
          </button>
          <div className="tres-acts">
            <button type="button" className="tal-btn" onClick={PDF받기} disabled={내려받는중 || 로딩}>
              <Download size={14} /> PDF
            </button>
            <button type="button" className="tal-btn" onClick={인쇄} disabled={로딩}>
              <Printer size={14} /> 인쇄
            </button>
          </div>
        </div>

        {로딩 ? (
          <div className="admin-empty">지원서 불러오는 중...</div>
        ) : !자료 ? (
          <div className="admin-empty">지원서를 불러오지 못했어요.</div>
        ) : (
          <div className="tres-sheet">
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
          </div>
        )}
      </div>
    </CompanyLayout>
  );
}
