import { redirect } from "next/navigation";

// 광고·제휴·기타로 나뉘어 있던 문의를 사업문의 하나로 합쳤다. 옛 주소로 들어와도
// 새 화면으로 보낸다 — 어딘가에 남아 있을 링크(광고주 메일 등)가 끊기지 않게.
export default function AdvertisePage() {
  redirect("/about/business");
}
