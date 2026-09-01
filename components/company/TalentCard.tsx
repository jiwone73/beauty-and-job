"use client";
import Link from "next/link";
import { Bookmark, BookmarkCheck, Paperclip, Instagram, Lock } from "lucide-react";
import type { TalentItem } from "@/lib/api/company";
import LinkCell from "@/components/company/LinkCell";
import { formatPhone } from "@/lib/phone";

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

export default function TalentCard({
  t, talentAccess, base, onOpenResume, onToggleScrap, onPropose,
}: {
  t: TalentItem;
  /** 연락처를 열어 줄 수 있는가(공고를 올린 곳인가). */
  talentAccess: boolean;
  /** 「보낸 제안」으로 가는 길. 회원 유형에 따라 앞자리가 갈린다. */
  base: string;
  onOpenResume: (t: TalentItem) => void;
  onToggleScrap: (t: TalentItem) => void;
  onPropose: (t: TalentItem) => void;
}) {
  const 나이성별 = [t.age ? `${t.age}세` : null, genderLabel(t.gender)].filter(Boolean).join(" · ");
  const 직군 = [t.mainJobGroup, t.subJob].filter(Boolean).join(" · ");
  const 지역 = shortenRegion(t.regionPrefer);
  const 최근 = t.careerDetail
    ? [t.careerDetail.company, t.careerDetail.position].filter(Boolean).join(" · ")
    : null;

  return (
    <div className="tal-card">
      <div className="tal-top">
        <div className="tal-avatar" onClick={() => onOpenResume(t)} title="이력서 보기">
          {t.avatarUrl
            ? <img src={t.avatarUrl} alt={t.name} loading="lazy" />
            : <span>{t.name?.slice(0, 1) || "?"}</span>}
        </div>

        <div className="tal-main">
          <div className="tal-nameline">
            <button type="button" className="tal-name" onClick={() => onOpenResume(t)}>{t.name}</button>
            {/* 스크랩은 그 사람에 붙는 표시라 이름 옆이 제자리다. */}
            <button type="button" title={t.scrapped ? "스크랩 해제" : "스크랩"}
              className="tal-scrap" onClick={(e) => { e.stopPropagation(); onToggleScrap(t); }}>
              {t.scrapped
                ? <BookmarkCheck size={17} style={{ color: "#582681" }} />
                : <Bookmark size={17} style={{ color: "#c8c8c8" }} />}
            </button>
          </div>
          <div className="tal-head">
            {나이성별 && <span className="tal-sub">{나이성별}</span>}
            <span className="tal-sub">{careerLabel(t.careerYears, t.careerCount)}</span>
          </div>
          {t.intro && <div className="tal-intro">{t.intro}</div>}
          <div className="tal-meta">
            {직군 && <span>{직군}</span>}
            {지역 && <span>{지역}</span>}
          </div>
          {최근 && <div className="tal-recent">최근 · {최근}</div>}
        </div>

        {/* 이 화면의 일은 제안을 보내는 데서 끝난다 — 읽었는지, 대화를 수락했는지,
            며칠 남았는지는 보낸 제안이 맡는다. 다만 이미 보냈다는 표시는 여기 남긴다.
            같은 사람에게 또 보내는 실수가 일어나는 자리가 정확히 여기다. */}
        <div className="tal-acts">
          {t.proposedAt || t.interestedAt ? (
            <Link className="tal-sent" href={`${base}/proposals`}
              title={t.proposedAt
                ? `${new Date(t.proposedAt).toLocaleDateString("ko-KR")}에 보냄 · 보낸 제안에서 보기`
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

      <div className="tal-foot">
        {/* 관심을 보낸 사람은 스스로 연 것이라 열람권과 무관하게 보인다.
            잠겼을 때는 빈칸으로 두지 않는다 — 왜 비었는지 알아야 한다. */}
        {(talentAccess || t.interestedAt) ? (
          <span className="tal-contact">
            {t.phone ? formatPhone(t.phone) : "전화번호 없음"}
            {t.email && <><i>·</i>{t.email}</>}
          </span>
        ) : (
          <span className="tal-locked">
            <Lock size={12} />
            공고를 올리면 연락처가 열려요
          </span>
        )}
        <span className="tal-links">
          <LinkCell url={t.portfolioImages?.[0]?.url ?? null} icon={<Paperclip size={13} />} label="사진" />
          <LinkCell url={t.snsUrl} icon={<Instagram size={13} />} label="SNS" />
        </span>
      </div>
    </div>
  );
}
