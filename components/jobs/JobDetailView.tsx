"use client";
import { forwardRef, type ReactNode } from "react";
import Link from "next/link";
import { shortRegion } from "@/lib/regionShort";
import KakaoMap from "@/components/KakaoMap";
import AddressMap from "@/components/AddressMap";
import BannerStrip from "@/components/jobs/BannerStrip";
import { Briefcase, CheckCircle2, ChevronRight, Users, GraduationCap, MapPin, Send } from "lucide-react";

  // 매장 공고는 적힌 값이 그대로 지켜지는 일이 드물다. 근무시간·급여는 면접에서
// 다시 정하고, 복리후생은 매장마다 달라 표에 다 담기지 않는다. 그래서 구직자가
// 표만 보고 단정하지 않도록 한마디씩 덧붙인다.
const withNegotiable = (v: string) => {
  const t = String(v || "").trim();
  if (!t || t === "-") return "협의";
  return /협의/.test(t) ? t : `${t} (협의)`;
};
const withSeeDetail = (v: string) => {
  const t = String(v || "").trim();
  return /상세요강\s*참조/.test(t) ? t : (t ? `${t} · 상세요강 참조` : "상세요강 참조");
};

// 상세요강 본문에 적힌 매장 연락처는 구직자에게 가린다.
  //
  // 카페·인스타 공고에는 "문자 주세요 010-…" 이 본문에 그대로 적혀 있다. 그대로 두면
  // 구직자가 매장에 바로 연락해 버려, 뷰티워크를 거칠 이유가 없어진다. 지원은 우리
  // 지원 버튼으로 받아야 매장에도 이력이 남고 우리도 성과를 안다.
  //
  // 원문은 DB에 그대로 둔다. 관리자는 등록 화면에서 값을 대조해야 하고, 매장에
  // 연락할 일도 있기 때문이다. 여기서는 보여줄 때만 가린다.
  const APPLY_ONLY = "뷰티워크 온라인 지원";
  const hideContacts = (t: string) =>
    String(t || "")
      // 전화번호: 010-1234-5678 / 01012345678 / 02-123-4567 등 (구분자는 - . 공백)
      .replace(/(0\d{1,2})[-.\s]?(\d{3,4})[-.\s]?(\d{4})/g, APPLY_ONLY)
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, APPLY_ONLY)
      // "카톡 아이디 xxx" 처럼 아이디를 적어 두는 경우
      .replace(/(카카오톡|카톡|오픈\s*채팅|카톡\s*아이디)\s*[:：]?\s*[A-Za-z0-9._-]{3,}/g, APPLY_ONLY)
      // 매장 SNS. 들어가 보면 DM·프로필에 번호가 있어 전화번호를 가린 뜻이 없어진다.
      .replace(/(https?:\/\/)?(www\.)?(instagram\.com|facebook\.com|band\.us|threads\.net|open\.kakao\.com|pf\.kakao\.com|blog\.naver\.com|cafe\.naver\.com|youtube\.com|youtu\.be|twitter\.com|x\.com)\/[^\s)\]]*/gi, APPLY_ONLY)
      // 주소 없이 "인스타 @nail_shop" 처럼 계정만 적는 경우
      .replace(/(인스타(?:그램)?|insta(?:gram)?|카톡|틱톡)\s*[:：]?\s*@?[A-Za-z0-9._]{3,}/gi, APPLY_ONLY)
      // 번호를 지웠어도 "문자로 보내주세요" 가 남으면 구직자는 여전히 매장에 연락하려 든다.
      // 지원 창구를 지시하는 말도 함께 바꾼다.
      .replace(/지원\s*방법\s*[:：]\s*(?:문자|전화|이메일|메일|카톡|카카오톡|DM|디엠|인스타(?:그램)?)\s*(?:으로|로)?/gi, `지원방법: ${APPLY_ONLY} 시`)
      .replace(/(?:문자|전화|톡|카톡|카카오톡|DM|디엠|이메일|메일|인스타(?:그램)?)\s*(?:으로|로)?\s*(?:만)?\s*(?:주세요|남겨\s*주세요|보내\s*주세요|연락\s*주세요|문의\s*주세요|지원\s*(?:해\s*)?주세요)/gi, "뷰티워크로 지원해 주세요")
      .replace(/(?:문자|전화|카톡|카카오톡|DM|디엠|이메일|메일)\s*(?:으로|로)(?=\s|$)/gi, `${APPLY_ONLY}으로`)
      // 바꾸고 나면 "위 번호로 뷰티워크로…", "이메일 지원 으로 보내주세요" 처럼
      // 앞뒤에 쓸모없는 말이 남는다. 문장이 읽히도록 걷어낸다.
      .replace(/(?:위|아래)?\s*(?:번호|연락처|주소)\s*(?:으로|로)\s*(?=뷰티워크)/g, "")
      .replace(/(?:인스타(?:그램)?|카톡|카카오톡|문자|전화|이메일|메일|DM|디엠)\s+(?=뷰티워크)/gi, "")
      .replace(new RegExp(`${APPLY_ONLY}\\s*(?:으로|로)?\\s*(?:보내\\s*주세요|남겨\\s*주세요|주세요)`, "g"), APPLY_ONLY)
      // 같은 안내가 잇달아 나오면 한 번만 남긴다.
      .replace(new RegExp(`(${APPLY_ONLY})([\\s,·/]*\\1)+`, "g"), "$1")
      .replace(/(뷰티워크로 지원해 주세요)([\s,·/]*\1)+/g, "$1")
      .replace(/[ \t]{2,}/g, " ");

// 공고 상단 이미지 갤러리. 표시 규칙(3:1 고정 · 한 장은 항상 1/3 폭)은 BannerStrip에 모아 두고,
// 기업정보 설정·공고 등록 미리보기에서도 같은 컴포넌트를 써 어디서나 같은 모양으로 보이게 한다.
export function ImageCarousel({ images, alt }: { images: string[]; alt?: string }) {
  return <BannerStrip images={images} alt={alt} />;
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
  // 매장 공고는 법인 정보(회사명·대표자·설립·규모)가 지원 판단에 쓸모가 없고, 주소는 근무지역과,
  // 브랜드명은 상단 제목과 그대로 겹친다. 그래서 매장은 소개글과 SNS만 남긴다.
  const isOfficeJob = job.jobType === "오피스";
  const linkCell = (url: string) => (
    <a key="w" href={/^https?:\/\//.test(url) ? url : `https://${url}`}
      target="_blank" rel="noreferrer" style={{ color: "#5f0080", wordBreak: "break-all" }}>{url}</a>
  );
  const companyRows: [string, ReactNode][] = [];
  if (isOfficeJob) {
    if (ci.name) companyRows.push(["회사명", ci.name]);
    if (ci.brandName) companyRows.push(["브랜드명", ci.brandName]);
    if (ci.industry) companyRows.push(["업종", ci.industry]);
    if (ci.representative) companyRows.push(["대표자", ci.representative]);
    if (ci.size) companyRows.push(["규모", ci.size]);
    if (ci.founded) companyRows.push(["설립", ci.founded]);
    if (ci.phone) companyRows.push(["대표번호", ci.phone]);
    if (ci.website) companyRows.push(["웹사이트", linkCell(ci.website)]);
    if (ci.location) companyRows.push(["주소", ci.location]);
  }
  // 매장 SNS(인스타 등)는 공개 화면에 걸지 않는다. 들어가면 DM·프로필에 번호가 있어
  // 상세요강에서 전화번호를 가린 뜻이 없어진다. 관리자는 등록 화면에서 볼 수 있다.
  const companySectionTitle = isOfficeJob ? "기업정보" : "매장 소개";
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
    { key: "career", label: "경력/직책", get: (p) => p.career },
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
                <th key={c.key} style={{ textAlign: "left", padding: "10px 20px 10px 0", color: "#7a6f8a", fontWeight: 600, borderBottom: "1px solid #ece7f2", whiteSpace: "nowrap" }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((p: any, i: number) => (
              <tr key={i}>
                {posCols.map((c, j) => (
                  <td key={c.key} style={{ padding: "12px 20px 12px 0", borderBottom: "1px solid #f3f0f8", color: j === 0 ? "#333" : "#555", whiteSpace: "nowrap", lineHeight: 1.6 }}>
                    {/* 근무요일/시간 열은 요일 1행·시간 2행으로 */}
                    {c.key === "shift"
                      ? ((p.workDays || p.workTime)
                          ? ((p.workDays === "협의" && p.workTime === "협의")
                              ? "협의"
                              : <>{p.workDays && <div>{p.workDays}</div>}{p.workTime && <div>{withNegotiable(p.workTime)}</div>}</>)
                          : "협의")
                      : c.key === "salary"
                        ? withNegotiable(c.get(p))
                        : (c.get(p) || "-")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 복리후생: 별도 '근무 조건' 제목 없이 모집부문 블록에 이어 붙임(표와 동일한 밀도).
          값이 없어도 늘 보인다 — 매장마다 달라 표에 다 담기지 않으니 '상세요강 참조'만이라도 걸어 둔다.
          근무기간은 뺐다. 매장 공고는 대부분 상시 근무라 거의 비어 있었고, 그 반열이
          복리후생을 좁혀 태그가 여러 줄로 접혔다. */}
      <div style={{ marginTop: 12, display: "flex", gap: 12, fontSize: 13.5, padding: "3px 0", alignItems: "flex-start" }}>
        <span style={{ color: "#7a6f8a", width: 60, flexShrink: 0 }}>복리후생</span>
        <span style={{ color: "#555", lineHeight: 1.5 }}>{withSeeDetail((job.benefits || []).join(", "))}</span>
      </div>
    </div>
  ) : null;
  // 모집부문 표가 있으면 근무기간·복리후생은 표 아래로 합쳐 넣으므로, 여기(근무 조건 제목 블록)는 텍스트형 공고에서만 노출.
  const workCondSection = positions.length === 0 ? (
    <div className="jd-subblock" key="workcond">
      <h2 className="job-detail-subtitle">근무 조건</h2>
      <div className="job-detail-company-info">
        {job.employType && positions.length === 0 && (
          <div className="job-detail-company-row">
            <span className="job-detail-company-label">고용형태</span>
            <span>{job.employType}</span>
          </div>
        )}
        {job.workDaysText && positions.length === 0 && (
          <div className="job-detail-company-row">
            <span className="job-detail-company-label">근무요일</span>
            <span>{job.workDaysText}</span>
          </div>
        )}
        {positions.length === 0 && (
          <div className="job-detail-company-row">
            <span className="job-detail-company-label">근무시간</span>
            <span>{withNegotiable(job.workTimeText)}</span>
          </div>
        )}
        {(
          <div className="job-detail-company-row" style={{ alignItems: "flex-start" }}>
            <span className="job-detail-company-label">복리후생</span>
            <span>{withSeeDetail((job.benefits || []).join(", "))}</span>
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
  // 비회원(관리자 대행) 공고는 뷰티워크 온라인지원만 받고, 기업 담당자 연락처를 구직자에게 노출하지 않는다.
  const hasContact = !job.isExternal && !!(job.contactPhone || job.contactEmail);
  const hasMethods = !!job.isExternal || !!(job.contactMethods?.length);
  const hasProcess = !!(job.process?.length > 0);
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
      <span>{job.isExternal ? "뷰티워크 온라인지원" : job.contactMethods.join("   ·   ")}</span>
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
          // 배너: 한 화면에 두 장, 세 장부터는 좌우 화살표로 회전(BannerStrip).
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
                    <img key={i} src={u} alt={`상세 이미지 ${i + 1}`} style={{ display: "block", width: "100%", height: "auto" }} />
                  ))}
                </div>
                {job.description?.trim() && (
                  <p className="job-detail-desc" style={{ padding: "18px 24px 0", margin: 0 }}>{hideContacts(job.description.trim())}</p>
                )}
                {job.notes?.trim() && (
                  <p className="job-detail-desc" style={{ padding: "14px 24px 24px", margin: 0 }}>{hideContacts(job.notes.trim())}</p>
                )}
              </section>
            );
          })()
        ) : (<>
          {/* 상세요강 — 매장 공고는 원문을 통째로 담아서 "소개"가 아니라 요강 전체다. */}
          {job.description?.trim() && (
            <section className="job-detail-section">
              <h2 className="job-detail-section-title">상세요강</h2>
              <p className="job-detail-desc">{hideContacts(job.description.trim())}</p>
              {/* 비고는 원래 같은 글에서 갈라져 나온 내용이라 상세요강 안에 이어 붙인다.
                  따로 떼어 두면 근무조건이 두 군데로 흩어져 읽기 어렵다. */}
              {job.notes?.trim() && (
                <p className="job-detail-desc" style={{ marginTop: 14 }}>{hideContacts(job.notes.trim())}</p>
              )}
            </section>
          )}

          {/* 자격 요건 */}
          {job.requirements?.length > 0 && (
            <section className="job-detail-section">
              <h2 className="job-detail-section-title">자격 요건</h2>
              <ul className="job-detail-list">
                {job.requirements.map((raw: string, i: number) => (
                  <li key={i} className="job-detail-list-item">
                    <CheckCircle2 size={16} className="job-detail-list-icon" />
                    <span>{hideContacts(raw)}</span>
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
                {job.preferreds.map((raw: string, i: number) => (
                  <li key={i} className="job-detail-list-item">
                    <CheckCircle2 size={16} className="job-detail-list-icon check-soft" />
                    <span>{hideContacts(raw)}</span>
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
                    <span>{hideContacts(item)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>)}

        {/* 기업 정보 (공고 내용 아래) */}
        {hasCompanyInfo && (
          <section className="job-detail-section">
            <h2 className="job-detail-section-title">{companySectionTitle}</h2>
            {job.brandDesc?.trim() && (
              <p className="job-detail-brand-desc" style={{ whiteSpace: "pre-line", marginBottom: companyRows.length ? "16px" : 0 }}>{job.brandDesc}</p>
            )}
            {companyRows.length > 0 && (
              <div className="job-detail-company-info">
                {companyRows.map(([label, val], i) => (
                  <div key={i} className="job-detail-company-row"
                    style={label === "웹사이트" || label === "매장 SNS" || label === "주소" ? { gridColumn: "1 / -1" } : undefined}>
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
            {/* 매장명은 "리안헤어 광명점"처럼 지점까지 붙어 있어 그대로 검색하면 이 지점만 잡힌다.
                지점 표기를 뗀 앞부분(브랜드)으로 검색해 다른 지점 공고까지 보이게 한다. */}
            <Link href={`/jobs?q=${encodeURIComponent(isOfficeJob ? job.brand : job.brand.replace(/\s*\S*(?:점|지점|支店)$/, "").trim() || job.brand)}`} className="job-detail-more-link">
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
          {/* 경력보다 무슨 자리인지가 먼저 궁금하다. 좁은 칸에 한 줄뿐이라 모집분야를 둔다
              (경력은 아래 모집부문 표에 있다). 분야를 못 받은 옛 공고는 경력으로 물러선다. */}
          <div className="job-detail-aside-meta">
            {(job.jobCategories?.length ? job.jobCategories.join(", ") : job.career) && (
              <>
                <span>{job.jobCategories?.length ? job.jobCategories.join(", ") : job.career}</span>
                <span className="dot">·</span>
              </>
            )}
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
