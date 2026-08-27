"use client";
import { useRef, useState } from "react";
import { X, Check } from "lucide-react";

interface Props {
  file: File;
  /** 비워두면 가로세로 비율을 자유롭게 바꿀 수 있다(배너처럼 자르지 않는 게 기본인 사진). 숫자를 주면 그 비율로 고정된다(1 = 정사각). */
  aspect?: number;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

const MAX_W = 420;
const MAX_H = 320;
const MIN_BOX = 32;
const MAX_OUT = 1400; // 잘라낸 결과의 긴 변 상한 — 서버에서 한 번 더 줄이지만 여기서도 과하게 크지 않게 막는다

// own 은 손잡이가 박스 위에서 자기 자리(0=왼쪽/위, 1=오른쪽/아래, 0.5=가운데),
// 변 손잡이(n/s/e/w)는 한쪽 축만 0.5 다.
const HANDLES: Record<string, { ownX: number; ownY: number; cursor: string }> = {
  nw: { ownX: 0, ownY: 0, cursor: "nwse-resize" },
  n: { ownX: 0.5, ownY: 0, cursor: "ns-resize" },
  ne: { ownX: 1, ownY: 0, cursor: "nesw-resize" },
  e: { ownX: 1, ownY: 0.5, cursor: "ew-resize" },
  se: { ownX: 1, ownY: 1, cursor: "nwse-resize" },
  s: { ownX: 0.5, ownY: 1, cursor: "ns-resize" },
  sw: { ownX: 0, ownY: 1, cursor: "nesw-resize" },
  w: { ownX: 0, ownY: 0.5, cursor: "ew-resize" },
};

type Box = { x: number; y: number; w: number; h: number };
type Drag = { mode: "move" | keyof typeof HANDLES; startLocal: { x: number; y: number }; startBox: Box; anchor: { x: number; y: number } | null };

// 박스를 사진 위에 올려 두고, 마우스(터치)로 옮기거나 모서리·변을 끌어 크기를 바꾼다 —
// 화면에 보이는 그대로 잘린다. 확대 슬라이더 없이 드래그만으로 끝낸다.
export default function ImageCropModal({ file, aspect, onCancel, onCropped }: Props) {
  const [imgUrl] = useState(() => URL.createObjectURL(file));
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [display, setDisplay] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState<Box>({ x: 0, y: 0, w: 0, h: 0 });
  const [working, setWorking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const scale = Math.min(MAX_W / nw, MAX_H / nh, 1);
    const dw = Math.round(nw * scale), dh = Math.round(nh * scale);
    let w: number, h: number;
    if (aspect) {
      w = Math.round(Math.min(dw, dh) * 0.8);
      h = Math.round(w / aspect);
    } else {
      // 자유 비율은 기본적으로 사진 전체를 거의 다 남긴다 — 줄이고 싶을 때만 안으로 끌어들인다.
      w = Math.round(dw * 0.92);
      h = Math.round(dh * 0.92);
    }
    setNatural({ w: nw, h: nh });
    setDisplay({ w: dw, h: dh });
    setBox({ x: Math.round((dw - w) / 2), y: Math.round((dh - h) / 2), w, h });
  };

  const local = (e: React.PointerEvent) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrag = (mode: Drag["mode"]) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    let anchor: { x: number; y: number } | null = null;
    if (mode !== "move") {
      const h = HANDLES[mode];
      // 반대쪽 자리 = 1 - own 을 박스 좌표로 환산한 값. 이 점은 크기가 바뀌어도 그대로 있는다.
      anchor = { x: box.x + (1 - h.ownX) * box.w, y: box.y + (1 - h.ownY) * box.h };
    }
    dragRef.current = { mode, startLocal: local(e), startBox: box, anchor };
  };

  const onDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const p = local(e);
    if (d.mode === "move") {
      const dx = p.x - d.startLocal.x;
      const dy = p.y - d.startLocal.y;
      const w = d.startBox.w, h = d.startBox.h;
      const x = Math.min(Math.max(0, d.startBox.x + dx), display.w - w);
      const y = Math.min(Math.max(0, d.startBox.y + dy), display.h - h);
      setBox({ x, y, w, h });
      return;
    }
    const handle = HANDLES[d.mode];
    const anchor = d.anchor!;
    const anchorRelX = 1 - handle.ownX;
    const anchorRelY = 1 - handle.ownY;
    const maxW = anchorRelX === 0 ? display.w - anchor.x : anchorRelX === 1 ? anchor.x : Math.min(anchor.x, display.w - anchor.x) * 2;
    const maxH = anchorRelY === 0 ? display.h - anchor.y : anchorRelY === 1 ? anchor.y : Math.min(anchor.y, display.h - anchor.y) * 2;

    let w: number, h: number;
    if (aspect) {
      // 대각 성분 중 더 크게 요구하는 쪽에 맞추고, 비율은 항상 지킨다.
      const wFromX = Math.abs(p.x - anchor.x);
      const wFromY = Math.abs(p.y - anchor.y) * aspect;
      w = handle.ownY === 0.5 ? wFromX : handle.ownX === 0.5 ? wFromY : Math.max(wFromX, wFromY);
      w = Math.min(Math.max(MIN_BOX, w), maxW, maxH * aspect);
      h = w / aspect;
    } else if (handle.ownY === 0.5) {
      // e/w 변 — 가로만 바뀐다
      w = Math.min(Math.max(MIN_BOX, Math.abs(p.x - anchor.x)), maxW);
      h = d.startBox.h;
    } else if (handle.ownX === 0.5) {
      // n/s 변 — 세로만 바뀐다
      w = d.startBox.w;
      h = Math.min(Math.max(MIN_BOX, Math.abs(p.y - anchor.y)), maxH);
    } else {
      // 모서리 — 가로세로 독립적으로 바뀐다
      w = Math.min(Math.max(MIN_BOX, Math.abs(p.x - anchor.x)), maxW);
      h = Math.min(Math.max(MIN_BOX, Math.abs(p.y - anchor.y)), maxH);
    }

    const x = anchorRelX === 1 ? anchor.x - w : anchorRelX === 0.5 ? anchor.x - w / 2 : anchor.x;
    const y = anchorRelY === 1 ? anchor.y - h : anchorRelY === 0.5 ? anchor.y - h / 2 : anchor.y;
    setBox({ x, y, w, h });
  };

  const endDrag = () => { dragRef.current = null; };

  // 배너 띠는 한 쪽에 3:2 칸이 둘이라 쪽 전체가 정확히 6:2 다. 그래서 꽉 차게
  // 보이는 비율이 장수에 따라 갈린다 — 2장 이상이면 각 칸(3:2), 1장뿐이면 그
  // 한 장이 쪽을 통째로 쓰므로 6:2. 둘 다 고를 수 있게 둔다.
  // 3:2 는 목록 카드 썸네일과 같은 비율이라, 여기 맞춰 두면 카드에서도 안 잘린다.
  const 안내들 = [
    { key: "3:2", ratio: 3 / 2, 설명: "2장 이상" },
    { key: "6:2", ratio: 3, 설명: "1장만" },
  ];
  const [안내비율, set안내비율] = useState(3 / 2);

  // 지금 박스의 가운데를 중심으로, 화면 안에 들어가는 가장 큰 안내 박스.
  // 점선과 "맞추기" 버튼이 이 값을 같이 쓴다.
  const 안내박스 = (() => {
    if (!display.w) return null;
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const w = Math.min(2 * Math.min(cx, display.w - cx), 2 * Math.min(cy, display.h - cy) * 안내비율);
    const h = w / 안내비율;
    return { x: cx - w / 2, y: cy - h / 2, w, h };
  })();

  const confirm = async () => {
    if (!display.w || !natural.w) return;
    setWorking(true);
    try {
      const scale = natural.w / display.w;
      const area = { x: box.x * scale, y: box.y * scale, w: box.w * scale, h: box.h * scale };
      const blob = await cropToBlob(imgUrl, area);
      onCropped(blob);
    } finally {
      setWorking(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onCancel}>
      <div style={{ width: "100%", maxWidth: 460, background: "#fff", borderRadius: 14, overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #eee" }}>
          <strong style={{ fontSize: 15 }}>사진 자르기</strong>
          <button type="button" onClick={onCancel} aria-label="닫기"
            style={{ border: "none", background: "none", cursor: "pointer", color: "#999", display: "flex" }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ display: "flex", justifyContent: "center", padding: "20px 16px", background: "#f2f2f4" }}>
          <div ref={containerRef} style={{ position: "relative", width: display.w || MAX_W, height: display.h || MAX_H, touchAction: "none" }}
            onPointerMove={onDrag} onPointerUp={endDrag}>
            <img src={imgUrl} alt="" onLoad={onImgLoad} draggable={false}
              style={{ width: "100%", height: "100%", display: "block", userSelect: "none" }} />
            {display.w > 0 && (
              <>
                {/* 자유 비율일 때만 — 고른 비율이면 이런 모양이라는 점선 안내 */}
                {!aspect && 안내박스 && (
                  <div style={{ position: "absolute", left: 안내박스.x, top: 안내박스.y, width: 안내박스.w, height: 안내박스.h,
                    border: "1.5px dashed rgba(88,38,129,0.55)", pointerEvents: "none", boxSizing: "border-box" }} />
                )}
                {/* 박스 바깥을 어둡게 덮어 박스 안이 실제로 남을 부분임을 보여준다 */}
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                  clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${box.y}px, ${box.x}px ${box.y}px, ${box.x}px ${box.y + box.h}px, ${box.x + box.w}px ${box.y + box.h}px, ${box.x + box.w}px ${box.y}px, 0 ${box.y}px)`,
                  pointerEvents: "none" }} />
                <div onPointerDown={startDrag("move")}
                  style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h,
                    border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.3)", cursor: "move", boxSizing: "border-box" }}>
                  {(Object.keys(HANDLES) as (keyof typeof HANDLES)[]).map((key) => {
                    const h = HANDLES[key];
                    const isCorner = h.ownX !== 0.5 && h.ownY !== 0.5;
                    // 모서리는 작은 동그라미, 변은 길쭉한 막대 — 손잡이임을 한눈에 알아보게.
                    const w = isCorner ? 16 : h.ownY === 0.5 ? 10 : Math.max(20, box.w * 0.32);
                    const hgt = isCorner ? 16 : h.ownX === 0.5 ? 10 : Math.max(20, box.h * 0.32);
                    return (
                      <div key={key} onPointerDown={startDrag(key)}
                        style={{ position: "absolute", left: h.ownX * box.w - w / 2, top: h.ownY * box.h - hgt / 2,
                          width: w, height: hgt, borderRadius: isCorner ? "50%" : 5,
                          background: "#582681", border: "2px solid #fff", cursor: h.cursor,
                          boxShadow: "0 0 0 1px rgba(0,0,0,0.25)" }} />
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: "#999", margin: "0 16px 4px", textAlign: "center" }}>
          박스를 끌어 옮기고, 모서리나 변을 끌어 크기를 바꾸세요
        </p>
        {aspect ? (
          <p style={{ fontSize: 12, color: "#bbb", margin: "0 16px 12px", textAlign: "center" }}>
            선명하게 보이려면 500×500px 이상의 사진을 권장해요
          </p>
        ) : (
          <div style={{ margin: "0 16px 12px", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#bbb", margin: "0 0 7px", lineHeight: 1.5 }}>
              사진을 <b style={{ color: "#999" }}>2장 이상</b> 올리면 3:2, <b style={{ color: "#999" }}>1장만</b> 올리면 6:2가 꽉 차 보여요
            </p>
            <div style={{ display: "inline-flex", gap: 6 }}>
              {안내들.map((g) => {
                const 켬 = Math.abs(안내비율 - g.ratio) < 0.001;
                return (
                  <button key={g.key} type="button"
                    onClick={() => {
                      set안내비율(g.ratio);
                      // 고른 비율의 안내 상자를 그 자리에서 다시 재어 박스에 그대로 씌운다.
                      if (!display.w) return;
                      const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
                      const w = Math.min(2 * Math.min(cx, display.w - cx), 2 * Math.min(cy, display.h - cy) * g.ratio);
                      setBox({ x: cx - w / 2, y: cy - (w / g.ratio) / 2, w, h: w / g.ratio });
                    }}
                    style={{ fontSize: 11.5, color: 켬 ? "#582681" : "#999",
                      background: 켬 ? "#f4f0f9" : "#fff",
                      border: `1px solid ${켬 ? "#d9c7ef" : "#e6e6ea"}`,
                      borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 500 }}>
                    {g.key}에 맞추기 <span style={{ color: "#bbb", fontWeight: 400 }}>· {g.설명}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, padding: "0 16px 16px" }}>
          <button type="button" onClick={onCancel}
            style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "1px solid #e2e2e6", background: "#fff", color: "#666", fontSize: 14, cursor: "pointer" }}>
            취소
          </button>
          <button type="button" onClick={confirm} disabled={working}
            style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "none", background: "#582681", color: "#fff",
              fontSize: 14, fontWeight: 600, cursor: working ? "wait" : "pointer", opacity: working ? 0.7 : 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Check size={16} />{working ? "적용 중…" : "적용"}
          </button>
        </div>
      </div>
    </div>
  );
}

function cropToBlob(imgUrl: string, area: { x: number; y: number; w: number; h: number }): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const outScale = Math.min(1, MAX_OUT / Math.max(area.w, area.h));
      const outW = Math.max(1, Math.round(area.w * outScale));
      const outH = Math.max(1, Math.round(area.h * outScale));
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas unsupported")); return; }
      ctx.drawImage(img, area.x, area.y, area.w, area.h, 0, 0, outW, outH);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("crop fail"))), "image/webp", 0.9);
    };
    img.onerror = () => reject(new Error("decode fail"));
    img.src = imgUrl;
  });
}
