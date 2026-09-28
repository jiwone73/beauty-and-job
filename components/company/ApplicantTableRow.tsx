"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { genderLabel, calcAge, calcCareerYears } from "@/lib/memberFormat";
import { formatSalaryWon } from "@/lib/salary";
import { 마감인가 } from "@/lib/jobClosed";
import type { CompanyApplication } from "@/lib/types/company";

// PC 전용 표 한 줄("PC는 테이블 뷰로 바꾸자. 모바일은 카드 뷰로 그대로").
// 값 계산은 ApplicantCard(모바일 카드)와 같은 규칙을 그대로 따른다 — 표와
// 카드에서 같은 사람이 다른 값으로 보이면 안 된다.
//
// 칸 순서: 인재(사진+이름/나이·성별) · 지역 · 지원분야 · 경력 · 희망연봉 ·
// 지원일 · 출근가능일 · 메모("지역은 인재 다음에 따로 빼고, 모집분야를
// 지원분야로 라벨링"). 한 줄짜리 값은 1행·2행 정중앙에 오도록 세로 가운데
// 정렬(vertical-align: middle, CSS) — 인재 칸만 2행이라 나머지가 위로
// 붙어 보였다("1행 항목들은... 1행과 2행 중간에 표시해줘").

const 날짜 = (s: string) => {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

function shortenRegion(region: string): string {
  if (!region) return "";
  return region.replace(/특별자치도|특별자치시|특별시|광역시/g, "").replace(/\s+/g, " ").trim();
}

const 마감 = (a: CompanyApplication) => 마감인가((a as any).job_status, (a as any).job_deadline);

export default function ApplicantTableRow({
  a, onOpen, onNote,
}: {
  a: CompanyApplication;
  onOpen: (a: CompanyApplication) => void;
  onNote?: (a: CompanyApplication, note: string) => void;
}) {
  const 나이 = calcAge((a as any).user_birth_date);
  const ct = (a as any).career_type;
  const 경력 = ct === "NEWCOMER"
    ? "신입"
    : (() => { const y = calcCareerYears((a as any).recent_start_date); return y ? `경력 ${y}` : "—"; })();
  const 나이성별 = [나이 != null ? `${나이}세` : null, genderLabel((a as any).user_gender)].filter(Boolean).join(" · ");
  const 지역 = shortenRegion([(a as any).user_region_sido, (a as any).user_region_sigungu].filter(Boolean).join(" "));
  const 유입 = (a as any).proposed_at ? "제안 후 지원" : null;
  const 희망연봉 = (a as any).user_salary_type
    ? formatSalaryWon((a as any).user_salary_min, (a as any).user_salary_type)
    : "—";
  const 출근가능일 = (a as any).user_available_from || "—";

  const [메모, set메모] = useState(a.note || "");
  const 메모칸 = useRef<HTMLInputElement>(null);
  useEffect(() => { set메모(a.note || ""); }, [a.note]);
  const 메모저장 = () => {
    const v = 메모.trim();
    if (v === (a.note || "")) return;
    onNote?.(a, v);
  };

  const 안봄 = a.status === "APPLIED";

  return (
    <tr className={`apl-tr${안봄 ? " new" : ""}`}>
      <td className="apl-td apl-td-who">
        <button type="button" className="apl-td-whobtn" onClick={() => onOpen(a)} title="지원서 보기">
          <span className="apl-td-avatar">
            {(a as any).user_avatar_url
              ? <img src={(a as any).user_avatar_url} alt={a.user_name} loading="lazy" />
              : <span>{(a.user_name || "?").slice(0, 1)}</span>}
          </span>
          <span className="apl-td-wholines">
            <span className="apl-td-name">
              <b>{a.user_name}</b>
              {유입 && <MessageCircle size={12} className="tal-name-chat-ic" />}
            </span>
            <span className="apl-td-sub">{나이성별 || "—"}</span>
          </span>
        </button>
      </td>
      <td className="apl-td">{지역 || "—"}</td>
      <td className="apl-td apl-td-role">
        {(a as any).position_title || "—"}
        {마감(a) && <span className="job-closed-tag">마감</span>}
      </td>
      <td className="apl-td">{경력}</td>
      <td className="apl-td">{희망연봉}</td>
      <td className="apl-td">{날짜(a.applied_at)}</td>
      <td className="apl-td">{출근가능일}</td>
      <td className="apl-td apl-td-memo">
        <input ref={메모칸} className="apl-td-memo-in" value={메모} maxLength={60}
          placeholder="메모…"
          onChange={(e) => set메모(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onBlur={메모저장}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") set메모(a.note || "");
          }} />
      </td>
    </tr>
  );
}
