"use client";
import { useState, useEffect } from "react";
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

const PIE_COLORS = ["#5f0080", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const JOB_TYPE_LABEL: Record<string, string> = {
  OFFICE: "기업",
  STORE: "매장",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "승인완료",
  DRAFT: "임시저장",
  CLOSED: "마감",
  HIDDEN: "숨김",
  EXPIRED: "만료",
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

function fmtDay(d: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return `${dt.getMonth() + 1}/${dt.getDate()}`;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    fetch("/api/admin/dashboard/stats", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => { if (res.success) setStats(res.data); })
      .catch(console.error);
  }, []);

  const c = stats?.counts;
  const fmt = (n: any) => (n == null ? "-" : Number(n).toLocaleString());

  const signupData = (stats?.signup_trend || []).map((r: any) => ({
    day: fmtDay(r.day),
    개인: Number(r.users),
    기업: Number(r.companies),
  }));

  const applyData = (stats?.apply_trend || []).map((r: any) => ({
    day: fmtDay(r.day),
    지원수: Number(r.count),
  }));

  const jobDist = (stats?.job_dist || []).map((r: any) => ({
    name: r.name,
    value: Number(r.value),
  }));

  const recentUsers = stats?.recent_users || [];
  const recentCompanies = stats?.recent_companies || [];
  const recentJobs = stats?.recent_jobs || [];

  return (
    <AdminLayout activeMenu="dashboard">

      {/* ── 1. 전체 요약 카드 ── */}
      <div className="admin-stat-grid">
        {[
          { label: "총 가입자", value: fmt(c ? Number(c.total_users) + Number(c.total_companies) : null), unit: "명", sub: `개인 ${fmt(c?.total_users)} · 기업 ${fmt(c?.total_companies)}`, trend: 0, icon: Users, color: "#5f0080" },
          { label: "진행중 채용공고", value: fmt(c?.active_jobs), unit: "건", sub: `기업 ${fmt(c?.office_jobs)}건 · 매장 ${fmt(c?.store_jobs)}건`, trend: 0, icon: Briefcase, color: "#0ea5e9" },
          { label: "오늘 지원수", value: fmt(c?.today_applications), unit: "건", sub: "오늘 접수", trend: 0, icon: CheckCircle, color: "#10b981" },
          { label: "승인 대기 기업", value: fmt(c?.pending_companies), unit: "건", sub: "즉시 처리 필요", trend: 0, icon: Clock, color: "#f59e0b" },
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

      <div className="admin-mini-stat-row">
        {[
          { label: "전체 개인회원", value: fmt(c?.total_users), unit: "명" },
          { label: "오늘 신규 가입", value: fmt(c?.today_users), unit: "명" },
          { label: "완성 이력서", value: fmt(c?.published_resumes), unit: "건" },
          { label: "오늘 지원", value: fmt(c?.today_applications), unit: "건" },
        ].map((s) => (
          <div key={s.label} className="admin-mini-stat-card">
            <span className="admin-mini-stat-label">{s.label}</span>
            <span className="admin-mini-stat-value">{s.value}<span className="admin-mini-unit">{s.unit}</span></span>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-grid">
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">개인회원 가입 추이 (최근 7일)</h2>
          </div>
          <div style={{padding:"16px 8px"}}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={signupData}>
                <XAxis dataKey="day" tick={{fontSize:12}} />
                <YAxis tick={{fontSize:12}} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="개인" stroke="#5f0080" strokeWidth={2.5}
                  dot={{fill:"#5f0080", r:4}} activeDot={{r:6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">최근 가입 개인회원</h2>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>이름</th><th>직군</th><th>가입일</th></tr>
            </thead>
            <tbody>
              {recentUsers.length === 0 ? (
                <tr><td colSpan={3} style={{textAlign:"center", color:"#999", padding:"24px"}}>데이터가 없습니다.</td></tr>
              ) : recentUsers.map((m: any, i: number) => (
                <tr key={i}>
                  <td className="admin-td-brand">{m.name}</td>
                  <td className="admin-td-date">{JOB_TYPE_LABEL[m.job_type] || m.job_type || "-"}</td>
                  <td className="admin-td-date">{fmtDate(m.created_at)}</td>
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

      <div className="admin-mini-stat-row">
        {[
          { label: "전체 기업회원", value: fmt(c?.total_companies), unit: "개사" },
          { label: "오늘 신규 가입", value: fmt(c?.today_companies), unit: "개사" },
          { label: "진행중 공고", value: fmt(c?.active_jobs), unit: "건" },
          { label: "승인 대기", value: fmt(c?.pending_companies), unit: "건" },
        ].map((s) => (
          <div key={s.label} className="admin-mini-stat-card">
            <span className="admin-mini-stat-label">{s.label}</span>
            <span className="admin-mini-stat-value">{s.value}<span className="admin-mini-unit">{s.unit}</span></span>
          </div>
        ))}
      </div>

      <div className="admin-dashboard-grid">
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">기업회원 가입 추이 (최근 7일)</h2>
          </div>
          <div style={{padding:"16px 8px"}}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={signupData}>
                <XAxis dataKey="day" tick={{fontSize:12}} />
                <YAxis tick={{fontSize:12}} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="기업" fill="#0ea5e9" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">최근 가입 기업회원</h2>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>기업명</th><th>공고수</th><th>가입일</th></tr>
            </thead>
            <tbody>
              {recentCompanies.length === 0 ? (
                <tr><td colSpan={3} style={{textAlign:"center", color:"#999", padding:"24px"}}>데이터가 없습니다.</td></tr>
              ) : recentCompanies.map((co: any, i: number) => (
                <tr key={i}>
                  <td className="admin-td-brand">{co.company_name}</td>
                  <td className="admin-td-date">{fmt(co.job_count)}건</td>
                  <td className="admin-td-date">{fmtDate(co.created_at)}</td>
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
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">일별 지원수 (최근 7일)</h2>
          </div>
          <div style={{padding:"16px 8px"}}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={applyData}>
                <XAxis dataKey="day" tick={{fontSize:12}} />
                <YAxis tick={{fontSize:12}} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="지원수" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">직군별 채용공고 분포</h2>
          </div>
          <div style={{padding:"16px 8px"}}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={jobDist} cx="40%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3}>
                  {jobDist.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}건`, ""]} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span style={{fontSize:12}}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">최근 채용공고</h2>
          </div>
          <table className="admin-table">
            <thead>
              <tr><th>유형</th><th>기업</th><th>공고명</th><th>등록일</th><th>상태</th></tr>
            </thead>
            <tbody>
              {recentJobs.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:"center", color:"#999", padding:"24px"}}>데이터가 없습니다.</td></tr>
              ) : recentJobs.map((job: any, i: number) => {
                const isStore = job.job_type === "STORE";
                const statusLabel = STATUS_LABEL[job.status] || job.status;
                return (
                  <tr key={i}>
                    <td>
                      <span className={`jobs-type-badge ${isStore ? "store" : "corp"}`}>
                        {isStore ? "🏪 매장" : "🏢 기업"}
                      </span>
                    </td>
                    <td className="admin-td-brand">{job.company_name}</td>
                    <td className="admin-td-title">{job.title}</td>
                    <td className="admin-td-date">{fmtDate(job.created_at)}</td>
                    <td>
                      <span className={`admin-badge admin-badge-${
                        job.status === "ACTIVE" ? "success" :
                        job.status === "DRAFT" ? "warning" : "danger"
                      }`}>{statusLabel}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </AdminLayout>
  );
}