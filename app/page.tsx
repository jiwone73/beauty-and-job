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
  ChevronDown, Gift } from "lucide-react";
import ResumeCta from "@/components/ResumeCta";
import JobCard from "@/components/JobCard";
import JobShowcase from "@/components/main/JobShowcase";
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";
import { formatDeadline, expLevelLabel } from "@/lib/jobFormat";
import { mapJob } from "@/lib/jobCard";
/* ============================================
   공통 유틸
   ============================================ */

export default function HomePage() {
  useEffect(() => {
    useBookmarkStore.getState().loadFromServer();
  }, []);
  // 채용관에 뜬 공고. null 이면 아직 안 불러온 상태다. 프리미엄이 먼저 정해지고
  // 스탠다드가 그것을 빼고 고른다.
  const [프리미엄Ids, set프리미엄Ids] = useState<string[] | null>(null);
  const [스탠다드Ids, set스탠다드Ids] = useState<string[] | null>(null);
  const 채용관Ids = 프리미엄Ids === null || 스탠다드Ids === null
    ? null : [...프리미엄Ids, ...스탠다드Ids];
  return (
    <main className="main-page">
      <Header />
      <MobileDetector />
      {/* 유료로 산 자리. 프리미엄이 위, 스탠다드가 아래이고 5초마다 안이 바뀐다.
          아래 추천 자리는 여기 뜬 공고를 빼고 고른다 — 메인에 같은 공고가 두 번
          뜨면 자리를 산 쪽도 안 산 쪽도 손해다. */}
      <JobShowcase tier="PREMIUM" title="프리미엄 채용관" onLoaded={set프리미엄Ids} />
      <JobShowcase tier="STANDARD" title="스탠다드 채용관" excludeIds={프리미엄Ids} onLoaded={set스탠다드Ids} />
      <SectionPick excludeIds={채용관Ids} />
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
  // 이 토글은 눌러서 채용공고 화면으로 넘어가는 자리다. 그쪽에 '전체'가
  // 없으므로 여기서도 두지 않는다 — 고를 수 있게 해 놓고 넘어가면 다른 것이
  // 걸려 있는 것은 약속을 어기는 셈이다. 건수가 많은 매장을 기본으로 둔다.
  const [jobType, setJobType] = useState<"본사" | "매장">("매장");
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
        setJobType(u?.job_type === "OFFICE" ? "본사" : "매장");
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
  // 한 번에 한 건만 보여주고 차례로 넘긴다. 가로로 흘리면 눈이 따라가야 하고,
  // 긴 제목은 끝까지 지나갈 때까지 기다려야 한다.
  const [속보차례, set속보차례] = useState(0);
  useEffect(() => {
    fetch("/api/notices")
      .then((r) => r.json())
      .then((res) => {
        const list = Array.isArray(res?.data) ? res.data : [];
        set이벤트(list.find((n: any) => n.type === "event") || null);
        set공지(list.find((n: any) => n.type !== "event") || null);
      })
      .catch(() => {});
    fetch("/api/jobs?limit=8&nosample=1")
      .then((r) => r.json())
      .then((res) => { if (Array.isArray(res?.data)) set속보(res.data); })
      .catch(() => {});
  }, []);


  // 4초마다 다음 건으로. 화살표로 직접 넘기면 그 자리에서 다시 센다.
  useEffect(() => {
    if (속보.length < 2) return;
    const t = setInterval(() => set속보차례((n) => (n + 1) % 속보.length), 4000);
    return () => clearInterval(t);
  }, [속보.length, 속보차례]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set("type", jobType);
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
            {/* 히어로 카드에 있던 머리글을 배너로 옮겼다 — 처음 온 사람에게
                여기가 무엇을 다루는 곳인지 알려주는 줄이라 없애면 안 된다. */}
            <span className="mt-hero-h">살롱·샵 현장직부터 브랜드 본사까지,<br /><b>뷰티업계 일자리를 한곳에서</b></span>
            <span className="mt-hero-sub">{이벤트?.title || "10월 1일 오픈 · 채용공고와 이력서 등록을 무료로 이용하세요."}</span>
          </span>
        </Link>

        {/* 2. 일자리 찾기 블록 */}
        {/* 디자인 차례 그대로 — 검색이 가로 전체, 그 아래 공지·채용속보 반반,
            그 아래 이달의 이벤트가 가로 전체다. 이벤트 판은 받은 그림을 그대로
            쓰는데, 좁은 칸에 넣으면 글자가 3분의 1로 눌려 읽히지 않는다. */}
        <div className="mt-jobs">
          <div className="mt-wide">
            <div className="mt-card">
              <form onSubmit={handleSearch} onClick={(e) => e.stopPropagation()}>
                <p className="mt-ask">어떤 일자리를 찾으세요?</p>
                {/* 무엇을 찾을지 고르고(토글), 그게 뭔지 읽고(설명), 치는
                    칸(검색바)까지가 한 동작이다. 사이가 벌어지면 셋이 따로
                    노는 것처럼 보인다. 묶어서 붙여 둔다. */}
                <div className="mt-search-set">
                  <div className="hero-type-toggle">
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
                    {jobType === "매장" ? "시술·스탭(헤어·메이크업·네일·피부·두피) · 샵 운영 · 웨딩 · 미용강사 · 병원 현장"
                      : jobType === "본사" ? "제조·OEM · 플랫폼·콘텐츠 · MD·커머스 · 마케팅·영업 · 교육 기획 · 경영지원"
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

              {/* 공지와 채용속보를 한 줄에 나란히 둔다. 둘 다 한 줄짜리 소식이라
                  자리를 반씩 나눠 쓴다. 왼쪽 칸에 두었더니 검색 카드가 이벤트
                  카드보다 길어져 아래 끝이 어긋났다. */}
              <div className="mt-nrow">
                <div className="mt-card mt-nc">
                  <Link href="/notice" className="mt-nc-tag">공지</Link>
                  <Link href={공지 ? `/notice?open=${공지.id}` : "/notice"} className="mt-notice">
                    <span className="nt">{공지?.title || "뷰티워크 서비스 무료 이용 안내"}</span>
                  </Link>
                </div>

                {속보.length > 0 && (() => {
                  const 이번 = 속보[속보차례 % 속보.length];
                  return (
                    <div className="mt-card mt-nc mt-tkc">
                      <span className="mt-tk-l">채용속보</span>
                      <Link href={`/jobs/${이번.id}`} className="mt-tk-one">
                        {이번.company_name ? `${이번.company_name} · ` : ""}{이번.title}
                      </Link>
                      <Link href="/jobs" className="mt-evt-more">자세히 보기 ›</Link>
                    </div>
                  );
                })()}
              </div>

              <div className="mt-card mt-evt">
                <div className="mt-chead">
                  <Link href="/event" className="t"><Gift size={17} className="mt-ic" />이달의 이벤트</Link>
                  <span className="mt-evt-lead">지금, 뷰티워크에서 준비한 특별한 혜택을 만나보세요.</span>
                  {/* 언제 왜 주는지는 두 혜택에 공통이다. 줄마다 되풀이하지 않고
                      제목 옆에 한 번만 둔다. */}
                  <span className="mt-evt-when"><Sparkles size={13} className="mt-evt-when-ic" />10월 오픈 기념</span>
                </div>
                {/* 판 하나가 통째로 그림이다 — 디자인 그대로 쓰고, 판 전체가
                    눌리는 자리다. 안쪽에 또 「보기」 단추를 두지 않는다. */}
                <div className="mt-evt-list">
                  <ResumeCta className="mt-evt-banner">
                    <img src="/images/event/event-user.png"
                      alt="개인회원 이벤트 — 이력서 등록하고 메가MGC 커피 2,000원 쿠폰 받기" />
                  </ResumeCta>
                  <button
                    type="button"
                    className="mt-evt-banner"
                    onClick={() => router.push(
                      isLoggedIn && ownerType === "company" ? "/company/dashboard/jobs/new" : "/company/login"
                    )}
                  >
                    <img src="/images/event/event-company.png"
                      alt="기업회원 이벤트 — 채용공고 등록하고 10월 한 달 무료 우선 노출" />
                  </button>
                </div>
              </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================
   섹션 1: 뷰티워크 추천 공고<span style={{ display: "inline-block", marginLeft: 8, padding: "3px 10px", borderRadius: "var(--chip-radius)", fontSize: 12, fontWeight: 600, color: "#582681", background: "#f7f7f8", verticalAlign: "middle" }}>📊 직군 맞춤 선별</span>
   ============================================ */
function SectionPick({ excludeIds }: { excludeIds: string[] | null }) {
  // 사이트 어디서나 매장/본사 두 갈래만 쓴다. '전체'를 한 곳에만 남기면
  // 같은 토글이 화면마다 다르게 생긴 셈이 된다.
  const [tab, setTab] = useState<"매장" | "본사">("매장");
  const [jobs, setJobs] = useState<any[]>([]);
  // 이력서를 근거로 점수를 매길 수 있었는지. 근거가 없으면 '추천'이라 부르지 않는다 —
  // 최신순을 추천이라 내놓으면 한 번 보고 다시 안 본다.
  const [맞춤, set맞춤] = useState(false);
  useEffect(() => {
    // 위쪽 '지금 적극 채용 중'과 겹치는 공고를 걸러내려면 그쪽 id 를 먼저
    // 받아야 한다. 아직이면(null) 잠깐 기다린다.
    if (excludeIds === null) return;
    const jt = tab === "매장" ? "&job_type=STORE" : tab === "본사" ? "&job_type=OFFICE" : "";
    const exclude = excludeIds.length ? `&exclude=${excludeIds.join(",")}` : "";
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    fetch(`/api/jobs/recommended?limit=4${jt}${exclude}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined)
      .then((r) => r.json())
      .then((res) => {
        const d = res?.data;
        if (res.success && Array.isArray(d?.items)) { setJobs(d.items); set맞춤(!!d.personalized); }
        else { setJobs([]); set맞춤(false); }
      })
      .catch(console.error);
  }, [tab, excludeIds]);
  const mappedJobs = jobs.map(mapJob);
  // 이력서를 근거로 고른 것이 아니면 이 자리를 아예 접는다. 최신순을 메인에
  // 또 늘어놓으면 채용관에서 산 자리가 그만큼 묽어진다.
  const seeAll = tab === "매장" ? "/jobs?type=매장" : tab === "본사" ? "/jobs?type=본사" : "/jobs";
  if (!맞춤) return null;
  return (
    <section className="section section-divider">
      <div className="container">
        <div className="section-inner-divider" style={{ marginBottom: "48px" }} />
        <div className="section-head">
          <div>
            <h2 className="section-title">
              <Sparkles size={24} className="title-icon" />
              뷰티워크 추천 공고
            </h2>
            <p className="section-sub">내 직군·지역·경력과 스크랩한 곳을 함께 보고 골랐어요</p>
          </div>
          <Link href={seeAll} className="see-all">전체보기</Link>
        </div>

        <div style={{ marginBottom: 24 }}>
          <div className="hero-type-toggle">
            {(["매장", "본사"] as const).map((t) => (
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
                border: "1px solid #efeff1", background: "#f7f7f8", color: "#582681",
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
    <footer style={{ background: "#f7f7f8", borderTop: "1px solid #eee", padding: "40px 0 48px", marginTop: 60 }}>
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
              <Link key={l.href} href={l.href} className="footer-topnav-link" style={{ fontSize: 14, fontWeight: 600, color: "#555", textDecoration: "none" }}>{l.label}</Link>
            ))}
          </nav>
        </div>
        <div style={{ fontSize: 13, color: "#555", lineHeight: 2 }}>
          <div><span style={{ fontWeight: 400, color: "#555" }}>하이어스</span><Sep />대표 : 정은우</div>
          <div>주소 : 서울특별시 구로구 디지털로34길 43, 702-54호<Sep />전화번호 : </div>
          {/* 통신판매업·유료직업소개·직업정보제공은 신고·등록이 끝나면 채운다.
              번호가 나오기 전에 적어 두면 없는 번호를 표시하는 것이 된다. */}
          <div>사업자등록번호 : 431-05-03695<Sep />통신판매업신고번호 : <Sep />유료직업소개사업 등록번호 : <Sep />직업정보제공사업 신고번호 : </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginTop: 28, paddingTop: 20, borderTop: "1px solid #eee" }}>
          <span style={{ fontSize: 13, color: "#555" }}>© {new Date().getFullYear()} 하이어스. All rights reserved.</span>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <Link href="/support" style={{ fontSize: 13, color: "#555", textDecoration: "none", whiteSpace: "nowrap" }}>고객센터</Link>
            <Link href="/support/terms" style={{ fontSize: 13, color: "#555", textDecoration: "none", whiteSpace: "nowrap" }}>이용약관</Link>
            <Link href="/support/privacy" style={{ fontSize: 13, color: "#582681", textDecoration: "none", fontWeight: 600, whiteSpace: "nowrap" }}>개인정보 처리방침</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}