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
 * 개인회원 현황.
 *
 * 대시보드에서 떼어 왔다. 한 화면에 개인·기업을 다 쌓으니 매장/본사를 갈라
 * 보기 시작하는 순간 끝없이 길어졌다. 대시보드는 「지금 어떤가」 한 판으로
 * 끝내고, 파고드는 일은 이 화면이 맡는다.
 *
 * 카운터에서 「오늘 입사지원」은 뺐다 — 대시보드 요약 카드의 「오늘 지원수」와
 * 같은 값이다. 옮기면서 같은 숫자를 두 번 적을 이유가 없다.
 */
export default function AdminDashboardUsers() {
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

  const userDist = (() => {
    if (tab === "STORE") return rollup(mapDist(stats?.user_dist_store), "STORE", getGroupOfItem as any);
    if (tab === "OFFICE") return rollup(mapDist(stats?.user_dist_office), "OFFICE", getGroupOfItem as any);
    const s = rollup(mapDist(stats?.user_dist_store), "STORE", getGroupOfItem as any);
    const o = rollup(mapDist(stats?.user_dist_office), "OFFICE", getGroupOfItem as any);
    const m: Record<string, number> = {};
    [...s, ...o].forEach((r) => { m[r.name] = (m[r.name] || 0) + r.value; });
    return Object.entries(m).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  })();

  const demographicsRaw = tab === "STORE" ? stats?.demographics_store
    : tab === "OFFICE" ? stats?.demographics_office
    : stats?.demographics_all;
  const demographics = (demographicsRaw || []).map((r: any) => ({
    name: r.name,
    남성: Number(r["남성"] || 0),
    여성: Number(r["여성"] || 0),
    미입력: Number(r["미입력"] || 0),
  }));

  return (
    <AdminLayout activeMenu="dashboard-users">
      <div>

      {/* 매장·본사 — 이 화면의 모든 숫자가 이 고르개를 따른다. */}
      <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
        {([["ALL", "전체" as React.ReactNode], ["STORE", <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><StoreIcon size={14} style={{ flexShrink: 0 }} />매장</span>], ["OFFICE", <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><OfficeIcon size={14} style={{ flexShrink: 0 }} />본사</span>]] as const).map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} style={tabBtn(tab === val)}>{label}</button>
        ))}
      </div>

      {/* 카운터 — 대시보드 요약 카드와 같은 부품(.co-counts) */}
      <div className="co-counts" style={{ ["--co-counts-n" as any]: 7 }}>
        {[
          { label: "개인회원", value: fmtNum(tab === "STORE" ? c?.store_users : tab === "OFFICE" ? c?.office_users : c?.total_users), href: `/admin/members?type=${tab}` },
          { label: "오늘 신규 가입", value: fmtNum(tab === "STORE" ? c?.today_users_store : tab === "OFFICE" ? c?.today_users_office : c?.today_users), href: `/admin/members?type=${tab}&date=today` },
          // 방문·로그인은 사이트 전체 수라 매장/본사로 갈리지 않는다 — 고르개를 따르지 않는다.
          { label: "오늘 방문", value: fmtNum(c?.today_visitors) },
          { label: "오늘 로그인", value: fmtNum(c?.today_logins) },
          { label: "오늘 입사지원", value: fmtNum(tab === "STORE" ? c?.today_applications_store : tab === "OFFICE" ? c?.today_applications_office : c?.today_applications), href: "/admin/resumes/applications?date=today" },
          { label: "오늘 이력서 등록", value: fmtNum(tab === "STORE" ? c?.today_resumes_store : tab === "OFFICE" ? c?.today_resumes_office : c?.today_resumes), href: "/admin/members" },
          { label: "전체 이력서", value: fmtNum(tab === "STORE" ? c?.total_resumes_store : tab === "OFFICE" ? c?.total_resumes_office : c?.total_resumes), href: "/admin/members" },
        ].map((s) => (
          s.href ? (
            <Link key={s.label} href={s.href} className="co-count" style={{ textDecoration: "none" }}>
              <span className="co-count-label">{s.label}</span>
              <span className="co-count-value">{s.value}</span>
            </Link>
          ) : (
            <div key={s.label} className="co-count" style={{ cursor: "default" }}>
              <span className="co-count-label">{s.label}</span>
              <span className="co-count-value">{s.value}</span>
            </div>
          )
        ))}
      </div>

      {/* 추이 2개 */}
      <div className="admin-dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <TrendCard title="개인회원 가입 추이" type="signup" unit="명" render={(rows, range) => {
          const data = rows.map((r: any) => ({
            day: fmtTrendDay(r.day, range),
            개인: Number(tab === "STORE" ? r.users_store : tab === "OFFICE" ? r.users_office : r.users),
          }));
          return (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={CHART_MARGIN}>
                <XAxis dataKey="day" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 13 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v}명`, "신규 가입"]} />
                <Line type="monotone" dataKey="개인" stroke="#582681" strokeWidth={2.5}
                  dot={{ fill: "#582681", r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          );
        }} />
        <TrendCard title="입사 지원 추이" type="apply" unit="건" render={(rows, range) => {
          const data = rows.map((r) => ({ day: fmtTrendDay(r.day, range), 지원수: Number(r.count) }));
          return (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data} margin={CHART_MARGIN}>
                <XAxis dataKey="day" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 13 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v}건`, "입사지원"]} />
                <Line type="monotone" dataKey="지원수" stroke="#582681" strokeWidth={2.5}
                  dot={{ fill: "#582681", r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          );
        }} />
      </div>

      {/* 완성 추이 · 일 방문자 */}
      <div className="admin-dashboard-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <TrendCard title="프로필 · 이력서 완성 추이" type="completion" unit="명" defaultMode="cumulative" render={(rows, range) => {
          const data = rows.map((r: any) => ({
            day: fmtTrendDay(r.day, range),
            프로필: Number(r.profile_done),
            이력서: Number(r.resume_done),
          }));
          return (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data} margin={CHART_MARGIN}>
                <XAxis dataKey="day" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 13 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="프로필" stroke="#582681" strokeWidth={2.5}
                  dot={{ fill: "#582681", r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="이력서" stroke="#a5a5ab" strokeWidth={2.5}
                  dot={{ fill: "#a5a5ab", r: 4 }} activeDot={{ r: 6 }} isAnimationActive={false} />
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
            <ResponsiveContainer width="100%" height={220}>
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
            <h2 className="admin-card-title">나이대 · 성별 분포</h2>
          </div>
          <div style={{ padding: "16px 8px", position: "relative" }}>
            <span style={unitLabelStyle}>명</span>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={demographics} margin={CHART_MARGIN}>
                <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 13 }} allowDecimals={false} />
                <Tooltip formatter={(v) => [`${v}명`, ""]} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 13 }}>{v}</span>} />
                <Bar dataKey="남성" stackId="a" fill="#0ea5e9" maxBarSize={48} />
                <Bar dataKey="여성" stackId="a" fill="#ec4899" maxBarSize={48} />
                <Bar dataKey="미입력" stackId="a" fill="#e3e3e6" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <PieCard title="프로필 직군 분포" data={userDist} unit="명" colors={PIE_COLORS} caption="회원 수 (명)" />
      </div>

      </div>
    </AdminLayout>
  );
}
