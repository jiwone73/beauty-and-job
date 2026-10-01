export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import { ok, err, requireAuth } from "@/lib/api";
import { 공고읽기 } from "@/lib/jobDetail";

// 공고·지원자 관리 화면의 "미리보기 모달" 전용 — 공개 상세(/api/jobs/[id])와 같은
// 모양을 쓰되, 조회수를 올리지 않는다(본인 공고를 열어볼 때마다 조회수가 오르면
// 안 된다). 본인 소유 공고인지도 여기서 확인한다.
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { auth, res: authErr } = requireAuth(req, "company");
  if (authErr) return authErr;

  const job = await 공고읽기(params.id);
  if (!job || job.company.id !== auth!.sub) {
    return err("JOB_001", "공고를 찾을 수 없습니다.", 404);
  }
  return ok(job);
}
