"use client";
import { 시험한줄 } from "@/lib/languageTest";

import { forwardRef, useState } from "react";
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
  jobDisplay: string;
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
  avatarUrl?: string | null;
}

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
    avatarUrl,
  },
  ref
) {
  const [확대, set확대] = useState<number | null>(null);
  return (
    <div ref={ref} className="rp-wrap">
      {intro && (
        <div className="rp-section" style={{ paddingTop: 0 }}>
          <p className="rp-text" style={{ fontWeight: 400, fontSize: "15px", textAlign: "center", margin: 0 }}>{intro}</p>
        </div>
      )}
      <div style={{ paddingTop: "20px" }}>
      <h2 className="rp-section-title" style={{ marginBottom: "12px" }}>기본 정보</h2>
      <div className="rp-header" style={{display:"flex", alignItems:"flex-start", gap:"20px"}}>
        <div style={{flex:1, minWidth:0}}>
          <h1 className="rp-name">{name || "이름"}</h1>
          {/* 폼(app/profile/resume/page.tsx 의 기본 정보 칸)과 줄바꿈을 맞춘다.
              폼은 생년월일·직군·전화·이메일·주소를 각자 줄로 내린다 — 미리보기
              에서 " · " 로 묶으면 폼에서 본 것과 다른 모양이 뽑혀 나온다. */}
          <p className="rp-meta">
            {[birthDisplay, ageDisplay, genderDisplay].filter(Boolean).join(" · ")}
          </p>
          {jobDisplay && <p className="rp-meta">{jobDisplay}</p>}
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

      {coreCompetencies && (
        <div className="rp-section">
          <h2 className="rp-section-title">핵심 역량</h2>
          <p className="rp-text" style={{ whiteSpace: "pre-line" }}>
            {coreCompetencies}
          </p>
        </div>
      )}
      {resumeType === "office" && officeJobAreas.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">직군 영역</h2>
          <div className="rp-chips">
            {officeJobAreas.map((area) => (
              <span key={area} className="rp-chip">{area}</span>
            ))}
          </div>
        </div>
      )}
      {resumeType === "salon" && (workTypePrefer || regionPrefer) && (
        <div className="rp-section">
          <h2 className="rp-section-title">희망 근무 조건</h2>
          {workTypePrefer && (
            <p className="rp-text"><strong>근무 형태:</strong> {workTypePrefer}</p>
          )}
          {regionPrefer && (
            <p className="rp-text"><strong>근무 지역:</strong> {regionPrefer}</p>
          )}
        </div>
      )}
      {careers.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">경력</h2>
          {careers.map((c) => (
            <div key={c.id} className="rp-item">
              <div className="rp-item-head">
                <strong>{c.company}</strong>
                <span className="rp-period">
                  {c.startDate} - {c.endDate}
                </span>
              </div>
              {c.department && (
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
          <h2 className="rp-section-title">학력</h2>
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
          <h2 className="rp-section-title">스킬</h2>
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
          <h2 className="rp-section-title">자격증</h2>
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
          <h2 className="rp-section-title">활동/수상</h2>
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
          <h2 className="rp-section-title">어학</h2>
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
      {portfolioImages.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">포트폴리오</h2>
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
        </div>
      )}
      {/* 첨부 이력서 — 현재 숨김 처리 */}
      {false && resumeFileName && (
        <div className="rp-section">
          <h2 className="rp-section-title">첨부 이력서</h2>
          <p className="rp-text">{resumeFileName}</p>
        </div>
      )}

      {/* 자기소개서는 이력서의 맨 끝이다 — 경력·학력을 먼저 훑고 나서 읽는 글이다. */}
      {coverLetter && coverLetter.trim() && (
        <div className="rp-section">
          <h2 className="rp-section-title">자기소개서</h2>
          <p className="rp-text" style={{ whiteSpace: "pre-line" }}>{coverLetter}</p>
        </div>
      )}

      {links.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">링크</h2>
          {links.map((link) => (
            <div key={link.id} className="rp-item">
              <span className="rp-badge">{link.category}</span>
              <a href={link.url} className="rp-link">
                {link.url}
              </a>
            </div>
          ))}
        </div>
      )}
      {확대 !== null && (
        <PhotoLightbox images={portfolioImages} startAt={확대} onClose={() => set확대(null)} />
      )}
    </div>
  );
});

export default ResumePreview;