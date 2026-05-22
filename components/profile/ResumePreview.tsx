"use client";

import { forwardRef } from "react";
import type {
  CareerEntry,
  EducationEntry,
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
  links: LinkEntry[];
  portfolioUrl: string | null;
  portfolioFilename: string | null;
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
    links,
    portfolioUrl,
    portfolioFilename,
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