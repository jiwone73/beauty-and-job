export const dynamic = "force-dynamic";
export const maxDuration = 60;
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err, requireAuth } from "@/lib/api";
import { parseStructured } from "@/lib/external/parsers/structured";
import { 목록받기, 상세받기, type 소스 } from "@/lib/external/sourceList";

/** 외부공고 불러오기 — 받아 둔 목록을 보여주고(GET), 다시 받아 온다(POST).
 *
 *  담는 규칙은 둘뿐이다.
 *    · 우리 직군에 맞지 않으면 담지 않는다 — 뷰티가 아닌 공고다.
 *    · 연락처가 없으면 담지 않는다 — 지원서를 받아도 전할 데가 없다.
 *  왜 걸렀는지는 건수로 알려 준다. 조용히 사라지면 뭐가 빠졌는지 알 수 없다.
 */

const 소스들: 소스[] = ["hairinjob", "selectme", "work24"];
const 소스인가 = (v: any): v is 소스 => 소스들.includes(v);

// 한 번에 받을 상세 수. 첫 실행은 이만큼 받고, 다음부터는 새로 올라온 것만이라 적다.
const 한번에 = 40;

/** 파서가 못 찾았을 때, 본문 글에서 연락처를 한 번 더 찾는다.
 *
 *  헤어인잡은 담당자 이름만 주고 번호는 안 준다. 그런데 매장이 상세요강 글에
 *  「문자 주세요 010-…」처럼 적어 두는 일이 잦다 — 그건 공개된 번호다.
 *  구분자(-·.·공백)가 제대로 든 것만 본다. 사이트가 제 페이지에 박아 둔 대표번호는
 *  구분자 없이 붙어 있어 이 그물에 안 걸린다. */
function 본문에서연락처(html: string): { phone: string; email: string } {
  const t = html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ");
  const phone = (t.match(/01[016-9][-.\s]\d{3,4}[-.\s]\d{4}/) || [])[0]
    || (t.match(/0\d{1,2}[-.]\d{3,4}[-.]\d{4}/) || [])[0] || "";
  const 메일들 = t.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) || [];
  const 사이트 = /(?:hairinjob|selectme|beautyjob|work24|worknet|jobkorea|saramin|albamon)\./i;
  const email = 메일들.find((e) => !사이트.test(e.split("@")[1] || "")) || "";
  return { phone: phone.replace(/[.\s]/g, "-"), email };
}

export async function GET(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const source = new URL(req.url).searchParams.get("source");
  if (!소스인가(source)) return err("INBOX_001", "소스를 지정해주세요.", 400);

  // 이미 우리 공고로 만든 것은 상태를 함께 보여준다 — 같은 걸 또 열지 않게.
  const r = await pool.query(
    `SELECT i.id, i.url, i.title, i.company_name, i.region, i.salary,
            i.contact_phone, i.contact_email, i.categories, i.first_seen,
            j.status AS 우리상태
       FROM external_job_inbox i
       LEFT JOIN job_postings j ON j.source_url = i.url
      WHERE i.source = $1 AND i.closed_at IS NULL
      ORDER BY i.first_seen DESC
      LIMIT 300`, [source]);

  const 마지막 = await pool.query(
    `SELECT max(last_seen) AS t FROM external_job_inbox WHERE source = $1`, [source]);

  return ok({
    source,
    마지막업데이트: 마지막.rows[0]?.t || null,
    목록: r.rows.map((x: any) => ({
      id: x.id, url: x.url, title: x.title, company: x.company_name,
      region: x.region, salary: x.salary,
      contact: x.contact_phone || x.contact_email || "",
      categories: x.categories || [],
      상태: x.우리상태 === "DRAFT" ? "임시저장" : x.우리상태 ? "등록됨" : "미등록",
      새것: !x.우리상태,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { res: authErr } = requireAuth(req, "admin");
  if (authErr) return authErr;
  const source = new URL(req.url).searchParams.get("source");
  if (!소스인가(source)) return err("INBOX_001", "소스를 지정해주세요.", 400);

  let 목록: Awaited<ReturnType<typeof 목록받기>>;
  try {
    목록 = await 목록받기(source);
  } catch (e: any) {
    return err("INBOX_002", `목록을 불러오지 못했어요 (${e?.message || "실패"}).`, 502);
  }
  if (!목록.length) return err("INBOX_003", "목록이 비어 있어요. 사이트가 바뀌었을 수 있습니다.", 502);

  // 목록에서 사라진 것은 마감으로 본다. 화면에서 빠진다.
  const 지금주소 = 목록.map((x) => x.url);
  const 닫음 = await pool.query(
    `UPDATE external_job_inbox SET closed_at = now()
      WHERE source = $1 AND closed_at IS NULL AND NOT (url = ANY($2::text[]))`,
    [source, 지금주소]);

  // 이미 받아 둔 것은 다시 안 읽는다. 살아 있다는 표시만 새로 찍는다.
  await pool.query(
    `UPDATE external_job_inbox SET last_seen = now(), closed_at = NULL
      WHERE source = $1 AND url = ANY($2::text[])`, [source, 지금주소]);
  const 있는것 = await pool.query(
    `SELECT url FROM external_job_inbox WHERE source = $1 AND url = ANY($2::text[])`,
    [source, 지금주소]);
  const 이미 = new Set<string>(있는것.rows.map((x: any) => x.url));
  const 새것 = 목록.filter((x) => !이미.has(x.url)).slice(0, 한번에);

  let 담음 = 0, 뷰티아님 = 0, 연락처없음 = 0, 못읽음 = 0;
  // 다섯씩 나눠 받는다 — 한꺼번에 몰면 상대 사이트에도 무리고 서버도 먼저 끊긴다.
  for (let i = 0; i < 새것.length; i += 5) {
    const 결과 = await Promise.all(새것.slice(i, i + 5).map(async (x) => {
      try {
        const html = await 상세받기(source, x.url);
        const host = new URL(x.url).hostname;
        return { x, r: parseStructured(host, html, x.url) as any, html };
      } catch { return { x, r: null, html: "" }; }
    }));
    for (const { x, r, html } of 결과) {
      if (!r) { 못읽음++; continue; }
      const cats: string[] = Array.isArray(r.job_categories) ? r.job_categories : [];
      if (!cats.length) { 뷰티아님++; continue; }
      let phone = String(r.contact_phone || "").trim();
      let email = String(r.contact_email || "").trim();
      if (!phone && !email) {
        const 더 = 본문에서연락처(html);
        phone = 더.phone; email = 더.email;
      }
      if (!phone && !email) { 연락처없음++; continue; }
      await pool.query(
        `INSERT INTO external_job_inbox
           (source, source_key, url, title, company_name, region, salary,
            contact_phone, contact_email, categories, parsed)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (url) DO UPDATE SET last_seen = now(), closed_at = NULL`,
        [source, x.key, x.url, r.title || x.title, r.company_name || x.company || null,
         r.region || x.region || null, r.salary || null, phone || null, email || null,
         cats, JSON.stringify(r)]);
      담음++;
    }
  }

  return ok({ 본것: 목록.length, 담음, 뷰티아님, 연락처없음, 못읽음, 마감: 닫음.rowCount || 0 });
}
