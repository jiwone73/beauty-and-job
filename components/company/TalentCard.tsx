"use client";
import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";
import type { TalentItem } from "@/lib/api/company";

// 인재 카드. 인재 검색과 스크랩 인재가 같은 카드를 쓴다.
//
// 스크랩 인재는 표였고, 표를 카드로 바꾸면서 카드 markup 을 한 벌 더 적으면 두
// 화면이 곧 어긋난다 — 실제로 그렇게 어긋나 있었다(스크랩 쪽에는 이름 가리기도,
// 제안 이력도 없었다). 카드는 여기 한 곳에만 둔다.

function careerLabel(years: number | null, count: number): string {
  if (!count || years === null || years === 0) return "신입";
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

export default function TalentCard({
  t, base, onOpenResume, onToggleScrap, onPropose,
}: {
  t: TalentItem;
  /** 「보낸 제안」으로 가는 길. 회원 유형에 따라 앞자리가 갈린다. */
  base: string;
  onOpenResume: (t: TalentItem) => void;
  onToggleScrap: (t: TalentItem) => void;
  onPropose: (t: TalentItem) => void;
}) {
  const 나이성별 = [genderLabel(t.gender), t.age ? `만 ${t.age}세` : null].filter(Boolean).join(", ");
  const 지역 = shortenRegion(t.regionPrefer);
  // 태그는 사람을 거르는 값 셋 — 무슨 일을, 얼마나 해 봤고, 어떻게 일하고 싶은가.
  const 태그 = [
    // 직군이 늘 mainJobGroup 에 있는 것은 아니다 — 매장은 skillAreas 에만,
    // 본사는 officeJobAreas 에만 든 사람이 있다.
    t.subJob || t.mainJobGroup || t.skillAreas?.[0] || t.officeJobAreas?.[0],
    careerLabel(t.careerYears, t.careerCount),
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
              {t.intro ? t.name : ""}{t.intro && 나이성별 ? " " : ""}{나이성별 && `(${나이성별})`}
            </button>
          </div>
          {지역 && <div className="tal-who">{지역}</div>}
        </div>

        {/* 이 화면의 일은 제안을 보내는 데서 끝난다 — 읽었는지, 대화를 수락했는지,
            며칠 남았는지는 보낸 제안이 맡는다. 다만 이미 보냈다는 표시는 여기 남긴다.
            같은 사람에게 또 보내는 실수가 일어나는 자리가 정확히 여기다. */}
        <div className="tal-acts">
          <button type="button" title={t.scrapped ? "스크랩 해제" : "스크랩"}
            className="tal-scrap" onClick={(e) => { e.stopPropagation(); onToggleScrap(t); }}>
            {t.scrapped
              ? <BookmarkCheck size={18} style={{ color: "#582681" }} />
              : <Bookmark size={18} style={{ color: "#c8c8c8" }} />}
          </button>
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
        {t.resumeUpdatedAt && <span className="tal-when">{날짜(t.resumeUpdatedAt)}</span>}
      </div>
    </div>
  );
}
