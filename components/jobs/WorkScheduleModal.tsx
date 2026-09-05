"use client";

import { useEffect, useRef, useState } from "react";
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
  // 「주 5~6일」처럼 걸쳐 뽑는 매장이 많다 — 하나만 고르게 하면 그런 자리를 못 적는다.
  const [qWeekDays, setQWeekDays] = useState<number[]>([5]);
  const [qBiweekly, setQBiweekly] = useState(false); // 매장: 격주 가능
  const [qDays, setQDays] = useState<string[]>([]);
  const [qStart, setQStart] = useState(defaultStart);
  const [qStartMin, setQStartMin] = useState(0);
  const [qEnd, setQEnd] = useState(defaultEnd);
  const [qEndMin, setQEndMin] = useState(0);
  // 주말에 나오는지부터 묻는다. 「주 5일」만으로는 평일 5일인지 평일 4일＋토인지
  // 알 수 없고, 주말 시간이 다른 매장이 많아 시간 줄도 여기서 갈린다.
  const [q주말, setQ주말] = useState<string[]>([]);
  const [q주말시작, setQ주말시작] = useState(9);
  const [q주말시작분, setQ주말시작분] = useState(0);
  const [q주말끝, setQ주말끝] = useState(16);
  const [q주말끝분, setQ주말끝분] = useState(0);

  useEffect(() => { const [d, n] = splitNego(value); setDraft(d); setNego(n); }, [value]);

  // 다시 열었을 때 눌린 것이 풀려 있지 않게, 저장된 문장에서 상태를 되짚는다.
  // (값만 읽고 빠른 선택 상태를 안 읽어 격주·주 일수·주말이 매번 초기화됐다.)
  const 되짚음 = useRef(false);
  useEffect(() => {
    if (되짚음.current) return;
    되짚음.current = true;
    const [본문] = splitNego(value);
    if (!본문.trim()) return;
    const [첫줄, ...나머지] = 본문.split("\n");

    if (첫줄.includes("협의") && !첫줄.includes("주 ")) { setQuickType("nego"); return; }

    // 주 N일 / 주 N~M일 / 주 N·M일
    const 일수 = 첫줄.match(/주\s*([\d~·,]+)\s*일/);
    if (일수) {
      const 값 = 일수[1];
      let ns: number[] = [];
      const 물결 = 값.match(/^(\d+)~(\d+)$/);
      if (물결) { for (let i = Number(물결[1]); i <= Number(물결[2]); i++) ns.push(i); }
      else ns = 값.split(/[·,]/).map(Number).filter((n) => n > 0);
      if (ns.length) setQWeekDays(ns);
      setQuickType("weeks");
    } else if (/^(평일|주말)\(/.test(첫줄)) {
      setQuickType(첫줄.startsWith("평일") ? "weekday" : "weekend");
    } else if (첫줄.includes("근무") && /[토일]/.test(첫줄)) {
      setQuickType("weeks");
    } else if (/^\d/.test(첫줄)) {
      setQuickType("hours");
    } else if (첫줄.trim()) {
      setQuickType("custom");
      setQDays(첫줄.split(/[,·]/).map((x) => x.trim()).filter((x) => DAY_OPTIONS.includes(x)));
    }

    if (첫줄.includes("격주")) setQBiweekly(true);
    const 주말괄호 = (첫줄.match(/\+\s*([^)]*)\)/) || [])[1] || "";
    const 주말머리 = /근무/.test(첫줄) ? 첫줄.split("근무")[0] : "";
    const 주말 = ["토", "일"].filter((d) => 주말괄호.includes(d) || 주말머리.includes(d));
    if (주말.length) setQ주말(주말);

    // 시간 줄들. "평일 10:30 ~ 19:30" / "토 9:00 ~ 16:00" / "10:30 ~ 19:30"
    const 시분 = (t: string) => { const [h, m] = t.split(":").map(Number); return [h, m || 0] as const; };
    for (const 줄 of 나머지) {
      const m = 줄.match(/(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/);
      if (!m) continue;
      const [sh, sm] = 시분(m[1]);
      const [eh, em] = 시분(m[2]);
      if (/^(토|일)/.test(줄.trim())) { setQ주말시작(sh); setQ주말시작분(sm); setQ주말끝(eh); setQ주말끝분(em); }
      else { setQStart(sh); setQStartMin(sm); setQEnd(eh); setQEndMin(em); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 주말에 나오면 시간 줄이 둘로 갈린다. 무엇이 평일 시간인지 알 수 있게 앞줄에도
  // '평일'을 적는다 — 시간 두 줄만 있으면 어느 게 어느 요일인지 모른다.
  const 시간줄 = (startH: number, startM: number, endH: number, endM: number, 주말 = q주말, weekDays: number[] = qWeekDays) => {
    if (!주말.length) return `${fmtT(startH, startM)} ~ ${fmtT(endH, endM)}`;
    const 주말시간 = `${주말.join("·")} ${fmtT(q주말시작, q주말시작분)} ~ ${fmtT(q주말끝, q주말끝분)}`;
    // 평일에 안 나오는 자리(주말 알바)는 평일 시간을 적지 않는다.
    if ((weekDays.length ? Math.min(...weekDays) : 0) - 주말.length <= 0) return 주말시간;
    return `평일 ${fmtT(startH, startM)} ~ ${fmtT(endH, endM)}\n${주말시간}`;
  };

  // 「주 5일 · 평일 4일＋토」처럼 요일 구성을 적는다. 평일 일수는 주 N일에서
  // 고른 주말 수를 뺀 값이라 따로 묻지 않는다.
  // 고른 일수를 한 마디로. 이어진 수는 물결로 묶는다(5,6 → 5~6).
  const 일수말 = (ns: number[]) => {
    const a = [...ns].sort((x, y) => x - y);
    if (!a.length) return "";
    const 이어짐 = a.every((n, i) => i === 0 || n === a[i - 1] + 1);
    return a.length === 1 ? `${a[0]}` : 이어짐 ? `${a[0]}~${a[a.length - 1]}` : a.join("·");
  };
  const 요일줄 = (weekDays: number[], biweekly: boolean, 주말 = q주말) => {
    const 격주 = biweekly ? " (격주 가능)" : "";
    const 말 = 일수말(weekDays);
    if (!말) return `요일 협의${격주}`;
    if (!주말.length) return `주 ${말}일${격주}`;
    // 평일 수는 가장 적게 나오는 주 기준으로 적는다 — 「주 5~6일 (평일 4일 + 토)」.
    const 평일 = Math.min(...weekDays) - 주말.length;
    if (평일 <= 0) return `${주말.join("·")} 근무${격주}`;
    return `주 ${말}일 (평일 ${평일}일 + ${주말.join("·")})${격주}`;
  };

  // 주말 요일·시간이 바뀔 때 값을 다시 만든다. 상태 반영은 다음 렌더라 새 값을 직접 받는다.
  const 주말반영 = (type: QuickType, sh: number, sm: number, eh: number, em: number, 주말 = q주말) => {
    const 주말시간 = `${주말.join("·")} ${fmtT(sh, sm)} ~ ${fmtT(eh, em)}`;
    const 줄 = !주말.length
      ? `${fmtT(qStart, qStartMin)} ~ ${fmtT(qEnd, qEndMin)}`
      : ((qWeekDays.length ? Math.min(...qWeekDays) : 0) - 주말.length <= 0
          ? 주말시간
          : `평일 ${fmtT(qStart, qStartMin)} ~ ${fmtT(qEnd, qEndMin)}\n${주말시간}`);
    if (type === "weeks") setDraft(`${요일줄(qWeekDays, qBiweekly, 주말)}\n${줄}`);
    else if (type === "hours") setDraft(줄);
    else {
      const label = type === "weekday" ? "평일(월~금)" : type === "weekend" ? "주말(토~일)" : qDays.join(", ");
      setDraft(`${label}\n${줄}`);
    }
  };

  const applyQuick = (type: QuickType, days: string[], startH: number, startM: number, endH: number, endM: number,
    weekDays: number[] = qWeekDays, biweekly = qBiweekly) => {
    setQuickType(type);
    if (type === "nego") { setDraft("협의"); return; }
    if (type === "custom" && days.length === 0) { setDraft(""); return; }
    // 매장은 어느 요일인지보다 주 몇 일 나오는지가 먼저다 — 요일은 매주 돌아가며 바뀐다.
    if (type === "hours") { setDraft(시간줄(startH, startM, endH, endM)); return; }
    if (type === "weeks") {
      setDraft(`${요일줄(weekDays, biweekly)}\n${시간줄(startH, startM, endH, endM)}`);
      return;
    }
    // "평일"만 적으면 구직자가 정확히 어떤 요일인지 다시 물어야 했다. 어느 요일인지
    // 값 자체에 적어 둔다.
    const label = type === "weekday" ? "평일(월~금)" : type === "weekend" ? "주말(토~일)" : days.join(", ");
    // 요일과 시간을 한 줄에 붙이면 길어서 표·칸에서 줄바꿈 없이 한 줄로 늘어졌다
    // ("시간 줄바꿈 안되어 있어") — 요일 다음 줄에 시간을 따로 둔다.
    setDraft(`${label}\n${시간줄(startH, startM, endH, endM)}`);
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
        .ws-quick-row { display: flex; align-items: center; gap: 6px; width: 100%; padding: 8px 9px; border: 1px solid #e3e3e6; border-radius: 8px; background: #fff; cursor: pointer; text-align: left; margin-bottom: 6px; font-size: 13px; color: #555; }
        .ws-quick-row.on { border-color: #582681; background: #582681; color: #fff; }
        .ws-quick-row:disabled { color: #c8c8ce; background: #fafafb; border-color: #f0f0f2; cursor: not-allowed; }
        .ws-quick-row:disabled svg { color: #d8d8de !important; }
        .ws-daychip { width: 26px; height: 26px; border-radius: 50%; font-size: 13px; cursor: pointer; border: 1px solid #ddd; background: #fff; color: #666; flex-shrink: 0; }
        .ws-daychip.on { border: 1.5px solid #582681; background: #582681; color: #fff; }
        .ws-weekchip { height: 30px; padding: 0 10px; border-radius: 7px; font-size: 13px; cursor: pointer; border: 1px solid #ddd; background: #fff; color: #666; flex-shrink: 0; font-family: inherit; }
        .ws-weekchip.on { border: 1.5px solid #582681; background: #582681; color: #fff; }
        .ws-hourSel { height: 30px; border: 1px solid #ddd; border-radius: 6px; padding: 0 4px; font-size: 13px; color: #555; background: #fff; }
        .ws-footer { display: flex; justify-content: flex-end; gap: 6px; padding: 8px 10px; border-top: 1px solid #eee; }
      `}</style>
      <div ref={popRef} className="ws-pop posshift-pop" style={{ left, top }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 10px 0" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "#555" }}><Clock size={14} style={{ color: "#582681" }} />근무요일/시간</span>
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
                              <button key={n} type="button" className={`ws-weekchip ${qWeekDays.includes(n) ? "on" : ""}`}
                                onClick={() => {
                                  const 다음 = qWeekDays.includes(n) ? qWeekDays.filter((x) => x !== n) : [...qWeekDays, n].sort((a, b) => a - b);
                                  setQWeekDays(다음);
                                  applyQuick("weeks", [], qStart, qStartMin, qEnd, qEndMin, 다음, qBiweekly);
                                }}>
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
                        {/* 「주 5일」만으로는 평일 5일인지 평일 4일＋토인지 알 수 없다.
                            주말에 나오는지부터 묻고, 고르면 그 요일 시간 줄이 따라 선다 —
                            주말 시간이 다른 매장이 많아 어차피 갈려야 한다. */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 12.5, color: "#888" }}>주말 근무</span>
                          {["토", "일"].map((d) => {
                            const on = q주말.includes(d);
                            return (
                              <button key={d} type="button" className={`ws-daychip ${on ? "on" : ""}`}
                                onClick={() => {
                                  const 다음 = on ? q주말.filter((x) => x !== d) : [...q주말, d].sort((a, b) => (a === "토" ? -1 : 1));
                                  setQ주말(다음);
                                  주말반영(r.type, q주말시작, q주말시작분, q주말끝, q주말끝분, 다음);
                                }}>{d}</button>
                            );
                          })}
                          {q주말.length === 0 && <span style={{ fontSize: 12, color: "#b8b8be" }}>안 하면 비워 두세요</span>}
                        </div>
                        {q주말.length > 0 && (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                            <span style={{ fontSize: 12.5, color: "#888", marginRight: 2 }}>{q주말.join("·")}</span>
                            <select className="ws-hourSel" value={q주말시작} onChange={(e) => { const v = Number(e.target.value); setQ주말시작(v); 주말반영(r.type, v, q주말시작분, q주말끝, q주말끝분); }}>
                              {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}시</option>)}
                            </select>
                            <select className="ws-hourSel" value={q주말시작분} onChange={(e) => { const v = Number(e.target.value); setQ주말시작분(v); 주말반영(r.type, q주말시작, v, q주말끝, q주말끝분); }}>
                              {MIN_OPTIONS.map((m) => <option key={m} value={m}>{m}분</option>)}
                            </select>
                            <span style={{ color: "#888", fontSize: 13 }}>~</span>
                            <select className="ws-hourSel" value={q주말끝} onChange={(e) => { const v = Number(e.target.value); setQ주말끝(v); 주말반영(r.type, q주말시작, q주말시작분, v, q주말끝분); }}>
                              {HOUR_OPTIONS.map((h) => <option key={h} value={h}>{h}시</option>)}
                            </select>
                            <select className="ws-hourSel" value={q주말끝분} onChange={(e) => { const v = Number(e.target.value); setQ주말끝분(v); 주말반영(r.type, q주말시작, q주말시작분, q주말끝, v); }}>
                              {MIN_OPTIONS.map((m) => <option key={m} value={m}>{m}분</option>)}
                            </select>
                          </div>
                        )}
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
