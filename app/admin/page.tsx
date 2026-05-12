"use client";

import AdminLayout from "@/components/admin/AdminLayout";
import Link from "next/link";
import { Users, Briefcase, CheckCircle, Clock, TrendingUp, TrendingDown, Eye, Trash2 } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";

const STATS = [
  { label: "오늘 신규 가입", value: "24", unit: "명", trend: 12, icon: Users, color: "#5f0080" },
  { label: "진행중 채용공고", value: "142", unit: "건", trend: 5, icon: Briefcase, color: "#0ea5e9" },
  { label: "오늘 지원수", value: "87", unit: "건", trend: -3, icon: CheckCircle, color: "#10b981" },
  { label: "승인 대기 공고", value: "8", unit: "건", trend: 0, icon: Clock, color: "#f59e0b" },
];

const SIGNUP_DATA = [
  { day: "1/14", 가입자: 18 },
  { day: "1/15", 가입자: 25 },
  { day: "1/16", 가입자: 22 },
  { day: "1/17", 가입자: 31 },
  { day: "1/18", 가입자: 28 },
  { day: "1/19", 가입자: 19 },
  { day: "1/20", 가입자: 24 },
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
  { id: 1, company: "올리브영", title: "디지털 마케팅 매니저", date: "2025.01.20", status: "승인대기" },
  { id: 2, company: "아모레퍼시픽", title: "글로벌 브랜드 마케터", date: "2025.01.20", status: "승인완료" },
  { id: 3, company: "LG생활건강", title: "e커머스 MD", date: "2025.01.19", status: "승인완료" },
  { id: 4, company: "코스맥스", title: "화장품 연구원", date: "2025.01.19", status: "반려" },
  { id: 5, company: "에이피알", title: "퍼포먼스 마케터", date: "2025.01.18", status: "승인대기" },
];

const RECENT_MEMBERS = [
  { id: 1, name: "김지수", type: "개인", email: "jisoo@email.com", date: "2025.01.20" },
  { id: 2, name: "(주)올리브영", type: "기업", email: "hr@oliveyoung.com", date: "2025.01.20" },
  { id: 3, name: "박민준", type: "개인", email: "minjun@email.com", date: "2025.01.19" },
  { id: 4, name: "이수진", type: "개인", email: "sujin@email.com", date: "2025.01.19" },
];

export default function AdminDashboard() {
  return (
    <AdminLayout activeMenu="dashboard">
      {/* 통계 카드 */}
      <div className="admin-stat-grid">
        {STATS.map((stat) => (
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
          </div>
        ))}
      </div>

      {/* 차트 영역 */}
      <div className="admin-chart-grid">
        {/* 일별 가입자 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">일별 신규 가입자 (최근 7일)</h2>
          </div>
          <div style={{ padding: "16px 8px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={SIGNUP_DATA}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="가입자"
                  stroke="#5f0080"
                  strokeWidth={2.5}
                  dot={{ fill: "#5f0080", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 일별 지원수 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">일별 지원수 (최근 7일)</h2>
          </div>
          <div style={{ padding: "16px 8px" }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={APPLY_DATA}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="지원수" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 직군별 공고 분포 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">직군별 채용공고 분포</h2>
          </div>
          <div style={{ padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={JOB_DIST}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {JOB_DIST.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}건`, ""]} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 테이블 영역 */}
      <div className="admin-dashboard-grid">
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">최근 채용공고</h2>
            <Link href="/admin/jobs" className="admin-card-more">전체보기 →</Link>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>기업</th><th>공고명</th><th>등록일</th><th>상태</th><th>관리</th></tr>
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
                  <td>
                    <div className="admin-actions">
                      <button className="admin-action-icon"><Eye size={15} /></button>
                      <button className="admin-action-icon danger"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">최근 가입 회원</h2>
            <Link href="/admin/members" className="admin-card-more">전체보기 →</Link>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>이름</th><th>유형</th><th>이메일</th><th>가입일</th></tr>
            </thead>
            <tbody>
              {RECENT_MEMBERS.map((m) => (
                <tr key={m.id}>
                  <td className="admin-td-brand">{m.name}</td>
                  <td>
                    <span className={`admin-badge ${m.type === "기업" ? "admin-badge-info" : "admin-badge-neutral"}`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="admin-td-date">{m.email}</td>
                  <td className="admin-td-date">{m.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
