"use client";
import { forwardRef, type ReactNode } from "react";
import { 전형절차이름, 근무지이름, 담당자이름, 모집부문이름 } from "@/lib/constants";
import Link from "next/link";
import LazyMap from "@/components/jobs/LazyMap";
import BannerStrip from "@/components/jobs/BannerStrip";
import { 전화꼴 } from "@/lib/phoneFormat";
import { 시간표시줄들 } from "@/lib/shiftLines";
import { 급여펴기, 지원방법줄, 회사정보이름, 회사정보행들, 소개글이름 } from "@/lib/positionLine";
import { Briefcase, CheckCircle2, ChevronRight, Users, GraduationCap, MapPin, Send, Tag, FileText } from "lucide-react";

// 등록 화면에 적은 것만 내보낸다. '(협의)'·'상세요강 참조' 처럼 화면이 덧붙이던 말은
// 매장이 적은 적 없는 문구라, 두 화면을 나란히 놓으면 없던 말이 늘어나 보였다.

// 공고 상단 이미지 갤러리. 표시 규칙(한 칸 4:3 · 한 화면에 두 장)은 BannerStrip에 모아 두고,
// 기업정보 설정·공고 등록 미리보기에서도 같은 컴포넌트를 써 어디서나 같은 모양으로 보이게 한다.
export function ImageCarousel({ images, alt }: { images: string[]; alt?: string }) {
  return <BannerStrip images={images} alt={alt} />;
}

interface JobDetailViewProps {
  job: any;
  related?: any[];
  companyJobsCount?: number;
  onBrandClick?: () => void;
  asideAction?: ReactNode;
  // 등록폼의 "미리보기" 모달에서만 켠다. 실제 공개 페이지는 그대로 두고,
  // 미리보기의 기업정보만 폼에 없는 값(대표자·설립연도 등)을 걷어내
  // "폼에 없는 값이 미리보기엔 있다"는 어긋남을 없앤다.
  previewMode?: boolean;
}

/**
 * 채용공고 상세 본문(좌측 본문 + 우측 지원 카드).
 * 실제 상세 페이지와 등록/수정 미리보기에서 동일하게 사용한다.
 * 회사 정보는 공고 내용 아래에 인라인으로 표시(등록 시 입력한 값 그대로).
 */
const JobDetailView = forwardRef<HTMLDivElement, JobDetailViewProps>(function JobDetailView(
  { job, related = [], companyJobsCount = 0, onBrandClick, asideAction, previewMode = false },
  ref
) {
  const ci = job.companyInfo || {};
  const hasMap = (ci.latitude && ci.longitude) || job.companyAddress?.trim();
  // 매장 공고는 법인 정보(회사명·대표자·설립·규모)가 지원 판단에 쓸모가 없고, 주소는 근무지역과,
  // 브랜드명은 상단 제목과 그대로 겹친다. 그래서 매장은 소개글과 SNS만 남긴다.
  const isOfficeJob = job.jobType === "오피스";
  const linkCell = (url: string) => (
    <a key="w" href={/^https?:\/\//.test(url) ? url : `https://${url}`}
      target="_blank" rel="noreferrer" style={{ color: "#582681", wordBreak: "break-all" }}>{url}</a>
  );
  const companyRows: [string, ReactNode][] = [];
  if (previewMode) {
    // 등록폼에는 대표자·설립연도 같은 입력칸이 없다 — 미리보기에서만, 폼이
    // 실제로 다루는 값에 가까운 최소 항목으로 좁힌다("매장명·업종·주소·매장소개 /
    // 오피스는 회사명·업종·직원수·홈페이지·주소 정도"). 항목·순서는 폼 요약 카드와
    // 같은 회사정보행들() 하나에서 나온다 — 따로 적으면 다시 갈라진다.
    for (const [label, v] of 회사정보행들(ci.name, ci.industry, ci.location, isOfficeJob, ci.size, ci.website)) {
      if (!v) continue;
      companyRows.push([label, label === "홈페이지" ? linkCell(v) : v]);
    }
  } else if (isOfficeJob) {
    if (ci.name) companyRows.push(["회사명", ci.name]);
    if (ci.brandName) companyRows.push(["브랜드명", ci.brandName]);
    if (ci.industry) companyRows.push(["업종", ci.industry]);
    if (ci.representative) companyRows.push(["대표자", ci.representative]);
    if (ci.size) companyRows.push(["규모", ci.size]);
    if (ci.founded) companyRows.push(["설립", ci.founded]);
    if (ci.phone) companyRows.push(["대표번호", ci.phone]);
    if (ci.website) companyRows.push(["웹사이트", linkCell(ci.website)]);
    if (ci.location) companyRows.push(["주소", ci.location]);
  }
  // 매장 SNS(인스타 등)는 공개 화면에 걸지 않는다. 들어가면 DM·프로필에 번호가 있어
  // 상세요강에서 전화번호를 가린 뜻이 없어진다. 관리자는 등록 화면에서 볼 수 있다.
  const companySectionTitle = 회사정보이름(isOfficeJob);
  const hasCompanyInfo = job.brandDesc?.trim() || companyRows.length > 0;
  // 상세 이미지가 있으면 상세내용(텍스트) 섹션은 공개 화면에서 숨김(이미지로 대체). 데이터는 그대로 유지.
  const hasDetailImages = Array.isArray(job.detailImages) && job.detailImages.some((d: any) => d?.url);

  // 근무조건·근무지역은 '기본정보' 성격이라, 이미지형 공고에선 세로로 긴 상세이미지 "앞"에 먼저 노출한다.
  // (블록을 한 번만 정의하고 위치만 바꿔 끼운다 — 텍스트형 공고는 기존 순서 그대로.)
  const positions = Array.isArray(job.positions) ? job.positions.filter((p: any) => p && p.category) : [];
  // 모집부문 표 열 정의. 값이 아무 행에도 없는 열은 미리보기/상세에서 숨긴다(모집분야는 항상 표시).
  // 급여·근무요일/시간 표시 규칙은 폼·상세·제안 화면이 lib/positionLine.ts 하나를 같이 쓴다 —
  // 여기서 따로 다시 짜면(예전처럼) 셋이 서로 다른 말을 하게 된다.
  const posColDefs: { key: string; label: string; get: (p: any) => string }[] = [
    { key: "category", label: "모집분야", get: (p) => p.category },
    // 무엇을 몇 명 뽑는가 — 붙여 놓아야 한 번에 읽힌다.
    { key: "headcount", label: "인원", get: (p) => (!isOfficeJob && p.headcount ? `${String(p.headcount).replace(/명$/, "")}명` : "") },
    // 근무지가 여러 곳인 공고만 자리가 생긴다 — 한 곳이면 아무 행에도 값이 없어 열이 숨는다.
    { key: "location", label: "근무지", get: (p) => p.location },
    { key: "employment", label: "고용형태", get: (p) => p.employment },
    { key: "gender", label: "성별", get: (p) => p.gender },
    { key: "career", label: "경력/직책", get: (p) => p.career },
    { key: "education", label: "학력", get: (p) => (isOfficeJob ? p.education : "") },
    // shiftText(원티드식 자유 문장)로만 적은 공고는 workDays·workTime이 비어 있다 —
    // 폭 계산용 get도 실제로 보일 값(시간표시줄들)을 봐야 열이 너무 좁게 잡히지 않는다.
    { key: "shift", label: isOfficeJob ? "근무시간" : "근무요일/시간", get: (p) => {
        const 원문 = p.shiftText || [p.workDays, p.workTime].filter(Boolean).join(" ");
        return 원문 ? 시간표시줄들(원문).map((l) => l.글).join(" ") : "";
      } },
    { key: "salary", label: "급여", get: (p) => 급여펴기(p.salary) },
  ];
  // 값이 비어도 화면에는 "협의" 로 나가는 열(급여·근무요일/시간)은 숨기지 않는다.
  // 숨기면 등록 폼에는 있는 열이 미리보기에서 사라져, 무엇이 어떻게 보일지 대조할 수
  // 없게 된다. 나머지 열은 아무 행에도 값이 없으면 그대로 숨긴다.
  const ALWAYS = new Set(["category", "salary", "shift"]);
  const posCols = posColDefs.filter((c) => ALWAYS.has(c.key) || positions.some((p: any) => (c.get(p) || "").toString().trim()));
  // 칸 폭을 정해진 비율이 아니라 그 공고에 실제로 들어간 값의 글자 수로 재서
  // 나눈다("내용에 따른 균등분할") — 학력이 "초대졸 이상"처럼 길면 그만큼
  // 넓어지고, 급여가 "월 200~240"처럼 짧으면 그만큼 좁아진다. 근무요일/시간처럼
  // 줄바꿈되는 칸은 줄 하나의 길이만 따진다(합이 아니라). 값 하나가 유독 길어도
  // 그 칸이 나머지를 다 밀어내지 않도록 위쪽에 상한을 둔다(모집분야·급여·근무
  // 요일은 줄바꿈으로 받아 주니 좀 더 넉넉히).
  // 공백도 실제로는 폭을 차지한다(글자 한 칸의 절반쯤) — 다 지우면 "10시30분 ~ 20시30분"처럼
  // 공백이 늘어난 값의 폭이 실제보다 좁게 잡힌다.
  const posColLenOf = (s: string) => {
    let n = 0;
    for (const ch of s) n += /\s/.test(ch) ? 0.5 : 1;
    return n;
  };
  const POS_COL_CAP: Record<string, number> = { category: 22, salary: 14, shift: 16 };
  const posColWeights = posCols.map((c) => {
    let w = posColLenOf(c.label);
    positions.forEach((p: any) => {
      if (c.key === "shift") {
        const raw = p.shiftText || [p.workDays, p.workTime].filter(Boolean).join(" ");
        String(raw).split(/\n|\//).map((s: string) => s.trim()).filter(Boolean)
          .forEach((line: string) => { w = Math.max(w, posColLenOf(line)); });
      } else {
        w = Math.max(w, posColLenOf(String(c.get(p) || "")));
      }
    });
    return Math.min(w, POS_COL_CAP[c.key] || 10);
  });
  // 모집분야는 다른 칸보다 훨씬 자주 길다 — 다른 칸을 한 글자씩 덜어 그만큼을
  // 모집분야로 몰아준다(등록폼 표와 같은 규칙 — "미리보기는 아까랑 똑같은데").
  {
    let stolen = 0;
    posCols.forEach((c, i) => {
      if (c.key === "category") return;
      const take = Math.min(1, Math.max(0, posColWeights[i] - 2));
      posColWeights[i] -= take;
      stolen += take;
    });
    const catIdx = posCols.findIndex((c) => c.key === "category");
    if (catIdx >= 0) posColWeights[catIdx] += stolen;
  }
  // "근무요일 시간을 여백을 한글자 더 확보하고 모집분야에 1글자 줄여" — 모집분야에서
  // 한 글자만큼 도로 덜어 근무요일/시간에 준다.
  {
    const catIdx = posCols.findIndex((c) => c.key === "category");
    const shiftIdx = posCols.findIndex((c) => c.key === "shift");
    if (catIdx >= 0 && shiftIdx >= 0 && posColWeights[catIdx] > posColWeights[shiftIdx]) {
      posColWeights[catIdx] -= 1;
      posColWeights[shiftIdx] += 1;
    }
  }
  // 글자 수 비율 그대로 100%를 나누면, 화면이 넓을 때 근무요일/시간처럼 원래
  // 긴 칸이 남는 폭을 혼자 다 가져가 그 칸만 헐렁해 보였다("여백이 왜 이렇게
  // 많아 · 이 여백을 나눠쓰면 되잖아"). 평균 쪽으로 절반 당겨써 큰 칸이 가져갈
  // 몫 일부를 짧은 칸들에 나눠 준다 — 그래도 긴 값이 짧은 값보다는 더 갖는다.
  const posColAvgWeight = posColWeights.reduce((s, w) => s + w, 0) / (posColWeights.length || 1);
  const posColBlended = posColWeights.map((w) => w * 0.5 + posColAvgWeight * 0.5);
  const posColWeightTotal = posColBlended.reduce((s, w) => s + w, 0) || 1;
  // 비율(%)만으로 나누면 화면이 좁을 때 그 몫의 절댓값이 모자라 글자가 잘렸다
  // ("말줄임은 절대 나오면 안됨") — 칸마다 글자 수 기준 절대 픽셀 바닥을 먼저
  // 잡아 표 자체의 최소 폭(minWidth)으로 쓴다. 화면이 넓으면 표가 100%까지
  // 늘어나며 같은 비율 그대로 커지고, 좁으면 표가 가로 스크롤될지언정 칸은
  // 항상 바닥만큼은 확보된다. (예전에 있던 가로 스크롤을 원상복구 — "구겨
  // 넣기"로 바꿨던 것을 다시 되돌려 달라는 요청.)
  const posColMinWidth = posColBlended.reduce((sum, w) => sum + w * 13 + 6, 0);
  const positionsSection = positions.length > 0 ? (
    <div className="jd-subblock" key="positions">
      <h2 className="job-detail-subtitle" style={{ display: "flex", alignItems: "center", gap: 6 }}><Briefcase size={16} className="jd-subtitle-icon" style={{ color: "#555", flexShrink: 0 }} />모집부문</h2>
      {/* 표를 테두리로 감싼다. 칸 밑줄만 있으면 바로 아래 복리후생 줄까지 표의 한
          부분처럼 읽혀, 어디까지가 자리별 조건인지 알 수 없다. */}
      {/* 좁은 화면에서 표가 카드 폭보다 넓어지면 가로 스크롤이 되긴 하지만, 스크롤바가
          가늘어(OS 기본값) 안 보이면 표가 그냥 잘려 끝난 것처럼 보였다 — 스크롤바를
          늘 보이는 굵기로 그려 "더 있다"는 걸 알린다. */}
      <div className="jd-pos-scroll" style={{ overflowX: "auto", border: "1px solid #efeff1", borderRadius: 10 }}>
        {/* 모바일에서는 CSS(.jd-pos-table)가 이 폭·레이아웃 지정을 눌러 이기고
            table-layout:auto 로 바꾼다 — 칸마다 실제 내용 폭만큼만 차지해,
            짧은 값(모집분야·인원)이 남는 자리를 긴 값(고용형태)에 나눠 주는
            대신 그 자리로 다음 칸(급여)이 더 보인다("내용을 딱 채우는 정도로"). */}
        <table className="jd-pos-table" style={{ width: "100%", minWidth: posColMinWidth, tableLayout: "fixed", borderCollapse: "collapse", fontSize: 13.5, "--jd-cols": posCols.length } as React.CSSProperties}>
          <colgroup>
            {posCols.map((c, i) => <col key={c.key} className="jd-pos-col" style={{ width: `${(posColBlended[i] / posColWeightTotal) * 100}%` }} />)}
          </colgroup>
          <thead>
            <tr style={{ background: "#f7f7f8" }}>
              {posCols.map((c) => {
                const wrapCol = c.key === "category" || c.key === "salary" || c.key === "employment";
                return (
                  <th key={c.key} className="jd-pos-th" style={wrapCol ? { whiteSpace: "normal" } : undefined}>{c.key === "career" ? <>경력<span className="jd-pos-sub">/직책</span></> : c.label}</th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {positions.map((p: any, i: number) => (
              <tr key={i}>
                {posCols.map((c, j) => {
                  // 값은 있는데 회사가 표에서 '확정'을 골랐으면 그대로 노출한다.
                  // "hidden"(협의·금액 비공개)이면 값을 적어 뒀어도 "협의"만 보이고,
                  // "open"(협의·금액 제시)이면 금액 옆에 "협의"를 그대로 이어 적는다 —
                  // 폼의 급여 칸도 상자 안 한 줄로 "2,300만원 | 협의"이니, 여기서 줄을
                  // 따로 만들면 같은 값이 폼과 다른 모양으로 보인다.
                  const salaryNego = p.salaryNego === "open" && !!c.get(p) && c.get(p) !== "협의";
                  const salaryBase = p.salaryNego === "hidden" ? "협의"
                    : (c.get(p) || (p.salaryNego === "open" ? "협의" : "-"));
                  const salaryTxt = salaryNego ? `${salaryBase} 협의` : salaryBase;
                  const daysTxt = p.workDays || "";
                  const timeTxt = p.workTime || "";
                  // 요일마다 시간이 다르면("월·수·금은 이 시간, 화·목은 저 시간") 기본 한 벌
                  // 뒤로 추가 근무시간을 이어 붙인다.
                  const extraShifts = Array.isArray(p.extraShifts) ? p.extraShifts : [];
                  // shiftText — 원티드식 자유 문장("월, 수 10시-18시 / 금 12시-20시")으로 등록한
                  // 공고는 이 필드가 있다. 어느 줄에 "(협의)"를 붙일지는 공고 폼 카드와 똑같이
                  // lib/shiftLines.ts 하나로 정한다 — 폼에서 본 것과 실제 공고가 달라 보이면 안 된다.
                  const shiftLines = p.shiftText ? 시간표시줄들(String(p.shiftText)) : [];
                  const content = c.key === "shift"
                    ? (shiftLines.length
                        ? (shiftLines.length === 1 && shiftLines[0].글 === "협의" ? "협의"
                            : <>{shiftLines.map((l, i) => <div key={i}>{l.글}{l.협의 && <span className="jp-shift-nego-tag"> (협의)</span>}</div>)}</>)
                        : (p.workDays || p.workTime)
                        ? ((p.workDays === "협의" && p.workTime === "협의")
                            ? "협의"
                            : <>
                                {daysTxt && <div>{daysTxt}</div>}
                                {timeTxt && <div>{timeTxt}{p.shiftNego && <span className="jp-shift-nego-tag"> (협의)</span>}</div>}
                                {extraShifts.map((s: any, i: number) => (
                                  <div key={i}>{[s.days, s.time].filter(Boolean).join(" ")}{p.shiftNego && <span className="jp-shift-nego-tag"> (협의)</span>}</div>
                                ))}
                              </>)
                        : "-")
                    : c.key === "salary"
                      ? salaryTxt
                      : c.key === "employment" && String(c.get(p) || "").includes(",")
                        // 값이 둘 이상이면("정규직, 프리랜서") 값마다 span 으로 끊어 둔다 —
                        // PC 에서는 그대로 한 줄(inline), 모바일 CSS 가 한 줄에 하나씩 내린다.
                        ? String(c.get(p)).split(/\s*,\s*/).filter(Boolean).map((v: string, k: number, arr: string[]) => (
                            <span key={k} className="jd-emp-item">{v}{k < arr.length - 1 ? ", " : ""}</span>
                          ))
                        : (c.get(p) || "-");
                  // 모집분야·급여·고용형태(정규직, 프리랜서처럼 여러 개면)는 길어지면
                  // 여러 줄로 접힐 수 있어 줄바꿈을 열어 둔다(칸 폭은 colgroup+minWidth
                  // 가 이미 못박아 두었다). 나머지 칸은 한 줄(nowrap)로 — 표가 넓어지는
                  // 대신 칸이 들쭉날쭉해지지 않는다.
                  const wrapCol = c.key === "category" || c.key === "salary" || c.key === "employment";
                  return (
                    <td key={c.key} className="jd-pos-td" style={{ color: j === 0 ? "#555" : "#555" }}>
                      {wrapCol
                        ? <span className={c.key === "salary" ? "jd-pos-sal" : c.key === "category" ? "jd-pos-cat" : undefined} style={{ display: "block", whiteSpace: "normal", wordBreak: "keep-all" }}>{content}</span>
                        : content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* 복리후생을 모집부문과 같은 레벨(아이콘+제목)로 세운다 — 등록폼과 같은 인상.
          근무기간은 뺐다. 매장 공고는 대부분 상시 근무라 거의 비어 있었고, 그 반열이
          복리후생을 좁혀 태그가 여러 줄로 접혔다. */}
      {(job.benefits || []).length > 0 && (<>
      <h2 className="job-detail-subtitle" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 18 }}><Tag size={16} className="jd-subtitle-icon" style={{ color: "#555", flexShrink: 0 }} />복리후생</h2>
      <div style={{ fontSize: 13.5, color: "#555", lineHeight: 1.5 }}>{(job.benefits || []).join(", ")}</div>
      </>)}
    </div>
  ) : null;
  // 모집부문 표가 있으면 근무기간·복리후생은 표 아래로 합쳐 넣으므로, 여기는 표가 없는 옛 공고에서만 선다.
  // 제목은 폼과 같은 말을 쓴다 — 예전에는 「근무 조건」이라 적었는데 등록 화면에 없는 말이었다.
  // 담을 값이 하나도 없으면 아예 세우지 않는다 — 빈 칸을 '협의'로 채우던 자리다.
  const 근무조건줄: [string, string][] = positions.length === 0
    ? ([
        ["고용형태", job.employType || ""],
        ["근무요일", job.workDaysText || ""],
        ["근무시간", job.workTimeText || ""],
        ["복리후생", (job.benefits || []).join(", ")],
      ] as [string, string][])
    : [];
  const workCondSection = 근무조건줄.some(([, v]) => v.trim()) ? (
    <div className="jd-subblock" key="workcond">
      <h2 className="job-detail-subtitle">{모집부문이름}</h2>
      <div className="job-detail-company-info">
        {근무조건줄.map(([k, v]) => (
          <div key={k} className="job-detail-company-row" style={k === "복리후생" ? { alignItems: "flex-start" } : undefined}>
            <span className="job-detail-company-label">{k}</span>
            <span>{v.trim() || "-"}</span>
          </div>
        ))}
      </div>
    </div>
  ) : null;

  const locationSection = hasMap ? (
    <div className="jd-subblock" key="location">
      <h2 className="job-detail-subtitle" style={{ display: "flex", alignItems: "center", gap: 6 }}><MapPin size={16} className="jd-subtitle-icon" style={{ color: "#555", flexShrink: 0 }} />{근무지이름}</h2>
      {/* 근무지가 여럿이면 다 적는다. 폼의 「근무지 추가」로 넣은 지점이 여태
          지원 창에서 고를 때만 보여, 폼과 공고가 갈렸다. 지도는 첫 주소로 그린다. */}
      {[job.companyAddress, ...(((job as any).workLocations || []) as any[])
          .map((l) => [l?.address, l?.detail].filter(Boolean).join(" "))]
        .map((a) => String(a || "").trim()).filter(Boolean)
        .filter((a, i, all) => all.indexOf(a) === i)
        .map((a, i, all) => (
          <p key={a} className="job-detail-desc" style={{ marginBottom: i === all.length - 1 ? "12px" : "4px" }}>{a}</p>
        ))}
      <LazyMap latitude={ci.latitude} longitude={ci.longitude} address={job.companyAddress} name={ci.name} height={280} />
    </div>
  ) : null;

  // 등록 폼은 전형절차 · 지원 안내 · 담당자 정보를 서로 다른 세 섹션(제 제목 하나씩)으로
  // 둔다. 미리보기가 이 셋을 "지원 안내" 하나로 뭉쳐 보여줬던 것이 "폼과 다르다"는
  // 지적의 뿌리였다 — 제목 개수·순서부터 폼과 맞춘다(전형절차 → 지원 안내 → 담당자 정보).
  const hasContact = !!(job.contactPhone || job.contactEmail || job.contactKakao);
  const hasMethods = !!(job.contactMethods?.length);
  const hasProcess = !!(job.process?.length > 0);

  // 담당자 정보 — 섹션 제목이 이미 「담당자 정보」라고 말하니, 안에서 이름을 또
  // 적지 않는다(폼도 섹션 제목 하나뿐, 안쪽엔 담당자·전화번호·이메일·카카오톡 낱값뿐).
  const contactSection = hasContact ? (
    <div className="jd-subblock" key="contact">
      <h2 className="job-detail-subtitle">{담당자이름}</h2>
      <p className="job-detail-desc" style={{ margin: 0 }}>
        {[job.contactName || "인사담당", 전화꼴(job.contactPhone), job.contactEmail,
          job.contactKakao ? `카카오톡 ${job.contactKakao}` : ""].filter(Boolean).join("   ·   ")}
      </p>
    </div>
  ) : null;

  // 전형절차도 제 섹션이다(폼과 같다) — 지원 안내 밑이 아니라 위, 폼과 같은 자리다.
  const processSection = hasProcess ? (
    <div className="jd-subblock" key="process">
      <h2 className="job-detail-subtitle">{전형절차이름}</h2>
      <p className="job-detail-desc" style={{ margin: 0 }}>{job.process.join("   →   ")}</p>
    </div>
  ) : null;

  /* 지원방법 · 마감일은 이름표 위, 값 아래(한 칸 들여씀)로 — 폼의 지원 안내 칸과
     같은 모양이다. 옆에 나란히 두면(jd-guide-row) 2열로 짝지었을 때 반 폭에서
     값이 어중간하게 꺾여 접혔다("온라인 지 / 원"). */
  const methodsInner = hasMethods ? (
    <div className="jd-guide-stack">
      <div className="jd-guide-stack-label">지원방법</div>
      <div className="jd-guide-stack-value">{지원방법줄(job.contactMethods)}</div>
    </div>
  ) : null;

  const deadlineInner = job.deadline ? (
    <div className="jd-guide-stack">
      <div className="jd-guide-stack-label">마감일</div>
      {/* 폼과 같은 글자("~ 2026.10.12", 물결 뒤 띄어쓰기) — job.deadline 은 이미
          lib/jobShape.ts 에서 점(.) 표기로 바뀌어 들어온다. */}
      <div className="jd-guide-stack-value">{job.deadline === "상시채용" ? "상시채용" : `~ ${job.deadline}`}</div>
    </div>
  ) : null;

  // 지원 안내 — 폼과 같이 지원방법·마감일 둘만 담는다(담당자·전형절차는 각자 제 섹션으로 뺐다).
  const applyGuideBlock = (hasMethods || job.deadline) ? (
    <div className="jd-subblock" key="apply-guide">
      <h2 className="job-detail-subtitle">지원 안내</h2>
      {/* 지원방법 · 마감일 2열 — 공고 폼의 「지원 안내」와 같은 짝, 같은 자리다(폼도 폰에서
          세로로 안 쌓고 2열로 둔다). jd-guide-2col 은 jd-2col 과 달리 좁은 화면에서도
          접히지 않는다 — 폼이 접지 않으면 여기도 접지 않는다. */}
      <div className="jd-guide-2col">
        <div>{methodsInner}</div>
        <div>{deadlineInner}</div>
      </div>
    </div>
  ) : null;

  return (
    <div className="job-detail-layout" ref={ref}>
      {/* 왼쪽: 공고 본문 */}
      <main className="job-detail-main">
        {/* 상단 배너: 커버 이미지만(상세 이미지는 본문에 세로 스택으로 별도 표시). */}
        {(() => {
          const coverUrls = [...new Set(
            (Array.isArray(job.cover_images) ? job.cover_images.map((c: any) => c?.url) : []).filter(Boolean)
          )] as string[];
          const hasDetail = Array.isArray(job.detailImages) && job.detailImages.some((d: any) => d?.url);
          // 배너: 한 화면에 두 장. 폰은 손으로 밀고, 마우스 화면은 좌우 화살표(BannerStrip).
          if (coverUrls.length) {
            return (
              <div style={{ width: "100%", marginBottom: 4 }}>
                <ImageCarousel images={coverUrls} alt={job.brand} />
              </div>
            );
          }
          // 배너는 없지만 상세 이미지가 본문을 채우면 상단 히어로 생략.
          if (hasDetail) return null;
          return (
            <div className="job-detail-hero" style={{ background: job.color }}>
              <div className="job-detail-hero-placeholder">
                <span>{job.brand?.[0] || "·"}</span>
              </div>
              <div className="job-detail-hero-logo">
                {job.logo_url ? (
                  <img src={job.logo_url} alt={`${job.brand} 로고`} />
                ) : (
                  <span style={{ fontSize: 22, fontWeight: 800, color: "#582681" }}>
                    {job.brand?.[0] || "·"}
                  </span>
                )}
              </div>
            </div>
          );
        })()}

        {/* 기본정보: 등록 폼과 동일하게 본문에 항상 노출(채용분야·경력·모집·마감일) */}
        <div className="job-detail-info-box jd-show">
          <div className="job-detail-brand-row">
            <span
              className="job-detail-brand"
              style={{ cursor: onBrandClick ? "pointer" : "default" }}
              onClick={() => onBrandClick?.()}
            >
              {job.brand}
            </span>
            {job.tags?.map((tag: string) => (
              <span key={tag} className="job-detail-tag">· {tag}</span>
            ))}
          </div>
          <h1 className="job-detail-title">{job.title}</h1>

          <div className="job-detail-meta-grid">
            {/* 모집부문 표가 있으면 모집분야는 거기 자리별로 적혀 있다. 위에 또 적으면
                같은 말이 한 화면에 두 번 나오고, 자리마다 다른 값을 하나로 뭉뚱그리게
                된다. 표가 없는 공고에서만 남긴다(그때는 여기 말고 볼 곳이 없다). */}
            {job.jobCategories?.length > 0 && positions.length === 0 && (
              <div className="job-detail-meta-item">
                <span className="job-detail-meta-label">모집분야</span>
                <span className="job-detail-meta-value">{job.jobCategories.join(", ")}</span>
              </div>
            )}
            {job.career && positions.length === 0 && (
              <div className="job-detail-meta-item">
                <Briefcase size={16} className="job-detail-meta-icon" />
                <span className="job-detail-meta-label">경력</span>
                <span className="job-detail-meta-value">{job.career}</span>
              </div>
            )}
            {job.education && positions.length === 0 && (
              <div className="job-detail-meta-item">
                <GraduationCap size={16} className="job-detail-meta-icon" />
                <span className="job-detail-meta-label">학력</span>
                <span className="job-detail-meta-value">{job.education}</span>
              </div>
            )}
            {job.headcount && positions.length === 0 && (
              <div className="job-detail-meta-item">
                <Users size={16} className="job-detail-meta-icon" />
                <span className="job-detail-meta-label">모집인원</span>
                <span className="job-detail-meta-value">{job.headcount}</span>
              </div>
            )}
            {/* 성별우대는 모집부문 표에만 둔다. 여기에도 있으면 한 화면에 두 번 나오고,
                자리마다 다를 수 있는 값을 하나로 뭉뚱그려 보여주게 된다.
                (경력·학력·인원은 표가 없을 때만 나오는데 이 항목만 그 조건이 빠져 있었다.) */}
            {/* 마감일은 지원 안내로 옮겼다 — 언제까지 받는지는 어떻게 받는지와 한 덩어리다. */}
          </div>

          {/* 근무조건·근무지역·복리후생·채용담당자·채용절차를 기본정보 카드 안에 통합(빈 값 자동 숨김) */}
          {positionsSection}
          {workCondSection}
          {locationSection}
          {/* 폼과 같은 순서: 전형절차 → 지원 안내 → 담당자 정보. */}
          {processSection}
          {applyGuideBlock}
          {contactSection}
        </div>


        {/* 상세 내용 — 이미지형이면 상세요강(이미지) + 자유서술, 아니면 텍스트 항목(포지션 소개·자격요건·우대사항·주요업무) */}
        {hasDetailImages ? (
          (() => {
            const detailUrls = [...new Set(
              (Array.isArray(job.detailImages) ? job.detailImages.map((d: any) => d?.url) : []).filter(Boolean)
            )] as string[];
            if (!detailUrls.length) return null;
            return (
              <section className="job-detail-section" style={{ padding: 0, overflow: "hidden" }}>
                <h2 className="job-detail-section-title jd-detail-img-title jd-detail-title" style={{ padding: "24px 24px 0", marginBottom: 16 }}><FileText size={16} className="jd-detail-title-ic" />상세요강</h2>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {detailUrls.map((u, i) => (
                    <img key={i} src={u} alt={`상세 이미지 ${i + 1}`} style={{ display: "block", width: "100%", height: "auto" }} />
                  ))}
                </div>
                {job.description?.trim() && (
                  <p className="job-detail-desc jd-detail-img-desc" style={{ padding: "18px 24px 0", margin: 0 }}>{job.description.trim()}</p>
                )}
              </section>
            );
          })()
        ) : (<>
          {/* 상세요강 — 매장 공고는 원문을 통째로 담아서 "소개"가 아니라 요강 전체다. */}
          {job.description?.trim() && (
            <section className="job-detail-section">
              <h2 className="job-detail-section-title jd-detail-title"><FileText size={16} className="jd-detail-title-ic" />상세요강</h2>
              <p className="job-detail-desc">{job.description.trim()}</p>
            </section>
          )}

          {/* 자격 요건·우대 사항·주요 업무는 섹션으로 세우지 않는다.
              등록폼이 이 셋을 상세요강 하나로 합친 뒤로, 폼에서는 보이지도 고치지도
              못하는 글이 공고에만 따로 서 있었다. 이제 공고모양()에서 상세요강으로
              합쳐 들어온다 — 값이 사라지는 게 아니라 폼과 같은 자리에 실린다. */}
        </>)}

        {/* 기업 정보 (공고 내용 아래) */}
        {hasCompanyInfo && (
          <section className="job-detail-section">
            {/* 상세요강 제목과 같은 스타일(jd-detail-title) — 안 그러면 이 제목만 기본값
                (17px·700)으로 남아 상세요강(16px·#555·600)과 서로 다르게 보였다. */}
            <h2 className="job-detail-section-title jd-detail-title">{companySectionTitle}</h2>
            {/* 폼은 매장명·업종·주소를 먼저 적고 매장정보(소개)를 맨 아래 마지막 칸으로
                둔다. 여기서 소개글을 표 "위"에 먼저 그렸더니 같은 정보인데 폼과
                미리보기가 다른 순서로 보였다 — 표를 먼저, 소개글을 그 아래로. */}
            {companyRows.length > 0 && (
              <div className="job-detail-company-info">
                {companyRows.map(([label, val], i) => (
                  <div key={i} className="job-detail-company-row"
                    style={label === "웹사이트" || label === "매장 SNS" || label === "주소" ? { gridColumn: "1 / -1" } : undefined}>
                    <span className="job-detail-company-label">{label}</span>
                    <span>{val}</span>
                  </div>
                ))}
              </div>
            )}
            {job.brandDesc?.trim() && (
              <div style={{ marginTop: companyRows.length ? "16px" : 0 }}>
                {/* 폼은 이 글도 매장명·업종·주소와 같은 이름표 붙은 줄 하나다. 이름표는 섹션
                    이름("매장정보")이 아니라 매장정보 설정 페이지 안의 그 칸 이름("매장 소개")
                    이다 — 섹션 이름을 그대로 붙이면 매장정보 페이지에서 이 칸을 찾는 사람에게
                    다른 이름으로 읽힌다. */}
                <span className="job-detail-company-label">{소개글이름(isOfficeJob)}</span>
                <p className="job-detail-brand-desc" style={{ whiteSpace: "pre-line", margin: "3px 0 0" }}>{job.brandDesc}</p>
              </div>
            )}
          </section>
        )}

        {/* 이 회사의 다른 공고 */}
        {companyJobsCount > 0 && job.brand && (
          <section className="job-detail-section">
            {/* 매장명은 "리안헤어 광명점"처럼 지점까지 붙어 있어 그대로 검색하면 이 지점만 잡힌다.
                지점 표기를 뗀 앞부분(브랜드)으로 검색해 다른 지점 공고까지 보이게 한다. */}
            <Link href={`/jobs?q=${encodeURIComponent(isOfficeJob ? job.brand : job.brand.replace(/\s*\S*(?:점|지점|支店)$/, "").trim() || job.brand)}`} className="job-detail-more-link">
              <span>{job.brand}의 다른 채용공고<span className="job-detail-more-sub">{companyJobsCount}건</span></span>
              <ChevronRight size={20} />
            </Link>
          </section>
        )}
        {/* 관련 공고 */}
        {related.length > 0 && (
          <section className="job-detail-section">
            <Link href={`/jobs?type=${job.jobType === "오피스" ? "오피스" : "매장"}`} className="job-detail-more-link">
              <span>관련 채용공고<span className="job-detail-more-sub">비슷한 포지션 더보기</span></span>
              <ChevronRight size={20} />
            </Link>
          </section>
        )}
      </main>

      {/* 오른쪽: 지원하기 사이드바 (PC) */}
      <aside className="job-detail-aside">
        {/* 카드는 지원 버튼과 스크랩·공유만 든다. 매장명·공고명·모집분야·급여·
            마감은 바로 왼쪽 본문 머리에 그대로 있다 — 한 화면에서 같은 말을 두 번
            하면 카드만 길어지고 정작 누를 것이 아래로 밀린다. */}
        <div className="job-detail-aside-card">
          {asideAction}
        </div>
      </aside>
    </div>
  );
});

export default JobDetailView;
