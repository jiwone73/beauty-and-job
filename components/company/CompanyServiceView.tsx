"use client";

import { useState } from "react";
import Link from "next/link";
import ServiceHeader from "@/components/company/ServiceHeader";
import type { 기업이벤트 } from "@/lib/companyEvent.server";
import { useAuthStore } from "@/lib/store/authStore";
import {
  Scissors, FileText, Users, Wallet, ArrowRight, CalendarDays, ChevronRight,
} from "lucide-react";
import EventDetail from "@/components/company/EventDetail";

/**
 * 기업 서비스 소개.
 *
 * 배너와 이벤트, 둘뿐이다. 지금 이 서비스를 쓸 이유가 이벤트 하나라, 직군·
 * 서비스 안내·포부를 그 앞에 세워 두면 정작 볼 것이 밀린다. 그런 것들은 상품
 * 안내와 고객센터가 이미 맡고 있다.
 *
 * 이벤트가 끝나 공지를 내리면 배너도 이벤트도 사라지고 히어로의 강점 넷만
 * 남는다 — 그때 이 화면을 다시 채울지 정하면 된다.
 *
 * 클래스는 cs- 로 새로 뗀다. 기존 co- 는 기업 대시보드와 공고 등록 폼이
 * 아직 쓰고 있어 건드리면 그쪽이 깨진다.
 */

/**
 * 히어로 아래 띠 — 지금 우리가 실제로 하는 것만 적는다.
 *
 * 전에는 「검증된 인재 DB 보유」·「맞춤형 인재추천」·「합리적인 비용」이 적혀
 * 있었다. 우리는 인재를 검증하지 않고, 추천 기능은 아직 돌지 않으며, 값이
 * 싸다는 근거도 없다. 광고 문장은 첫 거짓말이 드러나는 순간 나머지도 같이
 * 못 믿게 만든다.
 *
 * 남긴 넷은 지금 화면에서 그대로 확인되는 것들이다.
 */
const 히어로강점 = [
  { Icon: Scissors, name: "뷰티 채용 전문", sub: "매장부터 브랜드·제조·유통·교육까지" },
  { Icon: FileText, name: "공고 건수 제한 없음", sub: "몇 건을 올리셔도 값이 같습니다" },
  { Icon: Users, name: "지원자는 이용권 없이", sub: "이력서와 연락처를 그대로 봅니다" },
  { Icon: Wallet, name: "자동 결제 없음", sub: "기간이 끝나면 그대로 끝납니다" },
];

export default function CompanyServiceView({ 이벤트 }: { 이벤트: 기업이벤트 | null }) {
  // 로그인 상태를 보고 단추가 갈 곳을 정한다. 이 화면은 그동안 로그인 여부를
  // 아예 보지 않아, 이미 가입한 사장님도 가입 화면으로 떨어졌다.
  const { isLoggedIn, ownerType } = useAuthStore();
  const 기업인가 = isLoggedIn && ownerType === "company";
  const [열린질문, set열린질문] = useState<number | null>(null);

  return (
    <div className="cs-page">
      {/* ── 헤더 ── */}
      <ServiceHeader />

      {/* ── 히어로 ── */}
      <section className="cs-hero" id="소개">
        {/* 이벤트 중에는 이벤트 그림이 선다. 원래 사진에는 지어낸 숫자
            (지원자 248명·채용 성공률 73%)가 박혀 있어, 이벤트가 끝나면 그
            사진으로 돌아가기 전에 갈아야 한다. */}
        <div className={`cs-hero-photo${이벤트 ? " evt" : ""}`} aria-hidden />
        <div className="cs-hero-in">
          {이벤트 && <p className="cs-hero-eyebrow">BEAUTYWORK OPEN EVENT</p>}
          <h1 className="cs-hero-t">
            {이벤트
              ? <>{이벤트.short_title || 이벤트.title}</>
              : <>뷰티 인재 채용,<br /><b>뷰티워크</b>에서 시작하세요</>}
          </h1>
          <p className="cs-hero-d">
            {이벤트
              ? <>선착순 메인·검색 상단 노출로<br />더 많은 인재와 빠르게 연결됩니다.</>
              : <>헤어·네일·피부·메이크업 매장부터 화장품 브랜드, 제조, 유통, 교육기관 채용까지<br />
                  모두 뷰티워크에서 만나보세요.</>}
          </p>
          {이벤트?.기간 && (
            <p className="cs-hero-when"><CalendarDays size={17} />{이벤트.기간}</p>
          )}
          <div className="cs-hero-btns">
            <Link href={기업인가 ? "/company/dashboard/jobs/new" : "/company/signup"}
                  className="cs-btn-fill lg">
              {기업인가 ? "공고 등록하기" : "1개월 무료로 시작하기"} <ChevronRight size={17} />
            </Link>
            <Link href="/company/plans" className="cs-btn-line lg">
              상품안내 보기 <ChevronRight size={17} />
            </Link>
          </div>

          {!이벤트 && (
            <ul className="cs-hero-pts">
              {히어로강점.map(({ Icon, name, sub }) => (
                <li key={name}>
                  <Icon size={22} strokeWidth={1.7} />
                  <span><b>{name}</b>{sub}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* 배너 아래는 이벤트가 전부다. 지금 이 서비스를 쓸 이유가 그것이라
          직군·서비스 안내·포부를 그 앞에 세워 두면 정작 볼 것이 밀린다.
          이벤트가 없으면 아무것도 그리지 않는다 — 그때는 히어로의 강점 넷이
          화면을 맡는다. */}
      {이벤트 && (
        <section className="cs-wrap">
          <EventDetail 머리숨김 />
        </section>
      )}

    </div>
  );
}
