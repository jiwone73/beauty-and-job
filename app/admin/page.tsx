"use client";
import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import Link from "next/link";
import {
  Users, Briefcase, CheckCircle, Clock,
  TrendingUp, TrendingDown,
  UserCheck, Building2
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { getGroupOfItem } from "@/lib/data/jobGroups";

const PIE_COLORS = ["#5f0080", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

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
function fmtTrendDay(d: string | null, range: string) {
  if (!d) return "";
  const dt = new Date(d);
  return range === "1m" || range === "3m"
    ? `${dt.getMonth() + 1}/${dt.getDate()}~`
    : `${dt.getMonth() + 1}/${dt.getDate()}`;
}

function RangeToggle({ range, onChange }: { range: string; onChange: (r: "7d" | "1m" | "3m") => void }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {([["7d", "7일"], ["1m", "1개월"], ["3m", "3개월"]] as const).map(([val, label]) => (
        <button key={val} onClick={() => onChange(val)}
          style={{
            padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
            cursor: "pointer", border: "1px solid #e5e0eb",
            background: range === val ? "#7c3aed" : "#fff",
            color: range === val ? "#fff" : "#7c3aed",
          }}>
          {label}
        </button>
      ))}
    </div>
  );
}

// ── 독립 추이 카드: 자체 기간 state + 자체 fetch (4개가 서로 독립)
function TrendCard({
  title, type, subFilter, render,
}: {
  title: string;
  type: "signup" | "company" | "apply" | "job";
  subFilter?: string;
  render: (rows: any[], range: string) => React.ReactNode;
}) {
  const [range, setRange] = useState<"7d" | "1m" | "3m">("7d");
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    fetch(`/api/admin/dashboard/trend?type=${type}&range=${range}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => { if (res.success) setRows(res.data.rows || []); })
      .catch(console.error);
  }, [type, range]);

  return (
    <div className="admin-card">
      <div className="admin-card-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="admin-card-title">{title}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {subFilter && <span style={{ fontSize: 11, color: "#888" }}>{subFilter}</span>}
          <RangeToggle range={range} onChange={setRange} />
        </div>
      </div>
      <div style={{ padding: "16px 8px" }}>
        {render(rows, range)}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [indivTab, setIndivTab] = useState<"ALL" | "STORE" | "OFFICE">("ALL");
  const [corpTab, setCorpTab] = useState<"ALL" | "STORE" | "OFFICE" | "BOTH">("ALL");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    fetch(`/api/admin/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => { if (res.success) setStats(res.data); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    fetch(`/api/admin/dashboard/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => { if (res.success) setStats(res.data); })
      .catch(console.error);
  }, []);

  const c = stats?.counts;
  const fmt = (n: any) => (n == null ? "-" : Number(n).toLocaleString());

  
  const mapDist = (rows: any) => (rows || []).map((r: any) => ({ name: r.name, value: Number(r.value) }));

  // ── 소분류 → 대분류 롤업
  const rollup = (rows: any[], jt: "STORE" | "OFFICE") => {
    const m: Record<string, number> = {};
    (rows || []).forEach((r: any) => {
      // 지정된 jobType 우선, 못 찾으면 반대쪽도 탐색 (ALL 탭 대응)
      const g = getGroupOfItem(jt, r.name)
        || getGroupOfItem(jt === "STORE" ? "OFFICE" : "STORE", r.name)
        || "기타";
      m[g] = (m[g] || 0) + Number(r.value);
    });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  };

  // ── 직군별 채용공고 분포 (corpTab 연동, jobTab 삭제)
  const jobDistRaw = corpTab === "STORE" ? mapDist(stats?.job_dist_store)
    : corpTab === "OFFICE" ? mapDist(stats?.job_dist_office)
    : corpTab === "BOTH" ? mapDist(stats?.job_dist_both)
    : mapDist(stats?.job_dist_all);
  const jobDistJt = corpTab === "OFFICE" ? "OFFICE" : "STORE";
  const jobDist = rollup(jobDistRaw, jobDistJt);

  // ── 직군별 입사지원 분포 (indivTab 연동, jobTab 삭제)
  const appDistRaw = indivTab === "STORE" ? mapDist(stats?.app_dist_store)
    : indivTab === "OFFICE" ? mapDist(stats?.app_dist_office)
    : mapDist(stats?.app_dist_all);
  const appDistJt = indivTab === "OFFICE" ? "OFFICE" : "STORE";
  const appDist = rollup(appDistRaw, appDistJt);

  // ── 프로필 직군 분포 (회원이 설정한 직군, indivTab 연동)
  const userDistRaw = indivTab === "STORE" ? mapDist(stats?.user_dist_store)
    : indivTab === "OFFICE" ? mapDist(stats?.user_dist_office)
    : [...mapDist(stats?.user_dist_store), ...mapDist(stats?.user_dist_office)];
  const userDist = (() => {
    // ALL일 땐 store+office 각각 롤업 후 병합
    if (indivTab === "STORE") return rollup(mapDist(stats?.user_dist_store), "STORE");
    if (indivTab === "OFFICE") return rollup(mapDist(stats?.user_dist_office), "OFFICE");
    const s = rollup(mapDist(stats?.user_dist_store), "STORE");
    const o = rollup(mapDist(stats?.user_dist_office), "OFFICE");
    const m: Record<string, number> = {};
    [...s, ...o].forEach((r) => { m[r.name] = (m[r.name] || 0) + r.value; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  })();

  // ── 나이대 × 성별
  const demographicsRaw = indivTab === "STORE" ? stats?.demographics_store
    : indivTab === "OFFICE" ? stats?.demographics_office
    : stats?.demographics_all;
  const demographics = (demographicsRaw || []).map((r: any) => ({
    name: r.name,
    남성: Number(r["남성"] || 0),
    여성: Number(r["여성"] || 0),
    미입력: Number(r["미입력"] || 0),
  }));

  // ── 기업 규모별 분포
  const companySizeRaw = corpTab === "STORE" ? stats?.company_size_store
    : corpTab === "OFFICE" ? stats?.company_size_office
    : corpTab === "BOTH" ? stats?.company_size_both
    : stats?.company_size_all;
  const companySizeData = (companySizeRaw || []).map((r: any) => ({
    name: r.name, value: Number(r.value),
  }));

  // ── 지원 상태별 분포
  const appStatusData = (stats?.app_status_dist || []).map((r: any) => ({
    name: r.name, value: Number(r.value),
  }));

  // 토글 버튼 공통 스타일
  const tabBtn = (active: boolean) => ({
    padding: "4px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
    cursor: "pointer", border: "none",
    background: active ? "#5f0080" : "#f0e9f5",
    color: active ? "#fff" : "#5f0080",
  } as React.CSSProperties);

  return (
    <AdminLayout activeMenu="dashboard">

      {/* ── 1. 전체 요약 카드 ── */}
      <div className="admin-stat-grid">
        {[
          {
            label: "총 가입자",
            value: fmt(c ? Number(c.total_users) + Number(c.total_companies) : null),
            unit: "명",
            sub: `개인 ${fmt(c?.total_users)} · 기업 ${fmt(c?.total_companies)}`,
            icon: Users, color: "#5f0080",
          },
          {
            label: "진행중 채용공고",
            value: fmt(c?.active_jobs),
            unit: "건",
            sub: `매장 ${fmt(c?.store_jobs)}건 · 기업 ${fmt(c?.office_jobs)}건`,
            icon: Briefcase, color: "#0ea5e9",
          },
          {
            label: "오늘 지원수",
            value: fmt(c?.today_applications),
            unit: "건",
            sub: "오늘 접수",
            icon: CheckCircle, color: "#10b981",
          },
          {
            label: "승인 대기 기업",
            value: fmt(c?.pending_companies),
            unit: "건",
            sub: "즉시 처리 필요",
            icon: Clock, color: "#f59e0b",
            href: "/admin/members/companies?status=pending",
          },
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
                <div className="admin-stat-trend neutral" />
              </div>
              <div className="admin-stat-value">
                {stat.value}<span className="admin-stat-unit">{stat.unit}</span>
              </div>
              <div className="admin-stat-sub-text">{stat.sub}</div>
            </>
          );
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className="admin-stat-card"
              style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}>
              {inner}
            </Link>
          ) : (
            <div key={stat.label} className="admin-stat-card">{inner}</div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════
          2. 개인회원 현황
          탭: 전체 / 매장직 / 사무직
          차트: 가입추이(라인) / 나이대·성별(스택바)
          + 직군별 입사지원 분포(파이) — indivTab 연동
      ══════════════════════════════════════════ */}
      <div className="admin-section-header">
        <div className="admin-section-title-wrap">
          <UserCheck size={20} className="admin-section-icon individual" />
          <h2 className="admin-section-heading">개인회원 현황</h2>
          <div style={{ display: "flex", gap: 4, marginLeft: 12 }}>
            {([["ALL","전체"],["STORE","🏪 매장직"],["OFFICE","🏢 사무직"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setIndivTab(val)} style={tabBtn(indivTab === val)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        </div>

      {/* 미니통계 */}
      <div className="admin-mini-stat-row">
        {[
          {
            label: "전체 개인회원",
            value: fmt(indivTab === "STORE" ? c?.store_users : indivTab === "OFFICE" ? c?.office_users : c?.total_users),
            unit: "명",
          },
          {
            label: "오늘 신규 가입",
            value: fmt(indivTab === "STORE" ? c?.today_users_store : indivTab === "OFFICE" ? c?.today_users_office : c?.today_users),
            unit: "명",
          },
          {
            label: "오늘 입사지원",
            value: fmt(indivTab === "STORE" ? c?.today_applications_store : indivTab === "OFFICE" ? c?.today_applications_office : c?.today_applications),
            unit: "건",
          },
          {
            label: "전체 이력서",
            value: fmt(indivTab === "STORE" ? c?.total_resumes_store : indivTab === "OFFICE" ? c?.total_resumes_office : c?.total_resumes),
            unit: "건",
            sub: `공개 ${fmt(indivTab === "STORE" ? c?.public_resumes_store : indivTab === "OFFICE" ? c?.public_resumes_office : c?.public_resumes)}`,
          },
          {
            label: "이력서 보유율",
            value: (() => {
              const have = indivTab === "STORE" ? c?.users_with_resume_store
                : indivTab === "OFFICE" ? c?.users_with_resume_office : c?.users_with_resume;
              const total = indivTab === "STORE" ? c?.store_users
                : indivTab === "OFFICE" ? c?.office_users : c?.total_users;
              return c ? Math.round((Number(have) / Math.max(Number(total), 1)) * 100) : "-";
            })(),
            unit: "%",
          },
        ].map((s) => (
          <div key={s.label} className="admin-mini-stat-card">
            <span className="admin-mini-stat-label">{s.label}</span>
            <span className="admin-mini-stat-value">
              {s.value}<span className="admin-mini-unit">{s.unit}</span>
              {(s as any).sub && <span style={{ fontSize: 11, color: "#999", fontWeight: 400, marginLeft: 6 }}>({(s as any).sub})</span>}
            </span>
          </div>
        ))}
      </div>

      {/* 차트 3개 */}
      <div className="admin-dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* 가입 추이 */}
        <TrendCard title="개인회원 가입 추이" type="signup" render={(rows, range) => {
          const data = rows.map((r: any) => ({
            day: fmtTrendDay(r.day, range),
            개인: Number(indivTab === "STORE" ? r.users_store : indivTab === "OFFICE" ? r.users_office : r.users) || null,
          }));
          return (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="개인" stroke="#5f0080" strokeWidth={2.5}
                  dot={{ fill: "#5f0080", r: 4 }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          );
        }} />
        {/* 입사 지원 추이 */}
        <TrendCard title="입사 지원 추이" type="apply" render={(rows, range) => {
          const data = rows.map((r) => ({
            day: fmtTrendDay(r.day, range),
            지원수: Number(r.count) || null,
          }));
          return (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="지원수" stroke="#10b981" strokeWidth={2.5}
                  dot={{ fill: "#10b981", r: 4 }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          );
        }} />
      </div>
      <div className="admin-dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>

        {/* 나이대 × 성별 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">나이대 · 성별 분포</h2>
          </div>
          <div style={{ padding: "16px 8px" }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={demographics}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v}명`, ""]} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
                <Bar dataKey="남성" stackId="a" fill="#0ea5e9" maxBarSize={48} />
                <Bar dataKey="여성" stackId="a" fill="#ec4899" maxBarSize={48} />
                <Bar dataKey="미입력" stackId="a" fill="#cbd5e1" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 프로필 직군 분포 (회원이 설정한 직군) */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">프로필 직군 분포</h2>
          </div>
          <div style={{ padding: "16px 8px" }}>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={userDist} cx="40%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3}>
                  {userDist.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}명`, ""]} />
                <Legend layout="vertical" align="right" verticalAlign="middle"
                  iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        {/* 직군별 입사지원 분포 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">직군별 입사지원 분포</h2>
          </div>
          <div style={{ padding: "16px 8px" }}>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={appDist} cx="40%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3}>
                  {appDist.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}건`, ""]} />
                <Legend layout="vertical" align="right" verticalAlign="middle"
                  iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
      </div>
      {/* ══════════════════════════════════════════
          3. 기업회원 현황
          탭: 전체 / 매장 / 기업 / 매장+기업
          차트: 가입추이(바) / 규모별 분포(바)
          + 직군별 채용공고 분포(파이) — corpTab 연동
      ══════════════════════════════════════════ */}
      <div className="admin-section-header">
        <div className="admin-section-title-wrap">
          <Building2 size={20} className="admin-section-icon company" />
          <h2 className="admin-section-heading">기업회원 현황</h2>
          <div style={{ display: "flex", gap: 4, marginLeft: 12 }}>
            {([["ALL","전체"],["STORE","🏪 매장"],["OFFICE","🏢 기업"],["BOTH","🏪🏢 매장+기업"]] as const).map(([val, label]) => (
              <button key={val} onClick={() => setCorpTab(val)} style={tabBtn(corpTab === val)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        </div>

      {/* 미니통계 */}
      <div className="admin-mini-stat-row">
        {[
          {
            label: "전체 기업회원",
            value: fmt(corpTab === "STORE" ? c?.store_companies : corpTab === "OFFICE" ? c?.office_companies : corpTab === "BOTH" ? c?.both_companies : c?.total_companies),
            unit: "개사",
          },
          {
            label: "오늘 신규 가입",
            value: fmt(corpTab === "STORE" ? c?.today_companies_store : corpTab === "OFFICE" ? c?.today_companies_office : corpTab === "BOTH" ? c?.today_companies_both : c?.today_companies),
            unit: "개사",
          },
          {
            label: "오늘 공고 등록",
            value: fmt(corpTab === "STORE" ? c?.today_jobs_store : corpTab === "OFFICE" ? c?.today_jobs_office : c?.today_jobs),
            unit: "건",
          },
          {
            label: "진행중 공고",
            value: fmt(corpTab === "STORE" ? c?.active_jobs_store : corpTab === "OFFICE" ? c?.active_jobs_office : corpTab === "BOTH" ? c?.active_jobs_both : c?.active_jobs),
            unit: "건",
          },
          {
            label: "승인 대기",
            value: fmt(c?.pending_companies),
            unit: "건",
            href: "/admin/members/companies?status=pending",
          },
        ].map((s) => (
          s.href ? (
            <Link key={s.label} href={s.href} className="admin-mini-stat-card"
              style={{ cursor: "pointer", textDecoration: "none", color: "inherit" }}>
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

      {/* 차트 3개 */}
      <div className="admin-dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        {/* 기업 가입 추이 */}
        <TrendCard title="기업회원 가입 추이" type="company" render={(rows, range) => {
          const data = rows.map((r: any) => ({
            day: fmtTrendDay(r.day, range),
            기업: Number(corpTab === "STORE" ? r.companies_store : corpTab === "OFFICE" ? r.companies_office : corpTab === "BOTH" ? r.companies_both : r.companies) || 0,
          }));
          return (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="기업" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          );
        }} />

        {/* 기업 규모별 분포 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">기업 규모별 분포 (사원수)</h2>
          </div>
          <div style={{ padding: "16px 8px" }}>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={companySizeData}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v}개사`, ""]} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 직군별 채용공고 분포 */}
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">직군별 채용공고 분포</h2>
          </div>
          <div style={{ padding: "16px 8px" }}>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={jobDist} cx="40%" cy="50%" innerRadius={50} outerRadius={80}
                  dataKey="value" paddingAngle={3}>
                  {jobDist.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => [`${v}건`, ""]} />
                <Legend layout="vertical" align="right" verticalAlign="middle"
                  iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 12 }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 일별 공고 등록수 */}
        <TrendCard
          title="일별 공고 등록수"
          type="job"
          subFilter={corpTab === "ALL" ? "전체" : corpTab === "STORE" ? "매장" : corpTab === "OFFICE" ? "기업" : "매장+기업"}
          render={(rows, range) => {
            const data = rows.map((r: any) => ({
              day: fmtTrendDay(r.day, range),
              등록수: corpTab === "STORE" ? Number(r.store)
                    : corpTab === "OFFICE" ? Number(r.office)
                    : corpTab === "BOTH" ? Number(r.both)
                    : Number(r.total),
            }));
            return (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data}>
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="등록수" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            );
          }}
        />
      </div>
      
    </AdminLayout>
  );
}