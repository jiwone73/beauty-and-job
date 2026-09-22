import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { 스토리공개 } from "@/lib/storiesGate";
import pool from "@/lib/db";
import StoryDetailClient from "./StoryDetailClient";

async function 글읽기(id: string) {
  try {
    const { rows } = await pool.query(
      `SELECT title, body, category FROM community_posts WHERE id = $1 AND status = 'published'`,
      [id]
    );
    return rows[0] || null;
  } catch {
    return null;
  }
}

// 현장이야기는 이번 오픈에서 비공개다(lib/storiesGate.js) — 개별 글도
// 주소를 직접 알아도 막는다. 제목·설명은 미리 실제 글 내용으로 만들어
// 두어, 나중에 공개로 정해지면 스위치 하나로 바로 검색에 노출될 준비가
// 되어 있게 한다.
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  if (!스토리공개) return { robots: { index: false, follow: false } };
  const 글 = await 글읽기(params.id);
  if (!글) return {};
  const 제목 = `${글.title || 글.body.slice(0, 40)} | 현장이야기 - 뷰티워크`;
  const 설명 = (글.body || "").slice(0, 100);
  return {
    title: 제목,
    description: 설명,
    alternates: { canonical: `/stories/${params.id}` },
    openGraph: { title: 제목, description: 설명, url: `/stories/${params.id}`, type: "article" },
  };
}

export default function StoryDetailPage() {
  if (!스토리공개) notFound();
  return <StoryDetailClient />;
}
