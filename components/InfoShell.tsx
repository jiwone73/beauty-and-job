"use client";
import { type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import InfoHeader from "@/components/InfoHeader";
import InfoSide from "@/components/InfoSide";

/**
 * 고객센터 화면 한 벌 — 머리줄 · 옆줄 · 본문.
 *
 * 네 화면이 같은 판을 쓰므로 판을 한 곳에 둔다. 전에는 화면마다 머리줄과
 * 옆줄을 따로 적어서, 한 곳을 고치면 나머지 셋이 남았다.
 *
 * 개인·기업 탭이 옆줄 위에 있던 때가 있다. 갈리는 것은 FAQ 뿐인데(공지·문의·
 * 다운로드는 누구에게나 같다) 고객센터 전체에 걸린 탭으로 보여, 나머지 셋도
 * 사람마다 다른 줄 읽혔다. 그 갈림은 FAQ 판 안으로 돌려보냈다.
 */
export function 누구읽기(sp: URLSearchParams): "개인" | "기업" {
  return sp.get("누구") === "기업" ? "기업" : "개인";
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
        <div className="info-layout">
          <InfoSide active={active} />
          <div className="info-body">
            <h1 className="info-page-title">{title}</h1>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
