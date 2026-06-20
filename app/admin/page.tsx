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
import { getGroupOfItem } from "@/lib/data/jobGroups";

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
  const [jobTab, setJobTab] = useState<"STORE" | "OFFICE">("STORE");
  const [userTab, setUserTab] = useState<"STORE" | "OFFICE">("STORE");
  const [indivTab, setIndivTab] = useState<"ALL" | "STORE" | "OFFICE">("ALL");
  const [corpTab, setCorpTab] = useState<"ALL" | "STORE" | "OFFICE" | "BOTH">("ALL");


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
    개인: indivTab === "STORE" ? Number(r.users_store)
        : indivTab === "OFFICE" ? Number(r.users_office)
        : Number(r.users),
    기업: corpTab === "STORE" ? Number(r.companies_store)
        : corpTab === "OFFICE" ? Number(r.companies_office)
        : corpTab === "BOTH" ? Number(r.companies_both)
        : Number(r.companies),
  }));

  const applyData = (stats?.apply_trend || []).map((r: any) => ({
    day: fmtDay(r.day),
    지원수: Number(r.count),
  }));

  const mapDist = (rows: any) => (rows || []).map((r: any) => ({ name: r.name, value: Number(r.value) }));
  const jobDistStore = mapDist(stats?.job_dist_store);
  const jobDistOffice = mapDist(stats?.job_dist_office);
  const userDistStore = mapDist(stats?.user_dist_store);
  const userDistOffice = mapDist(stats?.user_dist_office);
  const demographicsRaw = indivTab === "STORE" ? stats?.demographics_store
    : indivTab === "OFFICE" ? stats?.demographics_office
    : stats?.demographics_all;
  const demographics = (demographicsRaw || []).map((r: any) => ({
    name: r.name,
    남성: Number(r["남성"] || 0),
    여성: Number(r["여성"] || 0),
    미입력: Number(r["미입력"] || 0),
  }));
  // 소분류 분포 → 대분류(1뎁스)로 합산
  const rollup = (rows: any[], jt: "STORE" | "OFFICE") => {
    const m: Record<string, number> = {};
    (rows || []).forEach((r: any) => {
      const g = getGroupOfItem(jt, r.name) || "기타";
      m[g] = (m[g] || 0) + Number(r.value);
    });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };
  const jobDist = jobTab === "STORE" ? rollup(jobDistStore, "STORE") : rollup(jobDistOffice, "OFFICE");
  const userDist = userTab === "STORE" ? rollup(userDistStore, "STORE") : rollup(userDistOffice, "OFFICE");

  const recentUsers = stats?.recent_users || [];
  const recentCompanies = stats?.recent_companies || [];
  const recentJobs = stats?.recent_jobs || [];
  const appStatusData = (stats?.app_status_dist || []).map((r: any) => ({
    name: r.name,
    value: Number(r.value),
  }));
  const companySizeRaw = corpTab === "STORE" ? stats?.company_size_store
    : corpTab === "OFFICE" ? stats?.company_size_office
    : corpTab === "BOTH" ? stats?.company_size_both
    : stats?.company_size_all;
  const companySizeData = (companySizeRaw || []).map((r: any) => ({
    name: r.name,
    value: Number(r.value),
  }));

  return (
    <AdminLayout activeMenu="dashboard">

      {/* ── 1. 전체 요약 카드 ── */}
      <div className="admin-stat-grid">
        {[
          { label: "총 가입자", value: fmt(c ? Number(c.total_users) + Number(c.total_companies) : null), unit: "명", sub: `개인 ${fmt(c?.total_users)} · 기업 ${fmt(c?.total_companies)}`, trend: 0, icon: Users, color: "#5f0080" },
          { label: "진행중 채용공고", value: fmt(c?.active_jobs), unit: "건", sub: `매장 ${fmt(c?.store_jobs)}건 · 기업 ${fmt(c?.office_jobs)}건`, trend: 0, icon: Briefcase, color: "#0ea5e9" },
          { label: "오늘 지원수", value: fmt(c?.today_applications), unit: "건", sub: "오늘 접수", trend: 0, icon: CheckCircle, color: "#10b981" },
          { label: "승인 대기 기업", value: fmt(c?.pending_companies), unit: "건", sub: "즉시 처리 필요", trend: 0, icon: Clock, color: "#f59e0b", href: "/admin/members/companies?status=pending" },
        ].map((stat) => {
          const inner = (
            <>
              <div className="admin-stat-top">
                <div className="admin-stat-icon-label">
                  <div className="admin-stat-icon" style={{ background: stat.color + "18", color: stat.color }}>
                    <stat.icon size={16} />
                  </div>
                  <div className="admin-stat-label">{stat.label}</div>
                </div>
                <div className={`admin-stat-trend ${stat.trend > 0 ? "up" : stat.trend < 0 ? "down" : "neutral"}`}>
                  {stat.trend > 0 ? <TrendingUp size={14} /> : stat.trend < 0 ? <TrendingDown size={14} /> : null}
                  {stat.trend !== 0 && `${Math.abs(stat.trend)}%`}
                </div>
              </div>
              <div className="admin-stat-value">
                {stat.value}<span className="admin-stat-unit">{stat.unit}</span>
              </div>
              <div className="admin-stat-sub-text">{stat.sub}</div>
            </>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="admin-stat-card" style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}>
              {inner}
            </Link>
          ) : (
            <div key={stat.label} className="admin-stat-card">
              {inner}
            </div>
          );
        })}
      </div>

      {/* ── 2. 개인회원 섹션 ── */}
      <div className="admin-section-header">
        <div className="admin-section-title-wrap">
          <UserCheck size={20} className="admin-section-icon individual" />
          <h2 className="admin-section-heading">개인회원 현황</h2>
          <div style={{ display: "flex", gap: 4, marginLeft: 12 }}>
            {([["ALL","전체"],["STORE","🏪 매장"],["OFFICE","🏢 사무"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setIndivTab(val)}
                style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                  background: indivTab === val ? "#5f0080" : "#f0e9f5",
                  color: indivTab === val ? "#fff" : "#5f0080" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <Link href="/admin/members" className="admin-card-more">전체보기 →</Link>
      </div>

      <div className="admin-mini-stat-row">
        {[
          { label: "전체 개인회원", value: fmt(indivTab === "STORE" ? c?.store_users : indivTab === "OFFICE" ? c?.office_users : c?.total_users), unit: "명" },
          { label: "오늘 신규 가입", value: fmt(indivTab === "STORE" ? c?.today_users_store : indivTab === "OFFICE" ? c?.today_users_office : c?.today_users), unit: "명" },
          { label: "완성 이력서", value: fmt(indivTab === "STORE" ? c?.published_resumes_store : indivTab === "OFFICE" ? c?.published_resumes_office : c?.published_resumes), unit: "건" },
          { label: "오늘 지원", value: fmt(indivTab === "STORE" ? c?.today_applications_store : indivTab === "OFFICE" ? c?.today_applications_office : c?.today_applications), unit: "건" },
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

        {/* 나이대 × 성별 분포 (누적 막대) */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">나이대 · 성별 분포</h2>
          </div>
          <div style={{padding:"16px 8px"}}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={demographics}>
                <XAxis dataKey="name" tick={{fontSize:12}} />
                <YAxis tick={{fontSize:12}} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v}명`, ""]} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{fontSize:12}}>{v}</span>} />
                <Bar dataKey="남성" stackId="a" fill="#0ea5e9" maxBarSize={48} />
                <Bar dataKey="여성" stackId="a" fill="#ec4899" maxBarSize={48} />
                <Bar dataKey="미입력" stackId="a" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        
      </div>

      {/* ── 3. 기업회원 섹션 ── */}
      <div className="admin-section-header">
        <div className="admin-section-title-wrap">
          <Building2 size={20} className="admin-section-icon company" />
          <h2 className="admin-section-heading">기업회원 현황</h2>
          <div style={{ display: "flex", gap: 4, marginLeft: 12 }}>
            {([["ALL","전체"],["STORE","🏪 매장"],["OFFICE","🏢 기업"],["BOTH","🏪🏢 매장+기업"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setCorpTab(val)}
                style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none",
                  background: corpTab === val ? "#5f0080" : "#f0e9f5",
                  color: corpTab === val ? "#fff" : "#5f0080" }}>
                {label}
              </button>
            ))}
          </div>
        </div>
        <Link href="/admin/members/companies" className="admin-card-more">전체보기 →</Link>
      </div>

      <div className="admin-mini-stat-row">
        {[
          { label: "전체 기업회원", value: fmt(corpTab === "STORE" ? c?.store_companies : corpTab === "OFFICE" ? c?.office_companies : corpTab === "BOTH" ? c?.both_companies : c?.total_companies), unit: "개사" },
          { label: "오늘 신규 가입", value: fmt(corpTab === "STORE" ? c?.today_companies_store : corpTab === "OFFICE" ? c?.today_companies_office : corpTab === "BOTH" ? c?.today_companies_both : c?.today_companies), unit: "개사" },
          { label: "진행중 공고", value: fmt(corpTab === "STORE" ? c?.active_jobs_store : corpTab === "OFFICE" ? c?.active_jobs_office : corpTab === "BOTH" ? c?.active_jobs_both : c?.active_jobs), unit: "건" },
          { label: "승인 대기", value: fmt(c?.pending_companies), unit: "건", href: "/admin/members/companies?status=pending" },
        ].map((s) => (
          s.href ? (
            <Link key={s.label} href={s.href} className="admin-mini-stat-card" style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}>
              <span className="admin-mini-stat-label">{s.label}</span>
              <span className="admin-mini-stat-value">{s.value}<span className="admin-mini-unit">{s.unit}</span></span>
            </Link>
          ) : (
            <div key={s.label} className="admin-mini-stat-card">
              <span className="admin-mini-stat-label">{s.label}</span>
              <span className="admin-mini-stat-value">{s.value}<span className="admin-mini-unit">{s.unit}</span></span>
            </div>
          )
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
            <h2 className="admin-card-title">기업 규모별 분포 (사원수)</h2>
          </div>
          <div style={{padding:"16px 8px"}}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={companySizeData}>
                <XAxis dataKey="name" tick={{fontSize:10}} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{fontSize:12}} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v}개사`, ""]} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[6,6,0,0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      {/* ── 4. 채용공고 섹션 ── */}
      {/* ── 콘텐츠 현황 ── */}
      <div className="admin-section-header">
        <div className="admin-section-title-wrap">
          <CheckCircle size={20} className="admin-section-icon individual" />
          <h2 className="admin-section-heading">콘텐츠 현황</h2>
        </div>
        <Link href="/admin/resumes" className="admin-card-more">전체보기 →</Link>
      </div>

      <div className="admin-mini-stat-row">
        {[
          { label: "전체 이력서", value: fmt(c?.total_resumes), unit: "건" },
          { label: "공개 이력서", value: fmt(c?.public_resumes), unit: "건" },
          { label: "이력서 보유율", value: c ? Math.round((Number(c.users_with_resume) / Math.max(Number(c.total_users), 1)) * 100) : "-", unit: "%" },
          { label: "누적 지원수", value: fmt(c?.total_applications), unit: "건" },
          { label: "공고당 평균지원", value: c?.avg_applications_per_job ?? "-", unit: "건" },
        ].map((s) => (
          <div key={s.label} className="admin-mini-stat-card">
            <span className="admin-mini-stat-label">{s.label}</span>
            <span className="admin-mini-stat-value">{s.value}<span className="admin-mini-unit">{s.unit}</span></span>
          </div>
        ))}
      </div>

      {/* ── 4. 채용공고 섹션 ── */}
      <div className="admin-section-header">
        <div className="admin-section-title-wrap">
          <Briefcase size={20} className="admin-section-icon jobs" />
          <h2 className="admin-section-heading">채용공고 현황</h2>
        </div>
        <Link href="/admin/jobs" className="admin-card-more">전체보기 →</Link>
      </div>

      <div className="admin-dashboard-grid">
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
          <div className="admin-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2 className="admin-card-title">직군별 채용공고 분포</h2>
            <div style={{ display: "flex", gap: 4 }}>
              <button onClick={() => setJobTab("STORE")}
                style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: jobTab === "STORE" ? "#5f0080" : "#f0e9f5", color: jobTab === "STORE" ? "#fff" : "#5f0080" }}>
                🏪 매장
              </button>
              <button onClick={() => setJobTab("OFFICE")}
                style={{ padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "none", background: jobTab === "OFFICE" ? "#5f0080" : "#f0e9f5", color: jobTab === "OFFICE" ? "#fff" : "#5f0080" }}>
                🏢 사무
              </button>
            </div>
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
      </div>
      

      {/* ── 입사지원 현황 ── */}
      <div className="admin-section-header">
        <div className="admin-section-title-wrap">
          <CheckCircle size={20} className="admin-section-icon jobs" />
          <h2 className="admin-section-heading">입사지원 현황</h2>
        </div>
        <Link href="/admin/resumes/applications" className="admin-card-more">전체보기 →</Link>
      </div>
      <div className="admin-mini-stat-row">
        {[
          { label: "누적 지원수", value: fmt(c?.total_applications), unit: "건" },
          { label: "오늘 지원", value: fmt(c?.today_applications), unit: "건" },
          { label: "공고당 평균", value: fmt(c?.avg_applications_per_job), unit: "건" },
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
            <h2 className="admin-card-title">일별 지원 추이 (최근 7일)</h2>
          </div>
          <div style={{padding:"16px 8px"}}>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={applyData}>
                <XAxis dataKey="day" tick={{fontSize:12}} />
                <YAxis tick={{fontSize:12}} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="지원수" stroke="#10b981" strokeWidth={2.5}
                  dot={{fill:"#10b981", r:4}} activeDot={{r:6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">지원 상태별 분포</h2>
          </div>
          <div style={{padding:"16px 8px"}}>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={appStatusData} cx="40%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3}>
                  {appStatusData.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}건`, ""]} />
                <Legend layout="vertical" align="right" verticalAlign="middle"
                  iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{fontSize:12}}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </AdminLayout>
  );
}