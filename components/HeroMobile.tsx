"use client";
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, MapPin, ChevronDown, Megaphone, Zap } from "lucide-react";
import RegionSelectModal from "@/components/RegionSelectModal";
import { useAuthStore } from "@/lib/store/authStore";
import ResumeCta from "@/components/ResumeCta";

const shortSido = (s: string) =>
  s.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, "");

export default function HeroMobile() {
  const router = useRouter();
  // PC 히어로와 같이 매장/오피스 두 갈래만. 넘어가는 채용공고 화면에 '전체'가
  // 없으므로 여기서 고르게 해 두면 약속을 어기게 된다.
  const [jobType, setJobType] = useState<"오피스" | "매장">("매장");
  const [searchQuery, setSearchQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const { isLoggedIn, ownerType } = useAuthStore();
  // 검색창 바로 아래 한 줄씩 — 공지 최신 1건, 채용속보(가장 방금 올라온 공고) 1건.
  const [notice, setNotice] = useState<{ href: string; title: string } | null>(null);
  const [flash, setFlash] = useState<{ href: string; title: string } | null>(null);

  useEffect(() => {
    fetch("/api/notices?type=notice").then((r) => r.json()).then((r) => {
      const n = r?.data?.[0];
      if (n) setNotice({ href: `/notice/${n.id}`, title: n.short_title || n.title });
    }).catch(() => {});
    fetch("/api/jobs?limit=1&nosample=1&sort=new").then((r) => r.json()).then((r) => {
      const j = r?.data?.[0];
      if (j) setFlash({ href: `/jobs/${j.id}`, title: j.title });
    }).catch(() => {});
  }, []);

  // 로그인(개인회원) 시 프로필의 직군·희망지역을 검색바 기본값으로 자동 채움
  useEffect(() => {
    if (!isLoggedIn || ownerType !== "user") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        const u = res.data || res;
        setJobType(u?.job_type === "OFFICE" ? "오피스" : "매장");
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

      <Link href="/event" className="hero-m-banner">
        <img src="/images/event/오픈이벤트-모바일배너-사진.png" alt="" className="hero-m-banner-photo" />
        <div className="hero-m-banner-fade" />
        <div className="hero-m-banner-body">
          <span className="hero-m-banner-eyebrow">BEAUTYWORK OPEN EVENT</span>
          <strong className="hero-m-banner-title">10월 오픈 기념</strong>
          <div className="hero-m-banner-desc">
            <div>이력서 등록하면 5,000원 커피쿠폰</div>
            <div>무료 공고 등록하고 선착순 상단 노출</div>
          </div>
          <div className="hero-m-banner-period">
            <span>이벤트 기간</span>
            <span>2026.10.12(월) ~ 11.30(월)</span>
          </div>
        </div>
      </Link>

      <p className="hero-m-search-label">어떤 일자리를 찾으세요?</p>

      <div className="hero-m-toggle">
        {(["매장", "오피스"] as const).map((t) => (
          <button key={t} type="button"
            className={`hero-m-toggle-btn ${jobType === t ? "active" : ""}`}
            onClick={() => setJobType(t)}>
            {t === "오피스" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><OfficeIcon size={15} style={{ flexShrink: 0 }} />오피스</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StoreIcon size={15} style={{ flexShrink: 0 }} />매장</span>}
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
            placeholder={jobType === "매장" ? "헤어, 네일, 실장…" : jobType === "오피스" ? "마케터, MD, 영업…" : "지역, 직무, 회사명…"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} />
          <button type="submit" className="hero-m-search-btn">
            <Search size={18} />
          </button>
        </div>
      </form>

      {/* 내 주변 공고 보기는 하단 탭(「내 주변」)이 같은 길을 이미 맡고 있어
          여기서는 걷는다 — 같은 문이 두 자리에 있을 필요가 없다. */}
      {notice && (
        <Link href={notice.href} className="hero-m-ticker">
          <span className="hero-m-ticker-tag notice"><Megaphone size={12} /> 공지</span>
          <span className="hero-m-ticker-text">{notice.title}</span>
          <span className="hero-m-ticker-go">›</span>
        </Link>
      )}
      {flash && (
        <Link href={flash.href} className="hero-m-ticker">
          <span className="hero-m-ticker-tag flash"><Zap size={12} /> 채용속보</span>
          <span className="hero-m-ticker-text">{flash.title}</span>
          <span className="hero-m-ticker-go">›</span>
        </Link>
      )}
      <Link href="/support/faq" className="hero-m-ticker">
        <span className="hero-m-ticker-tag info">처음오셨나요?</span>
        <span className="hero-m-ticker-text">자주묻는 질문</span>
        <span className="hero-m-ticker-go">›</span>
      </Link>

      <div className="hero-m-ai-wrap">
        <div className="hero-m-ai-header">
          <span>🔥</span>
          <span className="hero-m-ai-title">10월 오픈 기념</span>
        </div>
        <div className="hero-m-ai-cards">
          <ResumeCta className="hero-m-ai-card">
            <span className="hero-m-ai-card-label">개인회원</span>
            <strong>좋은 일자리를 찾고 계신가요?</strong>
            <p>이력서를 등록하고 새로운 기회를 만나보세요.</p>
            <span className="hero-m-ai-card-btn">이력서 등록하기 →</span>
          </ResumeCta>
          <Link href="/company" className="hero-m-ai-card">
            <span className="hero-m-ai-card-label">기업회원</span>
            <strong>좋은 인재를 찾고 계신가요?</strong>
            <p>채용공고를 등록하고 필요한 인재를 만나보세요.</p>
            <span className="hero-m-ai-card-btn">채용공고 등록하기 →</span>
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