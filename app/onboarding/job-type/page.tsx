"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/authStore";

export default function OnboardingJobTypePage() {
  const router = useRouter();
  const { login, userName, userPhone, userJobAreas } = useAuthStore();
  const [selected, setSelected] = useState<"OFFICE" | "STORE" | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!selected) {
      setError("직종을 선택해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_type: selected }),
      });
      if (!res.ok) throw new Error("저장 실패");

      login({
        ownerType: "user",
        userName,
        userPhone,
        userJobType: selected,
        userJobAreas,
      });
      router.replace("/profile");
    } catch (e) {
      console.error(e);
      setError("저장 중 오류가 발생했어요. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-[13px] text-[#7c3aed] font-semibold mb-2">거의 다 왔어요!</p>
          <h1 className="text-[22px] font-bold text-[#111]">어떤 일을 찾고 계세요?</h1>
          <p className="text-[14px] text-[#6b6b6b] mt-2">맞춤 공고를 보여드릴게요</p>
        </div>

        <div className="flex flex-col gap-3 mb-8">
          <button
            onClick={() => setSelected("STORE")}
            className={"w-full rounded-xl border-2 p-5 text-left transition-all " +
              (selected === "STORE"
                ? "border-[#7c3aed] bg-[#f5f0ff]"
                : "border-[#e5e5e5] bg-white hover:border-[#c4b5fd]")}
          >
            <p className="text-[16px] font-bold text-[#111] mb-1">💄 매장직</p>
            <p className="text-[13px] text-[#6b6b6b]">
              뷰티 살롱, 네일샵, 피부관리실 등 현장 근무
            </p>
          </button>

          <button
            onClick={() => setSelected("OFFICE")}
            className={"w-full rounded-xl border-2 p-5 text-left transition-all " +
              (selected === "OFFICE"
                ? "border-[#7c3aed] bg-[#f5f0ff]"
                : "border-[#e5e5e5] bg-white hover:border-[#c4b5fd]")}
          >
            <p className="text-[16px] font-bold text-[#111] mb-1">🏢 사무직</p>
            <p className="text-[13px] text-[#6b6b6b]">
              뷰티 브랜드, MD, 마케팅, 기획 등 사무 근무
            </p>
          </button>
        </div>

        {error && (
          <p className="text-[13px] text-red-500 text-center mb-4">{error}</p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!selected || loading}
          className="w-full h-[52px] rounded-xl bg-[#7c3aed] text-white font-semibold text-[15px] disabled:opacity-40 transition-opacity"
        >
          {loading ? "저장 중..." : "시작하기"}
        </button>
      </div>
    </div>
  );
}
