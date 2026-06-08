"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, MapPin, ChevronDown, X, Check } from "lucide-react";
import { SIDO_LIST, getSigunguList } from "@/lib/data/regions";

export default function HeroMobile() {
  const router = useRouter();
  const [jobType, setJobType] = useState<"기업" | "매장">("기업");
  const [searchQuery, setSearchQuery] = useState("");

  // 지역 모달
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSido, setActiveSido] = useState(SIDO_LIST[0]);
  // 확정된 선택값: ["서울특별시 강남구", "경기도 전체", ...]
  const [selected, setSelected] = useState<string[]>([]);
  // 모달 작업용 임시 선택값
  const [draft, setDraft] = useState<string[]>([]);

  const openModal = () => {
    setDraft(selected);
    setActiveSido(SIDO_LIST[0]);
    setModalOpen(true);
  };

  const toggleItem = (sido: string, gugun: string) => {
    const key = `${sido} ${gugun}`;
    setDraft((prev) => {
      if (gugun === "전체") {
        // 전체 선택 시 해당 시도의 개별 구군 제거 + 전체 토글
        const withoutSido = prev.filter((x) => !x.startsWith(`${sido} `));
        const wasAll = prev.includes(key);
        return wasAll ? withoutSido : [...withoutSido, key];
      }
      // 개별 구군: 전체가 켜져있으면 전체 해제하고 이 구군만
      const withoutAll = prev.filter((x) => x !== `${sido} 전체`);
      return withoutAll.includes(key)
        ? withoutAll.filter((x) => x !== key)
        : [...withoutAll, key];
    });
  };

  const countForSido = (sido: string) =>
    draft.filter((x) => x.startsWith(`${sido} `)).length;

  const applyRegions = () => {
    setSelected(draft);
    setModalOpen(false);
  };

  // 버튼 표시 텍스트
  const regionLabel = (() => {
    if (selected.length === 0) return "지역 전체";
    const first = selected[0].split(" ").pop();
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

  const sigunguOptions = ["전체", ...getSigunguList(activeSido)];

  return (
    <section className="hero-m">

      {/* 배너 */}
      <div className="hero-m-banner">
        <span className="hero-m-banner-ad">AD</span>
        <p className="hero-m-banner-text">🎀 뷰티앤잡 × 아모레퍼시픽 — 봄 채용 시즌 공개!</p>
        <Link href="/jobs" className="hero-m-banner-link">보기 →</Link>
      </div>

      {/* 타이틀 */}
      <div className="hero-m-title-wrap">
        <h1 className="hero-m-title">
          뷰티 커리어의 시작,<br />
          <span className="hero-m-title-point">뷰티앤잡</span>
        </h1>
      </div>

      {/* 검색 라벨 */}
      <p className="hero-m-search-label">어떤 일자리를 찾으세요?</p>

      {/* 기업/매장 토글 */}
      <div className="hero-m-toggle">
        {(["기업", "매장"] as const).map((t) => (
          <button key={t} type="button"
            className={`hero-m-toggle-btn ${jobType === t ? "active" : ""}`}
            onClick={() => setJobType(t)}>
            {t === "기업" ? "🏢 사무직" : "🏪 매장직"}
          </button>
        ))}
      </div>

      {/* 검색 영역 (2줄: 지역버튼 + 키워드) */}
      <form className="hero-m-search-wrap" onSubmit={handleSearch}>
        <div className="hero-m-search-row">
          <button type="button"
            className={`hero-m-region-btn ${selected.length ? "active" : ""}`}
            onClick={openModal}>
            <MapPin size={15} />
            <span>{regionLabel}</span>
            <ChevronDown size={14} />
          </button>
          <div className="hero-m-search">
            <input className="hero-m-input" type="text"
              placeholder={jobType === "매장" ? "헤어 디자이너, 네일리스트…" : "마케터, MD, 영업…"}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} />
            <button type="submit" className="hero-m-search-btn">
              <Search size={18} />
            </button>
          </div>
        </div>
      </form>

      {/* 프로모션 카드 */}
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

      {/* 지역 선택 모달 */}
      {modalOpen && (
        <div className="region-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="region-modal" onClick={(e) => e.stopPropagation()}>
            <div className="region-modal-head">
              <span className="region-modal-spacer" />
              <span className="region-modal-title">지역 선택</span>
              <button type="button" className="region-modal-close" onClick={() => setModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="region-modal-body">
              {/* 시도 목록 */}
              <div className="region-sido-col">
                {SIDO_LIST.map((s) => {
                  const cnt = countForSido(s);
                  return (
                    <button key={s} type="button"
                      className={`region-sido-item ${activeSido === s ? "active" : ""}`}
                      onClick={() => setActiveSido(s)}>
                      <span>{s.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, "")}</span>
                      {cnt > 0 && <span className="region-sido-badge">{cnt}</span>}
                    </button>
                  );
                })}
              </div>

              {/* 구군 목록 */}
              <div className="region-gugun-col">
                {sigunguOptions.map((g) => {
                  const checked = draft.includes(`${activeSido} ${g}`);
                  return (
                    <button key={g} type="button"
                      className="region-gugun-item"
                      onClick={() => toggleItem(activeSido, g)}>
                      <span className={`region-check ${checked ? "on" : ""}`}>
                        {checked && <Check size={12} />}
                      </span>
                      <span className={g === "전체" ? "region-gugun-all" : ""}>{g}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="region-modal-foot">
              <button type="button" className="region-apply-btn" onClick={applyRegions}>
                적용하기
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}