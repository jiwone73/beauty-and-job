// 원문에 근거가 없는 값을 걷어낸다.
//
// 프롬프트에 "글에 없으면 빈 값으로 두라"고 적어 두었지만, 작은 모델일수록
// 그 말을 안 듣고 그럴듯한 값을 채운다(실측: 성별 언급이 없는 공고에 "무관",
// 고용형태 언급이 없는 공고에 "프리랜서"). 지원자는 그 값을 사실로 믿는다.
//
// 그래서 말로 시키는 대신 코드로 막는다. 값을 만들어 붙이지는 않고
// 근거 없는 것을 지우기만 하므로, 맞는 값이 사라질 일은 없다.
//
// ※ 그림(포스터)을 함께 읽힌 경우엔 쓰지 않는다. 근거가 글이 아니라 그림에
//   있을 수 있어서, 여기서 지우면 애써 읽은 값을 도로 버리게 된다.

/** 고용형태별로 원문에 있어야 할 말 */
const EMPLOYMENT_EVIDENCE: Record<string, RegExp> = {
  정규직: /정규직/,
  계약직: /계약직/,
  위촉직: /위촉/,
  프리랜서: /프리랜서|프리\s*랜서|3\.3\s*%|사업\s*소득/,
  인턴: /인턴/,
  아르바이트: /알바|아르바이트|파트\s*타임|단기/,
  스페어: /스페어|스패어/,
  // "협의"는 조건을 정하지 않았다는 뜻이라 근거를 따지지 않는다.
};

// 성별을 "우대·제한"으로 말한 자리만 근거로 본다.
// 미용실 글에는 "여성 고객", "여성 전용" 같은 말이 흔해서, 낱말만 보면
// 손님 얘기를 채용 조건으로 잘못 읽는다.
const GENDER_EVIDENCE =
  /성별|남녀|여(?:성|자)\s*(?:우대|만|분\s*만|직원|선생님|디자이너)|남(?:성|자)\s*(?:우대|만|분\s*만|직원|선생님|디자이너)|여직원|남직원/;

const EDUCATION_EVIDENCE = /학력|고졸|초대졸|대졸|석사|박사|전문학사|졸업|학위/;

const CAREER_EVIDENCE = /경력|신입|초보|무관|년\s*차|\d\s*년|개월|숙련|주니어|시니어/;

/**
 * 원문에 근거가 없는 항목을 빈 값으로 되돌린다.
 * src 에는 붙여넣은 글·페이지 텍스트·모델이 옮겨 적은 본문을 모두 넣는다.
 */
export function dropUnsupported(out: any, src: string): string[] {
  const dropped: string[] = [];
  const clear = (key: string, label: string) => {
    if (!out[key]) return;
    dropped.push(`${label}="${out[key]}"`);
    out[key] = "";
  };

  if (out.gender_preference && !GENDER_EVIDENCE.test(src)) clear("gender_preference", "성별우대");
  if (out.education && !EDUCATION_EVIDENCE.test(src)) clear("education", "학력");
  if (out.career && !CAREER_EVIDENCE.test(src)) clear("career", "경력");

  const emp = String(out.employment_type || "");
  const need = EMPLOYMENT_EVIDENCE[emp];
  if (emp && need && !need.test(src)) clear("employment_type", "고용형태");

  return dropped;
}
