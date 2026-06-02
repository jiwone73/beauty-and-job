export const dynamic = "force-dynamic";
import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ok, err, requireAuth } from '@/lib/api'

// 상태 라벨 ↔ DB 값 변환
const toDbStatus = (label: string) => (label === '게시중' ? 'PUBLISHED' : 'DRAFT')

// 목록 조회
export async function GET(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const client = await pool.connect()
  try {
    const result = await client.query(`
      SELECT id, title, category, content, tags, read_time, status, view_count, created_at, updated_at
      FROM insights ORDER BY created_at DESC
    `)
    return ok({ items: result.rows })
  } finally {
    client.release()
  }
}

// 글 작성
export async function POST(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const body = await req.json()
  const { title, category, content, read_time, tags, status } = body
  if (!title || !content) return err('BAD_REQUEST', '제목과 본문은 필수입니다.', 400)

  // tags: 쉼표 문자열 → 배열
  const tagArr = typeof tags === 'string'
    ? tags.split(',').map((t: string) => t.trim()).filter(Boolean)
    : Array.isArray(tags) ? tags : []
  const dbStatus = toDbStatus(status)
  const rt = read_time ? parseInt(String(read_time), 10) || null : null

  const client = await pool.connect()
  try {
    const result = await client.query(`
      INSERT INTO insights (title, category, content, tags, read_time, status)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6)
      RETURNING id
    `, [title, category || null, content, JSON.stringify(tagArr), rt, dbStatus])
    return ok({ id: result.rows[0].id })
  } finally {
    client.release()
  }
}

// 상태 변경 (게시/임시저장 전환)
export async function PATCH(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { id, status } = await req.json()
  if (!id || !status) return err('BAD_REQUEST', 'id, status 필요', 400)
  const dbStatus = ['PUBLISHED', 'DRAFT'].includes(status) ? status : toDbStatus(status)

  const client = await pool.connect()
  try {
    await client.query(`UPDATE insights SET status = $1, updated_at = now() WHERE id = $2`, [dbStatus, id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}

// 삭제
export async function DELETE(req: NextRequest) {
  const { auth, res: authErr } = requireAuth(req, 'admin')
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return err('BAD_REQUEST', 'id 필요', 400)

  const client = await pool.connect()
  try {
    await client.query(`DELETE FROM insights WHERE id = $1`, [id])
    return ok({ success: true })
  } finally {
    client.release()
  }
}