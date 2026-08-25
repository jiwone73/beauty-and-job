"use client";

import { useEffect, useState } from "react";
import { Clock, Calendar, MessageCircle, ChevronDown, X } from "lucide-react";

const DAY_OPTIONS = ["월", "화", "수", "목", "금", "토", "일"];
const HOUR_OPTIONS = Array.from({ length: 19 }, (_, i) => i + 6); // 6시~24시
const FORMAT_EXAMPLES = ["월, 수 10시-18시 / 금 12시-20시", "평일 10시-18시, 토 10시-17시", "협의"];

interface Props {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  popRef: React.RefObject<HTMLDivElement>;
  left: number;
  top: number;
}

// 근무요일/시간 — 원티드식 자유 문장으로. 요일 원형 버튼+시작·종료 시간을 팝오버
// 안에서 채우던 예전 구조는, 요일마다 시간이 다르면("월·수·금은 이 시간, 화·목은
// 저 시간") 근무시간 묶음을 몇 개나 만들어야 했다. 그 구조를 다 갖추는 대신
// "월, 수 10시-18시 / 금 12시-20시"처럼 문장 하나로 받는다. 빠른 선택은 그
// 문장을 만들어 주는 지름길일 뿐, 결국 값은 하나의 문자열이다.
// 처음엔 화면 가운데 뜨는 큰 모달로 만들었는데("윈도우창이 너무 크지 않나"),
// 다른 칸들과 같은 자리에서 뜨는 작은 팝오버로 접었다 — 다양한 입력 예시·안내
// 문구는 자리를 많이 먹어 한 줄 요약으로 줄였다.
// "(협의)"/"(+협의)" 로 끝나면 시간은 정해 두고 조율 여지만 남긴 값이다.
// 그 꼬리를 떼어 draft(시간 부분)와 nego(체크 여부)로 나눈다.
const splitNego = (v: string): [string, boolean] => {
  const m = (v || "").match(/^(.*?)\s*\(\+?협의\)$/s);
  return m ? [m[1], true] : [v || "", false];
};

export default function WorkScheduleModal({ value, onChange, onClose, popRef, left, top }: Props) {
  const [tab, setTab] = useState<"quick" | "free">("quick");
  const [initDraft, initNego] = splitNego(value);
  const [draft, setDraft] = useState(initDraft);
  const [nego, setNego] = useState(initNego);
  const [quickType, setQuickType] = useState<"weekday" | "weekend" | "custom" | "nego" | null>(null);
  const [qDays, setQDays] = useState<string[]>([]);
  const [qStart, setQStart] = useState(10);
  const [qEnd, setQEnd] = useState(18);

  useEffect(() => { const [d, n] = splitNego(value); setDraft(d); setNego(n); }, [value]);

  const applyQuick = (type: "weekday" | "weekend" | "custom" | "nego", days: string[], start: number, end: number) => {
    setQuickType(type);
    if (type === "nego") { setDraft("협의"); return; }
    if (type === "custom" && days.length === 0) { setDraft(""); return; }
    const label = type === "weekday" ? "평일" : type === "weekend" ? "주말" : days.join(", ");
    setDraft(`${label} ${start}시-${end}시`);
  };

  const toggleQDay = (d: string) => {
    const next = qDays.includes(d) ? qDays.filter((x) => x !== d) : [...qDays, d].sort((a, b) => DAY_OPTIONS.indexOf(a) - DAY_OPTIONS.indexOf(b));
    setQDays(next);
    applyQuick("custom", next, qStart, qEnd);
  };

  const quickRows: { type: "weekday" | "weekend" | "custom" | "nego"; icon: any; label: string }[] = [
    { type: "weekday", icon: Calendar, label: "평일 (월~금)" },
    { type: "weekend", icon: Calendar, label: "주말 (토~일)" },
    { type: "custom", icon: Calendar, label: "지정 요일" },
    { type: "nego", icon: MessageCircle, label: "협의" },
  ];

  return (
    <>
      <style>{`
        .ws-pop { position: fixed; z-index: 200; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); width: 320px; max-width: calc(100vw - 16px); box-sizing: border-box; overflow: hidden; }
        .ws-tabs { display: flex; gap: 4px; border-bottom: 1px solid #f0f0f0; padding: 8px 10px 0; }
        .ws-tab { padding: 6px 8px; margin-bottom: -1px; border: none; background: none; font-size: 12.5px; color: #999; cursor: pointer; border-bottom: 2px solid transparent; }
        .ws-tab.on { color: #582681; font-weight: 600; border-bottom-color: #582681; }
        .ws-body { padding: 10px; max-height: 60vh; overflow-y: auto; }
        .ws-quick-row { display: flex; align-items: center; gap: 6px; width: 100%; padding: 8px 9px; border: 1px solid #efeff1; border-radius: 8px; background: #fff; cursor: pointer; text-align: left; margin-bottom: 6px; font-size: 12.5px; color: #333; }
        .ws-quick-row.on { border-color: #582681; background: #faf8fd; }
        .ws-daychip { width: 24px; height: 24px; border-radius: 50%; font-size: 11px; cursor: pointer; border: 1px solid #ddd; background: #fff; color: #666; flex-shrink: 0; }
        .ws-daychip.on { border: 1.5px solid #582681; background: #582681; color: #fff; }
        .ws-hourSel { height: 28px; border: 1px solid #ddd; border-radius: 6px; padding: 0 4px; font-size: 12px; color: #333; background: #fff; }
        .ws-footer { display: flex; justify-content: flex-end; gap: 6px; padding: 8px 10px; border-top: 1px solid #f0f0f0; }
      `}</style>
      <div ref={popRef} className="ws-pop posshift-pop" style={{ left, top }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 10px 0" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#333" }}><Clock size={14} style={{ color: "#582681" }} />근무요일/시간</span>
          <button type="button" onClick={onClose} aria-label="닫기" style={{ background: "none", border: "none", color: "#bbb", cursor: "pointer", padding: 2 }}><X size={15} /></button>
        </div>

        <div className="ws-tabs">
          <button type="button" className={`ws-tab ${tab === "quick" ? "on" : ""}`} onClick={() => setTab("quick")}>빠른 선택</button>
          <button type="button" className={`ws-tab ${tab === "free" ? "on" : ""}`} onClick={() => setTab("free")}>직접 입력</button>
        </div>

        <div className="ws-body">
          {tab === "quick" ? (
            <div>
              {quickRows.map((r) => (
                <div key={r.type}>
                  <button type="button" className={`ws-quick-row ${quickType === r.type ? "on" : ""}`}
                    onClick={() => r.type === "custom" ? applyQuick("custom", qDays, qStart, qEnd) : applyQuick(r.type, [], qStart, qEnd)}>
                    <r.icon size={13} style={{ color: "#582681", flexShrink: 0 }} />{r.label}
                  </button>
                  {quickType === r.type && r.type !== "nego" && (
                    <div style={{ margin: "-2px 0 8px", padding: 9, background: "#faf8fd", borderRadius: 8 }}>
                      {r.type === "custom" && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                          {DAY_OPTIONS.map((d) => (
                            <button key={d} type="button" className={`ws-daychip ${qDays.includes(d) ? "on" : ""}`} onClick={() => toggleQDay(d)}>{d}</button>
                          ))}
                        </div>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <select className="ws-hourSel" value={qStart} onChange={(e) => { const s = Number(e.target.value); setQStart(s); applyQuick(r.type, r.type === "custom" ? qDays : [], s, qEnd); }}>
                          {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}시</option>)}
                        </select>
                        <span style={{ color: "#888", fontSize: 12 }}>~</span>
                        <select className="ws-hourSel" value={qEnd} onChange={(e) => { const en = Number(e.target.value); setQEnd(en); applyQuick(r.type, r.type === "custom" ? qDays : [], qStart, en); }}>
                          {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}시</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div>
              {/* 요일마다 시간이 다르면 줄바꿈으로 나눠 적는다("월, 수 10시-18시"
                  엔터 "금 12시-20시") — "/"도 예전처럼 계속 인식한다. */}
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3}
                placeholder={"예) 월, 수 10시-18시\n금 12시-20시 (줄바꿈으로 구분)"}
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 7, padding: "7px 9px", fontSize: 12.5, marginBottom: 8, fontFamily: "inherit", resize: "vertical" }} />
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {FORMAT_EXAMPLES.map((ex) => (
                  <li key={ex} style={{ fontSize: 11.5, color: "#9a94a4", lineHeight: 1.8, cursor: "pointer", whiteSpace: "pre-line" }}
                    onClick={() => setDraft(ex.replace(/\s*\/\s*/g, "\n"))}>{ex}</li>
                ))}
              </ul>
            </div>
          )}
          {/* 시간은 정해 두고도 조율 여지를 남기고 싶을 때. 값을 지우고 '협의'로
              바꿔치기하는 것과 달리, 시간은 그대로 두고 "(+협의)"만 붙는다. */}
          {draft.trim() && draft.trim() !== "협의" && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12, color: "#555", cursor: "pointer" }}>
              <input type="checkbox" checked={nego} onChange={(e) => setNego(e.target.checked)}
                style={{ width: 13, height: 13, margin: 0, accentColor: "#582681" }} />
              협의 가능 (시간은 두고 조율 여지만 표시)
            </label>
          )}
        </div>

        <div className="ws-footer">
          <button type="button" onClick={onClose} style={{ border: "1px solid #e3e3e6", background: "#fff", color: "#666", borderRadius: 7, padding: "6px 12px", fontSize: 12.5, cursor: "pointer" }}>취소</button>
          <button type="button" onClick={() => { const t = draft.trim(); onChange(t && nego && t !== "협의" ? `${t} (+협의)` : t); onClose(); }} style={{ border: "none", background: "#582681", color: "#fff", borderRadius: 7, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>적용</button>
        </div>
      </div>
    </>
  );
}
