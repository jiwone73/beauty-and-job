"use client";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/store/authStore";
import InfoShell from "@/components/InfoShell";
import PrivacyConsent from "@/components/PrivacyConsent";
import { 문의유형 } from "@/lib/inquiryTypes";

/**
 * 1:1 문의.
 *
 * 창(모달)으로 띄우던 것을 화면 안으로 내린다. 고객센터는 옆줄로 다니는 곳인데
 * 문의만 창으로 덮으면 지금 어디에 있는지가 사라지고, 긴 글을 쓰는 중에 바깥을
 * 잘못 눌러 닫히면 쓰던 것이 날아간다.
 *
 * 공지·FAQ·다운로드는 옆줄이 맡으므로 여기서 또 세우지 않는다.
 */
const 유형들 = [...문의유형];

export default function SupportPage() {
  const { userName } = useAuthStore();
  const [이름, set이름] = useState("");
  const [메일, set메일] = useState("");
  const [전화, set전화] = useState("");
  const [유형, set유형] = useState(유형들[0]);
  const [제목, set제목] = useState("");
  const [내용, set내용] = useState("");
  const [보내는중, set보내는중] = useState(false);
  const [끝, set끝] = useState(false);
  const [동의, set동의] = useState(false);

  useEffect(() => { set이름((v) => v || userName || ""); }, [userName]);

  const 비우기 = () => {
    set이름(userName || ""); set메일(""); set전화("");
    set유형(유형들[0]); set제목(""); set내용(""); set동의(false);
  };

  const 보내기 = async () => {
    if (!이름.trim()) { alert("이름을 입력해주세요."); return; }
    if (!메일.trim()) { alert("이메일을 입력해주세요."); return; }
    if (!제목.trim()) { alert("제목을 입력해주세요."); return; }
    if (!내용.trim()) { alert("문의 내용을 입력해주세요."); return; }
    if (!동의) { alert("개인정보 수집 및 이용에 동의해주세요."); return; }
    set보내는중(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          name: 이름.trim(), email: 메일.trim() || null, phone: 전화.trim() || null,
          type: 유형, subject: 제목.trim() || null, message: 내용.trim(), privacy_agreed: 동의,
        }),
      });
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
          {/* 짧은 칸 넷은 두 줄로 접는다 — 한 칸씩 내려 쌓으면 정작 길게 쓰는
              제목·내용이 화면 밖으로 밀린다. */}
          <div className="sup-form-2">
            <div>
              <label className="sup-f-l">문의 유형</label>
              <select className="sup-f-i" value={유형} onChange={(e) => set유형(e.target.value)}>
                {유형들.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
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
            <div>
              <label className="sup-f-l">전화번호</label>
              <input className="sup-f-i" type="tel" placeholder="연락 가능한 전화번호 (선택)"
                     value={전화} onChange={(e) => set전화(e.target.value)} />
            </div>
          </div>

          <label className="sup-f-l req">문의 제목</label>
          <input className="sup-f-i" placeholder="입력해주세요."
                 value={제목} onChange={(e) => set제목(e.target.value)} />

          <label className="sup-f-l req">문의 내용</label>
          <textarea className="sup-f-i sup-f-t" placeholder="내용을 입력해주세요. (3000자 입력 제한)"
                    maxLength={3000} value={내용} onChange={(e) => set내용(e.target.value)} />

          <PrivacyConsent agreed={동의} onChange={set동의}
                          items="이름, 이메일, 전화번호, 문의 유형, 문의 내용" />

          <div className="sup-form-acts">
            <button type="button" className="sup-form-cancel" onClick={비우기}>취소</button>
            <button type="button" className="sup-form-go" disabled={보내는중 || !동의} onClick={보내기}>
              {보내는중 ? "접수 중…" : "문의하기"}
            </button>
          </div>
        </div>
      )}
    </InfoShell>
  );
}
