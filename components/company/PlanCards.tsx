"use client";

import { useEffect, useState } from "react";
import { Zap, Star, Crown } from "lucide-react";
import Link from "next/link";
import { use기업CTA } from "@/lib/companyCta";
import { 플랜, 스타트, 혜택, 비교칸, 대표기간, 원, 준비중, type PlanId } from "@/lib/companyPlans";

/**
 * 요금제 카드 넉 장. 기업서비스 첫 화면과 요금제 화면이 같은 것을 쓴다.
 *
 * 카드 하나가 곧 그 플랜의 설명서다. 비교표를 따로 세우면 카드에서 고르려던
 * 사람이 표까지 내려가 처음부터 다시 비교하게 된다.
 *
 * 없는 기능은 적지 않는다. 낮은 플랜 것부터 쌓아 적으므로 빠진 줄은 반드시
 * 뒤쪽에만 생기고, 그래서 넉 장의 앞줄이 저절로 가로로 맞는다.
 *
 * 값은 제일 짧은 기간(7일)을 적고 뒤에 「~」를 붙인다. 30일 값을 적어 두면
 * 제일 싼 것이 얼마인지 알려면 눌러 봐야 한다.
 */

const 카드순서: PlanId[] = ["LIGHT", "STANDARD", "PREMIUM"];

/** 파는 물건에만 아이콘을 단다. 스타트는 상품이 아니라 가입하면 놓이는
 *  자리라 아이콘이 없다 — 그 없음이 「이건 사는 것이 아니다」를 말한다.
 *  스탠다드·프리미엄은 메인 채용관 제목에 쓰는 것과 같은 아이콘이다. */
const 아이콘 = { LIGHT: Zap, STANDARD: Star, PREMIUM: Crown } as const;

export function 혜택목록({ 칸 }: { 칸: 0 | 1 | 2 | 3 }) {
  return (
    <ul className="cs-plan-feat">
      {혜택(칸).map((r) => (
        <li key={r.글} className={r.새것 ? "new" : undefined}>{r.글}</li>
      ))}
    </ul>
  );
}

export default function PlanCards({ 안쪽 = false }: {
  /** 기업 대시보드 안에서 보는가. 이미 회원인 사람에게 「시작하기」가
   *  가입 화면으로 가면 안 된다 — 그쪽에는 바로 공고를 거는 길을 준다. */
  안쪽?: boolean;
} = {}) {
  const { 기업인가, 갈곳 } = use기업CTA();
  // 지금 팔 수 있는 상품. 인재 열람을 파는 상품은 이력서가 쌓이기 전에는 팔
  // 물건이 없어 「오픈 준비중」으로 세워 둔다. 켜는 것은 운영 스위치 하나다.
  const [열린것, set열린것] = useState<string[] | null>(null);
  useEffect(() => {
    fetch("/api/plans").then((r) => r.json())
      .then((r) => set열린것(Array.isArray(r?.data?.open) ? r.data.open : []))
      .catch(() => set열린것([]));
  }, []);
  return (
    <>
      <div className="cs-plans">
        <div className="cs-plan">
          <p className="cs-plan-nm">{스타트.name}</p>
          <p className="cs-plan-ln">{스타트.한줄}</p>
          <p className="cs-plan-pr">무료<span className="cs-plan-du free">{스타트.게재일}일 체험</span></p>
          {/* 대시보드 안인지가 아니라 로그인했는지로 정한다. 밖에서도 이미
              가입한 사장님이면 가입 화면이 아니라 공고 등록으로 가야 한다. */}
          <Link href={갈곳} className="cs-plan-btn free">
            {기업인가 ? "공고 등록하기" : "시작하기"}
          </Link>
          <혜택목록 칸={비교칸.BASIC} />
        </div>

        {카드순서.map((p) => {
          const 것 = 플랜[p];
            const 안엶 = 열린것 !== null && !열린것.includes(p);
            return (
            <div key={p} className={`cs-plan${안엶 ? " soon" : ""}`}>
              {안엶 && <span className="cs-plan-soon">{준비중}</span>}
              <p className="cs-plan-nm">
                {(() => { const I = 아이콘[p]; return <I size={17} strokeWidth={2.2} />; })()}
                {것.name}
              </p>
              <p className="cs-plan-ln">{것.한줄}</p>
              <p className="cs-plan-pr">
                {원(것.가격[대표기간]).replace("원", "")}<i>원</i>
                <span className="cs-plan-du">{대표기간}일 기준</span>
              </p>
              {/* 여기서는 고르는 것까지만 한다. 신청은 자세히 보기 안에서 —
                  기간과 값을 보고 나서 누르는 것이 순서다. */}
              {/* 대시보드에서 누르면 대시보드 안의 상세로 간다 — 바깥 화면으로
                  튀어나가면 사이드 메뉴를 잃고 돌아올 길이 머리줄뿐이다. */}
              <Link href={`${안쪽 ? "/company/dashboard/plans" : "/company/plans"}/${p.toLowerCase()}`}
                className="cs-plan-btn">
                자세히 보기
              </Link>
              <혜택목록 칸={비교칸[p]} />
            </div>
          );
        })}
      </div>
      <p className="cs-vat right">부가세 포함</p>
    </>
  );
}
