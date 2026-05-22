"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useProfileStore, type CareerEntry } from "@/lib/store/profileStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function CareerEditModal({ isOpen, onClose }: Props) {
  const { addCareer } = useProfileStore();
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setCompany("");
    setDepartment("");
    setPosition("");
    setStartDate("");
    setEndDate("");
    setIsCurrent(false);
  };

  const formatDate = (d: string) => {
    if (!d) return "";
    const parts = d.split("-");
    return parts.length >= 2 ? `${parts[0]}.${parts[1]}` : d;
  };

  const handleSave = () => {
    if (!company.trim()) {
      alert("회사명을 입력해주세요.");
      return;
    }
    if (!startDate) {
      alert("입사일을 입력해주세요.");
      return;
    }
    if (!isCurrent && !endDate) {
      alert("퇴사일을 입력하거나 '현재 재직 중'을 체크해주세요.");
      return;
    }

    const entry: CareerEntry = {
      id: `career-${Date.now()}`,
      company: company.trim(),
      department: department.trim(),
      position: position.trim(),
      startDate: formatDate(startDate),
      endDate: isCurrent ? "재직 중" : formatDate(endDate),
      isVerified: false,
    };
    addCareer(entry);
    reset();
    onClose();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <div className="cv-overlay" onClick={handleClose}>
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <div style={{ width: 36 }} />
          <h2 className="cv-title">경력 추가</h2>
          <button className="cv-close" onClick={handleClose}><X size={20} /></button>
        </div>
        <div className="cv-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label className="cv-field-label">회사명 / 매장명 <span style={{ color: "#e74c3c" }}>*</span></label>
            <input
              className="cv-input"
              placeholder="예: 올리브영, 준오헤어 강남점"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          <div>
            <label className="cv-field-label">부서 / 팀</label>
            <input
              className="cv-input"
              placeholder="예: 마케팅팀 (매장직은 비워두셔도 됩니다)"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>
          <div>
            <label className="cv-field-label">직책 / 직무</label>
            <input
              className="cv-input"
              placeholder="예: 대리, 매니저, 헤어 디자이너, 네일 아티스트"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <div style={{ flex: 1 }}>
              <label className="cv-field-label">입사일 <span style={{ color: "#e74c3c" }}>*</span></label>
              <input
                className="cv-input"
                type="month"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="cv-field-label">퇴사일</label>
              <input
                className="cv-input"
                type="month"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isCurrent}
                style={{ background: isCurrent ? "#f5f5f5" : "#fff" }}
              />
            </div>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "#333", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={isCurrent}
              onChange={(e) => {
                setIsCurrent(e.target.checked);
                if (e.target.checked) setEndDate("");
              }}
              style={{ accentColor: "#5f0080", width: "16px", height: "16px" }}
            />
            <span>현재 재직 중</span>
          </label>
          <button
            className="cv-btn-primary"
            onClick={handleSave}
            style={{ marginTop: "8px" }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}