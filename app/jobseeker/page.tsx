import { redirect } from "next/navigation";

// 오픈 이벤트 랜딩은 런칭 전까지 비활성화 — 이력서 등록 플로우로 바로 연결
// (로그인 안 된 경우 이력서 페이지가 /login 으로 자동 안내)
export default function JobSeekerPage() {
  redirect("/profile/resume");
}
