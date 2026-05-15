"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import Link from "next/link";
import {
  Users, Briefcase, CheckCircle, Clock,
  TrendingUp, TrendingDown, Eye, Trash2,
  UserCheck, Building2
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";

/* ============================================
   더미 데이터
   ============================================ */
const SIGNUP_DATA = [
  { day: "1/14", 개인: 15, 기업: 3 },
  { day: "1/15", 개인: 22, 기업: 3 },
  { day: "1/16", 개인: 19, 기업: 3 },
  { day: "1/17", 개인: 28, 기업: 3 },
  { day: "1/18", 개인: 25, 기업: 3 },
  { day: "1/19", 개인: 16, 기업: 3 },
  { day: "1/20", 개인: 21, 기업: 3 },
];

const APPLY_DATA = [
  { day: "1/14", 지원수: 65 },
  { day: "1/15", 지원수: 78 },
  { day: "1/16", 지원수: 91 },
  { day: "1/17", 지원수: 82 },
  { day: "1/18", 지원수: 95 },
  { day: "1/19", 지원수: 71 },
  { day: "1/20", 지원수: 87 },
];

const JOB_DIST = [
  { name: "마케팅", value: 38 },
  { name: "MD", value: 22 },
  { name: "영업", value: 15 },
  { name: "디자인", value: 10 },
  { name: "연구개발", value: 8 },
  { name: "기타", value: 7 },
];

const PIE_COLORS = ["#5f0080", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const RECENT_JOBS = [
  { id: 1, jobGroup: "기업", company: "올리브영", title: "디지털 마케팅 매니저", date: "2025.01.20", status: "승인대기" },
  { id: 2, jobGroup: "기업", company: "아모레퍼시픽", title: "글로벌 브랜드 마케터", date: "2025.01.20", status: "승인완료" },
  { id: 3, jobGroup: "기업", company: "LG생활건강", title: "e커머스 MD", date: "2025.01.19", status: "승인완료" },
  { id: 4, jobGroup: "매장", company: "코스맥스", title: "뷰티어드바이저 (강남점)", date: "2025.01.19", status: "반려" },
  { id: 5, jobGroup: "매장", company: "에이피알", title: "매장 스태프 (홍대점)", date: "2025.01.18", status: "승인대기" },
];

const RECENT_INDIVIDUAL = [
  { id: 1, name: "김지수", email: "jisoo@email.com", job: "마케팅", date: "2025.01.20", joinType: "카카오" },
  { id: 2, name: "박민준", email: "minjun@email.com", job: "MD", date: "2025.01.19", joinType: "카카오" },
  { id: 3, name: "이수진", email: "sujin@email.com", job: "영업", date: "2025.01.19", joinType: "SMS" },
  { id: 4, name: "최유나", email: "yuna@email.com", job: "디자인", date: "2025.01.17", joinType: "카카오" },
];

const RECENT_COMPANY = [
  { id: 1, name: "(주)올리브영", email: "hr@oliveyoung.com", category: "리테일", date: "2025.01.20", jobs: 12 },
  { id: 2, name: "(주)아모레퍼시픽", email: "recruit@amore.com", category: "화장품 브랜드", date: "2025.01.18", jobs: 8 },
  { id: 3, name: "(주)에이피알", email: "hr@apr.com", category: "화장품 브랜드", date: "2025.01.10", jobs: 9 },
];

export default function AdminDashboard() {
  return (
    <AdminLayout activeMenu="dashboard">

      {/* ── 1. 전체 요약 카드 ── */}
      <div className="admin-stat-grid">
        {[
          { label: "총 가입자", value: "1,284", unit: "명", sub: "개인 972 · 기업 312", trend: 12, icon: Users, color: "#5f0080" },
          { label: "진행중 채용공고", value: "142", unit: "건", sub: "기업 118건 · 매장 24건", trend: 5, icon: Briefcase, color: "#0ea5e9" },
          { label: "오늘 지원수", value: "87", unit: "건", sub: "어제 대비 -3%", trend: -3, icon: CheckCircle, color: "#10b981" },
          { label: "승인 대기 공고", value: "8", unit: "건", sub: "즉시 처리 필요", trend: 0, icon: Clock, color: "#f59e0b" },
        ].map((stat) => (
          <div key={stat.label} className="admin-stat-card">
            <div className="admin-stat-top">
              <div className="admin-stat-icon" style={{ background: stat.color + "18", color: stat.color }}>
                <stat.icon size={22} />
              </div>
              <div className={`admin-stat-trend ${stat.trend > 0 ? "up" : stat.trend < 0 ? "down" : "neutral"}`}>
                {stat.trend > 0 ? <TrendingUp size={14} /> : stat.trend < 0 ? <TrendingDown size={14} /> : null}
                {stat.trend !== 0 && `${Math.abs(stat.trend)}%`}
              </div>
            </div>
            <div className="admin-stat-value">
              {stat.value}<span className="admin-stat-unit">{stat.unit}</span>
            </div>
            <div className="admin-stat-label">{stat.label}</div>
            <div className="admin-stat-sub-text">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* ── 2. 개인회원 섹션 ── */}
      <div className="admin-section-header">
        <div className="admin-section-title-wrap">
          <UserCheck size={20} className="admin-section-icon individual" />
          <h2 className="admin-section-heading">개인회원 현황</h2>
        </div>
        <Link href="/admin/members" className="admin-card-more">전체보기 →</Link>
      </div>

      {/* 개인회원 미니 통계 */}
      <div className="admin-mini-stat-row">
        {[
          { label: "전체 개인회원", value: "972", unit: "명" },
          { label: "오늘 신규 가입", value: "21", unit: "명" },
          { label: "완성 이력서", value: "856", unit: "건" },
          { label: "오늘 지원", value: "87", unit: "건" },
        ].map((s) => (
          <div key={s.label} className="admin-mini-stat-card">
            <span className="admin-mini-stat-label">{s.label}</span>
            <span className="admin-mini-stat-value">{s.value}<span className="admin-mini-unit">{s.unit}</span></span>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-grid">
        {/* 개인회원 가입 추이 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">개인회원 가입 추이 (최근 7일)</h2>
          </div>
          <div style={{padding:"16px 8px"}}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={SIGNUP_DATA}>
                <XAxis dataKey="day" tick={{fontSize:12}} />
                <YAxis tick={{fontSize:12}} />
                <Tooltip />
                <Line type="monotone" dataKey="개인" stroke="#5f0080" strokeWidth={2.5}
                  dot={{fill:"#5f0080", r:4}} activeDot={{r:6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 최근 가입 개인회원 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">최근 가입 개인회원</h2>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>이름</th><th>직군</th><th>가입방법</th><th>가입일</th></tr>
            </thead>
            <tbody>
              {RECENT_INDIVIDUAL.map((m) => (
                <tr key={m.id}>
                  <td className="admin-td-brand">{m.name}</td>
                  <td className="admin-td-date">{m.job}</td>
                  <td>
                    <span className="admin-badge" style={{
                      background: m.joinType === "카카오" ? "#FEE500" : "#f3f4f6",
                      color: m.joinType === "카카오" ? "#3A1D1D" : "#374151"
                    }}>{m.joinType}</span>
                  </td>
                  <td className="admin-td-date">{m.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 3. 기업회원 섹션 ── */}
      <div className="admin-section-header">
        <div className="admin-section-title-wrap">
          <Building2 size={20} className="admin-section-icon company" />
          <h2 className="admin-section-heading">기업회원 현황</h2>
        </div>
        <Link href="/admin/members/companies" className="admin-card-more">전체보기 →</Link>
      </div>

      {/* 기업회원 미니 통계 */}
      <div className="admin-mini-stat-row">
        {[
          { label: "전체 기업회원", value: "312", unit: "개사" },
          { label: "오늘 신규 가입", value: "3", unit: "개사" },
          { label: "진행중 공고", value: "142", unit: "건" },
          { label: "승인 대기", value: "8", unit: "건" },
        ].map((s) => (
          <div key={s.label} className="admin-mini-stat-card">
            <span className="admin-mini-stat-label">{s.label}</span>
            <span className="admin-mini-stat-value">{s.value}<span className="admin-mini-unit">{s.unit}</span></span>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-grid">
        {/* 기업회원 가입 추이 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">기업회원 가입 추이 (최근 7일)</h2>
          </div>
          <div style={{padding:"16px 8px"}}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={SIGNUP_DATA}>
                <XAxis dataKey="day" tick={{fontSize:12}} />
                <YAxis tick={{fontSize:12}} />
                <Tooltip />
                <Bar dataKey="기업" fill="#0ea5e9" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 최근 가입 기업회원 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">최근 가입 기업회원</h2>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>기업명</th><th>카테고리</th><th>공고수</th><th>가입일</th></tr>
            </thead>
            <tbody>
              {RECENT_COMPANY.map((c) => (
                <tr key={c.id}>
                  <td className="admin-td-brand">{c.name}</td>
                  <td className="admin-td-date">{c.category}</td>
                  <td className="admin-td-date">{c.jobs}건</td>
                  <td className="admin-td-date">{c.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. 채용공고 섹션 ── */}
      <div className="admin-section-header">
        <div className="admin-section-title-wrap">
          <Briefcase size={20} className="admin-section-icon jobs" />
          <h2 className="admin-section-heading">채용공고 현황</h2>
        </div>
        <Link href="/admin/jobs" className="admin-card-more">전체보기 →</Link>
      </div>

      <div className="admin-chart-grid">
        {/* 지원수 추이 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">일별 지원수 (최근 7일)</h2>
          </div>
          <div style={{padding:"16px 8px"}}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={APPLY_DATA}>
                <XAxis dataKey="day" tick={{fontSize:12}} />
                <YAxis tick={{fontSize:12}} />
                <Tooltip />
                <Bar dataKey="지원수" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 직군별 분포 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">직군별 채용공고 분포</h2>
          </div>
          <div style={{padding:"8px"}}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={JOB_DIST} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                  dataKey="value" paddingAngle={3}>
                  {JOB_DIST.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}건`, ""]} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{fontSize:12}}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 최근 채용공고 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">최근 채용공고</h2>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>기업</th><th>공고명</th><th>등록일</th><th>상태</th></tr>
            </thead>
            <tbody>
              {RECENT_JOBS.map((job) => (
                <tr key={job.id}>
                  <td className="admin-td-brand">{job.company}</td>
                  <td className="admin-td-title">{job.title}</td>
                  <td className="admin-td-date">{job.date}</td>
                  <td>
                    <span className={`admin-badge admin-badge-${
                      job.status === "승인완료" ? "success" :
                      job.status === "승인대기" ? "warning" : "danger"
                    }`}>{job.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </AdminLayout>
  );
}
