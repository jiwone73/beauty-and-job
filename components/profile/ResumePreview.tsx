"use client";

import { forwardRef } from "react";
import type {
  CareerEntry,
  EducationEntry,
  ExperienceEntry,
  LanguageEntry,
  LinkEntry,
} from "@/lib/store/profileStore";

interface Props {
  name: string;
  birthDisplay: string;
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
  resumeType: "office" | "salon";
  officeJobAreas: string[];
  skillAreas: string[];
  certificates: string[];
  workTypePrefer: string;
  regionPrefer: string;
}

const ResumePreview = forwardRef<HTMLDivElement, Props>(function ResumePreview(
  {
    name,
    birthDisplay,
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
    resumeType,
    officeJobAreas,
    skillAreas,
    certificates,
    workTypePrefer,
    regionPrefer,
  },
  ref
) {
  return (
    <div ref={ref} className="rp-wrap">
      <div className="rp-header">
        <h1 className="rp-name">{name || "이름"}</h1>
        <p className="rp-meta">
          {birthDisplay}
          {birthDisplay && jobDisplay ? " · " : ""}
          {jobDisplay}
        </p>
        <p className="rp-contact">
          {phone || ""}
          {phone && email ? " · " : ""}
          {email || ""}
        </p>
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
      {resumeType === "salon" && certificates.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">보유 자격증</h2>
          <div className="rp-chips">
            {certificates.map((cert) => (
              <span key={cert} className="rp-chip">{cert}</span>
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
      {languages.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">어학</h2>
          {languages.map((lang) => (
            <div key={lang.id} className="rp-item">
              <p className="rp-text" style={{ fontWeight: 600 }}>
                {lang.language}
                <span style={{ marginLeft: "12px", fontWeight: 400, color: "#666" }}>
                  {lang.level}
                </span>
              </p>
              {lang.test && (
                <p className="rp-text" style={{ color: "#888", fontSize: "13px" }}>
                  {lang.test}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      {experiences.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">프로젝트 · 활동</h2>
          {experiences.map((x) => (
            <div key={x.id} className="rp-item">
              <p className="rp-text" style={{ fontWeight: 600 }}>
                {x.category && (
                  <span style={{ color: "#5f0080", marginRight: "8px" }}>[{x.category}]</span>
                )}
                {x.title}
              </p>
              {x.description && (
                <p className="rp-text" style={{ color: "#666" }}>{x.description}</p>
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