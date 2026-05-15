"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import {
  Briefcase, Users, FileText, Settings,
  Bell, LogOut, ChevronLeft
} from "lucide-react";

const JOB_GROUPS = {
  "기업": {
    "브랜드·마케팅": ["브랜드 마케터", "디지털·퍼포먼스 마케터", "콘텐츠 마케터", "SNS·인플루언서 마케팅", "글로벌 마케팅"],
    "상품·MD": ["MD (상품기획)", "이커머스 MD", "바이어", "PB 상품기획", "VMD"],
    "영업·유통": ["국내 영업", "해외 영업 (글로벌)", "수출입 담당", "B2B 영업"],
    "연구개발": ["화장품 연구원 (제형)", "제품 개발 R&D", "RA (품질·인증)", "패키지 개발"],
    "디자인": ["패키지 디자인", "브랜드·그래픽 디자인", "UI/UX 디자인", "영상·콘텐츠 디자인"],
    "SCM·물류": ["SCM 담당", "물류 담당", "구매 담당", "수입통관"],
    "경영지원": ["HR·채용", "재무·회계", "경영기획·전략", "CS·CX"],
  },
  "매장": {
    "네일": ["네일 아티스트", "젤네일 전문가", "네일샵 매니저", "네일 강사"],
    "헤어": ["헤어 디자이너", "헤어 어시스턴트", "살롱 매니저"],
    "피부·에스테틱": ["피부관리사", "에스테티션", "피부 강사"],
    "메이크업": ["메이크업 아티스트", "메이크업 강사"],
    "기타 뷰티": ["속눈썹·눈썹 아티스트", "왁싱 전문가", "반영구 아티스트"],
  },
};

const REGIONS = ["서울", "경기·인천", "부산·경남", "대구·경북", "광주·전남", "대전·충청", "기타 지방", "글로벌"];
const CAREER_OPTIONS = ["신입", "1년 이상", "2년 이상", "3년 이상", "5년 이상", "경력 무관"];
const EMPLOYMENT_TYPES = ["정규직", "계약직", "인턴", "아르바이트", "프리랜서"];

export default function CompanyJobNewPage() {
  const router = useRouter();
  const [jobGroupType, setJobGroupType] = useState<"기업" | "매장">("기업");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [form, setForm] = useState({
    title: "", category: "", career: "", region: "",
    type: "정규직", deadline: "", salary: "", description: "",
    requirements: "", preferred: "", benefits: "",
  });
  const [saved, setSaved] = useState(false);

  const currentGroups = JOB_GROUPS[jobGroupType];

  const handleSubmit = (status: "draft" | "publish") => {
    if (!form.title.trim()) { alert("공고 제목을 입력해주세요."); return; }
    if (!form.category) { alert("직군을 선택해주세요."); return; }
    setSaved(true);
    setTimeout(() => router.push("/company/dashboard/jobs"), 1000);
  };

  return (
    <CompanyLayout activePage="jobs">
      <div className="admin-form-header">
        <button className="admin-back-btn" onClick={() => router.push("/company/dashboard/jobs")}>
          <ChevronLeft size={18} /> 목록으로
        </button>
        <div className="admin-form-actions">
          <button className="admin-secondary-btn" onClick={() => handleSubmit("draft")}>임시저장</button>
          <button className="company-primary-btn" onClick={() => handleSubmit("publish")}>
            {saved ? "✅ 등록완료" : "공고 등록"}
          </button>
        </div>
      </div>

      <div className="admin-form-grid">
        {/* 기본 정보 */}
        <div className="company-card" style={{overflow:"visible"}}>
          <div className="company-card-head"><h2 className="company-card-title">기본 정보</h2></div>
          <div className="admin-form-body">
            {/* 채용 유형 */}
            <div className="admin-form-row">
              <label className="admin-form-label">채용 유형 *</label>
              <div className="admin-job-type-tabs">
                {(["기업", "매장"] as const).map((t) => (
                  <button key={t} type="button"
                    className={`admin-job-type-tab ${jobGroupType === t ? "active" : ""}`}
                    onClick={() => { setJobGroupType(t); setSelectedGroup(""); setForm({...form, category: ""}); }}>
                    {t === "기업" ? "🏢 기업" : "🏪 매장"}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-form-row">
              <label className="admin-form-label">공고 제목 *</label>
              <input className="admin-form-input"
                placeholder={jobGroupType === "매장" ? "예) 네일 아티스트 모집" : "예) 마케팅 매니저 (색조)"}
                value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} />
            </div>

            <div className="admin-form-row">
              <label className="admin-form-label">직군 그룹 *</label>
              <select className="admin-form-select" value={selectedGroup}
                onChange={(e) => { setSelectedGroup(e.target.value); setForm({...form, category: ""}); }}>
                <option value="">그룹 선택</option>
                {Object.keys(currentGroups).map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {selectedGroup && (
              <div className="admin-form-row">
                <label className="admin-form-label">세부 직군 *</label>
                <select className="admin-form-select" value={form.category}
                  onChange={(e) => setForm({...form, category: e.target.value})}>
                  <option value="">선택</option>
                  {(currentGroups as any)[selectedGroup]?.map((o: string) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="admin-form-row-2col">
              <div className="admin-form-row">
                <label className="admin-form-label">경력 *</label>
                <select className="admin-form-select" value={form.career}
                  onChange={(e) => setForm({...form, career: e.target.value})}>
                  <option value="">선택</option>
                  {CAREER_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="admin-form-row">
                <label className="admin-form-label">고용형태</label>
                <select className="admin-form-select" value={form.type}
                  onChange={(e) => setForm({...form, type: e.target.value})}>
                  {EMPLOYMENT_TYPES.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div className="admin-form-row">
              <label className="admin-form-label">근무지역 *</label>
              <select className="admin-form-select" value={form.region}
                onChange={(e) => setForm({...form, region: e.target.value})}>
                <option value="">선택</option>
                {REGIONS.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div className="admin-form-row-2col">
              <div className="admin-form-row">
                <label className="admin-form-label">{jobGroupType === "매장" ? "급여" : "연봉"}</label>
                <input className="admin-form-input"
                  placeholder={jobGroupType === "매장" ? "예) 월 250만원" : "예) 4,000~5,000만원"}
                  value={form.salary} onChange={(e) => setForm({...form, salary: e.target.value})} />
              </div>
              <div className="admin-form-row">
                <label className="admin-form-label">마감일</label>
                <input className="admin-form-input" placeholder="예) 2025.02.28"
                  value={form.deadline} onChange={(e) => setForm({...form, deadline: e.target.value})} />
              </div>
            </div>
          </div>
        </div>

        {/* 상세 내용 */}
        <div className="company-card" style={{overflow:"visible"}}>
          <div className="company-card-head"><h2 className="company-card-title">상세 내용</h2></div>
          <div className="admin-form-body">
            {[
              { key: "description", label: "포지션 소개 *", placeholder: "이 포지션에 대한 소개를 입력하세요" },
              { key: "requirements", label: "자격요건 *", placeholder: "필수 자격요건을 입력하세요" },
              { key: "preferred", label: "우대사항", placeholder: "우대사항을 입력하세요" },
              { key: "benefits", label: jobGroupType === "매장" ? "근무조건·복지" : "복리후생", placeholder: "복리후생을 입력하세요" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} className="admin-form-row">
                <label className="admin-form-label">{label}</label>
                <textarea className="admin-form-textarea" placeholder={placeholder}
                  value={(form as any)[key]}
                  onChange={(e) => setForm({...form, [key]: e.target.value})} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </CompanyLayout>
  );
}
