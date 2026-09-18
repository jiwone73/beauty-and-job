"use client";
import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import InfoHeader from "@/components/InfoHeader";
import InfoSide from "@/components/InfoSide";

/**
 * 고객센터 화면 한 벌 — 머리줄 · 개인/기업 탭 · 옆줄 · 본문.
 *
 * 네 화면이 같은 판을 쓰므로 판을 한 곳에 둔다. 전에는 화면마다 머리줄과
 * 옆줄을 따로 적어서, 한 곳을 고치면 나머지 셋이 남았다.
 *
 * 보는 사람(개인·기업)은 주소에 남긴다(?누구=). 눌러서 바뀌는 상태로 두면
 * 새로고침하거나 링크를 받아 들어온 사람이 늘 개인회원 화면부터 본다.
 */
export function 누구읽기(sp: URLSearchParams): "개인" | "기업" {
  return sp.get("누구") === "기업" ? "기업" : "개인";
}

function 속({ active, title, children }: {
  active: string; title: string; children: ReactNode;
}) {
  const 누구 = 누구읽기(useSearchParams());
  const 길 = usePathname();

  return (
    <>
      <div className="info-tabs" role="tablist">
        {(["개인", "기업"] as const).map((누가) => (
          <Link key={누가} href={`${길}?누구=${누가}`} role="tab"
                aria-selected={누구 === 누가}
                className={`info-tab${누구 === 누가 ? " on" : ""}`}>
            {누가}회원
          </Link>
        ))}
      </div>
      <div className="info-layout">
        <InfoSide active={active} 누구={누구} />
        <div className="info-body">
          <h1 className="info-page-title">{title}</h1>
          {children}
        </div>
      </div>
    </>
  );
}

export default function InfoShell({ active, title, children }: {
  /** 옆줄에서 켤 항목의 href */
  active: string;
  /** 본문 제목 */
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="info-page">
      <InfoHeader />
      <main className="info-main">
        <Suspense fallback={null}>
          <속 active={active} title={title}>{children}</속>
        </Suspense>
      </main>
    </div>
  );
}
