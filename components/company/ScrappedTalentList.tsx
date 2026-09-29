"use client";
import { useRouter } from "next/navigation";
import TalentCard from "@/components/company/TalentCard";
import type { TalentItem } from "@/lib/api/company";

// 스크랩 인재 목록 — 채용제안 화면의 본문 자리. 카드는 인재 검색과 같은 것이다.
export default function ScrappedTalentList({
  base, talents, loading, onToggleScrap,
}: {
  base: string;
  talents: TalentItem[];
  loading: boolean;
  onToggleScrap: (t: TalentItem) => void;
}) {
  const router = useRouter();

  // 검색창은 두지 않는다 — 스크랩은 매장이 골라 담은 사람이라 많지 않다.
  const filtered = talents;

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontSize: 15, color: "#555", margin: "0 0 8px" }}>
        총 <strong>{filtered.length}</strong>명
      </div>

      {loading ? (
        <div className="admin-empty">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">스크랩한 인재가 없습니다.</div>
      ) : (
        <div className="tal-list">
          {filtered.map((t) => (
            <TalentCard key={t.id} t={t} base={base}
              onOpenResume={(x) => router.push(`${base}/talent/${x.id}`)}
              onToggleScrap={onToggleScrap}
              onPropose={(x) => router.push(`${base}/talent?propose=${x.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
