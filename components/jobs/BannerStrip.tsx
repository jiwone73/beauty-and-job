"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { BannerImg } from "@/components/BannerImg";

/**
 * 공고 배너 띠 — 공고 상세·기업정보 설정·공고 등록 미리보기에서 같은 모양으로 쓴다.
 *
 * 규칙 두 가지만 지킨다.
 *  1. 한 화면에 두 장. 한 칸의 크기는 언제나 폭의 절반 × 3:2 로 고정이다.
 *     사진마다 칸이 달라지면 목록이 들쭉날쭉해진다.
 *  2. 사진은 자르지 않는다. 칸 안에 통째로 넣고(contain) 남는 자리는 사진 모서리
 *     색으로 채운다 — 가로로 긴 로고 배너도 잘리지 않고, 비율도 왜곡되지 않는다.
 *
 * 세 장부터는 좌우 화살표로 두 장씩 넘겨 본다.
 */
export default function BannerStrip({
  images,
  alt,
  onDelete,
  onReorder,
  showIndex = false,
  radius = 12,
}: {
  images: string[];
  alt?: string;
  onDelete?: (url: string) => void;                  // 편집 화면에서만 넘긴다(공개 화면은 생략)
  onReorder?: (from: number, to: number) => void;    // 넘기면 끌어서 순서를 바꿀 수 있다
  showIndex?: boolean;                               // 첫 장이 목록 카드 썸네일이 되므로 편집 화면에선 번호를 보여준다
  radius?: number;
}) {
  const [start, setStart] = useState(0);
  // 끌어 옮기는 출발 위치는 렌더와 무관하게 즉시 읽혀야 해서 ref로 둔다(상태면 같은 틱에 반영되지 않는다).
  const dragFrom = useRef<number | null>(null);
  const [edge, setEdge] = useState<{ left: string; right: string } | null>(null);
  const n = images.length;

  const PER = 2;                     // 화면 크기와 무관하게 한 번에 두 장
  const CELL_RATIO = "3 / 2";        // 한 장의 칸 비율(고정)
  const cols = Math.min(n, PER);
  const s = n ? ((start % n) + n) % n : 0;
  const visible = Array.from({ length: cols }, (_, k) => images[(s + k) % n]);

  // 남는 좌우는 사진의 맨 왼쪽·오른쪽 테두리 색으로 채운다 — 사진과 여백의 경계가 보이지 않는다.
  // 사진을 못 읽는 경우(CORS 등)에는 색을 비워 두고 뒤 배경이 그대로 비치게 한다.
  const firstShown = visible[0];
  const lastShown = visible[cols - 1];
  useEffect(() => {
    if (!firstShown || cols >= PER) { setEdge(null); return; }
    let alive = true;
    // 왼쪽 여백은 맨 앞 사진의 왼쪽 테두리, 오른쪽 여백은 맨 뒤 사진의 오른쪽 테두리에서 뽑는다.
    const edgeColor = (src: string, side: "left" | "right") =>
      new Promise<string | null>((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onerror = () => resolve(null);
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 1; canvas.height = 24;
            const ctx = canvas.getContext("2d");
            if (!ctx) return resolve(null);
            const sx = side === "left" ? 0 : Math.max(0, img.naturalWidth - 1);
            ctx.drawImage(img, sx, 0, 1, img.naturalHeight, 0, 0, 1, 24);
            const d = ctx.getImageData(0, 0, 1, 24).data;
            let r = 0, g = 0, b = 0;
            for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
            const c = d.length / 4;
            resolve(`rgb(${Math.round(r / c)}, ${Math.round(g / c)}, ${Math.round(b / c)})`);
          } catch { resolve(null); }   // 캔버스를 읽을 수 없으면 여백은 배경 그대로 둔다
        };
        img.src = src;
      });
    Promise.all([edgeColor(firstShown, "left"), edgeColor(lastShown, "right")]).then(([left, right]) => {
      if (alive && left && right) setEdge({ left, right });
    });
    return () => { alive = false; };
  }, [firstShown, lastShown, cols]);

  if (!n) return null;

  const arrow: CSSProperties = {
    position: "absolute", top: "50%", transform: "translateY(-50%)",
    width: 34, height: 34, borderRadius: "50%", border: "none",
    background: "rgba(255,255,255,0.95)", color: "#333",
    cursor: "pointer", zIndex: 3, boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    display: "flex", alignItems: "center", justifyContent: "center",
  };

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <div style={{ position: "relative", width: "100%", borderRadius: radius, overflow: "hidden" }}>
        {cols < PER && edge && (
          <>
            <div aria-hidden style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "50%", background: edge.left }} />
            <div aria-hidden style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", background: edge.right }} />
          </>
        )}
        <div style={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "stretch" }}>
          {visible.map((src, k) => {
            const idx = (s + k) % n;   // 화살표로 돌려 봐도 원본 배열의 자리를 가리킨다
            return (
              <div key={`${s}-${k}-${src}`}
                draggable={!!onReorder}
                onDragStart={onReorder ? () => { dragFrom.current = idx; } : undefined}
                onDragOver={onReorder ? (e) => e.preventDefault() : undefined}
                onDrop={onReorder ? (e) => {
                  e.preventDefault(); e.stopPropagation();
                  const from = dragFrom.current;
                  if (from !== null && from !== idx) onReorder(from, idx);
                  dragFrom.current = null;
                } : undefined}
                style={{ position: "relative", width: `${100 / PER}%`, aspectRatio: CELL_RATIO, flexShrink: 0, cursor: onReorder ? "grab" : undefined }}>
                <BannerImg src={src} alt={alt} />
                {showIndex && (
                  <span style={{ position: "absolute", bottom: 5, left: 5, background: "rgba(0,0,0,0.55)", color: "#fff",
                    fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "1px 5px" }}>{idx + 1}</span>
                )}
                {onDelete && (
                  <button type="button" onClick={() => onDelete(src)} title="삭제"
                    style={{ position: "absolute", top: 5, right: 5, width: 22, height: 22, borderRadius: "50%",
                      background: "rgba(0,0,0,0.55)", color: "#fff", border: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <X size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {n > PER && (
        <>
          {/* 보이는 만큼(PER) 통째로 넘긴다 — 한 장씩 밀면 같은 사진이 자리만 옮겨 다녀 넘긴 티가 안 난다. */}
          <button type="button" aria-label="이전 이미지" onClick={() => setStart(s - PER)} style={{ ...arrow, left: 8 }}><ChevronLeft size={20} /></button>
          <button type="button" aria-label="다음 이미지" onClick={() => setStart(s + PER)} style={{ ...arrow, right: 8 }}><ChevronRight size={20} /></button>
        </>
      )}
    </div>
  );
}
