"use client";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { BannerImg } from "@/components/BannerImg";

/**
 * 공고 배너 띠 — 공고 상세·기업정보 설정·공고 등록 미리보기에서 같은 모양으로 쓴다.
 *
 * 규칙 두 가지만 지킨다.
 *  1. 한 화면에 두 장. 한 칸의 크기는 언제나 폭의 절반 × 4:3 으로 고정이다.
 *     사진마다 칸이 달라지면 목록이 들쭉날쭉해진다.
 *  2. 사진은 자르지 않는다. 칸 안에 통째로 넣고(contain) 남는 자리는 사진 모서리
 *     색으로 채운다 — 가로로 긴 로고 배너도 잘리지 않고, 비율도 왜곡되지 않는다.
 *
 * 넘기는 방법은 화면에 따라 다르다.
 *  · 폰 — 손으로 밀면 한 쪽씩 딱 걸린다(scroll-snap). 아래 점이 몇 쪽 중 몇 번째인지
 *    알려 준다. 폰에서 작은 화살표를 정확히 누르는 것은 어렵다.
 *  · 마우스 — 밀 것이 없으니 좌우 화살표를 낸다.
 * 어느 쪽이든 같은 띠를 움직이므로 보이는 것이 갈라지지 않는다.
 */
export default function BannerStrip({
  images,
  alt,
  onDelete,
  onReorder,
  showIndex = false,
  radius = 0,
}: {
  images: string[];
  alt?: string;
  onDelete?: (url: string) => void;                  // 편집 화면에서만 넘긴다(공개 화면은 생략)
  onReorder?: (from: number, to: number) => void;    // 넘기면 끌어서 순서를 바꿀 수 있다
  showIndex?: boolean;                               // 첫 장이 목록 카드 썸네일이 되므로 편집 화면에선 번호를 보여준다
  radius?: number;                                   // 기본은 각진 모서리(공고 배너는 화면 폭을 꽉 채운다)
}) {
  // 끌어 옮기는 출발 위치는 렌더와 무관하게 즉시 읽혀야 해서 ref로 둔다(상태면 같은 틱에 반영되지 않는다).
  const dragFrom = useRef<number | null>(null);
  const 띠 = useRef<HTMLDivElement>(null);
  const [쪽, set쪽] = useState(0);
  const [edge, setEdge] = useState<{ left: string; right: string } | null>(null);
  const n = images.length;

  const PER = 2;                     // 화면 크기와 무관하게 한 번에 두 장
  // 한 칸은 목록 카드 썸네일과 같은 3:2 다. 매장이 사진을 한 벌만 준비해도
  // 카드와 배너 양쪽에 그대로 쓸 수 있게 비율을 하나로 맞춘다.
  const CELL_RATIO = "3 / 2";

  // 홀수 장이면 마지막 쪽에 한 장만 남는다. 끌어서 순서를 바꾸는 화면(onReorder)은
  // 쪽 안 자리가 실제 배열 순서와 그대로 맞아야 드래그가 헷갈리지 않으니 그대로 두고,
  // 그 외 화면(공고 상세 등 읽기 전용)에서는 마지막 쪽을 뒤에서 두 장으로 당겨 채워
  // "3장인데 마지막 한 장만 반쪽으로 보인다"를 없앤다 — 바로 앞 장이 두 쪽에 겹쳐 보인다.
  const 쪽들: number[][] = onReorder
    ? Array.from({ length: Math.ceil(n / PER) }, (_, p) => {
        const s = p * PER;
        return Array.from({ length: Math.min(PER, n - s) }, (_, k) => s + k);
      })
    : (() => {
        const pages: number[][] = [];
        let start = 0;
        while (start < n) {
          const s = n - start < PER && n >= PER ? n - PER : start;
          const page = Array.from({ length: Math.min(PER, n - s) }, (_, k) => s + k);
          if (pages.length && pages[pages.length - 1].join() === page.join()) break;
          pages.push(page);
          start = s + PER;
        }
        return pages;
      })();
  const 쪽수 = 쪽들.length;

  // 한 장짜리 쪽의 좌우는 그 사진의 맨 왼쪽·오른쪽 테두리 색으로 채운다 — 사진과 여백의
  // 경계가 보이지 않는다. 사진을 못 읽는 경우(CORS 등)에는 비워 두고 뒤 배경이 비치게 한다.
  // (겹쳐 채우기가 못 미치는 건 사진이 진짜 한 장뿐일 때뿐이다.)
  const 홀로 = n === 1 ? images[0] : null;
  useEffect(() => {
    if (!홀로) { setEdge(null); return; }
    let alive = true;
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
    Promise.all([edgeColor(홀로, "left"), edgeColor(홀로, "right")]).then(([left, right]) => {
      if (alive && left && right) setEdge({ left, right });
    });
    return () => { alive = false; };
  }, [홀로]);

  // 사진이 줄어 쪽수가 준 뒤에도 옛 쪽 번호가 남아 점이 엉뚱한 곳을 가리키지 않게 한다.
  useEffect(() => { if (쪽 > 쪽수 - 1) set쪽(Math.max(0, 쪽수 - 1)); }, [쪽수, 쪽]);

  if (!n) return null;

  const 옮기기 = (p: number) => {
    const el = 띠.current;
    if (!el) return;
    const 갈곳 = Math.min(Math.max(p, 0), 쪽수 - 1);
    el.scrollTo({ left: 갈곳 * el.clientWidth, behavior: "smooth" });
    set쪽(갈곳);
  };

  // 마우스로 배너를 누른 채 끌면 움직인다 — 폰에서 손으로 미는 것과 같은 손짓을
  // 마우스에도 준다. 좌우로 끌면 다음/이전 쪽으로 넘어가고(터치 스와이프와 같다),
  // 위아래로 끌면 페이지 자체가 스크롤된다(클릭+드래그는 브라우저 기본 동작이
  // 아니라 원래 안 됐다 — "스크롤되야 하는데 안되"). 처음 몇 픽셀을 보고 어느 쪽으로
  // 끄는지 정한 뒤에는 그 방향으로만 움직인다(대각선으로 흔들리지 않게).
  // 끌어서 순서 바꾸기(onReorder)가 있는 등록 폼에서는 같은 손짓이 순서 바꾸기와
  // 겹치므로, 순서 바꾸기가 없는 읽기 전용 화면에서만 켠다.
  const drag = useRef<{ startX: number; startY: number; startScrollY: number; startScrollLeft: number; axis: "x" | "y" | null } | null>(null);
  const onBannerMouseDown = onReorder ? undefined : (e: ReactMouseEvent) => {
    if (e.button !== 0) return;
    const el = 띠.current;
    if (!el) return;
    drag.current = { startX: e.clientX, startY: e.clientY, startScrollY: window.scrollY, startScrollLeft: el.scrollLeft, axis: null };
    const onMove = (ev: MouseEvent) => {
      const d = drag.current;
      if (!d) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (!d.axis) {
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return; // 손이 떨려도 방향이 바로 정해지지 않게
        d.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (d.axis === "x") el.style.scrollSnapType = "none"; // 끄는 동안은 쪽 경계로 튕기지 않게 잠깐 끈다
      }
      if (d.axis === "x") {
        el.scrollLeft = Math.min(Math.max(0, d.startScrollLeft - dx), el.scrollWidth - el.clientWidth);
      } else {
        window.scrollTo(window.scrollX, d.startScrollY - dy);
      }
    };
    const onUp = () => {
      const d = drag.current;
      drag.current = null;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (d?.axis === "x") {
        el.style.scrollSnapType = "";
        옮기기(Math.round(el.scrollLeft / el.clientWidth));
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <div className="bstrip">
      <div
        ref={띠}
        className="bstrip-track"
        style={{ borderRadius: radius, cursor: onReorder ? undefined : "grab" }}
        onMouseDown={onBannerMouseDown}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (!el.clientWidth) return;
          set쪽(Math.round(el.scrollLeft / el.clientWidth));
        }}
      >
        {쪽들.map((쪽인덱스, p) => (
          <div key={p} className="bstrip-page">
            {쪽인덱스.length < PER && edge && (
              <>
                <div aria-hidden style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "50%", background: edge.left }} />
                <div aria-hidden style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "50%", background: edge.right }} />
              </>
            )}
            {쪽인덱스.map((idx) => {
              const src = images[idx];
              return (
                <div key={`${idx}-${src}`}
                  draggable={!!onReorder}
                  onDragStart={onReorder ? () => { dragFrom.current = idx; } : undefined}
                  onDragOver={onReorder ? (e) => e.preventDefault() : undefined}
                  onDrop={onReorder ? (e) => {
                    e.preventDefault(); e.stopPropagation();
                    const from = dragFrom.current;
                    if (from !== null && from !== idx) onReorder(from, idx);
                    dragFrom.current = null;
                  } : undefined}
                  /* 한 장뿐이면 쪽을 통째로 쓴다. 띠 한 쪽은 3:2 칸 둘이라 정확히 6:2 이고,
                     샘플 배너도 6:2 로 만든다 — 반쪽 칸에 넣으면 사방에 여백만 남았다. */
                  style={{ position: "relative",
                    width: 쪽인덱스.length < PER ? "100%" : `${100 / PER}%`,
                    aspectRatio: 쪽인덱스.length < PER ? "6 / 2" : CELL_RATIO,
                    flexShrink: 0, cursor: onReorder ? "grab" : undefined }}>
                  <BannerImg src={src} alt={alt} />
                  {/* 편집 화면은 순서만 보면 되지만(첫 장이 목록 썸네일이 된다),
                      공개 화면은 "몇 장 중 몇 번째"를 알아야 더 볼 것이 남았는지
                      안다. 폰에는 아래 점이 그 일을 하므로 마우스 화면에만 낸다. */}
                  {showIndex ? (
                    <span className="bstrip-num">{idx + 1}</span>
                  ) : n > 1 ? (
                    <span className="bstrip-num bstrip-num-pc">{idx + 1} / {n}</span>
                  ) : null}
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
        ))}
      </div>

      {쪽수 > 1 && (
        <>
          {/* 마우스 화면에만 낸다 — 폰에서는 손으로 민다. */}
          <button type="button" aria-label="이전 이미지" className="bstrip-arrow bstrip-prev"
            onClick={() => 옮기기(쪽 - 1)} disabled={쪽 === 0}><ChevronLeft size={15} /></button>
          <button type="button" aria-label="다음 이미지" className="bstrip-arrow bstrip-next"
            onClick={() => 옮기기(쪽 + 1)} disabled={쪽 >= 쪽수 - 1}><ChevronRight size={15} /></button>

          {/* 폰에만 낸다 — 몇 쪽 중 몇 번째인지 알려 준다. 눌러서도 옮길 수 있다. */}
          <div className="bstrip-dots" role="tablist" aria-label="배너 쪽 넘기기">
            {쪽들.map((_, p) => (
              <button key={p} type="button" role="tab" aria-selected={p === 쪽}
                aria-label={`${쪽수}쪽 중 ${p + 1}쪽`}
                className={`bstrip-dot${p === 쪽 ? " on" : ""}`}
                onClick={() => 옮기기(p)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
