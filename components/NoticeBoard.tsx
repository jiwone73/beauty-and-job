"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * 공지·이벤트 목록.
 *
 * 공지와 이벤트는 성격이 다르다. 하나는 알려야 할 사실(점검·약관)이고 다른
 * 하나는 참여를 끄는 제안(쿠폰·노출)이다. 읽는 이유도 수명도 달라 한 목록에
 * 섞으면 양쪽 다 손해다. 그래서 이 판을 type 하나로 갈라 두 페이지가 각각
 * 자기 것만 담는다 — 고를 탭이 없다.
 *
 * 줄을 누르면 글 페이지로 간다. 한때 그 자리에서 펼쳤는데, 글이 짧다는 이유
 * 였다. 그런데 펼치면 주소가 그대로라 그 글만 따로 보낼 수가 없고, 옆줄이
 * 생기면서 화면이 통째로 갈리지도 않는다 — 옆줄은 서 있고 오른쪽만 바뀐다.
 */
type Row = {
  id: string; type: "notice" | "event"; title: string;
  is_pinned: boolean; published_at: string | null; created_at: string;
};

function 날짜(s: string | null) {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default function NoticeBoard({
  type,
  emptyText,
}: {
  type: "notice" | "event";
  emptyText: string;
}) {
  const router = useRouter();
  // 예전 주소(?open=…)로 들어온 사람은 그 글 페이지로 보낸다. 메인 화면과
  // 지난 안내 메일이 아직 이 꼴을 쓴다.
  const 열고들어온글 = useSearchParams().get("open");

  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (열고들어온글) router.replace(`/notice/${열고들어온글}`);
  }, [열고들어온글, router]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/notices?type=${type}`)
      .then((r) => r.json())
      .then((res) => { if (res.success) setList(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  if (loading) return <p className="nb-board-msg">불러오는 중...</p>;
  if (list.length === 0) return <p className="nb-board-msg">{emptyText}</p>;

  return (
    <ul className="nb-board">
      {list.map((n) => (
        <li key={n.id}>
          <Link href={`/notice/${n.id}`}>
            {n.is_pinned && <span className="nb-board-pin">고정</span>}
            <span className="nb-board-t">{n.title}</span>
            <span className="nb-board-d">{날짜(n.published_at || n.created_at)}</span>
            <ChevronRight size={17} className="nb-board-ar" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
