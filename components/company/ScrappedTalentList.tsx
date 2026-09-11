"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import TalentCard from "@/components/company/TalentCard";
import { Search } from "lucide-react";
import { companyTalentApi, type TalentItem } from "@/lib/api/company";

// 스크랩 인재 목록. 채용제안 화면의 본문 자리에 들어간다 — 왼쪽 공고 목록은
// 보낸 제안과 같은 것을 그대로 쓰고, 오른쪽만 이 목록으로 바뀐다.
//
// 나중에 제안하려고 담아 둔 사람들이라 보는 눈은 인재 검색과 같다 — 카드도,
// 부르는 API 도(scrapped=1) 인재 검색과 같은 것을 쓴다. 목록이 두 벌이면 곧 어긋난다.
export default function ScrappedTalentList({ base }: { base: string }) {
  const router = useRouter();
  const [talents, setTalents] = useState<TalentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const 불러오기 = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await companyTalentApi.list({ scrapped: true, limit: 200 });
      if (res?.success) setTalents(res.data || []);
    } catch (e) {
      console.error("[scrapped]", e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { 불러오기(); }, [불러오기]);

  // 여기서 스크랩을 풀면 그 줄은 목록에서 빠진다 — 스크랩한 사람만 모은 자리다.
  const 스크랩풀기 = async (t: TalentItem) => {
    try {
      await companyTalentApi.unscrap(t.id);
      setTalents((prev) => prev.filter((x) => x.id !== t.id));
    } catch (e) {
      console.error(e);
    }
  };

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

      <div style={{ fontSize: 14, color: "#888", margin: "0 0 8px" }}>총 <strong style={{ color: "#555" }}>{filtered.length}</strong>명</div>

      {loading ? (
        <div className="admin-empty">불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div className="admin-empty">스크랩한 인재가 없습니다.</div>
      ) : (
        <div className="tal-list">
          {filtered.map((t) => (
            <TalentCard key={t.id} t={t} base={base}
              onOpenResume={(x) => router.push(`${base}/talent/${x.id}`)}
              onToggleScrap={스크랩풀기}
              onPropose={(x) => router.push(`${base}/talent?propose=${x.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
