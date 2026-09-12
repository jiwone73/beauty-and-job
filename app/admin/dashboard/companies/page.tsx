"use client";
import { StoreIcon, OfficeIcon } from "@/components/icons/JobTypeIcon";
import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import Link from "next/link";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { getGroupOfItem } from "@/lib/data/jobGroups";
import {
  TrendCard, PieCard, PIE_COLORS, unitLabelStyle, CHART_MARGIN,
  fmtTrendDay, tabBtn, rollup, mapDist, fmtNum,
} from "@/components/admin/DashboardParts";

/**
 * 기업회원 현황.
 *
 * 대시보드에서 떼어 왔다. 카운터에서 「진행중 공고」와 「승인 대기」는 뺐다 —
 * 대시보드 요약 카드에 같은 값이 있다. 옮기면서 같은 숫자를 두 번 적을
 * 이유가 없다.
 */
export default function AdminDashboardCompanies() {
  const [stats, setStats] = useState<any>(null);
  const [tab, setTab] = useState<"ALL" | "STORE" | "OFFICE">("ALL");

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    fetch(`/api/admin/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setStats(res.data); })
      .catch(console.error);
  }, []);

  const c = stats?.counts;

  const jobDistRaw = tab === "STORE" ? mapDist(stats?.job_dist_store)
    : tab === "OFFICE" ? mapDist(stats?.job_dist_office)
    : mapDist(stats?.job_dist_all);
  const jobDist = rollup(jobDistRaw, tab === "OFFICE" ? "OFFICE" : "STORE", getGroupOfItem as any);

  const companySizeRaw = tab === "STORE" ? stats?.company_size_store
    : tab === "OFFICE" ? stats?.company_size_office
    : stats?.company_size_all;
  const companySizeData = (companySizeRaw || []).map((r: any) => ({ name: r.name, value: Number(r.value) }));

  return (
    <AdminLayout activeMenu="dashboard-companies">
      <div>

      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {([["ALL", "전체" as React.ReactNode], ["STORE", <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StoreIcon size={14} style={{ flexShrink: 0 }} />매장</span>], ["OFFICE", <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><OfficeIcon size={14} style={{ flexShrink: 0 }} />본사</span>]] as const).map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} style={tabBtn(tab === val)}>{label}</button>
        ))}
      </div>

      <div className="co-counts" style={{ ["--co-counts-n" as any]: 3 }}>
        {[
          { label: "기업회원", value: fmtNum(tab === "STORE" ? c?.store_companies : tab === "OFFICE" ? c?.office_companies : c?.total_companies), href: `/admin/members/companies?type=${tab}` },
          { label: "오늘 신규 가입", value: fmtNum(tab === "STORE" ? c?.today_companies_store : tab === "OFFICE" ? c?.today_companies_office : c?.today_companies), href: `/admin/members/companies?type=${tab}&date=today` },
          { label: "오늘 공고 등록", value: fmtNum(tab === "STORE" ? c?.today_jobs_store : tab === "OFFICE" ? c?.today_jobs_office : c?.today_jobs), href: "/admin/jobs?date=today" },
        ].map((s) => (
          <Link key={s.label} href={s.href} className="co-count" style={{ textDecoration: "none" }}>
            <span className="co-count-label">{s.label}</span>
            <span className="co-count-value">{s.value}</span>
          </Link>
        ))}
      </div>

      {/* 추이 2개 */}
      <div className="admin-dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <TrendCard title="기업회원 가입 추이" type="company" unit="개사" render={(rows, range) => {
          const data = rows.map((r: any) => ({
            day: fmtTrendDay(r.day, range),
            기업: Number(tab === "STORE" ? r.companies_store : tab === "OFFICE" ? r.companies_office : r.companies) || 0,
          }));
          return (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={CHART_MARGIN}>
                <XAxis dataKey="day" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 13 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v}개사`, "신규 가입"]} />
                <Line type="monotone" dataKey="기업" stroke="#582681" strokeWidth={2.5}
                  dot={{ fill: "#582681", r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          );
        }} />
        <TrendCard
          title="채용공고 등록 추이" type="job" unit="건"
          subFilter={tab === "ALL" ? "" : tab === "STORE" ? "매장" : "본사"}
          render={(rows, range) => {
            const data = rows.map((r: any) => ({
              day: fmtTrendDay(r.day, range),
              등록수: tab === "STORE" ? Number(r.store) : tab === "OFFICE" ? Number(r.office) : Number(r.total),
            }));
            return (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={CHART_MARGIN}>
                  <XAxis dataKey="day" tick={{ fontSize: 13 }} />
                  <YAxis tick={{ fontSize: 13 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [`${v}건`, "공고 등록"]} />
                  <Line type="monotone" dataKey="등록수" stroke="#582681" strokeWidth={2.5}
                    dot={{ fill: "#582681", r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            );
          }}
        />
      </div>

      {/* 완성 추이 · 일 방문자 */}
      <div className="admin-dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <TrendCard title="기업프로필 완성 추이" type="company_completion" unit="개사" defaultMode="cumulative" render={(rows, range) => {
          const data = rows.map((r: any) => ({
            day: fmtTrendDay(r.day, range),
            기업프로필: Number(tab === "STORE" ? r.done_store : tab === "OFFICE" ? r.done_office : r.done) || 0,
          }));
          return (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={CHART_MARGIN}>
                <XAxis dataKey="day" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 13 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v}개사`, "기업프로필 완성"]} />
                <Line type="monotone" dataKey="기업프로필" stroke="#582681" strokeWidth={2.5}
                  dot={{ fill: "#582681", r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          );
        }} />
        <TrendCard title="일 방문자 수" type="visit" unit="명" render={(rows, range) => {
          const data = rows.map((r: any) => ({
            day: fmtTrendDay(r.day, range),
            전체방문자: Number(r.visitors),
            로그인회원: Number(r.members),
          }));
          return (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={CHART_MARGIN}>
                <XAxis dataKey="day" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 13 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="전체방문자" stroke="#582681" strokeWidth={2.5}
                  dot={{ fill: "#582681", r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="로그인회원" stroke="#a5a5ab" strokeWidth={2.5}
                  dot={{ fill: "#a5a5ab", r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          );
        }} />
      </div>

      {/* 분포 2개 */}
      <div className="admin-dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="admin-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">기업 규모별 분포</h2>
          </div>
          <div style={{ padding: "16px 8px", position: "relative" }}>
            <span style={unitLabelStyle}>개사</span>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={companySizeData} margin={CHART_MARGIN}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 13 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v}개사`, ""]} />
                <Bar dataKey="value" fill="#0ea5e9" radius={[6, 6, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <PieCard title="직군별 채용공고 분포" data={jobDist} unit="건" colors={PIE_COLORS} caption="공고 건수 (건)" />
      </div>

      </div>
    </AdminLayout>
  );
}
