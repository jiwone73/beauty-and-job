"use client";
import Link from "next/link";

/**
 * 회사 정보 옆줄 — 회사 소개 · 제휴 문의 · 광고 문의 · 기타 문의.
 *
 * 머리줄 탭이던 것을 옆으로 내린다. 고객센터 옆줄(InfoSide)과 같은 모양을 쓰는
 * 까닭은 둘이 같은 성격의 화면이기 때문이다 — 서비스를 쓰다가 잠깐 들르는 곳,
 * 옆줄로 다니는 곳.
 */
const 메뉴 = [
  { href: "/about", label: "회사 소개" },
  { href: "/about/partnership", label: "제휴 문의" },
  { href: "/about/advertise", label: "광고 문의" },
  { href: "/about/contact", label: "기타 문의" },
];

export default function AboutSide({ active }: { active: string }) {
  return (
    <nav className="info-side" aria-label="회사 정보 메뉴">
      <ul>
        {메뉴.map((m) => (
          <li key={m.href}>
            <Link href={m.href} className={`info-side-i${active === m.href ? " on" : ""}`}>
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
