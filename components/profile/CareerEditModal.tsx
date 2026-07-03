"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { useProfileStore, type CareerEntry } from "@/lib/store/profileStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editTarget?: CareerEntry | null;
  resumeType?: "office" | "salon";
}
// "2024.05" → ["2024", "05"] / "재직 중"·빈값 → ["", ""]
function splitYM(d: string): [string, string] {
  if (!d || d === "재직 중") return ["", ""];
  const m = d.match(/(\d{4})[.\-/](\d{1,2})/);
  if (!m) return ["", ""];
  return [m[1], m[2].padStart(2, "0")];
}

export default function CareerEditModal({ isOpen, onClose, editTarget, resumeType = "office" }: Props) {
  const { addCareer, updateCareer } = useProfileStore();
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [startY, setStartY] = useState("");
  const [startM, setStartM] = useState("");
  const [endY, setEndY] = useState("");
  const [endM, setEndM] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [description, setDescription] = useState("");
  const isEdit = !!editTarget;

  // 매장직(salon)이면 "매장명", 사무직(office)이면 "회사명"
  const isSalon = resumeType === "salon";
  const companyLabel = isSalon ? "매장명" : "회사명";

  // 수정 모드: 모달 열릴 때 기존 값 채우기 / 추가 모드: 비우기
  useEffect(() => {
    if (!isOpen) return;
    if (editTarget) {
      setCompany(editTarget.company || "");
      setDepartment(editTarget.department || "");
      setPosition(editTarget.position || "");
      const [sy, sm] = splitYM(editTarget.startDate);
      const [ey, em] = splitYM(editTarget.endDate);
      setStartY(sy); setStartM(sm);
      setEndY(ey); setEndM(em);
      setIsCurrent(editTarget.endDate === "재직 중");
      setDescription(editTarget.description || "");
    } else {
      setCompany(""); setDepartment(""); setPosition("");
      setStartY(""); setStartM(""); setEndY(""); setEndM("");
      setIsCurrent(false); setDescription("");
    }
  }, [isOpen, editTarget]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!company.trim()) {
      alert(`${companyLabel}을 입력해주세요.`);
      return;
    }
    if (!startY || !startM) {
      alert("근무 시작 연·월을 입력해주세요.");
      return;
    }
    if (!isCurrent && (!endY || !endM)) {
      alert("근무 종료 연·월을 입력하거나 '현재 재직 중'을 체크해주세요.");
      return;
    }

    const entry: CareerEntry = {
      id: editTarget?.id || `career-${Date.now()}`,
      company: company.trim(),
      department: department.trim(),
      position: position.trim(),
      startDate: `${startY}.${startM.padStart(2, "0")}`,
      endDate: isCurrent ? "재직 중" : `${endY}.${endM.padStart(2, "0")}`,
      isVerified: editTarget?.isVerified || false,
      description: description.trim(),
    };

    if (isEdit) updateCareer(entry.id, entry);
    else addCareer(entry);
    onClose();
  };

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div
        className="cv-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cv-header" style={{ flexShrink: 0 }}>
          <div style={{ width: 36 }} />
          <h2 className="cv-title">{isEdit ? "경력 수정" : "경력 추가"}</h2>
          <button className="cv-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div
          className="cv-body"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            flex: 1,
            minHeight: 0,
          }}
        >
          <div>
            <label className="cv-field-label">{companyLabel} <span style={{ color: "#e74c3c" }}>*</span></label>
            <input
              className="cv-input"
              placeholder={isSalon ? "예: 준오헤어 강남점, 아우라네일" : "예: 올리브영, 아모레퍼시픽"}
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>
          {resumeType === "office" && (
            <div>
              <label className="cv-field-label">부서 / 팀</label>
              <input
                className="cv-input"
                placeholder="예: 마케팅팀, MD팀"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="cv-field-label">직책 / 직무</label>
            <input
              className="cv-input"
              placeholder={resumeType === "office" ? "예: 대리, 매니저, 팀장" : "예: 헤어 디자이너, 네일 아티스트"}
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          </div>

          {/* 근무기간: 제목 + 현재재직중(우측정렬) 같은 행 / 학력 재학기간과 동일 레이아웃 */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <label className="cv-field-label" style={{ margin: 0 }}>
                근무기간 <span style={{ color: "#e74c3c" }}>*</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "#333", cursor: "pointer", margin: 0 }}>
                <input
                  type="checkbox"
                  checked={isCurrent}
                  onChange={(e) => {
                    setIsCurrent(e.target.checked);
                    if (e.target.checked) { setEndY(""); setEndM(""); }
                  }}
                  style={{ accentColor: "#5f0080", width: "16px", height: "16px" }}
                />
                <span>현재 재직 중</span>
              </label>
            </div>
            <div className="cv-date-row" style={{ marginBottom: 0 }}>
              <input
                className="cv-input cv-date-input"
                placeholder="YYYY"
                maxLength={4}
                value={startY}
                onChange={(e) => setStartY(e.target.value.replace(/\D/g, ""))}
              />
              <input
                className="cv-input cv-date-input"
                placeholder="MM"
                maxLength={2}
                value={startM}
                onChange={(e) => setStartM(e.target.value.replace(/\D/g, ""))}
              />
              <span className="cv-date-sep">-</span>
              <input
                className="cv-input cv-date-input"
                placeholder="YYYY"
                maxLength={4}
                value={endY}
                onChange={(e) => setEndY(e.target.value.replace(/\D/g, ""))}
                disabled={isCurrent}
                style={{ background: isCurrent ? "#f5f5f5" : "#fff" }}
              />
              <input
                className="cv-input cv-date-input"
                placeholder="MM"
                maxLength={2}
                value={endM}
                onChange={(e) => setEndM(e.target.value.replace(/\D/g, ""))}
                disabled={isCurrent}
                style={{ background: isCurrent ? "#f5f5f5" : "#fff" }}
              />
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
            <label className="cv-field-label">주요 업무 및 성과</label>
            <textarea
              className="cv-input"
              placeholder="담당했던 업무와 성과를 자유롭게 작성해주세요."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: "vertical", lineHeight: 1.5, fontFamily: "inherit", flex: 1, minHeight: "160px" }}
            />
          </div>
          <button
            className="cv-btn-primary"
            onClick={handleSave}
            style={{ marginTop: "4px", flexShrink: 0 }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}