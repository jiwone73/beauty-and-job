"use client";

import { useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { useProfileStore } from "@/lib/store/profileStore";
import { useSignupStore } from "@/lib/store/signupStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const SKILL_RECOMMENDATIONS: Record<string, string[]> = {
  "마케팅": ["퍼포먼스 마케팅", "브랜드 마케팅", "콘텐츠 기획", "SEO/SEM", "SNS 운영", "인플루언서 협업", "광고 캠페인 기획", "데이터 분석"],
  "상품기획·개발": ["시장 조사", "트렌드 분석", "원료 검토", "제품 컨셉 기획", "OEM/ODM 관리", "패키지 디자인", "임상시험 관리"],
  "영업": ["거래처 관리", "매출 분석", "영업 전략", "제안서 작성", "고객 미팅", "계약 협상", "채널 관리"],
  "MD": ["상품 소싱", "가격 전략", "재고 관리", "매출 분석", "프로모션 기획", "VMD"],
  "SCM·물류": ["발주 관리", "재고 회전율 분석", "WMS 사용 경험", "입출고 관리", "풀필먼트 운영", "납기일 조정", "창고/택배사 커뮤니케이션", "물류비 분석", "물류 이슈 해결"],
  "디자인": ["UI/UX 디자인", "패키지 디자인", "그래픽 디자인", "3D 디자인", "Figma", "Adobe Creative Suite"],
  "default": ["기획력", "데이터 분석", "프로젝트 관리", "커뮤니케이션", "문서 작성", "프레젠테이션"],
};

export default function SkillModal({ isOpen, onClose }: Props) {
  const { skills, addSkill, removeSkill } = useProfileStore();
  const { job } = useSignupStore();
  const [input, setInput] = useState("");

  if (!isOpen) return null;

  const recommended = SKILL_RECOMMENDATIONS[job] || SKILL_RECOMMENDATIONS["default"];

  const handleAdd = () => {
    const v = input.trim();
    if (!v) return;
    addSkill(v);
    setInput("");
  };

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <button className="cv-back" onClick={onClose}><ChevronLeft size={20} /></button>
          <h2 className="cv-title">스킬</h2>
          <div style={{ width: 36 }} />
        </div>
        <div className="cv-body">
          <p className="cv-desc">내 직무 기반 스킬을 마음껏 추가해 보세요.</p>

          <div className="cv-skill-input-row">
            <input
              className="cv-input"
              placeholder="보유 스킬을 추가해 주세요."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button className="cv-skill-add-btn" onClick={handleAdd}>추가하기</button>
          </div>

          {skills.length > 0 && (
            <div className="cv-skill-chips">
              {skills.map((skill) => (
                <span key={skill} className="cv-skill-chip active">
                  {skill}
                  <button onClick={() => removeSkill(skill)}><X size={12} /></button>
                </span>
              ))}
            </div>
          )}

          <div className="cv-recommend-section">
            <h4 className="cv-recommend-title">추천 스킬</h4>
            <p className="cv-recommend-desc">직무에 맞게 추천된 스킬을 간편하게 추가해 보세요.</p>
            <div className="cv-skill-chips">
              {recommended.filter((r) => !skills.includes(r)).map((skill) => (
                <button key={skill} className="cv-skill-chip" onClick={() => addSkill(skill)}>
                  {skill}
                </button>
              ))}
            </div>
          </div>

          <button className="cv-btn-primary" onClick={onClose}>완료</button>
        </div>
      </div>
    </div>
  );
}
