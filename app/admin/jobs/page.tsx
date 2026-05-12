"use client";

import { useState } from "react";
import { AdminLayout } from "../page";
import { Plus, Search, Eye, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";

const JOBS = [
  { id: 1, company: "올리브영", title: "디지털 마케팅 매니저", category: "마케팅", career: "경력 3-5년", region: "국내", date: "2025.01.20", status: "승인대기", views: 0 },
  { id: 2, company: "아모레퍼시픽", title: "글로벌 브랜드 마케터 (설화수)", category: "마케팅", career: "경력 5년+", region: "국내·해외", date: "2025.01.20", status: "승인완료", views: 234 },
  { id: 3, company: "LG생활건강", title: "e커머스 MD (CNP)", category: "MD", career: "경력 2-4년", region: "국내", date: "2025.01.19", status: "승인완료", views: 187 },
  { id: 4, company: "코스맥스", title: "화장품 연구원 (제형 개발)", category: "연구개발", career: "경력 3년+", region: "경기", date: "2025.01.19", status: "반려", views: 0 },
  { id: 5, company: "에이피알", title: "퍼포먼스 마케터 (메디큐브)", category: "마케팅", career: "경력 2-5년", region: "국내", date: "2025.01.18", status: "승인대기", views: 0 },
  { id: 6, company: "달바", title: "유럽 수출 영업 담당자", category: "영업", career: "경력 3년+", region: "유럽", date: "2025.01.18", status: "승인완료", views: 156 },
  { id: 7, company: "닥터자르트", title: "브랜드 콘텐츠 기획자", category: "마케팅", career: "경력 2-4년", region: "국내", date: "2025.01.17", status: "승인완료", views: 98 },
  { id: 8, company: "아누아", title: "인플루언서 마케팅 매니저", category: "마케팅", career: "경력 1-3년", region: "국내", date: "2025.01.17", status: "승인완료", views: 312 },
];

const STATUS_OPTIONS = ["전체", "승인대기", "승인완료", "반려"];

export default function AdminJobsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [jobs, setJobs] = useState(JOBS);

  const filtered = jobs.filter((j) => {
    const matchSearch = !search || j.title.includes(search) || j.company.includes(search);
    const matchStatus = statusFilter === "전체" || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleApprove = (id: number) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, status: "승인완료" } : j));
  };
  const handleReject = (id: number) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, status: "반려" } : j));
  };
  const handleDelete = (id: number) => {
    if (confirm("삭제하시겠습니까?")) setJobs(jobs.filter(j => j.id !== id));
  };

  return (
    <AdminLayout activeMenu="jobs">
      {/* 필터 + 등록 버튼 */}
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input
              className="admin-search-input"
              placeholder="공고명, 기업명 검색"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="admin-filter-tabs">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                className={`admin-filter-tab ${statusFilter === s ? "active" : ""}`}
                onClick={() => setStatusFilter(s)}
              >
                {s}
                {s === "승인대기" && (
                  <span className="admin-filter-count">
                    {jobs.filter(j => j.status === "승인대기").length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        <Link href="/admin/jobs/new" className="admin-primary-btn">
          <Plus size={16} /> 공고 직접 등록
        </Link>
      </div>

      {/* 테이블 */}
      <div className="admin-card">
        <table className="admin-table">
          <thead>
            <tr>
              <th>기업</th>
              <th>공고명</th>
              <th>직군</th>
              <th>경력</th>
              <th>지역</th>
              <th>등록일</th>
              <th>조회수</th>
              <th>상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((job) => (
              <tr key={job.id}>
                <td className="admin-td-brand">{job.company}</td>
                <td className="admin-td-title">{job.title}</td>
                <td className="admin-td-date">{job.category}</td>
                <td className="admin-td-date">{job.career}</td>
                <td className="admin-td-date">{job.region}</td>
                <td className="admin-td-date">{job.date}</td>
                <td className="admin-td-date">{job.views.toLocaleString()}</td>
                <td>
                  <span className={`admin-badge admin-badge-${
                    job.status === "승인완료" ? "success" :
                    job.status === "승인대기" ? "warning" : "danger"
                  }`}>
                    {job.status}
                  </span>
                </td>
                <td>
                  <div className="admin-actions">
                    {job.status === "승인대기" && (
                      <>
                        <button className="admin-action-btn approve" onClick={() => handleApprove(job.id)}>승인</button>
                        <button className="admin-action-btn reject" onClick={() => handleReject(job.id)}>반려</button>
                      </>
                    )}
                    <button className="admin-action-icon"><Eye size={15} /></button>
                    <button className="admin-action-icon"><Edit size={15} /></button>
                    <button className="admin-action-icon danger" onClick={() => handleDelete(job.id)}><Trash2 size={15} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="admin-empty">검색 결과가 없습니다.</div>
        )}
      </div>
    </AdminLayout>
  );
}
