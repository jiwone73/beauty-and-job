"use client";
import { shortRegion } from "@/lib/regionShort";
import { jobCompanyName } from "@/lib/companyName";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { MapPin, Globe, Briefcase, Calendar } from "lucide-react";
import { workTypeLabel } from "@/lib/constants";

type Company = {
  id: string;
  company_name: string;
  brand_name: string | null;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  address: string | null;
  company_type: string | null;
  industry: string | null;
  representative_name: string | null;
  founded_year: number | string | null;
  company_size: string | null;
  company_phone: string | null;
  region_sido: string | null;
  region_sigungu: string | null;
};

type Job = {
  id: string;
  title: string;
  job_type: string | null;
  location: string | null;
  work_type: string | null;
  deadline: string | null;
  is_featured: boolean;
};

export default function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [company, setCompany] = useState<Company | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/companies/${id}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setCompany(res.data.company);
          setJobs(res.data.jobs || []);
        }
      })
      .catch((e) => console.error("[brand detail]", e))
      .finally(() => setLoading(false));
  }, [id]);

  const fmtDeadline = (d: string | null) => {
    if (!d) return "상시채용";
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "상시채용";
    return `~${dt.getMonth() + 1}.${dt.getDate()} 마감`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-[860px] mx-auto px-5 py-20 text-center text-gray-400">
          불러오는 중...
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-[860px] mx-auto px-5 py-20 text-center text-gray-500">
          회사를 찾을 수 없습니다.
        </div>
      </div>
    );
  }

  const displayName = jobCompanyName(company.company_type, company.company_name, company.brand_name);
  const typeLabel = company.company_type === "STORE" ? "매장" : "본사";

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* 회사 헤더 */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[860px] mx-auto px-5 py-8">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-purple-50 flex items-center justify-center overflow-hidden flex-shrink-0">
              {company.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logo_url} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-purple-400">
                  {displayName?.[0] || "?"}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="inline-block text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-md mb-2">
                {typeLabel}
              </span>
              <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
              {company.company_name && company.brand_name && company.company_name !== company.brand_name && (
                <p className="text-sm text-gray-400 mt-1">{company.company_name}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
                {company.address && (
                  <span className="flex items-center gap-1">
                    <MapPin size={14} /> {company.address}
                  </span>
                )}
                {company.website_url && (
                  <a href={company.website_url} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-1 text-purple-600 hover:underline">
                    <Globe size={14} /> 웹사이트
                  </a>
                )}
              </div>
            </div>
          </div>

          {company.description && (
            <p className="mt-5 text-[15px] leading-relaxed text-gray-700 whitespace-pre-line">
              {company.description}
            </p>
          )}
        </div>
      </div>

      {/* 기업 정보 */}
      {(() => {
        const loc = [company.region_sido, company.region_sigungu].filter(Boolean).join(" ");
        const rows: [string, any][] = [];
        if (company.industry) rows.push(["업종", company.industry]);
        rows.push(["기업 유형", typeLabel]);
        if (company.representative_name) rows.push(["대표자", company.representative_name]);
        if (company.founded_year) rows.push(["설립", `${company.founded_year}년`]);
        if (company.company_size) rows.push(["규모", company.company_size]);
        if (company.company_phone) rows.push(["대표번호", company.company_phone]);
        if (loc || company.address) rows.push(["주소", [loc, company.address].filter(Boolean).join(" ")]);
        if (company.website_url) rows.push(["홈페이지",
          <a href={/^https?:\/\//.test(company.website_url) ? company.website_url : `https://${company.website_url}`}
            target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline break-all">{company.website_url}</a>]);
        if (rows.length === 0) return null;
        return (
          <div className="max-w-[860px] mx-auto px-5 pt-8">
            <h2 className="text-lg font-bold text-gray-900 mb-4">기업 정보</h2>
            <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
              {rows.map(([label, val], i) => (
                <div key={i} className="flex items-start justify-between gap-4 px-5 py-3.5 text-[15px]">
                  <span className="text-gray-400 flex-shrink-0">{label}</span>
                  <span className="text-gray-800 text-right">{val}</span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* 공고 목록 */}
      <div className="max-w-[860px] mx-auto px-5 py-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          채용 중인 공고 <span className="text-purple-600">{jobs.length}</span>
        </h2>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 py-16 text-center text-gray-400">
            현재 채용 중인 공고가 없습니다.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => router.push(`/jobs/${job.id}`)}
                className="text-left bg-white rounded-xl border border-gray-100 p-5 hover:border-purple-300 hover:shadow-sm transition-all"
              >
                {job.is_featured && (
                  <span className="inline-block text-xs font-semibold text-red-500 mb-1.5">⭐ 상단 공고</span>
                )}
                <h3 className="text-base font-semibold text-gray-900">{job.title}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm text-gray-500">
                  {job.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} /> {shortRegion(job.location || "")}
                    </span>
                  )}
                  {job.work_type && (
                    <span className="flex items-center gap-1">
                      <Briefcase size={14} /> {workTypeLabel(job.work_type)}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar size={14} /> {fmtDeadline(job.deadline)}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}