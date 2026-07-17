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
  "브랜드 마케팅": ["브랜드 전략", "IMC 캠페인", "제품 런칭", "타깃 분석", "BM 경험", "프레젠테이션", "Notion"],
  "디지털·퍼포먼스 마케팅": ["GA4", "Meta Ads", "Google Ads", "퍼포먼스 마케팅", "퍼널 분석", "SEO/SEM", "데이터 분석", "디지털 커머스"],
  "콘텐츠·PR·SNS": ["콘텐츠 기획", "SNS 운영", "인플루언서 협업", "PR/홍보", "보도자료 작성", "포토/영상 기획", "Notion"],
  "MD·상품기획": ["트렌드 분석", "시장 조사", "상품 소싱", "원료 검토", "OEM/ODM 관리", "임상시험 관리", "매출 분석", "프로모션 기획"],
  "영업·채널영업": ["거래처 관리", "매출 분석", "영업 전략", "제안서 작성", "고객 미팅", "계약 협상", "채널 관리", "CRM"],
  "글로벌 사업": ["영어 비즈니스", "중국어 비즈니스", "일본어 비즈니스", "해외 거래처 관리", "수출입 업무", "글로벌 마케팅"],
  "R&D·연구개발": ["기초 화장품 연구", "색조 화장품 연구", "원료 분석", "안정성 평가", "효능 평가", "포장 연구", "GLP/GMP"],
  "디자인·VMD": ["UI/UX 디자인", "패키지 디자인", "그래픽 디자인", "Figma", "Photoshop", "Illustrator", "VMD 기획", "3D 디자인"],
  "생산·품질": ["생산관리", "QA/QC", "공정 관리", "GMP", "ISO 인증", "설비 운영"],
  "구매·SCM·물류": ["발주 관리", "재고 회전율 분석", "WMS 사용 경험", "입출고 관리", "풀필먼트 운영", "납기일 조정", "구매 협상", "물류비 분석"],
  "경영지원": ["인사 관리", "재무 분석", "회계", "법무", "HR 정책", "조직문화", "노무"],
  "데이터·IT": ["SQL", "Python", "데이터 분석", "Tableau", "GA4", "Git", "AWS"],
  "default": ["커뮤니케이션", "프레젠테이션", "문서 작성", "프로젝트 관리", "Excel", "Notion"],
};

export default function SkillModal({ isOpen, onClose }: Props) {
  const { skills, addSkill, removeSkill } = useProfileStore();
  const { officeJobAreas } = useSignupStore();
  const [input, setInput] = useState("");
  if (!isOpen) return null;

  // 선택한 직군 영역들의 추천 스킬 합집합 (중복 제거)
  const recommended = (() => {
    if (!officeJobAreas || officeJobAreas.length === 0) {
      return SKILL_RECOMMENDATIONS["default"];
    }
    const merged = new Set<string>();
    officeJobAreas.forEach((area) => {
      const list = SKILL_RECOMMENDATIONS[area] || [];
      list.forEach((s) => merged.add(s));
    });
    // 빈 결과면 default 사용
    return merged.size > 0 ? Array.from(merged) : SKILL_RECOMMENDATIONS["default"];
  })();

  const handleAdd = () => {
    const v = input.trim();
    if (!v) return;
    addSkill(v);
    setInput("");
  };

  return (
    <div className="cv-overlay">
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
