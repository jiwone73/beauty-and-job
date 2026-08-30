import { 공고읽기 } from "@/lib/jobDetail";
import JobDetailClient from "./JobDetailClient";

// 공고를 서버에서 읽어 HTML 에 실어 보낸다. 예전에는 껍데기만 보내고 브라우저가
// JS 를 다 받아 붙인 뒤에야 공고를 요청해서, 새 탭으로 열면(관리자 목록에서
// 공고명을 누르면 늘 새 탭이다) 몇 초씩 '불러오는 중'만 떠 있었다.
export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  // 못 읽어도 화면은 띄운다 — 브라우저가 한 번 더 물어보고 없으면 안내를 낸다.
  const 미리 = await 공고읽기(params.id).catch(() => null);
  return <JobDetailClient 미리={미리} />;
}
