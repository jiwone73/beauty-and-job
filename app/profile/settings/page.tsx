"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import NotificationModal from "@/components/profile/NotificationModal";
import ProfileShell from "@/components/profile/ProfileShell";
import CompanyBlockModal from "@/components/CompanyBlockModal";
import { isOpenToCompanies, 공개, 비공개 } from "@/lib/jobSearchStatus";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  // 프로필 공개 여부. 서버에서 읽어올 때까지는 아무 쪽도 고르지 않은 상태로 둔다 —
  // 기본값을 미리 칠해 두면 아직 모르는 값을 사실인 양 보여주게 된다.
  const [openToOffers, setOpenToOffers] = useState<boolean | null>(null);
  const [offerSaving, setOfferSaving] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  // 매장 회원인지 본사 회원인지. 미용실 원장에게 "기업"이라고 하면 남
  // 이야기처럼 들려 자기 설정으로 읽히지 않는다.
  const [jobType, setJobType] = useState<"STORE" | "OFFICE" | null>(null);
  // 비밀번호 칸은 접어 둔다. 늘 펼쳐 두면 설정 화면의 절반을 차지하는데,
  // 정작 바꾸는 일은 몇 달에 한 번이다.
  const [pwOpen, setPwOpen] = useState(false);
  useEffect(() => {
    const t = localStorage.getItem("access_token");
    if (!t) return;
    fetch("/api/users/me/profile", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((res) => {
        setOpenToOffers(isOpenToCompanies(res?.data?.profile?.job_search_status));
        if (res?.data?.job_type) setJobType(res.data.job_type);
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


  return (
    <ProfileShell>
      {/* 폰에는 탭 줄이 접혀 이 화면이 무엇인지 알려 줄 것도, 빠져나갈 길도
          없다. 제목과 뒤로가기를 함께 둔다. PC 는 사이드 메뉴가 둘 다 맡는다. */}
      <div className="pf-set-title">
        <button type="button" onClick={() => router.back()} aria-label="뒤로">
          <ChevronLeft size={22} />
        </button>
        <h1>설정</h1>
      </div>

      <div className="pf-set-body">
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
                    style={{ width: 18, height: 18, accentColor: "#582681", flexShrink: 0, margin: 0 }} />
                  <span style={{ fontSize: 15, color: 골랐나 ? "#582681" : "#333" }}>{o.label}</span>
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
                style={{ width: "100%", height: 48, borderRadius: 8, border: "none", background: "#582681", color: "#fff", fontSize: 15, fontWeight: 600, cursor: pwSaving ? "not-allowed" : "pointer", opacity: pwSaving ? 0.7 : 1 }}>
                {pwSaving ? "변경 중..." : "비밀번호 변경"}
              </button>
              <p style={{ fontSize: 12, color: "#999", margin: "10px 0 0" }}>카카오 등 소셜 로그인 계정은 비밀번호 변경이 불가능합니다.</p>
            </div>
          )}
        </section>

        {/* 알림 설정 — 프로필 톱니가 열던 자리였다. 톱니가 계정 설정으로
            바뀌면서 갈 곳이 없어져 여기로 들인다. 알림도 계정 설정의 하나다. */}
        <section style={{ background: "#fff", borderRadius: 12, padding: "16px 16px" }}>
          <button type="button" onClick={() => setNotifOpen(true)}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
              background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ textAlign: "left" }}>
              <span style={{ display: "block", fontSize: 15, color: "#1a1a1a" }}>알림 설정</span>
              <span style={{ display: "block", fontSize: 13, color: "#999", marginTop: 4 }}>
                어떤 알림을 받을지 고릅니다.
              </span>
            </span>
            <ChevronRight size={18} style={{ color: "#e3e3e6", flexShrink: 0 }} />
          </button>
        </section>

        {/* 회원 탈퇴 */}
        <section style={{ background: "#fff", borderRadius: 12, padding: "16px 16px" }}>
          <h2 style={{ fontSize: 15, fontWeight: 400, color: "#1a1a1a", margin: 0 }}>회원 탈퇴</h2>
          {/* 자세한 주의사항은 모달에서 읽힌다 — 여기서 다 늘어놓으면 정작
              읽어야 할 때는 이미 지나친 글이 된다. */}
          <p style={{ fontSize: 13, color: "#999", lineHeight: 1.6, margin: "4px 0 12px" }}>
            계정이 닫히고 포트폴리오 사진은 되살릴 수 없습니다.
          </p>
          {/* 모달이 아니라 페이지로 보낸다 — 되돌릴 수 없는 일이라
              읽을 것이 많고, 주소가 남아야 빠져나가는 길도 분명하다. */}
          <button onClick={() => router.push("/profile/settings/withdraw")}
            style={{ width: "100%", height: 48, borderRadius: 8, border: "1px solid #e74c3c", background: "#fff", color: "#e74c3c", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            회원 탈퇴
          </button>
        </section>
      </div>

      <CompanyBlockModal open={blockOpen} onClose={() => setBlockOpen(false)} noun={상대 ?? "기업"} />
      <NotificationModal isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </ProfileShell>
  );
}
