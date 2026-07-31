"use client";
import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useProfileStore, genId, type LanguageEntry } from "@/lib/store/profileStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editTarget?: LanguageEntry | null;
}

const LANGUAGES = ["영어", "일본어", "중국어", "한국어", "스페인어", "프랑스어", "독일어", "기타"];
// 3단계 인포그래픽 (상/중/하) — 문구는 자체 큐레이션
const LEVELS = [
  { tier: "상", value: "능숙하게 소통", desc: "자유로운 대화" },
  { tier: "중", value: "일상 회화 가능", desc: "기본 의사소통" },
  { tier: "하", value: "간단한 표현", desc: "짧은 인사·단어" },
];

export default function LanguageModal({ isOpen, onClose, editTarget }: Props) {
  const { addLanguage, updateLanguage } = useProfileStore();
  const [lang, setLang] = useState("");
  const [level, setLevel] = useState("");
  const [showLang, setShowLang] = useState(false);

  const isEdit = !!editTarget;

  useEffect(() => {
    if (!isOpen) return;
    if (editTarget) {
      setLang(editTarget.language || "");
      setLevel(editTarget.level || "");
    } else {
      setLang("");
      setLevel("");
    }
    setShowLang(false);
  }, [isOpen, editTarget]);

  if (!isOpen) return null;

  const isValid = lang && level;

  const handleSubmit = () => {
    if (!isValid) return;
    if (isEdit) {
      updateLanguage(editTarget!.id, { id: editTarget!.id, language: lang, level, test: editTarget!.test || "" });
    } else {
      addLanguage({ id: genId(), language: lang, level, test: "" });
    }
    onClose();
  };

  return (
    <div className="cv-overlay">
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <button className="cv-back" onClick={onClose}><ChevronLeft size={20} /></button>
          <h2 className="cv-title">{isEdit ? "어학 수정" : "어학"}</h2>
          <div style={{ width: 36 }} />
        </div>
        <div className="cv-body">
          <label className="cv-field-label cv-required">언어</label>
          <button className="cv-select-btn" onClick={() => setShowLang(!showLang)}>
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
          <div style={{ display: "flex", gap: 10, marginBottom: 4 }}>
            {LEVELS.map((lv) => {
              const on = level === lv.value;
              return (
                <button key={lv.tier} type="button" onClick={() => setLevel(lv.value)}
                  style={{
                    flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    padding: "16px 8px", borderRadius: 12, cursor: "pointer", background: "#fff",
                    border: on ? "1.5px solid #5f0080" : "1px solid #e6e6e6",
                    boxShadow: on ? "0 0 0 3px rgba(95,0,128,0.08)" : "none",
                  }}>
                  <span style={{
                    width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17, fontWeight: 700,
                    border: on ? "2px solid #5f0080" : "2px solid #dcdcdc",
                    color: on ? "#5f0080" : "#bbb",
                  }}>{lv.tier}</span>
                  <span style={{ fontSize: 13, fontWeight: on ? 700 : 400, color: on ? "#5f0080" : "#666" }}>{lv.value}</span>
                  <span style={{ fontSize: 11.5, color: on ? "#9b6bb3" : "#aaa" }}>{lv.desc}</span>
                </button>
              );
            })}
          </div>
          <button className={`cv-btn-primary ${isValid ? "" : "disabled"}`} disabled={!isValid} onClick={handleSubmit}>저장</button>
        </div>
      </div>
    </div>
  );
}