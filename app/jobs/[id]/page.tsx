"use client";
import LoginModal from "@/components/LoginModal";
import JobDetailView from "@/components/jobs/JobDetailView";
import { formatSalaryWon } from "@/lib/salary";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import ApplyModal from "@/components/jobs/ApplyModal";
import { useApplicationStore } from "@/lib/store/applicationStore";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Bookmark, Share2 } from "lucide-react";

/* ===== 더미 데이터 (나중에 API로 교체) ===== */
const JOBS_DATA: Record<string, any> = {
  "1": {
    id: 1,
    brand: "로지킴",
    brandDesc: "K-뷰티 글로벌 유통 전문 기업",
    tags: ["스킨케어", "색조", "OEM"],
    title: "일본, 동남아 해외영업",
    jobType: "영업",
    career: "경력 무관",
    region: "일본 · 동남아 · 중국",
    employType: "정규직",
    deadline: "2025.02.28",
    salary: "협의",
    color: "#f5e6e8",
    description: `
뷰티 브랜드의 일본 및 동남아 시장 개척과 확장을 담당할 열정적인 인재를 모십니다.

K-뷰티의 글로벌 확산과 함께 성장할 수 있는 절호의 기회입니다.
    `,
    responsibilities: [
      "일본, 동남아 지역 신규 거래처 발굴 및 계약 체결",
      "기존 바이어 관계 유지 및 매출 확대",
      "현지 트렌드 분석 및 제품 제안",
      "수출 서류 및 물류 관리",
      "해외 전시회 참가 및 바이어 미팅",
    ],
    requirements: [
      "해외영업 또는 무역 관련 경험자 우대",
      "영어 또는 일본어 비즈니스 커뮤니케이션 가능자",
      "뷰티/화장품 업계 관심 및 이해도 보유자",
      "해외 출장 가능자",
    ],
    preferreds: [
      "일본어 또는 중국어 능통자",
      "뷰티 업계 바이어 네트워크 보유자",
      "K-뷰티 수출 경험자",
    ],
    benefits: [
      "4대 보험 완비",
      "연차 및 반차 자유 사용",
      "해외 출장 경비 전액 지원",
      "도서 구입비 월 3만원 지원",
      "뷰티 제품 직원 할인",
    ],
    process: ["서류 전형", "1차 면접 (실무진)", "2차 면접 (임원)", "최종 합격"],
    companyInfo: {
      name: "로지킴",
      size: "50~100명",
      location: "서울 강남구",
      founded: "2018년",
      website: "www.logikeem.com",
    },
  },
  "2": {
    id: 2,
    brand: "윗유",
    brandDesc: "글로벌 뷰티 크리에이터 플랫폼",
    tags: ["브랜드 무관", "플랫폼"],
    title: "[글로벌] 틱톡샵 어필리에이트 마케터",
    jobType: "마케팅",
    career: "신입 ~ 경력 무관",
    region: "북미",
    employType: "정규직",
    deadline: "2025.02.15",
    salary: "3,500만원 ~ 5,000만원",
    color: "#e8f0fe",
    description: `
글로벌 틱톡샵 어필리에이트 마케팅을 주도할 크리에이티브한 마케터를 찾습니다.

틱톡의 폭발적인 성장과 함께 K-뷰티의 북미 시장을 개척하는 흥미로운 포지션입니다.
    `,
    responsibilities: [
      "틱톡샵 어필리에이트 캠페인 기획 및 운영",
      "인플루언서 섭외 및 관계 관리",
      "콘텐츠 성과 분석 및 최적화",
      "북미 뷰티 트렌드 리서치",
      "월간 성과 리포트 작성",
    ],
    requirements: [
      "마케팅 관련 전공 또는 동등 경험",
      "틱톡/SNS 콘텐츠에 대한 깊은 이해",
      "데이터 기반 의사결정 능력",
      "영어 커뮤니케이션 가능",
    ],
    preferreds: [
      "틱톡샵 운영 경험자",
      "뷰티 분야 인플루언서 마케팅 경험자",
      "북미 시장 이해도 보유자",
    ],
    benefits: [
      "4대 보험",
      "유연근무제",
      "재택근무 가능",
      "스톡옵션 부여",
      "연 2회 해외 워크샵",
    ],
    process: ["서류 전형", "과제 전형", "화상 면접", "최종 합격"],
    companyInfo: {
      name: "윗유 (WITU)",
      size: "100~300명",
      location: "서울 마포구",
      founded: "2020년",
      website: "www.witu.co",
    },
  },
};

// 나머지 ID는 1번 데이터를 기본값으로 사용
for (let i = 3; i <= 12; i++) {
  JOBS_DATA[String(i)] = { ...JOBS_DATA["1"], id: i };
}



export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [job, setJob] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [companyJobsCount, setCompanyJobsCount] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/jobs/${id}/related`)
      .then(r => r.json())
      .then(res => { if (res.success && res.data) setRelated(res.data.related || []); })
      .catch(() => {});
    fetch(`/api/jobs/${id}/company-jobs`)
      .then(r => r.json())
      .then(res => { if (res.success && res.data) setCompanyJobsCount(res.data.total || 0); })
      .catch(() => {});
  }, [id]);

  // 공유: 모바일은 OS 공유 시트, 미지원 브라우저는 링크 복사로 폴백
  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = job ? `${job.brand} · ${job.title}` : "뷰티워크 채용공고";
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: title, url });
      } catch {
        // 사용자가 공유를 취소한 경우 등은 무시
      }
      return;
    }
    try {
      await navigator.clipboard?.writeText(url);
      alert("링크가 복사되었습니다.");
    } catch {
      alert("공유를 지원하지 않는 브라우저예요. 주소창의 링크를 복사해 주세요.");
    }
  };
  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("access_token");
    fetch(`/api/jobs/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const j = res.data;
          if (j.has_applied) setDbApplied(true);
          setJob({
            id: j.id,
            companyId: j.company?.id || '',
            brand: j.company?.brand_name || j.company?.company_name || '',
            brandDesc: j.company?.description || '',
            tags: [],
            title: j.title,
            jobType: j.job_type === 'OFFICE' ? '사무직' : '매장직',
            career: j.experience_level === 'NEW' ? '신입' : j.experience_level === 'EXPERIENCED' ? '경력' : '경력 무관',
            region: j.location || '',
            employType: j.work_type === 'FULL_TIME' ? '정규직' : j.work_type === 'PART_TIME' ? '파트타임' : j.work_type === 'CONTRACT' ? '계약직' : '정규직',
            deadline: j.deadline ? String(j.deadline).slice(0, 10).replace(/-/g, '.') : '상시채용',
            salary: formatSalaryWon(j.salary_min, j.salary_type),
            color: '#e8f0fe',
            description: j.description || '',
            requirements: j.requirements ? j.requirements.split('\n').filter(Boolean) : [],
            preferreds: j.preferred_qualifications ? j.preferred_qualifications.split('\n').filter(Boolean) : [],
            benefits: j.benefits ? j.benefits.split('\n').filter(Boolean) : [],
            responsibilities: [],
            process: j.hiring_process || [],
            notes: j.notes || '',
            logo_url: j.company?.logo_url,
            cover_images: j.company?.cover_images || [],
            detailImages: j.detail_images || [],
            workDaysText: j.work_days === "협의" ? "요일 협의" : (j.work_days ? String(j.work_days).split(",").join("·") : ""),
            workTimeText: j.work_time === "협의" ? "시간 협의" : (j.work_time || ""),
            companyInfo: {
              name: j.company?.company_name || '',
              brandName: j.company?.brand_name || '',
              representative: j.company?.representative_name || '',
              companyType: j.company?.company_type === 'STORE' ? '매장·살롱' : j.company?.company_type === 'BOTH' ? '기업·매장' : j.company?.company_type === 'OFFICE' ? '기업·브랜드' : '',
              size: j.company?.company_size || '',
              founded: j.company?.founded_year || '',
              phone: j.company?.company_phone || '',
              website: j.company?.website_url || '',
              location: [j.company?.region_sido, j.company?.region_sigungu, j.company?.address].filter(Boolean).join(' ') || '',
              latitude: j.company?.latitude ?? null,
              longitude: j.company?.longitude ?? null,
            },
            companyAddress: [j.company?.region_sido, j.company?.region_sigungu, j.company?.address].filter(Boolean).join(' '),
          });
          // 로그인한 기업이 이 공고의 주인인지 판별
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split(".")[1]));
              if (payload.owner_type === "company" && payload.sub === j.company?.id) {
                setIsOwnerCompany(true);
              }
            } catch {}
          }
          // admin 목록에서 미리보기로 진입(?preview=admin)했거나, 관리자 전용 세션이면 미리보기
          const adminPreview = new URLSearchParams(window.location.search).get("preview") === "admin";
          if (adminPreview || (localStorage.getItem("admin_token") && !token)) {
            setIsAdminPreview(true);
          }
          // 로고 클릭 목적지: 관리자→/admin, 기업→대시보드, 그 외→홈
          if (adminPreview || (localStorage.getItem("admin_token") && !token)) {
            setLogoHref("/admin");
          } else if (token) {
            try {
              const pl = JSON.parse(atob(token.split(".")[1]));
              setLogoHref(pl.owner_type === "company" ? "/company/dashboard" : "/");
            } catch {}
          }
        }
      })
      .catch(e => console.error('[load job]', e));
  }, [id]);

  const [bookmarked, setBookmarked] = useState(false);
  const [isOwnerCompany, setIsOwnerCompany] = useState(false);
  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const [logoHref, setLogoHref] = useState("/");
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyDone, setApplyDone] = useState(false);
  const [dbApplied, setDbApplied] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [coverLoaded, setCoverLoaded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [applying, setApplying] = useState(false);
  const { isLoggedIn, userName } = useAuthStore();
  const { apply, isApplied } = useApplicationStore();
  const alreadyApplied = job ? isApplied(String(job.id)) : false;

  // 지원 모달 열릴 때 최근 자기소개서 1회 불러오기
  useEffect(() => {
    if (!showApplyModal || coverLoaded) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/users/me/last-cover-letter", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.cover_letter) setCoverLetter(d.data.cover_letter);
      })
      .catch(() => {})
      .finally(() => setCoverLoaded(true));
  }, [showApplyModal, coverLoaded]);
  const { toggle: toggleBookmark, isBookmarked } = useBookmarkStore();
  if (!job) {
    return (
      <div className="job-detail-page">
        <div style={{ padding: "80px 20px", textAlign: "center", color: "#888" }}>
          불러오는 중...
        </div>
      </div>
    );
  }
  return (
    <div className="job-detail-page">
      {/* 헤더 */}
      <header className="job-detail-header">
        <div className="job-detail-header-inner">
          <button className="job-detail-back" onClick={() => router.back()}>
            <ChevronLeft size={20} />
            <span>채용공고</span>
          </button>
          <Link href={logoHref} className="job-detail-logo"><Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority /></Link>
          <div style={{ width: 38 }} />
        </div>
      </header>

      <JobDetailView
        job={job}
        related={related}
        companyJobsCount={companyJobsCount}
        onBrandClick={() => { if (job.companyId) router.push(`/brands/${job.companyId}`); }}
        asideAction={
          isAdminPreview ? (
            <div style={{
              background: "#fff7ed", color: "#c2410c", borderRadius: "10px",
              padding: "12px 14px", fontSize: "13px", lineHeight: 1.5,
              textAlign: "center"
            }}>
              관리자 미리보기 화면이에요.<br />구직자에게는 지원·북마크 버튼이 보여요.
            </div>
          ) : isOwnerCompany ? (
            <>
              <div style={{
                background: "#f5f3ff", color: "#5f0080", borderRadius: "10px",
                padding: "12px 14px", fontSize: "13px", lineHeight: 1.5,
                textAlign: "center", marginBottom: "12px"
              }}>
                구직자에게 보이는 미리보기 화면이에요.
              </div>
              <button
                className="job-detail-apply-btn"
                onClick={() => router.push(`/company/dashboard/jobs/new?id=${job.id}`)}
              >
                공고 수정하기
              </button>
            </>
          ) : (
            <>
              <button
                className={`job-detail-apply-btn ${alreadyApplied ? "applied" : ""}`}
                disabled={alreadyApplied}
                onClick={() => {
                  if (alreadyApplied) return;
                  if (!isLoggedIn) {
                    setShowLoginModal(true);
                  } else {
                    setShowApplyModal(true);
                  }
                }}
              >
                {alreadyApplied ? "✓ 지원완료" : "지원서 작성하기"}
              </button>
              <button
                className={`job-detail-aside-bookmark ${bookmarked ? "active" : ""}`}
                onClick={() => setBookmarked(!bookmarked)}
              >
                <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />
                {bookmarked ? "북마크 완료" : "북마크"}
              </button>
            </>
          )
        }
      />

      {/* 모바일 하단 CTA */}
      <div className="job-detail-mobile-cta">
        {isAdminPreview ? (
          <button className="job-detail-mobile-apply" disabled style={{ opacity: 0.7 }}>
            관리자 미리보기
          </button>
        ) : isOwnerCompany ? (
          <button
            className="job-detail-mobile-apply"
            onClick={() => router.push(`/company/dashboard/jobs/new?id=${job.id}`)}
          >
            공고 수정하기
          </button>
        ) : (
          <>
            <button
              className={`job-detail-mobile-bookmark ${bookmarked ? "active" : ""}`}
              onClick={() => setBookmarked(!bookmarked)}
            >
              <Bookmark size={20} fill={bookmarked ? "currentColor" : "none"} />
            </button>
            <button
              className="job-detail-mobile-bookmark"
              aria-label="공유"
              onClick={handleShare}
            >
              <Share2 size={20} />
            </button>
            <button
              className={`job-detail-mobile-apply ${alreadyApplied ? "applied" : ""}`}
              disabled={alreadyApplied}
              onClick={() => {
                if (alreadyApplied) return;
                if (!isLoggedIn) {
                  setShowLoginModal(true);
                } else {
                  setShowApplyModal(true);
                }
              }}
            >
              {alreadyApplied ? "✓ 지원완료" : "지원하기"}
            </button>
          </>
        )}
      </div>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}

      {/* 지원하기 모달 */}
      {showApplyModal && job && (
        <ApplyModal
          jobId={String(params.id)}
          jobBrand={job.brand}
          jobTitle={job.title}
          onClose={() => setShowApplyModal(false)}
          onApplied={() => {
            apply({ id: String(job.id), brand: job.brand, title: job.title });
            setDbApplied(true);
          }}
        />
      )}
    </div>
  );
}
