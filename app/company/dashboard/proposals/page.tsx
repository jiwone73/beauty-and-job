"use client";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import ProposalThread from "@/components/proposal/ProposalThread";
import ScrappedTalentList from "@/components/company/ScrappedTalentList";
import { companyTalentApi, companyJobsApi, type TalentItem } from "@/lib/api/company";
import { 마감인가 } from "@/lib/jobClosed";
import { 님 } from "@/lib/josa";
import { 모집분야한줄 } from "@/lib/positionLine";
import { ChevronDown, Send, ChevronRight } from "lucide-react";

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
// 면접까지 갔으면 채팅 중이기도 하지만 말할 것은 면접이다.
//
// 「채용완료」는 없다. 제안은 지원서와 잇지 않는다 — 수락은 「지원하겠다」가
// 아니라 「더 얘기해 보자」이고, 지원할 사람은 공고에 직접 지원한다. 합격·불합격은
// 지원자 관리가 맡는다. 예전에는 그 지원서가 합격이면 여기서 채용완료라 불렀는데,
// 같은 공고에 다른 사람이 뽑혀도 아무 표시가 없어 무엇이 끝났다는 건지 헷갈렸다.
type 상태키 = "면접예정" | "채팅중" | "수락" | "거절" | "취소" | "공고마감" | "답변대기";
// 색은 「지금 움직이고 있나」만 말한다. 대화가 오가는 중이면 보라, 끝맺은
// 것이면 초록, 나머지는 기본 글자색이다 — 회색을 여러 단계로 나누면 어느
// 것이 옅은지 화면마다 달라 보인다.
// 화면에 적는 이름. 칩과 표가 같은 말을 써야 한다.
//
// 첫 단계 이름을 여러 번 고쳤다. 「답변대기」는 누가 기다리는지가 없고,
// 「답 없음」은 상대가 무시한 것처럼 읽히고, 「미응답」은 말투가 무겁다.
// 뿌리는 이 단계만 「일어난 일」이 아니라는 데 있다 — 나머지는 다 사건인데
// (수락·채팅·면접) 여기만 아직 아무 일도 없다.
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
  면접예정: "면접예정",
  거절: "거절", 취소: "제안취소", 공고마감: "공고마감",
};
const 상태색: Record<상태키, string> = {
  수락: "#1f7a4d",
  면접예정: "#582681", 채팅중: "#582681",
  거절: "var(--color-text)", 취소: "var(--color-text)",
  공고마감: "var(--color-text)", 답변대기: "var(--color-text)",
};

// 이미 무슨 일이 일어난 제안은 공고가 닫혀도 그 상태를 지킨다 — 면접까지
// 잡아 놓고 매장이 공고를 내렸다고 「공고마감」이 되면 대화가 어디 갔나 싶다.
// 공고마감은 아직 아무 일도 없는 제안에만 붙는다.
function 상태(p: 제안): 상태키 {
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
  // 우리가 한 일도 상대 이름으로 적는다 — 「○○님에게 보냈습니다」면 누가 누구에게
  // 한 일인지가 한 번에 읽히고, 「우리가」를 따로 붙일 이유가 없어진다.
  const 그분에게 = 님(p.userName, "에게");
  if (p.canceledAt) return { 글: `${그분에게} 보낸 제안을 거뒀습니다`, 때: p.canceledAt };
  if (p.appliedAt) return { 글: `${그분} 지원했습니다`, 때: p.appliedAt };
  if (p.declinedAt) return { 글: `${그분} 거절했습니다`, 때: p.declinedAt };
  if (p.blocked) return { 글: "차단됨", 때: null };
  // 약속이 잡혀 있어도, 그 뒤로 구직자가 말을 걸었으면 그 말을 먼저 적는다 —
  // 답해야 할 것이 무엇인지가 이 칸에 떠 있어야 한다(빨간 글자가 곧 미답변이다).
  if (p.appointmentAt && p.lastSender !== "USER") {
    const d = new Date(p.appointmentAt);
    return { 글: `${d.getMonth() + 1}.${d.getDate()} 면접 약속 되었습니다`, 때: p.lastMessageAt };
  }
  // 우리가 한 일에도 주체를 밝힌다. 「메시지를 보냈습니다」만 있으면 그 줄이
  // 누구의 줄인지 알면서도 누가 보냈는지는 모른다.
  if (p.messageCount > 0) {
    return p.lastSender === "USER"
      ? { 글: `${그분} 메시지를 보냈습니다`, 때: p.lastMessageAt }
      : { 글: `${그분에게} 메시지를 보냈습니다`, 때: p.lastMessageAt };
  }
  if (p.interestedAt) return { 글: `${그분} 제안을 수락했습니다`, 때: p.interestedAt };
  if (p.readAt) return { 글: `${그분} 읽었습니다`, 때: p.readAt };
  return { 글: `${그분에게} 제안을 보냈습니다`, 때: p.createdAt };
}

/** 이 줄에 열린 대화가 있나. 수락해야 말을 걸 수 있고, 거절·거둔 제안은 끝난 것이다. */
function 대화열림(p: 제안): boolean {
  return !!p.interestedAt && !p.declinedAt && !p.canceledAt && !p.blocked;
}

/** 다음에 할 일. 우리 차례인 것만 색을 채운다. */
function 다음할일(p: 제안): { 글: string; 우리차례: boolean } | null {
  const st = 상태(p);
  if (st === "거절" || st === "취소" || st === "공고마감") return null;
  // 면접이 잡힌 뒤라도 구직자가 마지막으로 말했으면 답할 차례다 — 약속을 잡았다고
  // 대화가 끝나지 않는다. 홈의 「미답변 제안」도 같은 기준으로 센다.
  if (st === "면접예정") return { 글: "일정 확인", 우리차례: p.lastSender === "USER" };
  if (st === "채팅중") return { 글: "채팅하기", 우리차례: p.lastSender === "USER" };
  // 수락만 하고 아직 말이 오가지 않은 건은 「미답변」이 아니다 — 답할 말이 온 것이
  // 아니라 매장이 먼저 말을 걸 차례다. 빨간 표시에서는 빼고, 「수락」 칩과
  // 「채팅하기」 단추로 할 일인 것은 그대로 보인다(홈의 미답변 수와 같아진다).
  if (st === "수락") return { 글: "채팅하기", 우리차례: false };
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
  // "" 이면 전체 보낸 제안, 아니면 그 공고 하나. 스크랩 인재와 같은 짜임이다 —
  // 한 메뉴 안의 두 갈래가 서로 다르게 열리면 같은 것으로 안 읽힌다.
  // 전체로 보면 표를 공고별로 묶고 묶음마다 공고명 띠를 얹는다(공고명이 길어
  // 표 안의 한 칸으로는 못 적는다 — 평균 35자, 열에 아홉이 57자까지 간다).
  const [고른공고, set고른공고] = useState("");
  const [고른상태, set고른상태] = useState<상태키 | "전체">("전체");
  const router = useRouter();
  const pathname = usePathname();
  const base = pathname.split("/").filter(Boolean)[0] === "company"
    ? "/company/dashboard" : `/${pathname.split("/").filter(Boolean)[0]}`;
  const 이력서열기 = (p: 제안) => router.push(`${base}/talent/${p.userId}`);
  // 스크랩 인재도 이 화면이 그린다. 왼쪽 공고 목록은 보낸 제안과 똑같이 두고
  // 본문만 스크랩 목록으로 바꾼다 — 두 갈래를 오갈 때 왼쪽이 흔들리지 않는다.
  const 스크랩모드 = pathname.endsWith("/proposals/scrapped");

  // ── 스크랩 인재 ──
  // 왼쪽 맨 위는 「전체 스크랩」, 그 아래 「공고별 스크랩」으로 진행 중인 공고 전부
  // (담은 사람이 없으면 0). 공고를 누르면 오른쪽이 그 공고로 담은 사람만 보인다.
  // 공고 없이 담은 사람은 따로 칸을 두지 않는다 — 공고 목록 사이에 공고가 아닌 칸이
  // 끼면 어색했다. 전체 스크랩에서 「공고 미연결」 칩으로 추려 본다.
  // 왼쪽 숫자와 오른쪽 목록이 한 데이터에서 나오도록 여기서 한 번에 부른다.
  const [스크랩인재, set스크랩인재] = useState<TalentItem[]>([]);
  const [스크랩로딩, set스크랩로딩] = useState(true);
  const [진행공고, set진행공고] = useState<{ id: string; title: string; raw?: any }[]>([]);
  const [고른스크랩, set고른스크랩] = useState(""); // "" 이면 전체 스크랩, 아니면 공고 id
  const [연결칩, set연결칩] = useState<"전체" | "연결" | "미연결">("전체");
  useEffect(() => {
    if (!스크랩모드) return;
    (async () => {
      set스크랩로딩(true);
      try {
        const [잡, 인]: any[] = await Promise.all([
          companyJobsApi.list({ status: "ACTIVE", limit: 100 }),
          companyTalentApi.list({ scrapped: true, limit: 200 }),
        ]);
        const 공고 = (잡?.success && 잡.data ? 잡.data : [])
          .filter((j: any) => !j.deadline || new Date(j.deadline) >= new Date(new Date().toDateString()))
          .map((j: any) => ({ id: j.id, title: j.title, raw: j }));
        set진행공고(공고);
        set스크랩인재(인?.success ? (인.data || []) : []);
      } catch (e) {
        console.error("[scrapped]", e);
      } finally {
        set스크랩로딩(false);
      }
    })();
  }, [스크랩모드]);
  const 스크랩수 = (key: string) => 스크랩인재.filter((t) => (t.scrapJobIds || []).includes(key)).length;
  // 전체 스크랩 — 어디로든 담겨 있는 사람. 공고에 하나라도 담겼으면 「공고 연결」,
  // 공고 없이만 담겼으면 「공고 미연결」이다. 둘을 더하면 전체가 된다.
  const 담긴사람 = 스크랩인재.filter((t) => (t.scrapJobIds || []).length > 0);
  const 연결됨 = (t: TalentItem) => (t.scrapJobIds || []).some((k) => k !== "none");
  const 연결칩들 = [
    { 키: "전체" as const, 이름: "전체", 수: 담긴사람.length },
    { 키: "연결" as const, 이름: "공고 연결", 수: 담긴사람.filter(연결됨).length },
    { 키: "미연결" as const, 이름: "공고 미연결", 수: 담긴사람.filter((t) => !연결됨(t)).length },
  ];
  const 보일스크랩 = 고른스크랩
    ? 스크랩인재.filter((t) => (t.scrapJobIds || []).includes(고른스크랩))
    : 담긴사람.filter((t) => 연결칩 === "전체" || (연결칩 === "연결") === 연결됨(t));
  // 공고 하나에 담거나 뺀다. 화면을 먼저 바꾸고 서버가 알려 준 담은 공고로 맞춘다.
  // 모든 공고에서 빠진 사람도 목록 데이터에는 남겨 둔다 — 실수로 뺐을 때 바로 되담을 수 있게.
  const 스크랩담기 = async (item: TalentItem, key: string, on: boolean) => {
    const 앞 = item.scrapJobIds || [];
    const 뒤 = on ? Array.from(new Set([...앞, key])) : 앞.filter((k) => k !== key);
    const 맞추기 = (ids: string[]) => set스크랩인재((prev) => prev.map((t) =>
      t.id === item.id ? { ...t, scrapJobIds: ids, scrapped: ids.length > 0 } : t));
    맞추기(뒤);
    try {
      const res: any = on
        ? await companyTalentApi.scrap(item.id, key === "none" ? null : key)
        : await companyTalentApi.unscrap(item.id, key);
      if (res?.success && Array.isArray(res.data?.scrapJobIds)) 맞추기(res.data.scrapJobIds);
    } catch {
      맞추기(앞);
    }
  };

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
      const 진행 = !["거절", "취소", "공고마감"].includes(상태(p)) ? 1 : 0;
      const 앞 = 표.get(id);
      if (앞) { 앞.수 += 1; 앞.내차례 += 내차례; 앞.살아있나 = 앞.살아있나 || !!진행; }
      else 표.set(id, {
        id, 제목: p.jobTitle || "공고 없음", 수: 1, 내차례, 살아있나: !!진행,
        마감: 마감인가(p.jobStatus, p.jobDeadline),
      });
    }
    return [...표.values()]
      // 미답변이 있는 공고가 먼저. 그다음 진행중, 마감은 아래로.
      .sort((a, b) => Number(b.내차례 > 0) - Number(a.내차례 > 0)
        || Number(a.마감) - Number(b.마감) || b.수 - a.수);
  }, [목록]);

  // 끝난 제안만 남은 마감 공고는 접어 둔다. 볼 일이 없는데 목록만 길어진다.
  const [지난것펼침, set지난것펼침] = useState(false);
  const 보일공고 = 공고들.filter((g) => !g.마감 || g.살아있나);
  const 접힌공고 = 공고들.filter((g) => g.마감 && !g.살아있나);

  // 다른 화면에서 공고를 짚고 들어오면(?job=) 그 공고를 고른 채로 연다.
  // 스크랩 인재 옆 공고 목록을 누르면 이 길로 온다.
  useEffect(() => {
    const j = new URLSearchParams(window.location.search).get("job");
    if (j) set고른공고(j);
  }, []);

  // 대시보드 카드에서 넘어오면 그 상태 칩이 골라진 채로 열린다(?status=채팅중).
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("status");
    if (s && (s === "전체" || Object.keys(상태이름).includes(s))) set고른상태(s as 상태키 | "전체");
  }, []);

  const 공고고른것 = 고른공고
    ? 목록.filter((p) => (p.jobPostingId || "none") === 고른공고)
    : 목록;

  // 상태 칩은 제안이 흘러가는 차례 그대로 세운다.
  //
  //   답변대기 → 수락 → 채팅중 → 면접예정
  //
  // 0건이어도 자리를 지킨다. 있는 것만 세우면 흐름이 끊겨, 지금 어디까지 왔고
  // 어디서 막혔는지가 안 보인다. 끝난 것(거절·취소·공고마감)은 흐름 밖이라 뒤에 두고
  // 0건이면 감춘다 — 없는 일까지 자리를 잡으면 줄만 길어진다.
  const 칩들 = useMemo(() => {
    const 흐름: 상태키[] = ["답변대기", "수락", "채팅중", "면접예정"];
    const 끝: 상태키[] = ["거절", "취소", "공고마감"];
    const 셈 = new Map<상태키, number>();
    for (const p of 공고고른것) 셈.set(상태(p), (셈.get(상태(p)) || 0) + 1);
    // 「전체」가 맨 앞 — 기본으로 골라져 있는 칸이라 첫 자리가 자연스럽다. 그 뒤로
    // 선 하나를 두고 흐름이 이어서 시작하고, 흐름 밖에서 끝난 것(제안취소 등)은
    // 오른쪽 끝에 떼어 둔다. 그리는 차례는 아래 칩 줄이 정한다.
    return [
      ...흐름.map((k) => ({ 키: k, 수: 셈.get(k) || 0 })),
      ...끝.filter((k) => (셈.get(k) || 0) > 0).map((k) => ({ 키: k, 수: 셈.get(k)! })),
      { 키: "전체" as const, 수: 공고고른것.length },
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

  // 공고 머리는 한 벌로 만든다. 보낸 제안은 제안 줄에 딸려 온 공고 값으로, 스크랩 인재는
  // 공고 목록의 값으로 — 스크랩만 있고 제안은 아직 없는 공고도 같은 머리를 그려야 해서다.
  const 머리만들기 = (g: {
    제목: string | null; 시작: string | null; 마감일: string | null; 부문: any; 직군: any;
    고용형태: string | null; 경력: string | null; 인원: number | null; 상태: string | null;
  }) => {
    const md = (s: string) => {
      const d = new Date(s);
      return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    };
    const 기간 = g.시작
      ? `${md(g.시작)} ~ ${g.마감일 ? md(g.마감일) : "상시"}`
      : "";
    // 조건 줄은 공고·지원자 관리와 같은 차례로 만든다. 모집부문이 있으면
    // 부문마다 한 줄, 없으면 공고에 적힌 직군·고용형태·경력으로 한 줄이다.
    // 부문만 보고 있어서 부문이 빈 공고는 「신입」 한 마디만 남았다.
    const 경력글 = (v: string | null) =>
      v === "NEW" ? "신입" : v === "EXPERIENCED" ? "경력" : "경력무관";
    // 모집분야 한 줄은 lib/positionLine 이 맡는다. 여기 따로 적어 두었더니
    // 규칙이 갈렸다 — 성별 「무관」을 빼는 것이 한쪽에만 들어갔다.
    const 부문 = Array.isArray(g.부문) ? g.부문 : [];
    const 줄들 = 부문.length > 0
      ? 부문.map((x: any) => 모집분야한줄(x, false))
      : [[
          (Array.isArray(g.직군) ? g.직군 : []).join(" · "),
          g.고용형태,
          경력글(g.경력),
          g.인원 ? `${g.인원}명` : null,
        ].filter(Boolean).join("  |  ")];
    // 상태 글은 공고·지원자와 같은 말 — 마감 7일 안이면 D-n, 당일이면 「오늘 마감」.
    const 마감 = 마감인가(g.상태, g.마감일);
    const 남은날 = g.마감일
      ? Math.round((new Date(`${String(g.마감일).slice(0, 10)}T00:00:00`).getTime()
          - new Date(new Date().toDateString()).getTime()) / 86400000)
      : null;
    const 상태글 = 마감 ? "마감"
      : 남은날 !== null && 남은날 <= 7 ? (남은날 === 0 ? "오늘 마감" : `D-${남은날}`)
      : "진행중";
    return { 제목: g.제목 || "공고 없음", 기간, 줄들: 줄들.filter(Boolean) as string[],
             마감, 상태글 };
  };
  const 공고머리 = useMemo(() => {
    const p = 목록.find((x) => (x.jobPostingId || "none") === 고른공고);
    if (!p) return null;
    return 머리만들기({
      제목: p.jobTitle, 시작: p.jobCreatedAt, 마감일: p.jobDeadline, 부문: p.jobPositions,
      직군: p.jobCategories, 고용형태: p.jobEmploymentType, 경력: p.jobExperienceLevel,
      인원: p.jobHeadcount, 상태: p.jobStatus,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [목록, 고른공고]);
  // 스크랩 인재의 공고 머리 — 보낸 제안과 같은 모양. 「공고 없이 담은 사람」에는 없다.
  const 스크랩머리 = useMemo(() => {
    const g = 진행공고.find((x) => x.id === 고른스크랩)?.raw;
    if (!g) return null;
    return 머리만들기({
      제목: g.title, 시작: g.created_at, 마감일: g.deadline, 부문: g.positions,
      직군: g.categories, 고용형태: g.employment_type, 경력: g.experience_level,
      인원: g.headcount, 상태: g.status,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [진행공고, 고른스크랩]);
  const 우리차례수 = 줄들.filter((p) => 다음할일(p)?.우리차례).length;
  // 전체로 볼 때만 공고별로 묶는다. 차례는 줄 차례 그대로 — 먼저 나온 공고가 먼저다.
  const 묶음들 = useMemo(() => {
    if (고른공고) return [{ 키: 고른공고, 제목: null as string | null, 줄: 줄들 }];
    const 표 = new Map<string, { 키: string; 제목: string | null; 줄: typeof 줄들 }>();
    for (const p of 줄들) {
      const k = p.jobPostingId || "none";
      const g = 표.get(k);
      if (g) g.줄.push(p);
      else 표.set(k, { 키: k, 제목: p.jobTitle || "공고 없음", 줄: [p] });
    }
    return Array.from(표.values());
  }, [줄들, 고른공고]);

  const 공고고르기 = (id: string) => { set고른공고(id); set고른상태("전체"); };

  // 스크랩 인재의 왼쪽 — 보낸 제안과 같은 모양의 공고 목록. 숫자는 그 공고로 담은 사람 수.
  // 공고 목록은 공고 지원자 화면(ApplicantsScreen)과 같은 부품이다 — 제목 두 줄까지.
  const 스크랩사이드 = (
    <>
      <button type="button" className={`co-set-item co-jobitem${고른스크랩 === "" ? " on" : ""}`}
        onClick={() => set고른스크랩("")}>
        <span className="co-jobitem-t">전체 스크랩</span>
        <span className="co-jobitem-n">{담긴사람.length}</span>
      </button>
      <p className="prop-side-group">공고별 스크랩</p>
      {진행공고.map((g) => (
        <button key={g.id} type="button" className={`co-set-item co-jobitem sub${고른스크랩 === g.id ? " on" : ""}`}
          onClick={() => set고른스크랩(g.id)} title={g.title}>
          <span className="co-jobitem-t">{g.title}</span>
          <span className="co-jobitem-n">{스크랩수(g.id)}</span>
        </button>
      ))}
      {/* 진행 중인 공고가 없으면 공고별 스크랩 아래가 비어 보인다. 머리줄의 「공고 등록」과
          같은 단추 하나만 둔다 — 설명은 붙이지 않는다. */}
      {!스크랩로딩 && 진행공고.length === 0 && (
        <Link href={`${base}/jobs/new`} className="co-top-post"
          style={{ justifyContent: "center", margin: "4px 12px 0" }}>
          채용공고 등록
        </Link>
      )}
    </>
  );

  const 사이드 = (
    <>
      <button type="button" className={`co-set-item co-jobitem${고른공고 === "" ? " on" : ""}`}
        onClick={() => 공고고르기("")}>
        <span className="co-jobitem-t">전체 보낸 제안</span>
        <span className="co-jobitem-n">{목록.length}</span>
      </button>
      <p className="prop-side-group">공고별 보낸 제안</p>
      {보일공고.map((g) => (
        <button key={g.id} type="button" className={`co-set-item co-jobitem sub${고른공고 === g.id ? " on" : ""}`}
          onClick={() => 공고고르기(g.id)} title={g.제목 || undefined}>
          <span className="co-jobitem-t">{g.제목}{g.마감 && <span className="co-jobitem-off">마감</span>}</span>
          <span className="co-jobitem-n">{g.수}</span>
        </button>
      ))}
      {접힌공고.length > 0 && (
        <>
          <button type="button" className="prop-side-more"
            onClick={() => set지난것펼침((v) => !v)}>
            지난 공고 {접힌공고.length}
          </button>
          {지난것펼침 && 접힌공고.map((g) => (
            <button key={g.id} type="button" className={`co-set-item co-jobitem sub${고른공고 === g.id ? " on" : ""}`}
              onClick={() => 공고고르기(g.id)} title={g.제목 || undefined}>
              <span className="co-jobitem-t">{g.제목}<span className="co-jobitem-off">마감</span></span>
              <span className="co-jobitem-n">{g.수}</span>
            </button>
          ))}
        </>
      )}
    </>
  );

  // 공고 머리 판 — 보낸 제안과 스크랩 인재가 같은 것을 그린다. 같은 공고를 두 탭에서
  // 다르게 그리면 같은 것으로 안 읽힌다. 「이 공고로 제안 보내기」도 두 탭에 같이 선다.
  const 머리판 = (머리: ReturnType<typeof 머리만들기>, 공고id: string | null) => (
        <div className="co-pane-card prop-jobhead">
              {/* 상태·기간은 공고명 위에 — 공고·지원자의 공고 머리와 같은 짜임이다.
                  같은 공고를 두 화면이 다르게 그리면 같은 것으로 안 읽힌다. */}
              <div className="co-pane-head">
                <div style={{ minWidth: 0 }}>
                  <div className="co-pane-term">
                    <span className="co-jc-badge">{머리.상태글}</span>
                    {머리.기간}
                  </div>
                  <h2 className="co-pane-title">{머리.제목}</h2>
                </div>
              </div>
              <div className="co-pane-pos">
                <div style={{ minWidth: 0 }}>
                  {머리.줄들.map((줄: string, i: number) => (
                    <div key={i} className="co-pane-posline">{줄}</div>
                  ))}
                </div>
                {/* 이 화면에서 다음에 할 일은 하나다 — 이 공고로 사람을 더 찾는 것.
                    보내는 자리는 인재 검색 그대로고, 공고를 다시 고르는 수고만 던다.
                    제목 줄 오른쪽은 기간이 쓰므로 한 줄 아래에 선다. */}
                {!머리.마감 && 공고id && 공고id !== "none" && (
                  <button type="button" className="co-pane-view"
                    onClick={() => router.push(`${base}/talent?job=${공고id}`)}>
                    이 공고로 제안 보내기 <ChevronRight size={15} />
                  </button>
                )}
              </div>
            </div>
  );
  // 공고 머리 밑 띠 — 아래 목록이 이 공고의 것이라는 것을 글로 말한다. 공고·지원자와
  // 같은 부품이다. 몇 명인지도 여기서 말하므로 「총 N명」 줄을 따로 두지 않는다.
  const 띠 = (글: string, 덧?: React.ReactNode) => (
    <div className="co-pane-band">
      <span>{글}</span>{덧}
      <ChevronDown size={16} aria-hidden="true" />
    </div>
  );

  return (
    <CompanyLayout activePage={스크랩모드 ? "scrapped" : "proposals"} sideExtra={스크랩모드 ? 스크랩사이드 : 사이드}>
      {스크랩모드 ? (
        <>
          {스크랩머리 && (
            <div className="co-pane">
              {머리판(스크랩머리, 고른스크랩)}
              {띠(`이 공고로 스크랩한 인재 ${보일스크랩.length}명`)}
            </div>
          )}
          <ScrappedTalentList base={base} loading={스크랩로딩}
            talents={보일스크랩}
            scrapJobs={진행공고} onScrapJob={스크랩담기}
            proposeJobId={고른스크랩 || undefined}
            hideCount={!!스크랩머리}
            chips={고른스크랩 ? undefined : (
              // .prop-chips 는 보낸 제안 표에 붙으려고 아래 여백이 -8px 이다. 여기는
              // 바로 밑이 「총 N명」 줄이라 그대로 두면 글자를 덮는다.
              <div className="prop-chips" style={{ marginBottom: 10 }}>
                {연결칩들.map((c) => (
                  <span key={c.키} className="prop-chipwrap">
                    <button type="button"
                      className={`prop-chip${연결칩 === c.키 ? " on" : ""}${c.수 === 0 ? " zero" : ""}`}
                      onClick={() => set연결칩(c.키)}>
                      {c.이름}<em>{c.수}</em>
                    </button>
                  </span>
                ))}
              </div>
            )} />
        </>
      ) : (<>
      {/* 공고가 먼저고 그 아래 제안이 붙는다. 공고·지원자 관리와 같은 머리 블록을
          쓴다 — 같은 공고를 두 화면에서 다르게 그리면 같은 것으로 안 읽힌다.
          다만 수정·마감·재등록은 두지 않는다. 여기서 공고를 고치면 이미 보낸
          제안의 조건이 바뀐다 — 고치는 일은 공고·지원자에서 한다. */}
      {/* 공고 머리와 띠는 한 묶음(.co-pane) — 판의 20px 간격이 둘 사이에 끼지 않아
          공고·지원자와 같은 간격이 된다. 띠는 아래 표가 이 공고의 것이라는 것과
          몇 명인지를 말한다. */}
      {/* 전체로 볼 때는 여기 띠를 두지 않는다 — 표 안에서 공고마다 띠가 서고,
          위에 하나 더 두면 같은 말이 두 번이다. 스크랩 인재의 전체와 같다. */}
      {공고머리 && (
        <div className="co-pane">
          {머리판(공고머리, 고른공고)}
          {띠(`이 공고로 제안한 인재 ${공고고른것.length}명`,
            우리차례수 > 0 ? <><span className="apl-bar-sep">|</span><span className="prop-mine">미답변 {우리차례수}</span></> : null)}
        </div>
      )}

      {/* 상태는 흐름이다. 칩만 나란히 두면 그냥 단추 여섯 개로 보여, 지금
          어디까지 왔고 어디서 막혔는지가 안 읽힌다. 사이를 화살표로 잇는다.
          끝난 것(거절·제안취소·공고마감)과 「전체」는 흐름 밖이라 선으로 떼어
          오른쪽에 모은다 — 흐름 앞에 두면 흐름이 왼쪽 끝에서 시작하지 못한다. */}
      <div className="prop-chips">
        {(() => {
          const 끝키 = ["거절", "취소", "공고마감"];
          const 칩 = (c: { 키: string; 수: number }) => (
            <button type="button"
              className={`prop-chip${고른상태 === c.키 ? " on" : ""}${c.수 === 0 ? " zero" : ""}`}
              onClick={() => set고른상태(c.키 as 상태키 | "전체")}>
              {c.키 === "전체" ? "전체" : 상태이름[c.키 as 상태키]}<em>{c.수}</em>
            </button>
          );
          const 전체칩 = 칩들.find((c) => c.키 === "전체");
          const 흐름칩 = 칩들.filter((c) => c.키 !== "전체" && !끝키.includes(c.키));
          const 끝칩 = 칩들.filter((c) => 끝키.includes(c.키));
          return (
            <>
              {/* 전체 | 흐름(화살표로 잇는다) ……… 끝난 것 */}
              {전체칩 && <span className="prop-chipwrap">{칩(전체칩)}</span>}
              {흐름칩.map((c, i) => (
                <span key={c.키} className="prop-chipwrap">
                  {i === 0 ? <i className="prop-sep" /> : <i className="prop-arrow">›</i>}
                  {칩(c)}
                </span>
              ))}
              {끝칩.length > 0 && (
                <span className="prop-chips-end">
                  {끝칩.map((c) => <span key={c.키} className="prop-chipwrap">{칩(c)}</span>)}
                </span>
              )}
            </>
          );
        })()}
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
          {고른공고 && 제안한자리.length > 0 && (
            <p className="prop-sentpos">
              제안한 자리 · <b>{제안한자리.join(" / ")}</b>
            </p>
          )}
          <table className="prop-table">
            <thead>
              <tr>
                <th className="c-no">No.</th>
                <th>인재</th>
                <th className="c-job">희망직군</th>
                <th className="c-date">제안일</th>
                <th className="c-st">현재 상태</th>
                <th>최근활동/채팅</th>
                <th className="c-time">업데이트</th>
              </tr>
            </thead>
            <tbody>
              {묶음들.map((묶음) => (
              <Fragment key={묶음.키}>
              {묶음.제목 && (
                <tr className="prop-grouprow">
                  <td colSpan={7}>
                    {띠(`${묶음.제목} · ${묶음.줄.length}명`)}
                  </td>
                </tr>
              )}
              {묶음.줄.map((p, i) => {
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
                          {/* 아바타 옆은 늘 두 줄이다 — 값이 없는 사람도 자리를
                              비워 두어야 줄 높이가 들쭉날쭉하지 않다. */}
                          <b>{p.userName}</b>
                          <i>{인적(p)}</i>
                        </span>
                      </button>
                    </td>
                    {/* 직군은 열을 따로 준다. 이름 아래에 붙이면 사람에 따라 줄 수가
                        달라져 표가 들쭉날쭉했다. 열로 두면 인재 칸은 늘 두 줄이다. */}
                    <td className="c-job">{조건(p)}</td>
                    <td className="c-date">{날짜(p.createdAt)}</td>
                    <td className="c-st">
                      <span className="prop-st" style={{ color: 상태색[st] }}>{상태이름[st]}</span>
                      {/* 거두는 일은 아직 답이 없는 줄에서만. 수락한 뒤에는 드물고, 잘못
                          누르면 되돌릴 수 없다 — 그때는 대화로 정리한다. */}
                      {st === "답변대기" && (
                        <button type="button" className="prop-cancel" onClick={() => set취소할것(p)}>
                          제안 취소
                        </button>
                      )}
                    </td>
                    {/* 무슨 일이 있었나. 대화가 열린 줄은 이 글자가 곧 채팅으로 가는 문이다 —
                        버튼 열을 따로 두지 않고 여기 하나로 모았다. 미답변이면 빨갛다. */}
                    <td className={`c-recent${할?.우리차례 ? " todo" : ""}`}>
                      {대화열림(p)
                        ? <button type="button" onClick={() => set대화(p)}>{활.글}</button>
                        : <span>{활.글}</span>}
                    </td>
                    <td className="c-time">{활.때 ? 때(활.때) : ""}</td>
                  </tr>
                );
              })}
              </Fragment>
              ))}
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
      </>)}
    </CompanyLayout>
  );
}
