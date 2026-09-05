"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  getJobGroups,
  getJobSubGroups,
  searchJobItems,
  isValidJobItem,
  type JobType,
  type JobSearchResult,
} from "@/lib/data/jobGroups";

// 정해진 직군 목록에 없는 자리는 여기서 직접 입력(기타)
const OTHER_GROUP = "기타 · 직접 입력";

interface Props {
  open: boolean;
  jobType: JobType;              // "OFFICE" | "STORE" — 초기/기본 활성 트랙
  selected: string[];           // 단일 트랙 모드용 (enableToggle 미사용 시)
  onChange: (next: string[]) => void;
  onClose: () => void;
  title?: string;
  maxSelect?: number;           // 미지정 시 무제한
  // ── 이중 트랙(토글) 모드 ──
  enableToggle?: boolean;                       // true면 매장/사무 토글 노출
  storeSelected?: string[];                     // 매장 트랙 선택값 (skillAreas)
  officeSelected?: string[];                    // 사무 트랙 선택값 (officeJobAreas)
  onChangeStore?: (next: string[]) => void;
  onChangeOffice?: (next: string[]) => void;
  // ── 인재 구분(매장/본사) 헤더 라디오 (인재검색용) ──
  showTrackToggle?: boolean;                    // true면 헤더에 인재 구분 라디오 노출
  onTrackChange?: (t: JobType) => void;         // 구분 변경 시 부모 활성 트랙 전환
}

export default function JobGroupSelectModal({
  open,
  jobType,
  selected,
  onChange,
  onClose,
  title = "직군 선택",
  maxSelect,
  enableToggle,
  storeSelected,
  officeSelected,
  onChangeStore,
  onChangeOffice,
  showTrackToggle,
  onTrackChange,
}: Props) {
  const [activeType, setActiveType] = useState<JobType>(jobType);
  const groups = getJobGroups(activeType);
  const [activeGroup, setActiveGroup] = useState<string>(groups[0]?.group ?? "");

  // ── 실시간 추천검색 ──
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);

  // 열릴 때 활성 트랙을 기본값(잡타입)으로 초기화 + 검색 초기화
  useEffect(() => {
    if (!open) return;
    setActiveType(jobType);
    setQuery("");
    setActiveIdx(0);
  }, [open, jobType]);

  // 활성 트랙이 바뀌면 대분류 초기화
  useEffect(() => {
    setActiveGroup(getJobGroups(activeType)[0]?.group ?? "");
  }, [activeType]);

  // 현재 활성 트랙 기준 선택값·변경함수
  const curSelected = enableToggle
    ? activeType === "STORE"
      ? storeSelected ?? []
      : officeSelected ?? []
    : selected;
  const curOnChange = enableToggle
    ? (activeType === "STORE" ? onChangeStore : onChangeOffice) ?? (() => {})
    : onChange;

  const subItems = getJobSubGroups(activeType, activeGroup);

  const toggleItem = (item: string) => {
    if (curSelected.includes(item)) {
      curOnChange(curSelected.filter((s) => s !== item));
    } else {
      if (maxSelect && curSelected.length >= maxSelect) {
        alert(`최대 ${maxSelect}개까지 선택할 수 있어요.`);
        return;
      }
      curOnChange([...curSelected, item]);
    }
  };

  // ── 기타(직접 입력) — 목록에 없는 자리를 자유롭게 추가 ──
  const [customText, setCustomText] = useState("");
  // 직접 입력값 = 현재 트랙 직군 목록에 없는 선택값(이중 트랙 모드에선 미사용)
  const isCustom = (item: string) => !enableToggle && !isValidJobItem(activeType, item);
  const customItems = enableToggle ? [] : curSelected.filter((i) => !isValidJobItem(activeType, i));
  const addCustom = () => {
    const v = customText.trim();
    if (!v) return;
    if (curSelected.includes(v)) { setCustomText(""); return; }
    if (maxSelect && curSelected.length >= maxSelect) {
      alert(`최대 ${maxSelect}개까지 선택할 수 있어요.`);
      return;
    }
    curOnChange([...curSelected, v]);
    setCustomText("");
  };

  // ── 추천검색 결과 (단일 트랙 모드면 현재 트랙만, 이중 트랙이면 매장·본사 전체) ──
  const searchTrack = enableToggle ? undefined : activeType;
  const results = useMemo<JobSearchResult[]>(
    () => (query.trim() ? searchJobItems(query, searchTrack, 8) : []),
    [query, searchTrack]
  );
  const showDropdown = query.trim().length > 0;

  const isItemSelected = (track: JobType, item: string) =>
    enableToggle
      ? (track === "STORE" ? storeSelected ?? [] : officeSelected ?? []).includes(item)
      : selected.includes(item);

  const addItemToTrack = (track: JobType, item: string) => {
    if (enableToggle) {
      const cur = track === "STORE" ? storeSelected ?? [] : officeSelected ?? [];
      const chg = track === "STORE" ? onChangeStore : onChangeOffice;
      if (cur.includes(item)) return;
      if (maxSelect && cur.length >= maxSelect) {
        alert(`최대 ${maxSelect}개까지 선택할 수 있어요.`);
        return;
      }
      chg?.([...cur, item]);
    } else {
      if (selected.includes(item)) return;
      if (maxSelect && selected.length >= maxSelect) {
        alert(`최대 ${maxSelect}개까지 선택할 수 있어요.`);
        return;
      }
      onChange([...selected, item]);
    }
  };

  // 추천 항목 클릭: 해당 트랙·대분류로 이동하고, 소분류면 선택에 추가
  const selectResult = (r: JobSearchResult) => {
    if (enableToggle && r.jobType !== activeType) {
      setActiveType(r.jobType);
      onTrackChange?.(r.jobType);
    }
    setActiveGroup(r.group);
    if (r.item) addItemToTrack(r.jobType, r.item);
    setQuery("");
    setActiveIdx(0);
  };

  const onSearchKey = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[activeIdx] ?? results[0];
      if (r) selectResult(r);
    } else if (e.key === "Escape") {
      setQuery("");
    }
  };

  // 칩: 이중 트랙이면 두 트랙 모두 표시
  const chips: { item: string; track: JobType }[] = enableToggle
    ? [
        ...(storeSelected ?? []).map((i) => ({ item: i, track: "STORE" as JobType })),
        ...(officeSelected ?? []).map((i) => ({ item: i, track: "OFFICE" as JobType })),
      ]
    : selected.map((i) => ({ item: i, track: jobType }));

  const removeChip = (item: string, track: JobType) => {
    if (!enableToggle) {
      onChange(selected.filter((s) => s !== item));
      return;
    }
    if (track === "STORE") onChangeStore?.((storeSelected ?? []).filter((s) => s !== item));
    else onChangeOffice?.((officeSelected ?? []).filter((s) => s !== item));
  };

  const clearAll = () => curOnChange([]);
  const totalCount = enableToggle
    ? (storeSelected?.length ?? 0) + (officeSelected?.length ?? 0)
    : selected.length;

  // 대분류별 선택 개수 (왼쪽 배지)
  const countInGroup = (g: string) =>
    getJobSubGroups(activeType, g).filter((i) => curSelected.includes(i)).length;

  return (
    <>
      <style>{`
        .jgm-backdrop {
          position: fixed; inset: 0; z-index: 1000;
          background: rgba(0,0,0,0.45);
          display: flex; align-items: center; justify-content: center;
          animation: jgmFade 0.18s ease;
        }
        .jgm-sheet {
          background: #fff; width: 600px; max-width: 92vw;
          max-height: 82vh; border-radius: 16px;
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 12px 40px rgba(0,0,0,0.18);
          animation: jgmPop 0.2s ease;
        }
        .jgm-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 20px; border-bottom: 1px solid #f0f0f0; flex-shrink: 0;
        }
        .jgm-title { font-size: 17px; font-weight: 400; color: #222; flex-shrink: 0; }
        .jgm-track { display: inline-flex; align-items: center; gap: 14px; }
        .jgm-track-label { font-size: 13px; color: #999; }
        .jgm-track-radio { display: inline-flex; align-items: center; gap: 5px; font-size: 14px; cursor: pointer; }
        .jgm-close {
          background: none; border: none; font-size: 22px; line-height: 1;
          color: #999; cursor: pointer; padding: 0 4px;
        }
        .jgm-toggle { display: flex; gap: 8px; padding: 12px 20px 2px; flex-shrink: 0; }
        .jgm-toggle button {
          flex: 1; padding: 9px; border-radius: 9px; border: 1px solid #efeff1;
          background: #fff; color: #888; font-size: 14px; font-weight: 400; cursor: pointer;
        }
        .jgm-toggle button.on { background: #582681; color: #fff; border-color: #582681; }
        .jgm-chips {
          display: flex; flex-wrap: wrap; gap: 6px;
          padding: 12px 20px; border-bottom: 1px solid #f5f5f5;
          flex-shrink: 0; max-height: 96px; overflow-y: auto;
        }
        .jgm-chip {
          display: inline-flex; align-items: center; gap: 4px;
          background: #f7f7f8; color: #582681;
          border-radius: 16px; padding: 5px 10px; font-size: 13px; font-weight: 400;
        }
        .jgm-chip.office { background: #f7f7f8; color: #1f5fbf; }
        .jgm-chip.office button { color: #1f5fbf; }
        .jgm-chip button {
          background: none; border: none; color: #582681;
          cursor: pointer; font-size: 14px; line-height: 1; padding: 0;
        }
        .jgm-chips-empty { color: #aaa; font-size: 13px; }
        .jgm-search { position: relative; padding: 12px 20px 4px; flex-shrink: 0; }
        .jgm-search-box {
          display: flex; align-items: center; gap: 8px;
          border: 1.5px solid #efeff1; border-radius: 10px; padding: 9px 12px;
          transition: border-color 0.15s;
        }
        .jgm-search-box:focus-within { border-color: #582681; }
        .jgm-search-box .ic { color: #bbb; font-size: 15px; flex-shrink: 0; }
        .jgm-search-box input {
          flex: 1; border: none; outline: none; background: none;
          font-size: 14px; color: #222; padding: 0; min-width: 0;
        }
        .jgm-search-box input::placeholder { color: #bbb; }
        .jgm-search-clear {
          background: none; border: none; color: #bbb; cursor: pointer;
          font-size: 16px; line-height: 1; padding: 0 2px; flex-shrink: 0;
        }
        .jgm-dd {
          position: absolute; left: 20px; right: 20px; top: calc(100% - 4px);
          z-index: 30; background: #fff; border: 1px solid #eee;
          border-radius: 0 0 12px 12px; box-shadow: 0 10px 24px rgba(0,0,0,0.10);
          max-height: 264px; overflow-y: auto;
        }
        .jgm-dd-item {
          display: flex; align-items: center; justify-content: space-between; gap: 10px;
          padding: 10px 13px; cursor: pointer; border-top: 1px solid #f5f5f5;
          font-size: 13.5px; color: #555;
        }
        .jgm-dd-item:first-child { border-top: none; }
        .jgm-dd-item:hover, .jgm-dd-item.active { background: #f7f7f8; }
        .jgm-dd-left { display: flex; align-items: center; gap: 7px; min-width: 0; }
        .jgm-dd-left .nm { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .jgm-dd-left .chk { color: #582681; font-size: 12px; flex-shrink: 0; }
        .jgm-dd-left .allbadge {
          font-size: 11px; color: #582681; background: #f7f7f8;
          border-radius: 6px; padding: 1px 6px; flex-shrink: 0;
        }
        .jgm-dd-item .path { color: #999; font-size: 11.5px; flex-shrink: 0; white-space: nowrap; }
        .jgm-dd-item .path.office { color: #1f5fbf; }
        .jgm-dd-empty { padding: 13px; color: #aaa; font-size: 13px; text-align: center; }
        .jgm-body { display: flex; min-height: 300px; max-height: 50vh; }
        .jgm-left {
          width: 40%; flex-shrink: 0; background: #fafafa;
          overflow-y: auto; border-right: 1px solid #f0f0f0;
        }
        .jgm-group {
          display: flex; align-items: center; justify-content: space-between;
          width: 100%; text-align: left; padding: 13px 16px;
          background: none; border: none; cursor: pointer;
          font-size: 14px; color: #666; border-left: 3px solid transparent;
        }
        .jgm-group.active {
          background: #fff; color: #582681; font-weight: 400;
          border-left-color: #582681;
        }
        .jgm-badge {
          background: #582681; color: #fff; border-radius: 10px;
          font-size: 11px; font-weight: 400; padding: 1px 7px; min-width: 18px; text-align: center;
        }
        .jgm-right { flex: 1; overflow-y: auto; padding: 14px 16px; }
        .jgm-item {
          display: flex; align-items: center; gap: 9px;
          width: 100%; text-align: left; padding: 11px 8px;
          background: none; border: none; cursor: pointer;
          font-size: 14px; color: #555; border-radius: 8px;
        }
        .jgm-item:hover { background: #f7f7f8; }
        .jgm-item.selected { color: #582681; font-weight: 400; }
        .jgm-check {
          width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
          border: 1.5px solid #ccc; display: flex; align-items: center;
          justify-content: center; font-size: 12px; color: #fff;
        }
        .jgm-item.selected .jgm-check { background: #582681; border-color: #582681; }
        /* 기타(직접 입력) 칩 · 입력 UI */
        .jgm-chip.custom { background:#f7f7f8; color:#7c3aed; border:1px dashed #efeff1; }
        .jgm-chip.custom button { color:#7c3aed; }
        .jgm-chip-tag { font-size:10px; background:#f7f7f8; color:#7c3aed; border-radius:5px; padding:0 5px; }
        .jgm-other-lead { font-size:13px; color:#999; line-height:1.6; margin-bottom:12px; }
        .jgm-other-add { display:flex; gap:8px; margin-bottom:14px; }
        .jgm-other-add input { flex:1; min-width:0; height:40px; border:1.5px solid #efeff1; border-radius:9px; padding:0 12px; font-size:14px; outline:none; }
        .jgm-other-add input:focus { border-color:#582681; }
        .jgm-other-add input::placeholder { color:#bbb; }
        .jgm-other-add button { padding:0 16px; height:40px; border-radius:9px; border:1.5px solid #582681; background:#fff; color:#582681; font-size:14px; cursor:pointer; white-space:nowrap; }
        .jgm-other-list { display:flex; flex-direction:column; gap:4px; }
        .jgm-other-empty { padding:10px 4px; color:#bbb; font-size:13px; }
        .jgm-footer {
          display: flex; gap: 10px; padding: 14px 20px;
          border-top: 1px solid #f0f0f0; flex-shrink: 0;
        }
        .jgm-reset {
          flex: 1; padding: 13px; border-radius: 10px;
          border: 1px solid #eee; background: #fff; color: #888;
          font-size: 15px; font-weight: 400; cursor: pointer;
        }
        .jgm-apply {
          flex: 2; padding: 13px; border-radius: 10px; border: none;
          background: #f7f7f8; color: #582681; font-size: 15px; font-weight: 400; cursor: pointer;
        }
        .jgm-apply:hover { background: #f7f7f8; }
        @keyframes jgmFade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes jgmPop { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes jgmUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

        @media (max-width: 768px) {
          .jgm-backdrop { align-items: flex-end; }
          .jgm-sheet {
            width: 100%; max-width: 100%; max-height: 88vh;
            border-radius: 16px 16px 0 0; animation: jgmUp 0.24s ease;
          }
          .jgm-body { max-height: 56vh; }
          .jgm-left { width: 42%; }
        }
      `}</style>

      {open && (
      <div className="jgm-backdrop">
        <div className="jgm-sheet" onClick={(e) => e.stopPropagation()}>
          {/* 헤더 */}
          <div className="jgm-header">
            <div style={{ display: "flex", alignItems: "center", gap: 18, minWidth: 0 }}>
              <span className="jgm-title">{title}</span>
              {showTrackToggle && (
                <div className="jgm-track">
                  <span className="jgm-track-label">인재 구분</span>
                  {(["STORE", "OFFICE"] as JobType[]).map((t) => (
                    <label key={t} className="jgm-track-radio" style={{ color: activeType === t ? "#582681" : "#666" }}>
                      <input
                        type="radio"
                        name="jgmTrack"
                        checked={activeType === t}
                        onChange={() => { setActiveType(t); onTrackChange?.(t); }}
                        style={{ accentColor: "#582681", width: 15, height: 15, margin: 0, cursor: "pointer" }}
                      />
                      {t === "STORE" ? "매장" : "본사"}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button className="jgm-close" onClick={onClose} aria-label="닫기">
              ×
            </button>
          </div>

          {/* 트랙 토글 (매장직/사무직) */}
          {enableToggle && (
            <div className="jgm-toggle">
              <button
                className={activeType === "STORE" ? "on" : ""}
                onClick={() => setActiveType("STORE")}
              >
                매장
              </button>
              <button
                className={activeType === "OFFICE" ? "on" : ""}
                onClick={() => setActiveType("OFFICE")}
              >
                본사
              </button>
            </div>
          )}

          {/* 실시간 추천검색 */}
          <div className="jgm-search" ref={searchRef}>
            <div className="jgm-search-box">
              <span className="ic">🔍</span>
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
                onKeyDown={onSearchKey}
                placeholder="직군·키워드 검색 (예: 네일, 메이크업, R&D)"
                autoComplete="off"
              />
              {query && (
                <button
                  className="jgm-search-clear"
                  onClick={() => { setQuery(""); setActiveIdx(0); }}
                  aria-label="검색어 지우기"
                >
                  ×
                </button>
              )}
            </div>

            {showDropdown && (
              <div className="jgm-dd">
                {results.length === 0 ? (
                  <div className="jgm-dd-empty">“{query}” 검색 결과가 없어요</div>
                ) : (
                  results.map((r, i) => {
                    const sel = r.item ? isItemSelected(r.jobType, r.item) : false;
                    return (
                      <div
                        key={`${r.jobType}-${r.group}-${r.item ?? "all"}`}
                        className={`jgm-dd-item ${i === activeIdx ? "active" : ""}`}
                        onMouseEnter={() => setActiveIdx(i)}
                        onClick={() => selectResult(r)}
                      >
                        <span className="jgm-dd-left">
                          {sel && <span className="chk">✓</span>}
                          <span className="nm">{r.label}</span>
                          {!r.item && <span className="allbadge">대분류 전체</span>}
                        </span>
                        <span className={`path ${r.jobType === "OFFICE" ? "office" : ""}`}>
                          {r.path}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* 선택된 칩 */}
          <div className="jgm-chips">
            {chips.length === 0 ? (
              <span className="jgm-chips-empty">선택한 직군이 여기 표시돼요</span>
            ) : (
              chips.map(({ item, track }) => {
                const custom = isCustom(item);
                return (
                  <span key={`${track}-${item}`} className={`jgm-chip ${track === "OFFICE" ? "office" : ""} ${custom ? "custom" : ""}`}>
                    {item}
                    {custom && <span className="jgm-chip-tag">직접입력</span>}
                    <button onClick={() => removeChip(item, track)} aria-label={`${item} 삭제`}>
                      ×
                    </button>
                  </span>
                );
              })
            )}
          </div>

          {/* 본문: 좌 대분류 / 우 소분류 */}
          <div className="jgm-body">
            <div className="jgm-left">
              {groups.map((g) => {
                const cnt = countInGroup(g.group);
                return (
                  <button
                    key={g.group}
                    className={`jgm-group ${activeGroup === g.group ? "active" : ""}`}
                    onClick={() => setActiveGroup(g.group)}
                  >
                    <span>{g.group}</span>
                    {cnt > 0 && <span className="jgm-badge">{cnt}</span>}
                  </button>
                );
              })}
              {!enableToggle && (
                <button
                  className={`jgm-group ${activeGroup === OTHER_GROUP ? "active" : ""}`}
                  onClick={() => setActiveGroup(OTHER_GROUP)}
                >
                  <span>기타 · 직접 입력</span>
                  {customItems.length > 0 && <span className="jgm-badge">{customItems.length}</span>}
                </button>
              )}
            </div>

            <div className="jgm-right">
              {activeGroup === OTHER_GROUP ? (
                <div>
                  <div className="jgm-other-lead">목록에 없는 직무는 여기서 직접 추가하세요.<br/>상세요강 이미지에 적힌 포지션명을 그대로 넣으면 돼요.</div>
                  <div className="jgm-other-add">
                    <input
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                      placeholder="포지션명 입력 (예: 왁싱 전문가, 실장, 인턴)"
                      autoComplete="off"
                    />
                    <button type="button" onClick={addCustom}>추가</button>
                  </div>
                  <div className="jgm-other-list">
                    {customItems.length === 0 ? (
                      <div className="jgm-other-empty">아직 직접 입력한 항목이 없어요.</div>
                    ) : (
                      customItems.map((item) => (
                        <button key={item} className="jgm-item selected" onClick={() => toggleItem(item)}>
                          <span className="jgm-check">✓</span>
                          <span>{item}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                subItems.map((item) => {
                  const isSel = curSelected.includes(item);
                  return (
                    <button
                      key={item}
                      className={`jgm-item ${isSel ? "selected" : ""}`}
                      onClick={() => toggleItem(item)}
                    >
                      <span className="jgm-check">{isSel ? "✓" : ""}</span>
                      <span>{item}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 푸터 */}
          <div className="jgm-footer">
            <button className="jgm-reset" onClick={clearAll}>
              초기화
            </button>
            <button className="jgm-apply" onClick={onClose}>
              {totalCount > 0 ? `${totalCount}개 적용` : "적용"}
            </button>
          </div>
        </div>
      </div>
      )}
    </>
  );
}
