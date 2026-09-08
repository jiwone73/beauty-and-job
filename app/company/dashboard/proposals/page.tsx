"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import ProposalThread from "@/components/proposal/ProposalThread";
import { 제안유효일, 제안만료, 제안남은날 } from "@/lib/proposal";
import { 마감인가 } from "@/lib/jobClosed";
import { Send, Pencil, ChevronRight } from "lucide-react";

// 제안관리 — 공고를 고르고, 그 공고로 보낸 사람들을 표로 본다.
//
// 예전에는 보낸 제안을 카드 한 줄로 늘어놓았다. 카드는 「누구에게 보냈나」는
// 말해도 「지금 어떤 상태고 누가 뭘 해야 하나」를 못 말한다 — 상태 한 마디를
// 넣을 자리밖에 없어 언제 그렇게 됐는지, 행위의 주체가 누구인지가 다 빠졌다.
// 표는 그것들이 각각 제 열을 갖는다. 공고·지원자 관리와 같은 짜임이다.

type 제안 = {
  id: string;
  createdAt: string;
  readAt: string | null;
  interestedAt: string | null;
  declinedAt: string | null;
  interestMessage: string | null;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  jobTitle: string | null;
  jobPostingId: string | null;
  jobStatus: string | null;
  jobDeadline: string | null;
  jobCreatedAt: string | null;
  jobPositions: any[] | null;
  jobEmploymentType: string | null;
  jobExperienceLevel: string | null;
  jobCategories: string[] | null;
  jobHeadcount: number | null;
  lastSender: "USER" | "COMPANY" | null;
  lastMessageAt: string | null;
  messageCount: number;
  appointmentAt: string | null;
  applicationStatus: string | null;
  blocked: boolean;
  appliedAt: string | null;
  note: string;
};

const 날짜 = (s: string) =>
  new Date(s).toLocaleDateString("ko-KR", { year: "2-digit", month: "2-digit", day: "2-digit" })
    .replace(/\.$/, "").replace(/\s/g, "");

const 때 = (s: string) => {
  const d = new Date(s);
  const 오늘 = new Date().toDateString() === d.toDateString();
  const 시각 = d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return 오늘 ? `오늘 ${시각}` : `${d.getMonth() + 1}.${d.getDate()} ${시각}`;
};

// 상태는 하나만 정한다. 위에서부터 먼저 맞는 것이 그 사람의 상태다 —
// 채용까지 갔으면 채팅 중이기도 하지만 말할 것은 채용이다.
type 상태키 = "채용완료" | "면접예정" | "채팅중" | "수락" | "거절" | "답변대기" | "기간지남";
const 상태색: Record<상태키, string> = {
  채용완료: "#1f7a4d", 면접예정: "#582681", 채팅중: "#582681",
  수락: "#1f7a4d", 거절: "#b4b4b9", 답변대기: "#8a8a90", 기간지남: "#b4b4b9",
};

function 상태(p: 제안): 상태키 {
  if (p.applicationStatus === "PASSED") return "채용완료";
  if (p.declinedAt || p.blocked) return "거절";
  if (p.appointmentAt) return "면접예정";
  if (p.interestedAt) return p.messageCount > 0 ? "채팅중" : "수락";
  if (제안만료(p.createdAt, p.interestedAt)) return "기간지남";
  return "답변대기";
}

/** 마지막으로 무슨 일이 있었나. 주체를 반드시 밝힌다 — 「답장 기다리는 중」은
 *  누가 기다리는지가 없어 카드에서 가장 헷갈리던 말이었다. */
function 최근활동(p: 제안): { 글: string; 때: string | null } {
  const 이름 = p.userName;
  if (p.applicationStatus === "PASSED") return { 글: `${이름} 최종합격`, 때: p.appliedAt };
  if (p.appliedAt) return { 글: `${이름}이 지원했습니다`, 때: p.appliedAt };
  if (p.declinedAt) return { 글: `${이름}이 거절했습니다`, 때: p.declinedAt };
  if (p.blocked) return { 글: "차단됨", 때: null };
  if (p.appointmentAt) {
    const d = new Date(p.appointmentAt);
    return { 글: `${d.getMonth() + 1}.${d.getDate()} 면접 약속`, 때: p.lastMessageAt };
  }
  if (p.messageCount > 0) {
    return p.lastSender === "USER"
      ? { 글: `${이름}이 메시지를 보냈습니다`, 때: p.lastMessageAt }
      : { 글: "메시지를 보냈습니다", 때: p.lastMessageAt };
  }
  if (p.interestedAt) return { 글: `${이름}이 제안을 수락했습니다`, 때: p.interestedAt };
  if (p.readAt) return { 글: `${이름}이 읽었습니다`, 때: p.readAt };
  return { 글: "제안을 보냈습니다", 때: p.createdAt };
}

/** 다음에 할 일. 우리 차례인 것만 색을 채운다. */
function 다음할일(p: 제안): { 글: string; 우리차례: boolean } | null {
  const st = 상태(p);
  if (st === "거절" || st === "기간지남") return null;
  if (st === "채용완료") return { 글: "지원서 보기", 우리차례: false };
  if (st === "면접예정") return { 글: "일정 확인", 우리차례: false };
  if (st === "채팅중") return { 글: "대화하기", 우리차례: p.lastSender === "USER" };
  if (st === "수락") return { 글: "대화하기", 우리차례: true };
  return { 글: "대화하기", 우리차례: false };
}

export default function CompanyProposalsPage() {
  const [목록, set목록] = useState<제안[]>([]);
  const [로딩, set로딩] = useState(true);
  const [대화, set대화] = useState<제안 | null>(null);
  const [고른공고, set고른공고] = useState<string | "ALL">("ALL");
  const [고른상태, set고른상태] = useState<상태키 | "전체">("전체");
  const [공고검색, set공고검색] = useState("");
  // 지금 적고 있는 메모. 칸을 벗어날 때 저장한다 — 글자마다 보내면 서버가 시끄럽다.
  const [메모중, set메모중] = useState<{ id: string; 값: string } | null>(null);
  // 메모 칸을 연 줄. 아이콘을 눌러야 열린다 — 표에 입력칸이 줄마다 서 있으면
  // 아직 안 적은 칸까지 다 「채워야 할 자리」로 읽힌다.
  const [메모연줄, set메모연줄] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const base = pathname.split("/").filter(Boolean)[0] === "company"
    ? "/company/dashboard" : `/${pathname.split("/").filter(Boolean)[0]}`;
  const 이력서열기 = (p: 제안) => router.push(`${base}/talent/${p.userId}`);

  const 불러오기 = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const r = await fetch("/api/company/proposals", { headers: { Authorization: `Bearer ${token}` } })
      .then((x) => x.json()).catch(() => null);
    if (r?.success && Array.isArray(r.data)) set목록(r.data);
    set로딩(false);
  }, []);
  useEffect(() => { 불러오기(); }, [불러오기]);

  const 메모저장 = async (p: 제안, 값: string) => {
    set메모중(null);
    if ((값 || "") === (p.note || "")) return;
    set목록((prev) => prev.map((x) => (x.id === p.id ? { ...x, note: 값 } : x)));
    const token = localStorage.getItem("access_token");
    await fetch("/api/company/proposals", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, note: 값 }),
    }).catch(() => {});
  };

  // 왼쪽 공고 목록. 제안을 보낸 공고만 나온다 — 안 보낸 공고를 늘어놓으면
  // 고를 것이 없는 줄이 대부분을 차지한다.
  const 공고들 = useMemo(() => {
    const 표 = new Map<string, { id: string; 제목: string; 수: number; 마감: boolean }>();
    for (const p of 목록) {
      const id = p.jobPostingId || "none";
      const 앞 = 표.get(id);
      if (앞) 앞.수 += 1;
      else 표.set(id, {
        id, 제목: p.jobTitle || "공고 없음", 수: 1,
        마감: 마감인가(p.jobStatus, p.jobDeadline),
      });
    }
    return [...표.values()]
      .filter((g) => !공고검색.trim() || g.제목.includes(공고검색.trim()))
      .sort((a, b) => Number(a.마감) - Number(b.마감) || b.수 - a.수);
  }, [목록, 공고검색]);

  const 공고고른것 = 고른공고 === "ALL" ? 목록 : 목록.filter((p) => (p.jobPostingId || "none") === 고른공고);

  // 상태 칩. 0건인 상태도 자리를 지킨다 — 있다 없다 하면 누를 자리가 흔들린다.
  const 칩들 = useMemo(() => {
    const 순서: 상태키[] = ["답변대기", "수락", "채팅중", "면접예정", "채용완료", "거절", "기간지남"];
    const 셈 = new Map<상태키, number>();
    for (const p of 공고고른것) 셈.set(상태(p), (셈.get(상태(p)) || 0) + 1);
    return [{ 키: "전체" as const, 수: 공고고른것.length },
            ...순서.filter((k) => (셈.get(k) || 0) > 0).map((k) => ({ 키: k, 수: 셈.get(k)! }))];
  }, [공고고른것]);

  const 줄들 = useMemo(() => {
    const l = 고른상태 === "전체" ? 공고고른것 : 공고고른것.filter((p) => 상태(p) === 고른상태);
    // 우리 차례인 것이 먼저. 그다음 최근 활동 순.
    return [...l].sort((a, b) => {
      const 급 = (p: 제안) => (다음할일(p)?.우리차례 ? 0 : 1);
      return 급(a) - 급(b) ||
        +new Date(b.lastMessageAt || b.createdAt) - +new Date(a.lastMessageAt || a.createdAt);
    });
  }, [공고고른것, 고른상태]);

  // 공고 머리에 쓸 값. 그 공고로 보낸 제안 아무 줄에서나 가져온다 — 같은 공고면
  // 어느 줄이든 같은 값이다.
  const 공고머리 = useMemo(() => {
    if (고른공고 === "ALL") return null;
    const p = 목록.find((x) => (x.jobPostingId || "none") === 고른공고);
    if (!p) return null;
    const md = (s: string) => {
      const d = new Date(s);
      return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    };
    const 기간 = p.jobCreatedAt
      ? `${md(p.jobCreatedAt)} ~ ${p.jobDeadline ? md(p.jobDeadline) : "상시"}`
      : "";
    // 조건 줄은 공고·지원자 관리와 같은 차례로 만든다. 모집부문이 있으면
    // 부문마다 한 줄, 없으면 공고에 적힌 직군·고용형태·경력으로 한 줄이다.
    // 부문만 보고 있어서 부문이 빈 공고는 「신입」 한 마디만 남았다.
    const 경력글 = (v: string | null) =>
      v === "NEW" ? "신입" : v === "EXPERIENCED" ? "경력" : "경력무관";
    const 부문 = Array.isArray(p.jobPositions) ? p.jobPositions : [];
    const 줄들 = 부문.length > 0
      ? 부문.map((x: any) => [
          x.category || x.group,
          x.headcount ? `${String(x.headcount).replace(/명$/, "")}명` : null,
          x.location,
          x.employment || p.jobEmploymentType,
          x.gender, x.career, x.education,
          [x.workDays, x.workTime].filter(Boolean).join(" "),
          x.salary,
        ].filter(Boolean).join("  |  "))
      : [[
          (p.jobCategories || []).join(" · "),
          p.jobEmploymentType,
          경력글(p.jobExperienceLevel),
          p.jobHeadcount ? `${p.jobHeadcount}명` : null,
        ].filter(Boolean).join("  |  ")];
    return { 제목: p.jobTitle || "공고 없음", 기간, 줄들: 줄들.filter(Boolean),
             마감: 마감인가(p.jobStatus, p.jobDeadline) };
  }, [목록, 고른공고]);
  const 우리차례수 = 줄들.filter((p) => 다음할일(p)?.우리차례).length;

  const 사이드 = (
    <div className="prop-side">
      <input className="prop-side-search" placeholder="공고명 검색"
        value={공고검색} onChange={(e) => set공고검색(e.target.value)} />
      <button type="button" className={`prop-side-item${고른공고 === "ALL" ? " on" : ""}`}
        onClick={() => { set고른공고("ALL"); set고른상태("전체"); }}>
        <span>전체 공고</span><em>{목록.length}</em>
      </button>
      {공고들.map((g) => (
        <button key={g.id} type="button" className={`prop-side-item${고른공고 === g.id ? " on" : ""}`}
          onClick={() => { set고른공고(g.id); set고른상태("전체"); }}>
          <span>{g.제목}{g.마감 && <i> 마감</i>}</span><em>{g.수}</em>
        </button>
      ))}
    </div>
  );

  return (
    <CompanyLayout activePage="proposals" side={사이드}>
      {/* 공고가 먼저고 그 아래 제안이 붙는다. 공고·지원자 관리와 같은 머리 블록을
          쓴다 — 같은 공고를 두 화면에서 다르게 그리면 같은 것으로 안 읽힌다.
          다만 수정·마감·재등록은 두지 않는다. 여기서 공고를 고치면 이미 보낸
          제안의 조건이 바뀐다 — 고치는 일은 공고·지원자에서 한다. */}
      {고른공고 !== "ALL" && 공고머리 && (
        <div className="co-pane-card prop-jobhead">
          <div className="co-pane-head">
            <div style={{ minWidth: 0 }}>
              <div className="co-pane-term">
                <span className="co-jc-badge">{공고머리.마감 ? "마감" : "진행중"}</span>
                {공고머리.기간}
              </div>
              <h2 className="co-pane-title">{공고머리.제목}</h2>
            </div>
            {/* 이 화면에서 다음에 할 일은 하나다 — 이 공고로 사람을 더 찾는 것.
                보내는 자리는 인재 검색 그대로고, 공고를 다시 고르는 수고만 던다. */}
            {!공고머리.마감 && 고른공고 !== "none" && (
              <button type="button" className="co-pane-view"
                onClick={() => router.push(`${base}/talent?job=${고른공고}`)}>
                이 공고로 제안 보내기 <ChevronRight size={15} />
              </button>
            )}
          </div>
          {공고머리.줄들.length > 0 && (
            <div className="co-pane-pos">
              <div style={{ minWidth: 0 }}>
                {공고머리.줄들.map((줄: string, i: number) => (
                  <div key={i} className="co-pane-posline">{줄}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="prop-chips">
        {칩들.map((c) => (
          <button key={c.키} type="button"
            className={`prop-chip${고른상태 === c.키 ? " on" : ""}`}
            onClick={() => set고른상태(c.키 as 상태키 | "전체")}>
            {c.키}<em>{c.수}</em>
          </button>
        ))}
        {우리차례수 > 0 && <span className="prop-mine">내 차례 {우리차례수}</span>}
      </div>

      {로딩 ? (
        <p style={{ padding: "48px 0", textAlign: "center", color: "#9a9a9a", fontSize: 14 }}>불러오는 중…</p>
      ) : 줄들.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "#9a9a9a" }}>
          <div style={{ display: "inline-flex", padding: 14, borderRadius: "50%", background: "#f7f7f8", color: "#bfbfbf", marginBottom: 12 }}>
            <Send size={30} />
          </div>
          <p style={{ fontSize: 15, color: "#3a3a3a", margin: 0 }}>
            {목록.length === 0 ? "아직 보낸 제안이 없어요" : "이 상태인 제안이 없어요"}
          </p>
          {목록.length === 0 && (
            <p style={{ fontSize: 13, marginTop: 6 }}>인재 검색에서 마음에 드는 분에게 제안을 보내보세요</p>
          )}
        </div>
      ) : (
        <div className="prop-tablewrap">
          <table className="prop-table">
            <thead>
              <tr>
                <th className="c-no">No.</th>
                <th>제안 인재</th>
                <th className="c-date">제안일</th>
                <th className="c-st">현재 상태</th>
                <th>최근 활동</th>
                <th className="c-act">다음 액션</th>
                <th className="c-note">메모</th>
              </tr>
            </thead>
            <tbody>
              {줄들.map((p, i) => {
                const st = 상태(p);
                const 활 = 최근활동(p);
                const 할 = 다음할일(p);
                const 남은 = 제안남은날(p.createdAt);
                return (
                  <tr key={p.id} className={할?.우리차례 ? "mine" : undefined}>
                    <td className="c-no">{i + 1}</td>
                    <td>
                      <button type="button" className="prop-who" onClick={() => 이력서열기(p)}>
                        <span className="prop-av">
                          {p.avatarUrl
                            ? <img src={p.avatarUrl} alt="" loading="lazy" />
                            : <span>{(p.userName || "?").slice(0, 1)}</span>}
                        </span>
                        <span>
                          <b>{p.userName}</b>
                          {고른공고 === "ALL" && p.jobTitle && <i>{p.jobTitle}</i>}
                        </span>
                      </button>
                    </td>
                    <td className="c-date">{날짜(p.createdAt)}</td>
                    <td className="c-st">
                      <span className="prop-st" style={{ color: 상태색[st] }}>{st}</span>
                      {st === "답변대기" && 남은 <= 3 && <i className="prop-dday">D-{남은}</i>}
                    </td>
                    <td className="c-recent">
                      <span>{활.글}</span>
                      {활.때 && <i>{때(활.때)}</i>}
                    </td>
                    <td className="c-act">
                      {할 && (
                        <button type="button" className={`prop-act${할.우리차례 ? " key" : ""}`}
                          onClick={() => (st === "채용완료" ? 이력서열기(p) : set대화(p))}>
                          {할.글}
                        </button>
                      )}
                    </td>
                    {/* 메모는 그 자리에서 적는다. 「통화함」·「화요일 3시 면접」처럼
                        자기가 나중에 보려고 적는 것이라 창을 띄울 일이 아니다. */}
                    <td className="c-note">
                      {메모연줄 === p.id ? (
                        <input className="prop-note" maxLength={200} autoFocus
                          placeholder="통화함 · 화요일 3시 면접 …"
                          value={메모중?.id === p.id ? 메모중.값 : (p.note || "")}
                          onChange={(e) => set메모중({ id: p.id, 값: e.target.value })}
                          onBlur={(e) => { 메모저장(p, e.target.value.trim()); set메모연줄(null); }}
                          onKeyDown={(e) => {
                            // 한글을 치는 중(조합 중)에 누른 Enter 는 글자를 확정하는
                            // 키다. 그때 칸을 벗어나면 마지막 글자가 날아간다 —
                            // 확정한 뒤 한 번 더 누르는 것이 저장이다.
                            if (e.nativeEvent.isComposing) return;
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") { set메모중(null); set메모연줄(null); }
                          }} />
                      ) : (
                        <button type="button" className={`prop-note-btn${p.note ? " has" : ""}`}
                          title={p.note || "메모"}
                          onClick={() => { set메모중({ id: p.id, 값: p.note || "" }); set메모연줄(p.id); }}>
                          <Pencil size={13} />
                          {p.note && <span>{p.note}</span>}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {목록.length > 0 && (
        <p style={{ margin: "14px 2px 0", fontSize: 12.5, color: "#a0a0a6" }}>
          답이 없으면 {제안유효일}일 뒤 닫혀요. 그때까지는 상대가 언제든 답할 수 있어요.
        </p>
      )}

      {대화 && (
        <ProposalThread
          proposalId={대화.id}
          제목={대화.jobTitle || "제안한 공고"}
          상대={대화.userName}
          token={typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : ""}
          onClose={() => { set대화(null); 불러오기(); }}
        />
      )}
    </CompanyLayout>
  );
}
