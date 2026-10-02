"use client";
import Link from "next/link";
import { Bookmark, BookmarkCheck } from "lucide-react";
import type { TalentItem } from "@/lib/api/company";

// 인재검색 모바일 목록의 카드 한 장 — 인재검색 화면과 대시보드 「추천 인재」가
// 같은 카드를 쓴다("그냥 인재검색 목록을 그냥 똑같이 넣자", 2026-10-02).
// 모양(.co-li-*)은 이 파일이 한 벌로 들고 있다 — 두 화면이 어긋나지 않게.

function shortenRegion(region: string | null | undefined): string {
  if (!region) return "—";
  return region
    .replace(/특별자치도|특별자치시|특별시|광역시/g, "")
    .replace(/\s+/g, " ")
    .trim() || region;
}
function careerLabel(years: number | null, count: number): string {
  if (!count || years === null || years === 0) return "신입";
  return `경력 ${years}년`;
}
function genderLabel(gender: string | null): string | null {
  if (gender === "남성" || gender === "MALE" || gender === "M") return "남";
  if (gender === "여성" || gender === "FEMALE" || gender === "F") return "여";
  return null;
}

export const TalentListStyle = () => (
  <style>{`
            .co-list { display: flex; flex-direction: column; gap: 10px; }
            .co-row { display: flex; align-items: center; gap: 10px; }
            .co-row-check { width: 20px; height: 20px; accent-color: #582681; flex-shrink: 0; margin: 0; }
            /* 카드 패딩은 모바일 표준값 5px로("페이지 여백 7px, 카드 패딩
               5px. 사이트 전체 고정값"). */
            .co-li { flex: 1; min-width: 0; background: #fff; border: 1px solid #eee; border-radius: 12px; padding: 5px; cursor: pointer; }
            .co-li.on { border-color: #582681; background: #f7f7f8; }
            /* 아바타-글 간격도 지원자 카드 모바일과 같은 8px로("모바일 인재풀은
               다 틀어졌어... 이거 통일해줘 공고지원자랑"). */
            /* 아바타 윗변과 직군명을 수평으로("아바타하고 직군하고 수평으로
               맞추어") — 지원자 카드·인재풀(PC)과 같은 flex-start. */
            .co-li-r1 { display: flex; align-items: flex-start; gap: 8px; }
            .co-li-namerow { display: flex; align-items: center; justify-content: space-between; gap: 8px; position: relative; }
            .co-li-scrap { background: none; border: none; padding: 0; cursor: pointer; display: inline-flex; flex-shrink: 0; }
            /* 사진 크기도 지원자 카드와 같은 60x76으로("아바타크기 ... 통일"). */
            .co-li-avatar { width: 60px; height: 76px; border-radius: 4px; overflow: hidden; flex-shrink: 0; border: 1px solid #e0e0e0; background: #f5f5f5; color: #582681; font-size: 17px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
            .co-li-avatar img { width: 100%; height: 100%; object-fit: cover; }
            .co-li-nameinfo { display: flex; align-items: baseline; gap: 7px; min-width: 0; }
            /* 지원자 카드와 같은 크기·색으로("인재풀도 동일하게 맞추되").
               이 파일 다른 곳에서도 겪은, 설명 안 되는 캐스케이드 문제(같은
               배점인데 뒤에 쓴 규칙이 안 이김) 때문에 !important로 못박는다. */
            /* 이름은 회색으로 통일("이름은 회색(#555)로 통일하고 (모바일포함)").
               globals.css의 ".company-layout .co-li-name"(전역, 볼드 600)이
               클래스 2개라 여기 한 개짜리보다 세거서 이겼다 — 셀렉터를
               ".co-list .co-li-name"으로 두 개로 맞춰 이 화면에서만 이긴다. */
            .co-list .co-li-name { font-size: 14px !important; font-weight: 700 !important; color: #555 !important; flex-shrink: 0; line-height: 22px !important; }
            /* 나머지(나이·성별·경력·지역)도 지원자 카드와 같은 13px로 — 지원자
               카드 모바일은 이름·직군만 14px, 나머지는 13px이다("공고지원
               인재카드에 있는 폰트 크기, 색상확인하고, 인재풀, 제안스크랩
               에도 똑같이 적용해줘", 2026-10-02). */
            .co-li-ageg { font-size: 13px !important; color: #555; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 22px; }
            /* 3줄 합이 아바타 76px과 위아래 딱 맞게 — 공고지원자 카드와 정확히
               같은 값(줄높이 22px, 1·2행 사이 7px, 2·3행 사이 3px: 22*3+7+3=76). */
            .co-li-meta2 { font-size: 13px !important; color: #555; margin-top: 3px; line-height: 22px; }
            .co-li-jobrow { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 7px; position: relative; }
            /* 맨 윗줄은 굵게 통일("맨윗줄은 PC는 15px 굵게(#333), 모바일은
               14px 굵게(#333)로 통일해줘"). 오른쪽에 떠 있는 스크랩·제안하기
               (아래 .co-li-actcol)와 안 겹치게 자리를 비워 둔다. */
            .co-li-job { font-size: 14px !important; font-weight: 700 !important; color: #333 !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 22px !important; padding-right: 56px; }
            /* 제안하기를 맨 위 직군 줄로 올리고 오른쪽 정렬, 아이콘은 뺀다
               ("제안하기 버튼을 위로 올려서 오른쪽 정렬해줘. 제안하기 앞에
               아이콘은 삭제"). */
            /* 보라색 쓰지 않는다("그리고 보라색쓰지마 제안하기") — 다른 테두리
               버튼(.tal-btn)과 같은 회색. */
            /* 버튼 높이를 1행 텍스트 높이(22px)에 맞춘다 — 패딩으로 키를
               키우던 걸 고정 높이 + 세로 중앙 정렬로 바꾸고, 옆 패딩도
               줄인다("버튼쪽 패딩도 줄여"). 안 그러면 버튼이 2행 아래
               3행 자리까지 내려와 겹쳐 보였다. */
            .co-li-propose { box-sizing: border-box; height: 22px; display: inline-flex; align-items: center;
              flex-shrink: 0; background: none; border: 1px solid #e2e2e6; border-radius: 8px;
              padding: 0 8px; cursor: pointer; color: #555; font-size: 13px; font-weight: 500; font-family: inherit; line-height: 1; }
            .co-li-sent { box-sizing: border-box; height: 22px; display: inline-flex; align-items: center;
              flex-shrink: 0; font-size: 13px; color: #555; text-decoration: none; line-height: 1; }
            .co-li-scrap { height: 22px; align-items: center; justify-content: center; }
            /* 스크랩·제안하기를 세로로 쌓아 1행(직군) 자리에서 시작시킨다
               ("스크랩하고 제안하기버튼을 한줄씩 위로 올려줘") — absolute로
               빼서 줄 흐름에서 키를 안 차지하게 한다. 안 그러면 이 줄이
               버튼 두 개 높이만큼 부풀어 바로 아랫줄과의 간격이 벌어진다.
               gap도 위 jobrow 간격(7.6px 반올림)에 맞춰 2행 끝과 딱 맞춘다. */
            /* 지역만 13.5px — 한글만 이어진 지역이 숫자 섞인 줄보다 커 보인다("지역을 13.5로 해봐"). */
            .co-li-reg { font-size: 13.5px; }
            .co-li-recv { font-size: 11px; color: #9a9aa3; white-space: nowrap; line-height: 14px; position: relative; top: 2px; }
            .co-li-actcol { position: absolute; top: 0; right: 0; display: flex; flex-direction: column; align-items: flex-end; gap: 7px; }
          `}</style>
);

export default function TalentListCard({
  t, base, onOpenResume, onToggleScrap, onPropose, 받은제안표시 = false,
}: {
  t: TalentItem;
  /** 「보낸 제안」으로 가는 길의 앞자리. */
  base: string;
  onOpenResume: (t: TalentItem) => void;
  onToggleScrap: (t: TalentItem) => void;
  onPropose: (t: TalentItem) => void;
  /** 제안하기 밑에 「받은제안 N건」을 흐리게 적는다 — 다른 인재 카드(TalentCard·표)와 같은 말. 0건도 적는다. */
  받은제안표시?: boolean;
}) {
  const gl = genderLabel(t.gender);
  const region = t.regionPrefer ? shortenRegion(t.regionPrefer) : null;
  const ageGender = [t.age ? `${t.age}세` : null, gl].filter(Boolean).join(" · ");
  const career = careerLabel(t.careerYears, t.careerCount);
  return (
    <div className="co-row">
      <div className="co-li" onClick={() => onOpenResume(t)}>
        <div className="co-li-r1">
          <div className="co-li-avatar">
            {t.avatarUrl
              ? <img src={t.avatarUrl} alt={t.name} loading="lazy" />
              : <span>{t.name?.slice(0, 1) || "?"}</span>}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="co-li-jobrow">
              <div className="co-li-job">{t.subJob || t.mainJobGroup || "직군 미정"}</div>
              <div className="co-li-actcol">
                <button className="co-li-scrap" title={t.scrapped ? "스크랩됨" : "스크랩"}
                  onClick={(e) => { e.stopPropagation(); onToggleScrap(t); }}>
                  {t.scrapped
                    ? <BookmarkCheck size={19} style={{ color: "#582681" }} />
                    : <Bookmark size={19} style={{ color: "#555" }} />}
                </button>
                {/* 취소·공고마감은 다시 제안할 수 있다 — 거절만 막아 둔다. */}
                {t.latestProposalState === "active" ? (
                  <Link href={`${base}/proposals`} onClick={(e) => e.stopPropagation()}
                    className="co-li-sent">
                    제안완료
                  </Link>
                ) : t.latestProposalState === "rejected" ? (
                  <Link href={`${base}/proposals`} onClick={(e) => e.stopPropagation()}
                    className="co-li-sent">
                    거절됨
                  </Link>
                ) : (
                  <button type="button" className="co-li-propose"
                    onClick={(e) => { e.stopPropagation(); onPropose(t); }}>
                    제안하기
                  </button>
                )}
                {받은제안표시 && (
                  <span className="co-li-recv">받은제안 {t.receivedProposalCount ?? 0}건</span>
                )}
              </div>
            </div>
            <div className="co-li-namerow">
              <div className="co-li-nameinfo">
                <span className="co-li-name">{t.name}</span>
                {ageGender && <span className="co-li-ageg">{ageGender}</span>}
              </div>
            </div>
            {(career || region) && (
              <div className="co-li-meta2">
                {career}{career && region ? " · " : ""}
                {region && <span className="co-li-reg">{region}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
