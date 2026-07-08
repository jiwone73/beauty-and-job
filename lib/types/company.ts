// 기업 대시보드에서 사용하는 공통 타입 정의

export type CompanyType = "OFFICE" | "STORE" | "BOTH";
export type JobStatus = "ACTIVE" | "CLOSED" | "DRAFT" | "PAUSED";
export type ApplicationStatus = "APPLIED" | "VIEWED" | "PASSED" | "REJECTED";

// 공고 (목록 응답용)
export interface CompanyJob {
  id: string;
  title: string;
  job_type: CompanyType;
  status: JobStatus;
  view_count: number;
  application_count: number;
  deadline: string | null;
  is_featured: boolean;
  created_at: string;
  closed_at: string | null;
}

// 지원자 (목록 응답용)
export interface CompanyApplication {
  id: string;
  status: ApplicationStatus;
  applied_at: string;
  viewed_at: string | null;
  cover_letter: string | null;
  user_id: string;
  user_name: string;
  user_phone?: string;
  user_email?: string;
  user_job_type?: "OFFICE" | "STORE";
  job_posting_id: string;
  job_title: string;
  resume_file_name?: string | null;
  resume_file_size?: number | null;
}

// 기업 정보
export interface CompanyInfo {
  id: string;
  email: string;
  company_name: string;
  brand_name: string | null;
  company_type: CompanyType;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  representative_name: string | null;
  business_number: string | null;
  created_at: string;
}

// 대시보드 통계
export interface DashboardStats {
  active_jobs: number;
  total_applications: number;
  new_applications_today: number;
  total_views: number;
  trends?: { label: string; value: number }[];
}

// API 응답 공통
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; total: number };
}