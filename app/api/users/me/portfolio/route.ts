export const dynamic = "force-dynamic";
import { NextRequest } from "next/server";
import pool from "@/lib/db";
import { ok, err } from "@/lib/api";
import { verifyAccessToken } from "@/lib/jwt";
import { supabaseAdmin } from "@/lib/supabase";
import { shrinkImage } from "@/lib/imageShrink";
import { MAX_PHOTOS } from "@/lib/compressImage";

const BUCKET = "portfolios";
// 브라우저에서 이미 156만 픽셀로 줄여 올린다(장당 200KB 안팎). 여기 한도는 그게
// 안 먹혔을 때를 막는 그물이지, 이만큼 올리라는 뜻이 아니다.
const MAX_SIZE = 1.5 * 1024 * 1024;


type Photo = { url: string; w?: number; h?: number };

function 인증(req: NextRequest): { userId: string } | { res: ReturnType<typeof err> } {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return { res: err("AUTH_001", "인증이 필요합니다.", 401) };
  try {
    const payload = verifyAccessToken(token);
    if (payload.owner_type !== "user") return { res: err("AUTH_002", "사용자 권한이 필요합니다.", 403) };
    return { userId: payload.sub };
  } catch {
    return { res: err("AUTH_001", "유효하지 않은 토큰입니다.", 401) };
  }
}

const 읽기 = (v: any): Photo[] => (Array.isArray(v) ? v.filter((x) => x && x.url) : []);

/** 사진 추가(여러 장 한 번에). 기존 것 뒤에 붙는다. */
export async function POST(req: NextRequest) {
  const a = 인증(req);
  if ("res" in a) return a.res;

  try {
    const formData = await req.formData();
    const files = formData.getAll("files").filter((f): f is File => f instanceof File);
    if (!files.length) return err("FILE_001", "사진이 없습니다.");
    for (const f of files) {
      if (!/^image\/(jpeg|png|webp)$/i.test(f.type)) return err("FILE_002", "사진 파일만 올릴 수 있어요.");
      if (f.size > MAX_SIZE) return err("FILE_003", "사진 한 장은 1.5MB 이하여야 해요.");
    }

    const client = await pool.connect();
    try {
      const before = 읽기((await client.query(`SELECT portfolio_images FROM users WHERE id = $1`, [a.userId])).rows[0]?.portfolio_images);
      if (before.length + files.length > MAX_PHOTOS) {
        return err("FILE_007", `사진은 최대 ${MAX_PHOTOS}장까지예요. (지금 ${before.length}장)`);
      }

      const 새것: Photo[] = [];
      for (const [i, f] of files.entries()) {
        // 원본 그대로 넣으면 저장소가 빨리 찬다. 표시 크기(가로 1600px)로 줄인다.
        const 줄인 = await shrinkImage(Buffer.from(await f.arrayBuffer()), f.type);
        const path = `${a.userId}/${Date.now()}-${i}.${줄인.ext}`;
        const { error } = await supabaseAdmin.storage.from(BUCKET).upload(path, 줄인.buf, {
          contentType: 줄인.contentType, upsert: true,
        });
        if (error) {
          console.error("[portfolio upload]", error);
          return err("FILE_004", "업로드에 실패했어요.");
        }
        새것.push({
          url: supabaseAdmin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl,
          w: Number(formData.get(`w${i}`)) || undefined,
          h: Number(formData.get(`h${i}`)) || undefined,
        });
      }

      const 전체 = [...before, ...새것];
      await client.query(
        `UPDATE users SET portfolio_images = $1::jsonb, portfolio_uploaded_at = NOW() WHERE id = $2`,
        [JSON.stringify(전체), a.userId]
      );
      return ok({ portfolio_images: 전체 });
    } finally {
      client.release();
    }
  } catch (e) {
    console.error("[portfolio upload]", e);
    return err("FILE_005", "업로드 중 오류가 발생했어요.", 500);
  }
}

/** ?url= 한 장만 지운다. url 이 없으면 전부 지운다. */
export async function DELETE(req: NextRequest) {
  const a = 인증(req);
  if ("res" in a) return a.res;

  const 지울주소 = new URL(req.url).searchParams.get("url");
  const client = await pool.connect();
  try {
    const before = 읽기((await client.query(`SELECT portfolio_images FROM users WHERE id = $1`, [a.userId])).rows[0]?.portfolio_images);
    const 지울것 = 지울주소 ? before.filter((p) => p.url === 지울주소) : before;
    const 남길것 = 지울주소 ? before.filter((p) => p.url !== 지울주소) : [];

    const paths = 지울것.map((p) => p.url.split(`/${BUCKET}/`)[1]).filter(Boolean) as string[];
    if (paths.length) await supabaseAdmin.storage.from(BUCKET).remove(paths);

    await client.query(
      `UPDATE users SET portfolio_images = $1::jsonb WHERE id = $2`,
      [남길것.length ? JSON.stringify(남길것) : null, a.userId]
    );
    return ok({ portfolio_images: 남길것 });
  } catch (e) {
    console.error("[portfolio delete]", e);
    return err("FILE_006", "삭제 중 오류가 발생했어요.", 500);
  } finally {
    client.release();
  }
}
