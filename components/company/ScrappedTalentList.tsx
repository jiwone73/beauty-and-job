"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import TalentCard from "@/components/company/TalentCard";
import { Search } from "lucide-react";
import type { TalentItem } from "@/lib/api/company";

// 스크랩 인재 목록 — 채용제안 화면의 본문 자리. 왼쪽에서 공고를 고르면 화면이
// 그 공고로 담은 사람만 추려 넘겨준다. 목록을 부르고 공고별로 세는 일은 화면이 한 번에
// 한다(왼쪽 숫자와 오른쪽 목록이 같은 데이터에서 나와야 어긋나지 않는다).
// 카드는 인재 검색과 같은 것 — 북마크로 다른 공고에 더 담거나 뺄 수 있다.
export default function ScrappedTalentList({
  base, talents, loading, scrapJobs, onScrapJob, heading,
}: {
  base: string;
  talents: TalentItem[];
  loading: boolean;
  scrapJobs: { id: string; title: string }[];
  onScrapJob: (t: TalentItem, key: string, on: boolean) => void;
  /** 고른 공고 이름 */
  heading?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = talents.filter((t) =>
    !search
    || (t.name || "").includes(search)
    || (t.mainJobGroup || "").includes(search)
    || (t.subJob || "").includes(search)
  );

  return (
    <div style={{ width: "100%" }}>
      <div className="admin-search-wrap" style={{ maxWidth: 400, marginBottom: 12 }}>
        <Search size={16} className="admin-search-icon" />
        <input className="admin-search-input" placeholder="이름, 직군 검색"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div style={{ fontSize: 14, color: "#555", margin: "0 0 8px" }}>
        {heading && <span>{heading} · </span>}총 <strong>{filtered.length}</strong>명
      </div>

      {loading ? (
        <div className="admin-empty">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">이 공고로 담은 인재가 없습니다.</div>
      ) : (
        <div className="tal-list">
          {filtered.map((t) => (
            <TalentCard key={t.id} t={t} base={base}
              onOpenResume={(x) => router.push(`${base}/talent/${x.id}`)}
              onToggleScrap={() => {}}
              onPropose={(x) => router.push(`${base}/talent?propose=${x.id}`)}
              scrapJobs={scrapJobs} onScrapJob={onScrapJob} />
          ))}
        </div>
      )}
    </div>
  );
}
