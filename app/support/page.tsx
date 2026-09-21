"use client";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import InfoShell from "@/components/InfoShell";
import AttachFiles from "@/components/AttachFiles";

/**
 * 1:1 문의.
 *
 * 창(모달)으로 띄우던 것을 화면 안으로 내린다. 고객센터는 옆줄로 다니는 곳인데
 * 문의만 창으로 덮으면 지금 어디에 있는지가 사라지고, 긴 글을 쓰는 중에 바깥을
 * 잘못 눌러 닫히면 쓰던 것이 날아간다.
 *
 * 공지·FAQ·다운로드는 옆줄이 맡으므로 여기서 또 세우지 않는다.
 *
 * 문의 유형 선택은 없다 — 셀렉미도 1:1 문의는 게시판 하나로 받는다.
 */
export default function SupportPage() {
  const { userName } = useAuthStore();
  const [이름, set이름] = useState("");
  const [메일, set메일] = useState("");
  const [제목, set제목] = useState("");
  const [내용, set내용] = useState("");
  const [보내는중, set보내는중] = useState(false);
  const [끝, set끝] = useState(false);
  const [파일들, set파일들] = useState<File[]>([]);

  useEffect(() => { set이름((v) => v || userName || ""); }, [userName]);

  const 비우기 = () => { set파일들([]);
    set이름(userName || ""); set메일("");
    set제목(""); set내용("");
  };

  const 보내기 = async () => {
    if (!이름.trim()) { alert("이름을 입력해주세요."); return; }
    if (!메일.trim()) { alert("이메일을 입력해주세요."); return; }
    if (!제목.trim()) { alert("제목을 입력해주세요."); return; }
    if (!내용.trim()) { alert("문의 내용을 입력해주세요."); return; }
    set보내는중(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      // 파일을 붙였으면 폼으로, 아니면 여태처럼 JSON 으로 보낸다.
      const 값 = {
        name: 이름.trim(), email: 메일.trim() || null,
        subject: 제목.trim() || null, message: 내용.trim(),
      };
      let 몸통: BodyInit; const 머리: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      if (파일들.length) {
        const fd = new FormData();
        fd.append("payload", JSON.stringify(값));
        파일들.forEach((f) => fd.append("files", f));
        몸통 = fd;
      } else {
        머리["Content-Type"] = "application/json";
        몸통 = JSON.stringify(값);
      }
      const res = await fetch("/api/inquiries", { method: "POST", headers: 머리, body: 몸통 });
      const d = await res.json();
      if (d.success) set끝(true);
      else alert(d.error?.message || "문의 접수에 실패했습니다.");
    } catch (e) {
      alert("문의 접수 중 오류가 발생했습니다.");
      console.error("[inquiry submit]", e);
    } finally {
      set보내는중(false);
    }
  };

  return (
    <InfoShell active="/support" title="1:1 문의하기">
      {끝 ? (
        <div className="sup-done">
          <p className="sup-done-t">문의가 접수되었습니다</p>
          <p className="sup-done-d">남겨주신 이메일로 평일 기준 1~2일 내에 답변드리겠습니다.</p>
          <button type="button" className="sup-form-go" onClick={() => { set끝(false); 비우기(); }}>
            새 문의 쓰기
          </button>
        </div>
      ) : (
        <div className="sup-form">
          {/* 짧은 칸 둘은 한 줄에 나란히 둔다. */}
          <div className="sup-form-2">
            <div>
              <label className="sup-f-l req">이름</label>
              <input className="sup-f-i" placeholder="이름을 입력해주세요"
                     value={이름} onChange={(e) => set이름(e.target.value)} />
            </div>
            <div>
              <label className="sup-f-l req">이메일 (답변 받으실 주소)</label>
              <input className="sup-f-i" type="email" placeholder="답변 받으실 이메일을 입력해주세요"
                     value={메일} onChange={(e) => set메일(e.target.value)} />
            </div>
          </div>

          <label className="sup-f-l req">문의 제목</label>
          <input className="sup-f-i" placeholder="입력해주세요."
                 value={제목} onChange={(e) => set제목(e.target.value)} />

          <label className="sup-f-l req">문의 내용</label>
          <textarea className="sup-f-i sup-f-t" placeholder="내용을 입력해주세요. (3000자 입력 제한)"
                    maxLength={3000} value={내용} onChange={(e) => set내용(e.target.value)} />

          <label className="sup-f-l">파일 첨부</label>
          <AttachFiles 파일들={파일들} 바뀜={set파일들} />

          <div className="sup-form-acts">
            <button type="button" className="sup-form-cancel" onClick={비우기}>취소</button>
            <button type="button" className="sup-form-go" disabled={보내는중} onClick={보내기}>
              {보내는중 ? "접수 중…" : "문의하기"}
            </button>
          </div>
        </div>
      )}
    </InfoShell>
  );
}
