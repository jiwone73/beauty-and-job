"use client";
import { forwardRef, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { shortRegion } from "@/lib/regionShort";
import KakaoMap from "@/components/KakaoMap";
import AddressMap from "@/components/AddressMap";
import { Briefcase, CheckCircle2, ChevronRight, ChevronLeft, Users, GraduationCap, MapPin, Send } from "lucide-react";

// 공고 상단 이미지 갤러리(원티드 스타일). 한 번에 3장 노출, 좌우 화살표로 순환.
export function ImageCarousel({ images, alt }: { images: string[]; alt?: string }) {
  const [start, setStart] = useState(0);
  const n = images.length;
  const arrow: CSSProperties = {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 40, height: 40, borderRadius: "50%", border: "none",
    background: "rgba(255,255,255,0.95)", color: "#333",
    cursor: "pointer", zIndex: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  // 배너는 '원본 이미지 비율 그대로' 한 장씩 표시(자르거나 3:1 띠로 왜곡하지 않음). 여러 장이면 좌우 화살표로 순환.
  const cur = ((start % n) + n) % n;
  return (
    <div style={{ position: "relative", width: "100%", borderRadius: 12, overflow: "hidden", background: "#f4f4f4" }}>
      <img
        src={images[cur]}
        alt={alt}
        // EXIF 회전 태그 무시 → 원본 픽셀 그대로(원 사이트와 동일). 없으면 브라우저가 세로로 돌려 크롭된 것처럼 보임.
        style={{ display: "block", width: "100%", height: "auto", imageOrientation: "none" }}
      />
      {n > 1 && (
        <>
          <button type="button" aria-label="이전 이미지" onClick={() => setStart(cur - 1)} style={{ ...arrow, left: 8 }}><ChevronLeft size={22} /></button>
          <button type="button" aria-label="다음 이미지" onClick={() => setStart(cur + 1)} style={{ ...arrow, right: 8 }}><ChevronRight size={22} /></button>
          <span style={{ position: "absolute", bottom: 10, right: 12, zIndex: 3, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 12, fontWeight: 600, borderRadius: 999, padding: "3px 10px" }}>{cur + 1} / {n}</span>
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
  const positions = Array.isArray(job.positions) ? job.positions.filter((p: any) => p && p.category) : [];
  // 모집부문 표 열 정의. 값이 아무 행에도 없는 열은 미리보기/상세에서 숨긴다(모집분야는 항상 표시).
  const posColDefs: { key: string; label: string; get: (p: any) => string }[] = [
    { key: "category", label: "모집분야", get: (p) => p.category },
    { key: "employment", label: "고용형태", get: (p) => p.employment },
    { key: "gender", label: "성별우대", get: (p) => p.gender },
    { key: "career", label: "경력", get: (p) => p.career },
    { key: "education", label: "학력", get: (p) => p.education },
    { key: "shift", label: "근무요일/시간", get: (p) => (p.workDays || p.workTime || "") },
    { key: "salary", label: "급여", get: (p) => p.salary },
  ];
  const posCols = posColDefs.filter((c) => c.key === "category" || positions.some((p: any) => (c.get(p) || "").toString().trim()));
  const positionsSection = positions.length > 0 ? (
    <div className="jd-subblock" key="positions">
      <h2 className="job-detail-subtitle" style={{ display: "flex", alignItems: "center", gap: 6 }}><Briefcase size={16} style={{ color: "#5f0080", flexShrink: 0 }} />모집부문</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ minWidth: Math.min(640, posCols.length * 96), borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "#faf7fd" }}>
              {posCols.map((c) => (
                <th key={c.key} style={{ textAlign: "left", padding: "8px 10px", color: "#7a6f8a", fontWeight: 600, borderBottom: "1px solid #ece7f2", whiteSpace: "nowrap" }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((p: any, i: number) => (
              <tr key={i}>
                {posCols.map((c, j) => (
                  <td key={c.key} style={{ padding: "8px 10px", borderBottom: "1px solid #f3f0f8", color: j === 0 ? "#333" : "#555", whiteSpace: "nowrap", lineHeight: 1.35 }}>
                    {/* 근무요일/시간 열은 요일 1행·시간 2행으로 */}
                    {c.key === "shift"
                      ? ((p.workDays || p.workTime)
                          ? ((p.workDays === "협의" && p.workTime === "협의")
                              ? "협의"
                              : <>{p.workDays && <div>{p.workDays}</div>}{p.workTime && <div>{p.workTime}</div>}</>)
                          : "-")
                      : (c.get(p) || "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 근무기간·복리후생: 별도 '근무 조건' 제목 없이 모집부문 블록에 이어 붙임(표와 동일한 밀도) */}
      {(job.workPeriodText || job.benefits?.length > 0) && (
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 28, rowGap: 4 }}>
          {job.workPeriodText && (
            <div style={{ display: "flex", gap: 12, fontSize: 13.5, padding: "3px 0" }}>
              <span style={{ color: "#7a6f8a", width: 60, flexShrink: 0 }}>근무기간</span>
              <span style={{ color: "#555" }}>{job.workPeriodText}</span>
            </div>
          )}
          {job.benefits?.length > 0 && (
            <div style={{ display: "flex", gap: 12, fontSize: 13.5, padding: "3px 0", alignItems: "flex-start" }}>
              <span style={{ color: "#7a6f8a", width: 60, flexShrink: 0 }}>복리후생</span>
              <span style={{ color: "#555", lineHeight: 1.5 }}>{job.benefits.join(", ")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  ) : null;
  // 모집부문 표가 있으면 근무기간·복리후생은 표 아래로 합쳐 넣으므로, 여기(근무 조건 제목 블록)는 텍스트형 공고에서만 노출.
  const workCondSection = (positions.length === 0 && (job.workPeriodText || job.benefits?.length > 0 || job.employType || job.workDaysText || job.workTimeText)) ? (
    <div className="jd-subblock" key="workcond">
      <h2 className="job-detail-subtitle">근무 조건</h2>
      <div className="job-detail-company-info">
        {job.employType && positions.length === 0 && (
          <div className="job-detail-company-row">
            <span className="job-detail-company-label">고용형태</span>
            <span>{job.employType}</span>
          </div>
        )}
        {job.workPeriodText && (
          <div className="job-detail-company-row">
            <span className="job-detail-company-label">근무기간</span>
            <span>{job.workPeriodText}</span>
          </div>
        )}
        {job.workDaysText && positions.length === 0 && (
          <div className="job-detail-company-row">
            <span className="job-detail-company-label">근무요일</span>
            <span>{job.workDaysText}</span>
          </div>
        )}
        {job.workTimeText && positions.length === 0 && (
          <div className="job-detail-company-row">
            <span className="job-detail-company-label">근무시간</span>
            <span>{job.workTimeText}</span>
          </div>
        )}
        {job.benefits?.length > 0 && (
          <div className="job-detail-company-row" style={{ alignItems: "flex-start" }}>
            <span className="job-detail-company-label">복리후생</span>
            <span>{job.benefits.join(", ")}</span>
          </div>
        )}
      </div>
    </div>
  ) : null;

  const locationSection = hasMap ? (
    <div className="jd-subblock" key="location">
      <h2 className="job-detail-subtitle" style={{ display: "flex", alignItems: "center", gap: 6 }}><MapPin size={16} style={{ color: "#5f0080", flexShrink: 0 }} />근무지역</h2>
      {job.companyAddress?.trim() && (
        <p className="job-detail-desc" style={{ marginBottom: "12px" }}>{job.companyAddress}</p>
      )}
      {ci.latitude && ci.longitude ? (
        <KakaoMap latitude={Number(ci.latitude)} longitude={Number(ci.longitude)} name={ci.name} />
      ) : (
        <AddressMap address={job.companyAddress} name={ci.name} height={280} />
      )}
    </div>
  ) : null;

  // 복리후생·채용 담당자·채용 절차도 '기본정보' 카드 안의 서브블록으로 합침(빈 값은 자동 숨김).
  // 담당자: 전화·이메일 중 하나라도 있어야 표기. 이름 없으면 '인사담당'으로.
  // 비회원(관리자 대행) 공고는 뷰티워크 온라인 지원만 받고, 기업 담당자 연락처를 구직자에게 노출하지 않는다.
  const hasContact = !job.isExternal && !!(job.contactPhone || job.contactEmail);
  const hasMethods = !!job.isExternal || !!(job.contactMethods?.length);
  const hasProcess = !!(job.process?.length > 0 || job.notes?.trim());
  // 지원 안내: 담당자 · 지원방법 · 채용 절차 (라벨 + 값 한 줄)
  const contactInner = hasContact ? (
    <div className="jd-guide-row">
      <span className="jd-guide-label">채용담당자</span>
      <span>{[job.contactName || "인사담당", job.contactPhone, job.contactEmail].filter(Boolean).join("   ·   ")}</span>
    </div>
  ) : null;

  const methodsInner = hasMethods ? (
    <div className="jd-guide-row">
      <span className="jd-guide-label">지원방법</span>
      <span>{job.isExternal ? "온라인 지원" : job.contactMethods.join("   ·   ")}</span>
    </div>
  ) : null;

  const processInner = hasProcess ? (
    <div>
      {job.process?.length > 0 && (
        <div className="jd-guide-row">
          <span className="jd-guide-label">채용 절차</span>
          <span>{job.process.join("   →   ")}</span>
        </div>
      )}
      {job.notes?.trim() && (
        <div style={{
          marginTop: "6px", padding: "12px 14px", background: "#faf8fc", borderRadius: "8px",
          fontSize: "14px", color: "#555", lineHeight: 1.6, whiteSpace: "pre-line"
        }}>
          {job.notes}
        </div>
      )}
    </div>
  ) : null;

  const applyGuideBlock = (hasContact || hasMethods || hasProcess) ? (
    <div className="jd-subblock" key="apply-guide">
      <h2 className="job-detail-subtitle" style={{ display: "flex", alignItems: "center", gap: 6 }}><Send size={16} style={{ color: "#5f0080", flexShrink: 0 }} />지원 안내</h2>
      {(hasContact || hasMethods) && (
        <div className="jd-2col">
          <div>{methodsInner}</div>
          <div>{contactInner}</div>
        </div>
      )}
      {processInner}
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
                <span className="job-detail-meta-label">모집분야</span>
                <span className="job-detail-meta-value">{job.jobCategories.join(", ")}</span>
              </div>
            )}
            {job.career && positions.length === 0 && (
              <div className="job-detail-meta-item">
                <Briefcase size={16} className="job-detail-meta-icon" />
                <span className="job-detail-meta-label">경력</span>
                <span className="job-detail-meta-value">{job.career}</span>
              </div>
            )}
            {job.education && positions.length === 0 && (
              <div className="job-detail-meta-item">
                <GraduationCap size={16} className="job-detail-meta-icon" />
                <span className="job-detail-meta-label">학력</span>
                <span className="job-detail-meta-value">{job.education}</span>
              </div>
            )}
            {job.headcount && positions.length === 0 && (
              <div className="job-detail-meta-item">
                <Users size={16} className="job-detail-meta-icon" />
                <span className="job-detail-meta-label">모집인원</span>
                <span className="job-detail-meta-value">{job.headcount}</span>
              </div>
            )}
            {job.genderPref && (
              <div className="job-detail-meta-item">
                <Users size={16} className="job-detail-meta-icon" />
                <span className="job-detail-meta-label">성별우대</span>
                <span className="job-detail-meta-value">{job.genderPref}</span>
              </div>
            )}
            {job.deadline && (
              <div className="job-detail-meta-item">
                <span className="job-detail-meta-label">마감일</span>
                <span className="job-detail-meta-value">{job.deadline === "상시채용" ? "상시채용" : `~${job.deadline}`}</span>
              </div>
            )}
          </div>

          {/* 근무조건·근무지역·복리후생·채용담당자·채용절차를 기본정보 카드 안에 통합(빈 값 자동 숨김) */}
          {positionsSection}
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
                    <img key={i} src={u} alt={`상세 이미지 ${i + 1}`} style={{ display: "block", width: "100%", height: "auto", imageOrientation: "none" }} />
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
            <h2 className="job-detail-section-title">기업정보</h2>
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
            <Link href={`/jobs?type=${job.jobType === "오피스" ? "오피스" : "매장"}`} className="job-detail-more-link">
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
