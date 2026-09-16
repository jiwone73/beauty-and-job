"use client";
import Image from "next/image";
import { jobCompanyName } from "@/lib/companyName";
import Link from "next/link";
import Header from "@/components/Header";
import HeroMobile from "@/components/HeroMobile";
import AdBanner from "@/components/ads/AdBanner";
import RegionSelectModal from "@/components/RegionSelectModal";
import { workTypeLabel } from "@/lib/constants";
import { SIDO_LIST, getSigunguList } from "@/lib/data/regions";
import { STORE_JOB_GROUPS, OFFICE_JOB_GROUPS, 직군요약 } from "@/lib/data/jobGroups";
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
  ChevronDown, Gift, UserRound } from "lucide-react";
import ResumeCta from "@/components/ResumeCta";
import JobCard from "@/components/JobCard";
import JobShowcase from "@/components/main/JobShowcase";
import { 오픈일글 } from "@/lib/launchPlan";
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
      {/* 오픈이벤트 채용관 — 판 자리가 아니라 오픈 기념으로 잠깐 세우는 줄이다.
          이벤트가 끝나면 app_settings.event_showcase 만 지우면 줄째 사라진다.
          맨 위인 까닭은 「메인페이지 상단 노출」이 이벤트로 약속한 것이어서다. */}
      <JobShowcase tier="EVENT" />
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
  const [jobType, setJobType] = useState<"오피스" | "매장">("매장");
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
        // 메인 첫 화면은 일자리를 찾으러 온 사람이 먼저 본다. 기업 이벤트는
        // 기업 서비스와 상품안내가 따로 맡으므로 여기서는 개인 것을 건다.
        const 이벤트들 = list.filter((n: any) => n.type === "event");
        set이벤트(이벤트들.find((n: any) => n.target === "user" || n.target === "all")
                 || 이벤트들[0] || null);
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

        {/* 1. 상단 배너 — 파는 자리다. 광고가 걸리면 그 자리를 광고가 쓰고,
            안 걸렸으면 뷰티워크 배너가 선다. 광고를 위에 하나 더 얹지 않는다 —
            첫 화면에 배너가 둘이면 어느 것이 이 사이트 이야기인지 흐려진다. */}
        <AdBanner slot="main" 대신={
          <Link href={이벤트 ? `/event?open=${이벤트.id}` : "/company"} className="mt-hero">
            <span className="mt-hero-photo" />
            <span className="mt-hero-in">
              <span className="mt-eyebrow">BEAUTYWORK OPEN</span>
              <span className="mt-hero-h">뷰티 커리어의 시작,<br /><b>뷰티워크</b></span>
              <span className="mt-hero-sub">{이벤트?.short_title || 이벤트?.title
                || `${오픈일글()} 오픈 · 채용공고와 이력서 등록을 무료로 이용하세요.`}</span>
            </span>
          </Link>
        } />

        {/* 2. 일자리 찾기 블록 */}
        <div className="mt-jobs">
          <div className="mt-cols">
            <div className="mt-card">
              <form onSubmit={handleSearch} onClick={(e) => e.stopPropagation()}>
                <h2 className="mt-jobs-h">살롱·샵 현장직부터 브랜드 오피스직까지,<br /><b>뷰티업계 일자리를 한곳에서</b></h2>
                <p className="mt-ask">어떤 일자리를 찾으세요?</p>
                {/* 무엇을 찾을지 고르고(토글), 그게 뭔지 읽고(설명), 치는
                    칸(검색바)까지가 한 동작이다. 사이가 벌어지면 셋이 따로
                    노는 것처럼 보인다. 묶어서 붙여 둔다. */}
                <div className="mt-search-set">
                  <div className="hero-type-toggle">
                      <button type="button" className={`hero-type-btn ${jobType === "매장" ? "active" : ""}`} onClick={() => setJobType("매장")}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StoreIcon size={14} style={{ flexShrink: 0 }} />매장</span>
                    </button>
                    <button type="button" className={`hero-type-btn ${jobType === "오피스" ? "active" : ""}`} onClick={() => setJobType("오피스")}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><OfficeIcon size={14} style={{ flexShrink: 0 }} />오피스</span>
                    </button>
                  </div>
                  {/* 매장의 반대쪽은 긍정형으로 정의된 범주가 아니라 '매장이
                      아닌 곳'이라는 잔여 범주다. 그래서 한 단어로는 어느 말을
                      골라도 무언가가 새어 나간다 — '본사'는 지점이 있다고 우기고
                      ('corporate' 에는 없는 뜻이다. corporate headquarters 가 본사다),
                      '브랜드'는 제조사·플랫폼·헤드헌팅사를 밀어내고, '기업'은
                      매장도 기업이라 틀린 대립을 만든다.

                      그래서 가장 적게 우기는 말로 '오피스'를 골랐다. 사무실에
                      앉는다는 것 말고는 주장하는 바가 없고, DB 도 이미 OFFICE 다.
                      그래도 제조 QC·아카데미 강사는 못 담으니, 못 담는 나머지는
                      이 설명 줄이 맡는다. 고정 안내문은 읽히지 않으므로 고른
                      쪽에 따라 바뀌게 해 고르는 순간에 알려 준다.

                      설명은 직군 대분류에서 만든다. 손으로 적어 두었더니
                      「마케팅·영업 · 경영지원」처럼 있지도 않은 직군이 남았다. */}
                  <p className="mt-type-desc">
                    {jobType === "매장" ? 직군요약("STORE")
                      : jobType === "오피스" ? 직군요약("OFFICE")
                      : "매장과 오피스 공고를 함께 봅니다"}
                  </p>
                  <div className="hero-searchbar-v2">
                    <button type="button" className={`hero-region-trigger ${selected.length ? "active" : ""}`} onClick={() => setModalOpen(true)}>
                      <span>{regionLabel}</span><ChevronDown size={15} />
                    </button>
                    <span className="hero-searchbar-divider" />
                    {/* 칸 안에는 예시를 적지 않는다. 바로 위 줄이 무엇이 들어
                        있는지 이미 말했고, 같은 말을 손이 가는 자리에서 또 하면
                        치려던 사람이 한 번 더 읽는다. */}
                    <input className="hero-search-input-v2" type="text"
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
              {/* 공지와 채용속보를 한 줄에 나란히 둔다. 둘 다 한 줄짜리 소식이라
                  자리를 반씩 나눠 쓴다. 왼쪽 칸에 두었더니 검색 카드가 이벤트
                  카드보다 길어져 아래 끝이 어긋났다. */}
              <div className="mt-nrow">
                <div className="mt-card mt-nc">
                  <Link href="/notice" className="mt-nc-tag">공지</Link>
                  <span className="mt-nc-bar" aria-hidden="true">|</span>
                  <Link href={공지 ? `/notice?open=${공지.id}` : "/notice"} className="mt-notice">
                    <span className="nt">{공지?.title || "뷰티워크 서비스 무료 이용 안내"}</span>
                  </Link>
                </div>

                {속보.length > 0 && (() => {
                  const 이번 = 속보[속보차례 % 속보.length];
                  return (
                    <div className="mt-card mt-nc mt-tkc">
                      <span className="mt-tk-l">채용속보</span>
                      <span className="mt-nc-bar" aria-hidden="true">|</span>
                      <Link href={`/jobs/${이번.id}`} className="mt-tk-one">
                        {이번.company_name ? `${이번.company_name} · ` : ""}{이번.title}
                      </Link>
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
                {/* 글자는 직접 짠다 — 그림에 구워 넣으면 좁은 칸에서 3분의 1로
                    눌려 안 읽히고, 문구를 고칠 때마다 그림을 다시 받아야 한다.
                    커피·확성기만 원본에서 떼어 얹는다. 큰 카피는 디자인 그대로. */}
                <div className="mt-evt-list">
                  <ResumeCta className="mt-evt-p ev-user">
                    <span className="mt-evt-tag"><UserRound size={12} />개인회원 EVENT</span>
                    {/* 이력서 등록은 사진·인증·경력·자소서까지 30분짜리 일이다.
                        처음 보는 사이트에서 그 일을 시키려면 커피 한 잔으로는 얇다.
                        값보다 중요한 것은 수량이다 — 「무제한 2,000원」은 오늘
                        해야 할 이유가 없고 「선착순 200명」은 있다. */}
                    <span className="mt-evt-h">이력서 등록하고<br /><b>메가MGC 커피쿠폰</b></span>
                    <span className="mt-evt-go">이력서 등록하기 ›</span>
                    <img className="mt-evt-art art-coffee" src="/images/event/art-coffee.png" alt="" />
                    <span className="mt-evt-coin">5,000원<i>선착순 200명</i></span>
                  </ResumeCta>

                  <button
                    type="button"
                    className="mt-evt-p ev-co"
                    onClick={() => router.push(
                      isLoggedIn && ownerType === "company" ? "/company/dashboard/jobs/new" : "/company/login"
                    )}
                  >
                    <span className="mt-evt-tag"><OfficeIcon size={12} />기업회원 EVENT</span>
                    {/* 인재검색은 약속하지 않는다 — 이력서가 쌓이기 전에는 못 지킨다.
                        지금 우리가 줄 수 있는 진짜 값은 기간과 노출이다.
                        자리는 먼저 올린 순서대로 준다. 최상단은 원래 프리미엄
                        자리라 나중에 팔 때 「그때는 공짜였는데」가 될 수 있지만,
                        오픈 초기에 공고를 모으는 것이 먼저라고 정했다. */}
                    <span className="mt-evt-h">선착순 채용공고 등록하고<br /><b>1개월 무료 + 최상단 노출</b></span>
                    <span className="mt-evt-go">채용공고 등록하기 ›</span>
                    <img className="mt-evt-art art-mega" src="/images/event/art-megaphone.png" alt="" />
                    <span className="mt-evt-pts">
                      <i>공고 등록 무제한</i><i>기간 내내 게재</i><i>선착순 최상단</i>
                    </span>
                  </button>
                </div>
                <p className="mt-evt-note">
                  * 이벤트 기간: 2026. 10. 1 (목) ~ 10. 31 (토) · 선착순 200명 · 쿠폰은 이력서 등록 완료 확인 후 지급됩니다.
                </p>
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
  // 사이트 어디서나 매장/오피스 두 갈래만 쓴다. '전체'를 한 곳에만 남기면
  // 같은 토글이 화면마다 다르게 생긴 셈이 된다.
  const [tab, setTab] = useState<"매장" | "오피스">("매장");
  const [jobs, setJobs] = useState<any[]>([]);
  // 이력서를 근거로 점수를 매길 수 있었는지. 근거가 없으면 '추천'이라 부르지 않는다 —
  // 최신순을 추천이라 내놓으면 한 번 보고 다시 안 본다.
  const [맞춤, set맞춤] = useState(false);
  useEffect(() => {
    // 위쪽 '지금 적극 채용 중'과 겹치는 공고를 걸러내려면 그쪽 id 를 먼저
    // 받아야 한다. 아직이면(null) 잠깐 기다린다.
    if (excludeIds === null) return;
    const jt = tab === "매장" ? "&job_type=STORE" : tab === "오피스" ? "&job_type=OFFICE" : "";
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
  const seeAll = tab === "매장" ? "/jobs?type=매장" : tab === "오피스" ? "/jobs?type=오피스" : "/jobs";
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
            {(["매장", "오피스"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`hero-type-btn ${tab === t ? "active" : ""}`}
                onClick={() => setTab(t)}
              >
                {t === "매장" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StoreIcon size={14} style={{ flexShrink: 0 }} />매장</span> : t === "오피스" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><OfficeIcon size={14} style={{ flexShrink: 0 }} />오피스</span> : t}
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
  const [tab, setTab] = useState<"매장" | "오피스">("매장");
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
          {(["매장", "오피스"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`seg-btn ${tab === t ? "active" : ""}`}>
              {t === "매장" ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StoreIcon size={15} style={{ flexShrink: 0 }} />매장</span> : <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><OfficeIcon size={15} style={{ flexShrink: 0 }} />오피스</span>}
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