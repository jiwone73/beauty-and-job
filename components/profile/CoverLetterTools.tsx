"use client";
import { useState } from "react";
import { Sparkles, SpellCheck2, X } from "lucide-react";

// 자기소개서 칸 위의 두 단추 — AI 초안, 맞춤법.
//
// 초안은 이미 저장된 값(한 줄 소개·직군·스킬·경력·자격증·희망 조건)으로 만든다.
// 화면에서 키워드를 열두 개 고르게 하지 않는다 — 그 사람이 무엇을 하는 사람인지
// 우리는 이미 알고 있다. 공고에서 열면 그 공고에 맞춰 쓴다.

type 교정 = { before: string; after: string; why: string };

export default function CoverLetterTools({
  value, onChange, jobId, positionTitle, workLocation,
}: {
  value: string;
  onChange: (v: string) => void;
  /** 공고에서 열었을 때만 — 그 자리에 맞춰 쓴다. */
  jobId?: string;
  positionTitle?: string;
  workLocation?: string;
}) {
  const [짓는중, set짓는중] = useState(false);
  const [보는중, set보는중] = useState(false);
  const [고칠것, set고칠것] = useState<교정[] | null>(null);
  const [말, set말] = useState("");

  const 토큰 = () => (typeof window === "undefined" ? "" : localStorage.getItem("access_token") || "");

  const 초안받기 = async () => {
    if (짓는중) return;
    if (value.trim() && !confirm("지금 쓴 글을 새 초안으로 바꿀까요?")) return;
    set짓는중(true); set말(""); set고칠것(null);
    try {
      const r = await fetch("/api/ai/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${토큰()}` },
        body: JSON.stringify({ job_id: jobId || null, position_title: positionTitle || null, work_location: workLocation || null }),
      });
      const d = await r.json();
      if (!d.success) { set말(d.error?.message || "초안을 만들지 못했어요."); return; }
      onChange(d.data.text);
      set말(`초안을 만들었어요. 그대로 두지 말고 내 말로 고쳐 주세요. (오늘 ${d.data.left}번 남음)`);
    } catch { set말("초안을 만들지 못했어요."); }
    finally { set짓는중(false); }
  };

  const 검사하기 = async () => {
    if (보는중) return;
    set보는중(true); set말(""); set고칠것(null);
    try {
      const r = await fetch("/api/ai/spellcheck", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${토큰()}` },
        body: JSON.stringify({ text: value }),
      });
      const d = await r.json();
      if (!d.success) { set말(d.error?.message || "검사하지 못했어요."); return; }
      set고칠것(d.data.items);
      if (!d.data.items.length) set말("고칠 곳을 못 찾았어요.");
    } catch { set말("검사하지 못했어요."); }
    finally { set보는중(false); }
  };

  /** 하나씩 고친다 — 전문을 갈아치우면 어디가 바뀌었는지 알 수 없다. */
  const 하나고치기 = (c: 교정) => {
    if (!value.includes(c.before)) { set고칠것((p) => (p || []).filter((x) => x !== c)); return; }
    onChange(value.split(c.before).join(c.after));
    set고칠것((p) => (p || []).filter((x) => x !== c));
  };

  return (
    <div className="cl-tools">
      <div className="cl-tools-btns">
        <button type="button" className="cl-tool" onClick={초안받기} disabled={짓는중}>
          <Sparkles size={14} />{짓는중 ? "쓰는 중…" : "AI 초안"}
        </button>
        <button type="button" className="cl-tool" onClick={검사하기} disabled={보는중 || value.trim().length < 10}>
          <SpellCheck2 size={14} />{보는중 ? "보는 중…" : "맞춤법"}
        </button>
      </div>

      {말 && <p className="cl-tools-say">{말}</p>}

      {!!고칠것?.length && (
        <div className="cl-fix">
          {고칠것.map((c, i) => (
            <div key={i} className="cl-fix-row">
              <span className="cl-fix-why">{c.why}</span>
              <span className="cl-fix-txt"><s>{c.before}</s> → <b>{c.after}</b></span>
              <button type="button" className="cl-fix-go" onClick={() => 하나고치기(c)}>고치기</button>
              <button type="button" className="cl-fix-x" aria-label="넘어가기"
                onClick={() => set고칠것((p) => (p || []).filter((x) => x !== c))}><X size={14} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
