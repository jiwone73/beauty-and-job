"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import JobPostForm from "@/components/jobs/JobPostForm";
import { companyMeApi } from "@/lib/api/company";
import StartJobModal from "@/components/company/StartJobModal";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 스타트, 플랜 } from "@/lib/companyPlans";

function CompanyJobNewForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams?.get("id") || null;
  const copyId = searchParams?.get("copy") || null;
  const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | null>(null);
  // 빈 폼으로 들어올 때만 묻는다. 이어서 쓰거나 복사해서 온 길에는 끼어들지 않는다.
  // 모달은 고를 것이 있을 때만 스스로 뜬다(임시저장도 지난 공고도 없으면 안 뜬다).
  const [고르기, set고르기] = useState(!editId && !copyId);
  /** 무료로 더 올릴 수 있는 공고 수. 유료 기간 안이면 null */
  const [무료남은, set무료남은] = useState<number | null>(null);

  useEffect(() => {
    companyMeApi.get()
      .then((res) => setCompanyType(res.data.company_type))
      .catch(() => {});
    // 쓰기 전에 알려 준다. 다 채워 넣고 「등록」을 눌렀을 때 막히면 그동안 쓴
    // 것이 헛일이 된다.
    const token = localStorage.getItem("access_token");
    fetch("/api/company/me/plan", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((r) => { if (r?.success) set무료남은(r.data?.무료남은 ?? null); })
      .catch(() => {});
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

  // 임시저장 목록 — 폼 위쪽 「임시저장」 단추 옆에서 언제든 펼쳐 본다. 들어올 때 뜨는
  // 창을 닫고 나면 임시저장을 볼 길이 없었다.
  const listDrafts = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return [];
    const res = await fetch("/api/company/jobs?status=DRAFT&limit=30", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!data.success) return [];
    const 목록 = Array.isArray(data.data) ? data.data : (data.data?.jobs || []);
    return 목록.map((j: any) => ({ id: j.id, title: j.title, created_at: j.created_at }));
  };

  const deleteDraft = async (id: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return false;
    const res = await fetch(`/api/company/jobs/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => ({ success: false }));
    return !!data.success;
  };

  const onSubmit = async (payload: any, status: "draft" | "publish") => {
    const token = localStorage.getItem("access_token");
    if (!token) return { success: false, error: "로그인이 필요합니다." };
    const res = await fetch(
      editId ? `/api/company/jobs/${editId}` : "/api/company/jobs",
      {
        method: editId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...payload, status: status === "draft" ? "DRAFT" : "ACTIVE" }),
      }
    );
    const data = await res.json();
    if (data.success) return { success: true };
    return { success: false, error: data.error?.message };
  };

  return (
    <CompanyLayout activePage="jobs-new">
        {고르기 && (
          <StartJobModal
            onClose={() => set고르기(false)}
            onPick={(href) => { set고르기(false); router.push(href); }}
          />
        )}
        {무료남은 != null && (
          <p className={`co-quota${무료남은 === 0 ? " out" : ""}`}>
            {무료남은 === 0
              ? <>
                  {/* 여기서 막힌 사람에게 필요한 것은 공고를 더 거는 일이다.
                      요금제 넉 장을 다시 비교하게 하지 않고 그 일을 하는 상품
                      하나로 바로 데려간다 — 인재 쪽에서 막힌 사람은 스탠다드로
                      가는 것과 같은 규칙이다. */}
                  무료 공고 {스타트.공고수}번을 모두 썼습니다.{" "}
                  <Link href="/company/dashboard/plans/light">{플랜.LIGHT.name} 보기 ›</Link>
                </>
              : <>무료 공고 {무료남은}번 남음 · 한 건당 {스타트.게재일}일 게재됩니다</>}
          </p>
        )}
        <JobPostForm
          mode="company"
          editId={editId || copyId}
          listHref="/company/dashboard/jobs"
          companyType={companyType}
          uploadImage={uploadImage}
          onSubmit={onSubmit}
          loadEditData={loadEditData}
          listDrafts={listDrafts}
          deleteDraft={deleteDraft}
        />
    </CompanyLayout>
  );
}

export default function CompanyJobNewPage() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", color: "#555" }}>불러오는 중...</div>}>
      <CompanyJobNewForm />
    </Suspense>
  );
}
