"use client";
import { useEffect, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { 붙일수있는확장자, 첨부최대개수, 첨부최대크기 } from "@/lib/inquiryFileLimits";

/** 문의에 파일을 붙이는 칸. 1:1 문의와 사업문의가 함께 쓴다.
 *  끌어놓기는 켠 곳에서만 된다(테스트 리포트의 화면 사진). 다른 화면은 그대로 둔다. */
export default function AttachFiles({ 파일들, 바뀜, 끌어놓기 = false }: {
  파일들: File[];
  바뀜: (다음: File[]) => void;
  끌어놓기?: boolean;
}) {
  const [끄는중, set끄는중] = useState(false);
  const 더하기 = (고른: FileList | File[] | null) => {
    if (!고른) return;
    const 다음 = [...파일들];
    for (const f of Array.from(고른)) {
      if (다음.length >= 첨부최대개수) break;
      if (f.size > 첨부최대크기) { alert(`${f.name} — 한 개에 5MB 까지 붙일 수 있어요.`); continue; }
      const 확 = (f.name.split(".").pop() || "").toLowerCase();
      if (!붙일수있는확장자.includes(확)) { alert(`${f.name} — 붙일 수 없는 파일이에요.`); continue; }
      다음.push(f);
    }
    바뀜(다음);
  };

  // 화면을 캡처해 Ctrl+V(맥은 ⌘V)로 바로 붙인다. 글자를 붙이는 것(파일이 없는 클립보드)은 건드리지 않는다.
  // 캡처는 이름이 모두 image.png 라 구분이 안 된다 — 붙인 순서대로 이름을 새로 준다.
  useEffect(() => {
    if (!끌어놓기) return;
    const 붙이기 = (e: ClipboardEvent) => {
      const 파일 = Array.from(e.clipboardData?.files || []);
      if (!파일.length) return;
      e.preventDefault();
      const 이름붙임 = 파일.map((f, i) => {
        const 확 = (f.name.split(".").pop() || "png").toLowerCase();
        return f.name.toLowerCase().startsWith("image.") ? new File([f], `붙여넣은-화면-${파일들.length + i + 1}.${확}`, { type: f.type }) : f;
      });
      더하기(이름붙임);
    };
    document.addEventListener("paste", 붙이기);
    return () => document.removeEventListener("paste", 붙이기);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [끌어놓기, 파일들]);

  const 끌어놓기손 = 끌어놓기 ? {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); set끄는중(true); },
    onDragLeave: () => set끄는중(false),
    onDrop: (e: React.DragEvent) => { e.preventDefault(); set끄는중(false); 더하기(e.dataTransfer.files); },
  } : {};

  return (
    <div
      className="att"
      {...끌어놓기손}
      style={끌어놓기 ? {
        border: `1px dashed ${끄는중 ? "#582681" : "#d9d9de"}`, background: 끄는중 ? "#f4eefa" : undefined,
        borderRadius: 8, padding: "10px 12px", transition: "background .12s, border-color .12s",
      } : undefined}
    >
      <label className="att-pick">
        <Paperclip size={15} />
        파일 첨부
        <input type="file" multiple onChange={(e) => { 더하기(e.target.files); e.target.value = ""; }} />
      </label>
      {끌어놓기 && 파일들.length === 0 && (
        <span style={{ fontSize: 12.5, color: "#555" }}>끌어다 놓거나 캡처한 뒤 Ctrl+V (맥은 ⌘V)</span>
      )}
      {파일들.map((f, i) => (
        <span key={`${f.name}-${i}`} className="att-one">
          {f.name}
          <button type="button" aria-label="빼기" onClick={() => 바뀜(파일들.filter((_, k) => k !== i))}>
            <X size={13} />
          </button>
        </span>
      ))}
    </div>
  );
}
