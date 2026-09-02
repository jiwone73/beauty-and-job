"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { 이력서진행 } from "@/lib/resumeProgress";

// 지원 버튼 아래 세 줄. 「제출까지 뭘 거치나」를 그림으로 알리는 자리이자,
// 첫 칸이 내 이력서가 지금 어떤 상태인지 말한다 — 아무 일도 안 일어난 화면에
// 단계만 그려 두면 장식이지만, 내 상태가 붙으면 누르기 전에 할 일이 보인다.

type 상태 = { 준비: boolean; 비율: number } | null;

/** 로그인 여부는 토큰으로 판단한다. 로그인 상태를 담아 둔 store 는 토큰이
 *  만료돼도 그대로 남아 있어, 「준비됨」이라 적어 놓고 값은 못 가져오는 일이
 *  생긴다. 부를 수 있으면 로그인한 것이다. */
export default function ApplySteps({ 미리보기 = false }: { 미리보기?: boolean }) {
  const router = useRouter();
  const [내이력서, set내이력서] = useState<상태>(null);

  useEffect(() => {
    if (미리보기) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    let 살아있음 = true;
    fetch("/api/users/me/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (!살아있음 || !res?.success || !res.data) return;
        const d = res.data;
        const p = d.profile || {};
        const { 비율 } = 이력서진행({
          살롱: d.job_type === "STORE",
          isEntryLevel: !!p.is_entry_level,
          careers: d.careers || [],
          educations: d.educations || [],
          certificates: d.certificates || [],
          experiences: d.experiences || [],
          languages: d.languages || [],
          skills: p.skills || [],
          portfolioImages: d.portfolio_images || [],
          links: d.links || [],
        });
        // 한 줄 소개와 경력(또는 신입)이 없으면 낼 것이 없는 이력서다.
        const 채운경력 = (d.careers || []).some((c: any) => String(c.company || "").trim()) || !!p.is_entry_level;
        set내이력서({ 준비: !!String(p.intro || "").trim() && 채운경력, 비율 });
      })
      .catch(() => {});
    return () => { 살아있음 = false; };
  }, [미리보기]);

  const 됨 = !!내이력서?.준비;

  return (
    <div className="apply-steps">
      <div
        className={`apply-step${됨 ? " done" : ""}${내이력서 && !됨 ? " todo" : ""}`}
        role={내이력서 && !됨 ? "button" : undefined}
        tabIndex={내이력서 && !됨 ? 0 : undefined}
        onClick={() => { if (내이력서 && !됨) router.push("/profile/resume"); }}
        onKeyDown={(e) => {
          if (내이력서 && !됨 && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); router.push("/profile/resume"); }
        }}
      >
        <span className="apply-step-no">{됨 ? <Check size={13} strokeWidth={3} /> : 1}</span>
        <span className="apply-step-txt">
          {내이력서 ? (됨 ? "기본 이력서 준비됨" : "기본 이력서 먼저 채우기") : "기본 이력서"}
        </span>
        {내이력서 && <span className="apply-step-rate">{내이력서.비율}%</span>}
      </div>
      <div className="apply-step">
        <span className="apply-step-no">2</span>
        <span className="apply-step-txt">이 공고에 맞게 고치기</span>
      </div>
      <div className="apply-step">
        <span className="apply-step-no">3</span>
        <span className="apply-step-txt">제출</span>
      </div>
    </div>
  );
}
