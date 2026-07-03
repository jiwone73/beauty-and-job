"use client";
import Link from "next/link";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/about", label: "회사 소개" },
  { href: "/about/recruit", label: "채용" },
  { href: "/about/partnership", label: "제휴 문의" },
  { href: "/about/advertise", label: "광고 문의" },
  { href: "/about/contact", label: "기타 문의" },
];

// active: 현재 페이지 nav href를 넘기면 해당 탭에 active 표시
export default function AboutHeader({ active }: { active: string }) {
  return (
    <>
      <header className="info-header">
        <div className="info-header-inner">
          <Link href="/" className="logo">
            <Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority />
          </Link>
        </div>
      </header>
      <div className="info-nav">
        <div className="info-nav-inner">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`info-nav-item${active === item.href ? " active" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}