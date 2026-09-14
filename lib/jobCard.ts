import { jobCompanyName } from "@/lib/companyName";
import { formatDeadline, expLevelLabel } from "@/lib/jobFormat";

/**
 * 공고 한 건을 카드가 읽는 모양으로 옮긴다.
 *
 * 메인의 여러 자리(적극 채용 중·추천·채용관)가 같은 카드를 쓰는데, 옮기는
 * 규칙을 화면마다 적어 두면 한 곳을 고칠 때 나머지가 남는다.
 */
export function mapJob(j: any) {
  return {
    id: j.id,
    title: j.title,
    company: jobCompanyName(j.company_type || j.job_type, j.company_name, j.brand_name),
    region: j.location || "협의",
    career: expLevelLabel(j.experience_level),
    employment: j.employment_type || null,
    deadline: formatDeadline(j.deadline),
    categories: j.categories || [],
    jobType: j.company_type || j.job_type || null,
    // 채용공고 목록과 같은 차례 — 매장이 목록용으로 직접 고른 프로필 사진이 먼저다.
    image: j.signboard_url || (Array.isArray(j.cover_images) && j.cover_images[0]?.url) || j.logo_url || (Array.isArray(j.detail_images) && j.detail_images[0]?.url) || null,
  };
}
