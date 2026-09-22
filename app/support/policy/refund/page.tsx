import type { Metadata } from "next";
import PolicyRefundClient from "./PolicyRefundClient";

export const metadata: Metadata = {
  title: "상품 환불정책 | 뷰티워크",
  description: "뷰티워크 유료 상품의 환불 조건과 절차를 안내합니다.",
  alternates: { canonical: "/support/policy/refund" },
};

export default function PolicyRefundPage() {
  return <PolicyRefundClient />;
}
