"use client";
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Image from "next/image";

/**
 * 인재 추천 관심 확인 — 로그인 없이 메일·알림 링크로 들어오는 화면.
 *
 * 버튼을 눌러야만(POST) 응답이 기록된다. 메일 프로그램이 링크를 미리 열어
 * 보는 것(프리페치)에 걸려 누르지도 않았는데 응답이 남는 일을 막는다.
 */
export default function TalentRecommendationRespondPage() {
  const { id } = useParams<{ id: string }>();
  const token = useSearchParams()?.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ status: string; companyName: string; jobTitle: string; userName: string } | null>(null);
  const [error, setError] = useState("");
  const [choosing, setChoosing] = useState(false);
  const [result, setResult] = useState<"yes" | "no" | null>(null);

  // 메일 링크는 token으로, 인앱 알림 클릭은 로그인 토큰으로 — 저장된 access_token이
  // 있으면 같이 보낸다(당사자면 token 없이도 열린다).
  const authHeader = (): HeadersInit => {
    const t = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  useEffect(() => {
    if (!id) { setError("링크가 올바르지 않아요."); setLoading(false); return; }
    const qs = token ? `?token=${encodeURIComponent(token)}` : "";
    fetch(`/api/talent-recommendations/${id}${qs}`, { headers: authHeader() })
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) { setError("링크가 올바르지 않아요."); return; }
        setData(res.data);
        if (res.data.status === "INTERESTED") setResult("yes");
        else if (res.data.status === "DECLINED") setResult("no");
      })
      .catch(() => setError("불러오지 못했어요. 잠시 후 다시 시도해주세요."))
      .finally(() => setLoading(false));
  }, [id, token]);

  const 선택 = async (choice: "yes" | "no") => {
    setChoosing(true);
    try {
      const r = await fetch(`/api/talent-recommendations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({ token, choice }),
      });
      const res = await r.json();
      if (!res.success) { setError("저장하지 못했어요. 잠시 후 다시 시도해주세요."); return; }
      setResult(choice);
    } catch {
      setError("저장하지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setChoosing(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f7f6f9", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 14, padding: "40px 32px", textAlign: "center" }}>
        <Image src="/images/logo.png" alt="뷰티워크" width={120} height={28} style={{ margin: "0 auto 28px" }} />

        {loading ? (
          <p style={{ fontSize: 14, color: "#555" }}>불러오는 중…</p>
        ) : error ? (
          <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7 }}>{error}</p>
        ) : result === "yes" ? (
          <>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#333", margin: "0 0 8px" }}>전달했어요</p>
            <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, margin: 0 }}>
              {data?.companyName}에 관심을 전달했어요.<br />연락이 오면 반갑게 맞아주세요!
            </p>
          </>
        ) : result === "no" ? (
          <>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#333", margin: "0 0 8px" }}>확인했어요</p>
            <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, margin: 0 }}>이 추천은 더 이상 보내지 않을게요.</p>
          </>
        ) : data ? (
          <>
            <p style={{ fontSize: 18, fontWeight: 700, color: "#333", margin: "0 0 8px" }}>관심 있으세요?</p>
            <p style={{ fontSize: 14, color: "#555", lineHeight: 1.7, margin: "0 0 28px" }}>
              <b>{data.companyName}</b>의 「{data.jobTitle}」 포지션이 프로필과 잘 맞아요.<br />
              관심 표시하시면 그 기업에게만 알려드리고, 이후 연락은 기업이 제안으로 보내드려요.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" disabled={choosing} onClick={() => 선택("no")}
                style={{ flex: 1, padding: "13px 0", borderRadius: 8, border: "1px solid #e5e5ea", background: "#fff", color: "#555", fontSize: 15, fontWeight: 600, cursor: choosing ? "default" : "pointer" }}>
                관심 없어요
              </button>
              <button type="button" disabled={choosing} onClick={() => 선택("yes")}
                style={{ flex: 1, padding: "13px 0", borderRadius: 8, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: 15, fontWeight: 600, cursor: choosing ? "default" : "pointer" }}>
                관심 있어요
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
