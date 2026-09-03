"use client";
import { 시험한줄 } from "@/lib/languageTest";

import { forwardRef, useState } from "react";
import { IdCard, Target, Star, Building2, GraduationCap, Sparkles, Award, Trophy, Globe, Image as ImageIcon, Quote } from "lucide-react";
import PhotoLightbox from "@/components/profile/PhotoLightbox";
import { formatPhone } from "@/lib/memberFormat";
import type {
  CareerEntry,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  LinkEntry,
  CertificateEntry,
} from "@/lib/store/profileStore";

interface Props {
  name: string;
  birthDisplay: string;
  genderDisplay?: string;
  ageDisplay?: string;
  addressDisplay?: string;
  /** 매장/본사 — 회원 유형이지 이력서에 적을 값이 아니다. 이력서 종류를 가르는
   *  데만 쓰고 화면에는 내지 않는다(「본사」가 기본 정보에 서 있으면 뜬금없다). */
  jobDisplay?: string;
  phone: string;
  email: string;
  intro: string;
  coreCompetencies: string;
  /** 기본 자기소개서 — 선택. 안 쓴 사람에겐 이 칸이 아예 없다. */
  coverLetter?: string;
  careers: CareerEntry[];
  educations: EducationEntry[];
  skills: string[];
  languages: LanguageEntry[];
  experiences: ExperienceEntry[];
  links: LinkEntry[];
  portfolioImages?: { url: string }[];
  resumeFileName?: string | null;
  resumeType: "office" | "salon";
  officeJobAreas: string[];
  skillAreas: string[];
  certificates: CertificateEntry[];
  workTypePrefer: string;
  regionPrefer: string;
  /** 희망급여 — 공고와 같은 모양(원 단위 + 유형). 없으면 「협의」. */
  salaryType?: string | null;
  salaryMin?: number | null;
  avatarUrl?: string | null;
}

// 「월 260만원~」처럼 앞말과 숫자를 갈라 놓는다 — 앞말만 색을 주면 어느 단위인지
// 먼저 읽힌다.
const 급여앞말 = (t?: string | null) =>
  t === "ANNUAL" ? "연" : t === "WEEKLY" ? "주" : t === "DAILY" ? "일급" : t === "HOURLY" ? "시급" : "월";
const 급여숫자 = (won: number, t?: string | null) =>
  (t === "HOURLY" || t === "DAILY")
    ? `${Number(won).toLocaleString()}원`
    : `${Math.round(Number(won) / 10000).toLocaleString()}만원`;

const ResumePreview = forwardRef<HTMLDivElement, Props>(function ResumePreview(
  {
    name,
    birthDisplay,
    genderDisplay,
    ageDisplay,
    addressDisplay,
    jobDisplay,
    phone,
    email,
    intro,
    coreCompetencies,
    coverLetter,
    careers,
    educations,
    skills,
    languages,
    experiences,
    links,
    portfolioImages = [],
    resumeFileName,
    resumeType,
    officeJobAreas,
    skillAreas,
    certificates,
    workTypePrefer,
    regionPrefer,
    salaryType,
    salaryMin,
    avatarUrl,
  },
  ref
) {
  const [확대, set확대] = useState<number | null>(null);
  // 매장은 skillAreas, 본사는 officeJobAreas 에 든다. 따로 서 있던 「직군 영역」
  // 칸을 걷고 이리로 모았다 — 가진 것이 아니라 원하는 것이라, 희망 근무지·희망
  // 급여와 같은 묶음이다. 본사 이력서에서는 같은 값이 두 번 나오기도 했다.
  const 희망직군 = [...(skillAreas || []), ...(officeJobAreas || [])].join(", ");
  return (
    <div ref={ref} className="rp-wrap">
      {intro && (
        <div className="rp-section" style={{ paddingTop: 0 }}>
          <p className="rp-text" style={{ fontWeight: 400, fontSize: "15px", textAlign: "center", margin: 0 }}>{intro}</p>
        </div>
      )}
      <div style={{ paddingTop: "20px" }}>
      <h2 className="rp-section-title" style={{ marginBottom: "12px" }}><IdCard size={16} className="resume-section-icon" />기본 정보</h2>
      <div className="rp-header" style={{display:"flex", alignItems:"flex-start", gap:"20px"}}>
        <div style={{flex:1, minWidth:0}}>
          <h1 className="rp-name">{name || "이름"}</h1>
          {/* 폼(app/profile/resume/page.tsx 의 기본 정보 칸)과 줄바꿈을 맞춘다.
              폼은 생년월일·전화·이메일·주소를 각자 줄로 내린다 — 미리보기에서
              " · " 로 묶으면 폼에서 본 것과 다른 모양이 뽑혀 나온다. */}
          <p className="rp-meta">
            {[birthDisplay, ageDisplay, genderDisplay].filter(Boolean).join(" · ")}
          </p>
          <p className="rp-contact">{formatPhone(phone)}</p>
          {email && <p className="rp-contact">{email}</p>}
          {addressDisplay && <p className="rp-contact">{addressDisplay}</p>}
        </div>
        {/* 폼과 같은 자리 — 사진 위 테두리를 이름 첫 줄에 맞춘다. 미리보기가
            폼과 한 픽셀이라도 다르면 그대로 뽑히는 줄 알았다가 놀란다. */}
        {avatarUrl && (
          <div style={{
            flexShrink: 0,
            width: "100px",
            height: "128px",
            borderRadius: "4px",
            overflow: "hidden",
            border: "1px solid #e0e0e0",
            background: "#f5f5f5",
          }}>
            <img src={avatarUrl} alt="프로필" style={{width: "100%", height: "100%", objectFit: "cover"}} />
          </div>
        )}
      </div>
      </div>

      {/* 희망 근무 조건 — 기본 정보 바로 다음이다. 이력서 양식의 표준 차례이자
          (사람인·잡코리아 모두 인적사항 다음에 둔다) 읽는 차례이기도 하다:
          누구인가 → 무엇을 원하는가 → 무엇을 해왔는가 → 하고 싶은 말.
          지원서 수정 화면도 같은 차례로 세워 둔다. */}
      {(regionPrefer || workTypePrefer || 희망직군 || salaryMin) && (
        <div className="rp-section">
          <h2 className="rp-section-title"><Target size={16} className="resume-section-icon" />희망 근무 조건</h2>
          <div className="rp-cond">
            {regionPrefer && (
              <><span className="rp-cond-k">희망 근무지</span><span className="rp-cond-v">{regionPrefer}</span></>
            )}
            {workTypePrefer && (
              <><span className="rp-cond-k">근무형태</span><span className="rp-cond-v">{workTypePrefer}</span></>
            )}
            {희망직군 && (
              <><span className="rp-cond-k">희망직군</span><span className="rp-cond-v">{희망직군}</span></>
            )}
            <span className="rp-cond-k">희망 급여</span>
            <span className="rp-cond-v">
              {salaryMin ? (
                <><b className="rp-cond-unit">{급여앞말(salaryType)}</b> {급여숫자(salaryMin, salaryType)}~</>
              ) : "협의"}
            </span>
          </div>
        </div>
      )}

      {coreCompetencies && (
        <div className="rp-section">
          <h2 className="rp-section-title"><Star size={16} className="resume-section-icon" />핵심 역량</h2>
          <p className="rp-text" style={{ whiteSpace: "pre-line" }}>
            {coreCompetencies}
          </p>
        </div>
      )}
      {careers.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title"><Building2 size={16} className="resume-section-icon" />경력</h2>
          {careers.map((c) => (
            <div key={c.id} className="rp-item">
              {/* 매장명은 안 적어도 된다. 기술직은 어디서 했느냐보다 무엇을
                  맡았느냐가 경력이라, 이름이 비면 맡은 일이 그 자리에 선다. */}
              <div className="rp-item-head">
                <strong>{c.company || [c.department, c.position].filter(Boolean).join(" · ")}</strong>
                <span className="rp-period">
                  {c.startDate} - {c.endDate}
                </span>
              </div>
              {c.company && c.department && (
                <p className="rp-item-sub">
                  {c.department} · {c.position}
                </p>
              )}
              {c.description && (
                <p className="rp-item-desc" style={{ whiteSpace: "pre-line", marginTop: "6px", fontSize: "13px", color: "#555", lineHeight: 1.6 }}>
                  {c.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {educations.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title"><GraduationCap size={16} className="resume-section-icon" />학력</h2>
          {educations.map((edu) => (
            <div key={edu.id} className="rp-item">
              <div className="rp-item-head">
                <strong>{edu.school}</strong>
                <span className="rp-period">
                  {edu.startDate} - {edu.endDate}
                </span>
              </div>
              {(edu.major || edu.status) && (
                <p className="rp-item-sub">
                  {[edu.major, edu.status].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {skills.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title"><Sparkles size={16} className="resume-section-icon" />스킬</h2>
          <div className="rp-chips">
            {skills.map((sk) => (
              <span key={sk} className="rp-chip">
                {sk}
              </span>
            ))}
          </div>
        </div>
      )}
      {certificates.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title"><Award size={16} className="resume-section-icon" />자격증</h2>
          {certificates.map((cert) => (
            <div key={cert.id} className="rp-item">
              <div className="rp-item-head">
                <strong>{cert.name}</strong>
                {cert.issued_ym && (
                  <span className="rp-period">{cert.issued_ym}</span>
                )}
              </div>
              {cert.issuer && <p className="rp-item-sub">{cert.issuer}</p>}
            </div>
          ))}
        </div>
      )}
      {experiences.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title"><Trophy size={16} className="resume-section-icon" />활동/수상</h2>
          {experiences.map((x) => (
            <div key={x.id} className="rp-item">
              <div className="rp-item-head">
                <strong>
                  {x.category && (
                    <span style={{ color: "#582681", marginRight: "8px" }}>[{x.category}]</span>
                  )}
                  {x.title}
                </strong>
              </div>
              {x.description && (
                <p className="rp-item-sub" style={{ whiteSpace: "pre-line" }}>{x.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {languages.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title"><Globe size={16} className="resume-section-icon" />어학</h2>
          {languages.map((lang) => (
            <div key={lang.id} className="rp-item">
              <p className="rp-text" style={{ fontWeight: 400, fontSize: "13px", color: "#666" }}>
                {lang.language}
                <span style={{ marginLeft: "12px", fontWeight: 400, color: "#666" }}>
                  {lang.level}
                </span>
              </p>
              {시험한줄(lang.test) && (
                <p className="rp-text" style={{ color: "#888", fontSize: "13px" }}>
                  {시험한줄(lang.test)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {/* 포트폴리오는 사진과 SNS 두 줄이다 — 편집 화면(ResumeEditor)이 그렇게 짜여
          있는데 여기서만 SNS 를 「링크」라는 딴 구역으로 빼 놓아, 같은 이력서가
          쓸 때와 읽을 때 다르게 보였다. 미용은 인스타그램이 곧 작업물이라 사진과
          한 자리에 있는 것이 맞다. */}
      {(portfolioImages.length > 0 || links.length > 0) && (
        <div className="rp-section">
          <h2 className="rp-section-title"><ImageIcon size={16} className="resume-section-icon" />포트폴리오</h2>
          {portfolioImages.length > 0 && (
            <>
              {links.length > 0 && <p className="rp-sub">사진</p>}
              {/* 읽는 화면도 편집 화면과 같은 정사각 격자로 보여준다. */}
              {/* 매장이 잘린 자리를 봐야 실력을 판단할 수 있다. 눌러서 크게 연다.
                  새 탭으로 원본을 띄우면 폰에서 앱을 벗어나 돌아오기 번거롭다. */}
              <div className="portfolio-grid">
                {portfolioImages.map((img, idx) => (
                  <button type="button" key={img.url} className="portfolio-cell" onClick={() => set확대(idx)} style={{ border: "none", padding: 0, cursor: "zoom-in" }}>
                    <img src={img.url} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            </>
          )}
          {links.length > 0 && (
            <>
              {portfolioImages.length > 0 && <p className="rp-sub" style={{ marginTop: 14 }}>SNS</p>}
              {links.map((link) => (
                <div key={link.id} className="rp-item">
                  <span className="rp-badge">{link.category}</span>
                  <a href={link.url} className="rp-link">{link.url}</a>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* 자기소개서는 이력서의 맨 끝이다 — 경력·학력을 먼저 훑고 나서 읽는 글이다. */}
      {coverLetter && coverLetter.trim() && (
        <div className="rp-section">
          <h2 className="rp-section-title"><Quote size={16} className="resume-section-icon" />자기소개서</h2>
          <p className="rp-text" style={{ whiteSpace: "pre-line" }}>{coverLetter}</p>
        </div>
      )}

      {확대 !== null && (
        <PhotoLightbox images={portfolioImages} startAt={확대} onClose={() => set확대(null)} />
      )}
    </div>
  );
});

export default ResumePreview;