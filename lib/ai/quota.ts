import pool from "@/lib/db";

/**
 * 하루에 몇 번까지.
 *
 * 건당 요금은 몇 원이라 아깝지 않지만, 마음에 들 때까지 계속 돌리는 사람이
 * 하나만 있어도 그 사람이 요금을 정한다. 값이 아니라 횟수가 비용을 정한다.
 */
export const 하루한도 = { cover_letter: 3, spellcheck: 5 } as const;
export type 갈래 = keyof typeof 하루한도;

export async function 하루쓴횟수(userId: string, kind: 갈래): Promise<number> {
  const { rows } = await pool.query(
    `SELECT count FROM ai_usage WHERE user_id = $1 AND day = CURRENT_DATE AND kind = $2`,
    [userId, kind]
  );
  return rows[0]?.count ?? 0;
}

/**
 * 한 번 쓸 자리를 미리 집는다. 집혔으면 부르고, 못 집었으면 한도 초과다.
 *
 * 예전에는 「몇 번 썼나」를 읽어 보고 → 모델을 부르고 → 그 다음에 한 번 올렸다.
 * 그 사이가 벌어져 있어서, 단추를 동시에 여러 번 누르면 전부 같은 숫자를 읽고
 * 다 통과했다. 실제로 한도 3 중 2를 쓴 계정으로 동시에 네 번 부르니 네 번 다
 * 나갔고 기록은 6이 됐다 — 한도가 없는 것과 같았다. 곧바로 요금이다.
 *
 * 세는 것과 견주는 것을 한 문장 안에서 한다. 같은 줄을 고치려는 요청은
 * 줄 잠금 때문에 줄을 서게 되고, 한도를 넘은 쪽은 아무 줄도 못 받는다.
 */
export async function 한자리집기(userId: string, kind: 갈래): Promise<boolean> {
  const { rows } = await pool.query(
    `INSERT INTO ai_usage (user_id, day, kind, count)
     VALUES ($1, CURRENT_DATE, $2, 1)
     ON CONFLICT (user_id, day, kind) DO UPDATE
       SET count = ai_usage.count + 1
       WHERE ai_usage.count < $3
     RETURNING count`,
    [userId, kind, 하루한도[kind]]
  );
  return (rows.length ?? 0) > 0;
}

/** 모델이 실패했으면 집어 둔 자리를 돌려준다 — 안 나간 것으로 요금을 세면 안 된다. */
export async function 자리돌려주기(userId: string, kind: 갈래): Promise<void> {
  await pool.query(
    `UPDATE ai_usage SET count = GREATEST(count - 1, 0)
      WHERE user_id = $1 AND day = CURRENT_DATE AND kind = $2`,
    [userId, kind]
  ).catch((e) => console.error("[ai quota] 자리 되돌리기 실패", e));
}
