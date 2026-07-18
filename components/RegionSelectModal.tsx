"use client";
import { useState, useEffect } from "react";
import { X, Check, RotateCcw } from "lucide-react";
import { SIDO_LIST, getSigunguList } from "@/lib/data/regions";

interface Props {
  open: boolean;
  initial: string[];
  onClose: () => void;
  onApply: (regions: string[]) => void;
  allowAny?: boolean;               // "지역 무관" 토글 노출
}

const ANY = "지역 무관 전체";

const shortSido = (s: string) =>
  s.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/, "");

export default function RegionSelectModal({ open, initial, onClose, onApply, allowAny }: Props) {
  const [activeSido, setActiveSido] = useState(SIDO_LIST[0]);
  const [draft, setDraft] = useState<string[]>(initial);
  const isAny = draft.includes(ANY);
  const toggleAny = () => setDraft(isAny ? [] : [ANY]);

  useEffect(() => {
    if (open) {
      setDraft(initial);
      setActiveSido(SIDO_LIST[0]);
    }
  }, [open]);

  if (!open) return null;

  const sigunguOptions = ["전체", ...getSigunguList(activeSido)];

  const toggleItem = (sido: string, gugun: string) => {
    const key = `${sido} ${gugun}`;
    setDraft((prevRaw) => {
      const prev = prevRaw.filter((x) => x !== ANY); // 구체 지역 선택 시 '지역 무관' 해제
      if (gugun === "전체") {
        const withoutSido = prev.filter((x) => !x.startsWith(`${sido} `));
        return prev.includes(key) ? withoutSido : [...withoutSido, key];
      }
      const withoutAll = prev.filter((x) => x !== `${sido} 전체`);
      return withoutAll.includes(key)
        ? withoutAll.filter((x) => x !== key)
        : [...withoutAll, key];
    });
  };

  const removeChip = (key: string) =>
    setDraft((prev) => prev.filter((x) => x !== key));

  const countForSido = (sido: string) =>
    draft.filter((x) => x.startsWith(`${sido} `)).length;

  return (
    <div className="region-modal-overlay">
      <div className="region-modal" onClick={(e) => e.stopPropagation()}>
        <div className="region-modal-head">
          <span className="region-modal-spacer" />
          <span className="region-modal-title">지역추가</span>
          <button type="button" className="region-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {allowAny && (
          <button type="button" onClick={toggleAny}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "13px 16px", borderTop: "1px solid #f0f0f0", borderBottom: "1px solid #f0f0f0", borderLeft: "none", borderRight: "none", background: isAny ? "#faf5ff" : "#fff", cursor: "pointer", fontSize: 14, color: "#333", fontFamily: "inherit" }}>
            <span className={`region-check ${isAny ? "on" : ""}`}>{isAny && <Check size={13} />}</span>
            지역 무관 (전국 어디든 좋아요)
          </button>
        )}

        <div className="region-modal-body">
          <div className="region-sido-col">
            {SIDO_LIST.map((s) => {
              const cnt = countForSido(s);
              return (
                <button key={s} type="button"
                  className={`region-sido-item ${activeSido === s ? "active" : ""}`}
                  onClick={() => setActiveSido(s)}>
                  <span>{shortSido(s)}</span>
                  {cnt > 0 && <span className="region-sido-badge">{cnt}</span>}
                </button>
              );
            })}
          </div>
          <div className="region-gugun-col">
            {sigunguOptions.map((g) => {
              const checked = draft.includes(`${activeSido} ${g}`);
              return (
                <button key={g} type="button"
                  className="region-gugun-item"
                  onClick={() => toggleItem(activeSido, g)}>
                  <span className={`region-check ${checked ? "on" : ""}`}>
                    {checked && <Check size={13} />}
                  </span>
                  <span className={g === "전체" ? "region-gugun-all" : ""}>{g}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="region-selected-bar">
          <div className="region-selected-head">
            <span className="region-selected-label">선택한 지역 {draft.length}</span>
            {draft.length > 0 && (
              <button type="button" className="region-reset" onClick={() => setDraft([])}>
                <RotateCcw size={13} /> 초기화
              </button>
            )}
          </div>
          {draft.length > 0 && (
            <div className="region-chips">
              {draft.map((key) => (
                <span key={key} className="region-chip">
                  {key.split(" ").map((p, i) => i === 0 ? shortSido(p) : p).join(" ")}
                  <button type="button" onClick={() => removeChip(key)}>
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="region-modal-foot">
          <button type="button" className="region-apply-btn"
            onClick={() => { onApply(draft); onClose(); }}>
            적용하기
          </button>
        </div>
      </div>
    </div>
  );
}
