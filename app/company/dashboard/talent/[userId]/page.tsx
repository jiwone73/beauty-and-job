"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import ResumePreview from "@/components/profile/ResumePreview";
import { mapResume, calcAgeFromBirth } from "@/lib/resumeView";
import { companyTalentApi } from "@/lib/api/company";
import { ArrowLeft, Bookmark, BookmarkCheck, Download, Printer } from "lucide-react";

// 인재 이력서. 모달이 아니라 페이지다.
//
// 모달로 띄우면 뒤로가기가 목록이 아니라 화면 밖으로 나가고, 주소가 없어 다른
// 사람에게 「이 사람 보세요」라고 보낼 수도, 새 탭으로 두 사람을 나란히 볼 수도
// 없다. 이력서는 한 사람을 앉아서 읽는 자리라 제 주소를 갖는 게 맞다.

export default function TalentResumePage({ params }: { params: { userId: string } }) {
  const router = useRouter();
  const pathname = usePathname();
  const base = pathname.split("/").filter(Boolean)[0] === "company"
    ? "/company/dashboard"
    : `/${pathname.split("/").filter(Boolean)[0]}`;

  const [자료, set자료] = useState<any>(null);
  const [로딩, set로딩] = useState(true);
  const [스크랩, set스크랩] = useState(false);
  const [내려받는중, set내려받는중] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const 불러오기 = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const r = await fetch(`/api/company/talent/${params.userId}/resume`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((x) => x.json()).catch(() => null);
    if (r?.success && r.data) {
      set자료(r.data);
      set스크랩(!!r.data.scrapped);
    }
    set로딩(false);
  }, [params.userId]);
  useEffect(() => { 불러오기(); }, [불러오기]);

  const 스크랩토글 = async () => {
    const 다음 = !스크랩;
    set스크랩(다음);
    try {
      if (다음) await companyTalentApi.scrap(params.userId);
      else await companyTalentApi.unscrap(params.userId);
    } catch {
      set스크랩(!다음);
    }
  };

  const 이름 = 자료?.user?.name || "";

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
      pdf.save(`${이름 || "이력서"}_이력서.pdf`);
    } finally {
      set내려받는중(false);
    }
  };

  const 인쇄 = () => {
    if (!previewRef.current) return;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>이력서</title><style>body{margin:0;padding:20px;font-family:sans-serif;}</style></head><body>${previewRef.current.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  const u = 자료?.user;

  return (
    <CompanyLayout activePage="talent" title={이름 ? `${이름} 님의 이력서` : "이력서"}>
      <div style={{ width: "100%" }}>
        <div className="tres-bar">
          <button type="button" className="tres-back" onClick={() => router.back()}>
            <ArrowLeft size={15} /> 목록으로
          </button>
          <div className="tres-acts">
            <button type="button" className="tal-btn" onClick={스크랩토글}>
              {스크랩
                ? <><BookmarkCheck size={14} style={{ color: "#582681" }} /> 스크랩됨</>
                : <><Bookmark size={14} /> 스크랩</>}
            </button>
            <button type="button" className="tal-btn" onClick={PDF받기} disabled={내려받는중 || 로딩}>
              <Download size={14} /> PDF
            </button>
            <button type="button" className="tal-btn" onClick={인쇄} disabled={로딩}>
              <Printer size={14} /> 인쇄
            </button>
            {/* 제안 창은 인재 검색이 갖고 있다 — 여기서 한 벌 더 만들지 않고 그리로 보낸다. */}
            {자료?.proposedAt ? (
              <span className="tal-sent">제안완료</span>
            ) : (
              <button type="button" className="tal-btn key"
                onClick={() => router.push(`${base}/talent?propose=${params.userId}`)}>
                제안하기
              </button>
            )}
          </div>
        </div>

        {로딩 ? (
          <div className="admin-empty">이력서 불러오는 중...</div>
        ) : !자료 ? (
          <div className="admin-empty">이력서를 불러오지 못했어요.</div>
        ) : (
          <div className="tres-sheet">
            <ResumePreview
              기업이봄
              ref={previewRef}
              name={이름}
              birthDisplay={
                u?.birth_date
                  ? `${String(u.birth_date).slice(0, 4)}년 (${calcAgeFromBirth(u.birth_date)}세, ${u.gender === "FEMALE" ? "여" : u.gender === "MALE" ? "남" : ""})`
                  : ""
              }
              jobDisplay={u?.job_type === "STORE" ? "매장" : "본사"}
              phone={u?.phone || ""}
              email={u?.email || ""}
              portfolioImages={u?.portfolio_images || []}
              avatarUrl={u?.avatar_url || null}
              resumeType={u?.job_type === "STORE" ? "salon" : "office"}
              {...mapResume(자료)}
            />
          </div>
        )}
      </div>
    </CompanyLayout>
  );
}
