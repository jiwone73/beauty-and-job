"use client";

import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useProfileStore, genId } from "@/lib/store/profileStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const STATUS_OPTIONS = ["졸업", "재학", "휴학", "중퇴", "수료"];

export default function EducationModal({ isOpen, onClose }: Props) {
  const { addEducation } = useProfileStore();
  const [school, setSchool] = useState("");
  const [status, setStatus] = useState("");
  const [startY, setStartY] = useState("");
  const [startM, setStartM] = useState("");
  const [endY, setEndY] = useState("");
  const [endM, setEndM] = useState("");
  const [major, setMajor] = useState("");
  const [desc, setDesc] = useState("");
  const [showStatus, setShowStatus] = useState(false);

  if (!isOpen) return null;

  const isValid = school.trim() && startY && startM && major.trim();

  const handleSubmit = () => {
    if (!isValid) return;
    addEducation({
      id: genId(),
      school: school.trim(),
      status,
      startDate: `${startY}.${startM}`,
      endDate: endY && endM ? `${endY}.${endM}` : "",
      major: major.trim(),
      description: desc.trim(),
    });
    onClose();
  };

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <button className="cv-back" onClick={onClose}><ChevronLeft size={20} /></button>
          <h2 className="cv-title">학력</h2>
          <div style={{ width: 36 }} />
        </div>
        <div className="cv-body">
          <label className="cv-field-label cv-required">학교명</label>
          <input className="cv-input" placeholder="학교명을 입력해 주세요." value={school} onChange={(e) => setSchool(e.target.value)} />

          <label className="cv-field-label">졸업 상태</label>
          <button className="cv-select-btn" onClick={() => setShowStatus(!showStatus)}>
            <span className={status ? "" : "cv-placeholder"}>{status || "졸업 상태를 선택해 주세요."}</span>
            <ChevronLeft size={16} style={{ transform: "rotate(-90deg)" }} />
          </button>
          {showStatus && (
            <div className="cv-dropdown">
              {STATUS_OPTIONS.map((opt) => (
                <button key={opt} className="cv-dropdown-item" onClick={() => { setStatus(opt); setShowStatus(false); }}>{opt}</button>
              ))}
            </div>
          )}

          <label className="cv-field-label cv-required">재학 기간</label>
          <div className="cv-date-row">
            <input className="cv-input cv-date-input" placeholder="YYYY" maxLength={4} value={startY} onChange={(e) => setStartY(e.target.value.replace(/\D/g, ""))} />
            <input className="cv-input cv-date-input" placeholder="MM" maxLength={2} value={startM} onChange={(e) => setStartM(e.target.value.replace(/\D/g, ""))} />
            <span className="cv-date-sep">-</span>
            <input className="cv-input cv-date-input" placeholder="YYYY" maxLength={4} value={endY} onChange={(e) => setEndY(e.target.value.replace(/\D/g, ""))} />
            <input className="cv-input cv-date-input" placeholder="MM" maxLength={2} value={endM} onChange={(e) => setEndM(e.target.value.replace(/\D/g, ""))} />
          </div>

          <label className="cv-field-label cv-required">전공 및 학위</label>
          <input className="cv-input" placeholder="전공과 학위를 입력해 주세요." value={major} onChange={(e) => setMajor(e.target.value)} />

          <label className="cv-field-label">설명</label>
          <textarea className="cv-textarea" placeholder="이수 과목, 논문, 프로젝트 등의 경험을 작성해 보세요." maxLength={1000} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <div className="cv-char-count">{desc.length} /1000</div>

          <button className={`cv-btn-primary ${isValid ? "" : "disabled"}`} disabled={!isValid} onClick={handleSubmit}>저장</button>
        </div>
      </div>
    </div>
  );
}
