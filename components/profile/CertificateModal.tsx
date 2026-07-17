"use client";
import { useState, useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { useProfileStore, genId, type CertificateEntry } from "@/lib/store/profileStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  editTarget?: CertificateEntry | null;
}

export default function CertificateModal({ isOpen, onClose, editTarget }: Props) {
  const { addCertificate, updateCertificate } = useProfileStore();
  const [name, setName] = useState("");
  const [issuer, setIssuer] = useState("");
  const [issuedYm, setIssuedYm] = useState("");

  const isEdit = !!editTarget;

  useEffect(() => {
    if (editTarget) {
      setName(editTarget.name || "");
      setIssuer(editTarget.issuer || "");
      setIssuedYm(editTarget.issued_ym || "");
    } else {
      setName("");
      setIssuer("");
      setIssuedYm("");
    }
  }, [editTarget, isOpen]);

  if (!isOpen) return null;
  const isValid = !!name.trim() && !!issuedYm;

  const handleSubmit = () => {
    if (!isValid) return;
    if (isEdit) {
      updateCertificate(editTarget!.id, {
        id: editTarget!.id,
        name: name.trim(),
        issuer: issuer.trim(),
        issued_ym: issuedYm,
      });
    } else {
      addCertificate({
        id: genId(),
        name: name.trim(),
        issuer: issuer.trim(),
        issued_ym: issuedYm,
      });
    }
    setName("");
    setIssuer("");
    setIssuedYm("");
    onClose();
  };

  return (
    <div className="cv-overlay">
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <button className="cv-back" onClick={onClose}>
            <ChevronLeft size={20} />
          </button>
          <h2 className="cv-title">{isEdit ? "자격증 수정" : "자격증"}</h2>
          <div style={{ width: 36 }} />
        </div>
        <div className="cv-body">
          <label className="cv-field-label cv-required">자격증명</label>
          <input
            className="cv-input"
            placeholder="예) 미용사(일반), TOEIC 등"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
          />
          <label className="cv-field-label">발급기관</label>
          <input
            className="cv-input"
            placeholder="예) 한국산업인력공단"
            value={issuer}
            onChange={(e) => setIssuer(e.target.value)}
            maxLength={50}
          />
          <label className="cv-field-label cv-required">취득 년월</label>
          <input
            className="cv-input"
            type="month"
            value={issuedYm}
            onChange={(e) => setIssuedYm(e.target.value)}
            max={new Date().toISOString().slice(0, 7)}
          />
          <button
            className={`cv-btn-primary ${isValid ? "" : "disabled"}`}
            disabled={!isValid}
            onClick={handleSubmit}
          >
            {isEdit ? "수정" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}