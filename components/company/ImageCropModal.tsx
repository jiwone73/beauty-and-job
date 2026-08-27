"use client";
import { useRef, useState } from "react";
import { X, Check } from "lucide-react";

interface Props {
  file: File;
  aspect?: number;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

const MAX_W = 420;
const MAX_H = 320;
const MIN_BOX = 40;

// 손잡이 하나 — own 은 박스 위 자기 자리(0=왼쪽/위, 1=오른쪽/아래, 0.5=가운데),
// anchor 는 반대쪽(크기를 바꿔도 고정된 채 있는 자리). 모서리 4개 + 변 4개.
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

type Box = { x: number; y: number; size: number };
type Drag = { mode: "move" | keyof typeof HANDLES; startLocal: { x: number; y: number }; startBox: Box; anchor: { x: number; y: number } | null };

// 정사각 박스를 사진 위에 올려 두고, 마우스(터치)로 옮기거나 모서리·변을 끌어
// 크기를 바꾼다 — 화면에 보이는 그대로 잘린다. 확대 슬라이더 없이 드래그만으로 끝낸다.
export default function ImageCropModal({ file, aspect = 1, onCancel, onCropped }: Props) {
  const [imgUrl] = useState(() => URL.createObjectURL(file));
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [display, setDisplay] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState<Box>({ x: 0, y: 0, size: 0 });
  const [working, setWorking] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const scale = Math.min(MAX_W / nw, MAX_H / nh, 1);
    const dw = Math.round(nw * scale), dh = Math.round(nh * scale);
    const size = Math.round(Math.min(dw, dh) * 0.8);
    setNatural({ w: nw, h: nh });
    setDisplay({ w: dw, h: dh });
    setBox({ x: Math.round((dw - size) / 2), y: Math.round((dh - size) / 2), size });
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
      anchor = { x: box.x + (1 - h.ownX) * box.size, y: box.y + (1 - h.ownY) * box.size };
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
      const size = d.startBox.size;
      const x = Math.min(Math.max(0, d.startBox.x + dx), display.w - size);
      const y = Math.min(Math.max(0, d.startBox.y + dy), display.h - size);
      setBox({ x, y, size });
      return;
    }
    const h = HANDLES[d.mode];
    const anchor = d.anchor!;
    // anchor 는 반대쪽(own 의 반대) 자리에 있다 — 그 자리를 기준으로 방향을 다시 구한다.
    const anchorRelX = 1 - h.ownX;
    const anchorRelY = 1 - h.ownY;
    let size: number;
    if (h.ownY === 0.5) size = Math.abs(p.x - anchor.x);       // e/w: 가로로만 늘고 준다
    else if (h.ownX === 0.5) size = Math.abs(p.y - anchor.y);  // n/s: 세로로만 늘고 준다
    else size = Math.max(Math.abs(p.x - anchor.x), Math.abs(p.y - anchor.y)); // 모서리

    // 화면(사진) 밖으로 못 나가게, anchor 기준으로 늘 수 있는 최대 크기로 막는다.
    const maxX = anchorRelX === 0 ? display.w - anchor.x : anchorRelX === 1 ? anchor.x : Math.min(anchor.x, display.w - anchor.x) * 2;
    const maxY = anchorRelY === 0 ? display.h - anchor.y : anchorRelY === 1 ? anchor.y : Math.min(anchor.y, display.h - anchor.y) * 2;
    size = Math.min(Math.max(MIN_BOX, size), maxX, maxY);

    const x = anchorRelX === 1 ? anchor.x - size : anchorRelX === 0.5 ? anchor.x - size / 2 : anchor.x;
    const y = anchorRelY === 1 ? anchor.y - size : anchorRelY === 0.5 ? anchor.y - size / 2 : anchor.y;
    setBox({ x, y, size });
  };

  const endDrag = () => { dragRef.current = null; };

  const confirm = async () => {
    if (!display.w || !natural.w) return;
    setWorking(true);
    try {
      const scale = natural.w / display.w;
      const area = { x: box.x * scale, y: box.y * scale, w: box.size * scale, h: box.size * scale };
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
                {/* 박스 바깥을 어둡게 덮어 박스 안이 실제로 남을 부분임을 보여준다 */}
                <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)",
                  clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 ${box.y}px, ${box.x}px ${box.y}px, ${box.x}px ${box.y + box.size}px, ${box.x + box.size}px ${box.y + box.size}px, ${box.x + box.size}px ${box.y}px, 0 ${box.y}px)`,
                  pointerEvents: "none" }} />
                <div onPointerDown={startDrag("move")}
                  style={{ position: "absolute", left: box.x, top: box.y, width: box.size, height: box.size,
                    border: "2px solid #fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.3)", cursor: "move", boxSizing: "border-box" }}>
                  {(Object.keys(HANDLES) as (keyof typeof HANDLES)[]).map((key) => {
                    const h = HANDLES[key];
                    const isCorner = h.ownX !== 0.5 && h.ownY !== 0.5;
                    // 모서리는 작은 동그라미, 변은 길쭉한 막대 — 손잡이임을 한눈에 알아보게.
                    const w = isCorner ? 16 : h.ownY === 0.5 ? 10 : box.size * 0.32;
                    const hgt = isCorner ? 16 : h.ownX === 0.5 ? 10 : box.size * 0.32;
                    return (
                      <div key={key} onPointerDown={startDrag(key)}
                        style={{ position: "absolute", left: h.ownX * box.size - w / 2, top: h.ownY * box.size - hgt / 2,
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
        <p style={{ fontSize: 12.5, color: "#999", margin: "0 16px 12px", textAlign: "center" }}>
          박스를 끌어 옮기고, 모서리나 변을 끌어 크기를 바꾸세요
        </p>
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
      const canvas = document.createElement("canvas");
      const size = Math.min(Math.round(area.w), 640);
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas unsupported")); return; }
      ctx.drawImage(img, area.x, area.y, area.w, area.h, 0, 0, size, size);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("crop fail"))), "image/webp", 0.9);
    };
    img.onerror = () => reject(new Error("decode fail"));
    img.src = imgUrl;
  });
}
