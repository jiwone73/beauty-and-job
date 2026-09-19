"use client";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

/**
 * 고객센터 옆줄.
 *
 * 머리줄 탭이던 것을 옆으로 내렸다. 탭은 한 줄에 다 서야 해서 항목이 늘면
 * 글자를 줄이거나 버려야 한다.
 *
 * 아래에 딸린 것이 있는 항목은 오른쪽에 화살표를, 딸린 줄에는 점을 찍는다.
 * 접히지는 않는다 — 기업 화면 옆줄과 같은 짜임이다.
 *
 * 이용약관·개인정보처리방침은 여기 두지 않는다. 궁금해서 찾아오는 곳이
 * 아니라 확인하러 오는 곳이고, 그 길은 푸터가 맡는다.
 */
type 줄 = { href: string; label: string; 주소?: string };

const 메뉴: { 머리: 줄; 아래: 줄[] }[] = [
  { 머리: { href: "/notice", label: "공지사항" }, 아래: [] },
  { 머리: { href: "/support/policy", label: "회원정책" }, 아래: [] },
  { 머리: { href: "/support/guide", label: "사용가이드" }, 아래: [
      { href: "/support/guide", label: "개인회원", 주소: "/support/guide?누구=개인" },
      { href: "/support/guide", label: "기업회원", 주소: "/support/guide?누구=기업" },
    ] },
  { 머리: { href: "/support/faq", label: "자주 묻는 질문" }, 아래: [
      { href: "/support/faq", label: "개인회원", 주소: "/support/faq?누구=개인" },
      { href: "/support/faq", label: "기업회원", 주소: "/support/faq?누구=기업" },
    ] },
  { 머리: { href: "/support", label: "1:1 문의하기" }, 아래: [] },
  { 머리: { href: "/support/download", label: "다운로드" }, 아래: [] },
];

export default function InfoSide({ active, 누구 }: {
  /** 지금 서 있는 자리. 메뉴 href 와 맞춘다. */
  active: string;
  /** 갈래가 있는 화면에서 지금 보고 있는 쪽 */
  누구?: "개인" | "기업";
}) {
  return (
    <nav className="info-side" aria-label="고객센터 메뉴">
      {메뉴.map(({ 머리, 아래 }) => (
        <div key={머리.href} className="info-side-branch">
          <Link href={머리.주소 ?? 머리.href}
                className={`info-side-i${아래.length ? " head" : ""}${active === 머리.href ? " on" : ""}`}>
            {머리.label}
            {아래.length > 0 && <ChevronDown size={15} aria-hidden="true" />}
          </Link>
          {아래.map((m) => (
            <Link key={m.label} href={m.주소 ?? m.href}
                  className={`info-side-i sub${active === 머리.href && 누구 === m.label.slice(0, 2) ? " on" : ""}`}>
              {m.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
