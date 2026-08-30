"use client";

import { useEffect, useState } from "react";
import { Clock, Calendar, MessageCircle, ChevronDown, X } from "lucide-react";

const DAY_OPTIONS = ["월", "화", "수", "목", "금", "토", "일"];
const HOUR_OPTIONS = Array.from({ length: 17 }, (_, i) => i + 7); // 7시~23시 — 매장·본사 공통 범위
const MIN_OPTIONS = [0, 30]; // 30분 단위만 — 매장 근무시간엔 이 이상 잘게 쪼갤 일이 없다
const FORMAT_EXAMPLES = ["월, 수 10시-18시 / 금 12시-20시", "평일 10시-18시, 토 10시-17시", "협의"];
const fmtT = (h: number, m: number) => (m ? `${h}시${m}분` : `${h}시`);

interface Props {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  popRef: React.RefObject<HTMLDivElement>;
  left: number;
  top: number;
  defaultStart?: number; // 매장 10시 / 본사 7시 — 빠른 선택 시간의 기본값
  defaultEnd?: number;   // 매장 20시 / 본사 19시
  /** 매장이면 요일을 못 박는 대신 '주 N일'로 받는다. 본사는 평일·주말 그대로. */
  store?: boolean;
}

// 근무요일/시간 — 원티드식 자유 문장으로. 요일 원형 버튼+시작·종료 시간을 팝오버
// 안에서 채우던 예전 구조는, 요일마다 시간이 다르면("월·수·금은 이 시간, 화·목은
// 저 시간") 근무시간 묶음을 몇 개나 만들어야 했다. 그 구조를 다 갖추는 대신
// "월, 수 10시-18시 / 금 12시-20시"처럼 문장 하나로 받는다. 빠른 선택은 그
// 문장을 만들어 주는 지름길일 뿐, 결국 값은 하나의 문자열이다.
// 처음엔 화면 가운데 뜨는 큰 모달로 만들었는데("윈도우창이 너무 크지 않나"),
// 다른 칸들과 같은 자리에서 뜨는 작은 팝오버로 접었다 — 다양한 입력 예시·안내
// 문구는 자리를 많이 먹어 한 줄 요약으로 줄였다.
// 배경은 다른 칸과 같은 흰색 — 보라는 "선택된" 빠른선택 항목 버튼에만 쓴다.
// "(협의)" 로 끝나면 시간은 정해 두고 조율 여지만 남긴 값이다.
// 그 꼬리를 떼어 draft(시간 부분)와 nego(체크 여부)로 나눈다.
type QuickType = "weeks" | "hours" | "weekday" | "weekend" | "custom" | "nego";
const WEEK_DAY_COUNTS = [2, 3, 4, 5, 6];
const splitNego = (v: string): [string, boolean] => {
  const m = (v || "").match(/^(.*?)\s*\(\+?협의\)$/s);
  return m ? [m[1], true] : [v || "", false];
};

export default function WorkScheduleModal({ value, onChange, onClose, popRef, left, top, defaultStart = 10, defaultEnd = 18, store = false }: Props) {
  const [tab, setTab] = useState<"quick" | "free">("quick");
  const [initDraft, initNego] = splitNego(value);
  const [draft, setDraft] = useState(initDraft);
  const [nego, setNego] = useState(initNego);
  const [quickType, setQuickType] = useState<QuickType | null>(null);
  const [qWeekDays, setQWeekDays] = useState(5);   // 매장: 주 몇 일
  const [qBiweekly, setQBiweekly] = useState(false); // 매장: 격주 가능
  const [qDays, setQDays] = useState<string[]>([]);
  const [qStart, setQStart] = useState(defaultStart);
  const [qStartMin, setQStartMin] = useState(0);
  const [qEnd, setQEnd] = useState(defaultEnd);
  const [qEndMin, setQEndMin] = useState(0);

  useEffect(() => { const [d, n] = splitNego(value); setDraft(d); setNego(n); }, [value]);

  const applyQuick = (type: QuickType, days: string[], startH: number, startM: number, endH: number, endM: number,
    weekDays = qWeekDays, biweekly = qBiweekly) => {
    setQuickType(type);
    if (type === "nego") { setDraft("협의"); return; }
    if (type === "custom" && days.length === 0) { setDraft(""); return; }
    // 매장은 어느 요일인지보다 주 몇 일 나오는지가 먼저다 — 요일은 매주 돌아가며 바뀐다.
    if (type === "hours") { setDraft(`${fmtT(startH, startM)} ~ ${fmtT(endH, endM)}`); return; }
    if (type === "weeks") {
      setDraft(`주 ${weekDays}일${biweekly ? " (격주 가능)" : ""}\n${fmtT(startH, startM)} ~ ${fmtT(endH, endM)}`);
      return;
    }
    // "평일"만 적으면 구직자가 정확히 어떤 요일인지 다시 물어야 했다. 어느 요일인지
    // 값 자체에 적어 둔다.
    const label = type === "weekday" ? "평일(월~금)" : type === "weekend" ? "주말(토~일)" : days.join(", ");
    // 요일과 시간을 한 줄에 붙이면 길어서 표·칸에서 줄바꿈 없이 한 줄로 늘어졌다
    // ("시간 줄바꿈 안되어 있어") — 요일 다음 줄에 시간을 따로 둔다.
    setDraft(`${label}\n${fmtT(startH, startM)} ~ ${fmtT(endH, endM)}`);
  };

  const toggleQDay = (d: string) => {
    const next = qDays.includes(d) ? qDays.filter((x) => x !== d) : [...qDays, d].sort((a, b) => DAY_OPTIONS.indexOf(a) - DAY_OPTIONS.indexOf(b));
    setQDays(next);
    applyQuick("custom", next, qStart, qStartMin, qEnd, qEndMin);
  };

  const quickRows: { type: QuickType; icon: any; label: string }[] = store
    ? [
        { type: "weeks", icon: Calendar, label: "주 N일 근무" },
        { type: "custom", icon: Calendar, label: "지정 요일" },
        { type: "nego", icon: MessageCircle, label: "협의" },
      ]
    // 본사는 주 5일 정시가 기본이라 요일을 고를 일이 없다 — 시간만 받는다.
    : [
        { type: "hours", icon: Clock, label: "근무시간" },
        { type: "nego", icon: MessageCircle, label: "협의" },
      ];

  return (
    <>
      <style>{`
        .ws-pop { position: fixed; z-index: 200; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); width: 320px; max-width: calc(100vw - 16px); box-sizing: border-box; overflow: hidden; }
        .ws-tabs { display: flex; gap: 4px; border-bottom: 1px solid #eee; padding: 8px 10px 0; }
        .ws-tab { padding: 6px 8px; margin-bottom: -1px; border: none; background: none; font-size: 13px; color: #999; cursor: pointer; border-bottom: 2px solid transparent; }
        .ws-tab.on { color: #582681; font-weight: 600; border-bottom-color: #582681; }
        .ws-body { padding: 10px; max-height: 60vh; overflow-y: auto; }
        .ws-quick-row { display: flex; align-items: center; gap: 6px; width: 100%; padding: 8px 9px; border: 1px solid #e3e3e6; border-radius: 8px; background: #fff; cursor: pointer; text-align: left; margin-bottom: 6px; font-size: 13px; color: #333; }
        .ws-quick-row.on { border-color: #582681; background: #582681; color: #fff; }
        .ws-quick-row:disabled { color: #c8c8ce; background: #fafafb; border-color: #f0f0f2; cursor: not-allowed; }
        .ws-quick-row:disabled svg { color: #d8d8de !important; }
        .ws-daychip { width: 26px; height: 26px; border-radius: 50%; font-size: 13px; cursor: pointer; border: 1px solid #ddd; background: #fff; color: #666; flex-shrink: 0; }
        .ws-daychip.on { border: 1.5px solid #582681; background: #582681; color: #fff; }
        .ws-weekchip { height: 30px; padding: 0 10px; border-radius: 7px; font-size: 13px; cursor: pointer; border: 1px solid #ddd; background: #fff; color: #666; flex-shrink: 0; font-family: inherit; }
        .ws-weekchip.on { border: 1.5px solid #582681; background: #582681; color: #fff; }
        .ws-hourSel { height: 30px; border: 1px solid #ddd; border-radius: 6px; padding: 0 4px; font-size: 13px; color: #333; background: #fff; }
        .ws-footer { display: flex; justify-content: flex-end; gap: 6px; padding: 8px 10px; border-top: 1px solid #eee; }
      `}</style>
      <div ref={popRef} className="ws-pop posshift-pop" style={{ left, top }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 10px 0" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#333" }}><Clock size={14} style={{ color: "#582681" }} />근무요일/시간</span>
          <button type="button" onClick={onClose} aria-label="닫기" style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", padding: 2 }}><X size={15} /></button>
        </div>

        {/* 직접 입력은 매장에만. 본사는 요일·시간이 정해져 있어 문장으로 적을 일이 없다. */}
        {store ? (
          <div className="ws-tabs">
            <button type="button" className={`ws-tab ${tab === "quick" ? "on" : ""}`} onClick={() => setTab("quick")}>빠른 선택</button>
            <button type="button" className={`ws-tab ${tab === "free" ? "on" : ""}`} onClick={() => setTab("free")}>직접 입력</button>
          </div>
        ) : (
          <div style={{ borderBottom: "1px solid #eee" }} />
        )}

        <div className="ws-body">
          {(tab === "quick" || !store) ? (
            <div>
              {quickRows.map((r) => {
                const on = quickType === r.type;
                return (
                  <div key={r.type}>
                    <button type="button" className={`ws-quick-row ${on ? "on" : ""}`}
                      disabled={quickType !== null && quickType !== r.type}
                      onClick={() => {
                        if (on) { setQuickType(null); setDraft(""); return; }
                        applyQuick(r.type, r.type === "custom" ? qDays : [], qStart, qStartMin, qEnd, qEndMin);
                      }}>
                      <r.icon size={13} style={{ color: on ? "#fff" : "#582681", flexShrink: 0 }} />{r.label}
                    </button>
                    {quickType === r.type && r.type !== "nego" && (
                      <div style={{ margin: "-2px 0 8px", padding: 9, background: "#f7f7f8", borderRadius: 8 }}>
                        {r.type === "custom" && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                            {DAY_OPTIONS.map((d) => (
                              <button key={d} type="button" className={`ws-daychip ${qDays.includes(d) ? "on" : ""}`} onClick={() => toggleQDay(d)}>{d}</button>
                            ))}
                          </div>
                        )}
                        {/* 매장은 주 몇 일 나오는지를 고른다 — 요일은 주마다 돌아가며 바뀐다. */}
                        {r.type === "weeks" && (
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 5, marginBottom: 8 }}>
                            {WEEK_DAY_COUNTS.map((n) => (
                              <button key={n} type="button" className={`ws-weekchip ${qWeekDays === n ? "on" : ""}`}
                                onClick={() => { setQWeekDays(n); applyQuick("weeks", [], qStart, qStartMin, qEnd, qEndMin, n, qBiweekly); }}>
                                주 {n}일
                              </button>
                            ))}
                            <label style={{ display: "inline-flex", alignItems: "center", gap: 5, marginLeft: 4, fontSize: 13, color: "#555", cursor: "pointer", whiteSpace: "nowrap" }}>
                              <input type="checkbox" checked={qBiweekly}
                                onChange={(e) => { setQBiweekly(e.target.checked); applyQuick("weeks", [], qStart, qStartMin, qEnd, qEndMin, qWeekDays, e.target.checked); }}
                                style={{ width: 13, height: 13, margin: 0, accentColor: "#582681" }} />
                              격주 가능
                            </label>
                          </div>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                          <select className="ws-hourSel" value={qStart} onChange={(e) => { const s = Number(e.target.value); setQStart(s); applyQuick(r.type, r.type === "custom" ? qDays : [], s, qStartMin, qEnd, qEndMin); }}>
                            {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}시</option>)}
                          </select>
                          <select className="ws-hourSel" value={qStartMin} onChange={(e) => { const m = Number(e.target.value); setQStartMin(m); applyQuick(r.type, r.type === "custom" ? qDays : [], qStart, m, qEnd, qEndMin); }}>
                            {MIN_OPTIONS.map((m) => <option key={m} value={m}>{m}분</option>)}
                          </select>
                          <span style={{ color: "#888", fontSize: 13 }}>~</span>
                          <select className="ws-hourSel" value={qEnd} onChange={(e) => { const en = Number(e.target.value); setQEnd(en); applyQuick(r.type, r.type === "custom" ? qDays : [], qStart, qStartMin, en, qEndMin); }}>
                            {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}시</option>)}
                          </select>
                          <select className="ws-hourSel" value={qEndMin} onChange={(e) => { const m = Number(e.target.value); setQEndMin(m); applyQuick(r.type, r.type === "custom" ? qDays : [], qStart, qStartMin, qEnd, m); }}>
                            {MIN_OPTIONS.map((m) => <option key={m} value={m}>{m}분</option>)}
                          </select>
                        </div>
                        {/* 조율 여지는 시간에 걸리는 값이라 시간 바로 밑, 이 카드 안에 둔다.
                            팝오버 맨 아래에 두면 어느 항목에 걸리는지 자리로 알 수 없었다. */}
                        <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13, color: "#555", cursor: "pointer" }}>
                          <input type="checkbox" checked={nego} onChange={(e) => setNego(e.target.checked)}
                            style={{ width: 13, height: 13, margin: 0, accentColor: "#582681" }} />
                          협의 가능
                        </label>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div>
              {/* 요일마다 시간이 다르면 줄바꿈으로 나눠 적는다("월, 수 10시-18시"
                  엔터 "금 12시-20시") — "/"도 예전처럼 계속 인식한다. */}
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3}
                placeholder={"예) 월, 수 10시-18시\n금 12시-20시 (줄바꿈으로 구분)"}
                style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 7, padding: "7px 9px", fontSize: 13, marginBottom: 8, fontFamily: "inherit", resize: "vertical" }} />
              <ul style={{ margin: 0, paddingLeft: 16 }}>
                {FORMAT_EXAMPLES.map((ex) => (
                  <li key={ex} style={{ fontSize: 13, color: "#888", lineHeight: 1.8, cursor: "pointer", whiteSpace: "pre-line" }}
                    onClick={() => setDraft(ex.replace(/\s*\/\s*/g, "\n"))}>{ex}</li>
                ))}
              </ul>
            </div>
          )}
          {/* 직접 입력에는 카드가 없으니 여기 둔다. 빠른 선택은 고른 카드 안에 있다. */}
          {tab === "free" && store && draft.trim() && draft.trim() !== "협의" && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 13, color: "#555", cursor: "pointer" }}>
              <input type="checkbox" checked={nego} onChange={(e) => setNego(e.target.checked)}
                style={{ width: 13, height: 13, margin: 0, accentColor: "#582681" }} />
              협의 가능
            </label>
          )}
        </div>

        <div className="ws-footer">
          <button type="button" onClick={onClose} style={{ border: "1px solid #ddd", background: "#fff", color: "#666", borderRadius: 7, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>취소</button>
          <button type="button" onClick={() => { const t = draft.trim(); onChange(t && nego && t !== "협의" ? `${t} (협의)` : t); onClose(); }} className="company-primary-btn" style={{ borderRadius: 7, padding: "6px 12px", fontSize: 13 }}>적용</button>
        </div>
      </div>
    </>
  );
}
