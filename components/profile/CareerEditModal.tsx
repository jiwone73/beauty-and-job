"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { useProfileStore, type CareerEntry } from "@/lib/store/profileStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editTarget?: CareerEntry | null;
  resumeType?: "office" | "salon";
  /** 참이면 덮개 없이 칸 안에서 그대로 펼친다. */
  inline?: boolean;
}
// "2024.05" → ["2024", "05"] / "재직 중"·빈값 → ["", ""]
function splitYM(d: string): [string, string] {
  if (!d || d === "재직 중") return ["", ""];
  const m = d.match(/(\d{4})[.\-/](\d{1,2})/);
  if (!m) return ["", ""];
  return [m[1], m[2].padStart(2, "0")];
}

export default function CareerEditModal({ isOpen, onClose, editTarget, resumeType = "office", inline }: Props) {
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
  // 살롱 직급은 어차피 정해져 있다. 적게 하는 대신 고르게 하면 빠르고,
  // 표기가 통일돼 나중에 공고와 맞춰 보기도 쉽다.
  const 살롱직급 = ["인턴", "스탭", "디자이너", "아티스트", "실장", "원장"];

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

  // 칸 안에서 그대로 펼칠 때 쓰는 몸통. 경력은 바닥에 저장 단추가 따로 있어
  // 몸통에 함께 넣는다.
  const 몸통 = (
    <>
      <div
        className={inline ? "cv-body cv-body-inline" : "cv-body"}
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
          <label className="cv-field-label">{isSalon ? "직급" : "직책 / 직무"}</label>
          {isSalon ? (
            <div className="career-rank">
              {살롱직급.map((r) => (
                <button key={r} type="button"
                  className={`career-rank-chip ${position === r ? "on" : ""}`}
                  onClick={() => setPosition(position === r ? "" : r)}>{r}</button>
              ))}
            </div>
          ) : (
            <input
              className="cv-input"
              placeholder="예: 대리, 매니저, 팀장"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
            />
          )}
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
                style={{ accentColor: "#582681", width: "16px", height: "16px" }}
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

        {/* 주요 업무·성과는 본사에만 묻는다. 살롱에서 성과를 글로 적는 사람은
            드물고, 큰 빈 칸은 채우지 못했다는 느낌만 남긴다. 매장에서 그 몫은
            시술 스킬과 포트폴리오 사진이 한다. */}
        <div style={{ display: isSalon ? "none" : "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
          <label className="cv-field-label">주요 업무 및 성과</label>
          <textarea
            className="cv-input"
            placeholder="담당했던 업무와 성과를 자유롭게 작성해주세요."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ resize: "vertical", lineHeight: 1.5, fontFamily: "inherit", flex: 1, minHeight: "160px" }}
          />
        </div>
      </div>
      <div className="cv-footer">
        <button className="cv-btn-primary" onClick={handleSave}>
          저장
        </button>
      </div>
    </>
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
      <div
        className="cv-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cv-header" style={{ flexShrink: 0 }}>
          <div style={{ width: 36 }} />
          <h2 className="cv-title">{isEdit ? "경력 수정" : "경력 추가"}</h2>
          <button className="cv-close" onClick={onClose}><X size={20} /></button>
        </div>
        {몸통}
      </div>
    </div>
  );
}