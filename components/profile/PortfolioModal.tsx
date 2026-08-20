"use client";
import { useRef, useState } from "react";
import { Check, ChevronLeft, Upload, X } from "lucide-react";
import { MAX_PHOTOS } from "@/lib/compressImage";
import { linkLabel, looksLikeUrl, normalizeUrl, MAX_LINKS } from "@/lib/linkLabel";

// 한 줄 규격 — 이 모달의 글자는 모두 이 값을 쓴다. 곳마다 12.5/13/14 로
// 달랐더니 같은 칸 안에서도 글씨가 들쭉날쭉했다.
const 글 = { fontSize: 13, lineHeight: 1.6 } as const;
const 흐린글 = { ...글, color: "#888" } as const;

// 주소를 통째로 외워 적는 사람은 없다. 몇 글자만 치면 앞부분을 채워 주고
// 아이디만 이어 적게 한다. 별칭은 한글·영문·줄임말을 모두 받는다.
const 자동채움: { 이름: string; 앞부분: string; 별칭: string[] }[] = [
  { 이름: "인스타그램",   앞부분: "instagram.com/",  별칭: ["insta", "instagram", "ig", "인스타", "인스타그램"] },
  { 이름: "유튜브",       앞부분: "youtube.com/@",   별칭: ["yt", "youtube", "유튜브"] },
  { 이름: "네이버 블로그", 앞부분: "blog.naver.com/", 별칭: ["blog", "naver", "블로그", "네이버"] },
  { 이름: "틱톡",         앞부분: "tiktok.com/@",    별칭: ["tiktok", "틱톡"] },
  { 이름: "스레드",       앞부분: "threads.net/@",   별칭: ["threads", "스레드"] },
];

// 포트폴리오 추가 모달 — 사진과 SNS 를 한 자리에서 넣는다.
//
// 이력서의 다른 구역(경력·학력)이 모두 ＋ → 모달이라, 여기만 화면에 바로 붙어
// 있으면 손이 다르게 간다. 넣는 곳은 모달로 모으고, 이력서 화면에는 넣은 결과만
// 보여준다.
export default function PortfolioModal({
  isOpen, onClose, mode = "all", images, links, isUploading, onFiles, onDeletePhotos, onAddLink, onDeleteLink,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** 사진 줄에서 열면 사진만, SNS 줄에서 열면 SNS 만 보여준다 — 누른 것과 열리는
   *  것이 같아야 무엇을 하려던 것인지 잃지 않는다. */
  mode?: "photo" | "sns" | "all";
  images: { url: string }[];
  links: { id: string; url: string }[];
  isUploading: boolean;
  onFiles: (files: File[]) => void;
  onDeletePhotos: (urls: string[]) => Promise<void>;
  onAddLink: (url: string) => string | null;   // 문제가 있으면 알릴 말을 돌려준다
  /** 넣을 수만 있고 뺄 수는 없으면, 주소를 잘못 넣은 사람은 손쓸 방법이 없다. */
  onDeleteLink: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const 주소칸 = useRef<HTMLInputElement>(null);
  const [주소, set주소] = useState("");
  const [오류, set오류] = useState("");
  const [끌림, set끌림] = useState(false);
  // 사진 고르기는 편집 자리(여기)에만 둔다. 이력서 화면에는 결과만 보이고,
  // 고치는 일은 한 곳에서 한다 — 두 곳에 흩어져 있으면 어디서 지웠는지 헷갈린다.
  const [고름, set고름] = useState(false);
  const [고른것, set고른것] = useState<Set<string>>(new Set());
  const 고르기 = (url: string) =>
    set고른것((prev) => { const n = new Set(prev); n.has(url) ? n.delete(url) : n.add(url); return n; });
  const 고르기끝 = () => { set고름(false); set고른것(new Set()); };
  const 고른것지우기 = async () => {
    if (!고른것.size) return;
    if (!confirm(`고른 사진 ${고른것.size}장을 지울까요?`)) return;
    await onDeletePhotos(Array.from(고른것));
    고르기끝();
  };

  if (!isOpen) return null;

  const 담기 = () => {
    const t = 주소.trim();
    if (!t) return;
    const 문제 = onAddLink(t);
    if (문제) { set오류(문제); return; }
    set주소(""); set오류("");
  };

  const 사진남은자리 = MAX_PHOTOS - images.length;

  // 점이 찍혔으면 주소를 적고 있는 중이니 비켜 준다. 그전까지는 친 글자에
  // 걸리는 것만 남긴다 — 아무것도 안 쳤으면 넷까지 보여 준다.
  const 친것 = 주소.trim().toLowerCase();
  const 골라줄것 = 친것.includes(".")
    ? []
    : 자동채움.filter((k) => !친것 || k.별칭.some((a) => a.startsWith(친것)) || k.이름.startsWith(친것)).slice(0, 4);

  return (
    <div onClick={onClose} className="cv-overlay">
      <div onClick={(e) => e.stopPropagation()} className="cv-modal">
        <div className="cv-header">
          <button className="cv-back" onClick={onClose} aria-label="닫기"><ChevronLeft size={22} /></button>
          <h2 className="cv-title">{mode === "sns" ? "SNS" : mode === "photo" ? "사진" : "포트폴리오"}</h2>
          <div style={{ width: 36 }} />
        </div>
        <div className="cv-body">
          {/* .cv-desc 의 24px 은 칸이 하나뿐인 모달을 위한 값이다. 여기는 바로
              아래에 같은 성격의 안내가 또 오므로 두 줄을 한 덩어리로 붙인다. */}
          <p className="cv-desc" style={{ ...흐린글, marginBottom: 10 }}>작업물을 올리면 합격률이 올라갑니다.</p>

          {mode !== "sns" && (<>
          {mode === "all" && <label className="cv-field-label">사진</label>}
          {images.length > 0 && (
            <>
              <div className="pf-subhead">
                {고름 ? (
                  <>
                    <span className="pf-subtitle" style={{ fontSize: 12.5, color: "#888" }}>
                      지울 사진을 고르세요{고른것.size ? ` (${고른것.size}장)` : ""}
                    </span>
                    <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                      <button type="button" className="profile-select-btn" onClick={고르기끝}>취소</button>
                      {/* 삭제는 고른 것이 있을 때만 나온다 */}
                      {고른것.size > 0 && (
                        <button type="button" className="profile-select-btn danger" onClick={고른것지우기}>
                          삭제 {고른것.size}
                        </button>
                      )}
                    </span>
                  </>
                ) : (
                  <button type="button" className="profile-select-btn" style={{ marginLeft: "auto" }}
                    onClick={() => set고름(true)}>선택</button>
                )}
              </div>
              <div className="portfolio-grid" style={{ marginBottom: 10 }}>
                {images.map((img) => {
                  const 골랐나 = 고른것.has(img.url);
                  return (
                    <div key={img.url} className="portfolio-cell">
                      <img src={img.url} alt="" loading="lazy"
                        onClick={() => 고름 && 고르기(img.url)}
                        style={{ cursor: 고름 ? "pointer" : "default", opacity: 고름 && !골랐나 ? 0.55 : 1 }} />
                      {고름 && (
                        <button type="button" className={`pf-check${골랐나 ? " on" : ""}`}
                          aria-label={골랐나 ? "선택 해제" : "선택"} aria-pressed={골랐나}
                          onClick={(e) => { e.stopPropagation(); 고르기(img.url); }}>
                          {골랐나 && <Check size={14} strokeWidth={3} />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
          {사진남은자리 > 0 ? (
            <>
              {/* 폰에는 끌어다 놓을 것이 없다. 점선 상자는 마우스가 있는 화면에서만
                  뜻이 있고, 폰에서는 버튼 하나가 낫다. */}
              <div
                className="pf-drop-pc"
                onClick={() => !isUploading && fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); set끌림(true); }}
                onDragLeave={(e) => { e.preventDefault(); set끌림(false); }}
                onDrop={(e) => { e.preventDefault(); set끌림(false); const f = Array.from(e.dataTransfer.files || []); if (f.length) onFiles(f); }}
                style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: `2px dashed ${끌림 ? "#5f0080" : "#d0c0e0"}`, background: 끌림 ? "#f3e5f5" : "#fafafa", color: "#5f0080", fontSize: 13, cursor: isUploading ? "not-allowed" : "pointer", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}
              >
                <Upload size={24} />
                <span>{isUploading ? "올리는 중..." : 끌림 ? "여기에 놓으세요" : "사진을 끌어다 놓거나 눌러서 고르세요"}</span>
                <span style={{ fontSize: 11, color: "#888" }}>최대 {MAX_PHOTOS}장 · 올릴 때 자동으로 줄여요</span>
              </div>
              <button
                type="button"
                className="pf-pick-mobile"
                disabled={isUploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload size={17} />
                {isUploading ? "올리는 중..." : "사진 고르기"}
              </button>
              <p className="pf-pick-note">최대 {MAX_PHOTOS}장 · 올릴 때 자동으로 줄여요</p>
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: "#888", margin: "2px 0 0" }}>사진은 {MAX_PHOTOS}장까지 넣을 수 있어요.</p>
          )}
          <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={(e) => { const f = Array.from(e.target.files || []); if (f.length) onFiles(f); if (fileRef.current) fileRef.current.value = ""; }} />

          </>)}

          {mode !== "photo" && (<>
          {mode === "all" && <label className="cv-field-label" style={{ marginTop: 22 }}>SNS</label>}
          <p style={{ ...흐린글, margin: "0 0 10px" }}>
            인스타그램, 유튜브, 블로그 등 작업물을 올리는 곳을 적어주세요.
          </p>
          {links.map((l) => (
            <div key={l.id} className="resume-link-item">
              <span className="resume-link-category" style={흐린글}>{linkLabel(l.url)}</span>
              <a href={normalizeUrl(l.url)} target="_blank" rel="noopener noreferrer" className="resume-link-url" style={글}>{l.url}</a>
              {/* 사진과 달리 몇 개 안 되고 한 줄짜리라, 고르는 단계 없이 그 자리에서 뺀다.
                  아이콘은 사진 쪽과 같이 X 로 맞춘다. */}
              <button
                type="button"
                onClick={() => onDeleteLink(l.id)}
                aria-label={`${linkLabel(l.url)} 주소 삭제`}
                style={{ marginLeft: "auto", flexShrink: 0, width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center", border: "none", background: "transparent", color: "#bbb", cursor: "pointer", borderRadius: 6, alignSelf: "center" }}
              >
                <X size={15} />
              </button>
            </div>
          ))}
          {links.length < MAX_LINKS && (<>
            <div style={{ display: "flex", gap: 6, marginTop: links.length ? 10 : 0 }}>
              <input
                ref={주소칸}
                className="cv-input"
                style={{ flex: 1, minWidth: 0, marginTop: 0, fontSize: 13 }}
                placeholder="주소를 붙여넣거나 아래에서 고르세요"
                value={주소}
                onChange={(e) => { set주소(e.target.value); if (오류) set오류(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); 담기(); } }}
                inputMode="url"
              />
              <button type="button" className="profile-select-btn accent" style={{ flexShrink: 0 }} onClick={담기}>추가</button>
            </div>
            {/* 아직 주소 꼴이 아닐 때만 낸다 — 다 적고 나면 방해만 된다. */}
            {골라줄것.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {골라줄것.map((k) => (
                  <button key={k.이름} type="button"
                    onClick={() => { set주소(k.앞부분); set오류(""); 주소칸.current?.focus(); }}
                    style={{ ...글, padding: "5px 10px", borderRadius: 999, border: "1px solid #e6d8f0", background: "#faf5fc", color: "#5f0080", cursor: "pointer" }}>
                    {k.이름}
                  </button>
                ))}
              </div>
            )}
          </>)}
          {오류 && <p style={{ ...글, color: "#c0392b", margin: "6px 0 0" }}>{오류}</p>}
          </>)}

          <button className="cv-btn-primary" style={{ marginTop: 24 }} onClick={onClose}>완료</button>
        </div>
      </div>
    </div>
  );
}
