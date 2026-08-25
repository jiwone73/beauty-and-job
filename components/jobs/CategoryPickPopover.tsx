"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { getJobGroups, getJobSubGroups, type JobType } from "@/lib/data/jobGroups";

const OTHER_GROUP = "기타 · 직접 입력";

interface Props {
  jobType: JobType;
  onPick: (item: string) => void;
  onClose: () => void;
  popRef: React.RefObject<HTMLDivElement>;
  left: number;
  top: number;
}

// 모집분야 행 추가 — 여기서는 한 번에 하나만 고르고 즉시 행이 붙어 닫힌다("여기서 선택하면
// 바로 창이 닫히네"). 여러 개를 담아 뒀다 한꺼번에 적용하는 JobGroupSelectModal(인재검색·
// 관심직군 등에서 쓰는 다중선택 모달)과 달리 검색·칩·초기화 같은 건 필요 없다 — 직군 수도
// 많지 않아 목록 훑어보는 걸로 충분하다("검색할만큼 직군이 많지도 않고"). 그래서 큰 모달
// 대신 다른 칸들과 같은 작은 팝오버로 뺐다.
export default function CategoryPickPopover({ jobType, onPick, onClose, popRef, left, top }: Props) {
  const groups = getJobGroups(jobType);
  const [activeGroup, setActiveGroup] = useState<string>(groups[0]?.group ?? "");
  const [customText, setCustomText] = useState("");
  const items = activeGroup === OTHER_GROUP ? [] : getJobSubGroups(jobType, activeGroup);

  const addCustom = () => {
    const v = customText.trim();
    if (!v) return;
    onPick(v);
  };

  return (
    <>
      <style>{`
        .catpick-pop { position: fixed; z-index: 200; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); width: 300px; max-width: calc(100vw - 16px); box-sizing: border-box; overflow: hidden; }
        .cp-body { display: flex; height: 260px; }
        .cp-left { width: 104px; flex-shrink: 0; background: #fafafa; overflow-y: auto; border-right: 1px solid #f0f0f0; }
        .cp-group { display: block; width: 100%; text-align: left; padding: 9px 10px; background: none; border: none; cursor: pointer; font-size: 12px; color: #666; border-left: 2px solid transparent; }
        .cp-group.on { background: #fff; color: #582681; font-weight: 600; border-left-color: #582681; }
        .cp-right { flex: 1; overflow-y: auto; padding: 6px; }
        .cp-item { display: block; width: 100%; text-align: left; padding: 8px 9px; background: none; border: none; border-radius: 6px; cursor: pointer; font-size: 12.5px; color: #333; }
        .cp-item:hover { background: #f7f7f8; color: #582681; }
        .cp-other { padding: 10px; }
        .cp-other input { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 6px 8px; font-size: 12.5px; margin-bottom: 6px; }
      `}</style>
      <div ref={popRef} className="catpick-pop" style={{ left, top }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px" }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: "#333" }}>모집분야 추가</span>
          <button type="button" onClick={onClose} aria-label="닫기" style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", padding: 2 }}><X size={14} /></button>
        </div>
        <div className="cp-body">
          <div className="cp-left">
            {groups.map((g) => (
              <button key={g.group} type="button" className={`cp-group ${activeGroup === g.group ? "on" : ""}`} onClick={() => setActiveGroup(g.group)}>{g.group}</button>
            ))}
            <button type="button" className={`cp-group ${activeGroup === OTHER_GROUP ? "on" : ""}`} onClick={() => setActiveGroup(OTHER_GROUP)}>{OTHER_GROUP}</button>
          </div>
          <div className="cp-right">
            {activeGroup === OTHER_GROUP ? (
              <div className="cp-other">
                <input autoFocus value={customText} onChange={(e) => setCustomText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
                  placeholder="포지션명 입력 (예: 실장, 인턴)" autoComplete="off" />
                <button type="button" onClick={addCustom} className="company-primary-btn" style={{ width: "100%", padding: "6px 0", fontSize: 12 }}>추가</button>
              </div>
            ) : (
              items.map((item) => (
                <button key={item} type="button" className="cp-item" onClick={() => onPick(item)}>{item}</button>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
