export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { signAccessToken } from "@/lib/jwt";
import { 가입표읽기 } from "@/lib/socialSignup";
import { sendWelcomeEmail } from "@/lib/email";

// 간편가입의 마지막 걸음 — 약관에 동의한 뒤에야 회원이 된다.
//
// 카카오·네이버 콜백은 회원을 만들지 않고 가입표만 들려 보낸다. 여기서 그
// 표를 펴서 users 를 만들고, 같은 트랜잭션에 동의 기록을 남긴다. 이메일
// 가입(app/api/auth/email/signup)과 같은 term_agreements 를 쓴다 — 어느 길로
// 들어왔든 동의 기록은 한 자리에 모여야 나중에 확인할 수 있다.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any));
  const { signup, job_type, phone, agreed_term_ids } = body || {};

  if (!signup) return err("SOCIAL_001", "가입 정보가 없어요. 처음부터 다시 해주세요.", 400);

  let 표;
  try {
    표 = 가입표읽기(String(signup));
  } catch {
    // 10분이 지났거나 손댄 표. 다시 시작하는 것 외에 할 수 있는 일이 없다.
    return err("SOCIAL_002", "가입 시간이 지났어요. 처음부터 다시 해주세요.", 400);
  }

  if (job_type !== "STORE" && job_type !== "OFFICE") {
    return err("SOCIAL_003", "직종을 선택해 주세요.", 400);
  }

  // 필수 약관은 서버가 확인한다 — 화면에서 막는 것만으로는 요청을 직접 보내는
  // 경우를 못 막고, 동의 없이 만들어진 회원은 나중에 되돌릴 방법이 없다.
  const 필수 = await pool.query(
    `SELECT id FROM terms WHERE is_required = true AND is_active = true`
  );
  const 동의 = new Set<string>((agreed_term_ids || []).map((x: any) => String(x)));
  const 빠진것 = 필수.rows.filter((t: any) => !동의.has(String(t.id)));
  if (빠진것.length > 0) {
    return err("SOCIAL_004", "필수 약관에 동의해 주세요.", 400);
  }

  const 번호 = String(phone || 표.phone || "").replace(/\D/g, "") || null;
  const kakaoId = 표.provider === "kakao" ? 표.providerId : null;
  const naverId = 표.provider === "naver" ? 표.providerId : null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 표를 들고 있는 동안 같은 사람이 다른 창에서 가입했을 수 있다.
    const 이미 = await client.query(
      `SELECT id FROM users WHERE ($1::text IS NOT NULL AND kakao_id = $1)
                              OR ($2::text IS NOT NULL AND naver_id = $2)`,
      [kakaoId, naverId]
    );
    if (이미.rowCount && 이미.rowCount > 0) {
      await client.query("ROLLBACK");
      return err("SOCIAL_005", "이미 가입된 계정이에요. 로그인해 주세요.", 409);
    }

    const ins = await client.query(
      `INSERT INTO users (kakao_id, naver_id, name, email, phone, avatar_url, job_type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'ACTIVE')
       RETURNING id, email, name, phone, job_type, office_job_areas, status`,
      [kakaoId, naverId, 표.name, 표.email, 번호, 표.avatarUrl, job_type]
    );
    const user = ins.rows[0];

    for (const termId of 동의) {
      await client.query(
        `INSERT INTO term_agreements (owner_type, owner_id, term_id, agreed_at)
         VALUES ('user', $1, $2, NOW())
         ON CONFLICT (owner_id, term_id)
         DO UPDATE SET agreed_at = NOW(), withdrawn_at = NULL`,
        [user.id, termId]
      );
    }

    await client.query("COMMIT");

    if (user.email) {
      await sendWelcomeEmail(user.email, user.name).catch((e) =>
        console.error("[social welcome email]", e)
      );
    }

    const accessToken = signAccessToken({ sub: user.id, owner_type: "user", role: "user" });
    return ok({ access_token: accessToken, user }, 201);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
