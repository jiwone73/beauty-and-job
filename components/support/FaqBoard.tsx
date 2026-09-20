"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { FAQ_묶음, FAQ찾기, 갈래들, type 묶음 } from "@/lib/faq";
import InfoSeg from "@/components/InfoSeg";

/**
 * 자주 묻는 질문 판 — 받는 쪽으로 나누고, 갈래로 묶고, 찾을 수 있게 한다.
 *
 * 스무 개가 한 줄로 늘어서면 스크롤로 찾는 수밖에 없다. 개인·기업을 먼저
 * 가르고(둘이 궁금한 것이 겹치지 않는다), 그 안을 갈래로 묶고, 그래도 못 찾으면
 * 검색한다.
 *
 * 처음에는 다 접어 둔다 — 펼쳐 두면 질문 목록이 아니라 글이 되어, 무엇을 물을
 * 수 있는지부터 안 보인다.
 */
export default function FaqBoard({ 처음 = "개인", 접기 = true, 묶고정 }: {
  처음?: 묶음;
  /** false 면 갈래 제목 없이 한 줄로 — 첫 화면에 몇 개만 얹을 때 */
  접기?: boolean;
  /** 주어지면 개인·기업 토글을 그리지 않고 이 값 하나로 고정한다. 사용가이드처럼
   *  바깥 화면이 이미 위에서 갈래를 고르고 있을 때, 토글을 두 번 세우지 않으려고 쓴다. */
  묶고정?: 묶음;
}) {
  const [묶내부, set묶] = useState<묶음>(처음);
  const 묶 = 묶고정 ?? 묶내부;
  const [말, set말] = useState("");
  const [열린것, set열린것] = useState<string | null>(null);
  const [고른갈래, set고른갈래] = useState("전체");

  const 걸린것 = FAQ찾기(묶, 말);
  const 갈래목록 = 갈래들(묶)
    .filter((g) => 고른갈래 === "전체" || g === 고른갈래)
    .filter((g) => 걸린것.some((f) => f.갈래 === g));

  return (
    <div className="faq-board">
      {/* 개인·기업은 여기서 고른다. 한때 화면 위쪽 탭으로 올렸다가 다시
          내렸다 — 갈리는 것은 FAQ 뿐이고(공지·문의·다운로드는 누구에게나
          같다), 고객센터 전체에 걸린 탭으로 보이면 나머지 셋도 사람마다
          다른 줄 알게 된다. */}
      {!묶고정 && (
        <InfoSeg 값={묶} 고르기={(m) => { set묶(m); set열린것(null); set고른갈래("전체"); }}
                 목록={(Object.keys(FAQ_묶음) as 묶음[]).map((m) => [m, FAQ_묶음[m]] as const)} />
      )}
      {/* 갈래 고르기 + 검색. 스무 개가 한 줄로 늘어서면 스크롤로 찾는 수밖에
          없다 — 공지·다운로드 게시판과 같은 짜임이다. */}
      <div className="faq-top">
        <select className="nb-pick" aria-label="갈래" value={고른갈래}
                onChange={(e) => { set고른갈래(e.target.value); set열린것(null); }}>
          <option value="전체">전체</option>
          {갈래들(묶).map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <label className="faq-search">
          <Search size={16} />
          <input value={말} onChange={(e) => set말(e.target.value)}
                 placeholder="궁금한 것을 적어 보세요" />
        </label>
      </div>

      {걸린것.length === 0 ? (
        <p className="faq-none">
          「{말}」에 대한 답을 못 찾았습니다. 아래 <b>1:1 문의</b>로 물어봐 주세요.
        </p>
      ) : (
        갈래목록.map((갈래) => (
          <section key={갈래} className="faq-group">
            {접기 && <h3 className="faq-group-t">{갈래}</h3>}
            <div className="faq-list">
              {걸린것.filter((f) => f.갈래 === 갈래).map((f) => (
                <div key={f.q} className="faq-item">
                  <button type="button" className="faq-question"
                          onClick={() => set열린것(열린것 === f.q ? null : f.q)}
                          aria-expanded={열린것 === f.q}>
                    <span>{f.q}</span>
                    {열린것 === f.q ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  {열린것 === f.q && <div className="faq-answer">{f.a}</div>}
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
