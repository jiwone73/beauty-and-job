"use client";
import LoginModal from "@/components/LoginModal";
import KakaoMap from "@/components/KakaoMap";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";
import { useApplicationStore } from "@/lib/store/applicationStore";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft, Bookmark, Share2, MapPin, Clock,
  Users, Building2, CheckCircle2, ChevronRight,
} from "lucide-react";

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

  useEffect(() => {
    if (!id) return;
    fetch(`/api/jobs/${id}/related`)
      .then(r => r.json())
      .then(res => { if (res.success && res.data) setRelated(res.data.related || []); })
      .catch(() => {});
  }, [id]);
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
            salary: j.salary_min ? `${(j.salary_min/10000).toLocaleString()}만원 ~` : '협의',
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
            companyInfo: {
              name: j.company?.company_name || '',
              size: j.company?.company_size || '',
              location: [j.company?.region_sido, j.company?.region_sigungu, j.company?.address].filter(Boolean).join(' ') || '',
              founded: j.company?.founded_year || '',
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
          // 어드민이 보는 경우도 미리보기 모드 (지원/북마크 숨김)
          if (localStorage.getItem("admin_token")) {
            setIsAdminPreview(true);
          }
        }
      })
      .catch(e => console.error('[load job]', e));
  }, [id]);

  const [bookmarked, setBookmarked] = useState(false);
  const [isOwnerCompany, setIsOwnerCompany] = useState(false);
  const [isAdminPreview, setIsAdminPreview] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyDone, setApplyDone] = useState(false);
  const [dbApplied, setDbApplied] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [applySuccess, setApplySuccess] = useState(false);
  const { isLoggedIn, userName } = useAuthStore();
  const { apply, isApplied } = useApplicationStore();
  const alreadyApplied = job ? isApplied(String(job.id)) : false;
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
          <Link href="/" className="job-detail-logo"><Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} priority /></Link>
          <div className="job-detail-header-actions">
            <button
              className={`job-detail-bookmark ${bookmarked ? "active" : ""}`}
              onClick={() => setBookmarked(!bookmarked)}
            >
              <Bookmark size={20} fill={bookmarked ? "currentColor" : "none"} />
            </button>
            <button className="job-detail-share" onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              alert("링크가 복사되었습니다.");
            }}>
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="job-detail-layout">
        {/* 왼쪽: 공고 본문 */}
        <main className="job-detail-main">
          {/* 썸네일 + 기본 정보 */}
          <div className="job-detail-hero" style={{ background: job.color }}>
            {(() => {
              const heroImg =
                (Array.isArray(job.cover_images) && job.cover_images[0]?.url) ||
                (Array.isArray(job.detailImages) && job.detailImages[0]?.url) ||
                job.logo_url;
              return heroImg ? (
                <img src={heroImg} alt={job.brand}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div className="job-detail-hero-placeholder">
                  <span>{job.brand[0]}</span>
                </div>
              );
            })()}
            <div className="job-detail-hero-logo">
              {job.logo_url ? (
                <img src={job.logo_url} alt={`${job.brand} 로고`} />
              ) : (
                <span style={{ fontSize: 22, fontWeight: 800, color: "#5f0080" }}>
                  {job.brand?.[0] || "·"}
                </span>
              )}
            </div>
          </div>

          <div className="job-detail-info-box">
            <div className="job-detail-brand-row">
              <span
                className="job-detail-brand"
                style={{ cursor: job.companyId ? "pointer" : "default" }}
                onClick={() => { if (job.companyId) router.push(`/brands/${job.companyId}`); }}
              >
                {job.brand}
              </span>
              {job.tags?.map((tag: string) => (
                <span key={tag} className="job-detail-tag">· {tag}</span>
              ))}
            </div>
            <h1 className="job-detail-title">{job.title}</h1>

            <div className="job-detail-meta-grid">
              <div className="job-detail-meta-item">
                <MapPin size={15} className="job-detail-meta-icon" />
                <span>{job.region}</span>
              </div>
              <div className="job-detail-meta-item">
                <Users size={15} className="job-detail-meta-icon" />
                <span>{job.career}</span>
              </div>
              <div className="job-detail-meta-item">
                <Building2 size={15} className="job-detail-meta-icon" />
                <span>{job.employType}</span>
              </div>
              <div className="job-detail-meta-item">
                <Clock size={15} className="job-detail-meta-icon" />
                <span>{job.deadline === "상시채용" ? "상시채용" : `~${job.deadline}`}</span>
              </div>
            </div>

            {job.salary && (
              <div className="job-detail-salary">
                💰 {job.salary}
              </div>
            )}
          </div>

          {/* 회사 소개 */}
          <section className="job-detail-section">
            <h2 className="job-detail-section-title">회사 소개</h2>
            {job.brandDesc?.trim() && (
              <p className="job-detail-brand-desc" style={{ whiteSpace: "pre-line" }}>{job.brandDesc}</p>
            )}
            <div className="job-detail-company-info">
              <div className="job-detail-company-row">
                <span className="job-detail-company-label">회사명</span>
                <span>{job.companyInfo?.name}</span>
              </div>
              <div className="job-detail-company-row">
                <span className="job-detail-company-label">규모</span>
                <span>{job.companyInfo?.size}</span>
              </div>
              <div className="job-detail-company-row">
                <span className="job-detail-company-label">위치</span>
                <span>{job.companyInfo?.location}</span>
              </div>
              <div className="job-detail-company-row">
                <span className="job-detail-company-label">설립</span>
                <span>{job.companyInfo?.founded}</span>
              </div>
            </div>
            {job.companyInfo?.latitude && job.companyInfo?.longitude ? (
              <div style={{ marginTop: "20px" }}>
                <KakaoMap
                  latitude={Number(job.companyInfo.latitude)}
                  longitude={Number(job.companyInfo.longitude)}
                  name={job.companyInfo?.name}
                />
              </div>
            ) : job.companyAddress?.trim() ? (
              <div style={{ marginTop: "20px" }}>
                <iframe
                  title="회사 위치"
                  width="100%"
                  height="280"
                  style={{ border: 0, borderRadius: "12px" }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(job.companyAddress)}&output=embed&hl=ko`}
                />
              </div>
            ) : null}
          </section>

          {/* 포지션 소개 */}
          {job.description?.trim() && (
            <section className="job-detail-section">
              <h2 className="job-detail-section-title">포지션 소개</h2>
              <p className="job-detail-desc">{job.description.trim()}</p>
            </section>
          )}
          {/* 상세 이미지 */}
          {job.detailImages?.length > 0 && (
            <section className="job-detail-section">
              <h2 className="job-detail-section-title">상세 이미지</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {job.detailImages.map((img: { url: string; name: string }, i: number) => (
                  <img key={i} src={img.url} alt={img.name || `상세 이미지 ${i + 1}`}
                    style={{ width: "100%", borderRadius: "12px", border: "1px solid #eee" }} />
                ))}
              </div>
            </section>
          )}

          {/* 주요 업무 */}
          {job.responsibilities?.length > 0 && (
            <section className="job-detail-section">
              <h2 className="job-detail-section-title">주요 업무</h2>
              <ul className="job-detail-list">
                {job.responsibilities.map((item: string, i: number) => (
                  <li key={i} className="job-detail-list-item">
                    <CheckCircle2 size={16} className="job-detail-list-icon" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 자격 요건 */}
          {job.requirements?.length > 0 && (
            <section className="job-detail-section">
              <h2 className="job-detail-section-title">자격 요건</h2>
              <ul className="job-detail-list">
                {job.requirements.map((item: string, i: number) => (
                  <li key={i} className="job-detail-list-item">
                    <CheckCircle2 size={16} className="job-detail-list-icon" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 우대 사항 */}
          {job.preferreds?.length > 0 && (
            <section className="job-detail-section">
              <h2 className="job-detail-section-title">우대 사항</h2>
              <ul className="job-detail-list">
                {job.preferreds.map((item: string, i: number) => (
                  <li key={i} className="job-detail-list-item">
                    <CheckCircle2 size={16} className="job-detail-list-icon check-soft" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 복리후생 */}
          {job.benefits?.length > 0 && (
            <section className="job-detail-section">
              <h2 className="job-detail-section-title">복리후생</h2>
              <div className="job-detail-benefits">
                {job.benefits.map((item: string, i: number) => (
                  <span key={i} className="job-detail-benefit-chip">{item}</span>
                ))}
              </div>
            </section>
          )}

          {/* 채용 절차 */}
          {(job.process?.length > 0 || job.notes?.trim()) && (
            <section className="job-detail-section">
              <h2 className="job-detail-section-title">채용 절차</h2>
              {job.process?.length > 0 && (
                <div className="job-detail-process">
                  {job.process.map((step: string, i: number) => (
                    <div key={i} className="job-detail-process-step">
                      <div className="job-detail-process-num">{i + 1}</div>
                      <span className="job-detail-process-label">{step}</span>
                      {i < job.process.length - 1 && (
                        <ChevronRight size={16} className="job-detail-process-arrow" />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {job.notes?.trim() && (
                <div style={{
                  marginTop: job.process?.length > 0 ? "20px" : "0",
                  padding: "14px 16px", background: "#faf8fc", borderRadius: "8px",
                  fontSize: "14px", color: "#555", lineHeight: 1.6, whiteSpace: "pre-line"
                }}>
                  {job.notes}
                </div>
              )}
            </section>
          )}
          {/* 관련 공고 */}
          {related.length > 0 && (
          <section className="job-detail-section">
            <h2 className="job-detail-section-title">관련 채용공고</h2>
            <div className="job-detail-related">
              {related.map((r) => {
                const brand = r.brand_name || r.company_name || "";
                const exp = r.experience_level === 'NEW' ? '신입' : r.experience_level === 'EXPERIENCED' ? '경력' : '경력 무관';
                const regionShort = r.location ? String(r.location).split(" ").slice(0, 2).join(" ") : "";
                return (
                  <Link key={r.id} href={`/jobs/${r.id}`} className="job-detail-related-card">
                    <div className="job-detail-related-thumb" style={{ background: "#f3e5f5", overflow: "hidden" }}>
                      {r.logo_url ? <img src={r.logo_url} alt={brand} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span>{brand[0]}</span>}
                    </div>
                    <div className="job-detail-related-info">
                      <span className="job-detail-related-brand">{brand}</span>
                      <p className="job-detail-related-title">{r.title}</p>
                      <span className="job-detail-related-meta">{exp}{regionShort ? ` · ${regionShort}` : ""}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
          )}
        </main>

        {/* 오른쪽: 지원하기 사이드바 (PC) */}
        <aside className="job-detail-aside">
          <div className="job-detail-aside-card">
            <div className="job-detail-aside-brand">{job.brand}</div>
            <h3 className="job-detail-aside-title">{job.title}</h3>
            <div className="job-detail-aside-meta">
              <span>{job.career}</span>
              <span className="dot">·</span>
              <span>{job.region}</span>
            </div>
            {job.salary && (
              <div className="job-detail-aside-salary">{job.salary}</div>
            )}
            <div className="job-detail-aside-deadline">
              {job.deadline === "상시채용" ? <strong>상시채용</strong> : <>마감일: <strong>{job.deadline}</strong></>}
            </div>
            {isAdminPreview ? (
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
                  {alreadyApplied ? "✓ 지원완료" : "지원하기"}
                </button>
                <button
                  className={`job-detail-aside-bookmark ${bookmarked ? "active" : ""}`}
                  onClick={() => setBookmarked(!bookmarked)}
                >
                  <Bookmark size={16} fill={bookmarked ? "currentColor" : "none"} />
                  {bookmarked ? "북마크 완료" : "북마크"}
                </button>
              </>
            )}
          </div>
        </aside>
      </div>

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
      {showApplyModal && (
        <div className="cv-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cv-header">
              <div style={{ width: 36 }} />
              <h2 className="cv-title">지원하기</h2>
              <button className="cv-close" onClick={() => setShowApplyModal(false)}>✕</button>
            </div>
            <div className="cv-body">
              <div className="apply-modal-job">
                <strong>{job.brand}</strong>
                <p>{job.title}</p>
              </div>
              <p className="cv-desc">
                현재 프로필로 지원하시겠어요?<br />
                프로필이 완성될수록 합격률이 높아져요.
              </p>
              <Link href="/profile" className="apply-modal-profile-btn">
                프로필 완성하기 →
              </Link>
              <button className="cv-btn-primary" onClick={async () => {
                const token = localStorage.getItem("access_token");
                if (!token) {
                  alert("로그인이 필요합니다.");
                  return;
                }
                try {
                  const res = await fetch(`/api/jobs/${params.id}/apply`, {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({}),
                  });
                  const data = await res.json();
                  if (!data.success) {
                    if (data.error?.code === "APP_002") {
                      if (confirm(`${data.error.message}\n\n지금 프로필을 완성하시겠어요?`)) {
                        router.push("/profile");
                      }
                      return;
                    }
                    alert(data.error?.message || "지원에 실패했습니다.");
                    return;
                  }
                  alert("지원이 완료되었습니다!");
                  setShowApplyModal(false);
                } catch (e) {
                  console.error(e);
                  alert("지원 중 오류가 발생했습니다.");
                }
              }}>
                현재 프로필로 지원하기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
