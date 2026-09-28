"use client";
import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";
import type { TalentItem } from "@/lib/api/company";

// PC 전용 표 한 줄("인재풀도 같이... 인재 다음에 직군, 경력, 업데이트,
// 제안·스크랩"). 값 계산은 TalentCard(모바일 카드)와 같은 규칙을 그대로
// 따른다 — 표와 카드에서 같은 사람이 다른 값으로 보이면 안 된다.

function genderLabel(gender: string | null): string | null {
  if (gender === "FEMALE" || gender === "여성" || gender === "F") return "여";
  if (gender === "MALE" || gender === "남성" || gender === "M") return "남";
  return null;
}

function shortenRegion(region: string | null | undefined): string {
  if (!region) return "";
  return region.replace(/특별자치도|특별자치시|특별시|광역시/g, "").replace(/\s+/g, " ").trim() || region;
}

function careerLabel(stage: string | null, years: number | null, count: number): string | null {
  if (stage) return stage;
  if (!count || years === null || years === 0) return null;
  return `경력 ${years}년`;
}

const 업데이트날 = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getFullYear()).slice(2)}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function TalentTableRow({
  t, base, onOpenResume, onToggleScrap, onPropose,
}: {
  t: TalentItem;
  base: string;
  onOpenResume: (t: TalentItem) => void;
  onToggleScrap: (t: TalentItem) => void;
  onPropose: (t: TalentItem) => void;
}) {
  const 나이성별 = [t.age ? `${t.age}세` : null, genderLabel(t.gender)].filter(Boolean).join(" · ");
  const 지역 = shortenRegion(t.regionPrefer);
  const 직군 = t.subJob || t.mainJobGroup || t.skillAreas?.[0] || t.officeJobAreas?.[0] || "—";
  const 경력 = careerLabel(t.careerStage, t.careerYears, t.careerCount) || "—";

  return (
    <tr className="apl-tr">
      <td className="apl-td apl-td-who">
        <button type="button" className="apl-td-whobtn" onClick={() => onOpenResume(t)} title="이력서 보기"
          style={t.isSample ? { opacity: 0.4 } : undefined}>
          <span className="apl-td-avatar">
            {t.avatarUrl
              ? <img src={t.avatarUrl} alt={t.name} loading="lazy" />
              : <span>{t.name?.slice(0, 1) || "?"}</span>}
          </span>
          <span className="apl-td-wholines">
            <span className="apl-td-name"><b>{t.name}</b></span>
            <span className="apl-td-sub">{나이성별 || "—"}</span>
            <span className="apl-td-sub">{지역 || "—"}</span>
          </span>
        </button>
      </td>
      <td className="apl-td apl-td-role">{직군}</td>
      <td className="apl-td">{경력}</td>
      <td className="apl-td">
        {t.resumeUpdatedAt ? 업데이트날(t.resumeUpdatedAt) : "—"}
        {/* 다른 기업 합산 제안 수 — 인기 신호("받은 대화요청 N건", 경쟁사 카드
            참고). 0건은 안 보여준다. */}
        {(t.receivedProposalCount ?? 0) > 0 && (
          <span className="apl-td-received">받은 대화요청 {t.receivedProposalCount}건</span>
        )}
      </td>
      <td className="apl-td apl-td-acts">
        {t.proposedAt || t.interestedAt ? (
          <Link className="tal-btn" href={`${base}/proposals`}>제안완료</Link>
        ) : (
          <button type="button" className="tal-btn" onClick={() => onPropose(t)}>제안하기</button>
        )}
        <button type="button" title={t.scrapped ? "스크랩 해제" : "스크랩"}
          className="apl-td-scrap" onClick={() => onToggleScrap(t)}>
          {t.scrapped
            ? <BookmarkCheck size={17} style={{ color: "#582681" }} />
            : <Bookmark size={17} style={{ color: "#555" }} />}
        </button>
      </td>
    </tr>
  );
}
