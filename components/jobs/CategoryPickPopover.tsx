"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { getJobGroups, getJobSubGroups, type JobType } from "@/lib/data/jobGroups";

const OTHER_GROUP = "기타 · 직접 입력";

interface Props {
  jobType: JobType;
  onPick: (item: string) => void;
  onClose: () => void;
}

// 모집분야 행 추가 — 여기서는 한 번에 하나만 고르고 즉시 행이 붙어 닫힌다("여기서 선택하면
// 바로 창이 닫히네"). 여러 개를 담아 뒀다 한꺼번에 적용하는 JobGroupSelectModal(인재검색·
// 관심직군 등에서 쓰는 다중선택 모달)과 달리 검색·칩·초기화 같은 건 필요 없다 — 직군 수도
// 많지 않아 목록 훑어보는 걸로 충분하다("검색할만큼 직군이 많지도 않고"). 그래서 큰 모달
// 대신 다른 칸들과 같은 작은 팝오버로 뺐다.
// 표 안 칸들과 달리 화면 기준(fixed) 공용 팝오버 자리를 쓰지 않는다 — 트리거가 표 밖에
// 있어 가로 스크롤에 잘릴 일이 없고, 회사 프로필 같은 콘텐츠가 늦게 도착해 트리거가
// 밀리면 fixed 좌표는 못 따라갔다("+ 버튼 바로 밑에서 떠야지"). 트리거에 상대 위치로
// 붙여 두면 트리거가 어디로 밀리든 항상 바로 밑에 뜬다.
export default function CategoryPickPopover({ jobType, onPick, onClose }: Props) {
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
        /* 트리거가 .job-detail-meta-item 안에 있어, 그 안의 모든 글자를 15px로
           박아 두는 규칙(.jobpost-form .job-detail-meta-item *)을 그대로 물려받는다.
           그 규칙도 클래스 두 개 특이도라, !important만으로는 안 지고 특이도까지
           맞춰야 이긴다 — 그래서 아래 글자 크기 규칙은 전부 .catpick-pop-body를
           덧붙여 클래스 두 개 이상으로 맞춘다. */
        .catpick-pop-body { position: absolute; top: calc(100% + 6px); left: 0; z-index: 200; background: #fff; border: 1px solid #e5e5e5; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); width: 328px; max-width: calc(100vw - 16px); box-sizing: border-box; overflow: hidden; }
        .catpick-pop-body.catpick-pop .cp-title { font-size: 12.5px !important; font-weight: 600; color: #333; }
        .cp-body { display: flex; }
        .cp-left { width: 132px; flex-shrink: 0; background: #fafafa; border-right: 1px solid #f0f0f0; }
        .catpick-pop-body.catpick-pop .cp-group { display: block; width: 100%; text-align: left; padding: 9px 10px; background: none; border: none; cursor: pointer; font-size: 10px !important; color: #666; border-left: 2px solid transparent; white-space: nowrap; box-sizing: border-box; }
        .cp-group.on { background: #fff; color: #582681; font-weight: 600; border-left-color: #582681; }
        .cp-right { flex: 1; padding: 6px; }
        .catpick-pop-body.catpick-pop .cp-item { display: block; width: 100%; text-align: left; padding: 8px 9px; background: none; border: none; border-radius: 6px; cursor: pointer; font-size: 12.5px !important; color: #333; }
        .cp-item:hover { background: #f7f7f8; color: #582681; }
        .cp-other { padding: 10px; }
        .catpick-pop-body.catpick-pop .cp-other input { width: 100%; box-sizing: border-box; border: 1px solid #ddd; border-radius: 6px; padding: 6px 8px; font-size: 12.5px !important; margin-bottom: 6px; }
        .catpick-pop-body.catpick-pop .cp-add-btn { width: 100%; justify-content: center; padding: 6px 0; font-size: 12px !important; }
      `}</style>
      <div className="catpick-pop-body catpick-pop" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px" }}>
          <span className="cp-title">모집분야 추가</span>
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
                <button type="button" onClick={addCustom} className="company-primary-btn cp-add-btn">추가</button>
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
