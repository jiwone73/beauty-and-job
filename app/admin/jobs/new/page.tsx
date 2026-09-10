"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import AdminLayout from "@/components/admin/AdminLayout";
import JobPostForm from "@/components/jobs/JobPostForm";

type Company = { id: string; company_name: string; brand_name: string | null };

function AdminJobNewForm() {
  const searchParams = useSearchParams();
  const editId = searchParams?.get("id") || null;
  const initialFind = searchParams?.get("url") || searchParams?.get("q") || "";
  // 어느 목록에서 왔는지. 등록하고 나서 그 자리로 돌아가려면 알아야 한다.
  const from = searchParams?.get("from") || "";
  // 카페처럼 목록이 없는 곳은 붙여넣기 칸이 열린 채로 시작한다.
  const paste = searchParams?.get("paste") === "1";
  const 소스이름: Record<string, string> = { hairinjob: "헤어인잡", selectme: "셀렉미", work24: "고용24" };
  const inboxId = searchParams?.get("inbox") || "";
  const [받아둔값, set받아둔값] = useState<any>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  // 목록에서 골라 들어온 경우. 이미 읽어 둔 값을 받아 폼에 바로 태운다.
  useEffect(() => {
    if (!inboxId) return;
    fetch(`/api/admin/external-jobs/inbox/${inboxId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()).then((j) => { if (j.success) set받아둔값(j.data); }).catch(() => {});
  }, [inboxId, token]);

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

  const loadEditData = async (id: string) => {
    const res = await fetch(`/api/admin/jobs/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) return null;
    return data.data;
  };

  // 관리자 직접등록 임시저장(DRAFT · created_by=admin) 목록 — 공고 직접 등록 페이지 상단에서 이어쓰기용
  const listDrafts = async () => {
    const res = await fetch("/api/admin/jobs?status=DRAFT", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) return [];
    return (data.data.items || [])
      .filter((j: any) => j.created_by === "admin")
      .map((j: any) => ({ id: j.id, title: j.title, company_name: j.company_name, created_at: j.created_at }));
  };

  const onSubmit = async (
    payload: any,
    status: "draft" | "publish",
    company: { companyId: string | null; newCompany: { company_name: string; brand_name: string } | null }
  ) => {
    const body: any = { ...payload, status: status === "draft" ? "DRAFT" : "ACTIVE" };
    if (company.companyId) body.company_id = company.companyId;
    if (company.newCompany) body.new_company = company.newCompany;
    // 편집이면 PATCH(기존 공고 갱신), 신규면 POST(등록)
    const res = await fetch(editId ? `/api/admin/jobs/${editId}` : "/api/admin/jobs", {
      method: editId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) return { success: true, id: (editId || data.data?.id) as string };
    return { success: false, error: data.error?.message };
  };

  return (
    <AdminLayout activeMenu={from ? `import-${from}` : "jobs-new"}>
      {from && 소스이름[from] && (
        <div style={{ marginBottom: 10 }}>
          <Link href={`/admin/import/${from}`}
            style={{ fontSize: 13.5, color: "#582681", textDecoration: "none" }}>
            ← {소스이름[from]} 목록으로
          </Link>
        </div>
      )}
      <JobPostForm
        initialImportMode={paste ? "paste" : undefined}
        initialParsed={받아둔값}
        mode="admin"
        editId={editId}
        listHref="/admin/jobs"
        companies={companies}
        uploadImage={uploadImage}
        onSubmit={onSubmit}
        loadEditData={loadEditData}
        listDrafts={listDrafts}
        initialFindQuery={initialFind}
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