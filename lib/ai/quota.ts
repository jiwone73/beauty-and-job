import pool from "@/lib/db";

/**
 * 하루에 몇 번까지.
 *
 * 건당 요금은 몇 원이라 아깝지 않지만, 마음에 들 때까지 계속 돌리는 사람이
 * 하나만 있어도 그 사람이 요금을 정한다. 값이 아니라 횟수가 비용을 정한다.
 */
export const 하루한도 = { cover_letter: 3, spellcheck: 5 } as const;

export async function 하루쓴횟수(userId: string, kind: keyof typeof 하루한도): Promise<number> {
  const { rows } = await pool.query(
    `SELECT count FROM ai_usage WHERE user_id = $1 AND day = CURRENT_DATE AND kind = $2`,
    [userId, kind]
  );
  return rows[0]?.count ?? 0;
}
