"use client";
import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

/**
 * 공지·이벤트 목록.
 *
 * 두 가지가 화면을 가른다.
 *
 *  1. 공지와 이벤트는 성격이 다르다. 하나는 알려야 할 사실(점검·약관)이고
 *     다른 하나는 참여를 끄는 제안(쿠폰·노출)이다. 읽는 이유도 수명도 달라
 *     한 목록에 섞으면 양쪽 다 손해다. 그래서 이 판을 type 하나로 갈라
 *     두 페이지가 각각 자기 것만 담는다 — 고를 탭이 없다.
 *
 *  2. 글이 짧다. 점검 안내 한 문단을 보자고 화면을 통째로 갈아 끼우고
 *     다시 뒤로 오는 것은 무겁다. 눌러서 그 자리에서 펼친다.
 *     목록 API는 제목만 주므로 펼칠 때 본문을 한 번 가져오고, 두 번째부터는
 *     받아 둔 것을 쓴다.
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
  const searchParams = useSearchParams();
  // 메인에서 글 하나를 눌러 들어오면 그 글이 펼쳐진 채로 열린다.
  const 열고들어온글 = searchParams.get("open");

  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [열린글, set열린글] = useState<string | null>(열고들어온글);
  const [본문, set본문] = useState<Record<string, string>>({});
  const [읽는중, set읽는중] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/notices?type=${type}`)
      .then((r) => r.json())
      .then((res) => { if (res.success) setList(res.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  const 본문가져오기 = useCallback((id: string) => {
    if (본문[id] !== undefined) return;
    set읽는중(id);
    fetch(`/api/notices/${id}`)
      .then((r) => r.json())
      .then((res) => {
        set본문((p) => ({ ...p, [id]: res.success ? (res.data.body || "") : "내용을 불러오지 못했습니다." }));
      })
      .catch(() => set본문((p) => ({ ...p, [id]: "내용을 불러오지 못했습니다." })))
      .finally(() => set읽는중(null));
  }, [본문]);

  // 주소로 들어온 글은 목록이 도착한 뒤에 펼친다.
  useEffect(() => {
    if (열고들어온글 && list.some((n) => n.id === 열고들어온글)) 본문가져오기(열고들어온글);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, 열고들어온글]);

  const 누름 = (id: string) => {
    if (열린글 === id) { set열린글(null); return; }
    set열린글(id);
    본문가져오기(id);
  };

  if (loading) return <p className="nb-board-msg">불러오는 중...</p>;
  if (list.length === 0) return <p className="nb-board-msg">{emptyText}</p>;

  return (
    <ul className="nb-board">
      {list.map((n) => {
        const 열림 = 열린글 === n.id;
        return (
          <li key={n.id} className={열림 ? "on" : undefined}>
            <button type="button" onClick={() => 누름(n.id)} aria-expanded={열림}>
              {n.is_pinned && <span className="nb-board-pin">고정</span>}
              <span className="nb-board-t">{n.title}</span>
              <span className="nb-board-d">{날짜(n.published_at || n.created_at)}</span>
              <ChevronDown size={17} className="nb-board-ar" />
            </button>
            {열림 && (
              <div className="nb-board-body">
                {읽는중 === n.id ? "불러오는 중..." : 본문[n.id]}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
