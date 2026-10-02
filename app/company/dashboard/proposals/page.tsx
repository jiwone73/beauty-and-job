"use client";
import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import ProposalThread from "@/components/proposal/ProposalThread";
import ScrappedTalentList from "@/components/company/ScrappedTalentList";
import { companyTalentApi, companyJobsApi, type TalentItem } from "@/lib/api/company";
import { 마감인가 } from "@/lib/jobClosed";
import { 모집분야한줄 } from "@/lib/positionLine";
import { 직군표시 } from "@/lib/memberFormat";
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
  /** 제안하며 매장이 쓴 말. */
  message: string;
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
  lastMessageBody: string | null;
  messageCount: number;
  appointmentAt: string | null;
  declineReason: string | null;
  blocked: boolean;
  appliedAt: string | null;
  /** 기업이 제안을 거둔 시각. 수락 전에만 누를 수 있다. */
  canceledAt: string | null;
  /** 제안한 자리 한 줄. 공고에 모집분야가 여럿일 때 누구에게 어느 자리를
   *  보냈는지가 없어 매장도 알 수 없었다. */
  positionLine: string | null;
  /** 근무시간·급여만 담은 값("근무조건은 근무시간, 급여 요렇게만") — 모집분야
   *  칸을 직군 한 단어로 줄인 만큼 따로 둔다. 요일·시간·급여를 각각 한 줄씩
   *  보여준다("근무조건 3행. 요일, 시간, 급여 1칸씩"). */
  workConditionDay: string | null;
  workConditionTime: string | null;
  workConditionSalary: string | null;
  gender: string | null;
  age: number | null;
  subJob: string | null;
  regionPrefer: string | null;
  careerYears?: number | null;
  careerCount?: number;
};

// 이름만으로는 열 명 중 누구였는지 떠오르지 않는다. 인재검색 카드가 쓰는 값을
// 두 줄로 편다 — 첫 줄은 사람, 둘째 줄은 조건.
const 성별글 = (g: string | null) =>
  g === "FEMALE" || g === "여성" || g === "F" ? "여"
  : g === "MALE" || g === "남성" || g === "M" ? "남" : null;
const 인적 = (p: 제안) =>
  [성별글(p.gender), p.age ? `만 ${p.age}세` : null].filter(Boolean).join(" · ");
// 이 칸은 인재의 희망직군이 아니라 모집분야다 — 이건 기업이 사람에게 보낸
// 제안이라, "어떤 직군으로 제안했나"가 맞는 값이다("이건 제안이기 때문에
// 모집분야가 되는게 맞지 않냐" — 공고가 이미 있는 이상 구직자 정보가 아니라
// 회사가 고른 자리). positionLine은 "헤어디자이너 | 정규직 | 여성 | 경력 |
// 월 280만원"처럼 조건을 다 이은 줄이라 맨 앞 직군 하나만 자른다
// ("모집분야에는 헤어디자이너 까지만 써. 그 외 정보는 넣지 말고") — 지역·
// 경력·근무형태까지는 표가 무거워졌다, 이력서를 열면 다 있다.
// 직군 이름은 정식 표기(헤어디자이너·헤어스탭)로 — 옛 표기로 저장된 값이 섞여도 직군표시()가 바로잡는다.
const 조건 = (p: 제안) => 직군표시((p.positionLine || "").split("|")[0].trim());

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
  답변대기: "수락대기", 수락: "수락", 채팅중: "채팅중",
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

// 수락대기/진행중/종료 3탭 — 받은제안(구직자 화면)과 같은 나눔이다("보낸제안도
// 마찬가지로 3탭으로 바꿔줘"). 상태 칩은 탭 안에서 더 잘게 거르는 데만 쓴다.
type 탭키 = "수락대기" | "진행중" | "종료";
function 탭of상태(st: 상태키): 탭키 {
  if (st === "답변대기") return "수락대기";
  if (st === "거절" || st === "취소" || st === "공고마감") return "종료";
  return "진행중";
}
function 탭of(p: 제안): 탭키 { return 탭of상태(상태(p)); }

// 진행중 탭의 스테퍼 — 받은제안(구직자 화면)과 같은 부품·같은 순서다.
// 수락→채팅중→면접예정→종료. 마지막 "종료"는 이 탭에 있는 동안은 늘 빈
// 채로 남는다 — 채팅중 다음에도 갈 곳이 있다는 것만 보여준다("채팅중
// 다음이 목적지가 어디야?"). 이름은 종료 탭과 같은 말을 쓴다.
const 단계들 = ["수락", "채팅중", "면접예정", "종료"] as const;
function 현재단계(st: 상태키): number {
  if (st === "면접예정") return 2;
  if (st === "채팅중") return 1;
  return 0;
}
// 종료 탭 — 여기는 매장 자신이 거뒀거나(취소) 인재가 거절한 것이라, "제안취소"란
// 말이 구직자 화면과 달리 그대로 맞다(내가 취소한 것이 맞으므로).
const 종료라벨: Record<string, string> = { 거절: "거절함", 취소: "제안취소됨", 공고마감: "공고마감" };
function 종료일(p: 제안): string {
  if (p.declinedAt) return p.declinedAt;
  if (p.canceledAt) return p.canceledAt;
  return p.jobDeadline || p.createdAt;
}

/** 지금 누가 답할 차례인지 — 말로 대놓고 적는다("누가 답변할 차례인지 글자로
 *  대놓고 써주네" 참고 화면: "💬 9.26 23:25 (인재 답변대기)"). 면접예정만
 *  "확인"이라 쓴다 — 약속을 받아들일지 말지지 말을 주고받는 게 아니다. */
function 차례말(p: 제안): string | null {
  const st = 상태(p);
  if (st === "거절" || st === "취소" || st === "공고마감") return null;
  if (st === "면접예정") return p.lastSender === "USER" ? "기업 답변필요" : "인재 확인대기";
  if (st === "채팅중") return p.lastSender === "USER" ? "기업 답변필요" : "인재 답변대기";
  // 수락만 하고 말이 아직 없으면 매장이 먼저 걸 차례다.
  if (st === "수락") return "기업 답변필요";
  // 답변대기라도 이미 몇 마디 오갔으면(messageCount 1은 제안 메시지 자체라 아직
  // "주고받음"이 아니다) 마지막으로 보낸 쪽 기준으로 차례가 갈린다.
  if (p.messageCount > 1) return p.lastSender === "USER" ? "기업 답변필요" : "인재 답변대기";
  return "인재 답변대기";
}

/** 마지막으로 무슨 일이 있었나. 날짜 앞에 💬, 뒤에 지금 누구 차례인지를
 *  적는다("💬 9.26 23:25 (인재 답변대기)"). 끝난 제안(거절·취소·공고마감)은
 *  더 답할 차례가 없어 날짜만 남는다. 차례는 따로 반환해 기업 차례일 때만
 *  포인트 컬러로 강조할 수 있게 한다("기업이 해야 할 차례인 문구는 포인트
 *  컬러로 강조해 주세요"). */
function 최근활동(p: 제안): { 글: string; 차례: string | null } {
  if (p.blocked) return { 글: "차단됨", 차례: null };
  let 시각: string;
  if (p.canceledAt) 시각 = p.canceledAt;
  else if (p.appliedAt) 시각 = p.appliedAt;
  else if (p.declinedAt) 시각 = p.declinedAt;
  // 약속이 잡혀 있어도, 그 뒤로 구직자가 말을 걸었으면 그 말을 먼저 친다 —
  // 답해야 할 것이 무엇인지가 이 칸에 떠 있어야 한다(빨간 글자가 곧 미답변이다).
  else if (p.appointmentAt && p.lastSender !== "USER") 시각 = p.lastMessageAt!;
  // 제안 메시지 자체가 이제 첫 메시지로 들어가(messageCount 1부터 시작) —
  // 그것만으로는 아직 "제안을 보낸" 단계다. 진짜 주고받음(2개째부터)만 친다.
  else if (p.messageCount > 1) 시각 = p.lastMessageAt!;
  else if (p.interestedAt) 시각 = p.interestedAt;
  else if (p.readAt) 시각 = p.readAt;
  else 시각 = p.createdAt;
  return { 글: `💬 ${때(시각)}`, 차례: 차례말(p) };
}

/** 이 줄에 열린 대화가 있나. 채팅은 수락 이후부터다("채팅은 진행중에서만" /
 *  "수락전 채팅은 안돼") — 구직자가 아직 답하지 않은 제안엔 매장이 먼저 말을
 *  걸 수 없다. 거절·거둔 제안은 그 전에 이미 끝난 것이다. */
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
  // 모바일 수락대기 카드의 메시지 — 2줄 넘으면 말줄임, 누르면 펼친다
  // ("메시지가 2줄 넘으면 ... 처리해주고... 눌렀을때 전체 메시지가 보이게
  // 펼침으로 해줘", 2026-10-02).
  const [펼친메시지, set펼친메시지] = useState<Set<string>>(new Set());
  const 메시지토글 = (id: string) => set펼친메시지((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  // 모바일 종료 카드의 거절 사유 — 같은 규칙(1줄 넘으면 말줄임, 누르면
  // 전체 펼침, "1줄 넘으면 ... 처리하고 전체메시지 펼침보고", 2026-10-02).
  const [펼친사유, set펼친사유] = useState<Set<string>>(new Set());
  const 사유토글 = (id: string) => set펼친사유((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
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
  const [탭, set탭] = useState<탭키>("수락대기");
  const 탭고르기 = (t: 탭키) => { set탭(t); set고른상태("전체"); };
  const router = useRouter();
  const pathname = usePathname();
  const base = pathname.split("/").filter(Boolean)[0] === "company"
    ? "/company/dashboard" : `/${pathname.split("/").filter(Boolean)[0]}`;
  const 이력서열기 = (p: 제안) => router.push(`${base}/talent/${p.userId}`);
  // 스크랩 인재도 이 화면이 그린다. 왼쪽 공고 목록은 보낸 제안과 똑같이 두고
  // 본문만 스크랩 목록으로 바꾼다 — 두 갈래를 오갈 때 왼쪽이 흔들리지 않는다.
  const 스크랩모드 = pathname.endsWith("/proposals/scrapped");

  // ── 스크랩 인재 ──
  // 어느 공고로 담을지 고르는 팝오버는 없앴다("연결 안하기로 했는데" / "스크랩
  // 버튼을 누르면 이 팝오버 없이 바로 토글되게") — 스크랩은 그냥 담거나 빼는
  // 북마크고, 공고 고르기는 제안하기가 맡는다.
  const [스크랩인재, set스크랩인재] = useState<TalentItem[]>([]);
  const [스크랩로딩, set스크랩로딩] = useState(true);
  useEffect(() => {
    if (!스크랩모드) return;
    (async () => {
      set스크랩로딩(true);
      try {
        const 인: any = await companyTalentApi.list({ scrapped: true, limit: 200 });
        set스크랩인재(인?.success ? (인.data || []) : []);
      } catch (e) {
        console.error("[scrapped]", e);
      } finally {
        set스크랩로딩(false);
      }
    })();
  }, [스크랩모드]);
  // 목록 자체가 스크랩한 사람만 부른 것이라, 빼면 바로 줄에서 지운다. 되돌릴 수
  // 없는 일(다시 스크랩하려면 인재풀에서 그 사람을 또 찾아야 한다)이라 한 번 묻는다
  // ("스크랩 버튼 누르면 알림창 띄어줘 삭제할건지").
  const [뺄것, set뺄것] = useState<TalentItem | null>(null);
  const 스크랩빼기 = async () => {
    const item = 뺄것;
    if (!item) return;
    set뺄것(null);
    set스크랩인재((prev) => prev.filter((t) => t.id !== item.id));
    try {
      await companyTalentApi.unscrap(item.id);
    } catch {
      set스크랩인재((prev) => [...prev, item]);
    }
  };

  // 채팅은 유료(스탠다드 이상)만 된다("무료, 라이트 회원은 채팅창도 안
  // 열리고") — 채팅하기 버튼을 미리 꺼 둔다. 열어 봐야 API 가 막으므로,
  // 눌러서 알게 하지 않는다.
  const [채팅가능, set채팅가능] = useState(true);
  const 불러오기 = useCallback(async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const r = await fetch("/api/company/proposals", { headers: { Authorization: `Bearer ${token}` } })
      .then((x) => x.json()).catch(() => null);
    if (r?.success && Array.isArray(r.data)) set목록(r.data);
    set채팅가능((r?.meta as any)?.talentAccess !== false);
    set로딩(false);
  }, []);
  useEffect(() => { 불러오기(); }, [불러오기]);



  // 다른 화면에서 공고를 짚고 들어오면(?job=) 그 공고를 고른 채로 연다.
  // 스크랩 인재 옆 공고 목록을 누르면 이 길로 온다.
  useEffect(() => {
    const j = new URLSearchParams(window.location.search).get("job");
    if (j) set고른공고(j);
  }, []);

  // 대시보드 카드에서 넘어오면 그 상태 칩이 골라진 채로 열린다(?status=채팅중).
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("status");
    if (s && (s === "전체" || Object.keys(상태이름).includes(s))) {
      set고른상태(s as 상태키 | "전체");
      if (s !== "전체") set탭(탭of상태(s as 상태키));
    }
  }, []);

  const 공고고른것 = 고른공고
    ? 목록.filter((p) => (p.jobPostingId || "none") === 고른공고)
    : 목록;

  // 3탭(수락대기/진행중/종료)으로 먼저 가르고, 탭 안에서는 상태 칩으로 더
  // 잘게 거른다. 탭 개수는 공고 필터만 반영한다 — 탭 자체를 바꾸는 숫자다.
  const 탭한것 = useMemo(() => 공고고른것.filter((p) => 탭of(p) === 탭), [공고고른것, 탭]);
  const 탭수 = useMemo(() => {
    const 표: Record<탭키, number> = { 수락대기: 0, 진행중: 0, 종료: 0 };
    for (const p of 공고고른것) 표[탭of(p)] += 1;
    return 표;
  }, [공고고른것]);

  // 상태 칩은 탭 안에서 제안이 흘러가는 차례 그대로 세운다 — 수락대기는 상태가
  // 하나뿐이라 칩이 필요 없다. 0건이어도 자리를 지킨다. 있는 것만 세우면
  // 흐름이 끊겨, 지금 어디까지 왔고 어디서 막혔는지가 안 보인다.
  const 칩들 = useMemo(() => {
    if (탭 === "수락대기") return [];
    const 흐름: 상태키[] = 탭 === "진행중" ? ["수락", "채팅중", "면접예정"] : [];
    const 끝: 상태키[] = 탭 === "종료" ? ["거절", "취소", "공고마감"] : [];
    const 셈 = new Map<상태키, number>();
    for (const p of 탭한것) 셈.set(상태(p), (셈.get(상태(p)) || 0) + 1);
    // 「전체」가 맨 앞 — 기본으로 골라져 있는 칸이라 첫 자리가 자연스럽다. 그 뒤로
    // 선 하나를 두고 흐름이 이어서 시작하고, 흐름 밖에서 끝난 것(제안취소 등)은
    // 오른쪽 끝에 떼어 둔다. 그리는 차례는 아래 칩 줄이 정한다.
    return [
      ...흐름.map((k) => ({ 키: k, 수: 셈.get(k) || 0 })),
      ...끝.filter((k) => (셈.get(k) || 0) > 0).map((k) => ({ 키: k, 수: 셈.get(k)! })),
      { 키: "전체" as const, 수: 탭한것.length },
    ];
  }, [탭한것, 탭]);

  const 줄들 = useMemo(() => {
    const l = 고른상태 === "전체" ? 탭한것 : 탭한것.filter((p) => 상태(p) === 고른상태);
    // 우리 차례인 것이 먼저. 그다음 최근 활동 순.
    return [...l].sort((a, b) => {
      const 급 = (p: 제안) => (다음할일(p)?.우리차례 ? 0 : 1);
      return 급(a) - 급(b) ||
        +new Date(b.lastMessageAt || b.createdAt) - +new Date(a.lastMessageAt || a.createdAt);
    });
  }, [탭한것, 고른상태]);

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

  /* 옆줄(공고 목록)은 걷었다. 공고가 한둘인 매장에서는 옆줄의 「전체 N」과
     「공고별 N」, 표 안의 공고 띠가 같은 숫자를 세 번 말했다. 이제 표의 공고명
     한 칸이 그 일을 한다 — 누르면 그 공고만 본다. */

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
    <CompanyLayout activePage={스크랩모드 ? "scrapped" : "proposals"}>
      {스크랩모드 ? (
        <ScrappedTalentList base={base} loading={스크랩로딩}
          talents={스크랩인재} onToggleScrap={set뺄것} />
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
          {/* 공고 하나만 보는 중. 옆줄이 없으니 돌아가는 길을 여기 둔다. */}
          <button type="button" className="prop-back" onClick={() => 공고고르기("")}>
            ‹ 보낸 제안 전체
          </button>
          {머리판(공고머리, 고른공고)}
          {띠(`이 공고로 제안한 인재 ${공고고른것.length}명`,
            우리차례수 > 0 ? <><span className="apl-bar-sep">|</span><span className="prop-mine">미답변 {우리차례수}</span></> : null)}
        </div>
      )}

      {/* 수락대기/진행중/종료 3탭 — 받은제안(구직자 화면)과 같은 나눔이다
          ("보낸제안도 마찬가지로 3탭으로 바꿔줘"). */}
      <div className="prop-tabs">
        {(["수락대기", "진행중", "종료"] as const).map((t) => (
          <button key={t} type="button" className={`prop-tab${탭 === t ? " on" : ""}`}
            onClick={() => 탭고르기(t)}>
            {t} <span className="prop-tab-n">{탭수[t]}</span>
          </button>
        ))}
      </div>

      {/* 탭 안에서 상태 흐름을 칩으로 더 잘게 거른다. 수락대기는 상태가 하나뿐이라
          칩이 없다. 칩만 나란히 두면 그냥 단추로 보여, 지금 어디까지 왔고 어디서
          막혔는지가 안 읽힌다. 사이를 화살표로 잇는다. 끝난 것(거절·제안취소·
          공고마감)과 「전체」는 흐름 밖이라 선으로 떼어 오른쪽에 모은다. */}
      {칩들.length > 0 && (
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
      )}

      {로딩 ? (
        <p style={{ padding: "48px 0", textAlign: "center", color: "#555", fontSize: 14 }}>불러오는 중…</p>
      ) : 줄들.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "#555" }}>
          <div style={{ display: "inline-flex", padding: 14, borderRadius: "50%", background: "#f7f7f8", color: "#555", marginBottom: 12 }}>
            <Send size={30} />
          </div>
          <p style={{ fontSize: 15, color: "#555", margin: 0 }}>
            {목록.length === 0 ? "아직 보낸 제안이 없어요" : "이 상태인 제안이 없어요"}
          </p>
          {목록.length === 0 && (
            <p style={{ fontSize: 13, marginTop: 6 }}>인재 검색에서 마음에 드는 분에게 제안을 보내보세요</p>
          )}
        </div>
      ) : 탭 !== "수락대기" ? (
        // 진행중·종료는 받은제안(구직자 화면)과 같은 한 줄짜리 카드다
        // ("보낸제안 페이지도 받은제안이랑 똑같이 해줘" → "진행중·종료 탭을
        // 카드형으로 전면 개편"). 수락대기는 사람이 많고 훑어볼 것뿐이라
        // 표를 그대로 둔다.
        <div className="prop-cards">
          {줄들.map((p) => {
            const st = 상태(p);
            const 활 = 최근활동(p);
            const 사람칸 = (
              <div className="prop-card2-co">
                <span className="apl-td-avatar">
                  {p.avatarUrl
                    ? <img src={p.avatarUrl} alt="" loading="lazy" />
                    : <span>{(p.userName || "?").slice(0, 1)}</span>}
                </span>
                <div className="prop-card2-colines">
                  <span className="prop-card2-nameline">
                    <span className="prop-card2-name">{p.userName}</span>
                    {/* 모바일 전용 — 큰 스테퍼(라벨 4개) 대신 이름 옆에 점만 작게.
                        "프로그래스 바 사이즈 줄여서 이름옆에 넣어"(2026-10-01). */}
                    {탭 !== "종료" && (
                      <span className="prop-step-dots prop-step-mini">
                        <span className="prop-step-line-bg" />
                        <span className="prop-step-line-fill"
                          style={{ width: `${(현재단계(상태(p)) / (단계들.length - 1)) * 75}%` }} />
                        {단계들.map((label, i) => (
                          <span key={label} className={`prop-step-dot${i <= 현재단계(상태(p)) ? " on" : ""}${i === 현재단계(상태(p)) ? " current" : ""}`} />
                        ))}
                      </span>
                    )}
                    {/* 점만 있으면 지금 몇 단계인지 안 읽힌다("프로그레스바에
                        단계 이름이 없어", 2026-10-02) — 현재 단계 이름만
                        점 옆에 짧게 붙인다(넉 줄 다 적으면 자리가 없다). */}
                    {탭 !== "종료" && (
                      <span className="prop-step-mini-label">{단계들[현재단계(상태(p))]}</span>
                    )}
                  </span>
                  <span className="prop-card2-job">{조건(p) || "—"}</span>
                  <button type="button" className="prop-card2-viewjob"
                    onClick={() => p.jobPostingId && 공고고르기(p.jobPostingId)}>
                    공고 보기 <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            );
            if (탭 === "종료") {
              return (
                <div className="prop-card2 ended sent" key={p.id}>
                  {사람칸}
                  {/* 모바일 전용 — 배지·날짜를 사람칸 옆, 공고 보기 글자 하단에
                      맞춰 오른쪽 정렬로 뺀다("거절함 날자는 아바타 쪽 오른쪽
                      정렬" / "날자를 공고보기 글자 하단과 맞춰" / "거절함이
                      날자 위로 올라가야지", 2026-10-02). 데스크탑은 아래
                      .prop-card2-end 안의 것을 그대로 쓴다. */}
                  <div className="prop-end-mobile">
                    <span className={`prop-badge prop-badge-${st}`}>{종료라벨[st]}</span>
                    <span className="prop-upd">{날짜(종료일(p))}</span>
                  </div>
                  <div className="prop-card2-end">
                    <span className={`prop-badge prop-badge-${st}`}>{종료라벨[st]}</span>
                    <span className="prop-upd">{날짜(종료일(p))}</span>
                    {st === "거절" && p.declineReason && (
                      <p className={`prop-reason${펼친사유.has(p.id) ? " open" : ""}`}
                        onClick={() => 사유토글(p.id)}>
                        {p.declineReason}
                      </p>
                    )}
                  </div>
                </div>
              );
            }
            const 단계 = 현재단계(st);
            // 채팅하기 버튼은 PC(.prop-card2-acts)와 모바일(최근대화 줄 옆)
            // 두 자리에 그린다 — "채팅하기 버튼 크기 있잖아. 크기 똑같이
            // 적용해"(2026-10-01): 같은 버튼을 자리만 CSS로 바꿔 끼운다.
            const 채팅막힘 = !대화열림(p);
            const 채팅클릭 = () => {
              if (!채팅가능) {
                if (confirm("채팅은 스탠다드 이상 유료 상품에서 쓸 수 있어요. 상품안내 페이지로 가시겠어요?")) {
                  router.push("/company/plans");
                }
                return;
              }
              set대화(p);
            };
            const 채팅버튼스타일 = !채팅가능 ? { opacity: 0.5, cursor: "not-allowed" as const } : undefined;
            return (
              <div className="prop-card2" key={p.id}>
                {사람칸}
                <div className="prop-step">
                  <div className="prop-step-dots">
                    <span className="prop-step-line-bg" />
                    <span className="prop-step-line-fill"
                      style={{ width: `${(단계 / (단계들.length - 1)) * 75}%` }} />
                    {단계들.map((label, i) => (
                      <span key={label} className={`prop-step-dot${i <= 단계 ? " on" : ""}${i === 단계 ? " current" : ""}`} />
                    ))}
                  </div>
                  <div className="prop-step-labels">
                    {단계들.map((label, i) => (
                      <span key={label} className={i === 단계 ? "current" : undefined}>
                        {label}
                        {i === 단계 && <em>{활.글.replace("💬 ", "")}</em>}
                      </span>
                    ))}
                  </div>
                </div>
                {/* 아직 메시지가 없으면 "최근 대화" 칸 자체를 안 보인다 — 실제
                    대화가 없는데 대화 미리보기처럼 보이면 안 된다. */}
                {p.lastMessageBody && (
                  <div className="prop-card2-recent">
                    <span className="prop-card2-recent-head">
                      <span className="prop-card2-recent-label">
                        최근 대화
                        {/* 언제, 누가 보냈는지도 같이("최근대화 옆에 () 넣어주고
                            시간하고 누가 보냈는지 적어줘"). */}
                        {p.lastMessageAt && (
                          <span className="prop-card2-recent-meta">
                            ({때(p.lastMessageAt)} ㅣ {p.lastSender === "USER" ? p.userName : "나"})
                          </span>
                        )}
                      </span>
                    </span>
                    {/* 모바일 전용 — 채팅하기를 메시지창과 같은 줄 오른쪽으로
                        ("채팅하기 버튼은 메시지창과 같은라인에 오른쪽으로
                        배치해줘", 2026-10-02). 화살표(>)는 지운다("> 삭제해줘"). */}
                    <span className="prop-card2-preview-row">
                      <button type="button" className="prop-card2-preview" onClick={() => set대화(p)}>
                        <span>{p.lastMessageBody}</span>
                        <ChevronRight size={16} className="prop-card2-preview-chevron" />
                      </button>
                      <button type="button" className="prop-chat-solid prop-card2-chat-mobile"
                        disabled={채팅막힘} style={채팅버튼스타일} onClick={채팅클릭}>
                        채팅하기
                      </button>
                    </span>
                  </div>
                )}
                {/* 거두는 일(제안 취소)은 답이 없는 줄에서만 하는 일이라 이미
                    수락한 뒤인 진행중에는 채팅하기만 있다. */}
                <div className="prop-card2-acts">
                  {/* 플랜 잠금은 disabled 로만 꺼두면 색이 그대로라 눌러도 반응이
                      없는 것처럼 보인다("채팅하기 버튼눌렀는데 채팅창이 안떠") —
                      흐리게 보이게 하고, 눌렀을 때는 안내를 띄운다. */}
                  <button type="button" className="prop-chat-solid" disabled={채팅막힘}
                    style={채팅버튼스타일} onClick={채팅클릭}>
                    채팅하기
                  </button>
                </div>
              </div>
            );
          })}
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
          {/* 수락대기 탭은 상태가 하나뿐이라 진행상황·관리 열이 쌩뚱맞다
              ("수락대기 탭에서 진행상황 관리 뺴기로 하고 제안일 넣기로
              했잖아") — 받은제안(구직자 화면)과 같은 짜임이다: 제안일 열을
              두고, 제안하며 쓴 말과 제안 취소를 줄 밑 메시지 칸으로 내린다
              ("보냈던 메시지도 똑같이 보여줘야지"). */}
          <table className={`prop-table${고른공고 ? " no-post" : " has-post"} received sent`}>
            <thead>
              <tr>
                <th className="c-who">인재</th>
                {/* "공고"만 쓰면 인재 쪽 값(희망직군 등)과 같은 급으로 읽혀
                    헷갈렸다("공고는 구직자가 고른게 아니라 기업이 제안하려고
                    고른거라 햇갈리는거야") — 우리가 고른 자리임을 밝힌다. */}
                {!고른공고 && <th className="c-post">제안한 공고</th>}
                <th className="c-job">모집분야</th>
                {/* 근무시간·급여만 따로("근무조건은 근무시간, 급여 요렇게만") —
                    모집분야 다음 자리("근무조건이 모집분야 다음에 추가되야"). */}
                <th className="c-cond">근무조건</th>
                <th className="c-date">제안일</th>
              </tr>
            </thead>
            <tbody>
              {묶음들.map((묶음) => (
              <Fragment key={묶음.키}>
              {묶음.줄.map((p, i) => (
                <Fragment key={p.id}>
                <tr>
                  {/* 인재 칸은 공고지원자·인재풀 표와 같은 부품(.apl-td-*)을
                      쓰되("PC 쪽 보낸제안 테이블 인재쪽 적용해줘. 기존
                      룰이랑 통일"), 지역은 칸을 따로 빼지 않고 이름·나이
                      밑 3행으로 다시 넣는다 — 칸을 나눴더니 인재 칸이
                      좁아져 사진이 작아 보였다("인재를 2행으로 하니까
                      아바타가 너무 작아. 지역을 인재에 다시 넣고 그
                      폭만큼 아바타를 키우자"). 사진은 그 폭만큼(.prop-table
                      전용으로) 32×40→44×55로 키운다. */}
                  <td className="apl-td apl-td-who">
                    <button type="button" className="apl-td-whobtn" onClick={() => 이력서열기(p)}>
                      <span className="apl-td-avatar">
                        {p.avatarUrl
                          ? <img src={p.avatarUrl} alt="" loading="lazy" />
                          : <span>{(p.userName || "?").slice(0, 1)}</span>}
                      </span>
                      <span className="apl-td-wholines">
                        <span className="apl-td-name">{p.userName}</span>
                        <span className="apl-td-sub">{인적(p) || "—"}</span>
                        <span className="apl-td-sub">
                          {/* 모바일 전용 — 지역 앞 경력(「경력 5년 · 서울 마포구」). PC는 그대로 지역만. */}
                          <span className="apl-td-career">{!p.careerCount || !p.careerYears ? "신입" : `경력 ${p.careerYears}년`} · </span>
                          {p.regionPrefer || "—"}
                        </span>
                      </span>
                    </button>
                    {/* 모바일 전용 — 이름 줄엔 모집분야, 성별 줄엔 급여, 지역
                        줄엔 제안일("헤어스탭을 월급 216만원 이상 위에 올려",
                        "카드 오른쪽 성별 있는 줄에 급여정보 넣고, 그밑에 줄에
                        제안 취소버튼", 이후 "제안취소 버튼하고 날자하고 위치
                        바꿔"로 자리가 다시 바뀌었다. "날자 뒤에 보냄이라고
                        써줘", 2026-10-02). 제안 취소는 메시지 끝으로 옮기고
                        모집분야(.c-job)·메시지 줄 원래 취소 버튼은 모바일에서
                        숨긴다(두 곳에 보이면 안 됨). */}
                    <div className="prop-card-aside">
                      <span className="prop-card-job">{조건(p)}</span>
                      <span className="prop-card-salary">{p.workConditionSalary}</span>
                      <span className="prop-card-date">{날짜(p.createdAt)} 보냄</span>
                    </div>
                  </td>
                  {/* 어느 공고로 보낸 제안인지. 누르면 그 공고만 본다 — 옆줄에
                      있던 공고 목록이 하던 일이다. */}
                  {!고른공고 && (
                    <td className="c-post">
                      {p.jobPostingId ? (
                        <button type="button" className="prop-post" title={p.jobTitle || undefined}
                                onClick={() => 공고고르기(p.jobPostingId!)}>
                          {p.jobTitle || "공고 없음"}
                        </button>
                      ) : <span className="prop-post none">공고 없음</span>}
                    </td>
                  )}
                  {/* 직군은 열을 따로 준다. 이름 아래에 붙이면 사람에 따라 줄 수가
                      달라져 표가 들쭉날쭉했다. 열로 두면 인재 칸은 늘 두 줄이다. */}
                  {/* 좁은 칸이라 긴 값은 …으로 잘린다. 잘린 것은 마우스를 올리면 그대로 보인다. */}
                  <td className="c-job" title={조건(p)}><span>{조건(p)}</span></td>
                  {/* 근무조건은 요일·시간·급여를 각각 한 줄씩("근무조건 3행.
                      요일, 시간, 급여 1칸씩") — 제일 중요한 칸이라 넓이도 더 준다. */}
                  <td className="c-cond" title={[p.workConditionDay, p.workConditionTime, p.workConditionSalary]
                    .filter(Boolean).join(" · ") || undefined}>
                    {p.workConditionDay || p.workConditionTime || p.workConditionSalary ? (
                      <>
                        <span>{p.workConditionDay}</span>
                        <span>{p.workConditionTime}</span>
                        <span>{p.workConditionSalary}</span>
                      </>
                    ) : <span>—</span>}
                  </td>
                  <td className="c-date">{날짜(p.createdAt)}</td>
                  {/* 모바일 전용 — 제안 메시지가 카드 박스 안, 원래 제안일 자리
                      (아바타 밑 구분선)로 들어간다("그 날자 자리에 메시지를
                      넣으라고. 박스안에 메시지가 들어가야해", 2026-10-02).
                      제안일 대신 제안 취소를 메시지 끝에 둔다("제안취소
                      버튼하고 날자하고 위치 바꿔"). */}
                  <td className="c-msg">
                    <span
                      className={`c-msg-text${펼친메시지.has(p.id) ? " open" : ""}`}
                      onClick={() => p.message && 메시지토글(p.id)}
                    >
                      {p.message ? `“${p.message}”` : "—"}
                    </span>
                    <button type="button" className="prop-cancel c-msg-cancel" onClick={() => set취소할것(p)}>
                      제안 취소
                    </button>
                  </td>
                </tr>
                {/* 제안하며 쓴 말과 제안 취소는 버튼 하나뿐이라 같은 줄 오른쪽에 둔다
                    ("메시지가 버튼위치 시작전에 줄바꿈하라고 했는데"). */}
                <tr className="prop-msg-row">
                  <td colSpan={고른공고 ? 4 : 5}>
                    <div className="prop-msg-line">
                      {p.message && <p className="prop-msg-text">“{p.message}”</p>}
                      <div className="prop-msg-acts">
                        <button type="button" className="prop-cancel" onClick={() => set취소할것(p)}>
                          제안 취소
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
                </Fragment>
              ))}
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

      {/* 공고명(모집분야) 대신 구직자 본인의 희망직군을 보여준다 — 공고명은
          우리 쪽 정보라 "상대방정보만 있으면 되잖아"에 안 맞았다("지금
          부제는 구직자 희망직군이 아니고 모집분야잖아" — 그래서 바꾼다). */}
      {대화 && (
        <ProposalThread
          proposalId={대화.id}
          제목={대화.subJob || "직군 미정"}
          상대={대화.userName}
          token={typeof window !== "undefined" ? localStorage.getItem("access_token") || "" : ""}
          onClose={() => { set대화(null); 불러오기(); }}
        />
      )}
      </>)}

      {/* 스크랩 인재 탭에서도 열려야 해서 위 갈래(보낸 제안 전용) 밖에 둔다. */}
      {뺄것 && (
        <div className="rp-modal-overlay">
          <div className="prop-dec">
            <p className="prop-dec-t">{뺄것.name}님을 스크랩에서 뺄까요?</p>
            <div className="prop-dec-acts">
              <button type="button" onClick={() => set뺄것(null)}>취소</button>
              <button type="button" className="key" onClick={스크랩빼기}>스크랩 빼기</button>
            </div>
          </div>
        </div>
      )}
    </CompanyLayout>
  );
}
