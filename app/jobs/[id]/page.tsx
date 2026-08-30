"use client";
import LoginModal from "@/components/LoginModal";
import { jobCompanyName } from "@/lib/companyName";
import JobDetailView from "@/components/jobs/JobDetailView";
import { formatSalaryWon } from "@/lib/salary";
import { composeCompanyAddress } from "@/lib/address";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import ApplyModal from "@/components/jobs/ApplyModal";
import { useApplicationStore } from "@/lib/store/applicationStore";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Bookmark, Share2 } from "lucide-react";




export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [job, setJob] = useState<any>(null);
  const [related, setRelated] = useState<any[]>([]);
  const [companyJobsCount, setCompanyJobsCount] = useState(0);
  // res.success 가 false(예: 미등록·삭제·아직 발행 안 된 임시저장 공고)면 job이 끝까지
  // null로 남아 "불러오는 중..."이 영원히 떠 있었다("눌러도 불러오는중으로 표시되면서
  // 안열려") — 실패를 구분해 안내로 갈아 끼운다.
  const [notFound, setNotFound] = useState(false);

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
            isExternal: j.is_external || false,
            applyMethod: j.apply_method || 'NATIVE',
            externalApplyUrl: j.external_apply_url || '',
            sourceUrl: j.source_url || '',
            companyId: j.company?.id || '',
            brand: jobCompanyName(j.company_type || j.job_type, j.company?.company_name, j.company?.brand_name),
            brandDesc: j.company?.description || '',
            tags: [],
            title: j.title,
            jobType: j.job_type === 'OFFICE' ? '본사' : '매장',
            career: j.experience_level === 'NEW' ? '신입' : j.experience_level === 'EXPERIENCED' ? '경력' : '',
            education: j.education || '',
            jobCategories: Array.isArray(j.categories) ? j.categories : [],
            region: j.location || '',
            // 고용형태: 저장된 employment_type(비회원 자유입력 포함) 우선, 없으면 work_type 매핑
            employType: j.employment_type || '',
            headcount: j.headcount_text || (j.headcount ? `${j.headcount}명` : ''),
            genderPref: j.gender_preference || '',
            deadline: j.deadline ? String(j.deadline).slice(0, 10).replace(/-/g, '.') : '상시채용',
            positions: Array.isArray(j.positions) ? j.positions : [],
            salary: j.salary_text || (((j.salary_max && j.salary_max > j.salary_min)
              ? `${formatSalaryWon(j.salary_min, j.salary_type)} ~ ${formatSalaryWon(j.salary_max, j.salary_type).replace(/^[^0-9]*/, '')}`
              : formatSalaryWon(j.salary_min, j.salary_type)) || ''),
            color: '#f7f7f8',
            description: j.description || '',
            requirements: j.requirements ? j.requirements.split('\n').filter(Boolean) : [],
            preferreds: j.preferred_qualifications ? j.preferred_qualifications.split('\n').filter(Boolean) : [],
            benefits: (Array.isArray(j.benefit_tags) && j.benefit_tags.length) ? j.benefit_tags : (j.benefits ? j.benefits.split('\n').filter(Boolean) : []),
            responsibilities: j.responsibilities ? String(j.responsibilities).split('\n').filter(Boolean) : [],
            process: j.hiring_process || [],
            notes: j.notes || '',
            logo_url: j.company?.logo_url,
            // 공고에 지정한 상단 이미지가 있으면 그걸 쓰고, 없으면(null) 기업정보 커버로 폴백.
            //   공고에서 지운 경우엔 빈 배열이 와서 상단 이미지 없이 표시된다(기업정보는 그대로).
            cover_images: Array.isArray(j.cover_images) ? j.cover_images : (j.company?.cover_images || []),
            detailImages: j.detail_images || [],
            workPeriodText: j.work_period || "",
            workDaysText: j.work_days === "협의" ? "요일 협의" : (j.work_days ? String(j.work_days).split(",").join("·") : ""),
            workTimeText: j.work_time === "협의" ? "시간 협의" : (j.work_time || ""),
            // 관리자가 대신 올린 공고는 담당자 연락처를 내보내지 않고 지원 안내를
            // '뷰티워크 온라인지원' 하나로 낸다 — 등록 화면 미리보기와 같은 규칙이다.
            // 값은 DB에 그대로 남아 있다(나중에 그 번호로 연락해 회원가입을 권한다).
            contactName: j.is_external ? '' : (j.external_contact_name || ''),
            contactPhone: j.is_external ? '' : (j.external_contact_phone || ''),
            contactEmail: j.is_external ? '' : (j.external_contact_email || ''),
            contactMethods: j.is_external ? ['뷰티워크 온라인지원'] : (Array.isArray(j.contact_methods) ? j.contact_methods : []),
            companyInfo: {
              name: j.company?.company_name || '',
              brandName: j.company?.brand_name || '',
              representative: j.company?.representative_name || '',
              companyType: j.company?.company_type === 'STORE' ? '매장' : j.company?.company_type === 'OFFICE' ? '본사' : '',
              industry: j.company?.industry || '',
              size: j.company?.company_size || '',
              founded: j.company?.founded_year || '',
              phone: j.company?.company_phone || '',
              website: j.company?.website_url || '',
              location: composeCompanyAddress(j.company?.region_sido, j.company?.region_sigungu, j.company?.address),
              latitude: j.company?.latitude ?? null,
              longitude: j.company?.longitude ?? null,
            },
            // 이 공고에 따로 적어 둔 근무지 주소가 있으면 그것을 쓴다. 지점이 여럿인
            // 매장이 지점별로 다른 주소로 공고를 낼 수 있어야 한다. 없으면 매장 주소.
            companyAddress: (j.address || "").trim()
              || composeCompanyAddress(j.company?.region_sido, j.company?.region_sigungu, j.company?.address),
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
        } else {
          setNotFound(true);
        }
      })
      .catch(e => { console.error('[load job]', e); setNotFound(true); });
  }, [id]);

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
  const { isLoggedIn, userName, ownerType } = useAuthStore();
  const isCompany = ownerType === "company"; // 기업회원이면 지원·스크랩 불가
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
  const { toggle: toggleBookmark, isBookmarked, loadFromServer: loadBookmarks } = useBookmarkStore();
  useEffect(() => { loadBookmarks(); }, [loadBookmarks]);
  if (notFound) {
    return (
      <div className="job-detail-page">
        <div style={{ padding: "80px 20px", textAlign: "center", color: "#888" }}>
          <p style={{ marginBottom: 16 }}>공고를 찾을 수 없어요. 마감됐거나 아직 등록 중인 공고예요.</p>
          <Link href="/jobs" style={{ color: "#582681", fontWeight: 600 }}>채용공고 목록으로</Link>
        </div>
      </div>
    );
  }
  if (!job) {
    return (
      <div className="job-detail-page">
        <div style={{ padding: "80px 20px", textAlign: "center", color: "#888" }}>
          불러오는 중...
        </div>
      </div>
    );
  }
  const bookmarked = isBookmarked(String(job.id));
  const isExternal = !!job.isExternal;
  const isRedirect = isExternal && job.applyMethod === 'REDIRECT';
  const handleApplyClick = () => {
    if (isCompany) return;
    if (alreadyApplied) return;
    if (isRedirect) {
      if (job.externalApplyUrl) window.open(job.externalApplyUrl, "_blank", "noopener");
      return;
    }
    if (!isLoggedIn) { setShowLoginModal(true); } else { setShowApplyModal(true); }
  };
  const handleBookmark = () => {
    if (isCompany) return;
    if (!isLoggedIn) { setShowLoginModal(true); return; }
    toggleBookmark(String(job.id));
  };
  return (
    <div className="job-detail-page">
      {/* 헤더 */}
      <header className="job-detail-header">
        <div className="job-detail-header-inner">
          {/* 새 탭으로 연 경우(관리자 미리보기·공유 링크)엔 되돌아갈 기록이 없어 back 이 먹지 않았다.
              사이트 안에서 넘어온 게 확실할 때만 뒤로 가고(스크롤·필터 유지), 아니면 목록으로 보낸다. */}
          <button className="job-detail-back" onClick={() => {
            const cameFromSite = typeof document !== "undefined" && !!document.referrer
              && document.referrer.startsWith(window.location.origin);
            if (cameFromSite && window.history.length > 1) router.back();
            else router.push("/jobs");
          }}>
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
            <>
              {/* 미리보기는 구직자가 볼 화면 그대로여야 한다. 버튼 자리에 안내문을 넣어 두면
                  카드 생김새가 실제와 달라져, 무엇이 어디에 있는지 확인할 수가 없다.
                  같은 버튼을 두되 눌리지 않게 한다. */}
              <button className="job-detail-apply-btn" disabled style={{ opacity: 0.7, cursor: "default" }}>
                지원서 작성하기
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="job-detail-aside-bookmark" disabled style={{ flex: 1, minWidth: 0, opacity: 0.7, cursor: "default" }}>
                  <Bookmark size={16} />
                  스크랩
                </button>
                <button className="job-detail-aside-bookmark" disabled style={{ flex: 1, minWidth: 0, opacity: 0.7, cursor: "default" }}>
                  <Share2 size={16} />
                  공유
                </button>
              </div>
              {/* 미리보기에서 잘못된 값을 발견하면 그 자리에서 고치러 갈 수 있어야 한다.
                  목록으로 되돌아가 다시 찾게 하면 고치다 말게 된다. */}
              <button
                className="admin-secondary-btn"
                style={{ width: "100%", marginTop: "10px" }}
                onClick={() => router.push(`/admin/jobs/new?id=${job.id}`)}
              >
                공고 수정하기
              </button>
              <div style={{
                background: "#fff7ed", color: "#c2410c", borderRadius: "10px",
                padding: "10px 12px", fontSize: "12.5px", lineHeight: 1.5,
                textAlign: "center", marginTop: "10px"
              }}>
                관리자 미리보기라 위 두 버튼은 눌리지 않아요.
              </div>
            </>
          ) : isOwnerCompany ? (
            <>
              <div style={{
                background: "#f7f7f8", color: "#582681", borderRadius: "10px",
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
          ) : isCompany ? (
            <div style={{
              background: "#f6f6f8", color: "#888", borderRadius: "10px",
              padding: "12px 14px", fontSize: "13px", lineHeight: 1.5, textAlign: "center"
            }}>
              기업회원 계정에서는 지원·스크랩을 이용할 수 없어요.
            </div>
          ) : (
            <>
              <button
                className={`job-detail-apply-btn ${alreadyApplied ? "applied" : ""}`}
                disabled={alreadyApplied}
                onClick={handleApplyClick}
              >
                {alreadyApplied ? "✓ 지원완료" : isRedirect ? "기업 채용페이지에서 지원" : "지원서 작성하기"}
              </button>
              {/* 스크랩과 공유를 나란히 둔다. 위아래로 쌓으면 카드가 그만큼 길어져
                  지원 버튼이 화면 밖으로 밀린다. 공유는 모바일 하단 바에만 있어서
                  PC 로 보는 사람은 링크를 주소창에서 긁어야 했다. */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className={`job-detail-aside-bookmark ${bookmarked ? "active" : ""}`}
                  style={{ flex: 1, minWidth: 0 }}
                  onClick={handleBookmark}
                >
                  <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />
                  {bookmarked ? "스크랩 완료" : "스크랩"}
                </button>
                <button
                  className="job-detail-aside-bookmark"
                  style={{ flex: 1, minWidth: 0 }}
                  onClick={handleShare}
                >
                  <Share2 size={16} />
                  공유
                </button>
              </div>
            </>
          )
        }
      />

      {/* 모바일 하단 CTA */}
      <div className="job-detail-mobile-cta">
        {isAdminPreview ? (
          <button className="job-detail-mobile-apply" onClick={() => router.push(`/admin/jobs/new?id=${job.id}`)}>
            공고 수정하기
          </button>
        ) : isOwnerCompany ? (
          <button
            className="job-detail-mobile-apply"
            onClick={() => router.push(`/company/dashboard/jobs/new?id=${job.id}`)}
          >
            공고 수정하기
          </button>
        ) : isCompany ? (
          <button className="job-detail-mobile-apply" disabled style={{ opacity: 0.7 }}>
            기업회원은 지원 불가
          </button>
        ) : (
          <>
            <button
              className={`job-detail-mobile-bookmark ${bookmarked ? "active" : ""}`}
              onClick={handleBookmark}
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
              onClick={handleApplyClick}
            >
              {alreadyApplied ? "✓ 지원완료" : isRedirect ? "기업 채용페이지에서 지원" : "지원하기"}
            </button>
          </>
        )}
      </div>

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}

      {/* 지원하기 모달 */}
      {showApplyModal && job && (
        <ApplyModal
          jobId={String(params.id)}
          isExternal={isExternal}
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
