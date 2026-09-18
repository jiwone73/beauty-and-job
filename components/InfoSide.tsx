"use client";
import Link from "next/link";

/**
 * 고객센터 옆줄.
 *
 * 머리줄 탭이던 것을 옆으로 내렸다. 탭은 한 줄에 다 서야 해서 항목이 늘면
 * 글자를 줄이거나 버려야 한다.
 *
 * 개인·기업 갈림은 여기 두지 않는다. FAQ 하나에만 걸리는 일이라 그 판 안에
 * 있다 — 옆줄이나 위쪽 탭에 세우면 공지·문의·다운로드도 사람마다 다른 줄 읽힌다.
 *
 * 이용약관·개인정보처리방침은 여기 두지 않는다. 궁금해서 찾아오는 곳이
 * 아니라 확인하러 오는 곳이고, 그 길은 푸터가 맡는다.
 */
export default function InfoSide({ active }: {
  /** 지금 서 있는 자리. 메뉴 href 와 맞춘다. */
  active: string;
}) {
  const 메뉴 = [
    { href: "/notice", label: "공지사항" },
    { href: "/support/policy", label: "회원정책" },
    { href: "/support/guide", label: "사용가이드" },
    { href: "/support/faq", label: "자주 묻는 질문" },
    { href: "/support", label: "1:1 문의하기", 주소: "/support?문의=1" },
    { href: "/support/download", label: "다운로드" },
  ];

  return (
    <nav className="info-side" aria-label="고객센터 메뉴">
      <ul>
        {메뉴.map((m) => (
          <li key={m.href}>
            <Link href={m.주소 ?? m.href} className={`info-side-i${active === m.href ? " on" : ""}`}>
              {m.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
