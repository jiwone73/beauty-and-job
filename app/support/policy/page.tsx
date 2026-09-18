"use client";
import Link from "next/link";
import InfoShell from "@/components/InfoShell";
import { 보관표기 } from "@/lib/companyPlans";

/**
 * 회원정책 — 이용약관에 적힌 것 중 회원이 실제로 부딪히는 것만 쉬운 말로.
 *
 * 약관은 스물몇 조에 걸쳐 있어 무엇이 나에게 걸리는 말인지 찾기 어렵다.
 * 여기서는 지키셔야 하는 것, 어겼을 때 일어나는 일, 우리가 지키는 것만
 * 추린다. 정하는 것은 약관이고 여기는 그 요약이라, 두 곳이 어긋나면
 * 약관이 맞다 — 그래서 아래에 약관으로 가는 길을 둔다.
 *
 * 없는 규칙을 적지 않는다. 적힌 것은 지금 실제로 그렇게 운영하는 것이어야
 * 한다 — 정책은 곧 약속이다.
 */
export default function PolicyPage() {
  return (
    <InfoShell active="/support/policy" title="회원정책">
      <div className="info-section">
        <h2>모든 회원이 지키셔야 하는 것</h2>
        <ul className="pi-warn">
          <li>사실만 적습니다. 이력서의 경력·자격, 공고의 급여·근무조건 모두 실제와 같아야 합니다.</li>
          <li>남의 정보로 가입하거나 계정을 빌려주지 않습니다.</li>
          <li>채용과 관계없는 광고·홍보·모집 글을 올리지 않습니다.</li>
          <li>알게 된 상대의 연락처를 채용 목적 밖으로 쓰지 않습니다.</li>
        </ul>
      </div>

      <div className="info-section">
        <h2>어겼을 때</h2>
        <ul className="pi-warn">
          <li>허위로 확인되면 해당 공고나 이력서를 내립니다.</li>
          <li>반복되는 곳은 등록을 제한하고, 심하면 이용을 정지합니다.</li>
          <li>이상한 공고나 연락을 받으셨다면 <Link href="/support?문의=1">1:1 문의</Link>로 알려 주세요. 확인 후 조치하고 결과를 알려 드립니다.</li>
        </ul>
      </div>

      <div className="info-section">
        <h2>개인회원 이력서</h2>
        <ul className="pi-warn">
          <li>이력서의 이름은 「하○○」처럼 가려집니다. 지금 일하시는 매장 이름도 보이지 않습니다.</li>
          <li>이름과 연락처가 열리는 것은 이용권을 가진 기업이거나, 회원님이 직접 지원하신 매장뿐입니다.</li>
          <li>내 정보 → 설정에서 비공개로 바꾸실 수 있고, 특정 매장만 빼고 공개하는 것도 됩니다.</li>
          <li>탈퇴하시면 이력서와 지원 내역이 함께 지워집니다.</li>
        </ul>
      </div>

      <div className="info-section">
        <h2>기업회원 이용권</h2>
        <ul className="pi-warn">
          <li>무통장입금으로 받습니다. 입금이 확인된 날부터 이용권이 시작됩니다.</li>
          <li>결제하신 이용권은 환불되지 않습니다.</li>
          <li>사람을 빨리 뽑으셨다면 공고를 모두 닫고 「남은 기간 보관하기」를 누르십니다. {보관표기}간 보관했다가 같은 상품을 다시 신청하실 때 더해 드립니다.</li>
          <li>목록 앞자리는 상품으로 정해집니다. 등록일을 바꿔 올려 앞으로 나오게 하는 기능은 두지 않습니다 — 같은 값을 낸 곳끼리 공평해야 합니다.</li>
        </ul>
      </div>

      <p className="sup-file-n">
        정하는 것은 약관입니다. 이 쪽과 어긋나면 약관이 맞습니다.{" "}
        <Link href="/support/terms">이용약관 ›</Link>{" "}
        <Link href="/support/privacy">개인정보처리방침 ›</Link>
      </p>
    </InfoShell>
  );
}
