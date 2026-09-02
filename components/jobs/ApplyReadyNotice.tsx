"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ChevronRight } from "lucide-react";

// 지원 버튼 아래 — 낼 수 없을 때만 뜬다.
//
// 예전에는 여기에 「작성 → 확인 → 제출」 세 줄을 늘 세워 두었다. 창을 열면
// 그 안이 같은 단계를 더 정확한 말로 그려 주니 같은 말을 두 번 한 셈이었고,
// 회원 104명 중 102명에게 늘 초록불이라 아무것도 알리지 못했다.
// 걸리는 사람에게만, 무엇이 비었는지와 고치러 갈 길만 준다.

export default function ApplyReadyNotice() {
  const router = useRouter();
  const [막힘, set막힘] = useState<{ 말: string; 가는곳: string; 버튼: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    let 살아있음 = true;
    fetch("/api/users/me/apply-ready", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (!살아있음 || !res?.success || !res.data || res.data.ready) return;
        const d = res.data;
        if (d.missing?.length > 0) {
          set막힘({ 말: `프로필에 ${d.missing.join(", ")}이(가) 비어 있어요.`, 가는곳: "/profile", 버튼: "프로필 채우기" });
        } else if (!d.hasResume) {
          set막힘({ 말: "아직 기본 이력서가 없어요.", 가는곳: "/profile/resume", 버튼: "이력서 만들기" });
        }
      })
      .catch(() => {});
    return () => { 살아있음 = false; };
  }, []);

  if (!막힘) return null;

  return (
    <button type="button" className="apply-block" onClick={() => router.push(막힘.가는곳)}>
      <AlertCircle size={16} className="apply-block-ic" />
      <span className="apply-block-txt">{막힘.말}</span>
      <span className="apply-block-go">{막힘.버튼}<ChevronRight size={14} /></span>
    </button>
  );
}
