"use client";
import Link from "next/link";

/**
 * 고객센터 사이드 메뉴.
 *
 * 머리줄 탭이던 것을 옆으로 내린다. 탭은 한 줄에 다 서야 해서 항목이 늘면
 * 글자를 줄이거나 버려야 하는데, 옆줄은 하위 항목까지 품을 수 있다 —
 * FAQ 아래에 개인회원·기업회원을 접지 않고 그대로 펼쳐 둔다.
 *
 * 이용약관·개인정보처리방침은 여기 두지 않는다. 궁금해서 찾아오는 곳이
 * 아니라 확인하러 오는 곳이고, 그 길은 푸터가 맡는다.
 */
const 메뉴: { href: string; label: string; 아래?: { href: string; label: string }[] }[] = [
  { href: "/notice", label: "공지사항" },
  {
    href: "/support/faq",
    label: "FAQ",
    아래: [
      { href: "/support/faq?누구=개인", label: "개인회원" },
      { href: "/support/faq?누구=기업", label: "기업회원" },
    ],
  },
  { href: "/support?문의=1", label: "1:1 문의" },
  { href: "/support/download", label: "다운로드" },
];

export default function InfoSide({ active, 아래활성 }: {
  /** 지금 서 있는 자리. 메뉴 href 와 맞춘다. */
  active: string;
  /** FAQ 안에서 개인·기업 중 어느 쪽인지 */
  아래활성?: string;
}) {
  return (
    <nav className="info-side" aria-label="고객센터 메뉴">
      <p className="info-side-t">고객센터</p>
      <ul>
        {메뉴.map((m) => (
          <li key={m.href}>
            <Link href={m.href} className={`info-side-i${active === m.href ? " on" : ""}`}>
              {m.label}
            </Link>
            {m.아래 && (
              <ul className="info-side-sub">
                {m.아래.map((s) => (
                  <li key={s.href}>
                    <Link href={s.href}
                          className={`info-side-s${아래활성 === s.label ? " on" : ""}`}>
                      {s.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}
