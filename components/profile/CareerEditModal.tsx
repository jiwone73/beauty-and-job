"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useProfileStore, type CareerEntry } from "@/lib/store/profileStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editTarget?: CareerEntry | null;
}

// "2024.05" → "2024-05" (month input용)
function toInputMonth(d: string): string {
  if (!d || d === "재직 중") return "";
  const m = d.match(/(\d{4})[.\-/](\d{1,2})/);
  if (!m) return "";
  return `${m[1]}-${m[2].padStart(2, "0")}`;
}

export default function CareerEditModal({ isOpen, onClose, editTarget }: Props) {
  const { addCareer, updateCareer } = useProfileStore();
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState("");

  const isEdit = !!editTarget;

  // 수정 모드: 모달 열릴 때 기존 값 채우기 / 추가 모드: 비우기
  useEffect(() => {
    if (!isOpen) return;
    if (editTarget) {
      setCompany(editTarget.company || "");
      setDepartment(editTarget.department || "");
      setPosition(editTarget.position || "");
      setStartDate(toInputMonth(editTarget.startDate));
      setIsCurrent(editTarget.endDate === "재직 중");
      setEndDate(editTarget.endDate === "재직 중" ? "" : toInputMonth(editTarget.endDate));
      setDescription(editTarget.description || "");
    } else {
      setCompany(""); setDepartment(""); setPosition("");
      setStartDate(""); setEndDate(""); setIsCurrent(false); setDescription("");
    }
  }, [isOpen, editTarget]);

  if (!isOpen) return null;

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
      id: editTarget?.id || `career-${Date.now()}`,
      company: company.trim(),
      department: department.trim(),
      position: position.trim(),
      startDate: formatDate(startDate),
      endDate: isCurrent ? "재직 중" : formatDate(endDate),
      isVerified: editTarget?.isVerified || false,
      description: description.trim(),
    };

    if (isEdit) updateCareer(entry.id, entry);
    else addCareer(entry);
    onClose();
  };

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <div style={{ width: 36 }} />
          <h2 className="cv-title">{isEdit ? "경력 수정" : "경력 추가"}</h2>
          <button className="cv-close" onClick={onClose}><X size={20} /></button>
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
          <div>
            <label className="cv-field-label">주요 업무 및 성과</label>
            <textarea
              className="cv-input"
              placeholder="담당했던 업무와 성과를 자유롭게 작성해주세요."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              style={{ resize: "vertical", lineHeight: 1.5, fontFamily: "inherit" }}
            />
          </div>
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