"use client";
import { useState } from "react";
import { Sparkles, SpellCheck2, X } from "lucide-react";
import CoverLetterModal, { type 고른것 } from "@/components/profile/CoverLetterModal";

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
  const [창열림, set창열림] = useState(false);
  // 저장값에서 뽑은 조각 — 창에서 보여주고 빼고 싶은 것만 끄게 한다.
  const [내정보, set내정보] = useState<string[]>([]);

  const 토큰 = () => (typeof window === "undefined" ? "" : localStorage.getItem("access_token") || "");

  /** 창을 열 때 저장값을 한 번 읽어 온다 — 무엇으로 쓰는지 보여주려고. */
  const 창열기 = async () => {
    if (value.trim() && !confirm("지금 쓴 글을 새 초안으로 바꿀까요?")) return;
    set말(""); set고칠것(null); set창열림(true);
    try {
      const r = await fetch("/api/ai/cover-letter/pieces", { headers: { Authorization: `Bearer ${토큰()}` } });
      const d = await r.json();
      if (d.success) set내정보(d.data.items || []);
    } catch {}
  };

  const 초안받기 = async (고른: 고른것) => {
    if (짓는중) return;
    set짓는중(true); set말("");
    try {
      const r = await fetch("/api/ai/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${토큰()}` },
        body: JSON.stringify({
          job_id: jobId || null, position_title: positionTitle || null, work_location: workLocation || null,
          strengths: 고른.strengths, goals: 고른.goals, emphasis: 고른.emphasis || null, drop: 고른.drop,
        }),
      });
      const d = await r.json();
      if (!d.success) { set말(d.error?.message || "초안을 만들지 못했어요."); return; }
      // 글이 칸에 들어찬 것이 곧 알림이다. 「고쳐 쓰세요」 같은 말은 붙이지
      // 않는다 — 있는 정보로 만들어 줄 뿐, 무엇을 더 하라고 시키지 않는다.
      onChange(d.data.text);
      set창열림(false);
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
        <button type="button" className="cl-tool" onClick={창열기} disabled={짓는중}>
          <Sparkles size={14} />AI로 초안작성하기
        </button>
        <button type="button" className="cl-tool" onClick={검사하기} disabled={보는중 || value.trim().length < 10}>
          <SpellCheck2 size={14} />{보는중 ? "보는 중…" : "맞춤법 검사하기"}
        </button>
      </div>

      {말 && <p className="cl-tools-say">{말}</p>}

      {창열림 && (
        <CoverLetterModal 내정보={내정보} 만드는중={짓는중}
          onClose={() => { if (!짓는중) set창열림(false); }} onRun={초안받기} />
      )}

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
