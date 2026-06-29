"use client";
import Header from "@/components/Header";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { TrendingUp, ChevronDown, Search, ArrowUp, ArrowDown, Minus } from "lucide-react";

const JOB_CATEGORIES = ["전체", "마케팅", "MD", "SCM·물류", "디자인", "영업", "상품기획", "경영·전략", "콘텐츠"];

const SALARY_DATA = [
  { job: "브랜드 마케터", category: "마케팅", entry: "2,800", mid: "4,200", senior: "6,500", avg: "4,200", trend: "up", yoy: "+8.2%" },
  { job: "퍼포먼스 마케터", category: "마케팅", entry: "3,000", mid: "4,500", senior: "7,000", avg: "4,500", trend: "up", yoy: "+12.1%" },
  { job: "SNS 마케터", category: "마케팅", entry: "2,600", mid: "3,800", senior: "5,500", avg: "3,800", trend: "up", yoy: "+6.4%" },
  { job: "온라인 MD", category: "MD", entry: "2,800", mid: "4,000", senior: "6,000", avg: "4,000", trend: "up", yoy: "+9.3%" },
  { job: "바이어 MD", category: "MD", entry: "3,000", mid: "4,500", senior: "7,000", avg: "4,500", trend: "stable", yoy: "+2.1%" },
  { job: "해외 MD", category: "MD", entry: "3,200", mid: "5,000", senior: "8,000", avg: "5,000", trend: "up", yoy: "+11.5%" },
  { job: "SCM 담당자", category: "SCM·물류", entry: "2,700", mid: "3,900", senior: "5,800", avg: "3,900", trend: "stable", yoy: "+3.2%" },
  { job: "물류 담당자", category: "SCM·물류", entry: "2,500", mid: "3,500", senior: "5,000", avg: "3,500", trend: "down", yoy: "-1.2%" },
  { job: "뷰티 디자이너", category: "디자인", entry: "2,600", mid: "3,800", senior: "5,500", avg: "3,800", trend: "stable", yoy: "+2.8%" },
  { job: "패키지 디자이너", category: "디자인", entry: "2,800", mid: "4,000", senior: "5,800", avg: "4,000", trend: "up", yoy: "+5.1%" },
  { job: "해외영업", category: "영업", entry: "3,000", mid: "4,500", senior: "7,500", avg: "4,500", trend: "up", yoy: "+14.2%" },
  { job: "국내영업", category: "영업", entry: "2,700", mid: "3,800", senior: "5,500", avg: "3,800", trend: "stable", yoy: "+1.8%" },
  { job: "상품기획 BM", category: "상품기획", entry: "3,000", mid: "4,500", senior: "7,000", avg: "4,500", trend: "up", yoy: "+7.9%" },
  { job: "콘텐츠 기획자", category: "콘텐츠", entry: "2,600", mid: "3,800", senior: "5,500", avg: "3,800", trend: "up", yoy: "+9.8%" },
];

const CAREER_LEVELS = [
  { label: "신입 (0~2년)", key: "entry" },
  { label: "중급 (3~7년)", key: "mid" },
  { label: "시니어 (8년+)", key: "senior" },
];

const INSIGHTS_DATA = [
  { emoji: "📈", title: "해외영업 연봉 상승률 1위", desc: "2025년 해외영업 직무 연봉이 전년 대비 14.2% 상승했습니다. 틱톡샵, 아마존 등 글로벌 커머스 확장에 따른 수요 급증이 원인입니다." },
  { emoji: "💡", title: "퍼포먼스 마케터 몸값 급등", desc: "디지털 광고 효율화 니즈 증가로 퍼포먼스 마케터의 연봉이 12.1% 상승. 특히 틱톡·메타 광고 경험자에 대한 프리미엄이 높아지고 있습니다." },
  { emoji: "🌍", title: "해외 MD 평균 연봉 5,000만원 돌파", desc: "북미·동남아 진출 뷰티 브랜드가 늘면서 해외 MD 수요가 급증하고 있습니다. 외국어 능력과 글로벌 유통 경험이 있다면 협상력이 높습니다." },
];

export default function SalaryPage() {
  const [activeCategory, setActiveCategory] = useState("전체");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"avg" | "yoy">("avg");

  const filtered = SALARY_DATA
    .filter((d) => {
      const matchCat = activeCategory === "전체" || d.category === activeCategory;
      const matchSearch = !searchQuery || d.job.includes(searchQuery);
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === "avg") return parseInt(b.avg.replace(",", "")) - parseInt(a.avg.replace(",", ""));
      return parseFloat(b.yoy) - parseFloat(a.yoy);
    });

  return (
    <div className="salary-page">
      <Header />

      <div className="salary-container">
        {/* 히어로 */}
        <div className="salary-hero">
          <div className="salary-hero-left">
            <span className="salary-hero-badge">💰 2025 뷰티 업계 연봉 리포트</span>
            <h1 className="salary-hero-title">
              뷰티 직무별 연봉,<br />
              <span className="salary-hero-point">얼마나 받아야 할까요?</span>
            </h1>
            <p className="salary-hero-desc">
              마케팅, MD, SCM, 디자인, 영업까지<br />
              뷰티 업계 직무별 평균 연봉 데이터를 공개합니다.
            </p>
            <Link href="/profile" className="salary-hero-cta">
              내 연봉 분석받기 →
            </Link>
          </div>
          <div className="salary-hero-right">
            <div className="salary-hero-stats">
              <div className="salary-stat-card">
                <span className="salary-stat-label">뷰티 업계 평균 연봉</span>
                <strong className="salary-stat-value">4,100<span>만원</span></strong>
                <span className="salary-stat-trend up">↑ 전년 대비 +7.2%</span>
              </div>
              <div className="salary-stat-card">
                <span className="salary-stat-label">최고 상승 직무</span>
                <strong className="salary-stat-value salary-stat-job">해외영업</strong>
                <span className="salary-stat-trend up">↑ +14.2% YoY</span>
              </div>
              <div className="salary-stat-card">
                <span className="salary-stat-label">평균 연봉 1위 직무</span>
                <strong className="salary-stat-value salary-stat-job">해외 MD</strong>
                <span className="salary-stat-desc">평균 5,000만원</span>
              </div>
            </div>
          </div>
        </div>

        {/* 인사이트 카드 */}
        <div className="salary-insights">
          {INSIGHTS_DATA.map((item) => (
            <div key={item.title} className="salary-insight-card">
              <span className="salary-insight-emoji">{item.emoji}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 연봉 테이블 */}
        <div className="salary-table-section">
          <div className="salary-table-header">
            <h2 className="salary-table-title">직무별 연봉 데이터</h2>
            <div className="salary-table-controls">
              {/* 검색 */}
              <div className="salary-search-box">
                <Search size={15} className="salary-search-icon" />
                <input
                  className="salary-search-input"
                  placeholder="직무 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              {/* 정렬 */}
              <div className="salary-sort-group">
                <button className={`salary-sort-btn ${sortBy === "avg" ? "active" : ""}`} onClick={() => setSortBy("avg")}>평균 연봉순</button>
                <button className={`salary-sort-btn ${sortBy === "yoy" ? "active" : ""}`} onClick={() => setSortBy("yoy")}>상승률순</button>
              </div>
            </div>
          </div>

          {/* 카테고리 탭 */}
          <div className="salary-tabs">
            {JOB_CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`salary-tab ${activeCategory === cat ? "active" : ""}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* 테이블 */}
          <div className="salary-table-wrap">
            <table className="salary-table">
              <thead>
                <tr>
                  <th>직무</th>
                  <th>카테고리</th>
                  {CAREER_LEVELS.map((lv) => (
                    <th key={lv.key}>{lv.label}</th>
                  ))}
                  <th>평균 연봉</th>
                  <th>전년 대비</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.job}>
                    <td className="salary-job-name">{row.job}</td>
                    <td><span className="salary-category-badge">{row.category}</span></td>
                    <td className="salary-num">{row.entry}만원</td>
                    <td className="salary-num">{row.mid}만원</td>
                    <td className="salary-num">{row.senior}만원</td>
                    <td className="salary-avg">{row.avg}만원</td>
                    <td>
                      <span className={`salary-yoy ${row.trend}`}>
                        {row.trend === "up" && <ArrowUp size={13} />}
                        {row.trend === "down" && <ArrowDown size={13} />}
                        {row.trend === "stable" && <Minus size={13} />}
                        {row.yoy}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="salary-disclaimer">
            * 위 데이터는 뷰티워크 자체 조사 및 공개 데이터를 기반으로 한 추정치입니다. 실제 연봉은 기업 규모, 개인 경력에 따라 다를 수 있습니다.
          </p>
        </div>

        {/* 연봉 상담 CTA */}
        <div className="salary-cta-box">
          <div className="salary-cta-left">
            <h3>내 연봉, 적정한가요?</h3>
            <p>뷰티워크 에이전트에게 연봉 분석과 이직 제안을 받아보세요.</p>
          </div>
          <div className="salary-cta-right">
            <Link href="/profile" className="salary-cta-btn primary">연봉 분석받기</Link>
            <Link href="/jobs" className="salary-cta-btn outline">채용공고 보기</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
