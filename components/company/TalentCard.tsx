"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bookmark, BookmarkCheck, Check } from "lucide-react";
import type { TalentItem } from "@/lib/api/company";

// 인재 카드. 인재 검색과 스크랩 인재가 같은 카드를 쓴다.
//
// 스크랩 인재는 표였고, 표를 카드로 바꾸면서 카드 markup 을 한 벌 더 적으면 두
// 화면이 곧 어긋난다 — 실제로 그렇게 어긋나 있었다(스크랩 쪽에는 이름 가리기도,
// 제안 이력도 없었다). 카드는 여기 한 곳에만 둔다.

// 경력은 본인이 고른 단계(인턴·신입·경력·실장 / 1~2년 …)를 먼저 쓴다.
// 예전에는 경력 이력의 개수만 보고, 이력을 안 쓴 사람을 모두 「신입」이라
// 적었다 — 10년차가 신입으로 뜨는 것은 빈 값이 아니라 틀린 값이고, 기업이
// 그걸 보고 거른다. 고른 단계도 이력도 없으면 아무것도 적지 않는다.
function careerLabel(stage: string | null, years: number | null, count: number): string | null {
  if (stage) return stage;
  if (!count || years === null || years === 0) return null;
  return `경력 ${years}년`;
}

function genderLabel(gender: string | null): string | null {
  if (gender === "FEMALE" || gender === "여성" || gender === "F") return "여";
  if (gender === "MALE" || gender === "남성" || gender === "M") return "남";
  return null;
}

function shortenRegion(region: string | null | undefined): string {
  if (!region) return "";
  return region
    .replace(/특별자치도|특별자치시|특별시|광역시/g, "")
    .replace(/\s+/g, " ")
    .trim() || region;
}

const 고용형태: Record<string, string> = {
  FULL_TIME: "정규직", PART_TIME: "아르바이트", CONTRACT: "계약직",
  FREELANCE: "프리랜서", INTERN: "인턴", TEMPORARY: "일용직",
};

// 이력서를 마지막으로 손본 날. 오래 방치된 이력서인지가 여기서 드러난다.
const 날짜 = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

// 카드 아래 이력서 날짜는 짧게 — 「26-07-04」.
const 업데이트날 = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getFullYear()).slice(2)}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function TalentCard({
  t, base, onOpenResume, onToggleScrap, onPropose, scrapJobs, onScrapJob, linkLabel, scrapAsText,
}: {
  t: TalentItem;
  /** 「보낸 제안」으로 가는 길. 회원 유형에 따라 앞자리가 갈린다. */
  base: string;
  onOpenResume: (t: TalentItem) => void;
  onToggleScrap: (t: TalentItem) => void;
  onPropose: (t: TalentItem) => void;
  /** 스크랩을 담을 수 있는 공고(진행 중). 주면 북마크가 공고를 고르게 한다. */
  scrapJobs?: { id: string; title: string }[];
  /** 한 공고에 담거나 뺀다. key 는 공고 id, 공고 없이 담는 것은 "none". */
  onScrapJob?: (t: TalentItem, key: string, on: boolean) => void;
  /** 전체 스크랩에서 이 사람이 어느 공고에 담겼는지(「공고 미연결」 또는 공고 이름). */
  linkLabel?: string;
  /** 스크랩 인재 화면 — 모든 카드가 이미 담긴 사람이라 북마크가 알려 주는 것이 없다.
   *  북마크 대신 「공고에 연결」·「공고 변경」 글자 단추로 같은 공고 목록을 연다. */
  scrapAsText?: boolean;
}) {
  // 공고 고르기 — 스크랩은 공고별로 담는다. 바깥을 누르면 닫는다.
  const [담기열림, set담기열림] = useState(false);
  const 담기Ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!담기열림) return;
    const 닫기 = (e: MouseEvent) => {
      if (담기Ref.current && !담기Ref.current.contains(e.target as Node)) set담기열림(false);
    };
    document.addEventListener("mousedown", 닫기);
    return () => document.removeEventListener("mousedown", 닫기);
  }, [담기열림]);
  const 담은것 = t.scrapJobIds || [];
  // 공고가 없거나 하나뿐이면 고를 것이 없다 — 누르는 즉시 담기고 다시 누르면 빠진다.
  const 스크랩누름 = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onScrapJob || !scrapJobs) { onToggleScrap(t); return; }
    if (scrapJobs.length === 0) { onScrapJob(t, "none", !담은것.includes("none")); return; }
    if (scrapJobs.length === 1) { const k = scrapJobs[0].id; onScrapJob(t, k, !담은것.includes(k)); return; }
    set담기열림((v) => !v);
  };
  const 나이성별 = [genderLabel(t.gender), t.age ? `만 ${t.age}세` : null].filter(Boolean).join(", ");
  const 지역 = shortenRegion(t.regionPrefer);
  // 태그는 사람을 거르는 값 셋 — 무슨 일을, 얼마나 해 봤고, 어떻게 일하고 싶은가.
  const 태그 = [
    // 직군이 늘 mainJobGroup 에 있는 것은 아니다 — 매장은 skillAreas 에만,
    // 본사는 officeJobAreas 에만 든 사람이 있다.
    t.subJob || t.mainJobGroup || t.skillAreas?.[0] || t.officeJobAreas?.[0],
    careerLabel(t.careerStage, t.careerYears, t.careerCount),
    t.workTypePrefer ? 고용형태[t.workTypePrefer] || null : null,
  ].filter(Boolean) as string[];

  return (
    <div className="tal-card">
      <div className="tal-top">
        <div className="tal-avatar" onClick={() => onOpenResume(t)} title="이력서 보기">
          {t.avatarUrl
            ? <img src={t.avatarUrl} alt={t.name} loading="lazy" />
            : <span>{t.name?.slice(0, 1) || "?"}</span>}
        </div>

        {/* 맨 위는 본인이 고른 한 마디다. 이름·나이는 그 사람을 특정하는 값일 뿐,
            고를지 말지를 정하는 값이 아니라 아래로 내린다. */}
        {/* 여는 자리는 글자뿐이다 — 줄 전체를 누르게 두면 오른쪽 빈 자리를
            눌러도 이력서가 열려, 눌렀는지 아닌지 헷갈린다. */}
        <div className="tal-main">
          {/* 한줄소개를 안 쓴 사람은 이름이 맨 윗줄을 대신한다 — 「홍길동 님의 이력서」
              같은 자리 채우기를 넣으면 바로 아랫줄에서 이름을 또 읽게 된다. */}
          <button type="button" className="tal-name tal-open" title="이력서 보기"
            onClick={() => onOpenResume(t)}>{t.intro || t.name}</button>
          <div className="tal-who">
            <button type="button" className="tal-open" title="이력서 보기"
              onClick={() => onOpenResume(t)}>
              {/* 굵은 것은 이름뿐이다 — 괄호 속 성별·나이까지 굵으면 둘이 한
                  덩어리로 읽혀, 정작 사람을 가리키는 이름이 묻힌다. */}
              {t.intro ? <b>{t.name}</b> : ""}{t.intro && 나이성별 ? " " : ""}{나이성별 && `(${나이성별})`}
            </button>
          </div>
          {지역 && <div className="tal-who">{지역}</div>}
        </div>

        {/* 이 화면의 일은 제안을 보내는 데서 끝난다 — 읽었는지, 대화를 수락했는지,
            며칠 남았는지는 보낸 제안이 맡는다. 다만 이미 보냈다는 표시는 여기 남긴다.
            같은 사람에게 또 보내는 실수가 일어나는 자리가 정확히 여기다. */}
        <div className="tal-acts">
          <span className="tal-scrapwrap" ref={담기Ref}>
            {scrapAsText ? (
              // 진행 중인 공고가 없으면 옮길 곳이 없어 단추를 두지 않는다.
              scrapJobs && scrapJobs.length > 0 && (
                <button type="button" className="tal-btn"
                  onClick={(e) => { e.stopPropagation(); set담기열림((v) => !v); }}>
                  {담은것.some((k) => k !== "none") ? "공고 변경" : "공고에 연결"}
                </button>
              )
            ) : (
              <button type="button" title={t.scrapped ? "스크랩 — 담은 공고 보기" : "스크랩"}
                className="tal-scrap" onClick={스크랩누름}>
                {t.scrapped
                  ? <BookmarkCheck size={18} style={{ color: "#582681" }} />
                  : <Bookmark size={18} style={{ color: "#555" }} />}
              </button>
            )}
            {담기열림 && scrapJobs && onScrapJob && (
              <div className="tal-scrappop" onClick={(e) => e.stopPropagation()}>
                <div className="tal-scrappop-head">어느 공고로 담을까요?</div>
                {scrapJobs.map((j) => {
                  const on = 담은것.includes(j.id);
                  return (
                    <button key={j.id} type="button" className={`tal-scrappop-item${on ? " on" : ""}`}
                      onClick={() => onScrapJob(t, j.id, !on)}>
                      <span>{j.title}</span>{on && <Check size={14} />}
                    </button>
                  );
                })}
                <button type="button" className={`tal-scrappop-item none${담은것.includes("none") ? " on" : ""}`}
                  onClick={() => onScrapJob(t, "none", !담은것.includes("none"))}>
                  <span>공고 없이 담기</span>{담은것.includes("none") && <Check size={14} />}
                </button>
              </div>
            )}
          </span>
          {t.proposedAt || t.interestedAt ? (
            <Link className="tal-sent" href={`${base}/proposals`}
              title={t.proposedAt
                ? `${날짜(t.proposedAt)}에 보냄 · 보낸 제안에서 보기`
                : "보낸 제안에서 보기"}>
              제안완료
            </Link>
          ) : (
            <button type="button" className="tal-btn" onClick={() => onPropose(t)}>
              제안하기
            </button>
          )}
        </div>
      </div>

      {/* 연락처는 카드에 두지 않는다 — 이력서를 열면 나오고, 공고를 올린 곳에만 열린다. */}
      <div className="tal-foot">
        <span className="tal-tags">{태그.map((g) => `#${g}`).join(" ")}</span>
        {/* 무슨 날짜인지 이름표가 없어 헷갈렸다 — 사람인처럼 「26-07-04 업데이트」로 적는다. */}
        {linkLabel && <span className="tal-badge" title={linkLabel}
          style={{ marginLeft: "auto", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis" }}>{linkLabel}</span>}
        {t.resumeUpdatedAt && <span className="tal-when" style={linkLabel ? { marginLeft: 8 } : undefined}>{업데이트날(t.resumeUpdatedAt)} 업데이트</span>}
      </div>
    </div>
  );
}
