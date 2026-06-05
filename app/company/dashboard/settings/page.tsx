"use client";
import { useState, useEffect } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Save } from "lucide-react";
import { companyMeApi } from "@/lib/api/company";
import type { CompanyInfo } from "@/lib/types/company";

export default function CompanySettingsPage() {
  const [activeTab, setActiveTab] = useState<"brand" | "account">("brand");
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    brand_name: "",
    description: "",
    website_url: "",
    address: "",
    phone: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await companyMeApi.get();
        setInfo(res.data);
        setLogoUrl((res.data as any).logo_url || null);
        setForm({
          company_name: res.data.company_name || "",
          brand_name: res.data.brand_name || "",
          description: res.data.description || "",
          website_url: res.data.website_url || "",
          address: (res.data as any).address || "",
          phone: (res.data as any).phone || "",
        });
      } catch (e) {
        console.error("[load company]", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/company/me/logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setLogoUrl(data.data.logo_url);
      } else {
        alert(data.error?.message || "로고 업로드에 실패했습니다.");
      }
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  };

  const handleLogoDelete = async () => {
    if (!confirm("로고를 삭제하시겠습니까?")) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch("/api/company/me/logo", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setLogoUrl(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      alert("기업명은 필수입니다.");
      return;
    }
    setSaving(true);
    try {
      const res = await companyMeApi.update(form);
      setInfo(res.data);
      setSavedMessage("저장되었습니다 ✓");
      setTimeout(() => setSavedMessage(""), 2500);
    } catch (e: any) {
      alert(e.message || "저장 중 오류가 발생했습니다.");
      console.error("[save]", e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <CompanyLayout activePage="settings">
        <div className="company-card" style={{ padding: "60px 20px", textAlign: "center", color: "#888" }}>
          불러오는 중...
        </div>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout activePage="settings">
      <div className="admin-tab-row1" style={{ marginBottom: "0" }}>
        <button className={`admin-tab1 ${activeTab === "brand" ? "active" : ""}`}
          onClick={() => setActiveTab("brand")}>브랜드 정보</button>
        <button className={`admin-tab1 ${activeTab === "account" ? "active" : ""}`}
          onClick={() => setActiveTab("account")}>계정 정보</button>
      </div>

      {activeTab === "brand" && (
        <div className="admin-form-grid">
          <div className="company-card">
            <div className="company-card-head">
              <h2 className="company-card-title">브랜드 정보</h2>
              <span className={`jobs-type-badge ${info?.company_type === "STORE" ? "store" : "corp"}`}>
                {info?.company_type === "STORE" ? "🏪 매장·살롱" : "🏢 기업·브랜드"}
              </span>
            </div>
            <div className="admin-form-body">
              <div className="admin-form-row">
                <label className="admin-form-label">회사 로고</label>
                <p style={{fontSize:"13px", color:"#888", margin:"0 0 12px"}}>
                  공고 상단에 표시되는 대표 이미지예요. 한 번 등록하면 모든 공고에 자동 적용돼요. (JPG·PNG·WebP, 2MB 이하)
                </p>
                <div style={{display:"flex", alignItems:"center", gap:"16px"}}>
                  <div style={{width:"96px", height:"96px", borderRadius:"12px", border:"1px solid #eee",
                    background:"#f7f4fb", display:"flex", alignItems:"center", justifyContent:"center",
                    overflow:"hidden", flexShrink:0}}>
                    {logoUrl ? (
                      <img src={logoUrl} alt="회사 로고"
                        style={{width:"100%", height:"100%", objectFit:"cover"}} />
                    ) : (
                      <span style={{fontSize:"28px", fontWeight:700, color:"#c4b5d4"}}>
                        {form.company_name?.[0] || "?"}
                      </span>
                    )}
                  </div>
                  <div style={{display:"flex", flexDirection:"column", gap:"8px"}}>
                    <label style={{display:"inline-flex", alignItems:"center", gap:"6px",
                      padding:"8px 14px", border:"1.5px solid #c4b5d4", borderRadius:"8px",
                      cursor: logoUploading ? "wait" : "pointer", color:"#5f0080", fontSize:"13px",
                      fontWeight:500, background:"#fff", width:"fit-content"}}>
                      {logoUploading ? "업로드 중..." : logoUrl ? "로고 변경" : "로고 등록"}
                      <input type="file" accept="image/jpeg,image/png,image/webp"
                        disabled={logoUploading} onChange={handleLogoUpload} style={{display:"none"}} />
                    </label>
                    {logoUrl && (
                      <button type="button" onClick={handleLogoDelete}
                        style={{padding:"8px 14px", border:"1px solid #eee", borderRadius:"8px",
                          cursor:"pointer", color:"#888", fontSize:"13px", background:"#fff",
                          width:"fit-content"}}>
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="admin-form-row">
                <label className="admin-form-label">기업명 *</label>
                <input className="admin-form-input" placeholder="기업명"
                  value={form.company_name}
                  onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">브랜드명</label>
                <input className="admin-form-input" placeholder="예) 헤라, 닥터지"
                  value={form.brand_name}
                  onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">웹사이트</label>
                <input className="admin-form-input" placeholder="https://"
                  value={form.website_url}
                  onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">주소</label>
                <input className="admin-form-input" placeholder="예) 서울 강남구 테헤란로 123"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">기업 소개</label>
                <textarea className="admin-form-textarea" rows={5}
                  placeholder="회사 소개를 입력해주세요."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "account" && (
        <div className="admin-form-grid">
          <div className="company-card">
            <div className="company-card-head">
              <h2 className="company-card-title">계정 정보</h2>
            </div>
            <div className="admin-form-body">
              <div className="admin-form-row">
                <label className="admin-form-label">이메일</label>
                <input className="admin-form-input" value={info?.email || ""} disabled
                  style={{ background: "#f5f5f5", color: "#888" }} />
                <p style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>이메일은 변경할 수 없어요</p>
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">사업자등록번호</label>
                <input className="admin-form-input" value={info?.business_number || ""} disabled
                  style={{ background: "#f5f5f5", color: "#888" }} />
                <p style={{ fontSize: "11px", color: "#aaa", marginTop: "4px" }}>사업자등록번호는 변경할 수 없어요</p>
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">대표자명</label>
                <input className="admin-form-input"
                  value={info?.representative_name || ""} disabled
                  style={{ background: "#f5f5f5", color: "#888" }} />
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">담당자 연락처</label>
                <input className="admin-form-input" placeholder="010-0000-0000"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>

              <div className="admin-form-row" style={{ borderTop: "1px solid #f0f0f0", paddingTop: "16px", marginTop: "8px" }}>
                <label className="admin-form-label">비밀번호 변경</label>
                <p style={{ fontSize: "12px", color: "#888", padding: "8px 0" }}>
                  비밀번호 변경 기능은 곧 제공됩니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "20px", alignItems: "center" }}>
        {savedMessage && (
          <span style={{ color: "#10b981", fontSize: "14px", fontWeight: 600 }}>
            {savedMessage}
          </span>
        )}
        <button
          className="company-primary-btn"
          onClick={handleSave}
          disabled={saving}
          style={{ opacity: saving ? 0.7 : 1 }}
        >
          <Save size={14} /> {saving ? "저장 중..." : "저장"}
        </button>
      </div>
    </CompanyLayout>
  );
}