"use client";
import { useState, useEffect } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import Link from "next/link";
import { fmtNum } from "@/components/admin/DashboardParts";

/**
 * 관리자 대시보드.
 *
 * 「지금 어떤가」 한 판으로 끝낸다. 개인·기업을 매장/본사로 갈라 보거나 추이를
 * 살피는 일은 사이드 「대시보드」 아래 두 화면이 맡는다 — 한 화면에 다 쌓으니
 * 스크롤이 끝없이 길어졌다.
 *
 * 카드는 기업 대시보드의 카운터(.co-counts)와 같은 부품이다. 두 화면이 같은
 * 일을 하는데 생김새가 달라 손이 두 번 익어야 했다.
 */
export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    fetch(`/api/admin/dashboard/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setStats(res.data); })
      .catch(console.error);
  }, []);

  const c = stats?.counts;

  return (
    <AdminLayout activeMenu="dashboard">
      <div>
      <div className="co-counts" style={{ ["--co-counts-n" as any]: 6 }}>
        {[
          // 개인이 늘면 기업을 불러와야 하고, 기업이 늘면 구직자를 불러와야 한다.
          // 합쳐 놓으면 어느 쪽이 모자란지가 가려져 할 일이 안 보인다.
          { label: "개인회원", value: fmtNum(c?.total_users), href: "/admin/dashboard/users" },
          { label: "기업회원", value: fmtNum(c?.total_companies), href: "/admin/dashboard/companies" },
          { label: "진행중 채용공고", value: fmtNum(c?.active_jobs), href: "/admin/jobs?status=active" },
          { label: "오늘 지원수", value: fmtNum(c?.today_applications), href: "/admin/resumes/applications?date=today" },
          // 승인 대기는 관리자가 손대야 풀리는 것이라 빨강으로 선다.
          { label: "승인 대기 기업", value: fmtNum(c?.pending_companies), href: "/admin/members/companies?status=pending", 할일: true },
          { label: "오늘 방문자", value: fmtNum(c?.today_visitors) },
        ].map((stat) => {
          const 속 = (
            <>
              <span className="co-count-label">{stat.label}</span>
              <span className="co-count-value">{stat.value}</span>
            </>
          );
          const 켬 = stat.할일 && Number(String(stat.value).replace(/[^0-9]/g, "") || 0) > 0;
          return stat.href ? (
            <Link key={stat.label} href={stat.href} className={`co-count${켬 ? " todo" : ""}`}
              style={{ textDecoration: "none" }}>
              {속}
            </Link>
          ) : (
            <div key={stat.label} className="co-count" style={{ cursor: "default" }}>{속}</div>
          );
        })}
      </div>
      </div>
    </AdminLayout>
  );
}
