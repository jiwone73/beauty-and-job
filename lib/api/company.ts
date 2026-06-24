// 기업 대시보드 API 호출 함수들
import { api } from "@/lib/api-client";
import type {
  CompanyJob,
  CompanyApplication,
  CompanyInfo,
  DashboardStats,
  JobStatus,
  ApplicationStatus,
  ApiResponse,
} from "@/lib/types/company";

// === 공고 ===
export const companyJobsApi = {
  list: (params?: { status?: JobStatus; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs}` : "";
    return api.get<ApiResponse<CompanyJob[]>>(`/api/company/jobs${query}`);
  },
  create: (body: Partial<CompanyJob>) =>
    api.post<ApiResponse<CompanyJob>>("/api/company/jobs", body),
  update: (id: string, body: Partial<CompanyJob>) =>
    api.patch<ApiResponse<CompanyJob>>(`/api/company/jobs/${id}`, body),
  delete: (id: string) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/api/company/jobs/${id}`),
  // 마감 처리
  close: (id: string) =>
    api.patch<ApiResponse<CompanyJob>>(`/api/company/jobs/${id}`, { status: "CLOSED" }),
  // 일시중지
  pause: (id: string) =>
    api.patch<ApiResponse<CompanyJob>>(`/api/company/jobs/${id}`, { status: "PAUSED" }),
  // 재게시
  resume: (id: string) =>
    api.patch<ApiResponse<CompanyJob>>(`/api/company/jobs/${id}`, { status: "ACTIVE" }),
};

// === 지원자 ===
export const companyApplicationsApi = {
  list: (params?: {
    status?: ApplicationStatus;
    job_id?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.job_id) qs.set("job_id", params.job_id);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs}` : "";
    return api.get<ApiResponse<CompanyApplication[]>>(`/api/company/applications${query}`);
  },
  updateStatus: (id: string, status: ApplicationStatus) =>
    api.patch<ApiResponse<CompanyApplication>>(`/api/company/applications/${id}`, { status }),
};

// === 기업 정보 ===
export const companyMeApi = {
  get: () => api.get<ApiResponse<CompanyInfo>>("/api/company/me"),
  update: (body: Partial<CompanyInfo>) =>
    api.patch<ApiResponse<CompanyInfo>>("/api/company/me", body),
  changePassword: (body: { current_password: string; new_password: string }) =>
    api.patch<ApiResponse<{ success: boolean }>>("/api/company/me/password", body),
};

// === 대시보드 통계 ===
export const companyDashboardApi = {
  stats: () => api.get<ApiResponse<DashboardStats>>("/api/company/dashboard/stats"),
};

// === 인재 검색 ===
export type TalentItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  portfolioUrl: string | null;
  gender: string | null;
  age: number | null;
  intro: string | null;
  mainJobGroup: string | null;
  subJob: string | null;
  skills: string[];
  skillAreas: string[];
  officeJobAreas: string[];
  regionPrefer: string | null;
  workTypePrefer: string | null;
  careerYears: number | null;
  careerCount: number;
  educationDetail: { school: string; major: string | null; status: string | null; start_date: string | null; end_date: string | null } | null;
  careerDetail: { company: string; department: string | null; position: string | null; start_date: string | null; end_date: string | null } | null;
  scrapped: boolean;
};

export const companyTalentApi = {
  list: (params?: {
    jobType?: string;
    search?: string;
    jobGroups?: string;
    careerFilter?: string;
    regions?: string;
    ageGroup?: string;
    gender?: string;
    page?: number;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.jobType) qs.set("jobType", params.jobType);
    if (params?.search) qs.set("search", params.search);
    if (params?.jobGroups) qs.set("jobGroups", params.jobGroups);
    if (params?.careerFilter && params.careerFilter !== "전체")
      qs.set("careerFilter", params.careerFilter);
    if (params?.regions) qs.set("regions", params.regions);
    if (params?.ageGroup && params.ageGroup !== "전체")
      qs.set("ageGroup", params.ageGroup);
    if (params?.gender && params.gender !== "무관")
      qs.set("gender", params.gender);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString() ? `?${qs}` : "";
    return api.get<ApiResponse<TalentItem[]>>(`/api/company/talent${query}`);
  },
  scrap: (userId: string) =>
    api.post<ApiResponse<{ scrapped: boolean }>>(`/api/company/talent/${userId}/scrap`, {}),
  unscrap: (userId: string) =>
    api.delete<ApiResponse<{ scrapped: boolean }>>(`/api/company/talent/${userId}/scrap`),
};