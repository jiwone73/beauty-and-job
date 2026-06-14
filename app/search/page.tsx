"use client";
import Header from "@/components/Header";
import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Search, X, ArrowRight } from "lucide-react";

const PURPLE = "#5f0080";
const RECOMMEND = ["네일", "헤어", "피부관리", "속눈썹", "메이크업", "마케팅", "MD", "상품기획", "디자인", "영업"];

type Job = {
  id: number | string;
  brand: string;
  title: string;
  firstCat: string | null;
  jobType: string;
  region: string;
  type: string;
};

function mapJob(j: any): Job {
  const cats: string[] = j.categories || [];
  return {
    id: j.id,
    brand: j.brand_name || j.company_name || "",
    title: j.title,
    firstCat: cats[0] || null,
    jobType: cats.join(" · "),
    region: j.location || "국내",
    type: j.company_type === "OFFICE" ? "기업" : j.company_type === "STORE" ? "매장" : "기업",
  };
}

function typeBadge(type: string) {
  return type === "매장"
    ? { color: "#185fa5", bg: "#e6f1fb" }
    : { color: "#0f6e56", bg: "#e1f5ee" };
}

/* ===== 채용공고 행 ===== */
function JobRow({ job }: { job: Job }) {
  return (
    <Link href={`/jobs/${job.id}`} className="srch-row">
      <div className="srch-logo srch-logo-square">{job.brand?.[0] || "·"}</div>
      <div className="srch-row-body">
        <p className="srch-row-title">{job.title}</p>
        <p className="srch-row-sub">{job.brand} · {job.region}</p>
      </div>
      {job.firstCat && <span className="srch-tag">{job.firstCat}</span>}
    </Link>
  );
}

/* ===== 회사 행 ===== */
function CompanyRow({ name, count, type, onGo }: { name: string; count: number; type: string; onGo: () => void }) {
  const b = typeBadge(type);
  return (
    <button className="srch-row" onClick={onGo} style={{ textAlign: "left", background: "#fff", cursor: "pointer", width: "100%" }}>
      <div className="srch-logo srch-logo-circle">{name?.[0] || "·"}</div>
      <div className="srch-row-body">
        <p className="srch-row-title">{name}</p>
        <p className="srch-row-sub">진행중 공고 {count}건</p>
      </div>
      <span className="srch-badge" style={{ color: b.color, background: b.bg }}>{type}</span>
    </button>
  );
}

/* ===== 섹션 헤더 ===== */
function SectionHead({ label, count, onMore }: { label: string; count: number; onMore?: () => void }) {
  return (
    <div className="srch-sec-head">
      <span className="srch-sec-title">{label}</span>
      {count > 3 && onMore && (
        <button className="srch-more" onClick={onMore}>
          {label} 전체보기 <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function SearchInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const q = (sp.get("q") || "").trim();

  const [input, setInput] = useState(q);
  const [tab, setTab] = useState<"all" | "jobs" | "company" | "stories">("all");
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setInput(q);
    setTab("all");
    if (!q) { setJobs([]); return; }
    setLoading(true);
    fetch(`/api/jobs?q=${encodeURIComponent(q)}&limit=100`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) setJobs(res.data.map(mapJob));
        else setJobs([]);
      })
      .catch((e) => { console.error("[search jobs]", e); setJobs([]); })
      .finally(() => setLoading(false));
  }, [q]);

  // 공고에서 회사(브랜드) 파생
  const companies = useMemo(() => {
    if (!jobs) return [];
    const map = new Map<string, { name: string; count: number; type: string }>();
    for (const j of jobs) {
      if (!j.brand) continue;
      const ex = map.get(j.brand);
      if (ex) ex.count++;
      else map.set(j.brand, { name: j.brand, count: 1, type: j.type });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [jobs]);

  const submit = (v?: string) => {
    const val = (v ?? input).trim();
    if (!val) return;
    router.push(`/search?q=${encodeURIComponent(val)}`);
  };

  const jobCount = jobs?.length ?? 0;
  const companyCount = companies.length;
  const storyCount = 0; // TODO: 현장이야기 검색 API 연동 시 교체

  const goCompanyJobs = (name: string) => router.push(`/jobs?q=${encodeURIComponent(name)}`);

  return (
    <div className="srch-page">
      <Header />
      <div className="srch-container">
        {/* 검색바 */}
        <div className="srch-bar">
          <Search size={20} color={PURPLE} />
          <input
            className="srch-input"
            placeholder="브랜드, 회사, 채용공고를 검색해 보세요."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
          {input && (
            <button className="srch-clear" onClick={() => setInput("")} aria-label="지우기">
              <X size={18} />
            </button>
          )}
        </div>

        {/* q 없음 → 추천 검색어 */}
        {!q && (
          <div className="srch-empty-state">
            <p className="srch-guide">찾고 싶은 키워드를 입력해 주세요.</p>
            <h4 className="srch-rec-title">추천 검색어</h4>
            <div className="srch-chips">
              {RECOMMEND.map((kw) => (
                <button key={kw} className="srch-chip" onClick={() => submit(kw)}>{kw}</button>
              ))}
            </div>
          </div>
        )}

        {/* q 있음 → 탭 + 결과 */}
        {q && (
          <>
            <div className="srch-tabs">
              <button className={`srch-tab ${tab === "all" ? "on" : ""}`} onClick={() => setTab("all")}>전체</button>
              <button className={`srch-tab ${tab === "jobs" ? "on" : ""}`} onClick={() => setTab("jobs")}>
                채용공고 <span className="srch-tab-n">{jobCount}</span>
              </button>
              <button className={`srch-tab ${tab === "company" ? "on" : ""}`} onClick={() => setTab("company")}>
                회사 <span className="srch-tab-n">{companyCount}</span>
              </button>
              <button className={`srch-tab ${tab === "stories" ? "on" : ""}`} onClick={() => setTab("stories")}>
                현장이야기 <span className="srch-tab-n">{storyCount}</span>
              </button>
            </div>

            {loading ? (
              <div className="srch-loading">검색 중...</div>
            ) : jobCount === 0 && companyCount === 0 ? (
              <div className="srch-noresult">
                <div className="srch-noresult-icon">🔍</div>
                <p>‘{q}’에 대한 검색 결과가 없어요.</p>
              </div>
            ) : (
              <>
                {/* 전체 탭 */}
                {tab === "all" && (
                  <>
                    {jobCount > 0 && (
                      <section className="srch-section">
                        <SectionHead label="채용공고" count={jobCount} onMore={() => router.push(`/jobs?q=${encodeURIComponent(q)}`)} />
                        <div className="srch-list">
                          {jobs!.slice(0, 3).map((j) => <JobRow key={j.id} job={j} />)}
                        </div>
                      </section>
                    )}
                    {companyCount > 0 && (
                      <section className="srch-section">
                        <SectionHead label="회사" count={companyCount} onMore={() => setTab("company")} />
                        <div className="srch-list">
                          {companies.slice(0, 3).map((c) => (
                            <CompanyRow key={c.name} name={c.name} count={c.count} type={c.type} onGo={() => goCompanyJobs(c.name)} />
                          ))}
                        </div>
                      </section>
                    )}
                  </>
                )}

                {/* 채용공고 탭 */}
                {tab === "jobs" && (
                  <section className="srch-section">
                    {jobCount > 0 ? (
                      <>
                        <div className="srch-list">
                          {jobs!.map((j) => <JobRow key={j.id} job={j} />)}
                        </div>
                        <button className="srch-bottom-more" onClick={() => router.push(`/jobs?q=${encodeURIComponent(q)}`)}>
                          채용공고에서 직군·지역으로 좁혀보기 <ArrowRight size={15} />
                        </button>
                      </>
                    ) : <div className="srch-noresult"><p>해당하는 채용공고가 없어요.</p></div>}
                  </section>
                )}

                {/* 회사 탭 */}
                {tab === "company" && (
                  <section className="srch-section">
                    {companyCount > 0 ? (
                      <div className="srch-list">
                        {companies.map((c) => (
                          <CompanyRow key={c.name} name={c.name} count={c.count} type={c.type} onGo={() => goCompanyJobs(c.name)} />
                        ))}
                      </div>
                    ) : <div className="srch-noresult"><p>해당하는 회사가 없어요.</p></div>}
                  </section>
                )}

                {/* 현장이야기 탭 (준비 중) */}
                {tab === "stories" && (
                  <div className="srch-noresult">
                    <div className="srch-noresult-icon">📝</div>
                    <p>현장이야기 검색은 곧 제공될 예정이에요.</p>
                    <Link href="/stories" className="srch-bottom-more" style={{ marginTop: 16, display: "inline-flex" }}>
                      현장이야기 보러가기 <ArrowRight size={15} />
                    </Link>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <style jsx global>{`
        .srch-container { max-width: 760px; margin: 0 auto; padding: 28px 20px 80px; }
        .srch-bar { display: flex; align-items: center; gap: 10px; background: #fff; border: 1.5px solid ${PURPLE}; border-radius: 12px; padding: 12px 16px; }
        .srch-input { flex: 1; border: none; outline: none; font-size: 16px; background: transparent; color: #222; }
        .srch-clear { background: none; border: none; cursor: pointer; color: #aaa; display: flex; }
        .srch-empty-state { padding: 40px 4px; }
        .srch-guide { color: #888; font-size: 15px; margin: 0 0 28px; }
        .srch-rec-title { font-size: 14px; color: #555; margin: 0 0 12px; font-weight: 600; }
        .srch-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .srch-chip { border: 1px solid #eee; background: #faf7fc; color: #5f0080; border-radius: 20px; padding: 8px 16px; font-size: 14px; cursor: pointer; }
        .srch-chip:hover { background: #f3e8fb; }
        .srch-tabs { display: flex; gap: 24px; border-bottom: 1px solid #eee; margin: 24px 0 20px; }
        .srch-tab { background: none; border: none; padding: 0 0 12px; font-size: 15px; color: #999; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; }
        .srch-tab.on { color: ${PURPLE}; font-weight: 600; border-bottom-color: ${PURPLE}; }
        .srch-tab-n { color: ${PURPLE}; margin-left: 2px; }
        .srch-section { margin-bottom: 32px; }
        .srch-sec-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .srch-sec-title { font-size: 16px; font-weight: 600; color: #222; }
        .srch-more { background: none; border: none; color: ${PURPLE}; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; }
        .srch-list { display: flex; flex-direction: column; gap: 8px; }
        .srch-row { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #eee; border-radius: 10px; padding: 12px 14px; text-decoration: none; }
        .srch-row:hover { border-color: #ddd; }
        .srch-logo { width: 44px; height: 44px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; }
        .srch-logo-square { background: ${PURPLE}; color: #fff; border-radius: 8px; }
        .srch-logo-circle { background: #f3e8fb; color: ${PURPLE}; border-radius: 50%; }
        .srch-row-body { flex: 1; min-width: 0; }
        .srch-row-title { margin: 0 0 3px; font-size: 15px; font-weight: 500; color: #222; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .srch-row-sub { margin: 0; font-size: 13px; color: #888; }
        .srch-tag { flex-shrink: 0; font-size: 12px; color: ${PURPLE}; background: #f3e8fb; padding: 4px 10px; border-radius: 8px; }
        .srch-badge { flex-shrink: 0; font-size: 12px; padding: 4px 10px; border-radius: 8px; }
        .srch-loading, .srch-noresult { text-align: center; padding: 60px 20px; color: #888; }
        .srch-noresult-icon { font-size: 36px; margin-bottom: 12px; }
        .srch-bottom-more { display: flex; align-items: center; justify-content: center; gap: 5px; width: 100%; margin-top: 14px; padding: 12px; background: #faf7fc; border: 1px solid #f0e6f7; border-radius: 10px; color: ${PURPLE}; font-size: 14px; cursor: pointer; text-decoration: none; }
      `}</style>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: "80px", textAlign: "center" }}>로딩 중...</div>}>
      <SearchInner />
    </Suspense>
  );
}