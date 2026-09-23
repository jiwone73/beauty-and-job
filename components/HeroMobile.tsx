"use client";
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ChevronDown } from "lucide-react";
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
    // type 을 notice 로만 좁히면 "공지" 글이 없는 동안(지금처럼) 늘 빈다 —
    // 발행된 공지·이벤트 글 중 맨 위(고정 우선 · 최신순) 하나를 그대로 쓴다.
    fetch("/api/notices").then((r) => r.json()).then((r) => {
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
          <strong className="hero-m-banner-title">뷰티워크 10월 오픈 기념 이벤트</strong>
          <div className="hero-m-banner-desc">
            <div>무료 5,000원 커피쿠폰</div>
            <div>무료 선착순 상단노출</div>
          </div>
          <div className="hero-m-banner-period">
            <span>이벤트 기간</span>
            <span>2026.10.12(월) ~ 11.30(월)</span>
            <span className="hero-m-banner-note">소진 시 조기 종료될 수 있습니다</span>
          </div>
        </div>
      </Link>

      <p className="hero-m-search-label">어떤 일자리를 찾으세요?</p>

      {/* 매장/오피스·검색창은 한 가지 일(검색)이라 박스 하나. 공지 이하는
          별개 묶음이라 살짝 뗀 아래 박스에 — 행 사이는 가는 선으로만 나눈다. */}
      <div className="hero-m-module">
        <div className="hero-m-toprow">
          {(["매장", "오피스"] as const).map((t) => (
            <button key={t} type="button"
              className={`hero-m-toggle-btn ${jobType === t ? "active" : ""}`}
              onClick={() => setJobType(t)}>
              {t === "오피스" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><OfficeIcon size={15} style={{ flexShrink: 0 }} />오피스</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StoreIcon size={15} style={{ flexShrink: 0 }} />매장</span>}
            </button>
          ))}
        </div>
        <div className="hero-m-hdivider" />
        <form className="hero-m-searchbar" onSubmit={handleSearch}>
          <button type="button"
            className={`hero-m-region-btn ${selected.length ? "active" : ""}`}
            onClick={() => setModalOpen(true)}>
            <span>{regionLabel}</span>
            <ChevronDown size={13} />
          </button>
          <span className="hero-m-vdivider" />
          <input className="hero-m-input" type="text"
            placeholder={jobType === "매장" ? "헤어·바버, 메이크업, 네일, 속눈썹…" : jobType === "오피스" ? "기획·MD, 마케팅·콘텐츠, 영업·유통…" : "지역, 직무, 회사명…"}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)} />
          <button type="submit" className="hero-m-search-btn">
            <Search size={18} />
          </button>
        </form>
      </div>

      <div className="hero-m-module hero-m-module-gap">
        {notice && (
          <>
            <Link href={notice.href} className="hero-m-ticker-card">
              <span className="hero-m-ticker-tag">공지</span>
              <span className="hero-m-ticker-sep">|</span>
              <span className="hero-m-ticker-text">{notice.title}</span>
            </Link>
            <div className="hero-m-hdivider" />
          </>
        )}
        {flash && (
          <>
            <Link href={flash.href} className="hero-m-ticker-card">
              <span className="hero-m-ticker-tag">채용속보</span>
              <span className="hero-m-ticker-sep">|</span>
              <span className="hero-m-ticker-text">{flash.title}</span>
            </Link>
            <div className="hero-m-hdivider" />
          </>
        )}
        <div className="hero-m-ai-cards">
          <ResumeCta className="hero-m-ai-card">
            <span className="hero-m-ai-card-label">개인회원</span>
            <span className="hero-m-ai-card-action">이력서 등록 &gt;</span>
          </ResumeCta>
          <Link href="/company" className="hero-m-ai-card">
            <span className="hero-m-ai-card-label">기업회원</span>
            <span className="hero-m-ai-card-action">공고 등록 &gt;</span>
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