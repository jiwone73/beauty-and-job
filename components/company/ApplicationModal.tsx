"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { X, Download, Printer } from "lucide-react";
import ApplicationDocument from "@/components/resume/ApplicationDocument";
import { mapResume } from "@/lib/resumeView";
import { companyApplicationsApi } from "@/lib/api/company";
import type { ApplicationStatus } from "@/lib/types/company";
import { calcAge as 나이 } from "@/lib/memberFormat";

// 지원서. 공고 카드 안에서 지원자를 누르면 이 창이 뜬다 — 화면을 옮기면 어느
// 공고를 보고 있었는지 잃고, 판 폭에 맞춰 이력서가 필요 이상으로 벌어진다.
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
  const [실패, set실패] = useState<string | null>(null);
  const [내려받는중, set내려받는중] = useState(false);
  const [처리중, set처리중] = useState(false);
  const [확인대상, set확인대상] = useState<"PASSED" | "REJECTED" | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const 불러오기 = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const r = await fetch(`/api/company/applications/${applicationId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((x) => x.json()).catch(() => null);
    if (r?.success && r.data) {
      set자료(r.data);
      // 지원서를 열면 미열람 → 열람은 자동. 그 뒤 합격·불합격은 매장이 직접
      // 눌러야 한다 — 여기서 합격을 누르면 채팅이 열린다(제안 수락과 같은 자리).
      if (r.data.status === "APPLIED") {
        companyApplicationsApi.updateStatus(applicationId, "VIEWED").catch(() => {});
        onStatus?.(applicationId, "VIEWED");
        set자료((prev: any) => prev && { ...prev, status: "VIEWED" });
      }
    } else {
      // 지원일 50일 경과·취소·거절이면 이력서를 더 열 수 없다 — 그 이유를
      // 그대로 보여준다("지원서를 불러오지 못했어요"보다 구체적이어야 한다).
      set실패(r?.error?.message || "지원서를 불러오지 못했어요.");
    }
    set로딩(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);
  useEffect(() => { 불러오기(); }, [불러오기]);

  const 상태바꾸기 = async (s: "PASSED" | "REJECTED") => {
    if (처리중) return;
    set처리중(true);
    try {
      // api-client 는 실패를 던진다 — 여기까지 왔으면 된 것이다.
      await companyApplicationsApi.updateStatus(applicationId, s);
      set자료((prev: any) => prev && { ...prev, status: s });
      onStatus?.(applicationId, s);
    } catch (e: any) {
      alert(e?.message || "처리 중 오류가 발생했습니다.");
    } finally {
      set처리중(false);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    // 바깥을 눌러도 닫히지 않는다 — 이력서를 읽다가 스치는 클릭 한 번에 창이
    // 사라지면 처음부터 다시 찾아 열어야 한다. 닫는 길은 오른쪽 위 단추와 Esc.
    <div className="rp-modal-overlay">
      <div className="rp-modal resume-modal-flat app-co-modal" style={{ maxWidth: 720, maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
        <div className="rp-modal-header app-hd">
          {/* 합격·불합격은 이름 옆 머리줄에 둔다("합격 불합격을 헤더에 넣어줘 이름옆에"). 체크박스로 고르고,
              누르면 먼저 확인 팝업이 뜬다 — 알림이 나가면 되돌릴 길이 없어서다. */}
          {/* 제목은 개인회원 이력서 미리보기와 같은 모양(.rp-modal-title: 17px 굵게) — "개인회원 이력서 제목처럼". */}
          <h2 className="rp-modal-title" style={{ margin: 0, whiteSpace: "nowrap" }}>이력서</h2>
            {자료 && (
              <div className="app-hd-checks" style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0, marginRight: "auto", marginLeft: 14 }}>
                {([["PASSED", "합격"], ["REJECTED", "불합격"]] as const).map(([값, 글]) => (
                    <label key={값} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, color: "#555", cursor: 처리중 ? "default" : "pointer", whiteSpace: "nowrap" }}>
                      <input type="checkbox" value={값} checked={자료.status === 값} disabled={처리중}
                        onChange={() => { if (자료.status !== 값) set확인대상(값); }}
                        style={{ accentColor: "#582681", width: 16, height: 16, margin: 0 }} />
                      {글}
                    </label>
                ))}
              </div>
            )}
          <div className="rp-modal-actions">
            <button onClick={PDF받기} disabled={내려받는중 || 로딩} title="PDF 다운로드"
              style={{ display: "inline-flex", padding: 6, border: "none", background: "none", color: "#582681", cursor: "pointer" }}>
              <Download size={20} />
            </button>
            <button onClick={인쇄} disabled={로딩} title="인쇄"
              style={{ display: "inline-flex", padding: 6, border: "none", background: "none", color: "#582681", cursor: "pointer" }}>
              <Printer size={20} />
            </button>
            <button onClick={onClose} title="닫기"
              style={{ display: "inline-flex", padding: 4, border: "none", background: "none", color: "#555", cursor: "pointer" }}>
              <X size={20} />
            </button>
          </div>
        </div>
        {/* 체크하면 먼저 묻는다 — 알림이 나가면 되돌릴 길이 없다("체크를 하면 메시지 팝업을 띄어줘"). */}
        {확인대상 && (
          <div onClick={() => set확인대상(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
              style={{ background: "#fff", borderRadius: 12, padding: "20px 18px 14px", width: "100%", maxWidth: 300, boxShadow: "0 8px 30px rgba(0,0,0,0.18)" }}>
              <p style={{ margin: 0, fontSize: 15, color: "#555", fontWeight: 700 }}>
                {확인대상 === "PASSED" ? "합격" : "불합격"} 처리하시겠어요?
              </p>
              <p style={{ margin: "6px 0 16px", fontSize: 13, color: "#9a9aa3" }}>지원자에게 알림이 갑니다</p>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" onClick={() => set확인대상(null)}
                  style={{ padding: "7px 14px", fontSize: 14, borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#555", cursor: "pointer" }}>
                  취소
                </button>
                <button type="button" disabled={처리중}
                  onClick={async () => { const 대상 = 확인대상; set확인대상(null); await 상태바꾸기(대상); }}
                  style={{ padding: "7px 14px", fontSize: 14, borderRadius: 8, border: "none", background: "#582681", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                  확인
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="rp-modal-body">
          {로딩 ? (
            <div className="admin-empty">지원서 불러오는 중...</div>
          ) : !자료 ? (
            <div className="admin-empty">{실패 || "지원서를 불러오지 못했어요."}</div>
          ) : (
            <>
              <ApplicationDocument
                제출본
                ref={previewRef}
                coverLetter={자료.cover_letter}
                subtitle={자료.job_title}
                지원분야={자료.position_title || ""}
                resume={{
                  name: 이름,
                  birthDisplay: 자료.user_birth_date ? `${new Date(자료.user_birth_date).getFullYear()}년생` : "",
                  ageDisplay: 나이(자료.user_birth_date) != null ? `${나이(자료.user_birth_date)}세` : "",
                  genderDisplay: 성별(자료.user_gender),
                  addressDisplay: 주소,
                  jobDisplay: 자료.user_job_type === "STORE" ? "매장" : "오피스",
                  phone: 자료.user_phone || "",
                  email: 자료.user_email || "",
                  portfolioImages: 자료.portfolio_images || [],
                  avatarUrl: 자료.user_avatar_url || null,
                  resumeType: 자료.user_job_type === "STORE" ? "salon" : "office",
                  ...mapResume(자료.resume),
                }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
