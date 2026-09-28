"use client";
import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, Pencil, MessageCircle } from "lucide-react";
import { genderLabel, calcAge, calcCareerYears } from "@/lib/memberFormat";
import { formatSalaryWon } from "@/lib/salary";
import { 마감인가 } from "@/lib/jobClosed";
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
  FULL_TIME: "정규직", PART_TIME: "알바", CONTRACT: "계약직",
  FREELANCE: "프리랜서", INTERN: "인턴", TEMPORARY: "일용직",
};

const 마감 = (a: CompanyApplication) => 마감인가((a as any).job_status, (a as any).job_deadline);

export default function ApplicantCard({
  a, onOpen, onToggleScrap, onNote, checked, onCheck, showJob = true, 순번,
}: {
  a: CompanyApplication;
  onOpen: (a: CompanyApplication) => void;
  /** 넘기지 않으면 스크랩 단추를 그리지 않는다 — 이미 지원한 사람은 담아 둘 이유가 없다. */
  onToggleScrap?: (a: CompanyApplication) => void;
  /** 매장만 보는 한 줄 메모. 「통화함」·「화요일 3시 면접」처럼 자기가 나중에 보려고
   *  적는 것이라, 남을 위한 상태값과 달리 실제로 쓰인다. */
  onNote?: (a: CompanyApplication, note: string) => void;
  /** 일괄 처리용 체크. 공고 카드 안에서는 쓰지 않는다. */
  checked?: boolean;
  onCheck?: (id: string) => void;
  /** 공고 카드 안에서는 그 공고 이름이 바로 위에 있어 다시 적지 않는다. */
  showJob?: boolean;
  /** 공고를 펼쳤을 때의 줄 번호. 있으면 카드가 아니라 한 줄로 선다 —
   *  카드 안에 카드를 두면 층이 안 읽히고 다섯 명이면 화면이 꽉 찬다. */
  순번?: number;
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
    : (a.status === "REJECTED" || a.status === "WITHDRAWN") ? "#b4b4b9" : "#555";

  // "대화 후 지원"은 빼고 "제안 후 지원" 하나로 — 대화(interested_at)는 늘 제안이
  // 먼저 있어야 나오는 값이라 굳이 나눠 적을 뜻이 없었다("대화 후 지원은 어디서
  // 나온 문구지? 삭제해").
  const 유입 = (a as any).proposed_at ? "제안 후 지원" : null;
  // 희망연봉·출근가능일 — 헤어·바버 같은 태그 옆에("헤어바버 옆에 희망연봉
  // 기재. 출근가능일 기재"). 아예 안 정한 사람에겐 "급여 협의"만 덩그러니
  // 뜨는 게 뜻이 없어, 급여유형을 고른 적 있는 사람만 보여준다. "희망" 말은
  // 앞에 안 붙인다("급여에서 희망은 삭제해줘").
  const 희망연봉 = (a as any).user_salary_type
    ? formatSalaryWon((a as any).user_salary_min, (a as any).user_salary_type)
    : null;
  const 출근가능일 = (a as any).user_available_from ? `출근가능 ${(a as any).user_available_from}` : null;
  // 인재 카드와 같은 태그 — 무슨 일을 하고 어떻게 일하고 싶은가.
  // 예전엔 "메모" 단추를 눌러야 줄이 열렸는데, 그 단추를 없애고 입력칸을
  // 기본으로 한 줄 더 둔다("오른쪽 끝 메모 아이콘을 삭제하고 한줄 더
  // 기본으로 생성해서 거기에 메모아이콘을 넣어줘") — 접었다 펴는 상태가
  // 필요 없어졌다.
  const [메모, set메모] = useState(a.note || "");
  const 메모칸 = useRef<HTMLInputElement>(null);
  useEffect(() => { set메모(a.note || ""); }, [a.note]);
  const 메모저장 = () => {
    const v = 메모.trim();
    if (v === (a.note || "")) return;
    onNote?.(a, v);
  };

  // 구직자 본인이 정한 희망 직군(user_sub_job)이 아니라, 기업이 이 공고를
  // 등록할 때 고른 소분류(모집분야, position_title) — "희망직군이 아니라
  // 기업이 채용공고 등록 당시 선택했던 소분류 직군을 넣어줘". 대분류로 대신
  // 채우지 않는다("헤어바버는 소분류로 넣어줘" / "소분류만 보여주면 되") —
  // 없으면 그 자리는 그냥 빈다.
  const 태그 = [
    (a as any).position_title,
    (a as any).user_work_type_prefer ? 고용형태[(a as any).user_work_type_prefer] : null,
  ].filter(Boolean) as string[];

  if (순번 !== undefined) {
    const 안봄 = a.status === "APPLIED";
    return (
      <div className={`apl-row${안봄 ? " new" : ""}`} role="button" tabIndex={0} title="지원서 보기"
        onClick={() => onOpen(a)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(a); } }}>
        <span className={`apl-no${안봄 ? " key" : ""}`}>{순번}</span>
        <span className="apl-av">
          {(a as any).user_avatar_url
            ? <img src={(a as any).user_avatar_url} alt="" loading="lazy" />
            : <span>{(a.user_name || "?").slice(0, 1)}</span>}
        </span>
        <span className="apl-who">
          <b>{a.user_name}</b>{나이성별 && <span> ({나이성별})</span>}
          {지역 && <i>{지역}</i>}
        </span>
        {/* 사람을 고르게 하는 건 이름이 아니라 이 줄이다. 한 줄 소개는
            이력서 필수라 비는 일이 없다 — 실제로 지원 168건 모두 들어 있다. */}
        <span className="apl-mid">
          <b>{(a as any).user_intro}</b>
          {태그.length > 0 && (
            <i>{태그.slice(0, 3).map((g) => `#${g}`).join(" ")}{태그.length > 3 ? ` +${태그.length - 3}` : ""}</i>
          )}
        </span>
        <span className="apl-when">{날짜(a.applied_at)} 지원</span>
        {/* 스크랩은 두지 않는다 — 이미 우리 공고에 지원한 사람이라 담아 둘
            이유가 없다. 담는 일은 인재검색에서 하는 것이다. */}
        {/* 상태는 여기서 바꾸지 않는다 — 지원서를 읽고 그 창에서 정한다.
            이 단추는 그 창을 여는 문이고, 아직 안 본 사람만 채워 눈에 건다. */}
        <button type="button" className={`apl-go${안봄 ? " key" : ""}`}
          onClick={(e) => { e.stopPropagation(); onOpen(a); }}>
          {안봄 ? "검토하기" : a.status === "WITHDRAWN" ? "지원취소" : "지원서 보기"}
        </button>
      </div>
    );
  }

  return (
    <div className={`tal-card${checked ? " on" : ""}${a.status === "APPLIED" && !마감(a) ? " todo" : ""}`}>
      <div className="tal-top">
        {onCheck && (
          <input type="checkbox" className="tal-check" checked={!!checked} onChange={() => onCheck(a.id)} />
        )}
        <div className="tal-avatar" onClick={() => onOpen(a)} title="지원서 보기">
          {(a as any).user_avatar_url
            ? <img src={(a as any).user_avatar_url} alt={a.user_name} loading="lazy" />
            : <span>{(a.user_name || "?").slice(0, 1)}</span>}
        </div>

        {/* 여는 자리는 글자뿐이다 — 줄 전체를 누르게 두면 오른쪽 빈 자리나
            지원일을 눌러도 창이 열려, 눌렀는지 아닌지 헷갈린다. */}
        <div className="tal-main">
          {/* 한줄소개는 칸이 넉넉한 데스크탑에만 둔다 — 모바일은 칸이 좁아
              소개 대신 이름부터 보여준다("모바일은 칸이 좁으니 … " → "아니다
              모바일은 한줄소개 빼자. 데스크탑만 넣자"). 두 화면이 쓰는 내용
              자체가 달라 자리를 나누고 매체 쿼리로만 켜고 끈다. */}
          <button type="button" className="tal-name tal-open tal-name-dt" title="지원서 보기"
            onClick={() => onOpen(a)}>
            {(a as any).user_intro || a.user_name}
            {/* 제안을 통해 지원한 사람(제안 후 지원)은 이름 옆에 채팅 아이콘("그리고
                제안을 통해 지원한 사람은 이름옆에 채팅아이콘을 붙여줘"). user_intro가
                있으면 이름은 아래 줄에 따로 있어 거기서 붙인다. */}
            {!(a as any).user_intro && 유입 && <MessageCircle size={13} className="tal-name-chat-ic" />}
          </button>
          <button type="button" className="tal-name tal-open tal-name-m" title="지원서 보기"
            onClick={() => onOpen(a)}>
            {a.user_name}
            {유입 && <MessageCircle size={13} className="tal-name-chat-ic" />}
          </button>
          {/* 이름 줄 오른쪽에 상태값, 지역 줄 오른쪽에 지원일. 둘 다 태그와
              같은 회색이다 — 훑을 때 눈이 걸리지 않아야 하는 값들이다. */}
          <div className="tal-who tal-line2 tal-line2-dt">
            <button type="button" className="tal-open" title="지원서 보기" onClick={() => onOpen(a)}>
              {/* 이름만 굵게. 괄호 속 성별·나이는 평체로 둔다. */}
              {(a as any).user_intro ? <><b>{a.user_name}</b>{유입 && <MessageCircle size={13} className="tal-name-chat-ic" />}</> : ""}
              {(a as any).user_intro && 나이성별 ? " " : ""}
              {나이성별 && `(${나이성별})`}
            </button>
            <span className="tal-st-r">
              {a.status === "WITHDRAWN" ? "지원취소" : STATUS_LABEL[a.status]}
            </span>
          </div>
          <div className="tal-who tal-line2 tal-line2-m">
            {/* 모바일은 이름을 이미 위 tal-name-m 에서 보여줬으니 여기는 나이·성별만. */}
            <button type="button" className="tal-open" title="지원서 보기" onClick={() => onOpen(a)}>
              {나이성별 && `(${나이성별})`}
            </button>
            <span className="tal-st-r">
              {a.status === "WITHDRAWN" ? "지원취소" : STATUS_LABEL[a.status]}
            </span>
          </div>
          <div className="tal-who tal-line2">
            {/* "지역이름 옆에 경력 년수 넣어줘" — 나이·성별과 같은 " · " 결로 잇는다. */}
            <span>{[지역, 경력].filter(Boolean).join(" · ")}</span>
            <span className="tal-when-r">{날짜(a.applied_at)} 지원</span>
          </div>
        </div>

        {onToggleScrap && (
          <div className="tal-acts">
            <button type="button" title={(a as any).scrapped ? "스크랩 해제" : "스크랩"}
              className="tal-scrap" onClick={(e) => { e.stopPropagation(); onToggleScrap(a); }}>
              {(a as any).scrapped
                ? <BookmarkCheck size={18} style={{ color: "#582681" }} />
                : <Bookmark size={18} style={{ color: "#555" }} />}
            </button>
          </div>
        )}
      </div>

      <div className="tal-foot">
        <span className="tal-tags">
          {/* 직군과 경력 — 훑으면서 고르는 값이라 구분선 아래 왼쪽에 둔다. */}
          {태그.length > 0 && <span>{태그.map((g) => `#${g}`).join(" ")}</span>}
          {경력 && <span>#{경력}</span>}
          {/* 헤어·바버 같은 태그 옆에 희망연봉·출근가능일 — "I 로 분리". 앞에
              보일 태그가 하나도 없으면(소분류·경력 다 없음) 구분선만 홀로
              남지 않게 그때는 안 붙인다. */}
          {희망연봉 && <>{(태그.length > 0 || 경력) && <span className="tal-sep">|</span>}<span>{희망연봉}</span></>}
          {출근가능일 && <>{(태그.length > 0 || 경력 || 희망연봉) && <span className="tal-sep">|</span>}<span>{출근가능일}</span></>}
          {showJob && (
            <span className="tal-job">
              {a.job_title}
              {/* 모집부문이 넷인 공고에서는 「지원했다」만으로 무엇을 받았는지
                  알 수 없다. 지원 때 고른 자리를 공고 이름 뒤에 붙인다. */}
              {(a as any).position_title && <span style={{ color: "#555" }}> · {(a as any).position_title}</span>}
              {마감(a) && <span className="job-closed-tag">마감</span>}
            </span>
          )}
          {유입 && <span className="tal-from">{유입}</span>}
        </span>
      </div>

      {/* 메모는 태그 줄 오른쪽 단추가 아니라 기본으로 한 줄 더 두는 입력칸이다
          ("오른쪽 끝 메모 아이콘을 삭제하고 한줄 더 기본으로 생성해서 거기에
          메모아이콘을 넣어줘") — 늘 떠 있어 누르기 전에 펼칠 것도 없다.
          아이콘은 입력칸 안 뱃지로 고정돼 글자를 적어도 안 없어진다("텍스트
          입력시 삭제 안되게"). */}
      {onNote && (
        <div className="tal-memo">
          <div className="tal-memo-in-wrap">
            <Pencil size={12} className="tal-memo-in-badge" />
            <input ref={메모칸} className="tal-memo-in" value={메모} maxLength={60}
              placeholder="메모 — 통화함 · 화요일 3시 면접 · 경력 확인 필요 …"
              onChange={(e) => set메모(e.target.value)}
              onBlur={메모저장}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.currentTarget.blur(); }
                if (e.key === "Escape") { set메모(a.note || ""); }
              }} />
          </div>
        </div>
      )}
    </div>
  );
}
