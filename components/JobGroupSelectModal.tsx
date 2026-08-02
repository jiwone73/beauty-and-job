"use client";

import { useEffect, useState } from "react";
import {
  getJobGroups,
  getJobSubGroups,
  type JobType,
} from "@/lib/data/jobGroups";

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
}: Props) {
  const [activeType, setActiveType] = useState<JobType>(jobType);
  const groups = getJobGroups(activeType);
  const [activeGroup, setActiveGroup] = useState<string>(groups[0]?.group ?? "");

  // 열릴 때 활성 트랙을 기본값(잡타입)으로 초기화
  useEffect(() => {
    if (!open) return;
    setActiveType(jobType);
  }, [open, jobType]);

  // 활성 트랙이 바뀌면 대분류 초기화
  useEffect(() => {
    setActiveGroup(getJobGroups(activeType)[0]?.group ?? "");
  }, [activeType]);

  // 열려 있을 때 body 스크롤 잠금 (모바일 시트에서 특히 중요)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

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
        .jgm-title { font-size: 17px; font-weight: 400; color: #222; }
        .jgm-close {
          background: none; border: none; font-size: 22px; line-height: 1;
          color: #999; cursor: pointer; padding: 0 4px;
        }
        .jgm-toggle { display: flex; gap: 8px; padding: 12px 20px 2px; flex-shrink: 0; }
        .jgm-toggle button {
          flex: 1; padding: 9px; border-radius: 9px; border: 1px solid #e2e0e6;
          background: #fff; color: #888; font-size: 14px; font-weight: 400; cursor: pointer;
        }
        .jgm-toggle button.on { background: #5f0080; color: #fff; border-color: #5f0080; }
        .jgm-chips {
          display: flex; flex-wrap: wrap; gap: 6px;
          padding: 12px 20px; border-bottom: 1px solid #f5f5f5;
          flex-shrink: 0; max-height: 96px; overflow-y: auto;
        }
        .jgm-chip {
          display: inline-flex; align-items: center; gap: 4px;
          background: #f3e5f5; color: #5f0080;
          border-radius: 16px; padding: 5px 10px; font-size: 13px; font-weight: 400;
        }
        .jgm-chip.office { background: #e7f0ff; color: #1f5fbf; }
        .jgm-chip.office button { color: #1f5fbf; }
        .jgm-chip button {
          background: none; border: none; color: #5f0080;
          cursor: pointer; font-size: 14px; line-height: 1; padding: 0;
        }
        .jgm-chips-empty { color: #aaa; font-size: 13px; }
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
          background: #fff; color: #5f0080; font-weight: 400;
          border-left-color: #5f0080;
        }
        .jgm-badge {
          background: #5f0080; color: #fff; border-radius: 10px;
          font-size: 11px; font-weight: 400; padding: 1px 7px; min-width: 18px; text-align: center;
        }
        .jgm-right { flex: 1; overflow-y: auto; padding: 14px 16px; }
        .jgm-item {
          display: flex; align-items: center; gap: 9px;
          width: 100%; text-align: left; padding: 11px 8px;
          background: none; border: none; cursor: pointer;
          font-size: 14px; color: #444; border-radius: 8px;
        }
        .jgm-item:hover { background: #faf5fc; }
        .jgm-item.selected { color: #5f0080; font-weight: 400; }
        .jgm-check {
          width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0;
          border: 1.5px solid #ccc; display: flex; align-items: center;
          justify-content: center; font-size: 12px; color: #fff;
        }
        .jgm-item.selected .jgm-check { background: #5f0080; border-color: #5f0080; }
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
          background: #ede9fe; color: #5f0080; font-size: 15px; font-weight: 400; cursor: pointer;
        }
        .jgm-apply:hover { background: #e3ddfb; }
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

      <div className="jgm-backdrop">
        <div className="jgm-sheet" onClick={(e) => e.stopPropagation()}>
          {/* 헤더 */}
          <div className="jgm-header">
            <span className="jgm-title">{title}</span>
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

          {/* 선택된 칩 */}
          <div className="jgm-chips">
            {chips.length === 0 ? (
              <span className="jgm-chips-empty">선택한 직군이 여기 표시돼요</span>
            ) : (
              chips.map(({ item, track }) => (
                <span key={`${track}-${item}`} className={`jgm-chip ${track === "OFFICE" ? "office" : ""}`}>
                  {item}
                  <button onClick={() => removeChip(item, track)} aria-label={`${item} 삭제`}>
                    ×
                  </button>
                </span>
              ))
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
            </div>

            <div className="jgm-right">
              {subItems.map((item) => {
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
              })}
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
    </>
  );
}
