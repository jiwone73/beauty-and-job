"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, Clock, Share2, Bookmark } from "lucide-react";
import { useState } from "react";
import { INSIGHTS } from "../page";

/* ===== 더미 본문 데이터 ===== */
const CONTENTS: Record<string, string> = {
  "1": `
## K-뷰티, 이제는 글로벌 스탠다드

2025년 뷰티 업계는 그 어느 해보다 빠르게 변화하고 있습니다. K-뷰티가 단순한 트렌드를 넘어 글로벌 스탠다드로 자리 잡으면서, 업계의 판도가 크게 바뀌고 있어요.

올해 주목해야 할 10가지 핵심 트렌드를 정리했습니다.

---

## 1. 틱톡샵 뷰티의 부상

2024년 틱톡샵의 폭발적인 성장은 2025년에도 계속됩니다. 특히 북미 시장에서 K-뷰티 브랜드들이 틱톡샵을 통해 급성장하고 있어요.

아누아, 달바, 라운드랩 등 한국 중소 브랜드들이 틱톡 어필리에이트 마케팅으로 월 수십억 원의 매출을 올리는 사례가 늘고 있습니다.

---

## 2. AI 피부 분석 서비스 대중화

AI를 활용한 맞춤형 피부 분석 서비스가 뷰티 업계의 새로운 경쟁 무기로 떠오르고 있습니다. 스마트폰 카메라 하나로 피부 상태를 분석하고 맞춤 제품을 추천하는 시대가 왔어요.

---

## 3. 클린뷰티 규제 강화

EU와 미국을 중심으로 화장품 성분 규제가 강화되면서, 클린뷰티 기준에 맞는 제품 개발이 필수가 됐습니다. 이는 연구개발(RA) 직무의 중요성을 더욱 높이고 있어요.

---

## 4. 맨즈케어 시장 급성장

남성 뷰티 시장이 전 세계적으로 급성장하고 있습니다. 특히 동남아와 중동 시장에서 한국 남성 뷰티 브랜드에 대한 수요가 폭발적으로 증가하고 있어요.

---

## 5. 인디 브랜드의 글로벌 도전

대기업 중심의 뷰티 시장에서 인디 브랜드들이 SNS와 D2C(Direct to Consumer) 전략으로 글로벌 시장에 도전하고 있습니다.

---

## 마치며

2025년 뷰티 업계는 기술과 콘텐츠, 그리고 지속가능성이 핵심 키워드가 될 것입니다. 이 변화의 흐름을 읽고 준비하는 뷰티 전문가들에게는 역대 최고의 기회가 될 수 있어요.
  `,
  "2": `
## 뷰티 MD란?

MD(Merchandiser)는 브랜드의 상품 기획부터 판매까지 전반을 관리하는 핵심 직무입니다. 뷰티 업계에서 MD는 단순한 상품 구매자가 아니라, 트렌드 분석가이자 비즈니스 전략가예요.

---

## 5가지 핵심 역량

### 1. 트렌드 분석 능력

뷰티 트렌드는 SNS에서 시작되는 경우가 많습니다. 틱톡, 인스타그램, 유튜브를 주기적으로 모니터링하고, 국내외 뷰티 트렌드를 빠르게 캐치하는 능력이 필수예요.

---

### 2. 데이터 기반 의사결정

판매 데이터를 분석하고, 재고를 최적화하며, 시즌별 프로모션 전략을 수립하는 능력이 중요합니다. 엑셀과 데이터 분석 도구는 기본이에요.

---

### 3. 협상 능력

브랜드사, 제조사, 유통사와의 협상을 통해 최적의 조건을 이끌어내는 능력이 필요합니다. 가격 협상부터 독점 계약까지, MD의 협상력이 매출을 좌우해요.

---

### 4. 상품 기획력

시장 조사를 바탕으로 신규 상품을 기획하고, 패키징부터 마케팅 전략까지 전반을 설계하는 능력이 중요합니다.

---

### 5. 커뮤니케이션 능력

내부적으로는 마케팅, 디자인, 물류 팀과, 외부적으로는 브랜드사와 원활하게 소통하는 능력이 필수예요.

---

## 포트폴리오 구성 팁

MD 포트폴리오에는 담당했던 상품의 매출 성과, 진행한 프로모션 결과, 바이어 미팅 경험 등을 구체적인 수치와 함께 담는 것이 좋습니다.
  `,
};

// 기본 본문
const DEFAULT_CONTENT = `
## 뷰티 업계의 새로운 기회

뷰티 산업은 계속해서 진화하고 있습니다. 새로운 기술, 변화하는 소비자 트렌드, 글로벌 시장의 확장 속에서 뷰티 전문가들에게는 더 많은 기회가 열리고 있어요.

---

## 핵심 인사이트

뷰티 업계에서 성공하려면 단순한 제품 지식을 넘어, 비즈니스 감각과 디지털 마케팅 역량을 갖추는 것이 중요합니다.

특히 글로벌 시장을 겨냥하는 K-뷰티 브랜드들은 언어 능력, 문화적 이해도, 그리고 SNS 마케팅 역량을 갖춘 인재를 찾고 있어요.

---

## 앞으로의 전망

뷰티 업계의 디지털 전환은 더욱 가속화될 것입니다. AI, 데이터 분석, SNS 마케팅을 이해하는 뷰티 전문가의 가치는 계속 높아질 거예요.
`;

export default function InsightDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const insight = INSIGHTS.find((i) => i.id === Number(id)) || INSIGHTS[0];
  const content = CONTENTS[id] || DEFAULT_CONTENT;
  const [bookmarked, setBookmarked] = useState(false);

  const related = INSIGHTS
    .filter((i) => i.id !== insight.id && i.category === insight.category)
    .slice(0, 3);
  const otherRelated = INSIGHTS
    .filter((i) => i.id !== insight.id && i.category !== insight.category)
    .slice(0, 3 - related.length);
  const relatedArticles = [...related, ...otherRelated].slice(0, 3);

  return (
    <div className="insight-detail-page">
      {/* 헤더 */}
      <header className="job-detail-header">
        <div className="job-detail-header-inner">
          <button className="job-detail-back" onClick={() => router.push("/insights")}>
            <ChevronLeft size={20} />
            <span>인사이트</span>
          </button>
          <Link href="/" className="job-detail-logo"><Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} priority /></Link>
          <div className="job-detail-header-actions">
            <button
              className={`job-detail-bookmark ${bookmarked ? "active" : ""}`}
              onClick={() => setBookmarked(!bookmarked)}
            >
              <Bookmark size={20} fill={bookmarked ? "currentColor" : "none"} />
            </button>
            <button className="job-detail-share" onClick={() => {
              navigator.clipboard?.writeText(window.location.href);
              alert("링크가 복사되었습니다.");
            }}>
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className="insight-detail-layout">
        <main className="insight-detail-main">
          {/* 썸네일 */}
          <div className="insight-detail-thumb" style={{ background: insight.color }}>
            <span className="insight-detail-emoji">{insight.emoji}</span>
          </div>

          {/* 메타 */}
          <div className="insight-detail-meta-row">
            <span className="insights-category-badge">{insight.category}</span>
            <span className="insight-detail-date">{insight.date}</span>
            <div className="insights-meta">
              <Clock size={13} />
              <span>{insight.readTime} 읽기</span>
            </div>
          </div>

          {/* 제목 */}
          <h1 className="insight-detail-title">{insight.title}</h1>
          <p className="insight-detail-lead">{insight.desc}</p>

          {/* 구분선 */}
          <div className="insight-detail-divider" />

          {/* 본문 */}
          <div className="insight-detail-body">
            {content.trim().split("\n").map((line, i) => {
              if (line.startsWith("## ")) {
                return <h2 key={i} className="insight-body-h2">{line.replace("## ", "")}</h2>;
              }
              if (line.startsWith("### ")) {
                return <h3 key={i} className="insight-body-h3">{line.replace("### ", "")}</h3>;
              }
              if (line === "---") {
                return <hr key={i} className="insight-body-hr" />;
              }
              if (line.trim() === "") {
                return <div key={i} className="insight-body-space" />;
              }
              return <p key={i} className="insight-body-p">{line}</p>;
            })}
          </div>

          {/* 태그 */}
          <div className="insight-detail-tags">
            <span className="insight-detail-tag">#{insight.category}</span>
            <span className="insight-detail-tag">#뷰티업계</span>
            <span className="insight-detail-tag">#뷰티커리어</span>
          </div>

          {/* 관련 아티클 */}
          {relatedArticles.length > 0 && (
            <section className="insight-related">
              <h2 className="insight-related-title">관련 아티클</h2>
              <div className="insight-related-grid">
                {relatedArticles.map((item) => (
                  <Link key={item.id} href={`/insights/${item.id}`} className="insights-card insight-related-card">
                    <div className="insights-card-thumb" style={{ background: item.color }}>
                      <span className="insights-card-emoji">{item.emoji}</span>
                    </div>
                    <div className="insights-card-body">
                      <span className="insights-category-badge">{item.category}</span>
                      <h3 className="insights-card-title">{item.title}</h3>
                      <div className="insights-card-footer">
                        <span className="insights-card-date">{item.date}</span>
                        <div className="insights-meta">
                          <Clock size={12} />
                          <span>{item.readTime}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>

        {/* 사이드바 */}
        <aside className="insight-detail-aside">
          <div className="insight-aside-card">
            <h3 className="insight-aside-title">최신 아티클</h3>
            {INSIGHTS.filter((i) => i.id !== insight.id).slice(0, 5).map((item) => (
              <Link key={item.id} href={`/insights/${item.id}`} className="insight-aside-item">
                <div className="insight-aside-thumb" style={{ background: item.color }}>
                  <span>{item.emoji}</span>
                </div>
                <div className="insight-aside-info">
                  <span className="insights-category-badge">{item.category}</span>
                  <p className="insight-aside-item-title">{item.title}</p>
                  <div className="insights-meta">
                    <Clock size={11} />
                    <span>{item.readTime}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* 채용공고 배너 */}
          <div className="insight-aside-banner">
            <p className="insight-aside-banner-text">
              뷰티 커리어,<br />
              지금 시작해보세요
            </p>
            <Link href="/jobs" className="insight-aside-banner-btn">
              채용공고 보러가기
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
