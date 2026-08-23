"use client";
import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useProfileStore, genId, type LanguageEntry } from "@/lib/store/profileStore";
import { 시험읽기, 시험쓰기, type 어학시험 } from "@/lib/languageTest";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editTarget?: LanguageEntry | null;
  /** 본사 이력서만 시험명·점수·취득년월을 묻는다. 살롱에서는 손님 앞에서 말이
   *  되느냐가 전부라 상·중·하면 충분하다. */
  resumeType?: "office" | "salon";
  /** 참이면 덮개 없이 칸 안에서 그대로 펼친다. 큰 화면에서 쓴다. */
  inline?: boolean;
}

const LANGUAGES = ["영어", "일본어", "중국어", "한국어", "스페인어", "프랑스어", "독일어", "기타"];
// 3단계 인포그래픽 (상/중/하) — 문구는 자체 큐레이션
const LEVELS = [
  { tier: "상", value: "능숙하게 소통", desc: "자유로운 대화" },
  { tier: "중", value: "일상 회화 가능", desc: "기본 의사소통" },
  { tier: "하", value: "간단한 표현", desc: "짧은 인사·단어" },
];

export default function LanguageModal({ isOpen, onClose, editTarget, inline, resumeType = "salon" }: Props) {
  const { addLanguage, updateLanguage } = useProfileStore();
  const [lang, setLang] = useState("");
  const [level, setLevel] = useState("");
  const [showLang, setShowLang] = useState(false);
  const [시험, set시험] = useState<어학시험>({ name: "", score: "", ym: "" });

  const isEdit = !!editTarget;

  useEffect(() => {
    if (!isOpen) return;
    if (editTarget) {
      setLang(editTarget.language || "");
      setLevel(editTarget.level || "");
      set시험(시험읽기(editTarget.test || ""));
    } else {
      setLang("");
      setLevel("");
      set시험({ name: "", score: "", ym: "" });
    }
    setShowLang(false);
  }, [isOpen, editTarget]);

  if (!isOpen) return null;

  const isValid = lang && level;

  const handleSubmit = () => {
    if (!isValid) return;
    if (isEdit) {
      updateLanguage(editTarget!.id, { id: editTarget!.id, language: lang, level, test: 시험쓰기(시험) });
    } else {
      addLanguage({ id: genId(), language: lang, level, test: 시험쓰기(시험) });
    }
    onClose();
  };

  // 칸 안에서 그대로 펼치는 모양. 어학 한 줄을 넣자고 화면을 덮으면
  // 방금까지 채우던 이력서가 사라진다.
  const 몸통 = (
      <div className={inline ? "cv-body cv-body-inline" : "cv-body"}>
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
                  border: on ? "1.5px solid #582681" : "1px solid #e6e6e6",
                  boxShadow: on ? "0 0 0 3px rgba(95,0,128,0.08)" : "none",
                }}>
                <span style={{
                  width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 17, fontWeight: 700,
                  border: on ? "2px solid #582681" : "2px solid #dcdcdc",
                  color: on ? "#582681" : "#bbb",
                }}>{lv.tier}</span>
                <span style={{ fontSize: 13, fontWeight: on ? 700 : 400, color: on ? "#582681" : "#666" }}>{lv.value}</span>
                <span style={{ fontSize: 11.5, color: on ? "#582681" : "#aaa" }}>{lv.desc}</span>
              </button>
            );
          })}
        </div>
        {resumeType === "office" && (
          <>
            <label className="cv-field-label">시험명</label>
            <input className="cv-input" placeholder="예: TOEIC, JLPT, HSK" value={시험.name}
              onChange={(e) => set시험({ ...시험, name: e.target.value })} maxLength={30} />
            <label className="cv-field-label">점수 / 등급</label>
            <input className="cv-input" placeholder="예: 900, N2, 5급" value={시험.score}
              onChange={(e) => set시험({ ...시험, score: e.target.value })} maxLength={20} />
            <label className="cv-field-label">취득 년월</label>
            <input className="cv-input" type="month" value={시험.ym}
              onChange={(e) => set시험({ ...시험, ym: e.target.value })}
              max={new Date().toISOString().slice(0, 7)} />
          </>
        )}
        <div className={inline ? "cv-actions" : undefined}>
          {inline && <button type="button" className="cv-inline-cancel" onClick={onClose}>취소</button>}
          <button className={`cv-btn-primary ${isValid ? "" : "disabled"}`} disabled={!isValid} onClick={handleSubmit}>저장</button>
        </div>
  </div>
  );

  if (inline) return <div className="cv-inline">{몸통}</div>;

  return (
    <div className="cv-overlay">
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <button className="cv-back" onClick={onClose}><ChevronLeft size={20} /></button>
          <h2 className="cv-title">{isEdit ? "어학 수정" : "어학"}</h2>
          <div style={{ width: 36 }} />
        </div>
        {몸통}
      </div>
    </div>
  );
}
