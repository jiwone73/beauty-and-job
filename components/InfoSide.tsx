"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

/**
 * 고객센터 옆줄.
 *
 * 머리줄 탭이던 것을 옆으로 내렸다. 탭은 한 줄에 다 서야 해서 항목이 늘면
 * 글자를 줄이거나 버려야 한다.
 *
 * 아래에 딸린 것이 있는 항목은 오른쪽에 화살표를, 딸린 줄에는 점을 찍는다.
 * 처음에는 다 펴져 있고, 화살표를 누르면 접힌다. 머리 글자를 누르면 그
 * 화면으로 간다 — 접는 일과 가는 일을 한 자리에 두면 무엇이 일어날지
 * 누르기 전에 알 수 없다.
 *
 * 이용약관·개인정보처리방침은 여기 두지 않는다. 궁금해서 찾아오는 곳이
 * 아니라 확인하러 오는 곳이고, 그 길은 푸터가 맡는다.
 */
/** 매칭: 페이지 자체가 갈리는 하위 항목(회원정책처럼)은 이 값을 active 와
 *  그대로 견준다. 없으면 예전처럼(FAQ) 누구 값으로 견준다. */
type 줄 = { href: string; label: string; 주소?: string; 매칭?: string };

const 메뉴: { 머리: 줄; 아래: 줄[] }[] = [
  { 머리: { href: "/notice", label: "공지사항" }, 아래: [] },
  { 머리: { href: "/support/policy", label: "운영정책" }, 아래: [
      { href: "/support/policy", label: "회원관리정책", 매칭: "/support/policy" },
      { href: "/support/policy/refund", label: "상품 환불정책", 매칭: "/support/policy/refund" },
    ] },
  { 머리: { href: "/support/faq", label: "FAQ" }, 아래: [
      { href: "/support/faq", label: "개인회원", 주소: "/support/faq?누구=개인" },
      { href: "/support/faq", label: "기업회원", 주소: "/support/faq?누구=기업" },
    ] },
  { 머리: { href: "/support/info", label: "고객센터 안내" }, 아래: [] },
  { 머리: { href: "/support", label: "1:1 문의하기" }, 아래: [] },
  { 머리: { href: "/support/download", label: "다운로드" }, 아래: [] },
];

export default function InfoSide({ active, 누구 }: {
  /** 지금 서 있는 자리. 메뉴 href 와 맞춘다. */
  active: string;
  /** 갈래가 있는 화면에서 지금 보고 있는 쪽 */
  누구?: "개인" | "기업";
}) {
  // 접은 것만 적어 둔다 — 처음에는 다 펴져 있다.
  const [접은것, set접은것] = useState<string[]>([]);
  const 접기 = (href: string) =>
    set접은것((앞) => (앞.includes(href) ? 앞.filter((x) => x !== href) : [...앞, href]));

  return (
    <nav className="info-side" aria-label="고객센터 메뉴">
      {메뉴.map(({ 머리, 아래 }) => {
        const 접힘 = 접은것.includes(머리.href);
        // 하위 페이지가 실제로 갈리는 경우(회원정책), 그중 하나에 서 있어도
        // 부모 항목이 켜져 보여야 한다.
        const 머리켜짐 = active === 머리.href || 아래.some((m) => m.매칭 === active);
        return (
          <div key={머리.href} className="info-side-branch">
            <div className={아래.length ? "info-side-row" : undefined}>
              <Link href={머리.주소 ?? 머리.href}
                    className={`info-side-i${아래.length ? " head" : ""}${머리켜짐 ? " on" : ""}`}>
                {머리.label}
              </Link>
              {아래.length > 0 && (
                <button type="button" className="info-side-fold" onClick={() => 접기(머리.href)}
                        aria-expanded={!접힘} aria-label={`${머리.label} ${접힘 ? "펴기" : "접기"}`}>
                  <ChevronDown size={15} style={{ transform: 접힘 ? "rotate(-90deg)" : "none" }} />
                </button>
              )}
            </div>
            {!접힘 && 아래.map((m) => (
              <Link key={m.label} href={m.주소 ?? m.href}
                    className={`info-side-i sub${(m.매칭 ? active === m.매칭 : (active === 머리.href && 누구 === m.label.slice(0, 2))) ? " on" : ""}`}>
                {m.label}
              </Link>
            ))}
          </div>
        );
      })}
    </nav>
  );
}
