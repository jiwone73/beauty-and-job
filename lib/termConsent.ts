import pool from "@/lib/db";

/** 선택 약관(광고성 정보 수신) 동의를 읽고 쓴다.
 *
 *  개인회원과 기업회원이 같은 표(term_agreements)를 쓰므로 한 곳에 둔다.
 *
 *  끌 때 행을 지우지 않고 철회 시각을 적는 이유: 언제 동의했고 언제 껐는지가
 *  그대로 증빙이 된다. 지워 버리면 "동의한 적 없다"와 "동의했다가 껐다"를
 *  구분할 수 없다.
 *
 *  (owner_id, term_id) 에 UNIQUE 가 걸려 있어 한 약관에 행은 하나뿐이다.
 *  그래서 다시 켤 때도 새 행을 쌓지 않고 그 행을 되살린다.
 */
export type 주인 = "user" | "company";

/** terms.type 으로 지금 쓰는 약관의 id 를 찾는다 — id 를 코드에 박아 두면
 *  약관을 새 판으로 갈 때 옛 판에 동의가 쌓인다. */
async function 약관id(type: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT id FROM terms WHERE type = $1 AND is_active = true ORDER BY version DESC LIMIT 1`,
    [type]
  );
  return rows[0]?.id ?? null;
}

/** 지금 살아 있는(철회하지 않은) 동의만 true 로 돌려준다. */
export async function 동의읽기(주인종류: 주인, 주인id: string, types: readonly string[]) {
  const { rows } = await pool.query(
    `SELECT t.type
       FROM term_agreements ta
       JOIN terms t ON t.id = ta.term_id
      WHERE ta.owner_type = $1 AND ta.owner_id = $2
        AND ta.withdrawn_at IS NULL
        AND t.type = ANY($3)`,
    [주인종류, 주인id, types as string[]]
  );
  const 산것 = new Set(rows.map((r) => r.type));
  return Object.fromEntries(types.map((t) => [t, 산것.has(t)])) as Record<string, boolean>;
}

export async function 동의쓰기(주인종류: 주인, 주인id: string, type: string, 원함: boolean) {
  const id = await 약관id(type);
  if (!id) return;
  if (원함) {
    await pool.query(
      `INSERT INTO term_agreements (owner_id, owner_type, term_id, agreed_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (owner_id, term_id)
       DO UPDATE SET agreed_at = NOW(), withdrawn_at = NULL`,
      [주인id, 주인종류, id]
    );
  } else {
    await pool.query(
      `UPDATE term_agreements SET withdrawn_at = NOW()
        WHERE owner_id = $1 AND owner_type = $2 AND term_id = $3
          AND withdrawn_at IS NULL`,
      [주인id, 주인종류, id]
    );
  }
}
