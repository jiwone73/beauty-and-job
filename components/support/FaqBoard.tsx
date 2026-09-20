"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { FAQ찾기, 갈래들, type 묶음 } from "@/lib/faq";

/**
 * 자주 묻는 질문 판 — 갈래로 묶고, 찾을 수 있게 한다.
 *
 * 개인·기업은 여기서 다시 고르지 않는다 — 옆줄(FAQ > 개인회원/기업회원)이
 * 이미 그 갈림을 맡고 있다. 같은 것을 고르는 자리가 옆줄과 본문 위 두 곳에
 * 있으면 어느 쪽이 진짜인지, 서로 맞지 않을 때 뭘 믿어야 할지 헷갈린다.
 *
 * 스무 개가 한 줄로 늘어서면 스크롤로 찾는 수밖에 없다. 갈래로 묶고,
 * 그래도 못 찾으면 검색한다.
 *
 * 갈래는 드롭다운이 아니라 위쪽에 나열한 탭(| 로 구분)이다 — 무엇으로
 * 묶여 있는지 눌러 보기 전에 이름이 다 보여야, 내 질문이 어느 갈래에
 * 있을지 짐작하고 바로 그리로 갈 수 있다.
 *
 * 처음에는 다 접어 둔다 — 펼쳐 두면 질문 목록이 아니라 글이 되어, 무엇을 물을
 * 수 있는지부터 안 보인다.
 */
export default function FaqBoard({ 처음 = "개인", 접기 = true }: {
  /** 옆줄에서 고른 값. 바뀌면 부르는 쪽이 key 를 바꿔 이 판을 통째로 새로 세운다. */
  처음?: 묶음;
  /** false 면 갈래 제목 없이 한 줄로 — 첫 화면에 몇 개만 얹을 때 */
  접기?: boolean;
}) {
  const 묶 = 처음;
  const [말, set말] = useState("");
  // 하나를 열면 다른 열린 것을 닫던 예전 방식은, 위에 열려 있던 항목이 접히며
  // 지금 누른 항목이 위아래로 튀어 올랐다("눌렀을 때 위아래 이동없이 고정").
  // 그래서 여러 개를 동시에 펼쳐 둘 수 있게 했다 — 열고 닫는 것은 그대로 두되,
  // 보라 테두리(고른 표시)만은 마지막으로 누른 하나에만 준다("여러 개 선택
  // 안되게") — 열려 있는 채로 남은 것들은 테두리 없이 조용히 펼쳐져만 있다.
  const [열린것들, set열린것들] = useState<Set<string>>(new Set());
  const [고른것, set고른것] = useState<string | null>(null);
  const 토글 = (q: string) => {
    set열린것들((prev) => {
      const next = new Set(prev);
      next.has(q) ? next.delete(q) : next.add(q);
      return next;
    });
    set고른것(q);
  };
  const [고른갈래, set고른갈래] = useState("전체");

  const 걸린것 = FAQ찾기(묶, 말);
  const 갈래목록 = 갈래들(묶)
    .filter((g) => 고른갈래 === "전체" || g === 고른갈래)
    .filter((g) => 걸린것.some((f) => f.갈래 === g));

  return (
    <div className="faq-board">
      {/* 갈래 탭 — 이름을 다 펼쳐 두어 훑어만 봐도 어디에 내 질문이
          있을지 짐작이 간다. */}
      <nav className="faq-tabs" aria-label="갈래">
        {["전체", ...갈래들(묶)].map((g, i) => (
          <Fragment key={g}>
            {i > 0 && <span className="faq-tabs-sep">|</span>}
            <button type="button"
                    className={`faq-tab${고른갈래 === g ? " on" : ""}`}
                    onClick={() => { set고른갈래(g); set열린것들(new Set()); set고른것(null); }}>
              {g}
            </button>
          </Fragment>
        ))}
      </nav>

      <label className="faq-search">
        <Search size={16} />
        <input value={말} onChange={(e) => set말(e.target.value)}
               placeholder="궁금한 것을 적어 보세요" />
      </label>

      {걸린것.length === 0 ? (
        <p className="faq-none">
          「{말}」에 대한 답을 못 찾았습니다. 아래 <b>1:1 문의</b>로 물어봐 주세요.
        </p>
      ) : (
        갈래목록.map((갈래) => (
          <section key={갈래} className="faq-group">
            {접기 && <h3 className="faq-group-t">{갈래}</h3>}
            <div className="faq-list">
              {걸린것.filter((f) => f.갈래 === 갈래).map((f) => {
                const 열림 = 열린것들.has(f.q);
                return (
                  <div key={f.q} className={`faq-item${고른것 === f.q ? " on" : ""}`}>
                    <button type="button" className="faq-question"
                            onClick={() => 토글(f.q)}
                            aria-expanded={열림}>
                      <span>{f.q}</span>
                      {열림 ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                    {열림 && (
                      <div className="faq-answer">
                        {Array.isArray(f.a)
                          ? <ul className="faq-answer-list">{f.a.map((line, i) => <li key={i}>{line}</li>)}</ul>
                          : f.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
