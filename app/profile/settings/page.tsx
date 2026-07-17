"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuthStore } from "@/lib/store/authStore";
import { useSignupStore } from "@/lib/store/signupStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { useApplicationStore } from "@/lib/store/applicationStore";

export default function AccountSettingsPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawPw, setWithdrawPw] = useState("");

  const handleChangePw = async () => {
    if (!curPw || !newPw) { alert("현재 비밀번호와 새 비밀번호를 입력해주세요."); return; }
    if (newPw.length < 8) { alert("새 비밀번호는 8자 이상이어야 합니다."); return; }
    if (newPw !== confirmPw) { alert("새 비밀번호가 일치하지 않습니다."); return; }
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    setPwSaving(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: curPw, new_password: newPw }),
      });
      const data = await res.json();
      if (data.success) {
        alert("비밀번호가 변경되었습니다.");
        setCurPw(""); setNewPw(""); setConfirmPw("");
      } else {
        alert(data.error?.message || "비밀번호 변경에 실패했습니다.");
      }
    } catch {
      alert("비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setPwSaving(false);
    }
  };

  const handleWithdraw = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    setWithdrawing(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: withdrawPw }),
      });
      const data = await res.json();
      if (data.success) {
        alert("회원 탈퇴가 완료되었습니다. 그동안 이용해주셔서 감사합니다.");
        localStorage.removeItem("access_token");
        useSignupStore.getState().reset();
        useProfileStore.getState().reset();
        useBookmarkStore.getState().reset();
        useApplicationStore.getState().reset();
        logout();
        router.push("/");
      } else {
        alert(data.error?.message || "회원 탈퇴에 실패했습니다.");
        setWithdrawing(false);
      }
    } catch {
      alert("회원 탈퇴 중 오류가 발생했습니다.");
      setWithdrawing(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7f8" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px", background: "#fff", borderBottom: "1px solid #eee", position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={() => router.back()} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>계정 설정</h1>
      </header>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px" }}>
        {/* 비밀번호 변경 */}
        <section style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", margin: "0 0 16px" }}>비밀번호 변경</h2>
          <input type="password" placeholder="현재 비밀번호" value={curPw} onChange={(e) => setCurPw(e.target.value)}
            style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 8, boxSizing: "border-box" }} />
          <input type="password" placeholder="새 비밀번호 (8자 이상)" value={newPw} onChange={(e) => setNewPw(e.target.value)}
            style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 8, boxSizing: "border-box" }} />
          <input type="password" placeholder="새 비밀번호 확인" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
            style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 16, boxSizing: "border-box" }} />
          <button onClick={handleChangePw} disabled={pwSaving}
            style={{ width: "100%", height: 48, borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 15, fontWeight: 600, cursor: pwSaving ? "not-allowed" : "pointer", opacity: pwSaving ? 0.7 : 1 }}>
            {pwSaving ? "변경 중..." : "비밀번호 변경"}
          </button>
          <p style={{ fontSize: 12, color: "#999", margin: "10px 0 0" }}>카카오 등 소셜 로그인 계정은 비밀번호 변경이 불가능합니다.</p>
        </section>

        {/* 회원 탈퇴 */}
        <section style={{ background: "#fff", borderRadius: 12, padding: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a", margin: "0 0 8px" }}>회원 탈퇴</h2>
          <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: "0 0 16px" }}>
            탈퇴 시 계정이 비활성화되며 로그인할 수 없습니다. 작성하신 이력서와 지원 내역은 관련 법령에 따라 일정 기간 보관 후 삭제됩니다.
          </p>
          <button onClick={() => setShowWithdraw(true)}
            style={{ width: "100%", height: 48, borderRadius: 8, border: "1px solid #e74c3c", background: "#fff", color: "#e74c3c", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            회원 탈퇴
          </button>
        </section>
      </div>

      {/* 탈퇴 확인 모달 */}
      {showWithdraw && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={() => !withdrawing && setShowWithdraw(false)}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 24, maxWidth: 360, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 12px" }}>정말 탈퇴하시겠어요?</h3>
            <p style={{ fontSize: 14, color: "#666", lineHeight: 1.6, margin: "0 0 20px" }}>
              탈퇴하면 계정에 로그인할 수 없게 됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
            <input type="password" placeholder="비밀번호 (소셜 로그인은 비워두세요)"
              value={withdrawPw} onChange={(e) => setWithdrawPw(e.target.value)}
              style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 16, boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowWithdraw(false); setWithdrawPw(""); }} disabled={withdrawing}
                style={{ flex: 1, height: 48, borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#333", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
                취소
              </button>
              <button onClick={handleWithdraw} disabled={withdrawing}
                style={{ flex: 1, height: 48, borderRadius: 8, border: "none", background: "#e74c3c", color: "#fff", fontSize: 15, fontWeight: 600, cursor: withdrawing ? "not-allowed" : "pointer", opacity: withdrawing ? 0.7 : 1 }}>
                {withdrawing ? "처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
