"use client";
import InfoShell from "@/components/InfoShell";
import { 보관표기 } from "@/lib/companyPlans";

/**
 * 상품 환불정책 — 회원관리정책(/support/policy)에서 분리한 별도 페이지(2026-09-22).
 * 문구는 기존 규칙을 합니다체로만 바꾼 것 — 게시 전 법무·사업 검토가 남은
 * 4가지 사항은 pre-launch-paywall-checklist 메모리 참고.
 */
export default function PolicyRefundPage() {
  return (
    <InfoShell active="/support/policy/refund" title="상품 환불정책">
      <div className="info-section">
        <dl className="pol-list">
          <div>
            <dt>이용 전 취소 시 전액 환불</dt>
            <dd>이용권이 적용(입금 확인)되기 전에 취소하는 경우, 특별한 사유가 없는 한 결제 금액 전액을 환불합니다.</dd>
          </div>
          <div>
            <dt>이용 개시 후 원칙적 환불 불가</dt>
            <dd>이용권이 적용되면 서비스 제공이 개시된 것으로 봅니다. 신청 화면에서 이 점을 사전에 고지하고 동의를 받습니다.</dd>
          </div>
          <div>
            <dt>환불 대신 잔여기간 보관 가능</dt>
            <dd>
              게시 중인 공고를 모두 마감하고 「남은 기간 보관하기」를 선택하면,
              보관일로부터 {보관표기} 이내에 <b>동일 상품</b>을 재결제하는 경우
              해당 기간을 합산합니다. 다른 상품에는 사용할 수 없으며, {보관표기}이 경과하면 소멸합니다.
            </dd>
          </div>
          <div>
            <dt>회사 귀책사유에 따른 환불</dt>
            <dd>
              운영자의 책임 있는 사유로 서비스를 제공하지 못한 경우,
              이용기간을 연장하거나 환불합니다. 환불은 결제하신 방법과
              동일한 방법으로 하며, 이것이 어려운 경우 다른 방법을 협의합니다.
              환불 계좌의 예금주는 사업자등록증상 대표자 이름과 같아야 하며,
              그 외 명의의 계좌로는 환불해 드리지 않습니다.
            </dd>
          </div>
          <div>
            <dt>회원 귀책사유에 따른 이용제한 시 환불 불가</dt>
            <dd>허위·불법 게시물 등 약관 위반으로 서비스 이용이 제한되는 경우, 이는 회원의 귀책사유이므로 환불 대상에서 제외됩니다.</dd>
          </div>
        </dl>
        <ul className="pi-warn">
          <li>추가로 납부하신 금액이 있는 경우 이를 반환하며, 미납한 요금이 있는 경우 관계 법령이 허용하는 범위에서 환불금과 상계합니다.</li>
          <li>이용권 사용 중 다른 상품을 결제하는 경우, 새 상품은 결제 확인일부터 적용되며 기존 이용권의 잔여기간은 해당 상품으로 보관됩니다.</li>
        </ul>
        <p className="pol-src">이용약관 제13조(유료서비스의 청약철회 및 환불)</p>
      </div>
    </InfoShell>
  );
}
