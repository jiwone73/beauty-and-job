"use client";
import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { formatPhone } from "@/lib/phone";
import { ChevronDown, Paperclip, Search, Trash2 } from "lucide-react";
import { 사업문의유형 } from "@/lib/inquiryTypes";

const PRODUCT_LABELS: Record<string, string> = {
  top_exposure: "공고 상단 노출",
  brand_page: "브랜드 페이지 제작",
  banner: "배너 광고",
  other: "기타 문의",
};

type Inquiry = {
  id: number;
  company_name: string | null;
  contact_name: string;
  phone: string | null;
  email: string | null;
  product: string | null;
  subject: string | null;
  files: { id: number; name: string; size: number }[];
  reply_files: { id: number; name: string; size: number }[];
  message: string;
  status: string;
  type: string;
  created_at: string;
  replied_at: string | null;
  opened_at: string | null;
  reply_body: string | null;
};

// 제목이 없던 시절의 문의는 상품명이 제목 노릇을 했다 — 그것으로 대신 채운다.
// 내용 앞부분을 잘라 제목인 척 세우지는 않는다.
function 제목(it: Inquiry) {
  if (it.subject) return it.subject;
  if (it.product) return PRODUCT_LABELS[it.product] ?? it.product;
  return "(제목 없음)";
}

// 답변한 문의 목록에 보일 첫 줄 — 인사말 다음 줄부터 실제 답이 시작되곤 해서,
// 빈 줄은 건너뛰고 글자가 있는 첫 줄을 찾는다.
function 답변첫줄(body: string | null) {
  if (!body) return "";
  return (body.split("\n").find((l) => l.trim()) || "").trim();
}

function fmtDate(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

async function filesToAttachments(files: File[]) {
  return Promise.all(
    files.map(
      (file) =>
        new Promise<{ filename: string; content: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve({ filename: file.name, content: String(reader.result).split(",")[1] || "" });
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );
}

export default function AdminAdsPage() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  // 받은문의함은 이메일 받은편지함처럼 답장 여부와 상관없이 계속 쌓인다.
  // 보낸문의함만 답장을 보낸 것으로 좁힌다. "all"·"inbox"는 그래서 목록 기준이 같다.
  const [sideTab, setSideTab] = useState<"all" | "inbox" | "unanswered" | "sent">("all");
  // "전체" 갈래는 뺀다 — 유형이 셋뿐이라 늘 펼쳐 두면 그 자체로 전체나 다름없다.
  const [유형고름, set유형고름] = useState(사업문의유형[0]);
  // 유형별로 접고 펼 수 있게. 기본은 펼침(명시적으로 접은 것만 true).
  const [접힌유형, set접힌유형] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Inquiry | null>(null);
  const [checked, setChecked] = useState<number[]>([]);
  const [검색, set검색] = useState("");
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const token = () => (typeof window !== "undefined" ? localStorage.getItem("admin_token") : null);

  /* 서버에는 거르지 않고 전부 청한다. 걸러 받으면 옆줄의 건수가 지금 걸린
     필터 안에서만 세어져, 「광고 0 · 제휴 2」처럼 실제와 다른 숫자가 보였다.
     문의는 많아야 수백 건이라 받아 놓고 화면에서 거르는 편이 맞다. */
  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/ads/inquiries`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      setItems(data.data?.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); setChecked([]); }, []);

  const openDetail = (item: Inquiry) => {
    setSelected(item);
    setReplySubject(`[뷰티워크] ${item.type || "광고"} 문의 답변`);
    // 이미 답한 것을 다시 열면 그때 실제로 보낸 글을 보여준다 — 매번 같은 기본
    // 문구로 덮으면 무슨 말을 했는지 여기서는 알 수 없다.
    setReplyBody(item.reply_body || `안녕하세요, ${item.contact_name || "고객"}님.\n뷰티워크입니다.\n\n문의 주신 내용에 대해 답변드립니다.\n\n\n\n──────────\n[문의 내용]\n${item.message}`);
    setFiles([]);
    // 미답변 문의: 신규인데 아직 안 열어본 것만 "열어봄" 시각을 남긴다.
    if (item.status === "new" && !item.opened_at) {
      const opened_at = new Date().toISOString();
      setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, opened_at } : it)));
      fetch("/api/admin/ads/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id: item.id, mark_opened: true }),
      }).catch((e) => console.error("[mark opened]", e));
    }
  };

  const markDone = async (id: number) => {
    try {
      await fetch("/api/admin/ads/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id, status: "done" }),
      });
      setSelected((p) => (p ? { ...p, status: "done" } : p));
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, status: "done" } : it)));
      window.dispatchEvent(new Event("admin:inquiries-changed"));
    } catch (e) {
      console.error("[mark done]", e);
    }
  };

  const sendReply = async () => {
    if (!selected?.email) { alert("이메일 주소가 없어 답변을 보낼 수 없습니다."); return; }
    if (!replyBody.trim()) { alert("답변 내용을 입력해 주세요."); return; }
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    if (totalSize > 3 * 1024 * 1024) { alert("첨부파일 총 용량은 3MB 이하여야 합니다."); return; }
    try {
      const attachments = await filesToAttachments(files);
      const res = await fetch("/api/admin/ads/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ id: selected.id, to: selected.email, subject: replySubject, body: replyBody, attachments }),
      });
      const data = await res.json();
      if (data.success) {
        const replied_at = new Date().toISOString();
        setSelected((p) => (p ? { ...p, status: "done", replied_at, reply_body: replyBody } : p));
        setItems((prev) => prev.map((it) => (it.id === selected.id ? { ...it, status: "done", replied_at, reply_body: replyBody } : it)));
        window.dispatchEvent(new Event("admin:inquiries-changed"));
        setFiles([]);
        alert("support@beautywork.co.kr에서 답변 메일을 발송했습니다.");
      } else {
        alert(data.error?.message || "메일 발송에 실패했습니다.");
      }
    } catch (e) {
      console.error("[send reply]", e);
      alert("메일 발송 중 오류가 발생했습니다.");
    }
  };

  const toggleCheck = (id: number) =>
    setChecked((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const toggleAll = () =>
    setChecked((c) => (c.length === items.length ? [] : items.map((it) => it.id)));

  const handleDelete = async () => {
    if (checked.length === 0) return;
    if (!confirm(`선택한 ${checked.length}건의 문의를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`)) return;
    try {
      const res = await fetch("/api/admin/ads/inquiries", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ids: checked }),
      });
      const data = await res.json();
      if (data.success) {
        setItems((prev) => prev.filter((it) => !checked.includes(it.id)));
        setChecked([]);
        window.dispatchEvent(new Event("admin:inquiries-changed"));
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (e) {
      console.error("[delete]", e);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const badge = (status: string) => (
    <span style={{ fontSize: 13, whiteSpace: "nowrap", color: "#555" }}>
      {status === "done" ? "회신완료" : "신규"}
    </span>
  );

  const 상태갈래 = [
    { key: "", label: "전체" },
    { key: "new", label: "신규" },
    { key: "done", label: "회신완료" },
  ];
  const 갈래수 = (ty: string, st = "") => items.filter((it) =>
    (ty === "전체" || (it.type || "광고") === ty) && (!st || it.status === st)).length;
  // 미답변: 열어는 봤는데 아직 답을 안 한 것 — 신규문의 중 opened_at 이 있는 것.
  const 미답변수 = (ty: string) => items.filter((it) =>
    (ty === "전체" || (it.type || "광고") === ty) && it.status === "new" && it.opened_at).length;

  /* 옆줄은 함(받은·보낸)만 맡는다. 유형은 표의 한 열이고, 찾는 일은 검색이 한다. */
  const 찾는말 = 검색.trim();
  const 보일것 = items.filter((it) =>
    (sideTab === "sent" ? it.status === "done"
      : sideTab === "unanswered" ? (it.status === "new" && it.opened_at)
      : sideTab === "inbox" ? it.status === "new" : true) &&
    (유형고름 === "전체" || (it.type || "광고") === 유형고름) &&
    (!찾는말 || [it.subject, it.company_name, it.contact_name, it.email, it.message]
      .some((v) => (v || "").includes(찾는말))));

  /* 같은 이메일로 온 문의는 같은 건으로 본다 — 회사명·담당자명은 사람이
     매번 다르게 적을 수 있어 이메일이 제일 믿을 만하다. "전체"를 볼 때만
     묶는다 — 신규문의·미답변·답변한 문의는 그 갈래만 보는 게 목적이라
     묶으면 오히려 무엇을 보고 있는지 흐려진다. */
  const 묶어보기 = (list: Inquiry[]) => {
    const 순서: string[] = [];
    const 갈래: Record<string, Inquiry[]> = {};
    for (const it of list) {
      const key = it.email ? `e:${it.email.trim().toLowerCase()}` : `id:${it.id}`;
      if (!갈래[key]) { 갈래[key] = []; 순서.push(key); }
      갈래[key].push(it);
    }
    // 목록(list)이 이미 최신순이라 각 갈래의 첫 항목이 가장 최근 것이다.
    return 순서.map((key) => ({ head: 갈래[key][0], history: 갈래[key].slice(1) }));
  };
  const 묶음목록 = sideTab === "all" ? 묶어보기(보일것) : 보일것.map((it) => ({ head: it, history: [] as Inquiry[] }));

  /* 고르면 목록 자리에 상세가 선다. 좌우로 나눠 두었을 때는 목록이 460px 에
     갇혀 회사명·담당자·접수일이 두 줄로 접혔고, 상세는 라벨-값 일곱 줄이
     세로로 길었다. 메일함이 그렇듯 한 자리를 번갈아 쓴다. */
  /* 첨부는 비공개 버킷에 있어 주소를 바로 걸 수 없다. 누를 때 짧게 사는
     주소를 받아 연다. */
  const 첨부열기 = async (fid: number) => {
    const res = await fetch(`/api/admin/inquiry-files/${fid}`, { headers: { Authorization: `Bearer ${token()}` } });
    const json = await res.json();
    if (!json.success) { alert(json.error?.message || "파일을 열 수 없습니다."); return; }
    window.open(json.data.url, "_blank", "noopener");
  };

  const 지금첨부: any[] = selected?.files || [];
  const 목록으로 = () => { setSelected(null); setReplyBody(""); setFiles([]); };

  return (
    <AdminLayout activeMenu="ads" 제목숨김>
      <div className="adm-mail">
        <nav className="adm-mail-side" aria-label="문의함">
          {/* 신규문의는 아직 답 안 한 것, 답변한 문의는 답장을 보낸 것.
              유형별로 접고 펼 수 있다 — 기본은 펼침. */}
          <p className="adm-mail-side-h">유형<ChevronDown size={15} /></p>
          {사업문의유형.map((v) => {
            const 열림 = 유형고름 === v;
            const 펼침 = !접힌유형[v];
            return (
              <div key={v}>
                <button type="button"
                  className={`adm-mail-side-i${열림 && sideTab === "all" ? " on" : ""}`}
                  onClick={() => { set유형고름(v); setSideTab("all"); setChecked([]); 목록으로(); }}>
                  {v}
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <i>{갈래수(v)}</i>
                    <ChevronDown size={14}
                      onClick={(e) => { e.stopPropagation(); set접힌유형((s) => ({ ...s, [v]: 펼침 })); }}
                      style={{ transform: 펼침 ? undefined : "rotate(-90deg)", color: "#8a8a90" }} />
                  </span>
                </button>
                {펼침 && ([
                  ["inbox", "신규문의", 갈래수(v, "new")],
                  ["unanswered", "미답변 문의", 미답변수(v)],
                  ["sent", "답변한 문의", 갈래수(v, "done")],
                ] as const).map(([tabKey, 이름, 건수]) => (
                  <button key={tabKey} type="button"
                    className={`adm-mail-side-i sub${열림 && sideTab === tabKey ? " on" : ""}`}
                    onClick={() => { set유형고름(v); setSideTab(tabKey); setChecked([]); 목록으로(); }}>
                    {이름}<i>{건수}</i>
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* 오른쪽 — 목록과 상세가 한 자리를 번갈아 쓴다 */}
        <div className="admin-card adm-mail-body">
          {/* 제목은 판 안 맨 위에 선다 — 판 밖에 두면 옆줄 꼭대기와 어긋난다. */}
          <h1 className="adm-mail-title">사업문의</h1>
          {!selected ? (
            <>
              <form className="nb-top adm-mail-find" onSubmit={(e) => e.preventDefault()}>
                <label className="nb-search">
                  <input value={검색} onChange={(e) => set검색(e.target.value)}
                         placeholder="제목·회사명·담당자·내용 검색" />
                  <button type="submit" aria-label="검색"><Search size={17} /></button>
                </label>
              </form>
              <div className="adm-mail-bar">
                <label className="adm-mail-all">
                  <input type="checkbox"
                    checked={보일것.length > 0 && checked.length === 보일것.length}
                    onChange={(e) => setChecked(e.target.checked ? 보일것.map((i2) => i2.id) : [])} />
                  전체 선택
                </label>
                {checked.length > 0 && (
                  <button type="button" className="adm-mail-del" onClick={handleDelete}>
                    <Trash2 size={14} /> 삭제 ({checked.length})
                  </button>
                )}
                <span className="adm-mail-count">{보일것.length}건</span>
              </div>

              {loading ? (
                <div className="admin-empty" style={{ textAlign: "center" }}>불러오는 중…</div>
              ) : 보일것.length === 0 ? (
                <div className="admin-empty" style={{ textAlign: "center" }}>
                  {찾는말 ? `「${찾는말}」에 대한 문의가 없습니다.` : "문의가 없습니다."}
                </div>
              ) : (
                <div className="adm-mail-list">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th style={{ width: 38 }}></th>
                        <th style={{ width: 170 }}>회사명</th>
                        <th>제목</th>
                        <th style={{ width: 50 }}>첨부</th>
                        <th style={{ width: 150 }}>{sideTab === "sent" ? "답변일" : "접수일"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {묶음목록.flatMap(({ head, history }) => {
                        const 미리보기줄 = (
                          key: string, 글: string, 첨부있음: boolean, 날짜: string, 열기: () => void, 체크아이디?: number
                        ) => (
                          <tr key={key} style={{ background: "#fbfbfc" }}>
                            <td onClick={(e) => e.stopPropagation()}>
                              {체크아이디 != null && (
                                <input type="checkbox" checked={checked.includes(체크아이디)}
                                  onChange={() => toggleCheck(체크아이디)} style={{ cursor: "pointer" }} />
                              )}
                            </td>
                            <td colSpan={2} onClick={열기}
                              style={{ cursor: "pointer", color: "#8a8a90", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 1 }}>
                              ㄴ {글}
                            </td>
                            <td onClick={열기} style={{ cursor: "pointer" }}>
                              {첨부있음 && <Paperclip size={13} className="adm-mail-clip" />}
                            </td>
                            <td className="admin-td-date" onClick={열기} style={{ cursor: "pointer" }}>{fmtDate(날짜)}</td>
                          </tr>
                        );
                        const rows = [
                          <tr key={head.id} className={head.status === "done" ? undefined : "adm-mail-new"}>
                            <td onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={checked.includes(head.id)}
                                onChange={() => toggleCheck(head.id)} style={{ cursor: "pointer" }} />
                            </td>
                            <td onClick={() => openDetail(head)} style={{ cursor: "pointer" }}>
                              {head.company_name || head.contact_name || "-"}
                            </td>
                            <td className="adm-mail-td-subj" onClick={() => openDetail(head)} style={{ cursor: "pointer" }}>
                              {제목(head)}
                            </td>
                            <td onClick={() => openDetail(head)} style={{ cursor: "pointer" }}>
                              {head.files?.length > 0 && <Paperclip size={13} className="adm-mail-clip" />}
                            </td>
                            <td className="admin-td-date" onClick={() => openDetail(head)} style={{ cursor: "pointer" }}>
                              {fmtDate(sideTab === "sent" ? (head.replied_at || head.created_at) : head.created_at)}
                            </td>
                          </tr>,
                        ];
                        // 답변한 문의: 무슨 답을 보냈는지 별도 줄로, 한 줄만 미리 보여준다.
                        // 눌러야 원문에 대한 답변 전체를 보는 화면으로 넘어간다.
                        if (head.status === "done" && head.reply_body) {
                          rows.push(미리보기줄(`${head.id}-r`, 답변첫줄(head.reply_body), (head.reply_files?.length ?? 0) > 0,
                            head.replied_at || head.created_at, () => openDetail(head)));
                        }
                        // 같은 이메일로 온 지난 문의 — 체크박스 다음 칸(회사명 자리)의
                        // 왼쪽 끝에서 ㄴ 로 시작해 한 줄만 보여준다.
                        for (const h of history) {
                          const 답변인가 = h.status === "done" && h.reply_body;
                          rows.push(미리보기줄(String(h.id), 답변인가 ? 답변첫줄(h.reply_body!) : 제목(h),
                            (답변인가 ? h.reply_files?.length : h.files?.length) ? true : false,
                            답변인가 ? (h.replied_at || h.created_at) : h.created_at, () => openDetail(h), h.id));
                        }
                        return rows;
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="adm-mail-read">
              <div className="adm-mail-bar">
                <button type="button" className="adm-mail-back" onClick={목록으로}>‹ 목록</button>
                <span className="adm-mail-count">{badge(selected.status)}</span>
              </div>

              <h2 className="adm-mail-subj">{제목(selected)}</h2>
              <div className="adm-mail-from">
                <b>{selected.contact_name}</b>
                <span>{selected.email || "이메일 없음"}</span>
                <span>{selected.phone ? formatPhone(selected.phone) : "전화번호 없음"}</span>
                <em>{fmtDate(selected.created_at)}</em>
              </div>
              <div className="adm-mail-tags">
                <span>{selected.type || "광고"}</span>
                {selected.product && <span>{PRODUCT_LABELS[selected.product] ?? selected.product}</span>}
                {selected.replied_at && <span>회신 {fmtDate(selected.replied_at)}</span>}
              </div>

              <div className="adm-mail-msg">{selected.message}</div>

              {지금첨부.length > 0 && (
                <div className="adm-mail-files">
                  {지금첨부.map((f: any) => (
                    <button key={f.id} type="button" onClick={() => 첨부열기(f.id)}>
                      <Paperclip size={13} />{f.name}
                      <em>{Math.max(1, Math.round(f.size / 1024))}KB</em>
                    </button>
                  ))}
                </div>
              )}

              {/* 지난 답변에 붙인 파일 — 메일로만 나가고 사라지지 않도록 여기 남겨 둔다. */}
              {selected.reply_files?.length > 0 && (
                <div className="adm-mail-files">
                  <span style={{ fontSize: 12.5, color: "#555" }}>지난 답변 첨부</span>
                  {selected.reply_files.map((f: any) => (
                    <button key={f.id} type="button" onClick={() => 첨부열기(f.id)}>
                      <Paperclip size={13} />{f.name}
                      <em>{Math.max(1, Math.round(f.size / 1024))}KB</em>
                    </button>
                  ))}
                </div>
              )}

              {selected.email ? (
                <div className="adm-mail-reply">
                  <div className="adm-mail-reply-t">답변 메일 작성</div>
                  <textarea className="cv-input" value={replyBody} onChange={(e) => setReplyBody(e.target.value)}
                    spellCheck lang="ko"
                    style={{ minHeight: 320, resize: "vertical", lineHeight: 1.6, fontFamily: "inherit" }} />
                  <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files || []))} style={{ fontSize: 13 }} />
                    {files.length > 0 && (
                      <span style={{ fontSize: 12, color: "#555" }}>
                        첨부 {files.length}개 · {(files.reduce((sum, f) => sum + f.size, 0) / 1024 / 1024).toFixed(2)}MB / 3MB
                      </span>
                    )}
                    <button onClick={sendReply} className="admin-primary-btn" style={{ marginLeft: "auto" }}>
                      답변 메일 보내기
                    </button>
                  </div>
                  <p style={{ fontSize: 12.5, color: "#555", marginTop: 8 }}>
                    support@beautywork.co.kr 에서 나갑니다. 보내면 상태가 회신완료로 바뀌고 시각이 남습니다. (첨부 3MB 이하)
                  </p>
                </div>
              ) : (
                <div className="adm-mail-reply" style={{ fontSize: 14, color: "#555" }}>
                  이메일 주소가 없어 답변 메일을 보낼 수 없습니다. 전화로 연락해 주세요.
                  {selected.status !== "done" && (
                    <button onClick={() => markDone(selected.id)} className="admin-secondary-btn" style={{ marginLeft: 10 }}>
                      완료로 표시
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
