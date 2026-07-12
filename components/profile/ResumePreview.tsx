"use client";

import { forwardRef } from "react";
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
  careers: CareerEntry[];
  educations: EducationEntry[];
  skills: string[];
  languages: LanguageEntry[];
  experiences: ExperienceEntry[];
  links: LinkEntry[];
  portfolioUrl: string | null;
  portfolioFilename: string | null;
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
    careers,
    educations,
    skills,
    languages,
    experiences,
    links,
    portfolioUrl,
    portfolioFilename,
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
  return (
    <div ref={ref} className="rp-wrap">
      <div className="rp-header" style={{display:"flex", alignItems:"flex-start", gap:"20px"}}>
        <div style={{flex:1, minWidth:0}}>
          <h1 className="rp-name">{name || "이름"}</h1>
          <p className="rp-meta">
            {[birthDisplay, ageDisplay, genderDisplay, jobDisplay].filter(Boolean).join(" · ")}
          </p>
          <p className="rp-contact">
            {formatPhone(phone)}
            {phone && email ? " · " : ""}
            {email || ""}
          </p>
          {addressDisplay && (
            <p className="rp-contact" style={{ marginTop: "2px" }}>{addressDisplay}</p>
          )}
        </div>
        {avatarUrl && (
          <div style={{
            flexShrink: 0,
            width: "96px",
            height: "120px",
            borderRadius: "4px",
            overflow: "hidden",
            border: "1px solid #e0e0e0",
            background: "#f5f5f5",
          }}>
            <img src={avatarUrl} alt="프로필" style={{width: "100%", height: "100%", objectFit: "cover"}} />
          </div>
        )}
      </div>

      {intro && (
        <div className="rp-section">
          <h2 className="rp-section-title">소개</h2>
          <p className="rp-text">{intro}</p>
        </div>
      )}

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
      {resumeType === "salon" && skillAreas.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">시술 분야 · 전문 영역</h2>
          <div className="rp-chips">
            {skillAreas.map((area) => (
              <span key={area} className="rp-chip">{area}</span>
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
              <p className="rp-item-sub">
                {edu.major} · {edu.status}
              </p>
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
      {experiences.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">활동/수상</h2>
          {experiences.map((x) => (
            <div key={x.id} className="rp-item">
              <div className="rp-item-head">
                <strong>
                  {x.category && (
                    <span style={{ color: "#5f0080", marginRight: "8px" }}>[{x.category}]</span>
                  )}
                  {x.title}
                </strong>
              </div>
              {x.description && (
                <p className="rp-item-sub">{x.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
      {portfolioUrl && (
        <div className="rp-section">
          <h2 className="rp-section-title">포트폴리오</h2>
          <p className="rp-text">{portfolioFilename || "포트폴리오.pdf"}</p>
        </div>
      )}
      {resumeFileName && (
        <div className="rp-section">
          <h2 className="rp-section-title">첨부 이력서</h2>
          <p className="rp-text">{resumeFileName}</p>
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
    </div>
  );
});

export default ResumePreview;