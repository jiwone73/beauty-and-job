"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { X, CalendarPlus, Send, MoreHorizontal, MapPin } from "lucide-react";
import { 제안유효일 } from "@/lib/proposal";

// 제안 스레드의 대화. 매장과 구직자가 같은 화면을 쓴다 — 한쪽만 다르게 보이면
// 무슨 말이 어떻게 갔는지 서로 다르게 기억하게 된다.
//
// 대화의 목적지는 잡담이 아니라 '언제 와서 보실래요'다. 그래서 약속을 따로
// 두지 않고 말풍선과 같은 줄에 섞고, 잡힌 약속만 위쪽에 고정해 둔다.

type 메시지 = {
  id: string;
  sender: "USER" | "COMPANY";
  kind: "TEXT" | "APPOINTMENT";
  body: string | null;
  appointment_at: string | null;
  appointment_place: string | null;
  appointment_status: "PROPOSED" | "ACCEPTED" | "DECLINED" | null;
  created_at: string;
};

const 때 = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });

const 약속때 = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "long", day: "numeric", weekday: "short", hour: "numeric", minute: "2-digit" });

// 번호를 주고받는 것은 막지 않는다 — 이 업계 채용은 결국 통화로 정해진다.
// 다만 아무 데나 남기는 일은 없게 한 줄 알려 준다.
// 지도는 공고 상세에서 이미 카카오를 쓰고 있다. 길찾기도 같은 곳으로 보낸다 —
// 앱이 깔려 있으면 앱으로 열리고, 없으면 웹 지도로 열린다.
const 길찾기 = (주소: string) => `https://map.kakao.com/link/search/${encodeURIComponent(주소)}`;

const 번호있나 = (s: string) => /(01[016-9])[ .-]?\d{3,4}[ .-]?\d{4}/.test(s);

export default function ProposalThread({
  proposalId, 제목, 상대, token, onClose,
}: {
  proposalId: string;
  제목: string;
  상대: string;
  token: string;
  onClose: () => void;
}) {
  const [메시지들, set메시지들] = useState<메시지[]>([]);
  const [나, set나] = useState<"USER" | "COMPANY" | null>(null);
  const [글, set글] = useState("");
  const [보내는중, set보내는중] = useState(false);
  const [약속열림, set약속열림] = useState(false);
  const [약속값, set약속값] = useState("");
  const [차단됨, set차단됨] = useState(false);
  const [만료됨, set만료됨] = useState(false);
  const [메뉴, set메뉴] = useState(false);
  // 어디서 볼지. 기본값은 그 공고의 근무지고, 다른 데서 보기로 했으면 고쳐 쓴다.
  const [장소, set장소] = useState("");
  const [기본장소, set기본장소] = useState("");
  const 바닥 = useRef<HTMLDivElement>(null);

  const 헤더 = { Authorization: `Bearer ${token}` };

  const 불러오기 = useCallback(async () => {
    const r = await fetch(`/api/proposals/${proposalId}/messages`, { headers: 헤더 }).then((x) => x.json()).catch(() => null);
    if (r?.success && r.data) {
      set메시지들(r.data.messages || []);
      set나(r.data.me);
      set차단됨(!!r.data.blocked);
      set만료됨(!!r.data.expired);
      set기본장소(r.data.기본장소 || "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId, token]);

  useEffect(() => { 불러오기(); }, [불러오기]);
  useEffect(() => { 바닥.current?.scrollIntoView({ block: "end" }); }, [메시지들.length]);

  const 보내기 = async () => {
    const 내용 = 글.trim();
    if (!내용 || 보내는중) return;
    set보내는중(true);
    set글("");
    await fetch(`/api/proposals/${proposalId}/messages`, {
      method: "POST",
      headers: { ...헤더, "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "TEXT", body: 내용 }),
    }).catch(() => {});
    await 불러오기();
    set보내는중(false);
  };

  const 약속보내기 = async () => {
    if (!약속값) return;
    set보내는중(true);
    const r = await fetch(`/api/proposals/${proposalId}/messages`, {
      method: "POST",
      headers: { ...헤더, "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "APPOINTMENT", appointmentAt: new Date(약속값).toISOString(), place: 장소.trim() || 기본장소 }),
    }).then((x) => x.json()).catch(() => null);
    if (r && !r.success) alert(r.error?.message || "약속을 보내지 못했어요.");
    set약속열림(false); set약속값(""); set장소("");
    await 불러오기();
    set보내는중(false);
  };

  const 약속답 = async (msgId: string, status: "ACCEPTED" | "DECLINED") => {
    await fetch(`/api/proposals/${proposalId}/messages/${msgId}`, {
      method: "PATCH",
      headers: { ...헤더, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
    await 불러오기();
  };

  const 신고 = async () => {
    set메뉴(false);
    const 사유 = prompt("어떤 점을 신고할까요? (예: 욕설·비하, 허위 공고, 개인정보 요구)");
    if (!사유?.trim()) return;
    const r = await fetch(`/api/proposals/${proposalId}/report`, {
      method: "POST", headers: { ...헤더, "Content-Type": "application/json" },
      body: JSON.stringify({ reason: 사유.trim() }),
    }).then((x) => x.json()).catch(() => null);
    alert(r?.success ? "신고했어요. 확인 후 조치할게요." : "신고하지 못했어요.");
  };

  const 차단 = async () => {
    set메뉴(false);
    if (!confirm("차단하면 서로 보이지 않고 더 이상 대화할 수 없어요. 차단할까요?")) return;
    const r = await fetch(`/api/proposals/${proposalId}/block`, {
      method: "POST", headers: 헤더,
    }).then((x) => x.json()).catch(() => null);
    if (r?.success) { set차단됨(true); alert("차단했어요."); }
    else alert("차단하지 못했어요.");
  };

  const 잡힌약속 = [...메시지들].reverse()
    .find((m) => m.kind === "APPOINTMENT" && m.appointment_status === "ACCEPTED");

  return (
    <div className="pth-back" onClick={onClose}>
      <div className="pth" onClick={(e) => e.stopPropagation()}>
        <div className="pth-head">
          <div>
            <div className="pth-who">{상대}</div>
            <div className="pth-job">{제목}</div>
          </div>
          <div className="pth-more">
            <button type="button" onClick={() => set메뉴((v) => !v)} aria-label="더보기"><MoreHorizontal size={20} /></button>
            {메뉴 && (
              <div className="pth-menu">
                <button type="button" onClick={신고}>신고하기</button>
                <button type="button" onClick={차단}>차단하기</button>
              </div>
            )}
          </div>
          <button type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
        </div>

        {/* 잡힌 약속은 스크롤해서 찾을 것이 아니라 늘 보여야 한다. */}
        {잡힌약속?.appointment_at && (
          <div className="pth-fixed">
            <span>면접 약속</span>
            <b>{약속때(잡힌약속.appointment_at)}</b>
            {잡힌약속.appointment_place && (
              <a href={길찾기(잡힌약속.appointment_place)} target="_blank" rel="noopener noreferrer">
                <MapPin size={13} />{잡힌약속.appointment_place}
              </a>
            )}
          </div>
        )}

        <div className="pth-body">
          {메시지들.length === 0 && (
            <p className="pth-empty">아직 주고받은 말이 없어요.</p>
          )}
          {메시지들.map((m) => {
            const 내것 = m.sender === 나;
            if (m.kind === "APPOINTMENT" && m.appointment_at) {
              return (
                <div key={m.id} className={`pth-appt${내것 ? " mine" : ""}`}>
                  <div className="pth-appt-when">
                    <CalendarPlus size={15} />
                    <b>{약속때(m.appointment_at)}</b>
                  </div>
                  {m.appointment_place && (
                    <a className="pth-appt-place" href={길찾기(m.appointment_place)} target="_blank" rel="noopener noreferrer">
                      <MapPin size={13} />
                      <span>{m.appointment_place}</span>
                    </a>
                  )}
                  {m.appointment_status === "ACCEPTED" ? (
                    <span className="pth-appt-done">약속됐어요</span>
                  ) : m.appointment_status === "DECLINED" ? (
                    <span className="pth-appt-no">이때는 어렵대요</span>
                  ) : 내것 ? (
                    <span className="pth-appt-wait">답을 기다리는 중</span>
                  ) : (
                    <div className="pth-appt-acts">
                      <button type="button" onClick={() => 약속답(m.id, "DECLINED")}>어려워요</button>
                      <button type="button" className="key" onClick={() => 약속답(m.id, "ACCEPTED")}>좋아요</button>
                    </div>
                  )}
                </div>
              );
            }
            return (
              <div key={m.id} className={`pth-msg${내것 ? " mine" : ""}`}>
                <p>{m.body}</p>
                <span>{때(m.created_at)}</span>
              </div>
            );
          })}
          <div ref={바닥} />
        </div>

        {차단됨 || 만료됨 ? (
          <p className="pth-closed">
            {차단됨 ? "차단된 대화예요." : `답변 기간(${제안유효일}일)이 지나 닫힌 대화예요.`}
          </p>
        ) : (
          <>
            {/* 약속 폼은 메시지창을 덮지 않고 그 위에 얹는다. 덮어 버리면 달력을
                누른 걸 잊었을 때 「대화는 어디서 하지」가 된다. */}
            {약속열림 && (
              <div className="pth-appt-form">
                <input type="datetime-local" value={약속값} onChange={(e) => set약속값(e.target.value)} />
                <input type="text" value={장소} placeholder={기본장소 || "만날 곳"}
                  onChange={(e) => set장소(e.target.value)} />
                <div className="pth-appt-form-acts">
                  <button type="button" onClick={() => { set약속열림(false); set약속값(""); set장소(""); }}>취소</button>
                  <button type="button" className="key" disabled={!약속값 || 보내는중} onClick={약속보내기}>약속 보내기</button>
                </div>
              </div>
            )}
            <div className="pth-send">
              {/* 최종 일정은 매장이 정한다 — 그날 예약이 몇 개인지는 매장만 알고,
                  장소도 그 공고의 근무지라 구직자가 고칠 값이 아니다. 구직자는
                  메시지로 묻고 「좋아요·어려워요」로 답한다. */}
              {나 === "COMPANY" && (
                <button type="button" className={`pth-appt-open${약속열림 ? " on" : ""}`} title="면접 약속 잡기"
                  onClick={() => set약속열림((v) => !v)}>
                  <CalendarPlus size={18} />
                </button>
              )}
              <textarea value={글} rows={1} placeholder="메시지를 입력하세요"
                onChange={(e) => set글(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); 보내기(); } }} />
              <button type="button" className="pth-send-btn" disabled={!글.trim() || 보내는중}
                onClick={보내기} aria-label="보내기"><Send size={17} /></button>
            </div>
          </>
        )}
        {번호있나(글) && (
          <p className="pth-warn">전화번호는 서로 믿을 만할 때 주고받는 게 좋아요.</p>
        )}
      </div>
    </div>
  );
}
