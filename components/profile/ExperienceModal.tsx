"use client";

import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useProfileStore, genId, type ExperienceEntry } from "@/lib/store/profileStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editTarget?: ExperienceEntry | null;
}

export default function ExperienceModal({ isOpen, onClose, editTarget }: Props) {
  const { addExperience, updateExperience } = useProfileStore();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const isEdit = !!editTarget;

  useEffect(() => {
    if (!isOpen) return;
    if (editTarget) {
      setTitle(editTarget.title || "");
      setDesc(editTarget.description || "");
    } else {
      setTitle("");
      setDesc("");
    }
  }, [isOpen, editTarget]);

  if (!isOpen) return null;

  const isValid = !!title.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    if (isEdit) {
      updateExperience(editTarget!.id, { id: editTarget!.id, category: editTarget!.category || "", title: title.trim(), description: desc.trim() });
    } else {
      addExperience({ id: genId(), category: "", title: title.trim(), description: desc.trim() });
    }
    onClose();
  };

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <button className="cv-back" onClick={onClose}><ChevronLeft size={20} /></button>
          <h2 className="cv-title">{isEdit ? "관련 경험 수정" : "관련 경험 및 기타"}</h2>
          <div style={{ width: 36 }} />
        </div>
        <div className="cv-body">
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