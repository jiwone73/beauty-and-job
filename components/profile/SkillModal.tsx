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

// 매장·뷰티 현장 스킬 (검색 자동완성용)
const BEAUTY_STORE_SKILLS: string[] = [
  "고객 응대", "고객 상담", "고객 관리", "매장 관리", "매출 관리", "재고 관리", "물품 관리", "비품 관리",
  "스케줄 관리", "포스기 사용", "상품 진열", "화장품 판매", "제품 추천", "결제 관리", "예약 관리", "CS 응대",
  "헤어 커트", "헤어 펌", "헤어 컬러", "헤어 시술", "드라이", "두피 관리", "두피 케어",
  "메이크업", "웨딩 메이크업", "속눈썹 연장", "속눈썹 펌", "눈썹 정리",
  "네일아트", "네일 케어", "젤네일", "페디큐어",
  "피부 관리", "스킨케어", "왁싱 시술", "왁싱", "체형 관리", "바디 관리", "마사지", "아로마 테라피",
  "반영구 화장", "태닝", "발 관리",
];

// 전체 스킬 사전 = 직군 추천 스킬 + 매장·뷰티 스킬 (중복 제거)
const ALL_SKILLS: string[] = Array.from(
  new Set([...Object.values(SKILL_RECOMMENDATIONS).flat(), ...BEAUTY_STORE_SKILLS])
);

// 분야 키워드 → 관련 스킬 (예: "미용"처럼 스킬명에 없는 단어로도 검색되게)
const KEYWORD_GROUPS: Record<string, string[]> = {
  "미용": ["헤어 시술", "메이크업", "네일아트", "피부 관리", "스킨케어", "왁싱 시술", "속눈썹 연장", "두피 관리", "반영구 화장"],
  "헤어": ["헤어 커트", "헤어 펌", "헤어 컬러", "헤어 시술", "드라이", "두피 관리", "두피 케어"],
  "네일": ["네일아트", "네일 케어", "젤네일", "페디큐어"],
  "피부": ["피부 관리", "스킨케어", "왁싱 시술", "체형 관리", "바디 관리"],
  "메이크업": ["메이크업", "웨딩 메이크업", "눈썹 정리", "반영구 화장"],
  "매장": ["매장 관리", "고객 응대", "포스기 사용", "상품 진열", "재고 관리", "매출 관리", "비품 관리"],
  "판매": ["화장품 판매", "상품 진열", "제품 추천", "고객 응대", "결제 관리"],
  "고객": ["고객 응대", "고객 상담", "고객 관리", "CS 응대", "예약 관리"],
  "마케팅": ["브랜드 전략", "퍼포먼스 마케팅", "콘텐츠 기획", "SNS 운영", "데이터 분석", "프로모션 기획"],
  "영업": ["거래처 관리", "영업 전략", "제안서 작성", "고객 미팅", "계약 협상", "CRM"],
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

  const handleAdd = (value?: string) => {
    const v = (value ?? input).trim();
    if (!v) return;
    addSkill(v);
    setInput("");
  };

  // 입력한 단어와 관련된 스킬 자동완성 (사전 글자검색 + 분야 키워드 매핑)
  const query = input.trim().toLowerCase();
  const matches = (() => {
    if (!query) return [];
    const hit = new Set<string>();
    // 1) 스킬명에 글자가 포함되는 것
    ALL_SKILLS.forEach((s) => { if (s.toLowerCase().includes(query)) hit.add(s); });
    // 2) 분야 키워드가 서로 포함되면 그 그룹 스킬 추가 (예: "미용" → 뷰티 스킬)
    Object.entries(KEYWORD_GROUPS).forEach(([kw, list]) => {
      if (kw.includes(query) || query.includes(kw)) list.forEach((s) => hit.add(s));
    });
    return Array.from(hit).filter((s) => !skills.includes(s)).slice(0, 20);
  })();

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
            <button className="cv-skill-add-btn" onClick={() => handleAdd()}>추가하기</button>
          </div>

          {query && (
            <div className="cv-recommend-section">
              <h4 className="cv-recommend-title">검색 결과</h4>
              {matches.length > 0 ? (
                <div className="cv-skill-chips">
                  {matches.map((skill) => (
                    <button key={skill} className="cv-skill-chip" onClick={() => handleAdd(skill)}>
                      {skill}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="cv-recommend-desc">일치하는 추천 스킬이 없어요. ‘추가하기’로 직접 등록할 수 있어요.</p>
              )}
            </div>
          )}

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

          {!query && (
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
          )}

          <button className="cv-btn-primary" onClick={onClose}>완료</button>
        </div>
      </div>
    </div>
  );
}
