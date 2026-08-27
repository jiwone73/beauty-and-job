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

// 정사각 박스를 사진 위에 올려 두고, 마우스(터치)로 옮기거나 모서리를 끌어
// 크기를 바꾼다 — 화면에 보이는 그대로 잘린다. 확대 슬라이더 없이 드래그만으로 끝낸다.
export default function ImageCropModal({ file, aspect = 1, onCancel, onCropped }: Props) {
  const [imgUrl] = useState(() => URL.createObjectURL(file));
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [display, setDisplay] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState({ x: 0, y: 0, size: 0 });
  const [working, setWorking] = useState(false);
  const dragRef = useRef<{ mode: "move" | "resize"; startX: number; startY: number; box: typeof box } | null>(null);

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

  const clampBox = (b: { x: number; y: number; size: number }) => {
    const size = Math.min(Math.max(MIN_BOX, b.size), Math.min(display.w, display.h));
    const x = Math.min(Math.max(0, b.x), display.w - size);
    const y = Math.min(Math.max(0, b.y), display.h - size);
    return { x, y, size };
  };

  const startDrag = (mode: "move" | "resize") => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, box };
  };

  const onDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (d.mode === "move") {
      setBox(clampBox({ ...d.box, x: d.box.x + dx, y: d.box.y + dy }));
    } else {
      const delta = Math.max(dx, dy);
      setBox(clampBox({ ...d.box, size: d.box.size + delta }));
    }
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
          <div style={{ position: "relative", width: display.w || MAX_W, height: display.h || MAX_H, touchAction: "none" }}
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
                  <div onPointerDown={startDrag("resize")}
                    style={{ position: "absolute", right: -8, bottom: -8, width: 20, height: 20, borderRadius: "50%",
                      background: "#582681", border: "2px solid #fff", cursor: "nwse-resize" }} />
                </div>
              </>
            )}
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: "#999", margin: "0 16px 12px", textAlign: "center" }}>
          박스를 끌어 옮기고, 오른쪽 아래 점을 끌어 크기를 바꾸세요
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
