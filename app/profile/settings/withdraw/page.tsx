"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useSignupStore } from "@/lib/store/signupStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { useApplicationStore } from "@/lib/store/applicationStore";

// 회원 탈퇴 — 모달이 아니라 한 페이지로 둔다.
//
// 되돌릴 수 없는 일인데 모달은 바깥을 누르면 닫히고, 읽을 것이 많으면 안에서
// 또 스크롤해야 한다. 주소가 남는 페이지라야 뒤로가기로 빠져나가는 길도 분명하다.
//
// 유의사항은 우리가 실제로 하는 일만 적는다. 보관 기간 같은 이야기는
// 개인정보 처리방침이 맡고, 여기서는 링크로만 걸어 둔다 — 탈퇴를 결심한
// 사람에게 필요한 것은 "무엇이 사라지고 무엇이 남는가"다.
export default function WithdrawPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [email, setEmail] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState(true);
  const [pw, setPw] = useState("");
  const [agree, setAgree] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const t = localStorage.getItem("access_token");
    if (!t) { router.replace("/login"); return; }
    fetch("/api/users/me/profile", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((res) => {
        setEmail(res?.data?.email ?? null);
        setHasPassword(res?.data?.has_password !== false);
      })
      .catch(() => {});
  }, [router]);

  const handleWithdraw = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    setWorking(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: pw }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error?.message || "회원 탈퇴에 실패했습니다.");
        setWorking(false);
        return;
      }
      alert("회원 탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.");
      localStorage.removeItem("access_token");
      useSignupStore.getState().reset();
      useProfileStore.getState().reset();
      useBookmarkStore.getState().reset();
      useApplicationStore.getState().reset();
      logout();
      router.push("/");
    } catch {
      alert("회원 탈퇴 중 오류가 발생했습니다.");
      setWorking(false);
    }
  };

  const 갈수있나 = agree && (!hasPassword || pw.length > 0) && !working;

  return (
    <div style={{ minHeight: "100vh", background: "#f7f8fa" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px", background: "#fff", borderBottom: "1px solid #eee", position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>회원 탈퇴</h1>
      </header>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "12px 16px 32px" }}>
        <section style={{ background: "#fff", borderRadius: 12, padding: "16px 16px", marginBottom: 10 }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "#1a1a1a", margin: "0 0 4px" }}>
            지금까지 이용해 주셔서 감사합니다.
          </p>
          <p style={{ fontSize: 13, color: "#666", margin: "0 0 14px" }}>
            탈퇴하기 전 아래 유의사항을 확인해 주세요.
          </p>
          <ul style={{ margin: 0, padding: "14px 14px", listStyle: "none", background: "#f7f8fa", borderRadius: 8, fontSize: 13, color: "#444", lineHeight: 1.7 }}>
            <li style={{ marginBottom: 8 }}>
              · 탈퇴한 계정은 <b>복구할 수 없으며</b>, 같은 이메일로 <b style={{ color: "#d13b2e" }}>다시 가입할 수 없습니다.</b>
            </li>
            <li style={{ marginBottom: 8 }}>
              · 이력서·포트폴리오·지원 내역·관심 공고가 사라지며, <b style={{ color: "#d13b2e" }}>되돌릴 수 없습니다.</b>
            </li>
            <li style={{ marginBottom: 8 }}>
              · 진행 중인 지원과 받은 면접 제안이 <b>모두 취소</b>되고, 매장·기업이 인재검색에서 회원님을 더 이상 찾을 수 없습니다.
            </li>
            <li style={{ marginBottom: 8 }}>
              · <b>포트폴리오 사진은 탈퇴와 동시에 지워집니다.</b> 필요한 사진은 탈퇴 전에 내려받아 주세요.
            </li>
            <li style={{ marginBottom: 8 }}>
              · 커뮤니티에 남긴 댓글은 삭제되지 않으므로, 지우고 싶다면 <b>탈퇴 전에</b> 삭제해 주세요.
            </li>
            <li>
              · 카카오 등 소셜 로그인 회원도 같은 방식으로 탈퇴되며, 같은 계정으로 다시 가입할 수 없습니다.
            </li>
          </ul>
        </section>

        <section style={{ background: "#fff", borderRadius: 12, padding: "16px 16px", marginBottom: 10 }}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 6 }}>
              탈퇴하려는 계정 <span style={{ color: "#5f0080", fontWeight: 400 }}>(필수)</span>
            </label>
            {/* 값이 오기 전에도 칸 높이는 잡아 둔다 */}
            <div style={{ background: "#f7f8fa", borderRadius: 8, padding: "12px 14px", fontSize: 14, color: "#333", minHeight: 20, overflowWrap: "anywhere" }}>
              {email || " "}
            </div>
          </div>

          {/* 소셜 로그인 계정은 비밀번호가 없다. 낼 수 없는 것을 요구하지 않는다. */}
          {hasPassword && (
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1a1a1a", marginBottom: 6 }}>
                비밀번호 확인 <span style={{ color: "#5f0080", fontWeight: 400 }}>(필수)</span>
              </label>
              <input type="password" placeholder="비밀번호 입력" value={pw}
                onChange={(e) => setPw(e.target.value)}
                style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
            </div>
          )}
        </section>

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", padding: "2px 4px 14px" }}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)}
            style={{ width: 17, height: 17, marginTop: 1, accentColor: "#5f0080", flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>
            유의사항을 모두 확인했으며, 이에 동의합니다.
          </span>
        </label>

        <button onClick={handleWithdraw} disabled={!갈수있나}
          style={{ width: "100%", height: 48, borderRadius: 8, border: "none",
            background: 갈수있나 ? "#e74c3c" : "#eee", color: 갈수있나 ? "#fff" : "#aaa",
            fontSize: 15, fontWeight: 600, cursor: 갈수있나 ? "pointer" : "not-allowed" }}>
          {working ? "처리 중..." : "탈퇴하기"}
        </button>
        <button onClick={() => router.back()} disabled={working}
          style={{ width: "100%", marginTop: 8, padding: "10px 0", border: "none", background: "transparent", color: "#888", fontSize: 13.5, cursor: "pointer" }}>
          취소
        </button>

        <p style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6, margin: "18px 0 0", textAlign: "center" }}>
          개인정보의 보관과 파기는{" "}
          <Link href="/support/privacy" style={{ color: "#888", textDecoration: "underline" }}>개인정보 처리방침</Link>
          을 따릅니다.
        </p>
      </div>
    </div>
  );
}
