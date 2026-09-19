"use client";
import { Paperclip, X } from "lucide-react";
import { 붙일수있는확장자, 첨부최대개수, 첨부최대크기 } from "@/lib/inquiryFileLimits";

/** 문의에 파일을 붙이는 칸. 1:1 문의와 사업문의가 함께 쓴다. */
export default function AttachFiles({ 파일들, 바뀜 }: {
  파일들: File[];
  바뀜: (다음: File[]) => void;
}) {
  const 더하기 = (고른: FileList | null) => {
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

  return (
    <div className="att">
      <label className="att-pick">
        <Paperclip size={15} />
        파일 첨부
        <input type="file" multiple onChange={(e) => { 더하기(e.target.files); e.target.value = ""; }} />
      </label>
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
