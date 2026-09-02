"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Plus } from "lucide-react";
import NotificationModal from "@/components/profile/NotificationModal";
import ProfileShell from "@/components/profile/ProfileShell";
import CompanyBlockModal from "@/components/CompanyBlockModal";
import PasswordChangeModal from "@/components/PasswordChangeModal";
import { isOpenToCompanies, 공개, 비공개 } from "@/lib/jobSearchStatus";

export default function AccountSettingsPage() {
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [pwModalOpen, setPwModalOpen] = useState(false);
  // 프로필 공개 여부. 서버에서 읽어올 때까지는 아무 쪽도 고르지 않은 상태로 둔다 —
  // 기본값을 미리 칠해 두면 아직 모르는 값을 사실인 양 보여주게 된다.
  const [openToOffers, setOpenToOffers] = useState<boolean | null>(null);
  const [offerSaving, setOfferSaving] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  // 차단 목록은 「공개, 일부만 빼고」 칸 안에 그대로 펼친다 — 비공개 옆에
  // 나란히 서야 「비공개 말고 이 길도 있다」로 읽힌다.
  const [blocked, setBlocked] = useState<{ companyId: string; companyName: string }[]>([]);
  // 매장 회원인지 본사 회원인지. 미용실 원장에게 "기업"이라고 하면 남
  // 이야기처럼 들려 자기 설정으로 읽히지 않는다.
  const [jobType, setJobType] = useState<"STORE" | "OFFICE" | null>(null);
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
    fetch("/api/users/blocks", { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => r.json())
      .then((res) => { if (res?.success) setBlocked(res.data || []); })
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
            같은 값을 고치는 곳이 둘이 되어 어느 쪽이 맞는지 헷갈린다.

            가운데 칸을 둔 까닭: 비공개를 누르는 사람의 이유는 대개 「아무한테도
            보이기 싫다」가 아니라 「우리 원장만 보면 안 된다」다. 차단이 다른
            카드에 따로 서 있으면 그 사람도 비공개까지 내려가고, 인재검색에서
            통째로 사라진다. 셋을 한 줄에 세워 가운데를 고를 수 있게 한다. */}
        <section className="pf-set-card pf-vis" style={{ background: "#fff", borderRadius: 12, padding: "16px 16px", marginBottom: 10 }}>
          <h2 style={{ fontSize: 15, fontWeight: 400, color: "#1a1a1a", margin: 0 }}>
            프로필 공개
            {openToOffers !== null && (
              <span style={{ fontSize: 13, color: "#999", marginLeft: 6 }}>
                ({openToOffers ? (상대 ? `${상대}으로부터 면접 제안을 받아볼게요` : "면접 제안을 받아볼게요") : "면접 제안 안 받을게요"})
              </span>
            )}
          </h2>

          <div className="pf-vis-opts">
            {([
              { key: "open",   on: true,  label: "공개" },
              { key: "except", on: true,  label: `공개, 일부 ${상대 ?? "매장"}만 빼고` },
              { key: "close",  on: false, label: "비공개" },
            ] as const).map((o) => {
              const 골랐나 = openToOffers === null ? false
                : o.key === "close" ? openToOffers === false
                : o.key === "except" ? openToOffers === true && blocked.length > 0
                : openToOffers === true && blocked.length === 0;
              return (
                <label key={o.key} className={`pf-vis-opt${골랐나 ? " on" : ""}`}>
                  <input type="radio" name="profile-visibility" checked={골랐나}
                    disabled={offerSaving || openToOffers === null}
                    onChange={() => {
                      if (o.key === "except") {
                        // 뺄 곳이 없으면 고를 것도 없다 — 고르는 순간 찾는 판을 연다.
                        if (openToOffers !== true) saveOpenToOffers(true);
                        setBlockOpen(true);
                        return;
                      }
                      saveOpenToOffers(o.on);
                    }} />
                  <span className="pf-vis-txt">
                    {o.label}
                    {o.key === "except" && (
                      <span className="pf-vis-chips">
                        {blocked.map((b) => (
                          <span key={b.companyId} className="pf-vis-chip">{b.companyName}</span>
                        ))}
                        <button type="button" className="pf-vis-add"
                          onClick={(e) => { e.preventDefault(); if (openToOffers !== true) saveOpenToOffers(true); setBlockOpen(true); }}>
                          <Plus size={13} />{blocked.length > 0 ? "고치기" : `${상대 ?? "매장"} 고르기`}
                        </button>
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        {/* 비밀번호 변경 — '차단 기업'과 같은 자리글 방식. 늘 펼쳐 두면
            설정 화면의 절반을 차지하는데, 정작 바꾸는 일은 몇 달에 한 번이다. */}
        <section className="pf-set-card" style={{ background: "#fff", borderRadius: 12, padding: "16px 16px", marginBottom: 10 }}>
          <button type="button" onClick={() => setPwModalOpen(true)}
            style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, padding: 0, border: "none", background: "transparent", cursor: "pointer" }}>
            <span style={{ textAlign: "left" }}>
              <span style={{ display: "block", fontSize: 15, color: "#1a1a1a" }}>비밀번호 변경</span>
              <span style={{ display: "block", fontSize: 13, color: "#c4c4c9", marginTop: 4 }}>
                변경 설정하기
              </span>
            </span>
          </button>
        </section>

        {/* 알림 설정 — 프로필 톱니가 열던 자리였다. 톱니가 계정 설정으로
            바뀌면서 갈 곳이 없어져 여기로 들인다. 알림도 계정 설정의 하나다. */}
        <section className="pf-set-card" style={{ background: "#fff", borderRadius: 12, padding: "16px 16px" }}>
          <button type="button" onClick={() => setNotifOpen(true)}
            style={{ display: "flex", alignItems: "center", width: "100%",
              background: "none", border: "none", padding: 0, cursor: "pointer", fontFamily: "inherit" }}>
            <span style={{ textAlign: "left" }}>
              <span style={{ display: "block", fontSize: 15, color: "#1a1a1a" }}>알림 설정</span>
              <span style={{ display: "block", fontSize: 13, color: "#c4c4c9", marginTop: 4 }}>
                설정하기
              </span>
            </span>
          </button>
        </section>

        {/* 탈퇴는 이 화면에서 유일하게 되돌릴 수 없는 일이라, 고치는 칸들과 같은
            줄에 세우지 않는다. 카드 밖 오른쪽 아래에 작은 링크로만 둔다 —
            기업회원 계정 설정과 같은 자리, 같은 모양이다.
            모달이 아니라 페이지로 보낸다. 읽을 것이 많고, 주소가 남아야
            빠져나가는 길도 분명하다. */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button type="button" onClick={() => router.push("/profile/settings/withdraw")}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer",
              fontSize: 15, color: "#a0a0a6", textDecoration: "underline", textUnderlineOffset: 3 }}>
            회원 탈퇴
          </button>
        </div>
      </div>

      <CompanyBlockModal open={blockOpen} onClose={() => setBlockOpen(false)} noun={상대 ?? "기업"} onChange={setBlocked} />
      <PasswordChangeModal open={pwModalOpen} onClose={() => setPwModalOpen(false)} />
      <NotificationModal isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </ProfileShell>
  );
}
