import { redirect } from "next/navigation";

// 스크랩 인재는 채용제안 갈래로 옮겼다(2026-09-11). 옛 주소로 들어와도 길을 잃지 않게 보낸다.
export default function Page() {
  redirect("/company/dashboard/proposals/scrapped");
}
