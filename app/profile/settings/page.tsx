"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CompanyBlockModal from "@/components/CompanyBlockModal";
import { isOpenToCompanies, 공개, 비공개 } from "@/lib/jobSearchStatus";
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
  // 프로필 공개 여부. 서버에서 읽어올 때까지는 아무 쪽도 고르지 않은 상태로 둔다 —
  // 기본값을 미리 칠해 두면 아직 모르는 값을 사실인 양 보여주게 된다.
  const [openToOffers, setOpenToOffers] = useState<boolean | null>(null);
  const [offerSaving, setOfferSaving] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  // 매장 회원인지 오피스 회원인지. 미용실 원장에게 "기업"이라고 하면 남
  // 이야기처럼 들려 자기 설정으로 읽히지 않는다.
  const [jobType, setJobType] = useState<"STORE" | "OFFICE" | null>(null);
  useEffect(() => {
    const t = localStorage.getItem("access_token");
    if (!t) return;
    fetch("/api/users/me/profile", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((res) => setOpenToOffers(isOpenToCompanies(res?.data?.profile?.job_search_status)))
      .catch(() => {});
    // job_type 은 프로필 쪽 응답에 없어 따로 받아온다.
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((res) => { if (res?.data?.job_type) setJobType(res.data.job_type); })
      .catch(() => {});
  }, []);

  // 아직 모를 때는 둘 다 적는다 — 한쪽으로 찍어 두었다가 바뀌면 잘못 읽힌다.
  const 상대 = jobType === "STORE" ? "매장" : jobType === "OFFICE" ? "기업" : "매장·기업";

  const saveOpenToOffers = async (next: boolean) => {
    const before = openToOffers;
    setOpenToOffers(next);           // 먼저 칠하고, 실패하면 되돌린다
    setOfferSaving(true);
    const t = localStorage.getItem("access_token");
    if (!t) return;
    try {
      // PATCH 는 보낸 칸만 고친다 — 다른 프로필 값은 건드리지 않는다.
      // 바꾼 시각(job_search_status_at)은 서버가 스스로 찍는다.
      const r = await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ job_search_status: next ? 공개 : 비공개 }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.error?.message || "저장 실패");
    } catch {
      setOpenToOffers(before);
      alert("변경하지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setOfferSaving(false);
    }
  };

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
        {/* 프로필 공개 — 원티드처럼 계정 설정에 둔다. 프로필 화면에도 두면
            같은 값을 고치는 곳이 둘이 되어 어느 쪽이 맞는지 헷갈린다. */}
        <section style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 400, color: "#1a1a1a", margin: "0 0 4px" }}>프로필 공개</h2>
          <p style={{ fontSize: 13, color: "#999", margin: "0 0 14px" }}>언제든 바꿀 수 있어요.</p>
          {([
            { on: true,  label: "공개",   desc: `${상대}으로부터 면접 제안을 받아볼게요.` },
            { on: false, label: "비공개", desc: "면접 제안 안 받을게요." },
          ]).map((o) => {
            const 골랐나 = openToOffers === o.on;
            return (
              <button key={o.label} type="button" disabled={offerSaving || openToOffers === null}
                onClick={() => saveOpenToOffers(o.on)}
                style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 8, padding: "13px 14px", borderRadius: 10,
                  cursor: offerSaving ? "wait" : "pointer",
                  border: 골랐나 ? "1.5px solid #5f0080" : "1.5px solid #eee",
                  background: 골랐나 ? "#faf5fc" : "#fff" }}>
                <div style={{ fontSize: 15, color: 골랐나 ? "#5f0080" : "#333" }}>{o.label}</div>
                <div style={{ fontSize: 12.5, color: "#999", marginTop: 2, lineHeight: 1.5 }}>{o.desc}</div>
              </button>
            );
          })}
        </section>

        {/* 차단 매장·기업 — 공개와 얽혀 있지만 고르는 값이 아니라 목록을
            관리하는 일이라, 나란한 선택지로 두지 않고 따로 뺀다. */}
        <section style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <button type="button" onClick={() => setBlockOpen(true)}
            style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}>
            <span style={{ textAlign: "left" }}>
              <span style={{ display: "block", fontSize: 15, color: "#1a1a1a" }}>차단 {상대}</span>
              <span style={{ display: "block", fontSize: 13, color: "#999", marginTop: 4, lineHeight: 1.5 }}>
                지금 다니는 곳처럼 곤란한 곳은 골라서 막을 수 있어요.
              </span>
            </span>
            <ChevronRight size={20} style={{ flexShrink: 0, color: "#bbb" }} />
          </button>
        </section>

        {/* 비밀번호 변경 */}
        <section style={{ background: "#fff", borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 400, color: "#1a1a1a", margin: "0 0 16px" }}>비밀번호 변경</h2>
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
          <h2 style={{ fontSize: 15, fontWeight: 400, color: "#1a1a1a", margin: "0 0 8px" }}>회원 탈퇴</h2>
          <p style={{ fontSize: 13, color: "#666", lineHeight: 1.6, margin: "0 0 16px" }}>
            탈퇴 시 계정이 비활성화되며 로그인할 수 없습니다. 작성하신 이력서와 지원 내역은 관련 법령에 따라 일정 기간 보관 후 삭제됩니다.
          </p>
          <button onClick={() => setShowWithdraw(true)}
            style={{ width: "100%", height: 48, borderRadius: 8, border: "1px solid #e74c3c", background: "#fff", color: "#e74c3c", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            회원 탈퇴
          </button>
        </section>
      </div>

      <CompanyBlockModal open={blockOpen} onClose={() => setBlockOpen(false)} noun={상대} />

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
