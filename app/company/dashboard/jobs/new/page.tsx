"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import JobPostForm from "@/components/jobs/JobPostForm";
import { companyMeApi } from "@/lib/api/company";
import StartJobModal from "@/components/company/StartJobModal";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 플랜 } from "@/lib/companyPlans";

function CompanyJobNewForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams?.get("id") || null;
  const copyId = searchParams?.get("copy") || null;
  const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | null>(null);
  // 빈 폼으로 들어올 때만 묻는다. 이어서 쓰거나 복사해서 온 길에는 끼어들지 않는다.
  // 모달은 고를 것이 있을 때만 스스로 뜬다(임시저장도 지난 공고도 없으면 안 뜬다).
  const [고르기, set고르기] = useState(!editId && !copyId);
  /** 무료 칸 상태. 유료 기간 안이면 null 이라 아무것도 안 뜬다. */
  const [무료, set무료] = useState<{ 전부: number; 남은: number } | null>(null);
  // 무료 칸이 다 찬 경우는 그냥 지나칠 문구가 아니라 등록을 막는 상황이라 팝업으로
  // 알린다("안내를 할거면 팝업으로 해야지").
  const [무료소진팝업, set무료소진팝업] = useState(false);

  useEffect(() => {
    companyMeApi.get()
      .then((res) => setCompanyType(res.data.company_type))
      .catch(() => {});
    // 쓰기 전에 알려 준다. 다 채워 넣고 「등록」을 눌렀을 때 막히면 그동안 쓴
    // 것이 헛일이 된다.
    const token = localStorage.getItem("access_token");
    fetch("/api/company/me/plan", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((r) => {
        if (!r?.success) return;
        const 상태 = r.data?.plan ? null : { 전부: r.data?.무료건수 ?? 0, 남은: r.data?.무료남은것 ?? 0 };
        set무료(상태);
        if (상태 && 상태.남은 <= 0) set무료소진팝업(true);
      })
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
        {/* 무료 소진 팝업이 뜨는 동안은 뒤로 미룬다 — 두 팝업이 한꺼번에 겹치면
            어느 쪽도 제대로 안 읽힌다. */}
        {고르기 && !무료소진팝업 && (
          <StartJobModal
            onClose={() => set고르기(false)}
            onPick={(href) => { set고르기(false); router.push(href); }}
          />
        )}
        {무료 && 무료.남은 > 0 && (
          // "올린다·내린다" 대신 등록·마감·노출로 — 다른 데서 쓰는 말과 맞춘다
          // ("올리고 내리고 이런말 쓰지 말고"). 게재기간은 무기한으로 바뀌었고
          // ("헤어인잡 때문이라도 무료상품은 게재기간을 두면 안될거 같아",
          // 2026-10-01), 유료와는 노출 범위(회원만 vs 전체)로 가른다.
          // 말투는 합니다체가 아니라 평소대로 해요체로 — 격식체를 쓰라는 게 아니라
          // 등록·재등록 같은 업무용어를 쓰라는 뜻이었다("xx하기는 맞는표현이야.
          // 격식체를 쓰라는게 아니라 업무용어를 쓰라는거야", "너무 부자연스러워").
          <p className="co-quota">
            무료(스타트) 상품은 공고 등록 한 번에 <b>{무료.전부}건</b> (무기한)이에요. 다만{" "}
            <b>회원(가입한 구직자)</b>에게만 보이고, 비회원에게도 보이게 하거나 여러 건을 동시에
            등록하시려면 <Link href="/company/dashboard/plans/light">유료 상품</Link>을 확인해 보세요.
          </p>
        )}
        {무료소진팝업 && 무료 && (
          <div className="co-quota-popup-overlay" onClick={() => set무료소진팝업(false)}>
            <div className="co-quota-popup" onClick={(e) => e.stopPropagation()}>
              {/* 여기서 막힌 사람에게 필요한 것은 공고를 더 거는 일이다. 요금제 넉 장을
                  다시 비교하게 하지 않고 그 일을 하는 상품 하나로 바로 데려간다.
                  게재기간이 무기한으로 바뀌면서 더는 저절로 안 내려간다 — 막힌
                  이유도 "기간이 지나면 풀린다"가 아니라 "마감해야 풀린다"로 바뀐다.
                  말투는 합니다체가 아니라 해요체로 — 격식체가 아니라 업무용어가
                  핵심이었다("너무 부자연스러워"). */}
              <p>
                무료 상품은 공고 등록 한 번에 <b>{무료.전부}건</b> (무기한)이에요. 이미 등록해 두신
                공고가 있어 지금은 새로 등록할 수 없고, 그 공고를 마감하시면 새로 등록하실 수 있어요.
              </p>
              <p>
                공고를 마감하지 않고 여러 건을 동시에 등록하시려면{" "}
                <Link href="/company/dashboard/plans/light">건수 제한 없는 {플랜.LIGHT.name}</Link>도 확인해 보세요.
              </p>
              <button type="button" onClick={() => set무료소진팝업(false)}>확인</button>
            </div>
          </div>
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
