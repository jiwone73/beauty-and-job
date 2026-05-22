"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Download, Eye, Plus, X } from "lucide-react";
import { useSignupStore } from "@/lib/store/signupStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { useAuthStore } from "@/lib/store/authStore";

export default function ResumePage() {
  const router = useRouter();
  const { name: signupName, birth, gender, job, jobCustom, phone } = useSignupStore();
  const { userName } = useAuthStore();
  const name = signupName || userName || "";
  const {
    intro, coreCompetencies, educations, careers, experiences,
    skills, languages, links, email,
    setIntro, setCoreCompetencies, setEmail,
  } = useProfileStore();

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [resumeType, setResumeType] = useState<"office" | "salon">("office");
  const [introLocal, setIntroLocal] = useState(intro);
  const [coreLocal, setCoreLocal] = useState(coreCompetencies);
  const [emailLocal, setEmailLocal] = useState(email);
  const [showPreview, setShowPreview] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // 유저 정보 불러오기 (이메일 + job_type)
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          if (res.data.email && !emailLocal) {
            setEmailLocal(res.data.email);
          }
          if (res.data.job_type === "STORE") {
            setResumeType("salon");
          } else {
            setResumeType("office");
          }
        }
      })
      .catch(console.error);
  }, []);

  const jobDisplay = job === "직접입력" ? jobCustom : job || "직군 미설정";
  const birthDisplay = birth
    ? `${birth.slice(0, 4)}년 (${gender === "남성" ? "남" : "여"})`
    : "";

  const handleSave = () => {
    setIntro(introLocal);
    setCoreCompetencies(coreLocal);
    setEmail(emailLocal);
    alert("저장되었습니다.");
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      setShowPreview(true);
      await new Promise((r) => setTimeout(r, 600));
      if (!previewRef.current) return;
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      const fileName = name ? `${name}_이력서.pdf` : "이력서.pdf";
      pdf.save(fileName);
      setShowPreview(false);
    } catch (e) {
      alert("다운로드 중 오류가 발생했습니다.");
      setShowPreview(false);
    } finally {
      setIsDownloading(false);
    }
  };

  const ResumeContent = () => (
    <div ref={previewRef} className="rp-wrap">
      <div className="rp-header">
        <h1 className="rp-name">{name || "이름"}</h1>
        <p className="rp-meta">
          {birthDisplay}{birthDisplay && jobDisplay ? " · " : ""}{jobDisplay}
        </p>
        <p className="rp-contact">
          {phone || ""}{phone && (emailLocal || email) ? " · " : ""}{emailLocal || email || ""}
        </p>
      </div>
      {introLocal && (
        <div className="rp-section">
          <h2 className="rp-section-title">소개</h2>
          <p className="rp-text">{introLocal}</p>
        </div>
      )}
      {coreLocal && (
        <div className="rp-section">
          <h2 className="rp-section-title">핵심 역량</h2>
          <p className="rp-text" style={{ whiteSpace: "pre-line" }}>{coreLocal}</p>
        </div>
      )}
      {careers.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">경력</h2>
          {careers.map((c) => (
            <div key={c.id} className="rp-item">
              <div className="rp-item-head">
                <strong>{c.company}</strong>
                <span className="rp-period">{c.startDate} – {c.endDate}</span>
              </div>
              {c.department && <p className="rp-item-sub">{c.department} · {c.position}</p>}
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
                <span className="rp-period">{edu.startDate} – {edu.endDate}</span>
              </div>
              <p className="rp-item-sub">{edu.major} · {edu.status}</p>
            </div>
          ))}
        </div>
      )}
      {skills.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">스킬</h2>
          <div className="rp-chips">
            {skills.map((sk) => <span key={sk} className="rp-chip">{sk}</span>)}
          </div>
        </div>
      )}
      {links.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">링크</h2>
          {links.map((link) => (
            <div key={link.id} className="rp-item">
              <span className="rp-badge">{link.category}</span>
              <a href={link.url} className="rp-link">{link.url}</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="resume-page">
      {/* 상단 헤더 */}
      <header className="resume-header">
        <div className="resume-header-inner">
          <Link href="/" className="resume-logo">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={110} height={28} priority />
          </Link>
          <nav className="resume-gnb">
            <Link href="/jobs" className="resume-gnb-item">채용공고</Link>
            <Link href="/profile/resume" className="resume-gnb-item">이력서 등록</Link>
            <Link href="/insights" className="resume-gnb-item">뷰티 인사이트</Link>
          </nav>
          <div className="resume-header-actions">
            <button className="resume-back-btn" onClick={() => router.push("/profile")}>
              <ChevronLeft size={16} />
              <span>프로필</span>
            </button>
            <button className="resume-action-btn" onClick={() => setShowPreview(true)}>
              <Eye size={16} /><span>미리보기</span>
            </button>
            <button
              className="resume-action-btn"
              onClick={handleDownload}
              disabled={isDownloading}
            >
              <Download size={16} />
              <span>{isDownloading ? "저장 중..." : "다운로드"}</span>
            </button>
            <button className="resume-save-btn" onClick={handleSave}>저장</button>
          </div>
        </div>
      </header>

      {/* 탭 없이 타이틀만 */}
      <div className="resume-subheader">
        <h1 className="resume-subheader-title">이력서 편집</h1>
        <span className="text-sm text-gray-500">
          {resumeType === "office" ? "🏢 기업·브랜드" : "🏪 매장·기술직"}
        </span>
      </div>

      <div className="resume-layout">
        <aside className="resume-sidebar">
          <p className="resume-sidebar-title">섹션 구성</p>
          {(resumeType === "office" ? [
            { id: "basic", label: "기본 정보" },
            { id: "intro", label: "소개 · 핵심역량" },
            { id: "career", label: "경력" },
            { id: "education", label: "학력" },
            { id: "experience", label: "관련 경험" },
            { id: "skill", label: "스킬" },
            { id: "language", label: "어학" },
            { id: "link", label: "링크" },
          ] : [
            { id: "basic", label: "기본 정보" },
            { id: "intro", label: "소개" },
            { id: "career", label: "경력 (근무 매장)" },
            { id: "education", label: "학력" },
            { id: "license", label: "자격증" },
            { id: "skill", label: "전문 기술" },
            { id: "workCondition", label: "희망 근무 조건" },
            { id: "link", label: "링크·포트폴리오" },
          ]).map((sec) => (
            <button
              key={sec.id}
              className={`resume-sidebar-item ${activeSection === sec.id ? "active" : ""}`}
              onClick={() => {
                setActiveSection(sec.id);
                const el = document.getElementById(`section-${sec.id}`);
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {sec.label}
            </button>
          ))}
        </aside>

        <main className="resume-editor">
          <section id="section-basic" className="resume-section">
            <h2 className="resume-section-title">기본 정보</h2>
            <div className="resume-basic-info">
              <div className="resume-name-block">
                <h3 className="resume-name">{name || "이름"}</h3>
                <p className="resume-job-line">{birthDisplay} {birthDisplay && "·"} {jobDisplay}</p>
                <p className="resume-contact">{phone || ""} {phone && emailLocal ? "·" : ""} {emailLocal}</p>
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
            {resumeType === "office" ? (
              <>
                <div className="resume-tag-row">
                  <span className="resume-tag-label">담당 카테고리</span>
                  <button className="resume-tag-add"><Plus size={14} /></button>
                </div>
                <div className="resume-tag-row">
                  <span className="resume-tag-label">담당 국가</span>
                  <button className="resume-tag-add"><Plus size={14} /></button>
                </div>
              </>
            ) : (
              <>
                <div className="resume-tag-row">
                  <span className="resume-tag-label">전문 분야</span>
                  <button className="resume-tag-add"><Plus size={14} /></button>
                </div>
                <div className="resume-tag-row">
                  <span className="resume-tag-label">희망 급여</span>
                  <button className="resume-tag-add"><Plus size={14} /></button>
                </div>
                <div className="resume-tag-row">
                  <span className="resume-tag-label">근무 형태</span>
                  <button className="resume-tag-add"><Plus size={14} /></button>
                </div>
              </>
            )}
          </section>

          <section id="section-intro" className="resume-section">
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
              placeholder={resumeType === "office"
                ? `채용 담당자가 가장 먼저 읽게되는 글이에요.\n예시) 소비자 관점과 브랜드 관점을 모두 이해하는 3년차 뷰티 마케터입니다.`
                : `나를 표현하는 한 줄 소개를 작성해보세요.\n예시) 섬세한 손기술과 트렌드 감각을 갖춘 5년 경력 네일 아티스트입니다.`}
              maxLength={300}
              value={introLocal}
              onChange={(e) => setIntroLocal(e.target.value)}
            />
            {resumeType === "office" && (
              <>
                <label className="resume-field-label">핵심 역량 <span className="resume-required">* (0/300자)</span></label>
                <textarea
                  className="resume-textarea"
                  placeholder={`핵심역량 3~5가지를 정리해보세요\n1. 일본 이커머스 플랫폼 운영 경험\n2. 뷰티 브랜드 인하우스 마케팅\n3. 메타 광고 운영 및 인플루언서 협업`}
                  maxLength={300}
                  value={coreLocal}
                  onChange={(e) => setCoreLocal(e.target.value)}
                />
              </>
            )}
          </section>

          <section id="section-career" className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">{resumeType === "office" ? "경력" : "경력 (근무 매장)"}</h2>
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

          <section id="section-education" className="resume-section">
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

          <section id="section-experience" className="resume-section">
            <div className="resume-section-head">
              <h2 className="resume-section-title">관련 경험 및 기타</h2>
              <button className="resume-add-btn" onClick={() => router.push("/profile")}>
                <Plus size={14} /> 추가
              </button>
            </div>
            {experiences.length === 0 ? (
              <div className="resume-empty-section">
                <button className="resume-empty-btn" onClick={() => router.push("/profile")}>
                  <Plus size={16} /> 관련 경험 추가
                </button>
              </div>
            ) : (
              experiences.map((exp) => (
                <div key={exp.id} className="resume-exp-item">
                  <span className="resume-exp-category">{exp.category}</span>
                  <strong>{exp.title}</strong>
                  {exp.description && <p className="resume-exp-desc">{exp.description}</p>}
                </div>
              ))
            )}
          </section>

          <section id="section-skill" className="resume-section">
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

          <section id="section-language" className="resume-section">
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

          {resumeType === "salon" && (
            <>
              <section id="section-license" className="resume-section">
                <div className="resume-section-head">
                  <h2 className="resume-section-title">자격증</h2>
                  <button className="resume-add-btn" onClick={() => router.push("/profile")}>
                    <Plus size={14} /> 추가
                  </button>
                </div>
                <div className="resume-empty-section">
                  <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "8px" }}>
                    네일, 미용사, 피부관리사 등 보유 자격증을 추가해보세요
                  </p>
                  <button className="resume-empty-btn" onClick={() => router.push("/profile")}>
                    <Plus size={16} /> 자격증 추가
                  </button>
                </div>
              </section>

              <section id="section-workCondition" className="resume-section">
                <div className="resume-section-head">
                  <h2 className="resume-section-title">희망 근무 조건</h2>
                </div>
                <div className="resume-field-group" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {[
                    { label: "근무 형태", options: ["풀타임", "파트타임", "주말only", "무관"] },
                    { label: "희망 급여", options: ["월급", "시급", "협의"] },
                    { label: "근무 지역", options: ["서울", "경기", "인천", "기타"] },
                  ].map(({ label, options }) => (
                    <div key={label}>
                      <label className="resume-field-label">{label}</label>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                        {options.map((o) => (
                          <button key={o} className="resume-tag-chip">{o}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <section id="section-link" className="resume-section">
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

          <div className="resume-bottom-save">
            <button className="resume-save-btn-full" onClick={handleSave}>저장하기</button>
          </div>
        </main>
      </div>

      {/* 미리보기 모달 */}
      {showPreview && (
        <div className="rp-modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="rp-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rp-modal-header">
              <h2 className="rp-modal-title">이력서 미리보기</h2>
              <div className="rp-modal-actions">
                <button
                  className="resume-action-btn"
                  onClick={handleDownload}
                  disabled={isDownloading}
                >
                  <Download size={16} />
                  <span>{isDownloading ? "저장 중..." : "PDF 다운로드"}</span>
                </button>
                <button className="rp-modal-close" onClick={() => setShowPreview(false)}>
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="rp-modal-body">
              <ResumeContent />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}