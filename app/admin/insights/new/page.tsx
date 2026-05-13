"use client";
import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { useRouter } from "next/navigation";
import { ChevronLeft, Eye, Save, Send } from "lucide-react";

const CATEGORIES = ["트렌드", "커리어", "연봉정보", "브랜드스토리", "취업팁"];

export default function AdminInsightsNewPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", category: "", tags: "", readTime: "", content: "", status: "임시저장" });
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (status: "임시저장" | "게시중") => {
    if (!form.title.trim()) { alert("제목을 입력해주세요."); return; }
    if (!form.category) { alert("카테고리를 선택해주세요."); return; }
    if (!form.content.trim()) { alert("본문을 입력해주세요."); return; }
    setSaved(true);
    setForm({ ...form, status });
    setTimeout(() => router.push("/admin/insights"), 800);
  };

  return (
    <AdminLayout activeMenu="insights">
      <div className="admin-editor-toolbar">
        <button className="admin-back-btn" onClick={() => router.push("/admin/insights")}>
          <ChevronLeft size={18} /> 목록으로
        </button>
        <div style={{display:"flex", gap:"8px"}}>
          <button className="admin-secondary-btn" onClick={() => setPreview(!preview)}>
            <Eye size={16} /> {preview ? "편집" : "미리보기"}
          </button>
          <button className="admin-secondary-btn" onClick={() => handleSave("임시저장")}>
            <Save size={16} /> 임시저장
          </button>
          <button className="admin-primary-btn" onClick={() => handleSave("게시중")}>
            <Send size={16} /> {saved ? "✅ 게시완료" : "게시하기"}
          </button>
        </div>
      </div>

      {preview ? (
        <div className="admin-card admin-preview">
          <div className="admin-preview-header">
            <span className="insight-category">{form.category || "카테고리"}</span>
            <h1 className="admin-preview-title">{form.title || "제목 없음"}</h1>
            <div className="admin-preview-meta">
              <span>📅 {new Date().toLocaleDateString("ko-KR")}</span>
              {form.readTime && <span>⏱ {form.readTime}분 읽기</span>}
              {form.tags && form.tags.split(",").map(t => (
                <span key={t} className="admin-resume-tag">{t.trim()}</span>
              ))}
            </div>
          </div>
          <div className="admin-preview-body">
            {form.content ? form.content.split("\n").map((line, i) => (
              <p key={i} style={{margin:"0 0 12px", lineHeight:"1.8", fontSize:"15px"}}>{line || "\u00A0"}</p>
            )) : <p style={{color:"#aaa"}}>본문을 입력하면 여기에 미리보기가 표시됩니다.</p>}
          </div>
        </div>
      ) : (
        <div className="admin-editor-grid">
          <div className="admin-card">
            <div className="admin-form-body">
              <div className="admin-form-row">
                <label className="admin-form-label">제목 *</label>
                <input className="admin-form-input admin-title-input" placeholder="인사이트 제목을 입력하세요"
                  value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} />
              </div>
              <div className="admin-form-row">
                <label className="admin-form-label">본문 *</label>
                <div className="admin-editor-wrap">
                  <div className="admin-editor-toolbar-mini">
                    {["굵게", "기울임", "제목", "인용", "링크", "구분선"].map((tool) => (
                      <button key={tool} type="button" className="admin-editor-tool"
                        onClick={() => {
                          const map: Record<string, string> = {
                            "굵게": "**굵게**", "기울임": "_기울임_",
                            "제목": "\n## 제목\n", "인용": "\n> 인용문\n",
                            "링크": "[링크텍스트](URL)", "구분선": "\n---\n"
                          };
                          setForm({...form, content: form.content + map[tool]});
                        }}>{tool}</button>
                    ))}
                  </div>
                  <textarea className="admin-editor-textarea"
                    placeholder={"본문을 입력하세요.\n\n마크다운 형식을 지원합니다.\n## 제목\n**굵게**\n_기울임_\n> 인용문"}
                    value={form.content} onChange={(e) => setForm({...form, content: e.target.value})} />
                  <div className="admin-editor-count">{form.content.length}자</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{display:"flex", flexDirection:"column", gap:"16px"}}>
            <div className="admin-card">
              <div className="admin-card-head"><h2 className="admin-card-title">발행 설정</h2></div>
              <div className="admin-form-body">
                <div className="admin-form-row">
                  <label className="admin-form-label">상태</label>
                  <div style={{display:"flex", gap:"8px"}}>
                    {["임시저장", "게시중"].map((s) => (
                      <button key={s} type="button"
                        className={`admin-filter-tab ${form.status === s ? "active" : ""}`}
                        onClick={() => setForm({...form, status: s})}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="admin-card">
              <div className="admin-card-head"><h2 className="admin-card-title">카테고리 *</h2></div>
              <div className="admin-form-body">
                {CATEGORIES.map((cat) => (
                  <label key={cat} className="admin-radio-row">
                    <input type="radio" name="category" value={cat}
                      checked={form.category === cat}
                      onChange={() => setForm({...form, category: cat})} />
                    <span>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <div className="admin-card-head"><h2 className="admin-card-title">추가 정보</h2></div>
              <div className="admin-form-body">
                <div className="admin-form-row">
                  <label className="admin-form-label">읽기 시간 (분)</label>
                  <input className="admin-form-input" type="number" placeholder="예) 5"
                    value={form.readTime} onChange={(e) => setForm({...form, readTime: e.target.value})} />
                </div>
                <div className="admin-form-row">
                  <label className="admin-form-label">태그</label>
                  <input className="admin-form-input" placeholder="쉼표로 구분 (예: K-뷰티, 트렌드)"
                    value={form.tags} onChange={(e) => setForm({...form, tags: e.target.value})} />
                  <span style={{fontSize:"11px", color:"#aaa", marginTop:"4px"}}>쉼표(,)로 여러 태그 입력</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
