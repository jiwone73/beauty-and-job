"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// 저장하지 않은 내용이 있는 채로 화면을 떠나려 하면 물어본다.
//
// 자동 저장이 없는 폼에 쓴다. 막는 길은 셋이다.
//   · 화면 안 링크(<a>, Next 의 Link) — 문서 맨 앞에서 가로채 이동을 멈추고 묻는다.
//   · 뒤로 가기 — 같은 주소의 칸막이 기록 하나를 얹어 두었다가, 뒤로 가면 다시 얹고 묻는다.
//   · 탭 닫기·새로고침 — 브라우저 기본 확인창(문구는 브라우저가 정한다).
// 코드로 부르는 router.push 는 가로챌 수 없다 — 그런 단추는 dirty 를 보고 직접 처리한다.

type 이동 = { kind: "link"; href: string } | { kind: "back" } | { kind: "manual"; go: () => void };

export type 이동막이 = {
  /** 이동하려다 멈춘 것. null 이면 물음창이 닫혀 있다. */
  물음: 이동 | null;
  /** 「계속 작성」 — 물음창만 닫는다. */
  계속하기: () => void;
  /** 물어볼 것 없이 멈춘 이동을 지금 실행한다(저장하거나 취소한 뒤 부른다). */
  이동하기: () => void;
  /** 저장·입력 취소를 시작하기 전에 부른다 — 그 사이 저장 상태가 바뀌어도 칸막이 정리가 이동과 엉키지 않게. */
  준비: () => void;
  /** 저장이 실패해 이동하지 않기로 했을 때 부른다. */
  준비취소: () => void;
  /** 코드로 이동하려는 곳에서 부른다. 저장 안 한 것이 있으면 묻고, 없으면 바로 go 를 실행한다. */
  물어보고이동: (go: () => void) => void;
};

export function useUnsavedGuard(dirty: boolean): 이동막이 {
  const router = useRouter();
  const [물음, set물음] = useState<이동 | null>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  // 이동을 실행하는 순간에는 우리가 다시 막지 않는다.
  const 통과 = useRef(false);

  // 화면 안 링크 가로채기
  useEffect(() => {
    const 누름 = (e: MouseEvent) => {
      if (!dirtyRef.current || 통과.current) return;
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      if (a.target && a.target !== "_self") return;
      if (a.hasAttribute("download")) return;
      let url: URL;
      try { url = new URL(a.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      set물음({ kind: "link", href: url.pathname + url.search + url.hash });
    };
    document.addEventListener("click", 누름, true);
    return () => document.removeEventListener("click", 누름, true);
  }, []);

  // 탭 닫기·새로고침
  useEffect(() => {
    const 떠남 = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current || 통과.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", 떠남);
    return () => window.removeEventListener("beforeunload", 떠남);
  }, []);

  // 뒤로 가기: 저장 안 한 내용이 생기면 같은 주소의 칸막이 기록을 하나 얹는다.
  // 뒤로 가면 그 칸막이가 빠질 뿐 화면은 그대로이니, 다시 얹고 물어본다.
  useEffect(() => {
    if (!dirty) return;
    window.history.pushState({ 이동막이: true }, "", window.location.href);
    const 뒤로 = () => {
      if (!dirtyRef.current || 통과.current) return;
      window.history.pushState({ 이동막이: true }, "", window.location.href);
      set물음({ kind: "back" });
    };
    window.addEventListener("popstate", 뒤로);
    return () => {
      window.removeEventListener("popstate", 뒤로);
      // 저장해서 더 물을 것이 없어졌으면 칸막이를 치운다. 안 치우면 뒤로 가기를 두 번 눌러야 한다.
      // 이동해 나가는 중(통과)에는 손대지 않는다 — 이동과 엉킨다.
      if (!통과.current && window.history.state?.이동막이) window.history.back();
    };
  }, [dirty]);

  const 계속하기 = useCallback(() => set물음(null), []);
  const 준비 = useCallback(() => { 통과.current = true; }, []);
  const 준비취소 = useCallback(() => { 통과.current = false; }, []);

  const 이동하기 = useCallback(() => {
    const m = 물음;
    set물음(null);
    if (!m) return;
    통과.current = true;
    if (m.kind === "link") router.push(m.href);
    else if (m.kind === "back") window.history.go(-2); // 칸막이와 이 화면을 함께 건너뛴다
    else m.go();
    // 이동이 끝나면 이 화면은 사라지지만, 이동이 실패하는 경우를 위해 잠깐 뒤 원래대로 돌린다.
    setTimeout(() => { 통과.current = false; }, 1500);
  }, [물음, router]);

  const 물어보고이동 = useCallback((go: () => void) => {
    if (!dirtyRef.current) { go(); return; }
    set물음({ kind: "manual", go });
  }, []);

  return { 물음, 계속하기, 이동하기, 준비, 준비취소, 물어보고이동 };
}

/** 저장하지 않은 내용이 있을 때 뜨는 물음창. */
export function UnsavedDialog({
  guard, 저장할수있나, 저장글 = "저장하기", 임시글 = "임시저장", 저장, 임시저장, 입력취소,
}: {
  guard: 이동막이;
  /** false 면 필수 항목이 비어 「저장하기」가 안 되는 상태다 — 임시저장을 권한다. */
  저장할수있나: boolean;
  저장글?: string;
  임시글?: string;
  /** 저장하고 성공하면 true. */
  저장: () => Promise<boolean>;
  /** 임시저장을 지원하지 않는 폼이면 생략한다. */
  임시저장?: () => Promise<boolean>;
  /** 저장하지 않은 입력을 버린다(서버에 저장된 값으로 되돌린다). */
  입력취소: () => Promise<void> | void;
}) {
  const [일하는중, set일하는중] = useState(false);
  if (!guard.물음) return null;

  const 이어가기 = async (일: () => Promise<boolean | void>, 성공뒤이동 = true) => {
    set일하는중(true);
    guard.준비();
    try {
      const 됨 = await 일();
      if (됨 === false) { guard.준비취소(); return; } // 실패 — 물음창을 그대로 둔다
      if (성공뒤이동) guard.이동하기();
    } catch (e) {
      guard.준비취소();
      throw e;
    } finally {
      set일하는중(false);
    }
  };

  const 주된 = 저장할수있나 || !임시저장
    ? { 글: 저장글, 일: 저장 }
    : { 글: 임시글, 일: 임시저장 };

  return (
    <div className="ug-overlay" onClick={guard.계속하기}>
      <div className="ug-box" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3 className="ug-title">저장하지 않은 내용이 있어요</h3>
        {!저장할수있나 && 임시저장 && <p className="ug-sub">필수 항목이 비어 있어요</p>}
        <div className="ug-btns">
          <button type="button" className="ug-primary" disabled={일하는중} onClick={() => 이어가기(주된.일)}>
            {일하는중 ? "저장 중…" : 주된.글}
          </button>
          <button type="button" className="ug-secondary" disabled={일하는중}
            onClick={() => 이어가기(async () => { await 입력취소(); })}>
            입력 취소
          </button>
          <button type="button" className="ug-ghost" disabled={일하는중} onClick={guard.계속하기}>
            계속 작성
          </button>
        </div>
      </div>
    </div>
  );
}
