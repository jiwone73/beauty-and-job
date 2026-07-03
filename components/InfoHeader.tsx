"use client";
import Link from "next/link";
import Image from "next/image";

const NAV_ITEMS = [
  { href: "/support", label: "고객센터" },
  { href: "/notice", label: "공지사항" },
  { href: "/support/faq", label: "자주 묻는 질문" },
  { href: "/support/terms", label: "이용약관" },
  { href: "/support/privacy", label: "개인정보처리방침" },
];

// active: 현재 페이지에 해당하는 nav href를 넘기면 그 탭에 active 표시
export default function InfoHeader({ active }: { active: string }) {
  return (
    <>
      <header className="info-header">
        <Link href="/">
          <Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority />
        </Link>
      </header>
      <div className="info-nav">
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
    </>
  );
}