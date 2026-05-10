"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useProfileStore, genId } from "@/lib/store/profileStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGES = ["영어", "일본어", "중국어", "한국어", "스페인어", "프랑스어", "독일어", "기타"];
const LEVELS = [
  { value: "글로벌 커뮤니케이션 레벨", desc: "현지인과의 비즈니스 언어가 아주 능숙한 네이티브 급이에요." },
  { value: "고급 비즈니스 레벨", desc: "회의, 이메일, 프레젠테이션 등 실무 전반을 무리없이 수행해요." },
  { value: "비즈니스 레벨", desc: "제품 설명, 기본 서류 작성, 간단한 미팅 등 기본적인 대응이 가능해요." },
  { value: "기본 레벨", desc: "메일/DM/오프라인 행사에서의 기본 소통이 가능해요." },
];

export default function LanguageModal({ isOpen, onClose }: Props) {
  const { addLanguage } = useProfileStore();
  const [lang, setLang] = useState("");
  const [level, setLevel] = useState("");
  const [showLang, setShowLang] = useState(false);
  const [showLevel, setShowLevel] = useState(false);

  if (!isOpen) return null;

  const isValid = lang && level;

  const handleSubmit = () => {
    if (!isValid) return;
    addLanguage({ id: genId(), language: lang, level, test: "" });
    setLang("");
    setLevel("");
    onClose();
  };

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <button className="cv-back" onClick={onClose}><ChevronLeft size={20} /></button>
          <h2 className="cv-title">어학</h2>
          <div style={{ width: 36 }} />
        </div>
        <div className="cv-body">
          <label className="cv-field-label cv-required">언어</label>
          <button className="cv-select-btn" onClick={() => { setShowLang(!showLang); setShowLevel(false); }}>
            <span className={lang ? "" : "cv-placeholder"}>{lang || "언어를 선택해 주세요."}</span>
            <ChevronLeft size={16} style={{ transform: "rotate(-90deg)" }} />
          </button>
          {showLang && (
            <div className="cv-dropdown">
              {LANGUAGES.map((l) => (
                <button key={l} className="cv-dropdown-item" onClick={() => { setLang(l); setShowLang(false); }}>{l}</button>
              ))}
            </div>
          )}

          <label className="cv-field-label cv-required">수준</label>
          <button className="cv-select-btn" onClick={() => { setShowLevel(!showLevel); setShowLang(false); }}>
            <span className={level ? "" : "cv-placeholder"}>{level || "수준을 선택해 주세요"}</span>
            <ChevronLeft size={16} style={{ transform: "rotate(-90deg)" }} />
          </button>
          {showLevel && (
            <div className="cv-dropdown cv-dropdown-level">
              {LEVELS.map((lv) => (
                <button key={lv.value} className={`cv-dropdown-item cv-level-item ${level === lv.value ? "active" : ""}`} onClick={() => { setLevel(lv.value); setShowLevel(false); }}>
                  <strong>{lv.value}</strong>
                  <span>{lv.desc}</span>
                </button>
              ))}
            </div>
          )}

          <button className="cv-btn-text-add">+ 어학시험 추가</button>

          <button className={`cv-btn-primary ${isValid ? "" : "disabled"}`} disabled={!isValid} onClick={handleSubmit}>저장</button>
        </div>
      </div>
    </div>
  );
}
