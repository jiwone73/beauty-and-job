"use client";

import { useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { useProfileStore } from "@/lib/store/profileStore";
import { useSignupStore } from "@/lib/store/signupStore";
import { useAuthStore } from "@/lib/store/authStore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** 참이면 덮개 없이 칸 안에서 그대로 펼친다. */
  inline?: boolean;
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
    // 커트
    "헤어 커트", "여성 커트", "남성 커트", "아동 커트", "레이어드 커트", "단발 커트", "투블럭", "스포츠 커트",
    // 펌
    "헤어 펌", "열펌", "디지털 펌", "세팅 펌", "볼륨 매직", "매직 스트레이트", "아이롱 펌", "콜드 펌",
    "다운 펌", "앞머리 펌", "뿌리 볼륨 펌", "히피 펌", "빌드 펌", "남성 펌", "C컬 펌", "S컬 펌",
    // 컬러
    "헤어 컬러", "염색", "뿌리 염색", "새치 염색", "새치 커버", "탈색", "옴브레", "발레아쥬",
    "그라데이션 염색", "브릿지", "톤업·톤다운", "컬러 매치", "컬러 진단",
    // 스타일링
    "헤어 드라이", "블로우 드라이", "스타일링", "업스타일", "웨딩 헤어", "신부 헤어", "한복 헤어",
    "고데기 연출", "아이롱 스타일링", "헤어 세팅",
    // 케어
    "클리닉", "트리트먼트", "앰플 케어", "두피 관리", "두피 스케일링", "두피 케어", "탈모 관리",
    "헤어 증모", "붙임머리", "가발 관리", "샴푸", "블로우", "헤어 컨설팅", "두상 진단", "홈케어 상담",
  ],
  "네일": [
    "네일아트", "젤네일", "젤 제거", "매니큐어", "페디큐어", "네일 케어", "습식 케어", "큐티클 관리", "파라핀 케어",
    "프렌치", "그라데이션", "마블", "스톤·파츠 아트", "패턴 아트", "캐릭터 아트", "시럽네일", "자석젤",
    "손 각질 관리", "발 각질 관리", "네일 연장", "팁 연장", "폼 연장", "젤 연장", "아크릴 연장",
    "발톱 교정", "웨딩 네일", "이달의 아트", "네일 상담",
  ],
  "피부관리·에스테틱": [
    "피부 관리", "피부 분석", "스킨케어", "클렌징", "딥클렌징", "각질 제거", "압출", "여드름 관리",
    "필링", "아쿠아필링", "스케일링", "모공 관리", "블랙헤드 관리", "미백 관리", "잡티 관리",
    "리프팅 관리", "탄력 관리", "안티에이징 관리", "주름 관리", "팩 관리", "마스크 관리",
    "고주파 관리", "저주파 관리", "초음파 관리", "LED 관리", "갈바닉 관리",
    "등 관리", "눈가 관리", "목·데콜테 관리", "산전·산후 관리", "홈케어 상담",
  ],
  "메이크업·아티스트": [
    "메이크업", "데일리 메이크업", "웨딩 메이크업", "신부 메이크업", "파티 메이크업", "남성 메이크업",
    "촬영 메이크업", "무대 메이크업", "특수 분장", "상처 분장",
    "눈썹 정리", "눈썹 왁싱", "반영구 화장", "눈썹 반영구", "아이라인 반영구", "입술 반영구", "헤어라인 반영구",
    "두피 문신(SMP)", "MTS", "속눈썹 연장", "볼륨 래쉬", "속눈썹 펌", "래쉬 리프트", "인조 속눈썹",
    "뷰티 컨설팅", "이미지 컨설팅",
  ],
  "스파": [
    "바디 관리", "전신 관리", "아로마 테라피", "경락", "경락 마사지", "림프 관리", "슬리밍 관리", "셀룰라이트 관리",
    "스포츠 마사지", "타이 마사지", "아유르베다", "스톤 테라피", "스파 트리트먼트",
    "발 관리", "풋 케어", "발 각질 관리", "태닝", "스프레이 태닝",
    "왁싱", "브라질리언 왁싱", "슈가링", "얼굴 왁싱", "제모 관리",
    "임산부 관리", "산후 관리", "커플 관리",
  ],
  "매장운영": [
    "고객 응대", "고객 상담", "고객 관리", "신규 고객 관리", "단골 관리", "예약 관리", "예약 접수", "노쇼 관리",
    "CS 응대", "클레임 응대", "컴플레인 처리", "전화 응대",
    "포스기 사용", "결제 관리", "카드 결제", "현금영수증 처리",
    "상품 진열", "화장품 판매", "제품 추천", "업셀링", "크로스셀링",
    "재고 관리", "발주 관리", "입고 관리", "물품 관리", "비품 관리", "소모품 관리",
    "위생 관리", "소독·방역", "매장 청결 관리", "세탁물 관리",
    "매출 관리", "일일 정산", "마감 정산", "스케줄 관리", "예약 스케줄링", "직원 관리", "신입 교육",
    "회원권 관리", "멤버십 관리", "쿠폰·이벤트 관리", "매장 SNS 운영", "리뷰 관리", "시술 전후 사진 촬영",
    "디스플레이 연출", "원장 업무", "실장 업무",
  ],
};

// ── 사무직(본사) 뷰티 스킬: 직군별 (기존 SKILL_RECOMMENDATIONS 보강) ──
const OFFICE_EXTRA_SKILLS: string[] = [
  // 기획·전략
  "사업기획", "경영기획", "전략기획", "신사업 기획", "사업개발(BD)", "사업계획서 작성", "시장 분석", "경쟁사 분석",
  "예산 관리", "KPI 관리", "PMO", "프로젝트 관리", "IR", "투자 유치",
  // 상품기획·MD
  "상품기획", "화장품 상품기획", "뷰티 MD", "온라인 MD", "시즌 기획", "카테고리 관리", "상품 소싱", "원료·부자재 소싱",
  "OEM/ODM 관리", "가격 전략", "SKU 관리", "신제품 개발 PM", "트렌드 분석", "시장 조사", "상품 라인업 기획",
  // 마케팅
  "브랜드 마케팅", "브랜드 매니저(BM)", "브랜드 전략", "퍼포먼스 마케팅", "디지털 마케팅", "그로스 마케팅",
  "콘텐츠 마케팅", "콘텐츠 기획", "SNS 운영", "인스타그램 운영", "유튜브 운영", "틱톡 운영",
  "인플루언서 마케팅", "라이브커머스", "CRM 마케팅", "이메일 마케팅", "앱푸시 마케팅", "바이럴 마케팅",
  "광고 운영", "메타 광고", "구글 광고", "네이버 광고", "카카오 광고", "GA4", "GTM", "퍼널 분석", "A/B 테스트",
  "SEO", "SEM", "프로모션 기획", "이벤트 기획", "제휴 마케팅", "미디어 플래닝",
  // PR·홍보
  "PR", "언론 홍보", "보도자료 작성", "미디어 관계 관리", "브랜드 커뮤니케이션", "리스크 커뮤니케이션",
  // 영업
  "영업 관리", "영업 기획", "채널 영업", "B2B 영업", "국내 영업", "백화점 영업", "면세 영업", "H&B(올리브영) 영업",
  "대형마트 영업", "온라인 영업", "홈쇼핑 영업", "벤더 관리", "대리점 관리", "거래처 관리", "제안서 작성",
  "계약 협상", "매출 분석", "실적 관리", "세일즈 오퍼레이션",
  // 글로벌·무역
  "해외 영업", "수출입 업무", "무역 서류", "신용장(L/C)", "통관", "포워딩", "바이어 관리",
  "해외 인증", "CPNP", "중국 위생허가", "FDA 인증", "해외 마케팅", "영어 비즈니스", "중국어 비즈니스", "일본어 비즈니스",
  // R&D·연구
  "화장품 연구", "처방 개발", "기초 화장품 연구", "색조 화장품 연구", "제형 연구", "원료 분석", "원료 개발",
  "향료 개발", "안정성 평가", "효능 평가", "관능 평가", "임상 시험 관리", "인체 적용 시험", "특허 관리",
  // 품질·생산
  "품질 관리(QC)", "품질 보증(QA)", "GMP", "CGMP", "ISO 인증", "공정 관리", "생산 관리", "생산 기획",
  "설비 관리", "자재 관리", "위생 관리", "안전 관리", "미생물 관리",
  // 구매·SCM·물류
  "구매", "자재 구매", "발주 관리", "재고 관리", "수요 예측", "SCM", "물류 관리", "창고 관리(WMS)",
  "입출고 관리", "배송 관리", "3PL 관리", "원가 관리", "납기 관리",
  // 디자인·VMD·영상
  "그래픽 디자인", "편집 디자인", "패키지 디자인", "화장품 디자인", "라벨 디자인", "상세페이지 디자인",
  "웹디자인", "UI/UX 디자인", "브랜드 디자인", "BI/CI", "VMD", "디스플레이 기획", "영상 편집", "모션그래픽",
  "Photoshop", "Illustrator", "InDesign", "Figma", "Premiere", "After Effects",
  // 이커머스·온라인 운영
  "이커머스 운영", "자사몰 운영", "오픈마켓 운영", "쿠팡 운영", "네이버 스마트스토어 운영", "무신사 입점",
  "올리브영 온라인", "상세페이지 기획", "상품 등록", "프로모션 운영", "라이브커머스 운영", "리뷰 관리", "정산 관리", "쇼핑몰 CS",
  // 교육
  "뷰티 교육", "제품 교육", "세일즈 교육", "아카데미 강의", "교육 콘텐츠 개발", "매뉴얼 제작", "온보딩 교육",
  // 경영지원(HR·재무·총무·법무)
  "인사·HR", "채용", "인사기획", "급여", "4대보험", "노무", "인사 평가", "조직문화", "HRD", "교육 운영",
  "총무", "자산 관리", "회계", "재무", "자금 관리", "세무", "결산", "원가 회계", "관리 회계",
  "법무", "계약 검토", "컴플라이언스", "개인정보보호", "사무 행정", "비서", "문서 관리", "ERP 운영",
  // 데이터·IT·기획
  "데이터 분석", "SQL", "Python", "Tableau", "Power BI", "데이터 시각화", "서비스 기획", "PM/PO",
  "기획서 작성", "와이어프레임", "QA 테스트",
  // 공통 오피스 도구
  "Excel", "PowerPoint", "Word", "한글(HWP)", "Notion", "Slack", "Jira", "Google Workspace",
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
  "속눈썹": ["속눈썹 연장", "볼륨 래쉬", "속눈썹 펌", "래쉬 리프트", "인조 속눈썹"],
  "커트": ["헤어 커트", "여성 커트", "남성 커트", "아동 커트", "레이어드 커트", "투블럭"],
  "펌": ["헤어 펌", "열펌", "디지털 펌", "세팅 펌", "볼륨 매직", "매직 스트레이트", "다운 펌", "남성 펌"],
  "염색": ["헤어 컬러", "염색", "뿌리 염색", "새치 염색", "탈색", "옴브레", "발레아쥬", "브릿지"],
  "컬러": ["헤어 컬러", "염색", "탈색", "옴브레", "발레아쥬", "톤업·톤다운", "컬러 매치"],
  "두피": ["두피 관리", "두피 스케일링", "두피 케어", "탈모 관리", "헤어 증모"],
  "문신": ["반영구 화장", "눈썹 반영구", "아이라인 반영구", "입술 반영구", "헤어라인 반영구", "두피 문신(SMP)", "MTS"],
  "태닝": ["태닝", "스프레이 태닝"],
  "발": ["페디큐어", "발 관리", "풋 케어", "발 각질 관리", "발톱 교정"],
  "왁싱": ["왁싱", "브라질리언 왁싱", "슈가링", "얼굴 왁싱", "눈썹 왁싱", "제모 관리"],
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
  "이커머스": ["이커머스 운영", "자사몰 운영", "오픈마켓 운영", "쿠팡 운영", "네이버 스마트스토어 운영", "상품 등록", "정산 관리", "리뷰 관리"],
  "기획": ["사업기획", "경영기획", "전략기획", "신사업 기획", "사업개발(BD)", "상품기획", "프로젝트 관리", "서비스 기획"],
  "상품기획": ["상품기획", "화장품 상품기획", "뷰티 MD", "카테고리 관리", "상품 소싱", "가격 전략", "트렌드 분석"],
  "홍보": ["PR", "언론 홍보", "보도자료 작성", "브랜드 커뮤니케이션", "미디어 관계 관리"],
  "무역": ["수출입 업무", "무역 서류", "신용장(L/C)", "통관", "포워딩", "바이어 관리", "해외 인증"],
  "품질": ["품질 관리(QC)", "품질 보증(QA)", "GMP", "CGMP", "ISO 인증", "미생물 관리", "안정성 평가"],
  "생산": ["생산 관리", "생산 기획", "공정 관리", "설비 관리", "자재 관리", "위생 관리"],
  "구매": ["구매", "자재 구매", "발주 관리", "벤더 관리", "원가 관리", "수요 예측"],
  "물류": ["물류 관리", "SCM", "창고 관리(WMS)", "입출고 관리", "배송 관리", "3PL 관리", "재고 관리"],
  "인사": ["인사·HR", "채용", "인사기획", "급여", "4대보험", "노무", "인사 평가", "HRD", "조직문화"],
  "hr": ["인사·HR", "채용", "인사기획", "급여", "노무", "인사 평가", "HRD", "교육 운영"],
  "재무": ["재무", "자금 관리", "회계", "세무", "결산", "관리 회계", "원가 회계"],
  "회계": ["회계", "재무", "세무", "결산", "원가 회계", "관리 회계"],
  "총무": ["총무", "자산 관리", "사무 행정", "문서 관리", "비서", "ERP 운영"],
  "법무": ["법무", "계약 검토", "컴플라이언스", "개인정보보호"],
  "데이터": ["데이터 분석", "SQL", "Python", "Tableau", "Power BI", "데이터 시각화", "GA4"],
  "교육": ["뷰티 교육", "제품 교육", "세일즈 교육", "아카데미 강의", "교육 콘텐츠 개발", "매뉴얼 제작"],
  "영상": ["영상 편집", "모션그래픽", "Premiere", "After Effects"],
};

export default function SkillModal({ isOpen, onClose, inline}: Props) {
  const { skills, addSkill, removeSkill } = useProfileStore();
  const { officeJobAreas, skillAreas } = useSignupStore();
  const { userJobType } = useAuthStore();
  const [input, setInput] = useState("");
  // 추천을 다 펼치면 칸이 900px 씩 길어져 옆 칸과 키가 안 맞는다.
  const [다펼침, set다펼침] = useState(false);
  if (!isOpen) return null;

  // 구직 트랙(빈 입력창 추천용): authStore 값 우선, 없으면 선택 분야로 추정
  const isStoreTrack = userJobType === "STORE" || (!userJobType && Array.isArray(skillAreas) && skillAreas.length > 0);

  // 시술이 먼저 온다. 살롱 이력서에서 '스킬'은 곧 커트·펌·염색이고,
  // 고객 응대나 재고 관리는 그다음이다. 예전에는 고른 분야가 없으면 곧장
  // 매장운영 마흔 몇 개로 떨어져, 시술 스킬 칸에 포스기·발주가 깔렸다.
  const recommended = (() => {
    const merged = new Set<string>();
    if (isStoreTrack) {
      // 저장된 값은 '헤어 디자이너', '네일리스트' 같은 직군 이름인데 사전 열쇠는
      // '헤어', '네일' 처럼 짧다. 열쇠가 이름 안에 들어 있으면 그 분야로 본다.
      // 그래서 '헤어 디자이너'는 커트·펌·염색을, '샵 매니저·실장'은 어느 열쇠도
      // 걸리지 않아 매장운영을 받는다 — 실장에게는 그쪽이 맞다.
      const 열쇠 = Object.keys(STORE_RECOMMENDATIONS).filter((k) => k !== "매장운영");
      const 걸린 = new Set<string>();
      (skillAreas || []).forEach((이름) =>
        열쇠.forEach((k) => { if (String(이름).includes(k)) 걸린.add(k); }));
      걸린.forEach((k) => STORE_RECOMMENDATIONS[k].forEach((s) => merged.add(s)));
      STORE_RECOMMENDATIONS["매장운영"].forEach((s) => merged.add(s));
    } else if (officeJobAreas && officeJobAreas.length > 0) {
      officeJobAreas.forEach((area) => (SKILL_RECOMMENDATIONS[area] || []).forEach((s) => merged.add(s)));
    }
    return merged.size > 0 ? Array.from(merged) : SKILL_RECOMMENDATIONS["default"];
  })();

  // 검색어가 바뀌면 다시 접는다. 앞 검색에서 펼친 상태가 이어지면
  // 새 검색어의 먼 것까지 한꺼번에 보인다.
  const 검색바꾸기 = (v: string) => { setInput(v); set다펼침(false); };

  const handleAdd = (value?: string) => {
    const v = (value ?? input).trim();
    if (!v) return;
    addSkill(v);
    setInput("");
  };

  // 입력한 단어와 관련된 스킬 자동완성 (사전 글자검색 + 분야 키워드 매핑)
  const query = input.trim().toLowerCase();
  // 가까운 것부터 세운다. 예전에는 걸린 순서대로 서른 개가 쏟아져,
  // '매장'을 치면 '매장 운영'과 '시술 전후 사진 촬영'이 나란히 나왔다.
  //
  //  1. 검색어로 시작하는 것   — '매장' → '매장 운영'
  //  2. 검색어가 안에 든 것     — '매장' → '우리 매장 SNS'
  //  3. 분야가 겹쳐 딸려온 것   — '매장' → 매장운영 그룹 전체
  //
  // 같은 등급 안에서는 짧은 것을 앞에 둔다. 포괄적인 스킬일수록 이름이
  // 짧다 — '매장 운영'이 '매장 SNS 운영'보다 넓은 말이다.
  const matches = (() => {
    if (!query) return { 가까운: [] as string[], 전부: [] as string[] };
    const 등급 = new Map<string, number>();
    const 담기 = (s: string, g: number) => {
      const 이전 = 등급.get(s);
      if (이전 === undefined || g < 이전) 등급.set(s, g);
    };
    ALL_SKILLS.forEach((s) => {
      const l = s.toLowerCase();
      if (l.startsWith(query)) 담기(s, 0);
      else if (l.includes(query)) 담기(s, 1);
    });
    Object.entries(KEYWORD_GROUPS).forEach(([kw, list]) => {
      if (kw.includes(query) || query.includes(kw)) list.forEach((s) => 담기(s, 2));
    });
    const 줄세운 = Array.from(등급.entries())
      .filter(([s]) => !skills.includes(s))
      .sort((a, b) => (a[1] - b[1]) || (a[0].length - b[0].length) || a[0].localeCompare(b[0]));
    // 이름에 검색어가 든 것(0·1등급)까지가 '가까운 것'이다. 분야가 겹쳐
    // 딸려온 것(2등급)은 '매장'을 쳤을 때 '업셀링'이 나오는 쪽이라 접어 둔다.
    const 가까운 = 줄세운.filter(([, g]) => g < 2).map(([s]) => s);
    return { 가까운, 전부: 줄세운.map(([s]) => s) };
  })();

  // 칸 안에서 그대로 펼칠 때 쓰는 몸통.
  const 몸통 = (
      <div className={inline ? "cv-body cv-body-inline" : "cv-body"}>
        {!inline && <p className="cv-desc">내 직무 기반 스킬을 마음껏 추가해 보세요.</p>}

        <div className="cv-skill-input-row">
          <input
            className="cv-input"
            placeholder="내 직무 기반 스킬을 추가해보세요"
            value={input}
            onChange={(e) => 검색바꾸기(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <button className="cv-skill-add-btn" onClick={() => handleAdd()}>추가하기</button>
        </div>

        {query && (
          <div className="cv-recommend-section">
            <h4 className="cv-recommend-title">검색 결과</h4>
            {matches.전부.length > 0 ? (
              <div className="cv-skill-chips">
                {(다펼침 ? matches.전부 : matches.가까운.slice(0, 8)).map((skill) => (
                  <button key={skill} className="cv-skill-chip" onClick={() => handleAdd(skill)}>
                    {skill}
                  </button>
                ))}
                {!다펼침 && matches.전부.length > matches.가까운.slice(0, 8).length && (
                  <button type="button" className="cv-skill-more" onClick={() => set다펼침(true)}>
                    + {matches.전부.length - matches.가까운.slice(0, 8).length}개 더
                  </button>
                )}
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

        {/* 아무것도 안 쳤을 때 추천을 깔지 않는다. 마흔 개가 먼저 보이면
            고르라는 말처럼 읽히는데, 정작 담을 것은 자기 시술 몇 가지다.
            칸 안에서 펼치는 자리에서는 특히 그 목록이 화면을 다 먹는다. */}
        {!query && !inline && (
          <div className="cv-recommend-section">
            <h4 className="cv-recommend-title">추천 스킬</h4>
            <p className="cv-recommend-desc">눌러서 담고, 없는 것은 위에 쳐서 넣으세요.</p>
            <div className="cv-skill-chips">
              {(() => {
                const 남은 = recommended.filter((r) => !skills.includes(r));
                const 보일 = 다펼침 ? 남은 : 남은.slice(0, 12);
                return (<>
                  {보일.map((skill) => (
                    <button key={skill} className="cv-skill-chip" onClick={() => addSkill(skill)}>
                      {skill}
                    </button>
                  ))}
                  {!다펼침 && 남은.length > 12 && (
                    <button type="button" className="cv-skill-more" onClick={() => set다펼침(true)}>
                      + {남은.length - 12}개 더
                    </button>
                  )}
                </>);
              })()}
            </div>
          </div>
        )}

        <div className={inline ? "cv-actions" : undefined}>
          {inline && <button type="button" className="cv-inline-cancel" onClick={onClose}>닫기</button>}
          <button className="cv-btn-primary" onClick={onClose}>완료</button>
        </div>
      </div>
  );

  if (inline) return <div className="cv-inline">{몸통}</div>;

  return (
    <div className="cv-overlay">
      <div className="cv-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cv-header">
          <button className="cv-back" onClick={onClose}><ChevronLeft size={20} /></button>
          <h2 className="cv-title">스킬</h2>
          <div style={{ width: 36 }} />
        </div>
        {몸통}

      </div>
    </div>
  );
}
