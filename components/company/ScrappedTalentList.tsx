"use client";
import { useRouter } from "next/navigation";
import TalentCard from "@/components/company/TalentCard";
import type { TalentItem } from "@/lib/api/company";

// 스크랩 인재 목록 — 채용제안 화면의 본문 자리. 왼쪽에서 공고를 고르면 화면이
// 그 공고로 담은 사람만 추려 넘겨준다. 목록을 부르고 공고별로 세는 일은 화면이 한 번에
// 한다(왼쪽 숫자와 오른쪽 목록이 같은 데이터에서 나와야 어긋나지 않는다).
// 카드는 인재 검색과 같은 것 — 북마크로 다른 공고에 더 담거나 뺄 수 있다.
export default function ScrappedTalentList({
  base, talents, loading, scrapJobs, onScrapJob, proposeJobId, hideCount,
}: {
  base: string;
  talents: TalentItem[];
  loading: boolean;
  scrapJobs: { id: string; title: string }[];
  onScrapJob: (t: TalentItem, key: string, on: boolean) => void;
  /** 왼쪽에서 고른 공고 — 제안하기를 누르면 그 공고가 골라진 채로 제안 창이 열린다. */
  proposeJobId?: string;
  /** 위에 공고 머리 띠(「이 공고로 스크랩한 인재 N명」)가 있으면 「총 N명」 줄을 두지 않는다. */
  hideCount?: boolean;
}) {
  const router = useRouter();

  // 검색창은 두지 않는다 — 스크랩은 매장이 골라 담은 사람이라 많지 않다.
  const filtered = talents;

  return (
    <div style={{ width: "100%" }}>
      {!hideCount && (
        <div style={{ fontSize: 15, color: "#555", margin: "0 0 8px" }}>
          총 <strong>{filtered.length}</strong>명
        </div>
      )}

      {loading ? (
        <div className="admin-empty">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">{proposeJobId ? "이 공고로 담은 인재가 없습니다." : "스크랩한 인재가 없습니다."}</div>
      ) : (
        <div className="tal-list">
          {filtered.map((t) => (
            <TalentCard key={t.id} t={t} base={base}
              onOpenResume={(x) => router.push(`${base}/talent/${x.id}`)}
              onToggleScrap={() => {}}
              onPropose={(x) => router.push(`${base}/talent?propose=${x.id}${proposeJobId ? `&job=${proposeJobId}` : ""}`)}
              scrapJobs={scrapJobs} onScrapJob={onScrapJob} />
          ))}
        </div>
      )}
    </div>
  );
}
