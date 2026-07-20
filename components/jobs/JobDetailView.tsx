"use client";
import { forwardRef, type ReactNode } from "react";
import Link from "next/link";
import { shortRegion } from "@/lib/regionShort";
import KakaoMap from "@/components/KakaoMap";
import { MapPin, Clock, Briefcase, Building2, CheckCircle2, ChevronRight } from "lucide-react";

interface JobDetailViewProps {
  job: any;
  related?: any[];
  companyJobsCount?: number;
  onBrandClick?: () => void;
  asideAction?: ReactNode;
}

/**
 * 채용공고 상세 본문(좌측 본문 + 우측 지원 카드).
 * 실제 상세 페이지와 등록/수정 미리보기에서 동일하게 사용한다.
 */
const JobDetailView = forwardRef<HTMLDivElement, JobDetailViewProps>(function JobDetailView(
  { job, related = [], companyJobsCount = 0, onBrandClick, asideAction },
  ref
) {
  return (
    <div className="job-detail-layout" ref={ref}>
      {/* 왼쪽: 공고 본문 */}
      <main className="job-detail-main">
        {/* 썸네일 + 기본 정보 */}
        <div className="job-detail-hero" style={{ background: job.color }}>
          {(() => {
            const heroImg =
              (Array.isArray(job.cover_images) && job.cover_images[0]?.url) ||
              (Array.isArray(job.detailImages) && job.detailImages[0]?.url);
            return heroImg ? (
              <img src={heroImg} alt={job.brand}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div className="job-detail-hero-placeholder">
                <span>{job.brand?.[0] || "·"}</span>
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
              style={{ cursor: onBrandClick ? "pointer" : "default" }}
              onClick={() => onBrandClick?.()}
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
              <span>{shortRegion(job.region || "")}</span>
            </div>
            <div className="job-detail-meta-item">
              <Briefcase size={15} className="job-detail-meta-icon" />
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
            {job.companyInfo?.name && (
              <div className="job-detail-company-row">
                <span className="job-detail-company-label">회사명</span>
                <span>{job.companyInfo.name}</span>
              </div>
            )}
            {job.companyInfo?.brandName && (
              <div className="job-detail-company-row">
                <span className="job-detail-company-label">브랜드명</span>
                <span>{job.companyInfo.brandName}</span>
              </div>
            )}
            {job.companyInfo?.companyType && (
              <div className="job-detail-company-row">
                <span className="job-detail-company-label">기업 유형</span>
                <span>{job.companyInfo.companyType}</span>
              </div>
            )}
            {job.companyInfo?.representative && (
              <div className="job-detail-company-row">
                <span className="job-detail-company-label">대표자</span>
                <span>{job.companyInfo.representative}</span>
              </div>
            )}
            {job.companyInfo?.size && (
              <div className="job-detail-company-row">
                <span className="job-detail-company-label">규모</span>
                <span>{job.companyInfo.size}</span>
              </div>
            )}
            {job.companyInfo?.founded && (
              <div className="job-detail-company-row">
                <span className="job-detail-company-label">설립</span>
                <span>{job.companyInfo.founded}</span>
              </div>
            )}
            {job.companyInfo?.phone && (
              <div className="job-detail-company-row">
                <span className="job-detail-company-label">대표번호</span>
                <span>{job.companyInfo.phone}</span>
              </div>
            )}
            {job.companyInfo?.website && (
              <div className="job-detail-company-row" style={{ gridColumn: "1 / -1" }}>
                <span className="job-detail-company-label">웹사이트</span>
                <a href={/^https?:\/\//.test(job.companyInfo.website) ? job.companyInfo.website : `https://${job.companyInfo.website}`}
                  target="_blank" rel="noreferrer" style={{ color: "#5f0080", wordBreak: "break-all" }}>
                  {job.companyInfo.website}
                </a>
              </div>
            )}
            {job.companyInfo?.location && (
              <div className="job-detail-company-row" style={{ gridColumn: "1 / -1" }}>
                <span className="job-detail-company-label">위치</span>
                <span>{shortRegion(job.companyInfo.location)}</span>
              </div>
            )}
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

        {/* 근무 조건 (매장직) */}
        {(job.workDaysText || job.workTimeText) && (
          <section className="job-detail-section">
            <h2 className="job-detail-section-title">근무 조건</h2>
            <div className="job-detail-company-info">
              {job.workDaysText && (
                <div className="job-detail-company-row">
                  <span className="job-detail-company-label">근무 요일</span>
                  <span>{job.workDaysText}</span>
                </div>
              )}
              {job.workTimeText && (
                <div className="job-detail-company-row">
                  <span className="job-detail-company-label">근무 시간</span>
                  <span>{job.workTimeText}</span>
                </div>
              )}
            </div>
          </section>
        )}

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
        {/* 이 회사의 다른 공고 */}
        {companyJobsCount > 0 && job.brand && (
          <section className="job-detail-section">
            <Link href={`/jobs?q=${encodeURIComponent(job.brand)}`} className="job-detail-more-link">
              <span>{job.brand}의 다른 채용공고<span className="job-detail-more-sub">{companyJobsCount}건</span></span>
              <ChevronRight size={20} />
            </Link>
          </section>
        )}
        {/* 관련 공고 */}
        {related.length > 0 && (
          <section className="job-detail-section">
            <Link href={`/jobs?type=${job.jobType === "사무직" ? "기업" : "매장"}`} className="job-detail-more-link">
              <span>관련 채용공고<span className="job-detail-more-sub">비슷한 포지션 더보기</span></span>
              <ChevronRight size={20} />
            </Link>
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
            <span>{shortRegion(job.region || "")}</span>
          </div>
          {job.salary && (
            <div className="job-detail-aside-salary">{job.salary}</div>
          )}
          <div className="job-detail-aside-deadline">
            {job.deadline === "상시채용" ? <strong>상시채용</strong> : <>마감일: <strong>{job.deadline}</strong></>}
          </div>
          {asideAction}
        </div>
      </aside>
    </div>
  );
});

export default JobDetailView;
