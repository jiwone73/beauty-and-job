"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronDown, ChevronUp, CheckCircle2, XCircle, ArrowRight } from "lucide-react";

const COMPARE = [
  { label: "공고 노출",     free: "일반",     premium: "상단 고정 ⭐", matching: "일반" },
  { label: "AI 후보자 추천", free: false,      premium: false,          matching: true  },
  { label: "담당자 매칭",   free: false,      premium: false,          matching: true  },
  { label: "면접 연결",     free: false,      premium: false,          matching: true  },
  { label: "공고 비용",     free: "무료",     premium: "5만원~",       matching: "무료" },
  { label: "수수료",        free: "없음",     premium: "없음",         matching: "채용 시" },
];

const PROCESS = [
  { step: "01", icon: "📋", title: "공고 등록",       desc: "무료로 채용공고를 등록합니다.
직군·근무조건·급여 등 상세히 작성할수록 매칭 정확도가 높아져요." },
  { step: "02", icon: "🤖", title: "AI 후보자 매칭",  desc: "뷰티앤잡 AI가 DB에서 조건에 맞는
후보자를 자동으로 탐색·추천합니다." },
  { step: "03", icon: "📨", title: "후보자 제안",      desc: "담당자가 후보자 프로필을 기업에 제안합니다.
검토 후 면접 진행 여부를 결정해 주세요." },
  { step: "04", icon: "🤝", title: "면접·채용 확정",  desc: "면접 일정을 조율하고
채용이 확정되면 알려주세요." },
  { step: "05", icon: "💳", title: "수수료 청구",      desc: "채용 확정 후 수수료가 발생합니다.
채용이 성사되지 않으면 비용은 없습니다." },
];

const FEES = [
  {
    type: "매장직",
    icon: "🏪",
    desc: "헤어디자이너, 네일아티스트, 피부관리사,
에스테틱, 왁싱, 속눈썹 등 현장 매장직",
    fee: "30만원",
    feeDesc: "채용 확정 1인당 고정",
    tags: ["헤어디자이너", "네일아티스트", "피부관리사", "에스테틱", "속눈썹", "왁싱"],
  },
  {
    type: "기업 사무직",
    icon: "🏢",
    desc: "마케팅, MD, 브랜드, 영업, HR,
콘텐츠, 병원 코디네이터 등 본사·전문직",
    fee: "연봉의 8%",
    feeDesc: "채용 확정 시 세전 연봉 기준",
    tags: ["뷰티MD", "브랜드마케터", "영업관리", "교육강사", "콘텐츠마케터", "병원 코디네이터"],
  },
];

const FAQS = [
  { q: "채용이 안 되면 정말 비용이 없나요?", a: "네, 맞습니다. 채용 성사 시에만 수수료가 발생하며, 공고 등록·후보자 추천·면접 연결까지 모두 무료입니다." },
  { q: "AI 매칭은 어떻게 작동하나요?", a: "등록된 공고의 직군·경력·지역·급여 조건을 분석해 DB 내 후보자와 자동 매칭합니다. 매칭 점수가 높은 순으로 담당자가 검토 후 제안합니다." },
  { q: "일반 무료공고와 동시에 진행할 수 있나요?", a: "네, 가능합니다. 같은 공고로 일반 지원자도 받으면서 동시에 매칭 서비스도 이용할 수 있습니다." },
  { q: "프리미엄 상단공고와 함께 쓸 수 있나요?", a: "물론입니다. 상단 노출로 지원자 유입을 늘리면서 동시에 AI 매칭으로 적합 후보자를 추천받는 방식으로 채용 속도를 높일 수 있습니다." },
  { q: "수수료는 언제 납부하나요?", a: "채용 확정(근로계약서 서명 또는 출근 확정) 후 세금계산서를 발행합니다. 계좌이체로 납부하시면 됩니다." },
  { q: "채용 후 조기 퇴사 시 수수료는 환불되나요?", a: "입사 후 1개월 이내 퇴사 시 50% 환불, 2주 이내 퇴사 시 전액 환불합니다. 이후 동일 포지션 재매칭은 무료로 진행합니다." },
];

export default function MatchingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="mat-page">
      {/* 헤더 */}
      <header className="ads-header">
        <div className="ads-header-inner">
          <Link href="/company" className="ads-back">
            <ChevronLeft size={18} /> 기업서비스
          </Link>
          <Link href="/">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={110} height={30} />
          </Link>
          <div style={{ width: 80 }} />
        </div>
      </header>

      {/* 히어로 */}
      <section className="mat-hero">
        <span className="mat-badge">채용성공형 매칭</span>
        <h1 className="mat-hero-title">
          채용이 될 때만<br />
          <span className="mat-hero-point">수수료를 냅니다</span>
        </h1>
        <p className="mat-hero-desc">
          공고 등록부터 AI 후보자 추천·면접 연결까지 무료.<br />
          채용이 확정된 순간에만 수수료가 발생합니다.
        </p>
        <div className="mat-hero-chips">
          <span>✅ 공고 등록 무료</span>
          <span>✅ AI 후보자 추천</span>
          <span>✅ 면접 연결 지원</span>
          <span>✅ 채용 실패 시 0원</span>
        </div>
        <Link href="/company/signup" className="mat-hero-btn">
          무료로 채용 의뢰하기 <ArrowRight size={16} />
        </Link>
      </section>

      {/* 비교표 */}
      <section className="mat-section">
        <div className="mat-inner">
          <h2 className="mat-section-title">어떤 점이 다른가요?</h2>
          <p className="mat-section-sub">채용성공형 매칭은 일반 공고와 함께 쓸 수 있습니다</p>
          <div className="mat-compare-wrap">
            <table className="mat-compare-table">
              <thead>
                <tr>
                  <th></th>
                  <th>무료공고</th>
                  <th>프리미엄 공고</th>
                  <th className="mat-col-highlight">채용성공형 매칭</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map((row, i) => (
                  <tr key={i}>
                    <td className="mat-compare-label">{row.label}</td>
                    <td className="mat-compare-val">
                      {typeof row.free === "boolean"
                        ? row.free ? <CheckCircle2 size={16} className="mat-icon-yes" /> : <XCircle size={16} className="mat-icon-no" />
                        : row.free}
                    </td>
                    <td className="mat-compare-val">
                      {typeof row.premium === "boolean"
                        ? row.premium ? <CheckCircle2 size={16} className="mat-icon-yes" /> : <XCircle size={16} className="mat-icon-no" />
                        : row.premium}
                    </td>
                    <td className="mat-compare-val mat-col-highlight">
                      {typeof row.matching === "boolean"
                        ? row.matching ? <CheckCircle2 size={16} className="mat-icon-yes" /> : <XCircle size={16} className="mat-icon-no" />
                        : <strong>{row.matching}</strong>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 프로세스 */}
      <section className="mat-section gray">
        <div className="mat-inner">
          <h2 className="mat-section-title">진행 프로세스</h2>
          <p className="mat-section-sub">5단계로 간단하게 진행됩니다</p>
          <div className="mat-process">
            {PROCESS.map((p, i) => (
              <div key={i} className="mat-process-item">
                <div className="mat-process-top">
                  <span className="mat-process-num">{p.step}</span>
                  <span className="mat-process-icon">{p.icon}</span>
                  {i < PROCESS.length - 1 && <div className="mat-process-line" />}
                </div>
                <h3 className="mat-process-title">{p.title}</h3>
                <p className="mat-process-desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 수수료 안내 */}
      <section className="mat-section">
        <div className="mat-inner">
          <h2 className="mat-section-title">수수료 안내</h2>
          <p className="mat-section-sub">채용이 확정된 경우에만 청구됩니다</p>
          <div className="mat-fee-grid">
            {FEES.map((f, i) => (
              <div key={i} className="mat-fee-card">
                <div className="mat-fee-header">
                  <span className="mat-fee-icon">{f.icon}</span>
                  <h3 className="mat-fee-type">{f.type}</h3>
                </div>
                <p className="mat-fee-desc">{f.desc}</p>
                <div className="mat-fee-amount">
                  <strong>{f.fee}</strong>
                  <span>{f.feeDesc}</span>
                </div>
                <div className="mat-fee-tags">
                  {f.tags.map((t) => (
                    <span key={t} className="mat-fee-tag">{t}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mat-fee-note">
            <p>💡 입사 후 <strong>2주 이내 퇴사 시 전액 환불</strong>, 1개월 이내 퇴사 시 50% 환불 + 재매칭 무료</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mat-section gray">
        <div className="mat-inner">
          <h2 className="mat-section-title">자주 묻는 질문</h2>
          <div className="ads-faq-list">
            {FAQS.map((faq, i) => (
              <div key={i}
                className={`ads-faq-item ${openFaq === i ? "open" : ""}`}
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <div className="ads-faq-q">
                  <span>Q. {faq.q}</span>
                  {openFaq === i ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                </div>
                {openFaq === i && <p className="ads-faq-a">{faq.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 하단 CTA */}
      <section className="mat-cta">
        <div className="mat-inner" style={{ textAlign: "center" }}>
          <h2 className="mat-cta-title">지금 바로 채용 의뢰를 시작하세요</h2>
          <p className="mat-cta-desc">
            채용이 될 때까지 비용은 없습니다.<br />
            기업회원 가입 후 공고를 등록하면 매칭이 시작됩니다.
          </p>
          <div className="mat-cta-btns">
            <Link href="/company/signup" className="mat-cta-btn primary">
              무료로 채용 의뢰하기 <ArrowRight size={16} />
            </Link>
            <a href="mailto:match@beautynjob.com" className="mat-cta-btn outline">
              📩 매칭 서비스 문의
            </a>
          </div>
          <p className="mat-cta-email">문의: match@beautynjob.com · 담당자 1 영업일 내 회신</p>
        </div>
      </section>
    </div>
  );
}
