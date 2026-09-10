export const dynamic = "force-dynamic";
// 공고를 스무 건까지 받아 읽는다 — 기본 제한(10초)으로는 끊긴다.
export const maxDuration = 60;
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { parseStructured } from "@/lib/external/parsers/structured";

/** 목록 주소 하나로 여러 건을 임시저장에 넣는다.
 *
 *  알바가 공고를 한 건씩 열어 주소를 옮겨 붙이던 일을 없앤다. 목록에서 공고
 *  주소를 전부 뽑아 하나씩 읽고, 우리 직군에 맞는 것만 임시저장으로 담는다.
 *
 *  바로 발행하지 않는다. 잘못 읽은 값이 그대로 공고로 나가면 되돌릴 데가 없다 —
 *  임시저장으로 쌓아 두면 목록에서 한눈에 훑고 이상한 것만 고쳐 발행하면 된다.
 */

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

async function 받아오기(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" },
    redirect: "follow",
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.text();
}

/** 고용24 목록에서 공고 번호를 뽑는다. 목록 화면이 바뀌어도 주소 모양은 같다. */
function 공고번호들(html: string): string[] {
  return [...new Set([...html.matchAll(/wantedAuthNo=([A-Z0-9]{10,})/g)].map((m) => m[1]))];
}

const 상세주소 = (no: string) =>
  `https://www.work24.go.kr/wk/a/b/1500/empDetailAuthView.do?wantedAuthNo=${no}&infoTypeCd=VALIDATION&infoTypeGroup=tb_workinfoworknet`;

export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;

  const b = await req.json().catch(() => ({} as any));
  const 넣은글 = String(b.url || "").trim();
  // 한 번에 너무 많이 부르면 상대 사이트에도 무리고, 잘못 읽었을 때 치우기도 어렵다.
  const 최대 = Math.min(Math.max(Number(b.limit) || 20, 1), 40);
  if (!/work24\.go\.kr/i.test(넣은글)) {
    return err("BULK_001", "고용24 주소를 넣어주세요.", 400);
  }

  // 넣은 글에서 바로 공고 번호가 여럿 나오면 그걸 쓴다.
  //
  // 고용24 의 공개 검색 목록은 주소에 조건을 붙여도 안 먹는다 — 필터가 로그인
  // 세션에 매여 있어, 어떤 조건을 줘도 최신 공고가 그대로 나온다. 그래서 알바가
  // 제 계정에서 조건을 걸어 본 목록에서 주소를 긁어 붙이는 길을 함께 연다.
  let 번호들 = 공고번호들(넣은글);
  if (번호들.length < 2) {
    try {
      번호들 = 공고번호들(await 받아오기(넣은글));
    } catch (e: any) {
      return err("BULK_002", `목록을 불러오지 못했어요 (${e?.message || "실패"}).`, 502);
    }
  }
  번호들 = 번호들.slice(0, 최대);
  if (!번호들.length) {
    // 맞춤정보 목록은 로그인 뒤에 있어 껍데기만 온다. 그 경우가 대부분이다.
    return err("BULK_003", "공고를 찾지 못했어요. 로그인이 필요한 목록이면, 그 목록에서 공고 주소를 복사해 붙여넣어 주세요.", 400);
  }

  const 담음: { title: string; company: string }[] = [];
  const 건너뜀: { title: string; 사유: string }[] = [];
  const origin = new URL(req.url).origin;
  const token = req.headers.get("authorization") || "";

  // 이미 담은 공고는 다시 읽지 않는다.
  const 있는것 = await pool.query(
    `SELECT source_url FROM job_postings WHERE source_url = ANY($1::text[])`,
    [번호들.map(상세주소)]);
  const 이미 = new Set<string>(있는것.rows.map((x: any) => x.source_url));

  // 한 건씩 차례로 받으면 스무 건에 사십 초가 넘어 서버가 먼저 끊는다.
  // 다섯 개씩 나눠 받는다 — 상대 사이트에도 한꺼번에 몰리지 않는다.
  const 읽은것: { no: string; r: any; 오류?: string }[] = [];
  for (let i = 0; i < 번호들.length; i += 5) {
    const 묶음 = 번호들.slice(i, i + 5).filter((no) => !이미.has(상세주소(no)));
    번호들.slice(i, i + 5).filter((no) => 이미.has(상세주소(no)))
      .forEach((no) => 건너뜀.push({ title: no, 사유: "이미 담은 공고" }));
    if (!묶음.length) continue;
    const 결과 = await Promise.all(묶음.map(async (no) => {
      try { return { no, r: parseStructured("www.work24.go.kr", await 받아오기(상세주소(no)), 상세주소(no)) }; }
      catch (e: any) { return { no, r: null, 오류: e?.message || "실패" }; }
    }));
    읽은것.push(...결과);
  }

  for (const { no, r, 오류 } of 읽은것) {
    const url = 상세주소(no);
    if (!r || !r.title) { 건너뜀.push({ title: no, 사유: `못 읽음${오류 ? ` (${오류})` : ""}` }); continue; }
    // 직군이 비었다는 건 뷰티 일이 아니라는 뜻이다(파서가 관문을 둔다).
    if (!Array.isArray(r.job_categories) || !r.job_categories.length) {
      건너뜀.push({ title: r.title, 사유: `우리 직군 아님 (${r.job_category_raw || "직종 없음"})` });
      continue;
    }

    const 원단위 = r.salary_type === "HOURLY" || r.salary_type === "DAILY";
    const 액수 = (n: number) => (n > 0 ? (원단위 ? n : n * 10000) : null);
    const 경력수준 = r.career === "신입" ? "NEW" : r.career === "경력무관" ? "ANY" : "EXPERIENCED";

    const payload = {
      status: "draft",
      created_by: auth?.sub || "admin",
      new_company: { company_name: r.company_name, address: r.address },
      title: r.title,
      job_type: r.job_type || "STORE",
      description: r.description || null,
      categories: r.job_categories,
      location: r.region || null,
      address: r.address || null,
      employment_type: r.employment_type || null,
      experience_level: 경력수준,
      education: r.education || null,
      salary_min: 액수(Number(r.salary_amount)),
      salary_max: 액수(Number(r.salary_amount_max)),
      salary_type: Number(r.salary_amount) > 0 ? r.salary_type : null,
      work_days: r.work_days || null,
      work_time: r.work_time || null,
      headcount: Number(r.headcount) || null,
      deadline: r.always_open ? null : (r.deadline || null),
      preferred_qualifications: r.preferred || null,
      benefit_tags: Array.isArray(r.benefit_tags) ? r.benefit_tags : [],
      hiring_process: Array.isArray(r.hiring_process) ? r.hiring_process : [],
      source_url: url,
      apply_method: "NATIVE",
      contact_methods: ["뷰티워크 온라인지원"],
      // 고용24의 담당자는 매장이 아니라 채용대행 기관인 일이 많다. 담지 않는다.
      contact_name_hidden: true, contact_phone_hidden: true,
      contact_email_hidden: true, contact_kakao_hidden: true,
    };

    // 저장은 기존 등록 API 를 그대로 쓴다. 업체 만들기·중복 판정 규칙이 거기 있고,
    // 여기서 다시 쓰면 두 벌이 되어 언젠가 갈라진다.
    try {
      const res = await fetch(`${origin}/api/admin/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (j?.success) 담음.push({ title: r.title, company: r.company_name });
      else 건너뜀.push({ title: r.title, 사유: j?.error?.message || "저장 실패" });
    } catch (e: any) {
      건너뜀.push({ title: r.title, 사유: `저장 실패 (${e?.message || ""})` });
    }
  }

  return ok({ 본것: 번호들.length, 담음, 건너뜀 });
}
