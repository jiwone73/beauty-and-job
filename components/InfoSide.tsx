"use client";
import Link from "next/link";

/**
 * 고객센터 옆줄.
 *
 * 머리줄 탭이던 것을 옆으로 내렸다. 탭은 한 줄에 다 서야 해서 항목이 늘면
 * 글자를 줄이거나 버려야 한다.
 *
 * FAQ 아래에 개인회원·기업회원을 접어 두었던 때가 있다. 지금은 그 갈림이
 * 고객센터 전체에 걸리는 일이라 위쪽 탭으로 올렸다 — 공지도 FAQ도 보는
 * 사람에 따라 내용이 다르다.
 *
 * 이용약관·개인정보처리방침은 여기 두지 않는다. 궁금해서 찾아오는 곳이
 * 아니라 확인하러 오는 곳이고, 그 길은 푸터가 맡는다.
 */
export default function InfoSide({ active, 누구 }: {
  /** 지금 서 있는 자리. 메뉴 href 와 맞춘다. */
  active: string;
  누구: "개인" | "기업";
}) {
  const 메뉴 = [
    { href: "/notice", label: "공지사항" },
    { href: "/support/faq", label: "FAQ" },
    { href: "/support", label: "1:1 문의", 더: { 문의: "1" } as Record<string, string> },
    // 내려받을 것이 이력서 양식뿐이라 기업회원에게는 빈 화면이 된다.
    ...(누구 === "개인" ? [{ href: "/support/download", label: "다운로드" }] : []),
  ];

  const 주소 = (m: { href: string; 더?: Record<string, string> }) => {
    const p = new URLSearchParams({ 누구, ...(m.더 ?? {}) });
    return `${m.href}?${p.toString()}`;
  };

  return (
    <nav className="info-side" aria-label="고객센터 메뉴">
      <ul>
        {메뉴.map((m) => (
          <li key={m.href}>
            <Link href={주소(m)} className={`info-side-i${active === m.href ? " on" : ""}`}>
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
