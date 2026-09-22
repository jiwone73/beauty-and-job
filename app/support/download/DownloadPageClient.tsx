"use client";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import InfoShell from "@/components/InfoShell";

/**
 * 다운로드 — 공지사항과 같은 게시판 짜임(갈래 고르기 · 검색 · 목록).
 *
 * 지금은 이력서 양식 하나뿐이라 줄 하나짜리 게시판이다. 그래도 카드 한 장으로
 * 두지 않는 까닭은, 늘어날 때마다 화면을 다시 짜지 않으려는 것이다 — 줄을
 * 더하면 갈래와 검색이 그대로 걸린다.
 */
type 자료 = { 갈래: string; 이름: string; 파일: string; 날짜: string };

const 목록: 자료[] = [
  {
    갈래: "이력서",
    이름: "미용 이력서 양식",
    파일: "/files/뷰티워크-이력서-양식-매장.docx",
    날짜: "2026-09-21",
  },
  {
    갈래: "이력서",
    이름: "미용 이력서 양식",
    파일: "/files/뷰티워크-이력서-양식-오피스.docx",
    날짜: "2026-09-21",
  },
];

const 갈래들 = ["전체", ...Array.from(new Set(목록.map((d) => d.갈래)))];

export default function DownloadPageClient() {
  const [갈래, set갈래] = useState("전체");
  const [적은말, set적은말] = useState("");
  const [찾는말, set찾는말] = useState("");

  const 보일것 = useMemo(() => {
    const m = 찾는말.trim();
    return 목록.filter((d) =>
      (갈래 === "전체" || d.갈래 === 갈래) &&
      (!m || d.이름.includes(m)));
  }, [갈래, 찾는말]);

  return (
    <InfoShell active="/support/download" title="다운로드">
      <form className="nb-top" onSubmit={(e) => { e.preventDefault(); set찾는말(적은말); }}>
        <select className="nb-pick" value={갈래} aria-label="갈래"
                onChange={(e) => set갈래(e.target.value)}>
          {갈래들.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <label className="nb-search">
          <input value={적은말} onChange={(e) => set적은말(e.target.value)}
                 placeholder="검색어를 입력하세요." />
          <button type="submit" aria-label="검색"><Search size={17} /></button>
        </label>
      </form>

      <div className="nb-th dl-th">
        <span>구분</span><span>자료명</span><span>등록일자</span><span>다운로드</span>
      </div>

      {보일것.length === 0 ? (
        <p className="nb-board-msg">
          {찾는말 ? `「${찾는말}」에 대한 자료가 없습니다.` : "등록된 자료가 없습니다."}
        </p>
      ) : (
        <ul className="nb-board dl-board">
          {보일것.map((d) => (
            <li key={d.파일}>
              <a href={d.파일} download>
                <span className="nb-board-k">{d.갈래}</span>
                <span className="nb-board-t">{d.이름}</span>
                <span className="nb-board-d">{d.날짜}</span>
                <span className="dl-get"><Download size={16} /></span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </InfoShell>
  );
}
