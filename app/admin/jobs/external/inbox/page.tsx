import { redirect } from "next/navigation";

// 외부 지원 인박스는 회원관리 > 비회원 기업 화면으로 통합됨.
export default function ExternalInboxRedirect() {
  redirect("/admin/members/companies?tab=external&view=apps");
}
