"use client";
import { useState, useEffect, Suspense, type ChangeEvent } from "react";
import { useSearchParams } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import JobPostForm from "@/components/jobs/JobPostForm";
import { companyMeApi } from "@/lib/api/company";

function CompanyJobNewForm() {
  const searchParams = useSearchParams();
  const editId = searchParams?.get("id") || null;
  const copyId = searchParams?.get("copy") || null;
  const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | "BOTH" | null>(null);
  const [licensePath, setLicensePath] = useState<string | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [licUploading, setLicUploading] = useState(false);
  const [licError, setLicError] = useState("");

  useEffect(() => {
    companyMeApi.get()
      .then((res) => {
        setCompanyType(res.data.company_type);
        setLicensePath(res.data.business_license_path);
        setMeLoaded(true);
      })
      .catch(() => setMeLoaded(true));
  }, []);

  const handleLicenseUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem("access_token");
    setLicUploading(true);
    setLicError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/company/license", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) setLicensePath(data.data.path);
      else setLicError(data.error?.message || "업로드에 실패했습니다.");
    } catch {
      setLicError("업로드 중 오류가 발생했습니다.");
    } finally {
      setLicUploading(false);
    }
  };

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
      {meLoaded && !licensePath ? (
        <div style={{ maxWidth: 520, margin: "40px auto", padding: "32px 24px", background: "#fff", border: "1px solid #ececec", borderRadius: 14, textAlign: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 400, marginBottom: 10, color: "#1a1a1a" }}>기업 인증이 필요해요</h2>
          <p style={{ fontSize: 14, color: "#6b6b6b", lineHeight: 1.7, marginBottom: 22 }}>
            구직자 보호를 위해 채용공고를 등록하기 전, 사업자등록증을 한 번만 등록해 주세요.<br />인증 후에는 자유롭게 공고를 올릴 수 있어요.
          </p>
          <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, padding: "0 22px", background: "#ede9fe", color: "#5f0080", borderRadius: 10, cursor: licUploading ? "default" : "pointer", fontSize: 14 }}>
            {licUploading ? "업로드 중..." : "사업자등록증 첨부"}
            <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleLicenseUpload} disabled={licUploading} />
          </label>
          <p style={{ fontSize: 12, color: "#9a9a9a", marginTop: 12 }}>JPG·PNG·WebP·PDF · 최대 5MB · 관리자 확인용</p>
          {licError && <p style={{ fontSize: 13, color: "#e74c3c", marginTop: 10 }}>{licError}</p>}
        </div>
      ) : (
        <JobPostForm
          mode="company"
          editId={editId || copyId}
          listHref="/company/dashboard/jobs"
          companyType={companyType}
          uploadImage={uploadImage}
          onSubmit={onSubmit}
          loadEditData={loadEditData}
        />
      )}
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
