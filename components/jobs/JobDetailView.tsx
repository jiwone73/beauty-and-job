"use client";
import { forwardRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { shortRegion } from "@/lib/regionShort";
import { BannerImg } from "@/components/BannerImg";
import KakaoMap from "@/components/KakaoMap";
import { Clock, Briefcase, CheckCircle2, ChevronRight, ChevronLeft, Users, Tag } from "lucide-react";

// 공고 상단 이미지 갤러리(원티드 스타일). 한 번에 3장 노출, 좌우 화살표로 순환.
export function ImageCarousel({ images, alt }: { images: string[]; alt?: string }) {
  const [start, setStart] = useState(0);
  const n = images.length;
  const PER = 3;
  const arrow: CSSProperties = {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 40, height: 40, borderRadius: "50%", border: "none",
    background: "rgba(255,255,255,0.95)", color: "#333",
    cursor: "pointer", zIndex: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  // 배너는 항상 3:1 와이드 띠로 고정(1장이어도). 이미지는 자르지 않고 축소해 담고 여백은 배경색으로 채움.
  if (n === 1) {
    return (
      <div style={{ width: "100%", aspectRatio: "3 / 1", borderRadius: 12, overflow: "hidden" }}>
        <BannerImg src={images[0]} alt={alt} />
      </div>
    );
  }

  const cols = Math.min(n, PER);
  // 시작 위치를 순환(wrap)시켜 3장 이하라도 좌우 화살표로 로테이션되게 한다.
  const s = ((start % n) + n) % n;
  const visible = Array.from({ length: cols }, (_, k) => images[(s + k) % n]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 0, borderRadius: 12, overflow: "hidden", aspectRatio: "3 / 1" }}>
        {visible.map((src, k) => (
          <BannerImg key={k} src={src} alt={alt} />
        ))}
      </div>
      {/* 이미지가 2장 이상이면 항상 좌우 화살표 노출 (순환) */}
      <button type="button" aria-label="이전 이미지" onClick={() => setStart(s - 1)} style={{ ...arrow, left: 8 }}><ChevronLeft size={22} /></button>
      <button type="button" aria-label="다음 이미지" onClick={() => setStart(s + 1)} style={{ ...arrow, right: 8 }}><ChevronRight size={22} /></button>
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
  if (ci.location) companyRows.push(["주소", ci.location]);
  const hasCompanyInfo = job.brandDesc?.trim() || companyRows.length > 0;
  // 상세 이미지가 있으면 상세내용(텍스트) 섹션은 공개 화면에서 숨김(이미지로 대체). 데이터는 그대로 유지.
  const hasDetailImages = Array.isArray(job.detailImages) && job.detailImages.some((d: any) => d?.url);

  // 근무조건·근무지역은 '기본정보' 성격이라, 이미지형 공고에선 세로로 긴 상세이미지 "앞"에 먼저 노출한다.
  // (블록을 한 번만 정의하고 위치만 바꿔 끼운다 — 텍스트형 공고는 기존 순서 그대로.)
  const workCondSection = (job.salary || job.employType || job.workDaysText || job.workTimeText || job.benefits?.length > 0) ? (
    <div className="jd-subblock" key="workcond">
      <h2 className="job-detail-subtitle">근무 조건</h2>
      <div className="job-detail-company-info">
        {job.salary && (
          <div className="job-detail-company-row">
            <span className="job-detail-company-label">급여</span>
            <span>{job.salary}</span>
          </div>
        )}
        {job.employType && (
          <div className="job-detail-company-row">
            <span className="job-detail-company-label">고용형태</span>
            <span>{job.employType}</span>
          </div>
        )}
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
        {job.benefits?.length > 0 && (
          <div className="job-detail-company-row" style={{ gridColumn: "1 / -1" }}>
            <span className="job-detail-company-label">복리후생</span>
            <span>{job.benefits.join("   ·   ")}</span>
          </div>
        )}
      </div>
    </div>
  ) : null;

  const locationSection = hasMap ? (
    <div className="jd-subblock" key="location">
      <h2 className="job-detail-subtitle">근무지역</h2>
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
    </div>
  ) : null;

  // 복리후생·채용 담당자·채용 절차도 '기본정보' 카드 안의 서브블록으로 합침(빈 값은 자동 숨김).
  // 채용 담당자 · 채용 절차는 각각 별도 항목(빈 값 자동 숨김).
  const hasContact = !!(job.contactName || job.contactPhone || job.contactEmail);
  const hasMethods = !!(job.contactMethods?.length);
  const hasProcess = !!(job.process?.length > 0 || job.notes?.trim());
  const contactInner = hasContact ? (
    <div>
      <div className="jd-sublabel">채용 담당자</div>
      <div className="job-detail-company-info">
        {job.contactName && (
          <div className="job-detail-company-row">
            <span className="job-detail-company-label">이름</span>
            <span>{job.contactName}</span>
          </div>
        )}
        {job.contactPhone && (
          <div className="job-detail-company-row">
            <span className="job-detail-company-label">전화</span>
            <span>{job.contactPhone}</span>
          </div>
        )}
        {job.contactEmail && (
          <div className="job-detail-company-row">
            <span className="job-detail-company-label">이메일</span>
            <span>{job.contactEmail}</span>
          </div>
        )}
      </div>
    </div>
  ) : null;

  const methodsInner = hasMethods ? (
    <div>
      <div className="jd-sublabel">접수방법</div>
      <div style={{ fontSize: 15, color: "var(--color-text)" }}>{job.contactMethods.join("   ·   ")}</div>
    </div>
  ) : null;

  const processInner = hasProcess ? (
    <div>
      <div className="jd-sublabel">채용 절차</div>
      {job.process?.length > 0 && (
        <div className="job-detail-process">
          {job.process.map((step: string, i: number) => (
            <div key={i} className="job-detail-process-step">
              <span className="job-detail-process-num">{i + 1}</span>
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
          marginTop: job.process?.length > 0 ? "16px" : "0",
          padding: "14px 16px", background: "#faf8fc", borderRadius: "8px",
          fontSize: "15px", color: "#555", lineHeight: 1.6, whiteSpace: "pre-line"
        }}>
          {job.notes}
        </div>
      )}
    </div>
  ) : null;

  // 지원 안내: 채용 담당자 + 접수방법 + 채용 절차를 하나의 항목으로 묶음
  const applyGuideBlock = (hasContact || hasMethods || hasProcess) ? (
    <div className="jd-subblock" key="apply-guide">
      <h2 className="job-detail-subtitle">지원 안내</h2>
      {hasContact && <div style={{ marginBottom: 18 }}>{contactInner}</div>}
      {hasMethods && <div style={{ marginBottom: hasProcess ? 18 : 0 }}>{methodsInner}</div>}
      {hasProcess && <div>{processInner}</div>}
    </div>
  ) : null;

  return (
    <div className="job-detail-layout" ref={ref}>
      {/* 왼쪽: 공고 본문 */}
      <main className="job-detail-main">
        {/* 상단 배너: 커버 이미지만(상세 이미지는 본문에 세로 스택으로 별도 표시). */}
        {(() => {
          const coverUrls = [...new Set(
            (Array.isArray(job.cover_images) ? job.cover_images.map((c: any) => c?.url) : []).filter(Boolean)
          )] as string[];
          const hasDetail = Array.isArray(job.detailImages) && job.detailImages.some((d: any) => d?.url);
          // 배너: 1장이면 전체폭, 여러 장이면 3장씩 + 좌우 화살표 회전(ImageCarousel).
          if (coverUrls.length) {
            return (
              <div style={{ width: "100%", marginBottom: 4 }}>
                <ImageCarousel images={coverUrls} alt={job.brand} />
              </div>
            );
          }
          // 배너는 없지만 상세 이미지가 본문을 채우면 상단 히어로 생략.
          if (hasDetail) return null;
          return (
            <div className="job-detail-hero" style={{ background: job.color }}>
              <div className="job-detail-hero-placeholder">
                <span>{job.brand?.[0] || "·"}</span>
              </div>
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
          );
        })()}

        {/* 기본정보: 등록 폼과 동일하게 본문에 항상 노출(채용분야·경력·모집·마감일) */}
        <div className="job-detail-info-box jd-show">
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
            {job.jobCategories?.length > 0 && (
              <div className="job-detail-meta-item">
                <Tag size={16} className="job-detail-meta-icon" />
                <span className="job-detail-meta-label">채용분야</span>
                <span className="job-detail-meta-value">{job.jobCategories.join(", ")}</span>
              </div>
            )}
            {job.career && (
              <div className="job-detail-meta-item">
                <Briefcase size={16} className="job-detail-meta-icon" />
                <span className="job-detail-meta-label">경력</span>
                <span className="job-detail-meta-value">{job.career}</span>
              </div>
            )}
            {job.headcount && (
              <div className="job-detail-meta-item">
                <Users size={16} className="job-detail-meta-icon" />
                <span className="job-detail-meta-label">모집</span>
                <span className="job-detail-meta-value">{job.headcount}</span>
              </div>
            )}
            {job.deadline && (
              <div className="job-detail-meta-item">
                <Clock size={16} className="job-detail-meta-icon" />
                <span className="job-detail-meta-label">마감일</span>
                <span className="job-detail-meta-value">{job.deadline === "상시채용" ? "상시채용" : `~${job.deadline}`}</span>
              </div>
            )}
          </div>

          {/* 근무조건·근무지역·복리후생·채용담당자·채용절차를 기본정보 카드 안에 통합(빈 값 자동 숨김) */}
          {workCondSection}
          {locationSection}
          {applyGuideBlock}
        </div>

        {/* 상세 내용 — 이미지형이면 상세요강(이미지) + 자유서술, 아니면 텍스트 항목(포지션 소개·자격요건·우대사항·주요업무) */}
        {hasDetailImages ? (
          (() => {
            const detailUrls = [...new Set(
              (Array.isArray(job.detailImages) ? job.detailImages.map((d: any) => d?.url) : []).filter(Boolean)
            )] as string[];
            if (!detailUrls.length) return null;
            return (
              <section className="job-detail-section" style={{ padding: 0, overflow: "hidden" }}>
                <h2 className="job-detail-section-title" style={{ padding: "24px 24px 0", marginBottom: 16 }}>상세요강</h2>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {detailUrls.map((u, i) => (
                    <img key={i} src={u} alt={`상세 이미지 ${i + 1}`} style={{ display: "block", width: "100%", height: "auto" }} />
                  ))}
                </div>
                {job.description?.trim() && (
                  <p className="job-detail-desc" style={{ padding: "18px 24px 24px", margin: 0 }}>{job.description.trim()}</p>
                )}
              </section>
            );
          })()
        ) : (<>
          {/* 포지션 소개 */}
          {job.description?.trim() && (
            <section className="job-detail-section">
              <h2 className="job-detail-section-title">포지션 소개</h2>
              <p className="job-detail-desc">{job.description.trim()}</p>
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
        </>)}

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
                    style={label === "웹사이트" || label === "주소" ? { gridColumn: "1 / -1" } : undefined}>
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
          {job.deadline && (
            <div className="job-detail-aside-deadline">
              {job.deadline === "상시채용" ? <strong>상시채용</strong> : <>마감일: <strong>{job.deadline}</strong></>}
            </div>
          )}
          {asideAction}
        </div>
      </aside>
    </div>
  );
});

export default JobDetailView;
