"use client";
import { forwardRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { shortRegion } from "@/lib/regionShort";
import KakaoMap from "@/components/KakaoMap";
import { MapPin, Clock, Briefcase, Building2, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";

// 공고 상단 이미지 슬라이드(캐러셀). 여러 장이면 좌우 화살표·점으로 넘긴다.
function ImageCarousel({ images, alt }: { images: string[]; alt?: string }) {
  const [i, setI] = useState(0);
  const n = images.length;
  const cur = Math.min(i, n - 1);
  const go = (d: number) => setI((p) => (((p + d) % n) + n) % n);
  const arrow: CSSProperties = {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 40, height: 40, borderRadius: "50%", border: "none",
    background: "rgba(255,255,255,0.92)", color: "#333",
    cursor: "pointer", zIndex: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  return (
    <div style={{ position: "relative", width: "100%", background: "#f4f4f4" }}>
      {/* 외부 공고 이미지를 원본 비율 그대로 노출 */}
      <img src={images[cur]} alt={alt} style={{ display: "block", width: "100%", height: "auto" }} />
      {n > 1 && (
        <>
          <button type="button" aria-label="이전 이미지" onClick={() => go(-1)} style={{ ...arrow, left: 12 }}><ChevronLeft size={22} /></button>
          <button type="button" aria-label="다음 이미지" onClick={() => go(1)} style={{ ...arrow, right: 12 }}><ChevronRight size={22} /></button>
          <div style={{ position: "absolute", bottom: 12, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 6, zIndex: 3 }}>
            {images.map((_, k) => (
              <span key={k} onClick={() => setI(k)} style={{ width: 8, height: 8, borderRadius: "50%", cursor: "pointer", background: k === cur ? "#fff" : "rgba(255,255,255,0.55)" }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

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
 * 회사 정보는 공고 내용 아래에 인라인으로 표시(등록 시 입력한 값 그대로).
 */
const JobDetailView = forwardRef<HTMLDivElement, JobDetailViewProps>(function JobDetailView(
  { job, related = [], companyJobsCount = 0, onBrandClick, asideAction },
  ref
) {
  const ci = job.companyInfo || {};
  const hasMap = (ci.latitude && ci.longitude) || job.companyAddress?.trim();
  const companyRows: [string, ReactNode][] = [];
  if (ci.name) companyRows.push(["회사명", ci.name]);
  if (ci.brandName) companyRows.push(["브랜드명", ci.brandName]);
  if (ci.companyType) companyRows.push(["기업 유형", ci.companyType]);
  if (ci.industry) companyRows.push(["업종", ci.industry]);
  if (ci.representative) companyRows.push(["대표자", ci.representative]);
  if (ci.size) companyRows.push(["규모", ci.size]);
  if (ci.founded) companyRows.push(["설립", ci.founded]);
  if (ci.phone) companyRows.push(["대표번호", ci.phone]);
  if (ci.website) companyRows.push(["웹사이트",
    <a key="w" href={/^https?:\/\//.test(ci.website) ? ci.website : `https://${ci.website}`}
      target="_blank" rel="noreferrer" style={{ color: "#5f0080", wordBreak: "break-all" }}>{ci.website}</a>]);
  if (ci.location) companyRows.push(["위치", shortRegion(ci.location)]);
  const hasCompanyInfo = job.brandDesc?.trim() || companyRows.length > 0;

  return (
    <div className="job-detail-layout" ref={ref}>
      {/* 왼쪽: 공고 본문 */}
      <main className="job-detail-main">
        {/* 썸네일(캐러셀) + 기본 정보 */}
        {(() => {
          const heroImgs = [
            ...(Array.isArray(job.cover_images) ? job.cover_images.map((c: any) => c?.url) : []),
            ...(Array.isArray(job.detailImages) ? job.detailImages.map((d: any) => d?.url) : []),
          ].filter(Boolean) as string[];
          const uniq = [...new Set(heroImgs)];
          const logoBadge = (
            <div className="job-detail-hero-logo" style={{ zIndex: 4 }}>
              {job.logo_url ? (
                <img src={job.logo_url} alt={`${job.brand} 로고`} />
              ) : (
                <span style={{ fontSize: 22, fontWeight: 800, color: "#5f0080" }}>
                  {job.brand?.[0] || "·"}
                </span>
              )}
            </div>
          );
          // 이미지가 있으면 원본 비율 그대로 캐러셀, 없으면 기존 플레이스홀더 히어로
          return uniq.length ? (
            <div style={{ position: "relative", width: "100%", borderRadius: "16px 16px 0 0", overflow: "hidden" }}>
              <ImageCarousel images={uniq} alt={job.brand} />
              {logoBadge}
            </div>
          ) : (
            <div className="job-detail-hero" style={{ background: job.color }}>
              <div className="job-detail-hero-placeholder">
                <span>{job.brand?.[0] || "·"}</span>
              </div>
              {logoBadge}
            </div>
          );
        })()}

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

        {/* 포지션 소개 */}
        {job.description?.trim() && (
          <section className="job-detail-section">
            <h2 className="job-detail-section-title">포지션 소개</h2>
            <p className="job-detail-desc">{job.description.trim()}</p>
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

        {/* 혜택 및 복지 */}
        {job.benefits?.length > 0 && (
          <section className="job-detail-section">
            <h2 className="job-detail-section-title">혜택 및 복지</h2>
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

        {/* 근무지역 */}
        {hasMap && (
          <section className="job-detail-section">
            <h2 className="job-detail-section-title">근무지역</h2>
            {job.companyAddress?.trim() && (
              <p className="job-detail-desc" style={{ marginBottom: "12px" }}>{job.companyAddress}</p>
            )}
            {ci.latitude && ci.longitude ? (
              <KakaoMap latitude={Number(ci.latitude)} longitude={Number(ci.longitude)} name={ci.name} />
            ) : (
              <iframe
                title="회사 위치"
                width="100%"
                height="280"
                style={{ border: 0, borderRadius: "12px" }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(job.companyAddress)}&output=embed&hl=ko`}
              />
            )}
          </section>
        )}

        {/* 기업 정보 (공고 내용 아래) */}
        {hasCompanyInfo && (
          <section className="job-detail-section">
            <h2 className="job-detail-section-title">기업 정보</h2>
            {job.brandDesc?.trim() && (
              <p className="job-detail-brand-desc" style={{ whiteSpace: "pre-line", marginBottom: companyRows.length ? "16px" : 0 }}>{job.brandDesc}</p>
            )}
            {companyRows.length > 0 && (
              <div className="job-detail-company-info">
                {companyRows.map(([label, val], i) => (
                  <div key={i} className="job-detail-company-row"
                    style={label === "웹사이트" || label === "위치" ? { gridColumn: "1 / -1" } : undefined}>
                    <span className="job-detail-company-label">{label}</span>
                    <span>{val}</span>
                  </div>
                ))}
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
