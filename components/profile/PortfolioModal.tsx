"use client";
import { useRef, useState } from "react";
import { ChevronLeft, Upload } from "lucide-react";
import { MAX_PHOTOS } from "@/lib/compressImage";
import { linkLabel, looksLikeUrl, normalizeUrl, MAX_LINKS } from "@/lib/linkLabel";

// 포트폴리오 추가 모달 — 사진과 SNS 를 한 자리에서 넣는다.
//
// 이력서의 다른 구역(경력·학력)이 모두 ＋ → 모달이라, 여기만 화면에 바로 붙어
// 있으면 손이 다르게 간다. 넣는 곳은 모달로 모으고, 이력서 화면에는 넣은 결과만
// 보여준다.
export default function PortfolioModal({
  isOpen, onClose, mode = "all", images, links, isUploading, onFiles, onAddLink,
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
  onAddLink: (url: string) => string | null;   // 문제가 있으면 알릴 말을 돌려준다
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [주소, set주소] = useState("");
  const [오류, set오류] = useState("");
  const [끌림, set끌림] = useState(false);

  if (!isOpen) return null;

  const 담기 = () => {
    const t = 주소.trim();
    if (!t) return;
    const 문제 = onAddLink(t);
    if (문제) { set오류(문제); return; }
    set주소(""); set오류("");
  };

  const 사진남은자리 = MAX_PHOTOS - images.length;

  return (
    <div onClick={onClose} className="cv-overlay">
      <div onClick={(e) => e.stopPropagation()} className="cv-modal">
        <div className="cv-header">
          <button className="cv-back" onClick={onClose} aria-label="닫기"><ChevronLeft size={22} /></button>
          <h2 className="cv-title">{mode === "sns" ? "SNS" : mode === "photo" ? "사진" : "포트폴리오"}</h2>
          <div style={{ width: 36 }} />
        </div>
        <div className="cv-body">
          <p className="cv-desc">작업물을 올리면 합격률이 올라갑니다.</p>

          {mode !== "sns" && (<>
          {mode === "all" && <label className="cv-field-label">사진</label>}
          {images.length > 0 && (
            <div className="portfolio-grid" style={{ marginBottom: 10 }}>
              {images.map((img) => (
                <div key={img.url} className="portfolio-cell">
                  <img src={img.url} alt="" loading="lazy" />
                </div>
              ))}
            </div>
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
          <p style={{ fontSize: 12.5, color: "#888", margin: "0 0 8px" }}>
            인스타그램, 유튜브, 블로그 등 작업물을 올리는 곳을 적어주세요.
          </p>
          {links.map((l) => (
            <div key={l.id} className="resume-link-item">
              <span className="resume-link-category">{linkLabel(l.url)}</span>
              <a href={normalizeUrl(l.url)} target="_blank" rel="noopener noreferrer" className="resume-link-url">{l.url}</a>
            </div>
          ))}
          {links.length < MAX_LINKS && (
            <div style={{ display: "flex", gap: 6, marginTop: links.length ? 8 : 0 }}>
              <input
                className="cv-input"
                style={{ flex: 1, minWidth: 0, marginTop: 0 }}
                placeholder="http://"
                value={주소}
                onChange={(e) => { set주소(e.target.value); if (오류) set오류(""); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); 담기(); } }}
                inputMode="url"
              />
              <button type="button" className="profile-select-btn accent" style={{ flexShrink: 0 }} onClick={담기}>추가</button>
            </div>
          )}
          {오류 && <p style={{ fontSize: 12.5, color: "#c0392b", marginTop: 6 }}>{오류}</p>}
          </>)}

          <button className="cv-btn-primary" style={{ marginTop: 24 }} onClick={onClose}>완료</button>
        </div>
      </div>
    </div>
  );
}
