"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserPlus, FileText, Search, Send, MessageSquare,
         Building2, FilePlus2, Users, TrendingUp } from "lucide-react";
import InfoShell, { 누구읽기 } from "@/components/InfoShell";
import InfoSeg from "@/components/InfoSeg";
import { 플랜, 스타트 } from "@/lib/companyPlans";

/**
 * 사용가이드 — 처음부터 끝까지 한 번 따라가는 길.
 *
 * FAQ 와 하는 일이 다르다. FAQ 는 「이건 어떻게 하나요」에 낱개로 답하고,
 * 여기는 순서를 보여 준다 — 무엇부터 해야 하는지 모르는 사람은 물을 것도
 * 떠오르지 않는다.
 *
 * 받는 쪽으로 나누는 것은 FAQ 와 같다. 일자리를 찾으러 온 사람과 사람을
 * 뽑으러 온 사람이 밟는 순서는 겹치지 않는다.
 *
 * 없는 것을 적지 않는다. 적힌 것은 지금 화면에서 실제로 되는 것이어야 한다 —
 * 숫자는 lib/companyPlans 에서 가져와 상품이 바뀌면 여기도 같이 바뀐다.
 */
type 묶음 = "개인" | "기업";

const 걸음: Record<묶음, { Icon: typeof UserPlus; 이름: string; 말: string }[]> = {
  개인: [
    { Icon: UserPlus, 이름: "회원가입",
      말: "이메일이나 카카오로 가입하십니다. 가입과 이력서 등록, 지원과 제안 받기까지 개인회원은 비용이 들지 않습니다." },
    { Icon: FileText, 이름: "이력서 쓰기",
      말: "「이력서」에서 칸을 채우십니다. 한 번에 다 쓰지 않으셔도 쓰신 만큼 저장됩니다. 자기소개서 초안과 맞춤법 검사도 함께 쓰실 수 있습니다." },
    { Icon: Search, 이름: "공고 찾기",
      말: "채용공고에서 직군·지역으로 거르십니다. 「내 주변 공고」로 다닐 만한 거리만 골라 보실 수도 있습니다." },
    { Icon: Send, 이름: "지원하기",
      말: "공고 상세에서 「지원하기」를 누르시면 이력서가 그 매장에 전달됩니다. 어디까지 진행됐는지는 내 정보 → 지원 현황에서 보십니다." },
    { Icon: MessageSquare, 이름: "제안 받기",
      말: "이력서를 공개해 두시면 매장이 보고 먼저 제안을 보냅니다. 수락하시면 그때부터 채팅으로 이야기하십니다. 이름은 「하○○」처럼 가려지고, 지금 다니시는 매장만 빼고 공개하는 것도 됩니다." },
  ],
  기업: [
    { Icon: Building2, 이름: "기업회원 가입",
      말: "가입은 무료입니다. 공고를 올리시려면 사업자 정보 확인이 필요합니다 — 허위 공고를 막기 위한 절차입니다." },
    { Icon: FilePlus2, 이름: "공고 등록",
      말: `무료(${스타트.name})로 한 번에 ${스타트.무료건수}건까지 올리십니다. ${스타트.게재일}일 노출되고, 내려간 뒤 다시 올리시면 그날부터 또 ${스타트.게재일}일입니다. 다시 올리는 횟수에는 제한이 없습니다.` },
    { Icon: Users, 이름: "지원자 확인",
      말: "공고·지원자 관리에서 공고별로 보십니다. 지원자는 이용권과 상관없이 이름과 연락처가 모두 보입니다 — 본인이 직접 내신 이력서이기 때문입니다." },
    { Icon: TrendingUp, 이름: "상품으로 앞자리",
      말: `${플랜.LIGHT.name}부터는 건수 제한이 없고 무료 공고보다 검색 결과 위에 노출됩니다. ${플랜.STANDARD.name}과 ${플랜.PREMIUM.name}은 메인 화면에도 걸립니다.` },
  ],
};

function 판() {
  const 처음 = 누구읽기(useSearchParams());
  const [묶, set묶] = useState<묶음>(처음);

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

      <p className="sup-file-n">
        여기 없는 것이 궁금하시면{" "}
        <Link href="/support/faq">자주 묻는 질문 ›</Link>
      </p>
    </InfoShell>
  );
}

export default function GuidePage() {
  // 주소에서 갈래를 읽으므로 Suspense 로 감싼다 — 감싸지 않으면 미리 그려 두기가
  // 막혀 배포 빌드가 멈춘다.
  return <Suspense fallback={null}><판 /></Suspense>;
}
