"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";

/**
 * 공지·이벤트 게시판.
 *
 * 줄을 누르면 글 페이지로 간다. 한때 그 자리에서 펼쳤는데, 펼치면 주소가
 * 그대로라 그 글만 따로 보낼 수가 없었다. 옆줄이 생긴 지금은 화면이 통째로
 * 갈리지도 않는다 — 옆줄은 서 있고 오른쪽만 바뀐다.
 *
 * 갈래(전체·공지사항·이벤트)와 검색, 쪽 번호는 글이 쌓이면 반드시 필요해지는
 * 셋이다. 지금은 글이 몇 개뿐이라 없어도 되지만, 나중에 붙이면 그때 목록을
 * 다시 짜야 한다.
 */
type Row = {
  id: string; type: "notice" | "event"; title: string; target: string | null;
  is_pinned: boolean; published_at: string | null; created_at: string;
};

const 한쪽 = 10;

function 날짜(s: string | null) {
  if (!s) return "";
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** 쪽 번호 줄. 0 은 「…」 자리다. 앞뒤 두 칸씩만 펼치고 나머지는 접는다. */
function 쪽목록(현재: number, 총: number): number[] {
  if (총 <= 7) return Array.from({ length: 총 }, (_, i) => i + 1);
  const 쪽: number[] = [1];
  if (현재 > 4) 쪽.push(0);
  for (let n = Math.max(2, 현재 - 1); n <= Math.min(총 - 1, 현재 + 1); n++) 쪽.push(n);
  if (현재 < 총 - 3) 쪽.push(0);
  쪽.push(총);
  return 쪽;
}

export default function NoticeBoard({ emptyText, 갈래고정 }: {
  emptyText: string;
  /** 한 갈래만 담는 화면(/event)이면 갈래 고르는 칸을 세우지 않는다. */
  갈래고정?: "notice" | "event";
}) {
  const router = useRouter();
  const sp = useSearchParams();
  const 누구 = sp.get("누구") === "기업" ? "기업" : "개인";
  const 열고들어온글 = sp.get("open");

  const [list, setList] = useState<Row[]>([]);
  const [부르는중, set부르는중] = useState(true);
  const [갈래, set갈래] = useState<"전체" | "notice" | "event">(갈래고정 ?? "전체");
  const [적은말, set적은말] = useState("");
  const [찾는말, set찾는말] = useState("");
  const [쪽, set쪽] = useState(1);

  // 예전 주소(?open=…)로 들어온 사람은 그 글 페이지로 보낸다.
  useEffect(() => {
    if (열고들어온글) router.replace(`/notice/${열고들어온글}?누구=${누구}`);
  }, [열고들어온글, 누구, router]);

  useEffect(() => {
    set부르는중(true);
    fetch("/api/notices")
      .then((r) => r.json())
      .then((res) => { if (res.success) setList(res.data); })
      .catch(() => {})
      .finally(() => set부르는중(false));
  }, []);

  const 볼것 = useMemo(() => list.filter((n) => {
    // 보는 사람에게 해당하는 것만. target 이 비어 있으면 모두에게 가는 글이다.
    const t = n.target ?? "all";
    if (t !== "all" && t !== (누구 === "기업" ? "company" : "user")) return false;
    if (갈래 !== "전체" && n.type !== 갈래) return false;
    if (찾는말 && !n.title.toLowerCase().includes(찾는말.toLowerCase())) return false;
    return true;
  }), [list, 누구, 갈래, 찾는말]);

  const 총쪽 = Math.max(1, Math.ceil(볼것.length / 한쪽));
  const 지금쪽 = Math.min(쪽, 총쪽);
  const 이번것 = 볼것.slice((지금쪽 - 1) * 한쪽, 지금쪽 * 한쪽);

  const 찾기 = (e: React.FormEvent) => { e.preventDefault(); set찾는말(적은말.trim()); set쪽(1); };

  return (
    <>
      <form className="nb-top" onSubmit={찾기}>
        {!갈래고정 && (
          <select className="nb-pick" value={갈래} aria-label="갈래"
                  onChange={(e) => { set갈래(e.target.value as typeof 갈래); set쪽(1); }}>
            <option value="전체">전체</option>
            <option value="notice">공지사항</option>
            <option value="event">이벤트</option>
          </select>
        )}
        <label className="nb-search">
          <input value={적은말} onChange={(e) => set적은말(e.target.value)}
                 placeholder="제목 검색" aria-label="제목 검색" />
          <button type="submit" aria-label="검색"><Search size={17} /></button>
        </label>
      </form>

      <div className="nb-th"><span>제목</span><span>등록일자</span></div>

      {부르는중 ? (
        <p className="nb-board-msg">불러오는 중...</p>
      ) : 이번것.length === 0 ? (
        <p className="nb-board-msg">{찾는말 ? `「${찾는말}」에 대한 글이 없습니다.` : emptyText}</p>
      ) : (
        <ul className="nb-board">
          {이번것.map((n) => (
            <li key={n.id}>
              <Link href={`/notice/${n.id}?누구=${누구}`}>
                {!갈래고정 && (
                  <span className="nb-board-k">[{n.type === "event" ? "이벤트" : "공지사항"}]</span>
                )}
                {n.is_pinned && <span className="nb-board-pin">고정</span>}
                <span className="nb-board-t">{n.title}</span>
                <span className="nb-board-d">{날짜(n.published_at || n.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {총쪽 > 1 && (
        <div className="jobs-pager">
          <button type="button" onClick={() => set쪽(지금쪽 - 1)} disabled={지금쪽 === 1}>‹</button>
          {쪽목록(지금쪽, 총쪽).map((n, i) => n === 0
            ? <span key={`gap${i}`} className="jobs-pager-gap">…</span>
            : <button key={n} type="button"
                      className={`jobs-pager-num${n === 지금쪽 ? " on" : ""}`}
                      onClick={() => set쪽(n)}>{n}</button>)}
          <button type="button" onClick={() => set쪽(지금쪽 + 1)} disabled={지금쪽 === 총쪽}>›</button>
        </div>
      )}
    </>
  );
}
