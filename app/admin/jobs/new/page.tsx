"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
import JobPostForm from "@/components/jobs/JobPostForm";

type Company = { id: string; company_name: string; brand_name: string | null };

function AdminJobNewForm() {
  const searchParams = useSearchParams();
  const editId = searchParams?.get("id") || null;
  const [companies, setCompanies] = useState<Company[]>([]);
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  useEffect(() => {
    fetch("/api/admin/companies", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setCompanies(res.data.items); })
      .catch(console.error);
  }, [token]);

  const uploadImage = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/admin/jobs/upload-image", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    if (data.success) return { success: true, url: data.data.url, name: data.data.name };
    return { success: false, error: data.error?.message };
  };

  const onSubmit = async (payload: any, _status: "draft" | "publish", companyId: string | null) => {
    const res = await fetch("/api/admin/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...payload, company_id: companyId }),
    });
    const data = await res.json();
    if (data.success) return { success: true };
    return { success: false, error: data.error?.message };
  };

  return (
    <AdminLayout activeMenu="jobs">
      <JobPostForm
        mode="admin"
        editId={editId}
        listHref="/admin/jobs"
        companies={companies}
        uploadImage={uploadImage}
        onSubmit={onSubmit}
      />
    </AdminLayout>
  );
}

export default function AdminJobNewPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#888" }}>불러오는 중...</div>}>
      <AdminJobNewForm />
    </Suspense>
  );
}