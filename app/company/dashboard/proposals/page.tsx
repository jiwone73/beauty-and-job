"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import ProposalThread from "@/components/proposal/ProposalThread";
import { 마감인가 } from "@/lib/jobClosed";
import { 님 } from "@/lib/josa";
import { Send, ChevronRight } from "lucide-react";

// 보낸 제안 — 공고를 고르고, 그 공고로 보낸 사람들을 표로 본다.
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
  /** 기업이 제안을 거둔 시각. 수락 전에만 누를 수 있다. */
  canceledAt: string | null;
  /** 제안한 자리 한 줄. 공고에 모집분야가 여럿일 때 누구에게 어느 자리를
   *  보냈는지가 없어 매장도 알 수 없었다. */
  positionLine: string | null;
  gender: string | null;
  age: number | null;
  subJob: string | null;
};

// 이름만으로는 열 명 중 누구였는지 떠오르지 않는다. 인재검색 카드가 쓰는 값을
// 두 줄로 편다 — 첫 줄은 사람, 둘째 줄은 조건.
const 성별글 = (g: string | null) =>
  g === "FEMALE" || g === "여성" || g === "F" ? "여"
  : g === "MALE" || g === "남성" || g === "M" ? "남" : null;
const 인적 = (p: 제안) =>
  [성별글(p.gender), p.age ? `만 ${p.age}세` : null].filter(Boolean).join(" · ");
// 둘째 줄은 희망직군 하나다. 지역·경력·근무형태까지 넣었더니 한 줄이 세 줄이
// 되어 표가 무거워졌다 — 여기서 견주는 것은 「누가 답했나」이지 사람의 조건이
// 아니고, 조건은 이력서를 열면 다 있다.
const 조건 = (p: 제안) => p.subJob || "";

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
type 상태키 = "채용완료" | "면접예정" | "채팅중" | "수락" | "거절" | "취소" | "공고마감" | "답변대기";
// 색은 「지금 움직이고 있나」만 말한다. 대화가 오가는 중이면 보라, 끝맺은
// 것이면 초록, 나머지는 기본 글자색이다 — 회색을 여러 단계로 나누면 어느
// 것이 옅은지 화면마다 달라 보인다.
// 화면에 적는 이름. 칩과 표가 같은 말을 써야 한다.
//
// 첫 단계 이름을 여러 번 고쳤다. 「답변대기」는 누가 기다리는지가 없고,
// 「답 없음」은 상대가 무시한 것처럼 읽히고, 「미응답」은 말투가 무겁다.
// 뿌리는 이 단계만 「일어난 일」이 아니라는 데 있다 — 나머지는 다 사건인데
// (수락·채팅·면접·채용) 여기만 아직 아무 일도 없다.
//
// 그래서 짧은 한 마디로 끝낸다. 읽었는지는 「최근 활동」이 따로 말하므로
// 상태 칸은 단계만 말하면 된다.
//
// 「기간 지남」은 없앴다. 7일이라는 숫자를 우리가 정해 두고 닫던 것인데,
// 공고가 열려 있으면 그 자리는 실제로 있는 것이라 근거가 없었다. 이제는
// 공고가 닫힐 때 같이 닫히고 이름도 「공고마감」이다 — 매장도 구직자도
// 아는 말이고, 자연 마감이든 사람을 뽑아 조기 마감이든 같은 말이다.
const 상태이름: Record<상태키, string> = {
  답변대기: "대기", 수락: "수락", 채팅중: "채팅중",
  면접예정: "면접예정", 채용완료: "채용완료",
  거절: "거절", 취소: "취소함", 공고마감: "공고마감",
};
const 상태색: Record<상태키, string> = {
  채용완료: "#1f7a4d", 수락: "#1f7a4d",
  면접예정: "#582681", 채팅중: "#582681",
  거절: "var(--color-text)", 취소: "var(--color-text)",
  공고마감: "var(--color-text)", 답변대기: "var(--color-text)",
};

// 이미 무슨 일이 일어난 제안은 공고가 닫혀도 그 상태를 지킨다 — 면접까지
// 잡아 놓고 매장이 공고를 내렸다고 「공고마감」이 되면 대화가 어디 갔나 싶다.
// 공고마감은 아직 아무 일도 없는 제안에만 붙는다.
function 상태(p: 제안): 상태키 {
  if (p.applicationStatus === "PASSED") return "채용완료";
  if (p.declinedAt || p.blocked) return "거절";
  if (p.canceledAt) return "취소";
  if (p.appointmentAt) return "면접예정";
  if (p.interestedAt) return p.messageCount > 0 ? "채팅중" : "수락";
  if (마감인가(p.jobStatus, p.jobDeadline)) return "공고마감";
  return "답변대기";
}

/** 마지막으로 무슨 일이 있었나. 주체를 반드시 밝힌다 — 「답장 기다리는 중」은
 *  누가 기다리는지가 없어 카드에서 가장 헷갈리던 말이었다. */
function 최근활동(p: 제안): { 글: string; 때: string | null } {
  // 이름 뒤 조사를 「이」로 붙박아 두어 받침 없는 이름이 전부 틀렸다
  // (「정용희이 읽었습니다」). 님을 붙이면 받침이 생겨 조사도 하나로 정해지고,
  // 다른 화면이 쓰는 「○○님에게 제안하기」와도 결이 맞는다.
  const 그분 = 님(p.userName);
  if (p.canceledAt) return { 글: "우리가 제안을 거뒀습니다", 때: p.canceledAt };
  if (p.applicationStatus === "PASSED") return { 글: `${p.userName}님 최종합격`, 때: p.appliedAt };
  if (p.appliedAt) return { 글: `${그분} 지원했습니다`, 때: p.appliedAt };
  if (p.declinedAt) return { 글: `${그분} 거절했습니다`, 때: p.declinedAt };
  if (p.blocked) return { 글: "차단됨", 때: null };
  if (p.appointmentAt) {
    const d = new Date(p.appointmentAt);
    return { 글: `${d.getMonth() + 1}.${d.getDate()} 면접 약속`, 때: p.lastMessageAt };
  }
  // 우리가 한 일에도 주체를 밝힌다. 「메시지를 보냈습니다」만 있으면 그 줄이
  // 누구의 줄인지 알면서도 누가 보냈는지는 모른다.
  if (p.messageCount > 0) {
    return p.lastSender === "USER"
      ? { 글: `${그분} 메시지를 보냈습니다`, 때: p.lastMessageAt }
      : { 글: "우리가 메시지를 보냈습니다", 때: p.lastMessageAt };
  }
  if (p.interestedAt) return { 글: `${그분} 제안을 수락했습니다`, 때: p.interestedAt };
  if (p.readAt) return { 글: `${그분} 읽었습니다`, 때: p.readAt };
  return { 글: "우리가 제안을 보냈습니다", 때: p.createdAt };
}

/** 다음에 할 일. 우리 차례인 것만 색을 채운다. */
function 다음할일(p: 제안): { 글: string; 우리차례: boolean } | null {
  const st = 상태(p);
  if (st === "거절" || st === "취소" || st === "공고마감") return null;
  if (st === "채용완료") return { 글: "지원서 보기", 우리차례: false };
  if (st === "면접예정") return { 글: "일정 확인", 우리차례: false };
  if (st === "채팅중") return { 글: "채팅하기", 우리차례: p.lastSender === "USER" };
  if (st === "수락") return { 글: "채팅하기", 우리차례: true };
  // 답변대기 — 상대가 제안을 받아들이기 전이라 대화가 열리지 않는다.
  // 여기서 할 수 있는 일은 기다리는 것뿐이라 단추를 두지 않는다.
  return null;
}

export default function CompanyProposalsPage() {
  const [목록, set목록] = useState<제안[]>([]);
  const [로딩, set로딩] = useState(true);
  const [대화, set대화] = useState<제안 | null>(null);
  // 제안 거두기. 되돌릴 수 없으니 한 번 묻는다.
  const [취소할것, set취소할것] = useState<제안 | null>(null);
  const 취소하기 = async () => {
    const p = 취소할것;
    if (!p) return;
    set취소할것(null);
    const token = localStorage.getItem("access_token");
    const r = await fetch(`/api/company/proposals/${p.id}/cancel`, {
      method: "POST", headers: { Authorization: `Bearer ${token}` },
    }).then((x) => x.json()).catch(() => null);
    if (r?.success) 불러오기();
    else alert(r?.error?.message || "제안을 거두지 못했어요.");
  };
  // 공고를 고르는 화면이라 처음부터 하나가 골라져 있다. 예전에는 「전체 공고」로
  // 시작해 공고 없는 상태였는데, 그러면 위쪽 공고 머리가 비어 무엇을 보는 자리인지
  // 안 읽혔다. 여러 공고에 걸친 「답할 것」은 사이드에 숫자로 붙는다.
  const [고른공고, set고른공고] = useState<string | null>(null);
  const [고른상태, set고른상태] = useState<상태키 | "전체">("전체");
  const [공고검색, set공고검색] = useState("");
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



  // 왼쪽 공고 목록. 제안을 보낸 공고만 나온다 — 안 보낸 공고를 늘어놓으면
  // 고를 것이 없는 줄이 대부분을 차지한다.
  const 공고들 = useMemo(() => {
    const 표 = new Map<string, { id: string; 제목: string; 수: number; 내차례: number; 살아있나: boolean; 마감: boolean }>();
    for (const p of 목록) {
      const id = p.jobPostingId || "none";
      const 내차례 = 다음할일(p)?.우리차례 ? 1 : 0;
      // 아직 끝나지 않은 제안이 하나라도 있으면 그 공고는 살아 있다 — 공고가
      // 마감돼도 대화 중이거나 면접이 잡힌 사람은 그대로 남는다.
      const 진행 = !["거절", "취소", "공고마감", "채용완료"].includes(상태(p)) ? 1 : 0;
      const 앞 = 표.get(id);
      if (앞) { 앞.수 += 1; 앞.내차례 += 내차례; 앞.살아있나 = 앞.살아있나 || !!진행; }
      else 표.set(id, {
        id, 제목: p.jobTitle || "공고 없음", 수: 1, 내차례, 살아있나: !!진행,
        마감: 마감인가(p.jobStatus, p.jobDeadline),
      });
    }
    return [...표.values()]
      .filter((g) => !공고검색.trim() || g.제목.includes(공고검색.trim()))
      // 내 차례가 있는 공고가 먼저. 그다음 진행중, 마감은 아래로.
      .sort((a, b) => Number(b.내차례 > 0) - Number(a.내차례 > 0)
        || Number(a.마감) - Number(b.마감) || b.수 - a.수);
  }, [목록, 공고검색]);

  // 끝난 제안만 남은 마감 공고는 접어 둔다. 볼 일이 없는데 목록만 길어진다.
  const [지난것펼침, set지난것펼침] = useState(false);
  const 보일공고 = 공고들.filter((g) => !g.마감 || g.살아있나);
  const 접힌공고 = 공고들.filter((g) => g.마감 && !g.살아있나);

  // 처음 열릴 때 첫 공고를 고른다.
  useEffect(() => {
    if (고른공고 || !보일공고.length) return;
    set고른공고(보일공고[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [보일공고.length]);

  const 공고고른것 = 목록.filter((p) => (p.jobPostingId || "none") === 고른공고);

  // 상태 칩은 제안이 흘러가는 차례 그대로 세운다.
  //
  //   답변대기 → 수락 → 채팅중 → 면접예정 → 채용완료
  //
  // 0건이어도 자리를 지킨다. 있는 것만 세우면 흐름이 끊겨, 지금 어디까지 왔고
  // 어디서 막혔는지가 안 보인다. 끝난 것(거절·취소·공고마감)은 흐름 밖이라 뒤에 두고
  // 0건이면 감춘다 — 없는 일까지 자리를 잡으면 줄만 길어진다.
  const 칩들 = useMemo(() => {
    const 흐름: 상태키[] = ["답변대기", "수락", "채팅중", "면접예정", "채용완료"];
    const 끝: 상태키[] = ["거절", "취소", "공고마감"];
    const 셈 = new Map<상태키, number>();
    for (const p of 공고고른것) 셈.set(상태(p), (셈.get(상태(p)) || 0) + 1);
    return [
      { 키: "전체" as const, 수: 공고고른것.length },
      ...흐름.map((k) => ({ 키: k, 수: 셈.get(k) || 0 })),
      ...끝.filter((k) => (셈.get(k) || 0) > 0).map((k) => ({ 키: k, 수: 셈.get(k)! })),
    ];
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
  // 이 표에 실제로 쓰인 자리들. 옛 제안은 값이 없어 빠진다.
  const 제안한자리 = useMemo(
    () => Array.from(new Set(공고고른것.map((p) => p.positionLine).filter(Boolean))) as string[],
    [공고고른것]
  );

  const 공고머리 = useMemo(() => {
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
      {보일공고.map((g) => (
        <button key={g.id} type="button" className={`prop-side-item${고른공고 === g.id ? " on" : ""}`}
          onClick={() => { set고른공고(g.id); set고른상태("전체"); }}>
          <span>{g.제목}{g.마감 && <i> 마감</i>}</span>
          {/* 내 차례가 몇인지 여기서 말한다 — 「전체 공고」로 모아 보지 않아도
              어느 공고에 할 일이 있는지 훑어서 알 수 있다. */}
          {g.내차례 > 0 && <b className="prop-side-mine">{g.내차례}</b>}
          <em>{g.수}</em>
        </button>
      ))}
      {접힌공고.length > 0 && (
        <>
          <button type="button" className="prop-side-more"
            onClick={() => set지난것펼침((v) => !v)}>
            지난 공고 {접힌공고.length}
          </button>
          {지난것펼침 && 접힌공고.map((g) => (
            <button key={g.id} type="button" className={`prop-side-item done${고른공고 === g.id ? " on" : ""}`}
              onClick={() => { set고른공고(g.id); set고른상태("전체"); }}>
              <span>{g.제목}<i> 마감</i></span><em>{g.수}</em>
            </button>
          ))}
        </>
      )}
    </div>
  );

  return (
    <CompanyLayout activePage="proposals" side={사이드}>
      {/* 공고가 먼저고 그 아래 제안이 붙는다. 공고·지원자 관리와 같은 머리 블록을
          쓴다 — 같은 공고를 두 화면에서 다르게 그리면 같은 것으로 안 읽힌다.
          다만 수정·마감·재등록은 두지 않는다. 여기서 공고를 고치면 이미 보낸
          제안의 조건이 바뀐다 — 고치는 일은 공고·지원자에서 한다. */}
      {공고머리 && (
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
            {!공고머리.마감 && 고른공고 && 고른공고 !== "none" && (
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

      {/* 표 머리줄 — 공고 블록과 아래 표를 갈라 준다. 이것이 없으면 상태 칩이
          공고에 딸린 것인지 표에 딸린 것인지 안 갈렸다. 공고·지원자의
          「지원자 총 N명」과 같은 자리·같은 짜임이다. */}
      <div className="apl-bar prop-bar">
        <span className="apl-bar-n"><em>보낸 제안</em> 총 {공고고른것.length}명</span>
        {우리차례수 > 0 && (
          <><span className="apl-bar-sep">|</span>
            <span className="apl-bar-n prop-mine">내 차례 {우리차례수}</span></>
        )}
      </div>

      {/* 상태는 흐름이다. 칩만 나란히 두면 그냥 단추 여섯 개로 보여, 지금
          어디까지 왔고 어디서 막혔는지가 안 읽힌다. 사이를 화살표로 잇는다.
          「전체」와 끝난 것(거절·취소·공고마감)은 흐름 밖이라 선으로 떼어 둔다. */}
      <div className="prop-chips">
        {칩들.map((c, i) => {
          const 흐름 = !["전체", "거절", "취소", "공고마감"].includes(c.키);
          const 앞흐름 = i > 0 && !["전체", "거절", "취소", "공고마감"].includes(칩들[i - 1].키);
          return (
            <span key={c.키} className="prop-chipwrap">
              {흐름 && (앞흐름 ? <i className="prop-arrow">›</i> : <i className="prop-sep" />)}
              {!흐름 && i > 0 && <i className="prop-sep" />}
              <button type="button"
                className={`prop-chip${고른상태 === c.키 ? " on" : ""}${c.수 === 0 ? " zero" : ""}`}
                onClick={() => set고른상태(c.키 as 상태키 | "전체")}>
                {c.키 === "전체" ? "전체" : 상태이름[c.키 as 상태키]}<em>{c.수}</em>
              </button>
            </span>
          );
        })}
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
          {/* 제안한 자리는 이 표 전체에 하나다 — 표가 공고별로 묶여 있고 한 공고에서
              여러 자리로 보내는 일은 드물다. 줄마다 적으면 같은 글이 열 번 찍힌다. */}
          {제안한자리.length > 0 && (
            <p className="prop-sentpos">
              제안한 자리 · <b>{제안한자리.join(" / ")}</b>
            </p>
          )}
          <table className="prop-table">
            <thead>
              <tr>
                <th className="c-no">No.</th>
                <th>인재</th>
                <th className="c-date">제안일</th>
                <th className="c-st">현재 상태</th>
                <th>최근 활동</th>
                <th className="c-act">다음 액션</th>
              </tr>
            </thead>
            <tbody>
              {줄들.map((p, i) => {
                const st = 상태(p);
                const 활 = 최근활동(p);
                const 할 = 다음할일(p);
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
                        <span className="prop-whoinfo">
                          <b>
                            {p.userName}
                            {인적(p) && <i>{인적(p)}</i>}
                          </b>
                          {조건(p) && <em>{조건(p)}</em>}
                        </span>
                      </button>
                    </td>
                    <td className="c-date">{날짜(p.createdAt)}</td>
                    <td className="c-st">
                      <span className="prop-st" style={{ color: 상태색[st] }}>{상태이름[st]}</span>
                    </td>
                    <td className="c-recent">
                      <span>{활.글}</span>
                      {활.때 && <i>{때(활.때)}</i>}
                    </td>
                    <td className="c-act">
                      <div className="prop-acts">
                        {/* 거두는 길은 어느 단계에나 있어야 한다 — 대화 중에 갑자기
                            다른 사람을 뽑는 일이 제일 흔하다. 이미 끝난 것만 뺀다.
                            물리는 일은 왼쪽에 옅게, 나아가는 일은 오른쪽에 둔다. */}
                        {!["채용완료", "거절", "취소"].includes(st) && (
                          <button type="button" className="prop-act quiet"
                            onClick={() => set취소할것(p)}>제안 취소</button>
                        )}
                        {할 && (
                          <button type="button" className={`prop-act${할.우리차례 ? " key" : ""}`}
                            onClick={() => (st === "채용완료" ? 이력서열기(p) : set대화(p))}>
                            {할.글}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}


      {취소할것 && (
        <div className="rp-modal-overlay">
          <div className="prop-dec">
            <p className="prop-dec-t">{취소할것.userName}님에게 보낸 제안을 거둘까요?</p>
            <div className="prop-dec-acts">
              <button type="button" onClick={() => set취소할것(null)}>취소</button>
              <button type="button" className="key" onClick={취소하기}>제안 거두기</button>
            </div>
          </div>
        </div>
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
