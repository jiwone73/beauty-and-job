"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import TalentCard from "@/components/company/TalentCard";
import { mapResume, calcAgeFromBirth } from "@/lib/resumeView";
import { Search, X, Download, Printer } from "lucide-react";
import ResumePreview from "@/components/profile/ResumePreview";
import { companyTalentApi, type TalentItem } from "@/lib/api/company";

// 스크랩 인재. 나중에 제안하려고 담아 둔 사람들이라, 보는 눈은 인재 검색과 같다 —
// 카드도 인재 검색과 같은 것을 쓴다. 표였을 때는 이름 가리기도 제안 이력도 빠져
// 있어서, 같은 사람이 두 화면에서 다르게 보였다.

export default function ScrappedTalentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const base = pathname.split("/").filter(Boolean)[0] === "company"
    ? "/company/dashboard"
    : `/${pathname.split("/").filter(Boolean)[0]}`;

  const [talents, setTalents] = useState<TalentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TalentItem | null>(null);
  const [resumeData, setResumeData] = useState<any>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const token = typeof window !== "undefined"
    ? (localStorage.getItem("access_token") || "")
    : "";

  // 인재 검색과 같은 API 를 쓴다(scrapped=1). 목록이 두 벌이면 곧 어긋난다.
  const 불러오기 = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await companyTalentApi.list({ scrapped: true, limit: 200 });
      if (res?.success) {
        setTalents(res.data || []);
      }
    } catch (e) {
      console.error("[scrapped]", e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { 불러오기(); }, [불러오기]);

  useEffect(() => {
    if (!selected) { setResumeData(null); return; }
    setResumeLoading(true);
    fetch(`/api/company/talent/${selected.id}/resume`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setResumeData(d.data || d))
      .catch(e => console.error(e))
      .finally(() => setResumeLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // 여기서 스크랩을 풀면 그 줄은 목록에서 빠진다 — 스크랩한 사람만 모은 자리다.
  const 스크랩풀기 = async (t: TalentItem) => {
    try {
      await companyTalentApi.unscrap(t.id);
      setTalents(prev => prev.filter(x => x.id !== t.id));
      if (selected?.id === t.id) setSelected(null);
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
    !search
    || (t.name || "").includes(search)
    || (t.mainJobGroup || "").includes(search)
    || (t.subJob || "").includes(search)
  );

  return (
    <CompanyLayout activePage="scrapped">
      <div style={{ width: "100%" }}>
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
          <div className="tal-list">
            {filtered.map((t) => (
              <TalentCard key={t.id} t={t} base={base}
                onOpenResume={setSelected}
                onToggleScrap={스크랩풀기}
                onPropose={(x) => router.push(`${base}/talent?propose=${x.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* 이력서 모달 */}
      {selected && (
        <div className="rp-modal-overlay" onClick={() => setSelected(null)}>
          <div className="rp-modal" onClick={e => e.stopPropagation()}>
            <div className="rp-modal-header">
              <h2 style={{ fontSize: 18, color: "#1a1a1a", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selected.name}</h2>
              <div className="rp-modal-actions">
                <button onClick={handleDownloadPdf} disabled={isDownloading || resumeLoading} title="PDF 다운로드"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, borderRadius: 8, border: "none", background: "none", color: "#582681", cursor: (isDownloading || resumeLoading) ? "not-allowed" : "pointer", opacity: (isDownloading || resumeLoading) ? 0.5 : 1 }}>
                  <Download size={20} />
                </button>
                <button onClick={handlePrint} title="인쇄"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 6, borderRadius: 8, border: "none", background: "none", color: "#582681", cursor: "pointer" }}>
                  <Printer size={20} />
                </button>
                <button onClick={() => setSelected(null)} title="닫기"
                  style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 4, borderRadius: 6, border: "none", background: "none", color: "#888", cursor: "pointer" }}>
                  <X size={20} />
                </button>
              </div>
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
                  jobDisplay={resumeData.user?.job_type === "STORE" ? "매장" : "본사"}
                  phone={resumeData.user?.phone || ""}
                  email={resumeData.user?.email || ""}
                  portfolioImages={resumeData.user?.portfolio_images || []}
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
