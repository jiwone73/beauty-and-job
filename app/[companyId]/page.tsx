"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Building2, Briefcase, Users, Settings, BarChart2, Plus } from "lucide-react";

export default function CompanyHomePage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const router = useRouter();

  const menuItems = [
    { icon: <Briefcase size={22} />, label: "채용공고 관리",  desc: "공고 등록·수정·마감",         href: `/company/dashboard/jobs` },
    { icon: <Users     size={22} />, label: "지원자 관리",    desc: "지원자 현황 및 전형 관리",    href: `/company/dashboard/applicants` },
    { icon: <Building2 size={22} />, label: "인재 검색",      desc: "등록된 인재 풀 탐색",         href: `/company/dashboard/talent` },
    { icon: <BarChart2 size={22} />, label: "대시보드",       desc: "채용 현황 통계",              href: `/company/dashboard` },
    { icon: <Settings  size={22} />, label: "기업 설정",      desc: "기업 정보 · 계정 관리",       href: `/company/dashboard/settings` },
  ];

  return (
    <div className="cid-page">
      {/* 헤더 */}
      <div className="cid-header">
        <div className="cid-header-inner">
          <Link href="/" className="cid-logo">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} />
          </Link>
          <div className="cid-account">
            <span className="cid-account-id">@{companyId}</span>
            <Link href="/company/dashboard/settings" className="cid-account-btn">설정</Link>
          </div>
        </div>
      </div>

      <div className="cid-body">
        {/* 기업 프로필 영역 */}
        <div className="cid-profile-card">
          <div className="cid-profile-avatar">
            <Building2 size={36} />
          </div>
          <div className="cid-profile-info">
            <h1 className="cid-profile-name">{companyId}</h1>
            <p className="cid-profile-sub">기업회원 · 뷰티앤잡</p>
          </div>
          <button
            type="button"
            className="cid-post-btn"
            onClick={() => router.push("/company/dashboard/jobs")}
          >
            <Plus size={16} /> 채용공고 등록
          </button>
        </div>

        {/* 빠른 메뉴 */}
        <h2 className="cid-menu-title">서비스 메뉴</h2>
        <div className="cid-menu-grid">
          {menuItems.map((item, i) => (
            <Link key={i} href={item.href} className="cid-menu-card">
              <div className="cid-menu-icon">{item.icon}</div>
              <div className="cid-menu-info">
                <strong>{item.label}</strong>
                <span>{item.desc}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* 안내 배너 */}
        <div className="cid-banner">
          <div>
            <p className="cid-banner-title">📋 첫 채용공고를 등록해 보세요</p>
            <p className="cid-banner-desc">무료로 등록하고 지원자를 받아보세요.</p>
          </div>
          <Link href="/company/dashboard/jobs" className="cid-banner-btn">
            지금 등록하기
          </Link>
        </div>
      </div>
    </div>
  );
}
