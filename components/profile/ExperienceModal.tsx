"use client";

import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useProfileStore, genId, type ExperienceEntry } from "@/lib/store/profileStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editTarget?: ExperienceEntry | null;
  /** 참이면 덮개 없이 칸 안에서 그대로 펼친다. */
  inline?: boolean;
}

export default function ExperienceModal({ isOpen, onClose, editTarget, inline}: Props) {
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

  // 칸 안에서 그대로 펼칠 때 쓰는 몸통.
  const 몸통 = (
      <div className={inline ? "cv-body cv-body-inline" : "cv-body"}>
        <label className="cv-field-label cv-required">제목</label>
        <input className="cv-input" placeholder="예) 헤어쇼 대상, OO 공모전 입선, 대외활동" value={title} onChange={(e) => setTitle(e.target.value)} />
        <label className="cv-field-label">설명</label>
        <textarea className="cv-textarea" placeholder="경험에 대해 설명해 주세요." maxLength={1000} value={desc} onChange={(e) => setDesc(e.target.value)} />

        <button className={`cv-btn-primary ${isValid ? "" : "disabled"}`} disabled={!isValid} onClick={handleSubmit}>저장</button>
      </div>
  );

  // 인라인에는 덮개도 뒤로가기도 없다. 닫을 길을 여기서 준다.
  if (inline) return (
    <div className="cv-inline">
      {몸통}
      <button type="button" className="cv-inline-cancel" onClick={onClose}>취소</button>
    </div>
  );

  return (
    <div className="cv-overlay">
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <button className="cv-back" onClick={onClose}><ChevronLeft size={20} /></button>
          <h2 className="cv-title">{isEdit ? "활동/수상 수정" : "활동/수상 추가"}</h2>
          <div style={{ width: 36 }} />
        </div>
        {몸통}

      </div>
    </div>
  );
}
