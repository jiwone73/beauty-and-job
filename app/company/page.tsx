export const dynamic = "force-dynamic";

import CompanyServiceView from "@/components/company/CompanyServiceView";
import { 기업이벤트읽기 } from "@/lib/companyEvent.server";

/**
 * 기업 서비스 소개.
 *
 * 이벤트 여부를 서버에서 정해 내려준다. 브라우저에서 받아 오던 때는 첫 칠에
 * 원래 배너와 원래 제목이 그려졌다가 잠시 뒤 이벤트 것으로 갈렸다 — 보는
 * 사람에게는 그것이 깜빡임이다.
 */
export default async function CompanyServicePage() {
  const 이벤트 = await 기업이벤트읽기();
  return <CompanyServiceView 이벤트={이벤트} />;
}
