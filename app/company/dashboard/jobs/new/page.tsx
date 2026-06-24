"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import JobPostForm from "@/components/jobs/JobPostForm";
import { companyMeApi } from "@/lib/api/company";

function CompanyJobNewForm() {
  const searchParams = useSearchParams();
  const editId = searchParams?.get("id") || null;
  const copyId = searchParams?.get("copy") || null;
  const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | "BOTH" | null>(null);

  useEffect(() => {
    companyMeApi.get()
      .then((res) => setCompanyType(res.data.company_type))
      .catch(console.error);
  }, []);

  const uploadImage = async (file: File) => {
    const token = localStorage.getItem("access_token");
    if (!token) return { success: false, error: "로그인이 필요합니다." };
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/company/jobs/upload-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    if (data.success) return { success: true, url: data.data.url, name: data.data.name };
    return { success: false, error: data.error?.message };
  };

  const loadEditData = async (id: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    const res = await fetch(`/api/company/jobs/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) return null;
    // 복사 모드: 마감일·상태 초기화
    if (copyId) {
      return { ...data.data, id: undefined, status: "DRAFT", deadline: null, created_at: undefined };
    }
    return data.data;
  };

  const onSubmit = async (payload: any, _status: "draft" | "publish") => {
    const token = localStorage.getItem("access_token");
    if (!token) return { success: false, error: "로그인이 필요합니다." };
    const res = await fetch(
      editId ? `/api/company/jobs/${editId}` : "/api/company/jobs",
      {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      }
    );
    const data = await res.json();
    if (data.success) return { success: true };
    return { success: false, error: data.error?.message };
  };

  return (
    <CompanyLayout activePage="jobs">
      <JobPostForm
        mode="company"
        editId={editId || copyId}
        listHref="/company/dashboard/jobs"
        companyType={companyType}
        uploadImage={uploadImage}
        onSubmit={onSubmit}
        loadEditData={loadEditData}
      />
    </CompanyLayout>
  );
}

export default function CompanyJobNewPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#888" }}>불러오는 중...</div>}>
      <CompanyJobNewForm />
    </Suspense>
  );
}
