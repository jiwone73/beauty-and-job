import { shortenRegion } from "@/lib/memberFormat";
// 이력서 응답을 ResumePreview 가 쓰는 모양으로 바꾼다.
//
// 인재 검색·스크랩 인재·지원자·보낸 제안 네 화면이 같은 이력서를 띄우는데, 같은
// 변환이 화면마다 따로 적혀 있었다. 이력서에 칸이 하나 늘 때 네 곳을 다 고쳐야 하고,
// 실제로는 한두 곳만 고치게 된다.
/** 희망 근무지는 users.preferred_regions(배열)이 원본이다.
 *  user_profiles.region_prefer 는 옛 칸이라 거의 비어 있어, 그것만 보면
 *  이력서에서 이 줄이 통째로 사라진다. 화면마다 다른 자리에 실려 오므로
 *  올 만한 자리를 다 훑고, 없으면 옛 칸으로 물러선다. */
export function 희망지역글(data: any): string {
  const arr = data?.preferred_regions || data?.user?.preferred_regions || data?.resume?.preferred_regions;
  if (Array.isArray(arr) && arr.length > 0) {
    const 글 = arr
      .map((r: any) => shortenRegion([r?.sido, r?.sigungu].filter(Boolean).join(" ")))
      .filter(Boolean)
      .join(", ");
    if (글) return 글;
  }
  return data?.profile?.region_prefer || "";
}

export function mapResume(data: any) {
  const p = data?.profile || {};
  return {
    careers: (data?.careers || []).map((c: any) => ({
      id: String(c.id), company: c.company || "", department: c.department || "",
      position: c.position || "", startDate: c.start_date || "", endDate: c.end_date || "",
      isVerified: c.is_verified || false, description: c.description || "",
    })),
    educations: (data?.educations || []).map((e: any) => ({
      id: String(e.id), school: e.school || "", major: e.major || "",
      status: e.status || "", startDate: e.start_date || "", endDate: e.end_date || "",
      description: e.description || "",
    })),
    experiences: (data?.experiences || []).map((x: any) => ({
      id: String(x.id), category: x.category || "", title: x.title || "", description: x.description || "",
    })),
    languages: (data?.languages || []).map((l: any) => ({
      id: String(l.id), language: l.language || "", level: l.level || "", test: l.test || "",
    })),
    links: (data?.links || []).map((lk: any) => ({
      id: String(lk.id), category: lk.category || "", url: lk.url || "",
    })),
    skills: p.skills || [],
    skillAreas: p.skill_areas || [],
    // 본사 직군의 원본은 users.office_job_areas 다. user_profiles 쪽은 거의
    // 비어 있어, 그것만 보면 본사 인재의 희망직군 줄이 통째로 빠진다.
    officeJobAreas: (p.office_job_areas?.length ? p.office_job_areas : null)
      || data?.office_job_areas || data?.user?.office_job_areas || data?.resume?.office_job_areas || [],
    certificates: p.certificates || [],
    intro: p.intro || "",
    coreCompetencies: p.core_competencies || "",
    coverLetter: p.cover_letter || "",
    workTypePrefer: p.work_type_prefer || "",
    regionPrefer: 희망지역글(data),
    salaryType: p.salary_type || null,
    salaryMin: p.salary_min ? Number(p.salary_min) : null,
  };
}

/** 생년월일에서 나이. 이력서 머리줄에 「1990년 (36세, 여)」로 나가는 그 숫자다. */
export function calcAgeFromBirth(birth: string | null): number {
  if (!birth) return 0;
  const y = parseInt(String(birth).slice(0, 4));
  return new Date().getFullYear() - y;
}
