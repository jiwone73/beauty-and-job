"use client";

import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function AdminJobNewPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    company: "", title: "", category: "", career: "",
    region: "", type: "정규직", deadline: "", salary: "",
    description: "", requirements: "", preferred: "", benefits: "",
  });
  const [saved, setSaved] = useState(false);

  const handleSubmit = (status: "draft" | "publish") => {
    setSaved(true);
    setTimeout(() => router.push("/admin/jobs"), 1000);
  };

  const F = (key: string, label: string, placeholder: string, type = "input") => (
    <div className="admin-form-row">
      <label className="admin-form-label">{label}</label>
      {type === "textarea" ? (
        <textarea
          className="admin-form-textarea"
          placeholder={placeholder}
          value={(form as any)[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      ) : type === "select" ? null : (
        <input
          className="admin-form-input"
          placeholder={placeholder}
          value={(form as any)[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      )}
    </div>
  );

  return (
    <AdminLayout activeMenu="jobs">
      <div className="admin-form-header">
        <button className="admin-back-btn" onClick={() => router.push("/admin/jobs")}>
          <ChevronLeft size={18} /> 목록으로
        </button>
        <div className="admin-form-actions">
          <button className="admin-secondary-btn" onClick={() => handleSubmit("draft")}>임시저장</button>
          <button className="admin-primary-btn" onClick={() => handleSubmit("publish")}>
            {saved ? "✅ 저장됨" : "등록하기"}
          </button>
        </div>
      </div>

      <div className="admin-form-grid">
        {/* 기본 정보 */}
        <div className="admin-card">
          <h2 className="admin-card-title">기본 정보</h2>
          <div className="admin-form-body">
            {F("company", "기업명 *", "기업명을 입력하세요")}
            {F("title", "공고 제목 *", "예) 마케팅 매니저 (색조)")}
            <div className="admin-form-row">
              <label className="admin-form-label">직군 *</label>
              <select className="admin-form-select" value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                <option value="">선택</option>
                {["마케팅", "MD·상품기획", "영업", "디자인", "연구개발", "SCM·물류", "경영·전략", "HR", "CS·CX"].map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            <div className="admin-form-row-2col">
              <div className="admin-form-row">
                <label className="admin-form-label">경력 *</label>
                <select className="admin-form-select" value={form.career}
                  onChange={(e) => setForm({ ...form, career: e.target.value })}>
                  <option value="">선택</option>
                  {["신입", "경력 1-3년", "경력 3-5년", "경력 5년+", "경력 무관"].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
              <div className="admin-form-row">
                <label className="admin-form-label">고용형태</label>
                <select className="admin-form-select" value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {["정규직", "계약직", "인턴", "프리랜서"].map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="admin-form-row-2col">
              {F("region", "근무지역 *", "예) 서울 강남구")}
              {F("salary", "연봉", "예) 4,000~5,000만원 또는 협의")}
            </div>
            {F("deadline", "마감일", "예) 2025.02.28 또는 채용시 마감")}
          </div>
        </div>

        {/* 상세 내용 */}
        <div className="admin-card">
          <h2 className="admin-card-title">상세 내용</h2>
          <div className="admin-form-body">
            {F("description", "포지션 소개 *", "이 포지션에 대한 소개를 입력하세요", "textarea")}
            {F("requirements", "자격요건 *", "필수 자격요건을 입력하세요", "textarea")}
            {F("preferred", "우대사항", "우대사항을 입력하세요", "textarea")}
            {F("benefits", "복리후생", "복리후생을 입력하세요", "textarea")}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
