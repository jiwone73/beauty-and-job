import type { Metadata } from "next";
import { notFound } from "next/navigation";
import pool from "@/lib/db";
import NoticeDetailClient from "./NoticeDetailClient";

async function 글읽기(id: string) {
  try {
    const { rows } = await pool.query(
      `SELECT type, title, body, banner_image_url FROM notices
        WHERE id = $1 AND status = 'published'`,
      [id]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

// 글 자체 표(HTML)는 NoticeBody 가 그리므로 여기서는 태그를 걷어낸
// 텍스트만 뽑아 설명(description)에 쓴다.
function 글요약(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const 글 = await 글읽기(params.id);
  if (!글) return {};
  const 갈래 = 글.type === "event" ? "이벤트" : "공지사항";
  const 제목 = `${글.title} | ${갈래} - 뷰티워크`;
  const 설명 = 글요약(글.body || "") || `뷰티워크 ${갈래}: ${글.title}`;
  return {
    title: 제목,
    description: 설명,
    alternates: { canonical: `/notice/${params.id}` },
    openGraph: {
      title: 제목,
      description: 설명,
      url: `/notice/${params.id}`,
      images: 글.banner_image_url ? [{ url: 글.banner_image_url }] : undefined,
      type: "article",
    },
  };
}

export default async function NoticeDetailPage({ params }: { params: { id: string } }) {
  const 글 = await 글읽기(params.id);
  if (!글) notFound();
  return <NoticeDetailClient />;
}
