"use client";
import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useProfileStore, genId, type LinkEntry } from "@/lib/store/profileStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editTarget?: LinkEntry | null;
  resumeType?: "salon" | "office";
}

// 작업물을 어디에 두는지는 직군마다 다르다. 매장은 시술 사진을 인스타에 올리고,
// 오피스는 노션·링크드인에 정리해 둔다. 한 목록으로 묶으면 어느 쪽에도 안 맞는다.
// ('포트폴리오'는 구역 이름과 겹쳐 뺐다 — 무엇을 고르라는 건지 헷갈린다.)
const SALON_CATEGORIES = ["인스타그램", "유튜브", "블로그", "기타"];
const OFFICE_CATEGORIES = ["노션", "링크드인", "브런치", "개인 사이트", "기타"];
const URL_HINT: Record<string, string> = {
  인스타그램: "instagram.com/아이디",
  유튜브: "youtube.com/@채널",
  블로그: "blog.naver.com/아이디",
  노션: "notion.site/...",
  링크드인: "linkedin.com/in/아이디",
  브런치: "brunch.co.kr/@아이디",
};

export default function LinkModal({ isOpen, onClose, editTarget, resumeType = "salon" }: Props) {
  const 분류목록 = resumeType === "office" ? OFFICE_CATEGORIES : SALON_CATEGORIES;
  // 가장 흔한 것을 기본값으로 둔다 — 매장은 인스타, 오피스는 노션.
  const 기본분류 = 분류목록[0];
  const { addLink, updateLink } = useProfileStore();
  const [category, setCategory] = useState("");
  const [url, setUrl] = useState("");
  const [showCategory, setShowCategory] = useState(false);

  const isEdit = !!editTarget;

  useEffect(() => {
    if (!isOpen) return;
    if (editTarget) {
      setCategory(editTarget.category || "");
      setUrl(editTarget.url || "");
    } else {
      setCategory(기본분류);
      setUrl("");
    }
    setShowCategory(false);
  }, [isOpen, editTarget]);

  if (!isOpen) return null;

  const isValid = category && url.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    if (isEdit) {
      updateLink(editTarget!.id, { id: editTarget!.id, category, url: url.trim() });
    } else {
      addLink({ id: genId(), category, url: url.trim() });
    }
    onClose();
  };

  return (
    <div className="cv-overlay">
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <button className="cv-back" onClick={onClose}><ChevronLeft size={20} /></button>
          <h2 className="cv-title">{isEdit ? "링크 수정" : "링크"}</h2>
          <div style={{ width: 36 }} />
        </div>
        <div className="cv-body">
          <p className="cv-desc">
            {resumeType === "office"
              ? "노션·링크드인·브런치처럼 작업물을 정리해 둔 곳이 있다면 추가해 강점을 더 드러내 보세요."
              : "인스타그램·유튜브처럼 시술 사진이나 직접 만든 콘텐츠를 올리는 곳이 있다면 추가해 강점을 더 드러내 보세요."}
          </p>
          <label className="cv-field-label cv-required">카테고리</label>
          <button className="cv-select-btn" onClick={() => setShowCategory(!showCategory)}>
            <span className={category ? "" : "cv-placeholder"}>{category || "카테고리를 선택해 주세요"}</span>
            <ChevronLeft size={16} style={{ transform: "rotate(-90deg)" }} />
          </button>
          {showCategory && (
            <div className="cv-dropdown">
              {분류목록.map((cat) => (
                <button key={cat} className="cv-dropdown-item" onClick={() => { setCategory(cat); setShowCategory(false); }}>{cat}</button>
              ))}
            </div>
          )}
          <label className="cv-field-label cv-required">URL</label>
          <input className="cv-input" placeholder={URL_HINT[category] || "https://"} value={url} onChange={(e) => setUrl(e.target.value)} />
          <button className={`cv-btn-primary ${isValid ? "" : "disabled"}`} disabled={!isValid} onClick={handleSubmit}>저장</button>
        </div>
      </div>
    </div>
  );
}