"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, MapPin, ChevronDown } from "lucide-react";
import RegionSelectModal from "@/components/RegionSelectModal";
import { useAuthStore } from "@/lib/store/authStore";

const shortSido = (s: string) =>
  s.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, "");

export default function HeroMobile() {
  const router = useRouter();
  const [jobType, setJobType] = useState<"기업" | "매장">("기업");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const { isLoggedIn, ownerType } = useAuthStore();

  // 로그인(개인회원) 시 프로필의 직군·희망지역을 검색바 기본값으로 자동 채움
  useEffect(() => {
    if (!isLoggedIn || ownerType !== "user") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        const u = res.data || res;
        if (u?.job_type === "OFFICE") setJobType("기업");
        else if (u?.job_type === "STORE") setJobType("매장");
        if (Array.isArray(u?.preferred_regions)) {
          const regions = u.preferred_regions
            .filter((r: any) => r.sido && r.sido !== "지역 무관")
            .map((r: any) => (r.sigungu ? `${r.sido} ${r.sigungu}` : `${r.sido} 전체`));
          if (regions.length) setSelected(regions);
        }
      })
      .catch(() => {});
  }, [isLoggedIn, ownerType]);

  const regionLabel = (() => {
    if (selected.length === 0) return "지역 전체";
    const first = selected[0].split(" ").map((p, i) => i === 0 ? shortSido(p) : p).join(" ");
    return selected.length === 1 ? first : `${first} 외 ${selected.length - 1}`;
  })();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("type", jobType);
    if (selected.length) params.set("regions", selected.join(","));
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    router.push(`/jobs?${params.toString()}`);
  };

  return (
    <section className="hero-m">

      <div className="hero-m-banner">
        <span className="hero-m-banner-ad">AD</span>
        <p className="hero-m-banner-text">🎀 뷰티앤잡 × 아모레퍼시픽 — 봄 채용 시즌 공개!</p>
        <Link href="/jobs" className="hero-m-banner-link">보기 →</Link>
      </div>

      <div className="hero-m-title-wrap">
        <h1 className="hero-m-title">
          뷰티 커리어의 시작,<br />
          <span className="hero-m-title-point">뷰티앤잡</span>
        </h1>
      </div>

      <p className="hero-m-search-label">어떤 일자리를 찾으세요?</p>

      <div className="hero-m-toggle">
        {(["기업", "매장"] as const).map((t) => (
          <button key={t} type="button"
            className={`hero-m-toggle-btn ${jobType === t ? "active" : ""}`}
            onClick={() => setJobType(t)}>
            {t === "기업" ? "🏢 사무직" : "🏪 매장직"}
          </button>
        ))}
      </div>

      <form className="hero-m-search-wrap" onSubmit={handleSearch}>
        <div className="hero-m-searchbar">
          <button type="button"
            className={`hero-m-region-btn ${selected.length ? "active" : ""}`}
            onClick={() => setModalOpen(true)}>
            <MapPin size={14} />
            <span>{regionLabel}</span>
            <ChevronDown size={13} />
          </button>
          <span className="hero-m-divider" />
          <input className="hero-m-input" type="text"
            placeholder={jobType === "매장" ? "헤어, 네일, 실장…" : "마케터, MD, 영업…"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} />
          <button type="submit" className="hero-m-search-btn">
            <Search size={18} />
          </button>
        </div>
      </form>

      <div className="hero-m-ai-wrap">
        <div className="hero-m-ai-header">
          <span>🔥</span>
          <span className="hero-m-ai-title">뷰티앤잡 런칭 이벤트 · 지금은 완전 무료 (~12/31)</span>
        </div>
        <div className="hero-m-ai-cards">
          <Link href="/jobseeker" className="hero-m-ai-card">
            <div className="hero-m-ai-card-icon">📄</div>
            <strong>이력서 등록하면<br />먼저 연락와요</strong>
            <p>등록만 해두면 매장·기업이 먼저 제안하고, 내 이력서가 검색 맨 위에 노출돼요</p>
            <span className="hero-m-ai-card-btn">무료 이력서 등록하기 ›</span>
          </Link>
          <Link href="/company" className="hero-m-ai-card">
            <div className="hero-m-ai-card-icon">📊</div>
            <strong>공고 올리면<br />인재가 바로 보여요</strong>
            <p>공고 등록도, 상단 노출도, 인재 연락처 열람도 지금은 전부 0원</p>
            <span className="hero-m-ai-card-btn">채용공고 등록하기 ›</span>
          </Link>
        </div>
      </div>

      <RegionSelectModal
        open={modalOpen}
        initial={selected}
        onClose={() => setModalOpen(false)}
        onApply={setSelected}
      />

    </section>
  );
}
