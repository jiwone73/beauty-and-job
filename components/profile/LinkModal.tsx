"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useProfileStore, genId } from "@/lib/store/profileStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const LINK_CATEGORIES = ["인스타그램", "유튜브", "포트폴리오", "기타"];

export default function LinkModal({ isOpen, onClose }: Props) {
  const { addLink } = useProfileStore();
  const [category, setCategory] = useState("");
  const [url, setUrl] = useState("");
  const [showCategory, setShowCategory] = useState(false);

  if (!isOpen) return null;

  const isValid = category && url.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    addLink({ id: genId(), category, url: url.trim() });
    setCategory("");
    setUrl("");
    onClose();
  };

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <button className="cv-back" onClick={onClose}><ChevronLeft size={20} /></button>
          <h2 className="cv-title">링크</h2>
          <div style={{ width: 36 }} />
        </div>
        <div className="cv-body">
          <p className="cv-desc">
            인스타그램, 유튜브, 포트폴리오 등 직접 만든 뷰티 콘텐츠나 운영 채널이 있다면 추가하고 내 강점을 더 드러내보세요.
          </p>

          <label className="cv-field-label cv-required">카테고리</label>
          <button className="cv-select-btn" onClick={() => setShowCategory(!showCategory)}>
            <span className={category ? "" : "cv-placeholder"}>{category || "카테고리를 선택해 주세요"}</span>
            <ChevronLeft size={16} style={{ transform: "rotate(-90deg)" }} />
          </button>
          {showCategory && (
            <div className="cv-dropdown">
              {LINK_CATEGORIES.map((cat) => (
                <button key={cat} className="cv-dropdown-item" onClick={() => { setCategory(cat); setShowCategory(false); }}>{cat}</button>
              ))}
            </div>
          )}

          <label className="cv-field-label cv-required">URL</label>
          <input className="cv-input" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />

          <button className={`cv-btn-primary ${isValid ? "" : "disabled"}`} disabled={!isValid} onClick={handleSubmit}>저장</button>
        </div>
      </div>
    </div>
  );
}
