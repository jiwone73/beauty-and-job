"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Eye, Lock, Bell } from "lucide-react";
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

  // 지금 어느 칸인가. 저장하는 값은 공개/비공개 하나뿐이고, 가운데 칸은
  // 「공개인데 제한 목록이 있다」에서 따라 나온다.
  const 공개칸: "open" | "except" | "close" | null =
    openToOffers === null ? null
      : openToOffers === false ? "close"
      : blocked.length > 0 ? "except" : "open";

  const 공개칸고르기 = (칸: "open" | "except" | "close") => {
    if (칸 === 공개칸) { if (칸 === "except") setBlockOpen(true); return; }
    if (칸 === "except") {
      if (openToOffers !== true) saveOpenToOffers(true);
      setBlockOpen(true);           // 뺄 곳이 없으면 고를 것도 없다
      return;
    }
    // 전체 공개로 돌아가려면 제한 목록이 비어야 한다 — 목록을 둔 채 「전체
    // 공개」라 적어 두면 둘 중 어느 쪽이 사실인지 알 수 없다. 남의 설정을
    // 말없이 지우지는 않는다.
    if (칸 === "open" && blocked.length > 0) {
      if (!confirm(`열람 제한 ${상대 ?? "기업"} ${blocked.length}곳이 해제됩니다. 계속할까요?`)) return;
      const t = localStorage.getItem("access_token");
      const 지울것 = blocked;
      setBlocked([]);
      Promise.all(지울것.map((b) =>
        fetch(`/api/users/blocks/${b.companyId}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } })
      )).catch(() => setBlocked(지울것));
    }
    saveOpenToOffers(칸 !== "close");
  };

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
        {/* 세 칸을 카드 세 장으로 세우면 서로 다른 이야기처럼 보인다. 프로필
            화면처럼 한 판 안에서 가는 선으로만 나눈다 — 같은 계정을 다루는
            일들이니 한 묶음으로 읽혀야 한다. */}
        <section className="pf-set-one">
          {/* 이력서 공개 — 「공개 · 부분공개 · 비공개」는 잡코리아가 쓰는 세
              갈래 그대로다. 부분공개는 특정 회사를 노출에서 제외하는 것을
              뜻하니 우리 가운데 칸과 같은 말이다. 그 안에 담기는 목록은
              사람인·원티드가 부르는 「열람 제한 기업」이다 — 하나는 상태의
              이름이고 하나는 목록의 이름이라 층이 달라 같이 쓸 수 있다.

              가운데 칸을 둔 까닭: 비공개를 누르는 사람의 이유는 대개 「아무한테도
              보이기 싫다」가 아니라 「우리 원장만 보면 안 된다」다. 제한 목록이
              다른 카드에 따로 서 있으면 그 사람도 비공개까지 내려가고,
              인재검색에서 통째로 사라진다. 셋을 나란히 세워 가운데가 비공개와
              대등하게 보이게 한다. */}
          <div className="pf-set-line">
            <span className="profile-info-label"><Eye size={16} className="profile-info-icon" />이력서 공개</span>

            <div className="pf-vis-opts" role="radiogroup" aria-label="이력서 공개">
              {([
                { key: "open",   label: "공개",     desc: `모든 ${상대 ?? "기업"}이 열람·면접 제안` },
                { key: "except", label: "부분공개", desc: `지정한 ${상대 ?? "기업"}만 제외` },
                { key: "close",  label: "비공개",   desc: "면접 제안 안 받음, 지원한 곳만 열람" },
              ] as const).map((o) => (
                <label key={o.key} className={`pf-vis-opt${공개칸 === o.key ? " on" : ""}`}>
                  <input type="radio" name="resume-visibility" checked={공개칸 === o.key}
                    disabled={offerSaving || openToOffers === null}
                    onChange={() => 공개칸고르기(o.key)} />
                  <span className="pf-vis-opt-t">{o.label}</span>
                  <span className="pf-vis-opt-d">{o.desc}</span>
                </label>
              ))}
            </div>

            {/* 제한 목록은 그 칸을 골랐을 때만 나온다 — 공개인데 제한 기업이
                적혀 있으면 둘 중 어느 쪽이 사실인지 알 수 없다. */}
            {공개칸 === "except" && (
              <button type="button" className="pf-vis-row" onClick={() => setBlockOpen(true)}>
                <span className="pf-vis-row-k">열람 제한 {상대 ?? "기업"}</span>
                <span className="pf-vis-row-v">
                  {blocked.length === 0 ? "고르기"
                    : blocked.length === 1 ? blocked[0].companyName
                    : `${blocked[0].companyName} 외 ${blocked.length - 1}곳`}
                </span>
                <ChevronRight size={16} className="pf-vis-row-go" />
              </button>
            )}
          </div>

          {/* 비밀번호와 알림은 늘 펼쳐 두면 화면 절반을 먹는데, 정작 손대는 일은
              몇 달에 한 번이다. 이름만 두고 판은 눌렀을 때 연다. */}
          {/* 알림 설정은 프로필 톱니가 열던 자리였다. 둘 다 이름만 있고 판은
              눌렀을 때 열리니, 한 줄을 반씩 나눠 쓴다 — 프로필 화면이 이름·국적을
              나란히 두는 것과 같다. */}
          <div className="pf-set-line is-last pf-set-two">
            <button type="button" className="pf-set-go-b" onClick={() => setPwModalOpen(true)}>
              <span className="profile-info-label"><Lock size={16} className="profile-info-icon" />비밀번호 변경</span>
              <ChevronRight size={16} className="pf-set-go" />
            </button>
            <button type="button" className="pf-set-go-b" onClick={() => setNotifOpen(true)}>
              <span className="profile-info-label"><Bell size={16} className="profile-info-icon" />알림 설정</span>
              <ChevronRight size={16} className="pf-set-go" />
            </button>
          </div>
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
