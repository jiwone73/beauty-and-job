"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
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
  // 비밀번호 칸은 접어 둔다. 늘 펼쳐 두면 설정 화면의 절반을 차지하는데,
  // 정작 바꾸는 일은 몇 달에 한 번이다.
  const [pwOpen, setPwOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  // 소셜 로그인 계정은 비밀번호가 없어 확인 절차를 건너뛴다(서버도 그렇게 한다).
  const [hasPassword, setHasPassword] = useState(true);
  // 탈퇴는 되돌릴 수 없다. 무엇이 사라지는지 읽고 스스로 두 번 확인하게 한다.
  const [agreeLoss, setAgreeLoss] = useState(false);
  const [agreeDelete, setAgreeDelete] = useState(false);
  useEffect(() => {
    const t = localStorage.getItem("access_token");
    if (!t) return;
    fetch("/api/users/me/profile", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((res) => {
        setOpenToOffers(isOpenToCompanies(res?.data?.profile?.job_search_status));
        if (res?.data?.job_type) setJobType(res.data.job_type);
        setEmail(res?.data?.email ?? null);
        setHasPassword(res?.data?.has_password !== false);
      })
      .catch(() => {});
  }, []);

  // 알기 전에는 아무 이름도 쓰지 않는다. 한쪽으로 찍어 두었다가 바뀌면
  // 잘못된 말이 잠깐 스친다 — 자리만 비워 두고 값이 오면 채운다.
  const 상대 = jobType === "STORE" ? "매장" : jobType === "OFFICE" ? "기업" : null;

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

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "12px 16px 24px" }}>
        {/* 프로필 공개 — 원티드처럼 계정 설정에 둔다. 프로필 화면에도 두면
            같은 값을 고치는 곳이 둘이 되어 어느 쪽이 맞는지 헷갈린다. */}
        <section style={{ background: "#fff", borderRadius: 12, padding: "16px 16px", marginBottom: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 400, color: "#1a1a1a", margin: "0 0 4px" }}>프로필 공개</h2>
          <p style={{ fontSize: 13, color: "#999", margin: 0 }}>언제든 바꿀 수 있어요.</p>
          {/* 두 갈래뿐이라 한 행에 나란히 둔다. 카드 두 장으로 세우면 화면
              절반을 먹는데, 정작 담긴 뜻은 켜냐 끄냐 하나다.
              설명은 지금 고른 쪽 것만 아래에 한 줄로 적는다. */}
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 12 }}>
            {([
              { on: true,  label: "공개" },
              { on: false, label: "비공개" },
            ]).map((o) => {
              const 골랐나 = openToOffers === o.on;
              return (
                <label key={o.label}
                  style={{ display: "flex", alignItems: "center", gap: 7,
                    cursor: offerSaving || openToOffers === null ? "default" : "pointer" }}>
                  <input type="radio" name="profile-visibility"
                    checked={골랐나}
                    disabled={offerSaving || openToOffers === null}
                    onChange={() => saveOpenToOffers(o.on)}
                    style={{ width: 18, height: 18, accentColor: "#5f0080", flexShrink: 0, margin: 0 }} />
                  <span style={{ fontSize: 15, color: 골랐나 ? "#5f0080" : "#333" }}>{o.label}</span>
                </label>
              );
            })}
          </div>
          {/* 값이 오기 전에도 줄 높이는 잡아 둔다 — 늦게 와도 아래가 밀리지 않는다. */}
          <p style={{ fontSize: 12.5, color: "#999", lineHeight: 1.5, minHeight: 19, margin: "8px 0 0" }}>
            {openToOffers === null ? "" : openToOffers ? (상대 ? `${상대}으로부터 면접 제안을 받아볼게요.` : "") : "면접 제안 안 받을게요."}
          </p>
        </section>

        {/* 차단 매장·기업 — 공개와 얽혀 있지만 고르는 값이 아니라 목록을
            관리하는 일이라, 나란한 선택지로 두지 않고 따로 뺀다. */}
        <section style={{ background: "#fff", borderRadius: 12, padding: "16px 16px", marginBottom: 10 }}>
          <button type="button" onClick={() => setBlockOpen(true)}
            style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}>
            <span style={{ textAlign: "left" }}>
              <span style={{ display: "block", fontSize: 15, color: "#1a1a1a", visibility: 상대 ? "visible" : "hidden" }}>차단 {상대 ?? "기업"}</span>
              <span style={{ display: "block", fontSize: 13, color: "#999", marginTop: 4, lineHeight: 1.5 }}>
                지금 다니는 곳처럼 곤란한 곳은 골라서 막을 수 있어요.
              </span>
            </span>
            <ChevronRight size={20} style={{ flexShrink: 0, color: "#bbb" }} />
          </button>
        </section>

        {/* 비밀번호 변경 — 접어 둔다. 늘 펼쳐 두면 설정 화면의 절반을
            차지하는데, 정작 바꾸는 일은 몇 달에 한 번이다. */}
        <section style={{ background: "#fff", borderRadius: 12, padding: "16px 16px", marginBottom: 10 }}>
          <button type="button" onClick={() => setPwOpen((v) => !v)} aria-expanded={pwOpen}
            style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 10, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}>
            <span style={{ fontSize: 15, color: "#1a1a1a" }}>비밀번호 변경</span>
            <ChevronDown size={20} style={{ flexShrink: 0, color: "#bbb", transform: pwOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
          </button>
          {pwOpen && (
            <div style={{ marginTop: 16 }}>
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
            </div>
          )}
        </section>

        {/* 회원 탈퇴 */}
        <section style={{ background: "#fff", borderRadius: 12, padding: "16px 16px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 400, color: "#1a1a1a", margin: 0 }}>회원 탈퇴</h2>
          {/* 자세한 주의사항은 모달에서 읽힌다 — 여기서 다 늘어놓으면 정작
              읽어야 할 때는 이미 지나친 글이 된다. */}
          <p style={{ fontSize: 13, color: "#999", lineHeight: 1.6, margin: "4px 0 12px" }}>
            계정이 닫히고 포트폴리오 사진은 되살릴 수 없습니다.
          </p>
          <button onClick={() => setShowWithdraw(true)}
            style={{ width: "100%", height: 48, borderRadius: 8, border: "1px solid #e74c3c", background: "#fff", color: "#e74c3c", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            회원 탈퇴
          </button>
        </section>
      </div>

      <CompanyBlockModal open={blockOpen} onClose={() => setBlockOpen(false)} noun={상대 ?? "기업"} />

      {/* 탈퇴 확인 — 되돌릴 수 없는 일이라 무엇이 사라지는지 먼저 읽힌다.
          문구는 실제 동작에 맞췄다. 계정은 닫히고(status=WITHDRAWN) 포트폴리오
          사진은 저장소에서 그 자리에서 지워지지만, 이력서·지원 내역은 법령상
          보관 기간이 있어 바로 사라지지 않는다. 지워진다고 적으면 거짓이 된다. */}
      {showWithdraw && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => !withdrawing && setShowWithdraw(false)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, maxWidth: 420, width: "100%", maxHeight: "88dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, padding: "18px 20px", textAlign: "center", borderBottom: "1px solid #f0f0f0" }}>
              회원 탈퇴 시 주의사항
            </h3>

            <div style={{ overflowY: "auto", padding: "18px 20px", flex: 1, minHeight: 0 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#666", margin: "0 0 8px" }}>탈퇴하기 전에</h4>
              <ul style={{ margin: "0 0 18px", padding: 0, listStyle: "none", fontSize: 13, color: "#444", lineHeight: 1.65 }}>
                <li style={{ marginBottom: 6 }}>· 계정이 닫혀 <b>다시 로그인할 수 없고</b>, {상대 ?? "매장·기업"}이 인재검색에서 회원님을 더 이상 찾을 수 없습니다.</li>
                <li>· 진행 중인 지원과 받은 면접 제안이 <b>모두 취소</b>됩니다.</li>
              </ul>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#666", margin: "0 0 8px" }}>미리 내려받기</h4>
              <ul style={{ margin: "0 0 18px", padding: 0, listStyle: "none", fontSize: 13, color: "#444", lineHeight: 1.65 }}>
                <li>· <b>포트폴리오 사진은 탈퇴와 동시에 지워지며 되살릴 수 없습니다.</b> 필요한 사진은 탈퇴 전에 내려받아 주세요.</li>
              </ul>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#666", margin: "0 0 8px" }}>미리 정리하기</h4>
              <ul style={{ margin: "0 0 18px", padding: 0, listStyle: "none", fontSize: 13, color: "#444", lineHeight: 1.65 }}>
                <li>· 이력서와 지원 내역은 관련 법령에 따라 <b>일정 기간 보관한 뒤 삭제</b>됩니다. 그동안에는 고치거나 지울 수 없으니, 정리할 것이 있으면 탈퇴 전에 해 주세요.</li>
              </ul>

              <div style={{ height: 1, background: "#f0f0f0", margin: "4px 0 16px" }} />

              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#333", margin: "0 0 8px" }}>탈퇴하려는 계정</h4>
              <div style={{ background: "#f7f8fa", borderRadius: 8, padding: "12px 14px", fontSize: 14, color: "#333", marginBottom: 18, overflowWrap: "anywhere" }}>
                {email || "\u00a0"}
              </div>

              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#333", margin: "0 0 8px" }}>사라지는 것</h4>
              <ul style={{ margin: "0 0 4px", padding: 0, listStyle: "none", fontSize: 13, color: "#444", lineHeight: 1.75 }}>
                <li>· 프로필과 이력서</li>
                <li>· 포트폴리오 사진 (바로 삭제)</li>
                <li>· 지원 내역과 관심 공고</li>
                <li>· 받은 면접 제안</li>
              </ul>
            </div>

            <div style={{ borderTop: "1px solid #f0f0f0", padding: "14px 20px 18px" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 8 }}>
                <input type="checkbox" checked={agreeLoss} onChange={(e) => setAgreeLoss(e.target.checked)}
                  style={{ width: 17, height: 17, marginTop: 1, accentColor: "#5f0080", flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: "#555", lineHeight: 1.5 }}>
                  포트폴리오 사진이 바로 지워지며 되살릴 수 없음을 이해했습니다.
                </span>
              </label>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer", marginBottom: 14 }}>
                <input type="checkbox" checked={agreeDelete} onChange={(e) => setAgreeDelete(e.target.checked)}
                  style={{ width: 17, height: 17, marginTop: 1, accentColor: "#5f0080", flexShrink: 0 }} />
                <span style={{ fontSize: 12.5, color: "#555", lineHeight: 1.5 }}>
                  뷰티워크 계정을 닫고 등록한 정보를 삭제하는 데 동의합니다.
                </span>
              </label>

              {/* 소셜 로그인 계정은 비밀번호가 없다. 낼 수 없는 것을 요구하지 않는다. */}
              {hasPassword && (
                <input type="password" placeholder="비밀번호" value={withdrawPw}
                  onChange={(e) => setWithdrawPw(e.target.value)}
                  style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 10, boxSizing: "border-box" }} />
              )}

              {(() => {
                const 갈수있나 = agreeLoss && agreeDelete && (!hasPassword || withdrawPw.length > 0) && !withdrawing;
                return (
                  <button onClick={handleWithdraw} disabled={!갈수있나}
                    style={{ width: "100%", height: 48, borderRadius: 8, border: "none",
                      background: 갈수있나 ? "#e74c3c" : "#eee", color: 갈수있나 ? "#fff" : "#aaa",
                      fontSize: 15, fontWeight: 600, cursor: 갈수있나 ? "pointer" : "not-allowed" }}>
                    {withdrawing ? "처리 중..." : "회원 탈퇴"}
                  </button>
                );
              })()}
              <button onClick={() => { setShowWithdraw(false); setWithdrawPw(""); setAgreeLoss(false); setAgreeDelete(false); }}
                disabled={withdrawing}
                style={{ width: "100%", marginTop: 8, padding: "10px 0", border: "none", background: "transparent", color: "#888", fontSize: 13.5, cursor: "pointer" }}>
                회원 탈퇴 취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
