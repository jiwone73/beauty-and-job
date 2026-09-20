"use client";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserPlus, FileText, Search, Send, MessageSquare,
         Building2, FilePlus2, Users, TrendingUp } from "lucide-react";
import InfoShell, { 누구읽기 } from "@/components/InfoShell";
import InfoSeg from "@/components/InfoSeg";
import FaqBoard from "@/components/support/FaqBoard";
import { 플랜, 스타트 } from "@/lib/companyPlans";

/**
 * 사용가이드 — 처음부터 끝까지 한 번 따라가는 길 + 낱개로 찾아보는 곳.
 *
 * 위쪽은 순서(무엇부터 해야 하는지)를, 아래쪽은 FaqBoard(검색+갈래+아코디언)를
 * 그대로 얹어 「이건 어떻게 하나요」를 찾아보게 한다. 예전엔 이 둘을
 * 사용가이드·자주 묻는 질문으로 메뉴를 나눠 두었는데, 찾아보는 화면이 하나로
 * 합쳐지는 편이 — 다른 사이트들도 대개 그렇게 한다 — 메뉴를 오가지 않아도 된다.
 * /support/faq 는 이 주소로 돌려보낸다(옛 링크가 죽지 않게).
 *
 * 없는 것을 적지 않는다. 적힌 것은 지금 화면에서 실제로 되는 것이어야 한다 —
 * 숫자는 lib/companyPlans 에서 가져와 상품이 바뀌면 여기도 같이 바뀐다.
 */
type 묶음 = "개인" | "기업";

/** 인재 제안·채팅·면접 실제 화면 캡처 — 화면에서는 뺐다(이미지가 10장이라
 *  사용가이드 한 화면이 너무 길어졌다). 그림 파일과 이 목록은 지우지 않고
 *  남겨 둔다 — 나중에 다시 붙일 수 있게. public/images/guide/*.jpg */
const 인재제안흐름: { 그림: string; 말: string }[] = [
  { 그림: "1-talent-search", 말: "인재풀에서 마음에 드는 분을 찾아 '제안하기'를 누릅니다." },
  { 그림: "2-propose-modal", 말: "보낼 공고를 고르면 그 공고 조건에 맞춰 제안 메시지가 채워집니다. 그대로, 또는 고쳐서 보냅니다." },
  { 그림: "3-proposal-list", 말: "'제안·스크랩'에서 보낸 제안이 대기·수락·채팅중·면접예정 중 어디까지 갔는지 한눈에 보입니다." },
  { 그림: "4-received-proposal", 말: "받은 분에게는 '받은 제안'에 수락·거절 버튼으로 뜹니다." },
  { 그림: "5-accepted", 말: "수락하면 그 자리에서 바로 채팅으로 넘어갈 수 있게 바뀝니다." },
  { 그림: "6-chat-open", 말: "채팅방이 열립니다. 이제부터 편하게 이야기하시면 됩니다." },
  { 그림: "7-appointment-form", 말: "채팅창의 달력 아이콘으로 면접 날짜·장소를 잡아 보냅니다(약속은 매장이 정합니다)." },
  { 그림: "8-appointment-sent", 말: "보낸 약속은 채팅에 카드로 남고, 상대의 답을 기다립니다." },
  { 그림: "9-appointment-received", 말: "받은 분은 '좋아요'나 '어려워요'로 답합니다." },
  { 그림: "10-appointment-confirmed", 말: "좋아요를 누르면 그 자리에서 면접 약속이 확정됩니다." },
];

const 걸음: Record<묶음, { Icon: typeof UserPlus; 이름: string; 말: string }[]> = {
  개인: [
    { Icon: UserPlus, 이름: "회원가입",
      말: "이메일이나 카카오로 가입하십니다. 가입과 이력서 등록, 지원과 제안 받기까지 개인회원은 비용이 들지 않습니다." },
    { Icon: FileText, 이름: "이력서 쓰기",
      말: "「이력서」에서 칸을 채우십니다. 한 번에 다 쓰지 않으셔도 쓰신 만큼 저장됩니다. 자기소개서 초안과 맞춤법 검사도 함께 쓰실 수 있습니다. 공개 여부는 이력서 화면에서 언제든 바꾸실 수 있고, 비공개로 두면 기업 검색에 뜨지 않습니다." },
    { Icon: Search, 이름: "공고 찾기",
      말: "채용공고에서 매장·오피스 중 먼저 고르고, 그 안에서 직군·지역으로 거르십니다. 「내 주변 공고」로 다닐 만한 거리만 골라 보실 수도 있습니다." },
    { Icon: Send, 이름: "지원하기",
      말: "공고 상세에서 「지원하기」를 누르시면 자기소개서 작성 → 미리보기 → 제출 순서로 진행됩니다. 미리보기에서 「공고에 맞게 수정하기」를 누르면 이 공고에 낼 이력서에서 항목을 빼거나 급여만 고칠 수 있고, 제출한 뒤에는 다시 고치실 수 없습니다. 어디까지 진행됐는지는 내 정보 → 지원 현황에서 보십니다." },
    { Icon: MessageSquare, 이름: "제안 받기",
      말: "이력서를 공개해 두시면 매장이 보고 먼저 제안을 보냅니다. 수락하시면 그때부터 채팅으로 이야기하십니다. 이름은 「하○○」처럼 가려지고, 지금 다니시는 매장만 빼고 공개하는 것도 됩니다." },
  ],
  기업: [
    { Icon: Building2, 이름: "기업회원 가입",
      말: "가입은 무료입니다. 공고를 올리시려면 사업자 정보 확인이 필요합니다 — 허위 공고를 막기 위한 절차입니다." },
    { Icon: FilePlus2, 이름: "공고 등록",
      말: `무료(${스타트.name})로 한 번에 ${스타트.무료건수}건까지 올리십니다. ${스타트.게재일}일 노출되고, 내려간 뒤 다시 올리시면 그날부터 또 ${스타트.게재일}일입니다. 다시 올리는 횟수에는 제한이 없고, 마감된 공고는 「재등록」으로 내용을 그대로 다시 쓰실 수 있습니다.` },
    { Icon: Users, 이름: "지원자 확인",
      말: "공고·지원자 관리에서 공고별로 보십니다. 지원자는 이용권과 상관없이 이름과 연락처가 모두 보입니다 — 본인이 직접 내신 이력서이기 때문입니다." },
    { Icon: TrendingUp, 이름: "상품으로 앞자리",
      말: `${플랜.LIGHT.name}부터는 건수 제한이 없고 무료 공고보다 검색 결과 위에 노출됩니다. ${플랜.STANDARD.name}과 ${플랜.PREMIUM.name}은 메인 화면에도 걸립니다.` },
  ],
};

function 판() {
  /* 고른 갈래는 주소가 쥔다. 여태는 처음 한 번만 읽어 두어, 옆줄에서 다른
     갈래를 눌러도 주소만 바뀌고 본문은 그대로였다. 주소 하나만 보면
     옆줄 표시와 본문이 따로 놀 수 없다. */
  const router = useRouter();
  const 묶 = 누구읽기(useSearchParams());
  const set묶 = (v: 묶음) => router.replace(`/support/guide?누구=${v}`, { scroll: false });

  return (
    <InfoShell active="/support/guide" title="사용가이드" 누구={묶}>
      <InfoSeg 값={묶} 고르기={set묶}
               목록={[["개인", "개인회원"], ["기업", "기업회원"]] as const} />

      <div className="guide-steps">
        {걸음[묶].map(({ Icon, 이름, 말 }, i) => (
          <div key={이름} className="ev-step">
            <span className="ev-step-ic"><Icon size={24} strokeWidth={1.7} /></span>
            <div>
              <span className="ev-step-no">STEP {String(i + 1).padStart(2, "0")}</span>
              <b>{이름}</b>
              <p>{말}</p>
            </div>
          </div>
        ))}
      </div>

      <div id="찾아보기" className="guide-faq">
        <h2 className="guide-flow-h">하나씩 찾아보기</h2>
        <p className="guide-flow-sub">위 흐름 말고 궁금한 것이 있으면 여기서 찾아보세요.</p>
        <FaqBoard key={묶} 처음={묶} 묶고정={묶} />
      </div>

      <p className="sup-file-n">
        그래도 못 찾으셨으면{" "}
        <Link href="/support">1:1 문의하기 ›</Link>
      </p>
    </InfoShell>
  );
}

export default function GuidePage() {
  // 주소에서 갈래를 읽으므로 Suspense 로 감싼다 — 감싸지 않으면 미리 그려 두기가
  // 막혀 배포 빌드가 멈춘다.
  return <Suspense fallback={null}><판 /></Suspense>;
}
