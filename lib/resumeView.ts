// 이력서 응답을 ResumePreview 가 쓰는 모양으로 바꾼다.
//
// 인재 검색·스크랩 인재·지원자·보낸 제안 네 화면이 같은 이력서를 띄우는데, 같은
// 변환이 화면마다 따로 적혀 있었다. 이력서에 칸이 하나 늘 때 네 곳을 다 고쳐야 하고,
// 실제로는 한두 곳만 고치게 된다.
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
    officeJobAreas: p.office_job_areas || [],
    certificates: p.certificates || [],
    intro: p.intro || "",
    coreCompetencies: p.core_competencies || "",
    workTypePrefer: p.work_type_prefer || "",
    regionPrefer: p.region_prefer || "",
  };
}

/** 생년월일에서 나이. 이력서 머리줄에 「1990년 (36세, 여)」로 나가는 그 숫자다. */
export function calcAgeFromBirth(birth: string | null): number {
  if (!birth) return 0;
  const y = parseInt(String(birth).slice(0, 4));
  return new Date().getFullYear() - y;
}
