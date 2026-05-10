"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useProfileStore, genId } from "@/lib/store/profileStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const EXPERIENCE_CATEGORIES = ["프로젝트", "수상", "자격증", "서포터즈", "대외활동", "SNS 운영", "기타"];

export default function ExperienceModal({ isOpen, onClose }: Props) {
  const { addExperience } = useProfileStore();
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [showCategory, setShowCategory] = useState(false);

  if (!isOpen) return null;

  const isValid = category && title.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    addExperience({ id: genId(), category, title: title.trim(), description: desc.trim() });
    setCategory("");
    setTitle("");
    setDesc("");
    onClose();
  };

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <button className="cv-back" onClick={onClose}><ChevronLeft size={20} /></button>
          <h2 className="cv-title">관련 경험 및 기타</h2>
          <div style={{ width: 36 }} />
        </div>
        <div className="cv-body">
          <label className="cv-field-label cv-required">카테고리</label>
          <button className="cv-select-btn" onClick={() => setShowCategory(!showCategory)}>
            <span className={category ? "" : "cv-placeholder"}>{category || "카테고리를 선택해 주세요."}</span>
            <ChevronLeft size={16} style={{ transform: "rotate(-90deg)" }} />
          </button>
          {showCategory && (
            <div className="cv-dropdown">
              {EXPERIENCE_CATEGORIES.map((cat) => (
                <button key={cat} className="cv-dropdown-item" onClick={() => { setCategory(cat); setShowCategory(false); }}>{cat}</button>
              ))}
            </div>
          )}

          <label className="cv-field-label cv-required">제목</label>
          <input className="cv-input" placeholder="경험 제목을 입력해 주세요." value={title} onChange={(e) => setTitle(e.target.value)} />

          <label className="cv-field-label">설명</label>
          <textarea className="cv-textarea" placeholder="경험에 대해 설명해 주세요." maxLength={1000} value={desc} onChange={(e) => setDesc(e.target.value)} />

          <button className={`cv-btn-primary ${isValid ? "" : "disabled"}`} disabled={!isValid} onClick={handleSubmit}>저장</button>
        </div>
      </div>
    </div>
  );
}
