"use client";
import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, Pencil } from "lucide-react";
import { genderLabel, calcAge, calcCareerYears } from "@/lib/memberFormat";
import type { CompanyApplication } from "@/lib/types/company";

// 지원자 카드. 지원자 목록과 공고 카드 안(펼치기)이 같은 카드를 쓴다 —
// 같은 사람이 두 자리에서 다르게 보이면 안 된다.
//
// 인재 카드와 같은 얼굴이다. 맨 위는 본인이 고른 한 마디, 그 아래에 그 사람을
// 특정하는 값. 아랫줄은 어느 공고로 어떻게 들어왔는지와 지원한 날.

const STATUS_LABEL: Record<string, string> = {
  APPLIED: "미열람", VIEWED: "열람", INTERVIEW: "면접", PASSED: "최종합격", REJECTED: "불합격",
};


const 날짜 = (s: string) => {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

function shortenRegion(region: string): string {
  if (!region) return "";
  return region.replace(/특별자치도|특별자치시|특별시|광역시/g, "").replace(/\s+/g, " ").trim();
}

const 고용형태: Record<string, string> = {
  FULL_TIME: "정규직", PART_TIME: "아르바이트", CONTRACT: "계약직",
  FREELANCE: "프리랜서", INTERN: "인턴", TEMPORARY: "일용직",
};

const 마감인가 = (a: CompanyApplication) => {
  const st = (a as any).job_status;
  const dl = (a as any).job_deadline;
  return st === "CLOSED" || (dl && new Date(dl) < new Date());
};

export default function ApplicantCard({
  a, onOpen, onToggleScrap, onNote, checked, onCheck, showJob = true,
}: {
  a: CompanyApplication;
  onOpen: (a: CompanyApplication) => void;
  onToggleScrap: (a: CompanyApplication) => void;
  /** 매장만 보는 한 줄 메모. 「통화함」·「화요일 3시 면접」처럼 자기가 나중에 보려고
   *  적는 것이라, 남을 위한 상태값과 달리 실제로 쓰인다. */
  onNote?: (a: CompanyApplication, note: string) => void;
  /** 일괄 처리용 체크. 공고 카드 안에서는 쓰지 않는다. */
  checked?: boolean;
  onCheck?: (id: string) => void;
  /** 공고 카드 안에서는 그 공고 이름이 바로 위에 있어 다시 적지 않는다. */
  showJob?: boolean;
}) {
  const 나이 = calcAge((a as any).user_birth_date);
  const ct = (a as any).career_type;
  // 연차를 모르면 「경력」이라는 말만 덩그러니 남는다 — 그럴 바엔 안 적는다.
  const 경력 = ct === "NEWCOMER"
    ? "신입"
    : (() => { const y = calcCareerYears((a as any).recent_start_date); return y ? `경력 ${y}` : ""; })();
  const 나이성별 = [나이 != null ? `${나이}세` : null, genderLabel((a as any).user_gender)].filter(Boolean).join(" · ");
  const 지역 = shortenRegion([(a as any).user_region_sido, (a as any).user_region_sigungu].filter(Boolean).join(" "));
  // 브랜드 보라 하나로 간다. 아직 안 본 사람만 보라(할 일이 남은 것),
  // 끝난 것(불합격·지원취소)은 흐리게, 나머지는 먹색.
  const 상태색 = a.status === "APPLIED" ? "#582681"
    : (a.status === "REJECTED" || a.status === "WITHDRAWN") ? "#b4b4b9" : "#1a1a1a";

  const 유입 = (a as any).proposal_interested_at ? "대화 후 지원"
    : (a as any).proposed_at ? "제안 후 지원" : null;
  // 인재 카드와 같은 태그 — 무슨 일을 하고 어떻게 일하고 싶은가.
  const [메모쓰기, set메모쓰기] = useState(false);
  const [메모, set메모] = useState(a.note || "");
  const 메모칸 = useRef<HTMLInputElement>(null);
  useEffect(() => { set메모(a.note || ""); }, [a.note]);
  useEffect(() => { if (메모쓰기) 메모칸.current?.focus(); }, [메모쓰기]);
  const 메모저장 = () => {
    set메모쓰기(false);
    const v = 메모.trim();
    if (v === (a.note || "")) return;
    onNote?.(a, v);
  };

  const 태그 = [
    (a as any).user_sub_job || (a as any).user_main_job_group,
    (a as any).user_work_type_prefer ? 고용형태[(a as any).user_work_type_prefer] : null,
  ].filter(Boolean) as string[];

  return (
    <div className={`tal-card${checked ? " on" : ""}`}>
      <div className="tal-top">
        {onCheck && (
          <input type="checkbox" className="tal-check" checked={!!checked} onChange={() => onCheck(a.id)} />
        )}
        <div className="tal-avatar" onClick={() => onOpen(a)} title="지원서 보기">
          {(a as any).user_avatar_url
            ? <img src={(a as any).user_avatar_url} alt={a.user_name} loading="lazy" />
            : <span>{(a.user_name || "?").slice(0, 1)}</span>}
        </div>

        <div className="tal-main" role="button" tabIndex={0} title="지원서 보기"
          onClick={() => onOpen(a)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(a); } }}>
          <div className="tal-name">{(a as any).user_intro || a.user_name}</div>
          <div className="tal-who">
            {(a as any).user_intro ? a.user_name : ""}
            {(a as any).user_intro && 나이성별 ? " " : ""}
            {나이성별 && `(${나이성별})`}
            {경력 && <>{((a as any).user_intro || 나이성별) ? " · " : ""}{경력}</>}
          </div>
          {지역 && <div className="tal-who">{지역}</div>}
        </div>

        <div className="tal-acts">
          <button type="button" title={(a as any).scrapped ? "스크랩 해제" : "스크랩"}
            className="tal-scrap" onClick={(e) => { e.stopPropagation(); onToggleScrap(a); }}>
            {(a as any).scrapped
              ? <BookmarkCheck size={18} style={{ color: "#582681" }} />
              : <Bookmark size={18} style={{ color: "#c8c8c8" }} />}
          </button>
          {/* 상태는 여기서 읽기만 한다. 면접·합격은 지원서를 읽고 나서 정하는 것이라
              그 창에서 바꾼다 — 카드마다 고르개가 붙으면 목록이 시끄러워진다. */}
          <span style={{ fontSize: 13.5, color: 상태색 }}>
            {a.status === "WITHDRAWN" ? "지원취소" : STATUS_LABEL[a.status]}
          </span>
        </div>
      </div>

      {/* 매장만 보는 한 줄. 안내 문구 없이 자리글만 둔다. */}
      {onNote && (
        <div className="tal-memo">
          {메모쓰기 ? (
            <input ref={메모칸} className="tal-memo-in" value={메모} maxLength={60}
              placeholder="통화함 · 화요일 3시 면접 …"
              onChange={(e) => set메모(e.target.value)}
              onBlur={메모저장}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.currentTarget.blur(); }
                if (e.key === "Escape") { set메모(a.note || ""); set메모쓰기(false); }
              }} />
          ) : (
            <button type="button" className={`tal-memo-btn${메모 ? " has" : ""}`}
              onClick={() => set메모쓰기(true)}>
              <Pencil size={13} />{메모 || "메모 남기기"}
            </button>
          )}
        </div>
      )}

      <div className="tal-foot">
        <span className="tal-tags">
          {태그.length > 0 && <span>{태그.map((g) => `#${g}`).join(" ")}</span>}
          {showJob && (
            <span className="tal-job">
              {a.job_title}
              {마감인가(a) && <span style={{ marginLeft: 5, fontSize: 11, color: "#999", background: "#f2f2f4", borderRadius: 4, padding: "1px 5px" }}>마감</span>}
            </span>
          )}
          {유입 && <span className="tal-from">{유입}</span>}
        </span>
        <span className="tal-when">{날짜(a.applied_at)} 지원</span>
      </div>
    </div>
  );
}
