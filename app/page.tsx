"use client";
import Image from "next/image";
import { jobCompanyName } from "@/lib/companyName";
import Link from "next/link";
import Header from "@/components/Header";
import HeroMobile from "@/components/HeroMobile";
import RegionSelectModal from "@/components/RegionSelectModal";
import { workTypeLabel } from "@/lib/constants";
import { SIDO_LIST, getSigunguList } from "@/lib/data/regions";
import { STORE_JOB_GROUPS, OFFICE_JOB_GROUPS } from "@/lib/data/jobGroups";
import { useEffect, useState } from "react";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { useApplicationStore } from "@/lib/store/applicationStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { useSignupStore } from "@/lib/store/signupStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Bookmark,
  Sparkles,
  MapPin,
  ChevronDown, Rocket, Coffee, TrendingUp, Megaphone, Gift } from "lucide-react";
import ResumeCta from "@/components/ResumeCta";
import JobCard from "@/components/JobCard";
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";
import { formatDeadline, expLevelLabel } from "@/lib/jobFormat";
/* ============================================
   공통 유틸
   ============================================ */
function mapJob(j: any) {
  return {
    id: j.id,
    title: j.title,
    company: jobCompanyName(j.company_type || j.job_type, j.company_name, j.brand_name),
    region: j.location || "협의",
    career: expLevelLabel(j.experience_level),
    employment: j.employment_type || null,
    deadline: formatDeadline(j.deadline),
    image: (Array.isArray(j.cover_images) && j.cover_images[0]?.url) || j.logo_url || (Array.isArray(j.detail_images) && j.detail_images[0]?.url) || null,
  };
}

export default function HomePage() {
  useEffect(() => {
    useBookmarkStore.getState().loadFromServer();
  }, []);
  return (
    <main className="main-page">
      <Header />
      <MobileDetector />
      <SectionActiveHiring />
      <SectionPick />
      {/* <SectionJobGroups /> 공고 충분히 쌓이면 노출 */}
      <SectionStories />
      {/* <SectionBeautyServices /> 숨김 */}
      <Footer />
    </main>
  );
}

/* ============================================
   히어로 섹션
   ============================================ */
function MobileDetector() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile ? <HeroMobile /> : <Hero />;
}

function Hero() {
  const router = useRouter();
  const { isLoggedIn, ownerType } = useAuthStore();
  const [selected, setSelected] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [jobType, setJobType] = useState<"전체" | "본사" | "매장">("전체");
  const shortSido = (s: string) => s.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, "");

  // 로그인(개인회원) 시 프로필의 직군·희망지역을 검색바 기본값으로 자동 채움
  useEffect(() => {
    if (!isLoggedIn || ownerType !== "user") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        const u = res.data || res;
        if (u?.job_type === "OFFICE") setJobType("본사");
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
  const regionLabel = selected.length === 0
    ? "지역 전체"
    : (() => {
        const first = selected[0].split(" ").map((p, i) => i === 0 ? shortSido(p) : p).join(" ");
        return selected.length === 1 ? first : `${first} 외 ${selected.length - 1}`;
      })();
  // 배너·공지·속보는 모두 서버에서 받아온다. 코드에 문구를 박아 두면
  // 바꿀 때마다 배포해야 하고, PC·모바일이 따로 놀기 시작한다.
  const [이벤트, set이벤트] = useState<any>(null);
  const [공지, set공지] = useState<any>(null);
  const [속보, set속보] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/notices")
      .then((r) => r.json())
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        set이벤트(list.find((n: any) => n.type === "event") || null);
        set공지(list.find((n: any) => n.type !== "event") || null);
      })
      .catch(() => {});
    fetch("/api/jobs?limit=8")
      .then((r) => r.json())
      .then((res) => { if (Array.isArray(res?.data)) set속보(res.data); })
      .catch(() => {});
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (jobType !== "전체") params.set("type", jobType);
    if (selected.length) params.set("regions", selected.join(","));
    if (searchQuery.trim()) params.set("q", searchQuery.trim());
    router.push(`/jobs${params.toString() ? "?" + params.toString() : ""}`);
  };

  return (
    <section className="mainTop">
      <div className="container">

        {/* 1. 사진 배너 — 1320x190. 문구는 공지에서 받아 관리자가 고칠 수 있다. */}
        <Link href={이벤트 ? `/event?open=${이벤트.id}` : "/company"} className="mt-hero">
          <span className="mt-hero-photo" />
          <span className="mt-hero-in">
            <span className="mt-eyebrow">BEAUTYWORK OPEN</span>
            <span className="mt-hero-h">뷰티 커리어의 시작,<br /><b>뷰티워크</b></span>
            <span className="mt-hero-sub">{이벤트?.title || "10월 1일 오픈 · 채용공고와 이력서 등록을 무료로 이용하세요."}</span>
          </span>
        </Link>

        {/* 2. 일자리 찾기 블록 */}
        <div className="mt-jobs">
          <div className="mt-cols">
            <div className="mt-card">
              <form onSubmit={handleSearch} onClick={(e) => e.stopPropagation()}>
                <h2 className="mt-jobs-h">살롱·샵 현장직부터 브랜드 본사까지,<br /><b>뷰티업계 일자리를 한곳에서</b></h2>
                <p className="mt-ask">어떤 일자리를 찾으세요?</p>
                {/* 무엇을 찾을지 고르고(토글), 그게 뭔지 읽고(설명), 치는
                    칸(검색바)까지가 한 동작이다. 사이가 벌어지면 셋이 따로
                    노는 것처럼 보인다. 묶어서 붙여 둔다. */}
                <div className="mt-search-set">
                  <div className="hero-type-toggle">
                    <button type="button" className={`hero-type-btn ${jobType === "전체" ? "active" : ""}`} onClick={() => setJobType("전체")}>전체</button>
                    <button type="button" className={`hero-type-btn ${jobType === "매장" ? "active" : ""}`} onClick={() => setJobType("매장")}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StoreIcon size={14} style={{ flexShrink: 0 }} />매장</span>
                    </button>
                    <button type="button" className={`hero-type-btn ${jobType === "본사" ? "active" : ""}`} onClick={() => setJobType("본사")}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><OfficeIcon size={14} style={{ flexShrink: 0 }} />본사</span>
                    </button>
                  </div>
                  {/* 매장의 반대쪽은 긍정형으로 정의된 범주가 아니라 '매장이
                      아닌 곳'이라는 잔여 범주다. 그래서 라벨 한 단어로는 어느
                      말을 골라도 무언가가 새어 나간다 — '기업'은 매장도 기업이라
                      틀린 대립을 만들고(게다가 기업회원은 매장을 품는 윗 단계라
                      한 화면에서 같은 말이 두 뜻이 된다), '오피스'는 제조 QC와
                      아카데미 강사가 사무실에서 일하지 않아 정작 그들을 밀어낸다.

                      그래서 라벨은 매장과 짝이 굳어진 '본사'로 두고, 못 담는
                      나머지는 이 설명 줄이 맡는다. 고정 안내문은 읽히지 않으므로
                      고른 쪽에 따라 바뀌게 해 고르는 순간에 알려 준다. 두 설명
                      모두 '어디서 근무하는가' 한 축으로 갈라야 나란히 놓고 자기
                      자리를 짚을 수 있다. */}
                  <p className="mt-type-desc">
                    {jobType === "매장" ? "살롱·샵 등 매장에서 근무하는 직군이에요"
                      : jobType === "본사" ? "브랜드·제조·유통·교육·협력사 등 매장이 아닌 곳에서 근무하는 직군이에요"
                      : "매장과 본사 공고를 함께 봅니다"}
                  </p>
                  <div className="hero-searchbar-v2">
                    <button type="button" className={`hero-region-trigger ${selected.length ? "active" : ""}`} onClick={() => setModalOpen(true)}>
                      <MapPin size={16} /><span>{regionLabel}</span><ChevronDown size={15} />
                    </button>
                    <span className="hero-searchbar-divider" />
                    <input className="hero-search-input-v2" type="text"
                      placeholder={jobType === "매장" ? "헤어 디자이너, 네일리스트, 실장…"
                        : jobType === "본사" ? "마케터, MD, 뷰티 연구원…" : "지역, 직무, 매장명으로 검색"}
                      value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    <button type="submit" className="hero-search-btn-v2" aria-label="검색"><Search size={20} /></button>
                  </div>
                </div>
              </form>
              <RegionSelectModal open={modalOpen} initial={selected} onClose={() => setModalOpen(false)} onApply={setSelected} />
            </div>

            {/* 오른쪽은 한 줄로 세운다 — 위는 공지, 아래는 이벤트.
                이벤트는 받는 사람이 갈리므로 개인회원·기업회원을 나란히 둔다. */}
            <div className="mt-right">
              {/* 공지가 한 줄인데 카드에 두 줄 자리를 주면 제목 뒤로 450px 가
                  빈다. 내용이 없어서가 아니라 자리를 크게 잡아서다. 딱지를
                  제목 앞에 붙여 한 줄로 눕히고, 남는 높이는 담을 것이 많은
                  아래 이벤트 카드가 가져간다. */}
              <div className="mt-card mt-nc">
                <Link href="/notice" className="mt-nc-tag">
                  <Megaphone size={17} className="mt-ic" />공지
                </Link>
                <Link href={공지 ? `/notice?open=${공지.id}` : "/notice"} className="mt-notice">
                  <span className="nt">{공지?.title || "뷰티워크 서비스 무료 이용 안내"}</span>
                  <span className="mt-evt-more">자세히 보기 ›</span>
                </Link>
              </div>

              <div className="mt-card mt-evt">
                <div className="mt-chead">
                  <Link href="/event" className="t"><Gift size={17} className="mt-ic" />이달의 이벤트</Link>
                  {/* 언제 왜 주는지는 두 혜택에 공통이다. 줄마다 되풀이하지 않고
                      제목 옆에 한 번만 둔다. */}
                  <span className="mt-evt-when">10월 오픈 기념</span>
                </div>
                <div className="mt-evt-list">
                  <div className="mt-evt-item">
                    <div className="mt-evt-top">
                      <span className="mt-evt-who">개인회원</span>
                      <ResumeCta className="mt-evt-btn">이력서 등록하기</ResumeCta>
                    </div>
                    <div className="mt-evt-row">
                      <span className="mt-evt-ic"><Coffee size={19} /></span>
                      <span className="mt-evt-txt">
                        <span className="mt-evt-l">이력서를 등록하면</span>
                        <span className="mt-evt-t">무료 메가MGC 커피</span>
                        <span className="mt-evt-s">2,000원 쿠폰 지급</span>
                      </span>
                      <Link href={이벤트 ? `/event?open=${이벤트.id}` : "/event"} className="mt-evt-more">자세히 보기 ›</Link>
                    </div>
                  </div>
                  <div className="mt-evt-item">
                    <div className="mt-evt-top">
                      <span className="mt-evt-who">기업회원</span>
                      <button
                        type="button"
                        className="mt-evt-btn"
                        onClick={() => router.push(
                          isLoggedIn && ownerType === "company" ? "/company/dashboard/jobs/new" : "/company/login"
                        )}
                      >
                        채용공고 등록하기
                      </button>
                    </div>
                    <div className="mt-evt-row">
                      <span className="mt-evt-ic"><TrendingUp size={19} /></span>
                      <span className="mt-evt-txt">
                        <span className="mt-evt-l">채용공고를 등록하면</span>
                        <span className="mt-evt-t">무료 상단 노출</span>
                        <span className="mt-evt-s">먼저 올린 순서대로 · 10월 1일부터</span>
                      </span>
                      <Link href={이벤트 ? `/event?open=${이벤트.id}` : "/event"} className="mt-evt-more">자세히 보기 ›</Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. 채용속보 — 공고명이 왼쪽으로 흐른다. 긴 제목도 자르지 않는다. */}
        {속보.length > 0 && (
          <div className="mt-ticker">
            <span className="mt-tk-l"><span className="mt-dot" />채용속보</span>
            <span className="mt-tk-view">
              <span className="mt-tk-track">
                {[...속보, ...속보].map((j, i) => (
                  <Link key={`${j.id}-${i}`} href={`/jobs/${j.id}`} className="mt-tk-item">
                    <i>NEW</i>{j.company_name ? `${j.company_name} · ` : ""}{j.title}
                  </Link>
                ))}
              </span>
            </span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================================
   섹션 1: 뷰티워크 추천 공고<span style={{ display: "inline-block", marginLeft: 8, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: "#5f0080", background: "#f3eafa", verticalAlign: "middle" }}>📊 직군 맞춤 선별</span>
   ============================================ */
/* ============================================
   섹션: 지금 적극 채용 중
   ============================================ */
function SectionActiveHiring() {
  const [jobs, setJobs] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/jobs?active=1&limit=4")
      .then((r) => r.json())
      .then((res) => { if (res.success && Array.isArray(res.data)) setJobs(res.data); else setJobs([]); })
      .catch(console.error);
  }, []);
  const mappedJobs = jobs.map(mapJob);
  if (mappedJobs.length === 0) return null;
  return (
    <section className="section section-divider">
      <div className="container">
        <div className="section-inner-divider" style={{ marginBottom: "48px" }} />
        <div className="section-head">
          <div>
            <h2 className="section-title">🔥 지금 적극 채용 중<span style={{ display: "inline-block", marginLeft: 8, padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: "#5f0080", background: "#f3eafa", verticalAlign: "middle" }}>📊 데이터 기반 선별</span></h2>
            <p className="section-sub">여러 채용 지표를 분석해, 지금 가장 적극적으로 채용 중인 곳만 엄선했어요</p>
          </div>
          
        </div>
        <div className="card-grid card-grid-4">
          {mappedJobs.map((job: any) => (
            <JobCard key={job.id} data={job} variant="grid" />
          ))}
        </div>
      </div>
    </section>
  );
}

function SectionPick() {
  const [tab, setTab] = useState<"전체" | "매장" | "본사">("전체");
  const [jobs, setJobs] = useState<any[]>([]);
  // 이력서를 근거로 점수를 매길 수 있었는지. 근거가 없으면 '추천'이라 부르지 않는다 —
  // 최신순을 추천이라 내놓으면 한 번 보고 다시 안 본다.
  const [맞춤, set맞춤] = useState(false);
  useEffect(() => {
    const jt = tab === "매장" ? "&job_type=STORE" : tab === "본사" ? "&job_type=OFFICE" : "";
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    fetch(`/api/jobs/recommended?limit=4${jt}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      .then((r) => r.json())
      .then((res) => {
        const d = res?.data;
        if (res.success && Array.isArray(d?.items)) { setJobs(d.items); set맞춤(!!d.personalized); }
        else { setJobs([]); set맞춤(false); }
      })
      .catch(console.error);
  }, [tab]);
  const mappedJobs = jobs.map(mapJob);
  const seeAll = tab === "매장" ? "/jobs?type=매장" : tab === "본사" ? "/jobs?type=본사" : "/jobs";
  return (
    <section className="section section-divider">
      <div className="container">
        <div className="section-inner-divider" style={{ marginBottom: "48px" }} />
        <div className="section-head">
          <div>
            <h2 className="section-title">
              <Sparkles size={24} className="title-icon" />
              {맞춤 ? "뷰티워크 추천 공고" : "최신 채용공고"}
            </h2>
            <p className="section-sub">
              {맞춤
                ? "내 직군·지역·경력과 스크랩한 곳을 함께 보고 골랐어요"
                : "이력서를 등록하면 나에게 맞는 공고를 골라드려요"}
            </p>
          </div>
          <Link href={seeAll} className="see-all">전체보기</Link>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div className="hero-type-toggle">
            {(["전체", "매장", "본사"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`hero-type-btn ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "매장" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StoreIcon size={14} style={{ flexShrink: 0 }} />매장</span> : t === "본사" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><OfficeIcon size={14} style={{ flexShrink: 0 }} />본사</span> : t}
              </button>
            ))}
          </div>
        </div>

        {mappedJobs.length === 0 ? (
          <p className="empty-state">등록된 공고가 없습니다.</p>
        ) : (
          <div className="card-grid card-grid-4">
            {mappedJobs.map((job: any) => (
              <JobCard key={job.id} data={job} variant="grid" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}



/* ============================================
   섹션: 추천 뷰티 서비스
   ============================================ */
const BEAUTY_SERVICES = [
  { id: 1, emoji: "🎓", name: "뷰티 자격증 과정", desc: "헤어·피부·메이크업 국가자격증 취득 과정", company: "뷰티스쿨 A", tag: "교육" },
  { id: 2, emoji: "🔧", name: "미용 장비 렌탈", desc: "살롱 오픈에 필요한 장비를 합리적으로", company: "장비사 B", tag: "장비" },
  { id: 3, emoji: "📦", name: "살롱 용품 도매", desc: "시술에 필요한 소모품을 한 곳에서", company: "용품사 C", tag: "용품" },
  { id: 4, emoji: "💻", name: "예약관리 솔루션", desc: "소규모 샵도 쉽게 쓰는 예약·고객 관리", company: "서비스사 D", tag: "운영" },
];
function SectionBeautyServices() {
  return (
    <section className="section section-divider" style={{ marginTop: "-40px" }}>
      <div className="container">
        <div className="section-inner-divider" style={{ marginBottom: "48px" }} />
        <div className="section-head">
          <div>
            <h2 className="section-title">
              추천 뷰티 서비스
              <span className="ad-label">광고</span>
            </h2>
            <p className="section-sub">교육·장비·용품·운영 서비스 광고</p>
          </div>
        </div>
        <div className="card-grid card-grid-4">
          {BEAUTY_SERVICES.map((s) => (
            <div key={s.id} className="service-card">
              <div className="service-emoji">{s.emoji}</div>
              <span className="service-tag">{s.tag}</span>
              <h3 className="service-name">{s.name}</h3>
              <p className="service-desc">{s.desc}</p>
              <p className="service-company">{s.company}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   섹션: 이야기
   ============================================ */
const STORY_EMOJI: Record<string, string> = {
  "공감": "💬", "꿀팁": "💡", "질문": "❓", "정보": "📌",
};
function fmtStoryDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}
/* ============================================
   섹션: 직무별 채용 바로가기
   ============================================ */
function SectionJobGroups() {
  const [tab, setTab] = useState<"매장" | "본사">("매장");
  const groups = tab === "매장" ? STORE_JOB_GROUPS : OFFICE_JOB_GROUPS;
  return (
    <section className="section section-divider">
      <div className="container">
        <div className="section-inner-divider" style={{ marginBottom: "48px" }} />
        <div className="section-head">
          <div>
            <h2 className="section-title">직무별 채용 바로가기</h2>
            <p className="section-sub">찾는 직무를 눌러 바로 확인해보세요</p>
          </div>
        </div>
        <div className="seg">
          {(["매장", "본사"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`seg-btn ${tab === t ? "active" : ""}`}>
              {t === "매장" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StoreIcon size={15} style={{ flexShrink: 0 }} />매장</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><OfficeIcon size={15} style={{ flexShrink: 0 }} />본사</span>}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {groups.map((g) => (
            <Link key={g.group}
              href={`/jobs?type=${tab}&group=${encodeURIComponent(g.group)}`}
              style={{
                padding: "10px 18px", borderRadius: 10, fontSize: 14, fontWeight: 500,
                border: "1px solid #eadcf3", background: "#faf5ff", color: "#5f0080",
                textDecoration: "none",
              }}>
              {g.group}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
function SectionStories() {
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/community/posts?limit=4")
      .then((r) => r.json())
      .then((res) => { if (res.success && Array.isArray(res.data)) setItems(res.data); })
      .catch(() => {});
  }, []);
  if (items.length === 0) return null;
  return (
    <section className="section section-divider">
      <div className="container">
        <div className="section-inner-divider" style={{ marginBottom: "48px" }} />
        <div className="section-head">
          <div>
            <h2 className="section-title">💬 현장이야기</h2>
            <p className="section-sub">뷰티 현장 사람들의 공감과 꿀팁</p>
          </div>
          <Link href="/stories" className="see-all">전체보기</Link>
        </div>
        <div className="card-grid card-grid-4">
          {items.map((item) => (
            <article key={item.id} className="insight-card-new"
              onClick={() => router.push(`/stories/${item.id}`)}
              style={{ cursor: "pointer" }}>
              <div className="insight-cat-row">
                <span className="insight-card-emoji">{STORY_EMOJI[item.category] || "💬"}</span>
                <span className="insight-category">{item.category}</span>
              </div>
              <h3 className="insight-card-new-title">{item.title || item.body}</h3>
              {item.title && item.body && <p className="insight-card-new-snippet">{item.body}</p>}
              <p className="insight-card-new-desc">❤ {item.like_count} · 💬 {item.comment_count}</p>
              <time className="insight-card-new-date">{fmtStoryDate(item.published_at || item.created_at)}</time>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============================================
   섹션: 뉴스레터

/* ============================================
   푸터
   ============================================ */
function Footer() {
  const topNav = [
    { label: "회사 소개", href: "/about" },
    { label: "제휴 문의", href: "/about/partnership" },
    { label: "광고 문의", href: "/about/advertise" },
    { label: "기타 문의", href: "/about/contact" },
  ];
  const Sep = () => <span style={{ margin: "0 8px", color: "#e2e2e2" }}>|</span>;
  return (
    <footer style={{ background: "#faf8fc", borderTop: "1px solid #eee", padding: "40px 0 48px", marginTop: 60 }}>
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <Link href="/" aria-label="하이어스" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", lineHeight: 1, textDecoration: "none" }}>
            <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-1px", color: "#4B4954", display: "inline-flex", alignItems: "flex-end" }}>
              <span>하이</span>
              <span style={{ position: "relative", color: "#FA6400" }}>
                어
                <svg width="17" height="9" viewBox="0 0 38 20" fill="none" style={{ position: "absolute", left: "50%", top: "-0.5em", transform: "translateX(-50%)", display: "block" }}>
                  <path d="M4 17 L19 5 L34 17" stroke="#FA6400" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>스</span>
            </span>
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: "3px", color: "#9a9aa7", marginTop: 4, paddingLeft: 3 }}>HIRE US</span>
          </Link>
          <nav className="footer-topnav" style={{ display: "flex", flexWrap: "wrap", gap: 26 }}>
            {topNav.map((l) => (
              <Link key={l.href} href={l.href} className="footer-topnav-link" style={{ fontSize: 14, fontWeight: 600, color: "#3a3a3a", textDecoration: "none" }}>{l.label}</Link>
            ))}
          </nav>
        </div>
        <div style={{ fontSize: 13, color: "#9a9aa3", lineHeight: 2 }}>
          <div><span style={{ fontWeight: 400, color: "#6b6b73" }}>하이어스</span><Sep />대표 : 김미희</div>
          <div>주소 : <Sep />전화번호 : </div>
          <div>사업자등록번호 : <Sep />통신판매업신고번호 : <Sep />유료직업소개사업 등록번호 : <Sep />직업정보제공사업 신고번호 : </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 28, paddingTop: 20, borderTop: "1px solid #eee" }}>
          <span style={{ fontSize: 13, color: "#9a9aa3" }}>© {new Date().getFullYear()} 하이어스. All rights reserved.</span>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <Link href="/support" style={{ fontSize: 13, color: "#666", textDecoration: "none", whiteSpace: "nowrap" }}>고객센터</Link>
            <Link href="/support/terms" style={{ fontSize: 13, color: "#666", textDecoration: "none", whiteSpace: "nowrap" }}>이용약관</Link>
            <Link href="/support/privacy" style={{ fontSize: 13, color: "#5f0080", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>개인정보 처리방침</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}