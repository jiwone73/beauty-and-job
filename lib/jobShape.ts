import { jobCompanyName } from "@/lib/companyName";
import { formatSalaryWon } from "@/lib/salary";
import { composeCompanyAddress } from "@/lib/address";

// API 가 준 한 건을 화면이 쓰는 모양으로 옮긴다. 서버에서 미리 그릴 때와
// 브라우저가 다시 받아 올 때가 같은 함수를 써야 화면이 갈라지지 않는다.
export function 공고모양(j: any) {
  return {
        id: j.id,
        isExternal: j.is_external || false,
        applyMethod: j.apply_method || 'NATIVE',
        externalApplyUrl: j.external_apply_url || '',
        sourceUrl: j.source_url || '',
        companyId: j.company?.id || '',
        brand: jobCompanyName(j.company_type || j.job_type, j.company?.company_name, j.company?.brand_name),
        brandDesc: j.company?.description || '',
        tags: [],
        title: j.title,
        jobType: j.job_type === 'OFFICE' ? '본사' : '매장',
        career: j.experience_level === 'NEW' ? '신입' : j.experience_level === 'EXPERIENCED' ? '경력' : '',
        education: j.education || '',
        jobCategories: Array.isArray(j.categories) ? j.categories : [],
        region: j.location || '',
        // 고용형태: 저장된 employment_type(비회원 자유입력 포함) 우선, 없으면 work_type 매핑
        employType: j.employment_type || '',
        headcount: j.headcount_text || (j.headcount ? `${j.headcount}명` : ''),
        genderPref: j.gender_preference || '',
        deadline: j.deadline ? String(j.deadline).slice(0, 10).replace(/-/g, '.') : '상시채용',
        positions: Array.isArray(j.positions) ? j.positions : [],
        // 이 공고에 따로 등록한 근무지들(지점이 여럿인 매장). 본 주소 말고 더 있을 때만 찬다.
        workLocations: Array.isArray(j.work_locations) ? j.work_locations : [],
        salary: j.salary_text || (((j.salary_max && j.salary_max > j.salary_min)
          ? `${formatSalaryWon(j.salary_min, j.salary_type)} ~ ${formatSalaryWon(j.salary_max, j.salary_type).replace(/^[^0-9]*/, '')}`
          : formatSalaryWon(j.salary_min, j.salary_type)) || ''),
        color: '#f7f7f8',
        description: j.description || '',
        requirements: j.requirements ? j.requirements.split('\n').filter(Boolean) : [],
        preferreds: j.preferred_qualifications ? j.preferred_qualifications.split('\n').filter(Boolean) : [],
        benefits: (Array.isArray(j.benefit_tags) && j.benefit_tags.length) ? j.benefit_tags : (j.benefits ? j.benefits.split('\n').filter(Boolean) : []),
        responsibilities: j.responsibilities ? String(j.responsibilities).split('\n').filter(Boolean) : [],
        process: j.hiring_process || [],
        notes: j.notes || '',
        logo_url: j.company?.logo_url,
        // 공고에 지정한 상단 이미지가 있으면 그걸 쓰고, 없으면(null) 기업정보 커버로 폴백.
        //   공고에서 지운 경우엔 빈 배열이 와서 상단 이미지 없이 표시된다(기업정보는 그대로).
        cover_images: Array.isArray(j.cover_images) ? j.cover_images : (j.company?.cover_images || []),
        detailImages: j.detail_images || [],
        workPeriodText: j.work_period || "",
        workDaysText: j.work_days === "협의" ? "요일 협의" : (j.work_days ? String(j.work_days).split(",").join("·") : ""),
        workTimeText: j.work_time === "협의" ? "시간 협의" : (j.work_time || ""),
        // 관리자가 대신 올린 공고는 담당자 연락처를 내보내지 않고 지원 안내를
        // '뷰티워크 온라인지원' 하나로 낸다 — 등록 화면 미리보기와 같은 규칙이다.
        // 값은 DB에 그대로 남아 있다(나중에 그 번호로 연락해 회원가입을 권한다).
        contactName: j.is_external ? '' : (j.external_contact_name || ''),
        contactPhone: j.is_external ? '' : (j.external_contact_phone || ''),
        contactEmail: j.is_external ? '' : (j.external_contact_email || ''),
        contactKakao: j.is_external ? '' : (j.external_contact_kakao || ''),
        contactMethods: j.is_external ? ['뷰티워크 온라인지원'] : (Array.isArray(j.contact_methods) ? j.contact_methods : []),
        companyInfo: {
          name: j.company?.company_name || '',
          brandName: j.company?.brand_name || '',
          representative: j.company?.representative_name || '',
          companyType: j.company?.company_type === 'STORE' ? '매장' : j.company?.company_type === 'OFFICE' ? '본사' : '',
          industry: j.company?.industry || '',
          size: j.company?.company_size || '',
          founded: j.company?.founded_year || '',
          phone: j.company?.company_phone || '',
          website: j.company?.website_url || '',
          location: composeCompanyAddress(j.company?.region_sido, j.company?.region_sigungu, j.company?.address),
          latitude: j.company?.latitude ?? null,
          longitude: j.company?.longitude ?? null,
        },
        // 이 공고에 따로 적어 둔 근무지 주소가 있으면 그것을 쓴다. 지점이 여럿인
        // 매장이 지점별로 다른 주소로 공고를 낼 수 있어야 한다. 없으면 매장 주소.
        companyAddress: (j.address || "").trim()
          || composeCompanyAddress(j.company?.region_sido, j.company?.region_sigungu, j.company?.address),
      };
}
