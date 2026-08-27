"use client";
import { useCallback, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { X, Check } from "lucide-react";

interface Props {
  file: File;
  aspect?: number;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

// 사진에서 필요한 부분(매장명·로고)만 남기고 나머지는 잘라낸다. 결과만 저장하고
// 화면을 닫으면 원본은 버린다.
export default function ImageCropModal({ file, aspect = 1, onCancel, onCropped }: Props) {
  const [imgUrl] = useState(() => URL.createObjectURL(file));
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [working, setWorking] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => setArea(areaPixels), []);

  const confirm = async () => {
    if (!area) return;
    setWorking(true);
    try {
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
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 14, overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", borderBottom: "1px solid #eee" }}>
          <strong style={{ fontSize: 15 }}>사진 자르기</strong>
          <button type="button" onClick={onCancel} aria-label="닫기"
            style={{ border: "none", background: "none", cursor: "pointer", color: "#999", display: "flex" }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ position: "relative", width: "100%", height: 320, background: "#333" }}>
          <Cropper image={imgUrl} crop={crop} zoom={zoom} aspect={aspect}
            onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onCropComplete}
            cropShape="rect" showGrid={true} />
        </div>
        <div style={{ padding: "14px 16px" }}>
          <input type="range" min={1} max={3} step={0.01} value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#582681" }} aria-label="확대" />
          <p style={{ fontSize: 12.5, color: "#999", margin: "8px 0 0", textAlign: "center" }}>
            매장명이나 로고가 잘 보이도록 위치와 확대를 맞춰주세요
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, padding: "0 16px 16px" }}>
          <button type="button" onClick={onCancel}
            style={{ flex: 1, padding: "11px 0", borderRadius: 9, border: "1px solid #e2e2e6", background: "#fff", color: "#666", fontSize: 14, cursor: "pointer" }}>
            취소
          </button>
          <button type="button" onClick={confirm} disabled={working || !area}
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

function cropToBlob(imgUrl: string, area: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // 원본이 자른 영역보다 작을 수 있으니 그 이상으로 키우지 않는다.
      const size = Math.min(Math.round(area.width), 640);
      canvas.width = size;
      canvas.height = Math.round(size * (area.height / area.width));
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("canvas unsupported")); return; }
      ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("crop fail"))), "image/webp", 0.9);
    };
    img.onerror = () => reject(new Error("decode fail"));
    img.src = imgUrl;
  });
}
