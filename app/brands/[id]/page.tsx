"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import { MapPin, Globe, Briefcase, Calendar } from "lucide-react";

type Company = {
  id: string;
  company_name: string;
  brand_name: string | null;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  address: string | null;
  company_type: string | null;
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

  const displayName = company.brand_name || company.company_name;
  const typeLabel = company.company_type === "STORE" ? "매장·기술직" : "기업·브랜드";

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
                      <MapPin size={14} /> {job.location}
                    </span>
                  )}
                  {job.work_type && (
                    <span className="flex items-center gap-1">
                      <Briefcase size={14} /> {job.work_type}
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