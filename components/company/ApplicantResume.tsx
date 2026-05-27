"use client";

interface Resume {
  profile: {
    intro?: string;
    core_competencies?: string;
    skills?: string[];
    skill_areas?: string[];
    certificates?: string[];
    work_type_prefer?: string;
    region_prefer?: string;
    office_job_areas?: string[];
  } | null;
  careers: any[];
  educations: any[];
  experiences: any[];
  languages: any[];
  links: any[];
}

interface Props {
  resume: Resume | null;
  resumeType: "office" | "salon";
  loading?: boolean;
  avatarUrl?: string | null;
  applicantName?: string;
}

export default function ApplicantResume({ resume, resumeType, loading, avatarUrl, applicantName }: Props) {
  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
        이력서 정보를 불러오는 중...
      </div>
    );
  }

  if (!resume) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#888" }}>
        등록된 이력서 정보가 없습니다.
      </div>
    );
  }

  const { profile, careers, educations, experiences, languages, links } = resume;
  const isOffice = resumeType === "office";

  const sectionStyle: React.CSSProperties = {
    marginBottom: "20px",
    paddingBottom: "16px",
    borderBottom: "1px solid #f0e8f8",
  };
  const titleStyle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 700,
    color: "#5f0080",
    marginBottom: "8px",
  };
  const chipStyle: React.CSSProperties = {
    display: "inline-block",
    padding: "4px 10px",
    margin: "0 6px 6px 0",
    background: "#faf5ff",
    border: "1px solid #ede0f8",
    borderRadius: "12px",
    fontSize: "12px",
    color: "#5f0080",
  };

  return (
    <div style={{ padding: "16px 0" }}>
      {/* 지원자 사진 + 이름 헤더 */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid #f0e8f8" }}>
        <div style={{
          width: "72px",
          height: "72px",
          borderRadius: "50%",
          background: "#f0e8f8",
          border: "2px solid #ede0f8",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="프로필" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: "28px", color: "#a888c0" }}>👤</span>
          )}
        </div>
        {applicantName && (
          <div>
            <p style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>{applicantName}</p>
            <p style={{ fontSize: "12px", color: "#888", margin: "4px 0 0" }}>
              {resumeType === "office" ? "🏢 기업·브랜드 지원자" : "🏪 매장·기술직 지원자"}
            </p>
          </div>
        )}
      </div>
      {/* 소개 */}
      {profile?.intro && (
        <div style={sectionStyle}>
          <p style={titleStyle}>소개</p>
          <p style={{ fontSize: "13px", whiteSpace: "pre-line", lineHeight: 1.6 }}>{profile.intro}</p>
        </div>
      )}

      {/* 핵심 역량 */}
      {profile?.core_competencies && (
        <div style={sectionStyle}>
          <p style={titleStyle}>핵심 역량</p>
          <p style={{ fontSize: "13px", whiteSpace: "pre-line", lineHeight: 1.6 }}>{profile.core_competencies}</p>
        </div>
      )}

      {/* 직군 영역 (OFFICE) */}
      {isOffice && profile?.office_job_areas && profile.office_job_areas.length > 0 && (
        <div style={sectionStyle}>
          <p style={titleStyle}>직군 영역</p>
          <div>
            {profile.office_job_areas.map((area) => (
              <span key={area} style={chipStyle}>{area}</span>
            ))}
          </div>
        </div>
      )}

      {/* 시술 분야 (STORE) */}
      {!isOffice && profile?.skill_areas && profile.skill_areas.length > 0 && (
        <div style={sectionStyle}>
          <p style={titleStyle}>시술 분야 · 전문 영역</p>
          <div>
            {profile.skill_areas.map((area) => (
              <span key={area} style={chipStyle}>{area}</span>
            ))}
          </div>
        </div>
      )}

      {/* 보유 자격증 (STORE) */}
      {!isOffice && profile?.certificates && profile.certificates.length > 0 && (
        <div style={sectionStyle}>
          <p style={titleStyle}>보유 자격증</p>
          <div>
            {profile.certificates.map((cert) => (
              <span key={cert} style={chipStyle}>{cert}</span>
            ))}
          </div>
        </div>
      )}

      {/* 희망 근무 조건 (STORE) */}
      {!isOffice && (profile?.work_type_prefer || profile?.region_prefer) && (
        <div style={sectionStyle}>
          <p style={titleStyle}>희망 근무 조건</p>
          {profile.work_type_prefer && (
            <p style={{ fontSize: "13px", marginBottom: "4px" }}>
              <strong>근무 형태:</strong> {profile.work_type_prefer}
            </p>
          )}
          {profile.region_prefer && (
            <p style={{ fontSize: "13px" }}>
              <strong>근무 지역:</strong> {profile.region_prefer}
            </p>
          )}
        </div>
      )}

      {/* 경력 */}
      {careers && careers.length > 0 && (
        <div style={sectionStyle}>
          <p style={titleStyle}>경력</p>
          {careers.map((c: any) => (
            <div key={c.id} style={{ marginBottom: "10px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600 }}>
                {c.company}
                {c.is_verified && <span style={{ marginLeft: "8px", color: "#10b981", fontSize: "11px" }}>✓ 인증</span>}
              </p>
              <p style={{ fontSize: "12px", color: "#666" }}>
                {c.start_date} - {c.end_date || "재직 중"}
                {(c.department || c.position) && ` · ${c.department || ""} ${c.position || ""}`.trim()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 학력 */}
      {educations && educations.length > 0 && (
        <div style={sectionStyle}>
          <p style={titleStyle}>학력</p>
          {educations.map((e: any) => (
            <div key={e.id} style={{ marginBottom: "10px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600 }}>{e.school}</p>
              <p style={{ fontSize: "12px", color: "#666" }}>
                {e.start_date} - {e.end_date}
                {e.status && ` · ${e.status}`}
                {e.major && ` · ${e.major}`}
              </p>
              {e.description && <p style={{ fontSize: "12px", color: "#888", marginTop: "4px" }}>{e.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* 스킬 (OFFICE만) */}
      {isOffice && profile?.skills && profile.skills.length > 0 && (
        <div style={sectionStyle}>
          <p style={titleStyle}>스킬</p>
          <div>
            {profile.skills.map((sk) => (
              <span key={sk} style={chipStyle}>{sk}</span>
            ))}
          </div>
        </div>
      )}

      {/* 어학 */}
      {languages && languages.length > 0 && (
        <div style={sectionStyle}>
          <p style={titleStyle}>어학</p>
          {languages.map((l: any) => (
            <div key={l.id} style={{ marginBottom: "6px" }}>
              <span style={{ fontSize: "13px", fontWeight: 600 }}>{l.language}</span>
              <span style={{ marginLeft: "10px", fontSize: "12px", color: "#666" }}>{l.level}</span>
              {l.test && <span style={{ marginLeft: "10px", fontSize: "12px", color: "#888" }}>({l.test})</span>}
            </div>
          ))}
        </div>
      )}

      {/* 프로젝트·활동 */}
      {experiences && experiences.length > 0 && (
        <div style={sectionStyle}>
          <p style={titleStyle}>프로젝트 · 활동</p>
          {experiences.map((x: any) => (
            <div key={x.id} style={{ marginBottom: "10px" }}>
              <p style={{ fontSize: "13px", fontWeight: 600 }}>
                {x.category && <span style={{ color: "#5f0080", marginRight: "6px" }}>[{x.category}]</span>}
                {x.title}
              </p>
              {x.description && <p style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>{x.description}</p>}
            </div>
          ))}
        </div>
      )}

      {/* 링크 */}
      {links && links.length > 0 && (
        <div style={sectionStyle}>
          <p style={titleStyle}>링크</p>
          {links.map((lk: any) => (
            <div key={lk.id} style={{ marginBottom: "4px" }}>
              <span style={{ fontSize: "12px", color: "#888" }}>{lk.category}:</span>
              <a href={lk.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "6px", fontSize: "12px", color: "#5f0080" }}>{lk.url}</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}