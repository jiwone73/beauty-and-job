"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import TalentCard from "@/components/company/TalentCard";
import { Search } from "lucide-react";
import { companyTalentApi, type TalentItem } from "@/lib/api/company";

// 스크랩 인재. 나중에 제안하려고 담아 둔 사람들이라, 보는 눈은 인재 검색과 같다 —
// 카드도 인재 검색과 같은 것을 쓴다. 표였을 때는 이름 가리기도 제안 이력도 빠져
// 있어서, 같은 사람이 두 화면에서 다르게 보였다.

export default function ScrappedTalentPage() {
  const router = useRouter();
  const pathname = usePathname();
  const base = pathname.split("/").filter(Boolean)[0] === "company"
    ? "/company/dashboard"
    : `/${pathname.split("/").filter(Boolean)[0]}`;

  const [talents, setTalents] = useState<TalentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // 인재 검색과 같은 API 를 쓴다(scrapped=1). 목록이 두 벌이면 곧 어긋난다.
  const 불러오기 = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await companyTalentApi.list({ scrapped: true, limit: 200 });
      if (res?.success) {
        setTalents(res.data || []);
      }
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
      setTalents(prev => prev.filter(x => x.id !== t.id));
    } catch (e) {
      console.error(e);
    }
  };


  const filtered = talents.filter(t =>
    !search
    || (t.name || "").includes(search)
    || (t.mainJobGroup || "").includes(search)
    || (t.subJob || "").includes(search)
  );

  return (
    <CompanyLayout activePage="scrapped">
      <div style={{ width: "100%" }}>
        <div className="admin-search-wrap" style={{ maxWidth: 400, marginBottom: 12 }}>
          <Search size={16} className="admin-search-icon" />
          <input className="admin-search-input" placeholder="이름, 직군 검색"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div style={{ fontSize: 14, color: "#888", margin: "0 0 8px" }}>총 <strong style={{ color: "#1a1a1a" }}>{filtered.length}</strong>명</div>

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

    </CompanyLayout>
  );
}
