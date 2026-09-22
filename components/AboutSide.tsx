"use client";
import Link from "next/link";

/**
 * 회사 정보 옆줄 — 회사 소개.
 *
 * 머리줄 탭이던 것을 옆으로 내린다. 고객센터 옆줄(InfoSide)과 같은 모양을 쓰는
 * 까닭은 둘이 같은 성격의 화면이기 때문이다 — 서비스를 쓰다가 잠깐 들르는 곳,
 * 옆줄로 다니는 곳. 아래에 딸린 것이 없어 화살표도 점도 없다.
 *
 * 사업문의는 여기 있었는데, 문의 채널이라는 성격상 고객센터 옆줄(InfoSide)의
 * 온라인 문의 밑으로 옮겼다(2026-09-22).
 */
const 메뉴 = [
  { href: "/about", label: "회사 소개" },
];

export default function AboutSide({ active }: { active: string }) {
  return (
    <nav className="info-side" aria-label="회사 정보 메뉴">
      {메뉴.map((m) => (
        <div key={m.href} className="info-side-branch">
          <Link href={m.href} className={`info-side-i${active === m.href ? " on" : ""}`}>
            {m.label}
          </Link>
        </div>
      ))}
    </nav>
  );
}
