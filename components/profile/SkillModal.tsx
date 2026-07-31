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

// ── 매장직(현장) 미용·뷰티 스킬: 시술 분야별 + 매장운영 공통 ──
const STORE_RECOMMENDATIONS: Record<string, string[]> = {
  "헤어": [
    "헤어 커트", "남성 커트", "헤어 펌", "열펌", "디지털 펌", "볼륨매직", "매직 스트레이트", "셋팅펌", "다운펌", "앞머리 펌",
    "헤어 컬러", "염색", "탈색", "옴브레·발레아쥬", "뿌리 염색", "새치 염색",
    "헤어 드라이", "스타일링", "업스타일", "웨딩 헤어", "고데기 연출",
    "클리닉·트리트먼트", "두피 관리", "두피 스케일링", "탈모 관리", "헤어 증모", "가발 관리", "샴푸·블로우",
  ],
  "네일": [
    "네일아트", "젤네일", "젤 제거", "매니큐어", "페디큐어", "네일 케어", "큐티클 관리", "파라핀 케어",
    "프렌치", "그라데이션", "패턴 아트", "손·발 각질 관리", "네일 연장", "팁·폼 연장", "이달의 아트",
  ],
  "피부관리·에스테틱": [
    "피부 관리", "스킨케어", "딥클렌징", "여드름 관리", "필링", "아쿠아필링", "모공 관리", "미백 관리",
    "리프팅 관리", "탄력 관리", "안티에이징 관리", "팩·마스크 관리", "고주파 관리", "저주파 관리",
    "등 관리", "스톤 테라피", "눈가 관리", "홈케어 상담",
  ],
  "메이크업·아티스트": [
    "메이크업", "데일리 메이크업", "웨딩 메이크업", "파티 메이크업", "남성 메이크업", "특수 분장", "무대 분장",
    "눈썹 정리", "반영구 화장", "눈썹 반영구", "아이라인 반영구", "입술 반영구", "헤어라인 반영구",
    "속눈썹 연장", "속눈썹 펌", "래쉬 리프트",
  ],
  "스파": [
    "바디 관리", "아로마 테라피", "경락", "림프 관리", "슬리밍 관리", "스포츠 마사지", "타이 마사지",
    "스파 트리트먼트", "발 관리", "풋 케어", "태닝", "스프레이 태닝",
    "왁싱", "브라질리언 왁싱", "슈가링", "제모 관리",
  ],
  "매장운영": [
    "고객 응대", "고객 상담", "고객 관리", "예약 관리", "노쇼 관리", "CS 응대", "클레임 응대",
    "포스기 사용", "결제 관리", "카드 결제", "상품 진열", "화장품 판매", "제품 추천", "업셀링",
    "재고 관리", "발주 관리", "물품 관리", "비품 관리", "위생 관리", "매장 청결 관리",
    "매출 관리", "일일 정산", "스케줄 관리", "직원 관리", "회원권 관리", "멤버십 관리", "매장 SNS 운영",
  ],
};

// ── 사무직(본사) 뷰티 스킬: 직군별 (기존 SKILL_RECOMMENDATIONS 보강) ──
const OFFICE_EXTRA_SKILLS: string[] = [
  "화장품 상품기획", "뷰티 MD", "온라인 MD", "카테고리 관리", "시즌 기획", "가격 전략",
  "라이브커머스", "인플루언서 마케팅", "CRM 마케팅", "이메일 마케팅", "상세페이지 기획", "상세페이지 디자인",
  "자사몰 운영", "오픈마켓 운영", "쿠팡 운영", "네이버 스마트스토어 운영", "쇼핑몰 CS",
  "백화점 영업", "면세 영업", "H&B(올리브영) 영업", "벤더 관리", "실적 관리",
  "수출입 업무", "무역 서류", "통관", "바이어 관리", "해외 인증",
  "화장품 처방 개발", "제형 연구", "관능 평가", "향료 개발", "품질 관리(QC)", "품질 보증(QA)", "GMP", "ISO 인증",
  "패키지 디자인", "화장품 디자인", "VMD", "디스플레이 기획",
  "뷰티 교육", "제품 교육", "세일즈 교육", "매뉴얼 제작",
  "인사·HR", "채용", "급여", "총무", "회계", "재무", "세무", "사무 행정", "ERP",
  "PowerPoint", "Word", "Excel", "Notion", "Photoshop", "Illustrator",
];

// 전체 스킬 사전 = 사무직 추천 + 매장직 전체 + 사무 보강 (중복 제거)
const ALL_SKILLS: string[] = Array.from(
  new Set([
    ...Object.values(SKILL_RECOMMENDATIONS).flat(),
    ...Object.values(STORE_RECOMMENDATIONS).flat(),
    ...OFFICE_EXTRA_SKILLS,
  ])
);

// 분야 키워드 → 관련 스킬 (예: "미용"처럼 스킬명에 없는 단어로도 검색되게)
const KEYWORD_GROUPS: Record<string, string[]> = {
  "미용": [
    ...STORE_RECOMMENDATIONS["헤어"], ...STORE_RECOMMENDATIONS["네일"],
    ...STORE_RECOMMENDATIONS["피부관리·에스테틱"], ...STORE_RECOMMENDATIONS["메이크업·아티스트"],
    ...STORE_RECOMMENDATIONS["스파"],
  ],
  "뷰티": [
    ...STORE_RECOMMENDATIONS["헤어"], ...STORE_RECOMMENDATIONS["네일"],
    ...STORE_RECOMMENDATIONS["피부관리·에스테틱"], ...STORE_RECOMMENDATIONS["메이크업·아티스트"],
  ],
  "헤어": STORE_RECOMMENDATIONS["헤어"],
  "네일": STORE_RECOMMENDATIONS["네일"],
  "피부": STORE_RECOMMENDATIONS["피부관리·에스테틱"],
  "에스테틱": STORE_RECOMMENDATIONS["피부관리·에스테틱"],
  "메이크업": STORE_RECOMMENDATIONS["메이크업·아티스트"],
  "반영구": ["반영구 화장", "눈썹 반영구", "아이라인 반영구", "입술 반영구", "헤어라인 반영구"],
  "속눈썹": ["속눈썹 연장", "속눈썹 펌", "래쉬 리프트"],
  "왁싱": ["왁싱", "브라질리언 왁싱", "슈가링", "제모 관리"],
  "스파": STORE_RECOMMENDATIONS["스파"],
  "마사지": ["바디 관리", "경락", "림프 관리", "스포츠 마사지", "타이 마사지", "슬리밍 관리"],
  "매장": STORE_RECOMMENDATIONS["매장운영"],
  "판매": ["화장품 판매", "상품 진열", "제품 추천", "업셀링", "고객 응대", "결제 관리"],
  "고객": ["고객 응대", "고객 상담", "고객 관리", "CS 응대", "예약 관리", "클레임 응대"],
  "마케팅": ["브랜드 전략", "퍼포먼스 마케팅", "콘텐츠 기획", "SNS 운영", "인플루언서 마케팅", "라이브커머스", "CRM 마케팅", "프로모션 기획"],
  "영업": ["거래처 관리", "영업 전략", "제안서 작성", "계약 협상", "백화점 영업", "면세 영업", "H&B(올리브영) 영업", "CRM"],
  "md": ["트렌드 분석", "시장 조사", "상품 소싱", "화장품 상품기획", "뷰티 MD", "온라인 MD", "카테고리 관리", "프로모션 기획"],
  "연구": ["화장품 처방 개발", "제형 연구", "원료 분석", "안정성 평가", "효능 평가", "관능 평가", "품질 관리(QC)", "GMP"],
  "디자인": ["패키지 디자인", "화장품 디자인", "그래픽 디자인", "상세페이지 디자인", "VMD", "Photoshop", "Illustrator", "Figma"],
  "온라인": ["자사몰 운영", "오픈마켓 운영", "쿠팡 운영", "네이버 스마트스토어 운영", "상세페이지 기획", "라이브커머스", "쇼핑몰 CS"],
};

export default function SkillModal({ isOpen, onClose }: Props) {
  const { skills, addSkill, removeSkill } = useProfileStore();
  const { officeJobAreas, skillAreas } = useSignupStore();
  const [input, setInput] = useState("");
  if (!isOpen) return null;

  // 트랙별 추천: 매장직(시술 분야)이면 매장 스킬, 사무직이면 직군 스킬
  const isStoreTrack = Array.isArray(skillAreas) && skillAreas.length > 0;
  const recommended = (() => {
    const merged = new Set<string>();
    if (isStoreTrack) {
      skillAreas.forEach((area) => (STORE_RECOMMENDATIONS[area] || []).forEach((s) => merged.add(s)));
      STORE_RECOMMENDATIONS["매장운영"].forEach((s) => merged.add(s));
    } else if (officeJobAreas && officeJobAreas.length > 0) {
      officeJobAreas.forEach((area) => (SKILL_RECOMMENDATIONS[area] || []).forEach((s) => merged.add(s)));
    }
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
