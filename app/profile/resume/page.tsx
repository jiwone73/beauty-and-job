"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Download, Eye, Plus, X } from "lucide-react";
import { useSignupStore } from "@/lib/store/signupStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { CAREER_LABELS } from "@/lib/constants";

export default function ResumePage() {
  const router = useRouter();
  const { name, birth, gender, job, jobCustom, careerYears, isLeader, phone } = useSignupStore();
  const {
    intro, coreCompetencies, educations, careers, experiences,
    skills, languages, links, email,
    setIntro, setCoreCompetencies, setEmail,
  } = useProfileStore();

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [introLocal, setIntroLocal] = useState(intro);
  const [coreLocal, setCoreLocal] = useState(coreCompetencies);
  const [emailLocal, setEmailLocal] = useState(email);

  const jobDisplay = job === "직접입력" ? jobCustom : job || "직군 미설정";
  const birthDisplay = birth
    ? `${birth.slice(0, 4)}년 (${gender === "남성" ? "남" : "여"})`
    : "";
  const careerDisplay = `${CAREER_LABELS[careerYears] || ""}${isLeader ? " · 팀리더 경험" : ""}`;

  const handleSave = () => {
    setIntro(introLocal);
    setCoreCompetencies(coreLocal);
    setEmail(emailLocal);
    alert("저장되었습니다.");
  };

  return (
    <div className="resume-page">
      {/* 상단 헤더 */}
      <header className="resume-header">
        <button className="resume-back-btn" onClick={() => router.push("/profile")}>
          <ChevronLeft size={20} />
          <span>프로필로 돌아가기</span>
        </button>
        <h1 className="resume-header-title">이력서 편집</h1>
        <div className="resume-header-actions">
          <button className="resume-action-btn" onClick={() => alert("미리보기 기능은 다음 업데이트에서 구현됩니다.")}>
            <Eye size={16} /><span>미리보기</span>
          </button>
          <button className="resume-action-btn" onClick={() => alert("다운로드 기능은 다음 업데이트에서 구현됩니다.")}>
            <Download size={16} /><span>다운로드</span>
          </button>
          <button className="resume-save-btn" onClick={handleSave}>저장</button>
        </div>
      </header>

      <div className="resume-layout">
        {/* 왼쪽: 섹션 목록 */}
        <aside className="resume-sidebar">
          <p className="resume-sidebar-title">섹션 구성</p>
          {[
            { id: "basic", label: "기본 정보" },
            { id: "intro", label: "소개 · 핵심역량" },
            { id: "career", label: "경력" },
            { id: "education", label: "학력" },
            { id: "experience", label: "관련 경험" },
            { id: "skill", label: "스킬" },
            { id: "language", label: "어학" },
            { id: "link", label: "링크" },
          ].map((sec) => (
            <button
              key={sec.id}
              className={`resume-sidebar-item ${activeSection === sec.id ? "active" : ""}`}
              onClick={() => setActiveSection(sec.id)}
            >
              {sec.label}
            </button>
          ))}
        </aside>

        {/* 오른쪽: 편집 영역 */}
        <main className="resume-editor">
          {/* 기본 정보 */}
          <section className="resume-section">
            <h2 className="resume-section-title">기본 정보</h2>
            <div className="resume-basic-info">
              <div className="resume-name-block">
                <h3 className="resume-name">{name || "이름"}</h3>
                <p className="resume-job-line">{birthDisplay} {birthDisplay && "·"} {jobDisplay}</p>
                <p className="resume-contact">{phone || ""} {phone && email ? "·" : ""} {emailLocal}</p>
              </div>
              <div className="resume-field-group">
                <label className="resume-field-label">이메일</label>
                <input
                  className="resume-input"
                  placeholder="이메일을 입력해 주세요."
                  value={emailLocal}
                  onChange={(e) => setEmailLocal(e.target.value)}
                />
              </div>
            </div>

            {/* 담당 카테고리 + 국가 태그 */}
            <div className="resume-tag-row">
              <span className="resume-tag-label">담당 카테고리</span>
              <button className="resume-tag-add"><Plus size={14} /></button>
            </div>
            <div className="resume-tag-row">
              <span className="resume-tag-label">담당 국가</span>
              <button className="resume-tag-add"><Plus size={14} /></button>
            </div>
          </section>

          {/* 소개 & 핵심역량 */}
          <section className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">소개 & 핵심역량</h2>
            </div>
            {(!intro && !coreCompetencies) && (
              <div className="resume-empty-notice">
                ⓘ 소개와 핵심역량을 입력해 주세요.
              </div>
            )}

            <label className="resume-field-label">소개 <span className="resume-required">* (0/300자)</span></label>
            <textarea
              className="resume-textarea"
              placeholder={`채용 담당자가 가장 먼저 읽게되는 글이에요. 경력을 기반으로한 300자 이하의 소개를 작성해 보세요.\n예시) 소비자 관점과 브랜드 관점을 모두 이해하는 3년차 뷰티 마케터입니다.`}
              maxLength={300}
              value={introLocal}
              onChange={(e) => setIntroLocal(e.target.value)}
            />

            <label className="resume-field-label">핵심 역량 <span className="resume-required">* (0/300자)</span></label>
            <textarea
              className="resume-textarea"
              placeholder={`핵심역량 3~5가지를 정리해보세요\n1. 일본 이커머스 플랫폼 운영 경험 (Qoo10, 라쿠텐, 아마존JP 등)\n2. 뷰티 브랜드 인하우스 마케팅 및 시딩 캠페인 기획\n3. 메타 광고 운영 및 인플루언서 협업 캠페인 실무 역량`}
              maxLength={300}
              value={coreLocal}
              onChange={(e) => setCoreLocal(e.target.value)}
            />
          </section>

          {/* 경력 */}
          <section className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">경력</h2>
              <button className="resume-add-btn" onClick={() => router.push("/profile")}>
                <Plus size={14} /> 경력 추가
              </button>
            </div>
            {careers.length === 0 ? (
              <div className="resume-empty-section">
                <button className="resume-empty-btn" onClick={() => router.push("/profile")}>
                  <Plus size={16} /> 경력 직접추가
                </button>
                <span className="resume-empty-or">또는</span>
                <button className="resume-empty-btn resume-empty-btn-outline" onClick={() => router.push("/profile")}>
                  경력 불러오기
                </button>
              </div>
            ) : (
              careers.map((c) => (
                <div key={c.id} className="resume-career-item">
                  <div className="resume-career-head">
                    <strong>{c.company}</strong>
                    <span className="resume-career-period">{c.startDate} - {c.endDate}</span>
                  </div>
                  {c.department && <p className="resume-career-dept">{c.department} · {c.position}</p>}
                </div>
              ))
            )}
          </section>

          {/* 학력 */}
          <section className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">학력</h2>
              <button className="resume-add-btn" onClick={() => router.push("/profile")}>
                <Plus size={14} /> 학교 추가
              </button>
            </div>
            {educations.length === 0 ? (
              <div className="resume-empty-section">
                <button className="resume-empty-btn" onClick={() => router.push("/profile")}>
                  <Plus size={16} /> 학력 추가
                </button>
              </div>
            ) : (
              educations.map((edu) => (
                <div key={edu.id} className="resume-edu-item">
                  <strong>{edu.school}</strong>
                  <span className="resume-edu-info">{edu.major} · {edu.status}</span>
                  <span className="resume-edu-period">{edu.startDate} - {edu.endDate}</span>
                </div>
              ))
            )}
          </section>

          {/* 관련 경험 */}
          <section className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">관련 경험 및 기타</h2>
              <button className="resume-add-btn" onClick={() => router.push("/profile")}>
                <Plus size={14} /> 추가
              </button>
            </div>
            {experiences.map((exp) => (
              <div key={exp.id} className="resume-exp-item">
                <span className="resume-exp-category">{exp.category}</span>
                <strong>{exp.title}</strong>
                {exp.description && <p className="resume-exp-desc">{exp.description}</p>}
              </div>
            ))}
            {experiences.length === 0 && (
              <div className="resume-empty-section">
                <button className="resume-empty-btn" onClick={() => router.push("/profile")}>
                  <Plus size={16} /> 관련 경험 추가
                </button>
              </div>
            )}
          </section>

          {/* 스킬 */}
          <section className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">스킬</h2>
              <button className="resume-add-btn" onClick={() => router.push("/profile")}>
                <Plus size={14} /> 추가
              </button>
            </div>
            {skills.length > 0 ? (
              <div className="resume-skill-chips">
                {skills.map((sk) => <span key={sk} className="resume-skill-chip">{sk}</span>)}
              </div>
            ) : (
              <div className="resume-empty-section">
                <button className="resume-empty-btn" onClick={() => router.push("/profile")}>
                  <Plus size={16} /> 스킬 추가
                </button>
              </div>
            )}
          </section>

          {/* 어학 */}
          <section className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">어학</h2>
              <button className="resume-add-btn" onClick={() => router.push("/profile")}>
                <Plus size={14} /> 추가
              </button>
            </div>
            {languages.length > 0 ? (
              languages.map((lang) => (
                <div key={lang.id} className="resume-lang-item">
                  <strong>{lang.language}</strong>
                  <span className="resume-lang-level">{lang.level}</span>
                </div>
              ))
            ) : (
              <div className="resume-empty-section">
                <button className="resume-empty-btn" onClick={() => router.push("/profile")}>
                  <Plus size={16} /> 어학 추가
                </button>
              </div>
            )}
          </section>

          {/* 링크 */}
          <section className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">링크</h2>
              <button className="resume-add-btn" onClick={() => router.push("/profile")}>
                <Plus size={14} /> 추가
              </button>
            </div>
            {links.length > 0 ? (
              links.map((link) => (
                <div key={link.id} className="resume-link-item">
                  <span className="resume-link-category">{link.category}</span>
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="resume-link-url">{link.url}</a>
                </div>
              ))
            ) : (
              <div className="resume-empty-section">
                <button className="resume-empty-btn" onClick={() => router.push("/profile")}>
                  <Plus size={16} /> 링크 추가
                </button>
              </div>
            )}
          </section>

          {/* 저장 버튼 */}
          <div className="resume-bottom-save">
            <button className="resume-save-btn-full" onClick={handleSave}>저장하기</button>
          </div>
        </main>
      </div>
    </div>
  );
}
