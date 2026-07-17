"use client";
import { useState, useEffect } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Save } from "lucide-react";
import { companyMeApi } from "@/lib/api/company";
import type { CompanyInfo } from "@/lib/types/company";

declare global {
  interface Window { daum?: any; }
}

export default function CompanySettingsPage() {
  const [activeTab, setActiveTab] = useState<"brand" | "account">("brand");
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverUploading, setCoverUploading] = useState(false);

  const [form, setForm] = useState({
    company_name: "",
    brand_name: "",
    description: "",
    website_url: "",
    address: "",
    address_detail: "",
    phone: "",
    representative_name: "",
    company_size: "",
    founded_year: "",
    region_sido: "",
    region_sigungu: "",
  });
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [showPw, setShowPw] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await companyMeApi.get();
        setInfo(res.data);
        setLogoUrl((res.data as any).logo_url || null);
        const cov = (res.data as any).cover_images;
        setCoverUrl(Array.isArray(cov) && cov[0]?.url ? cov[0].url : null);
        setForm({
          company_name: res.data.company_name || "",
          brand_name: res.data.brand_name || "",
          description: res.data.description || "",
          website_url: res.data.website_url || "",
          address: (res.data as any).address || "",
          address_detail: (res.data as any).address_detail || "",
          phone: (res.data as any).phone || "",
          representative_name: (res.data as any).representative_name || "",
          company_size: (res.data as any).company_size || "",
          founded_year: (res.data as any).founded_year || "",
          region_sido: (res.data as any).region_sido || "",
          region_sigungu: (res.data as any).region_sigungu || "",
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

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    setCoverUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/company/me/cover", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        const cov = data.data.cover_images;
        setCoverUrl(Array.isArray(cov) && cov[0]?.url ? cov[0].url : null);
      } else {
        alert(data.error?.message || "이미지 업로드에 실패했습니다.");
      }
    } finally {
      setCoverUploading(false);
      e.target.value = "";
    }
  };

  const handleCoverDelete = async () => {
    if (!confirm("공고 노출 이미지를 삭제하시겠습니까?")) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch("/api/company/me/cover", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setCoverUrl(null);
    } catch (e) {
      console.error(e);
    }
  };
  // 카카오 우편번호 검색
  const handleAddressSearch = () => {
    const open = () => {
      new window.daum.Postcode({
        oncomplete: (data: any) => {
          const base = data.roadAddress || data.jibunAddress || "";
          setForm((prev) => ({
            ...prev,
            region_sido: data.sido || "",
            region_sigungu: data.sigungu || "",
            address: data.buildingName ? `${base} (${data.buildingName})` : base,
          }));
        },
      }).open();
    };
    if (window.daum?.Postcode) {
      open();
    } else {
      const script = document.createElement("script");
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.onload = open;
      document.body.appendChild(script);
    }
  };
  const handleChangePassword = async () => {
    if (!pwForm.current_password || !pwForm.new_password) {
      alert("현재 비밀번호와 새 비밀번호를 입력해주세요.");
      return;
    }
    if (pwForm.new_password.length < 8) {
      alert("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      alert("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setPwSaving(true);
    try {
      await companyMeApi.changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      });
      alert("비밀번호가 변경되었습니다.");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (e: any) {
      alert(e?.message || "비밀번호 변경에 실패했어요. 현재 비밀번호를 확인해주세요.");
      console.error("[changePassword]", e);
    } finally {
      setPwSaving(false);
    }
  };

  const handleClearAddress = () => {
    if (!confirm("주소를 초기화할까요?")) return;
    setForm((prev) => ({ ...prev, address: "", address_detail: "", region_sido: "", region_sigungu: "" }));
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
          onClick={() => setActiveTab("brand")}>프로필</button>
        <button className={`admin-tab1 ${activeTab === "account" ? "active" : ""}`}
          onClick={() => setActiveTab("account")}>계정</button>
      </div>

      {activeTab === "brand" && (
        <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr", maxWidth: "800px" }}>
          <div className="company-card">
            <div className="company-card-head">
              <h2 className="company-card-title">회사 프로필</h2>
              <span className={`jobs-type-badge ${info?.company_type === "STORE" ? "store" : "corp"}`}>
                {info?.company_type === "STORE" ? "🏪 매장·살롱" : "🏢 기업·브랜드"}
              </span>
            </div>
            <div className="admin-form-body">
              <div className="admin-form-row-2col">
              <div className="admin-form-row">
                <label className="admin-form-label">회사 로고</label>
                <p style={{fontSize:"13px", color:"#888", margin:"0 0 12px"}}>
                  공고 상단에 표시되는 대표 이미지예요. 한 번 등록하면 모든 공고에 자동 적용돼요. (JPG·PNG·WebP, 2MB 이하)
                </p>
                <div style={{display:"flex", alignItems:"center", gap:"16px"}}>
                  <div style={{width:"110px", height:"110px", borderRadius:"12px", border:"1px solid #eee",
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
                <label className="admin-form-label">공고 노출 이미지</label>
                <p style={{fontSize:"13px", color:"#888", margin:"0 0 12px"}}>
                  공고 카드와 상단에 크게 표시되는 대표 비주얼이에요. 매장 사진이나 분위기 이미지를 넣어보세요. 모든 공고에 자동 적용돼요. (가로형 권장, JPG·PNG·WebP, 2MB 이하)
                </p>
                <div style={{display:"flex", alignItems:"center", gap:"16px"}}>
                  <div style={{width:"220px", height:"110px", borderRadius:"12px", border:"1px solid #eee",
                    background:"#f7f4fb", display:"flex", alignItems:"center", justifyContent:"center",
                    overflow:"hidden", flexShrink:0}}>
                    {coverUrl ? (
                      <img src={coverUrl} alt="공고 노출 이미지"
                        style={{width:"100%", height:"100%", objectFit:"cover"}} />
                    ) : (
                      <span style={{fontSize:"13px", color:"#c4b5d4"}}>이미지 없음</span>
                    )}
                  </div>
                  <div style={{display:"flex", flexDirection:"column", gap:"8px"}}>
                    <label style={{display:"inline-flex", alignItems:"center", gap:"6px",
                      padding:"8px 14px", border:"1.5px solid #c4b5d4", borderRadius:"8px",
                      cursor: coverUploading ? "wait" : "pointer", color:"#5f0080", fontSize:"13px",
                      fontWeight:500, background:"#fff", width:"fit-content"}}>
                      {coverUploading ? "업로드 중..." : coverUrl ? "이미지 변경" : "이미지 등록"}
                      <input type="file" accept="image/jpeg,image/png,image/webp"
                        disabled={coverUploading} onChange={handleCoverUpload} style={{display:"none"}} />
                    </label>
                    {coverUrl && (
                      <button type="button" onClick={handleCoverDelete}
                        style={{padding:"8px 14px", border:"1px solid #eee", borderRadius:"8px",
                          cursor:"pointer", color:"#888", fontSize:"13px", background:"#fff",
                          width:"fit-content"}}>
                        삭제
                      </button>
                    )}
                  </div>
                </div>
              </div>
              </div>

              <div className="admin-form-row-2col">
                <div className="admin-form-row">
                  <label className="admin-form-label">기업명<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
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
              </div>

              <div className="admin-form-row-2col" style={{ alignItems: "start" }}>
                <div className="admin-form-row">
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <label className="admin-form-label" style={{ margin: 0 }}>주소</label>
                    {form.address && (
                      <button type="button" onClick={handleClearAddress}
                        style={{ fontSize: "12px", color: "#999", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: "2px 4px" }}>
                        초기화
                      </button>
                    )}
                  </div>
                  <input className="admin-form-input" readOnly value={form.address}
                    onClick={handleAddressSearch}
                    placeholder="주소 검색을 눌러주세요"
                    style={{ background: "#fafafa", cursor: "pointer" }} />
                  {form.address && (
                    <input className="admin-form-input" style={{ marginTop: "8px" }}
                      placeholder="상세주소 (동·호수 등)"
                      value={form.address_detail}
                      onChange={(e) => setForm({ ...form, address_detail: e.target.value })} />
                  )}
                  <p style={{fontSize:"12px", color:"#888", margin:"6px 0 0"}}>
                    주소 검색 시 도로명 주소가 자동 입력돼요. 층·호수는 직접 추가하세요.
                  </p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="admin-form-row">
                    <label className="admin-form-label">웹사이트</label>
                    <input className="admin-form-input" placeholder="https://"
                      value={form.website_url}
                      onChange={(e) => setForm({ ...form, website_url: e.target.value })} />
                  </div>
                  <div className="admin-form-row-2col">
                    <div className="admin-form-row">
                      <label className="admin-form-label">사원수</label>
                      <select className="admin-form-select"
                        style={{ height: 42, boxSizing: "border-box" }}
                        value={form.company_size}
                        onChange={(e) => setForm({ ...form, company_size: e.target.value })}>
                        <option value="">선택</option>
                        <option value="1~10명">1~10명</option>
                        <option value="10~50명">10~50명</option>
                        <option value="50~100명">50~100명</option>
                        <option value="100~300명">100~300명</option>
                        <option value="300~1000명">300~1000명</option>
                        <option value="1000명 이상">1000명 이상</option>
                      </select>
                    </div>
                    <div className="admin-form-row">
                      <label className="admin-form-label">설립연도</label>
                      <input type="number" className="admin-form-input" placeholder="예) 2020"
                        style={{ height: 42, boxSizing: "border-box" }}
                        min="1900" max={new Date().getFullYear()}
                        value={form.founded_year}
                        onChange={(e) => setForm({ ...form, founded_year: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
              <div className="admin-form-row">
                <label className="admin-form-label">기업 소개</label>
                <textarea className="admin-form-textarea" rows={5}
                  placeholder="회사를 소개하는 글을 입력해주세요. 여기에 작성한 내용은 채용공고 상세 페이지의 '회사 소개' 영역에 표시돼요."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "account" && (
        <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr", maxWidth: "800px" }}>
          <div className="company-card">
            <div className="company-card-head">
              <h2 className="company-card-title">계정 정보</h2>
            </div>
            <div className="admin-form-body">
              <div className="admin-form-row-2col">
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
              </div>

              <div className="admin-form-row-2col">
                <div className="admin-form-row">
                  <label className="admin-form-label">대표자명</label>
                  <input className="admin-form-input" placeholder="대표자명을 입력해주세요"
                    value={form.representative_name}
                    onChange={(e) => setForm({ ...form, representative_name: e.target.value })} />
                </div>
                <div className="admin-form-row">
                  <label className="admin-form-label">담당자 연락처</label>
                  <input className="admin-form-input" placeholder="010-0000-0000"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>

              <div className="admin-form-row" style={{ borderTop: "1px solid #f0f0f0", paddingTop: "16px", marginTop: "8px" }}>
                <label className="admin-form-label">비밀번호 변경</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "8px" }}>
                  <input className="admin-form-input" type={showPw ? "text" : "password"} placeholder="현재 비밀번호"
                    value={pwForm.current_password}
                    onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} />
                  <input className="admin-form-input" type={showPw ? "text" : "password"} placeholder="새 비밀번호 (8자 이상)"
                    value={pwForm.new_password}
                    onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} />
                  <input className="admin-form-input" type={showPw ? "text" : "password"} placeholder="새 비밀번호 확인"
                    value={pwForm.confirm_password}
                    onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })} />
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "13px", color: "#666", cursor: "pointer", alignSelf: "flex-start" }}>
                  <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
                  비밀번호 표시
                </label>
                <button
                  type="button"
                  onClick={handleChangePassword}
                  disabled={pwSaving}
                  style={{ marginTop: "12px", padding: "10px 16px", borderRadius: "8px", border: "none", background: "#5f0080", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", alignSelf: "flex-start" }}>
                  {pwSaving ? "변경 중..." : "비밀번호 변경"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: "12px", margin: "24px 0 40px", alignItems: "center", maxWidth: "800px" }}>
        {savedMessage && (
          <span style={{ color: "#10b981", fontSize: "14px", fontWeight: 600 }}>
            {savedMessage}
          </span>
        )}
        <button
          className="company-primary-btn"
          onClick={handleSave}
          disabled={saving}
          style={{ opacity: saving ? 0.7 : 1, minWidth: "200px", justifyContent: "center" }}
        >
          <Save size={14} /> {saving ? "저장 중..." : "저장하기"}
        </button>
      </div>
    </CompanyLayout>
  );
}