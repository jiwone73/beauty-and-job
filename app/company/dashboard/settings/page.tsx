"use client";
import { useState, useEffect } from "react";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Save, Camera, ImagePlus, X, ChevronRight } from "lucide-react";
import { companyMeApi } from "@/lib/api/company";
import { industryGroupsFor } from "@/lib/data/industries";
import { downscaleImage } from "@/lib/imageResize";
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
  const [coverImages, setCoverImages] = useState<{ url: string; name?: string }[]>([]);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverStart, setCoverStart] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [form, setForm] = useState({
    company_name: "",
    brand_name: "",
    industry: "",
    description: "",
    website_url: "",
    address: "",
    address_detail: "",
    phone: "",
    company_phone: "",
    representative_name: "",
    manager_name: "",
    company_size: "",
    founded_year: "",
    region_sido: "",
    region_sigungu: "",
  });
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailStep, setEmailStep] = useState<1 | 2>(1);
  const [newEmail, setNewEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawPw, setWithdrawPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [origPhone, setOrigPhone] = useState("");
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await companyMeApi.get();
        setInfo(res.data);
        setLogoUrl((res.data as any).logo_url || null);
        const cov = (res.data as any).cover_images;
        setCoverImages(Array.isArray(cov) ? cov.filter((c: any) => c?.url) : []);
        setForm({
          company_name: res.data.company_name || "",
          brand_name: res.data.brand_name || "",
          industry: (res.data as any).industry || "",
          description: res.data.description || "",
          website_url: res.data.website_url || "",
          address: (res.data as any).address || "",
          address_detail: (res.data as any).address_detail || "",
          phone: (res.data as any).phone || "",
          company_phone: (res.data as any).company_phone || "",
          representative_name: (res.data as any).representative_name || "",
          manager_name: (res.data as any).manager_name || "",
          company_size: (res.data as any).company_size || "",
          founded_year: (res.data as any).founded_year || "",
          region_sido: (res.data as any).region_sido || "",
          region_sigungu: (res.data as any).region_sigungu || "",
        });
        setOrigPhone((res.data as any).phone || "");
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
      const resized = await downscaleImage(file, { maxDim: 512, mime: "image/webp" });
      const fd = new FormData();
      fd.append("file", resized);
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
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    setCoverUploading(true);
    try {
      for (const file of files) {
        const resized = await downscaleImage(file, { maxDim: 1600, mime: "image/jpeg" });
        const fd = new FormData();
        fd.append("file", resized);
        const res = await fetch("/api/company/me/cover", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json();
        if (data.success) {
          const cov = data.data.cover_images;
          if (Array.isArray(cov)) setCoverImages(cov.filter((c: any) => c?.url));
        } else {
          alert(data.error?.message || "이미지 업로드에 실패했습니다.");
          break;
        }
      }
    } finally {
      setCoverUploading(false);
      e.target.value = "";
    }
  };

  const handleCoverDeleteOne = async (url: string) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch("/api/company/me/cover", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.data?.cover_images)) {
        setCoverImages(data.data.cover_images.filter((c: any) => c?.url));
        setCoverStart(0);
      }
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
      setShowPwModal(false);
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

  const formatPhone = (v: string) => {
    const d = (v || "").replace(/\D/g, "").slice(0, 11);
    if (d.length < 4) return d;
    if (d.length < 8) return d.replace(/(\d{3})(\d+)/, "$1-$2");
    return d.replace(/(\d{3})(\d{4})(\d+)/, "$1-$2-$3");
  };

  const handleSendEmailCode = async () => {
    if (!newEmail.trim()) { alert("새 이메일 주소를 입력해주세요."); return; }
    setEmailBusy(true); setEmailMsg("");
    try {
      const res = await companyMeApi.requestEmailChange({ new_email: newEmail.trim() });
      if (res.success) {
        setEmailStep(2);
        if (res.data?.dev_code) {
          setEmailMsg(`인증코드를 발송했어요. (테스트: ${res.data.dev_code})`);
        } else if (res.data?.sent) {
          setEmailMsg("새 이메일로 인증코드를 발송했어요. 메일함(스팸함 포함)을 확인해주세요.");
        } else {
          setEmailMsg(`메일 발송 실패: ${(res.data as any)?.error || "Resend 설정(도메인·API 키)을 확인해주세요."}`);
        }
      } else {
        setEmailMsg((res as any).error?.message || "발송에 실패했습니다.");
      }
    } catch { setEmailMsg("오류가 발생했습니다."); }
    finally { setEmailBusy(false); }
  };

  const handleVerifyEmailCode = async () => {
    if (!emailCode.trim()) { alert("인증코드를 입력해주세요."); return; }
    setEmailBusy(true); setEmailMsg("");
    try {
      const res = await companyMeApi.verifyEmailChange({ new_email: newEmail.trim(), code: emailCode.trim() });
      if (res.success) {
        setInfo((prev) => (prev ? { ...prev, email: (res.data as any).email } : prev));
        setShowEmailModal(false);
        alert("이메일이 변경되었습니다.");
      } else {
        setEmailMsg((res as any).error?.message || "인증에 실패했습니다.");
      }
    } catch { setEmailMsg("오류가 발생했습니다."); }
    finally { setEmailBusy(false); }
  };

  const handleWithdraw = async () => {
    if (!withdrawPw) { alert("비밀번호를 입력해주세요."); return; }
    setWithdrawing(true);
    try {
      const res = await companyMeApi.withdraw(withdrawPw);
      if (res.success) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("beautynjob-auth");
        alert("탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.");
        window.location.href = "/";
      } else {
        alert((res as any).error?.message || "탈퇴에 실패했습니다.");
        setWithdrawing(false);
      }
    } catch {
      alert("탈퇴 중 오류가 발생했습니다.");
      setWithdrawing(false);
    }
  };

  const openPhoneModal = () => {
    setNewPhone(form.phone || "");
    setPhoneCode(""); setPhoneCodeSent(false); setPhoneMsg("");
    setShowPhoneModal(true);
  };

  const handleSendPhoneCode = async () => {
    const clean = newPhone.replace(/\D/g, "");
    if (clean.length < 10) { setPhoneMsg("올바른 휴대폰 번호를 입력해주세요."); return; }
    setPhoneSending(true); setPhoneMsg("");
    try {
      const res = await fetch("/api/auth/phone/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: clean, purpose: "signup" }) });
      const data = await res.json();
      if (data.success) { setPhoneCodeSent(true); setPhoneMsg(data.data?.dev_code ? `[개발용] 인증번호: ${data.data.dev_code}` : "인증번호를 발송했어요. (3분 이내 입력)"); }
      else setPhoneMsg(data.error?.message || "발송에 실패했습니다.");
    } catch { setPhoneMsg("네트워크 오류가 발생했습니다."); } finally { setPhoneSending(false); }
  };

  const handleVerifyPhoneCode = async () => {
    const clean = newPhone.replace(/\D/g, "");
    if (!phoneCode.trim()) { setPhoneMsg("인증번호를 입력해주세요."); return; }
    setPhoneVerifying(true); setPhoneMsg("");
    try {
      const res = await fetch("/api/auth/phone/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ phone: clean, code: phoneCode, purpose: "signup" }) });
      const data = await res.json();
      if (data.success) {
        setPhoneVerified(true);
        setForm((f) => ({ ...f, phone: clean }));
        setShowPhoneModal(false);
      }
      else setPhoneMsg(data.error?.message || "인증번호가 올바르지 않습니다.");
    } catch { setPhoneMsg("네트워크 오류가 발생했습니다."); } finally { setPhoneVerifying(false); }
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      alert("기업명은 필수입니다.");
      return;
    }
    if (!form.industry) {
      alert("업종은 필수입니다.");
      return;
    }
    if (!form.company_size) {
      alert("사원수는 필수입니다.");
      return;
    }
    if (!form.address.trim()) {
      alert("주소는 필수입니다. 주소 검색으로 입력해주세요.");
      return;
    }
    if (!form.manager_name.trim()) {
      alert("담당자명은 필수입니다.");
      return;
    }
    if (!form.phone.trim()) {
      alert("담당자 연락처는 필수입니다.");
      return;
    }
    if (form.phone.replace(/\D/g, "") !== origPhone.replace(/\D/g, "") && !phoneVerified) {
      alert("담당자 연락처를 변경하려면 휴대폰 인증을 완료해주세요.");
      return;
    }
    setSaving(true);
    try {
      const res = await companyMeApi.update(form);
      setInfo(res.data);
      setOrigPhone(form.phone);
      setPhoneVerified(false); setPhoneCodeSent(false); setPhoneCode(""); setPhoneMsg("");
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
      <div className="admin-tab-row1" style={{ marginBottom: "16px" }}>
        <button className={`admin-tab1 ${activeTab === "brand" ? "active" : ""}`}
          onClick={() => setActiveTab("brand")}>프로필</button>
        <button className={`admin-tab1 ${activeTab === "account" ? "active" : ""}`}
          onClick={() => setActiveTab("account")}>계정</button>
      </div>

      {activeTab === "brand" && (
        <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr", maxWidth: "800px" }}>
          <div className="company-card">
            <div className="admin-form-body settings-compact">
              {/* 회사 로고 (라벨을 감싸 compact 그리드 제외) */}
              <div className="admin-form-row">
                <div>
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px"}}>
                  <label className="admin-form-label" style={{margin:0}}>회사 로고</label>
                  <label title={logoUrl ? "로고 변경" : "로고 등록"}
                    style={{display:"inline-flex", alignItems:"center", justifyContent:"center", width:38, height:38, flexShrink:0,
                      borderRadius:10, border:"1px solid #e2e2e6", background:"#fff", color:"#5f0080",
                      cursor: logoUploading ? "wait" : "pointer"}}>
                    {logoUploading ? "…" : <Camera size={18} />}
                    <input type="file" accept="image/jpeg,image/png,image/webp"
                      disabled={logoUploading} onChange={handleLogoUpload} style={{display:"none"}} />
                  </label>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
                  <div style={{position:"relative", width:"calc(100% / 3)", aspectRatio:"4 / 3", borderRadius:"10px", border:"1px solid #eee",
                    background:"#f7f4fb", display:"flex", alignItems:"center", justifyContent:"center",
                    overflow:"hidden", flexShrink:0}}>
                    {logoUrl ? (
                      <>
                        <img src={logoUrl} alt="회사 로고" style={{width:"100%", height:"100%", objectFit:"cover"}} />
                        <button type="button" onClick={handleLogoDelete} title="로고 삭제"
                          style={{position:"absolute", top:5, right:5, width:22, height:22, borderRadius:"50%",
                            background:"rgba(0,0,0,0.55)", color:"#fff", border:"none", cursor:"pointer",
                            display:"flex", alignItems:"center", justifyContent:"center"}}>
                          <X size={13} />
                        </button>
                      </>
                    ) : (
                      <span style={{fontSize:"20px", fontWeight:700, color:"#c4b5d4"}}>{form.company_name?.[0] || "?"}</span>
                    )}
                  </div>
                  <p style={{flex:1, minWidth:0, fontSize:"12.5px", color:"#999", margin:0, lineHeight:1.5}}>공고에 자동으로 노출되는 대표 로고예요.</p>
                </div>
                </div>
              </div>

              {/* 공고 상단 배너 (여러 장) */}
              <div className="admin-form-row">
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px"}}>
                  <label className="admin-form-label" style={{margin:0}}>공고 상단 배너</label>
                  <label title="여러 장 추가할 수 있어요"
                    style={{display:"inline-flex", alignItems:"center", gap:5, padding:"6px 11px", borderRadius:9,
                      border:"1px solid #e2e2e6", background:"#fff", color:"#5f0080", fontSize:13, fontWeight:500,
                      cursor: coverUploading ? "wait" : "pointer"}}>
                    <ImagePlus size={17} />{coverUploading ? "업로드 중…" : "추가"}
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple
                      disabled={coverUploading} onChange={handleCoverUpload} style={{display:"none"}} />
                  </label>
                </div>
                {coverImages.length === 0 ? (
                  <div style={{height:110, display:"flex", alignItems:"center", justifyContent:"center",
                    background:"#f7f4fb", border:"1px dashed #d9c9ec", borderRadius:10, color:"#b0a0c0", fontSize:13}}>
                    아직 등록한 이미지가 없어요.
                  </div>
                ) : coverImages.length === 1 ? (
                  <div style={{position:"relative", width:"100%", borderRadius:10, overflow:"hidden", border:"1px solid #eee", background:"#f4f4f4"}}>
                    <img src={coverImages[0].url} alt="" style={{display:"block", width:"100%", height:"auto"}} />
                    <button type="button" onClick={() => handleCoverDeleteOne(coverImages[0].url)} title="삭제"
                      style={{position:"absolute", top:6, right:6, width:24, height:24, borderRadius:"50%",
                        background:"rgba(0,0,0,0.55)", color:"#fff", border:"none", cursor:"pointer",
                        display:"flex", alignItems:"center", justifyContent:"center"}}>
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div style={{position:"relative"}}>
                    <div style={{display:"grid", gridTemplateColumns:`repeat(${Math.min(coverImages.length, 3)}, 1fr)`, gap:0, borderRadius:10, overflow:"hidden", border:"1px solid #eee"}}>
                      {(coverImages.length <= 3
                        ? coverImages
                        : [0,1,2].map((i) => coverImages[(coverStart + i) % coverImages.length])
                      ).map((c, i) => (
                        <div key={`${coverStart}-${i}-${c.url}`}
                          style={{position:"relative", aspectRatio:"4 / 3", background:"#f3f3f3"}}>
                          <img src={c.url} alt="" style={{width:"100%", height:"100%", objectFit:"cover"}} />
                          <button type="button" onClick={() => handleCoverDeleteOne(c.url)} title="삭제"
                            style={{position:"absolute", top:5, right:5, width:22, height:22, borderRadius:"50%",
                              background:"rgba(0,0,0,0.55)", color:"#fff", border:"none", cursor:"pointer",
                              display:"flex", alignItems:"center", justifyContent:"center"}}>
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                    {coverImages.length > 3 && (
                      <button type="button" onClick={() => setCoverStart((s) => (s + 1) % coverImages.length)} aria-label="다음 이미지"
                        style={{position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", width:34, height:34,
                          borderRadius:"50%", border:"none", background:"rgba(0,0,0,0.55)", color:"#fff",
                          display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer"}}>
                        <ChevronRight size={20} />
                      </button>
                    )}
                  </div>
                )}
                <p style={{fontSize:"12.5px", color:"#999", margin:"6px 0 0"}}>채용공고 상단에 배너로 표시되는 이미지예요.</p>
              </div>

              <div className="admin-form-row-2col">
                <div className="admin-form-row">
                  <label className="admin-form-label">기업명<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                  <input className="admin-form-input" placeholder="기업명"
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div className="admin-form-row">
                  <label className="admin-form-label">업종<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                  <select className="admin-form-select" style={{ height: 42, boxSizing: "border-box" }}
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                    <option value="">선택</option>
                    {industryGroupsFor(info?.company_type as any).map((g, gi) =>
                      g.label ? (
                        <optgroup key={gi} label={g.label}>
                          {g.items.map((it) => <option key={it} value={it}>{it}</option>)}
                        </optgroup>
                      ) : (
                        g.items.map((it) => <option key={it} value={it}>{it}</option>)
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="admin-form-row-2col">
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
              </div>

              <div className="admin-form-row">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <label className="admin-form-label" style={{ margin: 0 }}>주소<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                  {form.address && (
                    <button type="button" onClick={handleClearAddress}
                      style={{ fontSize: "13px", color: "#999", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", padding: "2px 4px" }}>
                      초기화
                    </button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? "8px" : "12px" }}>
                  <input className="admin-form-input" readOnly value={form.address}
                    onClick={handleAddressSearch}
                    placeholder="주소 검색을 눌러주세요"
                    style={{ minWidth: 0, cursor: "pointer" }} />
                  <input className="admin-form-input"
                    placeholder="상세주소 (동·호수 등)"
                    style={{ minWidth: 0 }}
                    value={form.address_detail}
                    onChange={(e) => setForm({ ...form, address_detail: e.target.value })} />
                </div>
              </div>

              <div className="admin-form-row-2col">
                <div className="admin-form-row">
                  <label className="admin-form-label">사원수<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
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
              <div className="admin-form-row-2col">
                <div className="admin-form-row">
                  <label className="admin-form-label">대표자</label>
                  <input className="admin-form-input" placeholder="대표자명"
                    value={form.representative_name}
                    onChange={(e) => setForm({ ...form, representative_name: e.target.value })} />
                </div>
                <div className="admin-form-row">
                  <label className="admin-form-label">회사 대표번호</label>
                  <input className="admin-form-input" placeholder="02-000-0000" inputMode="numeric" maxLength={13}
                    value={formatPhone(form.company_phone)}
                    onChange={(e) => setForm({ ...form, company_phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} />
                </div>
              </div>
              <div className="admin-form-row-2col">
                <div className="admin-form-row">
                  <label className="admin-form-label">담당자<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                  <input className="admin-form-input" placeholder="담당자명"
                    value={form.manager_name}
                    onChange={(e) => setForm({ ...form, manager_name: e.target.value })} />
                </div>
                <div className="admin-form-row">
                  <label className="admin-form-label">담당자 연락처<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                  <button type="button" onClick={openPhoneModal}
                    style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6, width: "100%", background: "none", border: "none", padding: 0, cursor: "pointer", color: form.phone ? "#333" : "#bbb", fontSize: 14, fontFamily: "inherit" }}>
                    <span>{form.phone ? formatPhone(form.phone) : "번호 등록"}</span>
                    <span style={{ color: "#ccc", fontSize: 16 }}>›</span>
                  </button>
                </div>
              </div>
              <div className="admin-form-row">
                <div>
                <label className="admin-form-label">기업 소개</label>
                <textarea className="admin-form-textarea" rows={5}
                  placeholder="회사를 소개하는 글을 입력해주세요. 여기에 작성한 내용은 채용공고 상세 페이지의 '회사 소개' 영역에 표시돼요."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "account" && (
        <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr", maxWidth: "400px" }}>
          <div className="company-card">
            <div className="admin-form-body" style={{ gap: 0, paddingTop: 0, paddingBottom: 0 }}>
              <div className="admin-form-row" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "15px 0", borderBottom: "1px solid #f0f0f0" }}>
                <label className="admin-form-label" style={{ margin: 0, flexShrink: 0 }}>사업자등록번호</label>
                <span style={{ fontSize: "14px", color: info?.business_number ? "#333" : "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{info?.business_number || "미등록"}</span>
              </div>

              <div className="admin-form-row"
                onClick={() => { setShowEmailModal(true); setEmailStep(1); setNewEmail(""); setEmailCode(""); setEmailMsg(""); }}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "15px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}>
                <label className="admin-form-label" style={{ margin: 0, flexShrink: 0 }}>이메일</label>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
                  <span style={{ fontSize: "14px", color: info?.email ? "#333" : "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{info?.email || "미등록"}</span>
                  <span style={{ color: "#ccc", fontSize: "16px", flexShrink: 0 }}>›</span>
                </span>
              </div>

              <div className="admin-form-row"
                onClick={() => setShowPwModal(true)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "15px 0", borderBottom: "1px solid #f0f0f0", cursor: "pointer" }}>
                <label className="admin-form-label" style={{ margin: 0, flexShrink: 0 }}>비밀번호</label>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#5f0080", fontSize: "14px" }}>
                  변경 <span style={{ color: "#ccc", fontSize: "16px" }}>›</span>
                </span>
              </div>

              <div className="admin-form-row"
                onClick={() => setShowWithdraw(true)}
                style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "15px 0", cursor: "pointer" }}>
                <label className="admin-form-label" style={{ margin: 0, flexShrink: 0 }}>회원 탈퇴</label>
                <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#e74c3c", fontSize: "14px" }}>
                  탈퇴 <span style={{ color: "#e6a6a0", fontSize: "16px" }}>›</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {showEmailModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 420, width: "100%" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>이메일 변경</h3>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px", lineHeight: 1.5 }}>
              {emailStep === 1 ? "① 새 이메일 주소를 입력하고 인증코드를 받으세요." : "② 새 이메일로 받은 인증코드를 입력하세요."}
            </p>
            {emailStep === 1 ? (
              <input type="email" className="admin-form-input" placeholder="새 이메일 주소"
                value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={{ marginBottom: 4 }} />
            ) : (
              <input className="admin-form-input" placeholder="인증코드 6자리" inputMode="numeric" maxLength={6}
                value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))} style={{ marginBottom: 4 }} />
            )}
            {emailMsg && <p style={{ fontSize: 13, color: "#5f0080", margin: "6px 0 0", lineHeight: 1.5 }}>{emailMsg}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setShowEmailModal(false)} disabled={emailBusy}
                style={{ flex: 1, height: 46, borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#333", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
                취소
              </button>
              {emailStep === 1 ? (
                <button onClick={handleSendEmailCode} disabled={emailBusy}
                  style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 16, fontWeight: 600, cursor: emailBusy ? "not-allowed" : "pointer", opacity: emailBusy ? 0.7 : 1 }}>
                  {emailBusy ? "발송 중..." : "인증코드 받기"}
                </button>
              ) : (
                <button onClick={handleVerifyEmailCode} disabled={emailBusy}
                  style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 16, fontWeight: 600, cursor: emailBusy ? "not-allowed" : "pointer", opacity: emailBusy ? 0.7 : 1 }}>
                  {emailBusy ? "확인 중..." : "변경하기"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showPhoneModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 420, width: "100%" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px" }}>담당자 연락처 변경</h3>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 16px", lineHeight: 1.5 }}>
              {!phoneCodeSent ? "① 새 휴대폰 번호를 입력하고 인증번호를 받으세요." : "② 문자로 받은 인증번호를 입력하세요."}
            </p>
            {!phoneCodeSent ? (
              <input className="admin-form-input" placeholder="010-0000-0000" inputMode="numeric" maxLength={13}
                value={formatPhone(newPhone)}
                onChange={(e) => { setNewPhone(e.target.value.replace(/\D/g, "").slice(0, 11)); setPhoneVerified(false); setPhoneMsg(""); }} style={{ marginBottom: 4 }} />
            ) : (
              <input className="admin-form-input" placeholder="인증번호 6자리" inputMode="numeric" maxLength={6}
                value={phoneCode} onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))} style={{ marginBottom: 4 }} />
            )}
            {phoneMsg && <p style={{ fontSize: 13, color: "#5f0080", margin: "6px 0 0", lineHeight: 1.5 }}>{phoneMsg}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setShowPhoneModal(false)} disabled={phoneSending || phoneVerifying}
                style={{ flex: 1, height: 46, borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#333", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
                취소
              </button>
              {!phoneCodeSent ? (
                <button onClick={handleSendPhoneCode} disabled={phoneSending || newPhone.replace(/\D/g, "").length < 10}
                  style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: (phoneSending || newPhone.replace(/\D/g, "").length < 10) ? 0.6 : 1 }}>
                  {phoneSending ? "발송 중..." : "인증번호 받기"}
                </button>
              ) : (
                <button onClick={handleVerifyPhoneCode} disabled={phoneVerifying || phoneCode.length < 6}
                  style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 16, fontWeight: 600, cursor: "pointer", opacity: (phoneVerifying || phoneCode.length < 6) ? 0.6 : 1 }}>
                  {phoneVerifying ? "확인 중..." : "변경하기"}
                </button>
              )}
            </div>
            {phoneCodeSent && (
              <button onClick={handleSendPhoneCode} disabled={phoneSending}
                style={{ marginTop: 10, width: "100%", background: "none", border: "none", color: "#888", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>
                인증번호 재전송
              </button>
            )}
          </div>
        </div>
      )}

      {showPwModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 420, width: "100%" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 16px" }}>비밀번호 변경</h3>
            <input className="admin-form-input" type={showPw ? "text" : "password"} placeholder="현재 비밀번호"
              value={pwForm.current_password}
              onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })} />
            <input className="admin-form-input" type={showPw ? "text" : "password"} placeholder="새 비밀번호 (8자 이상)"
              style={{ marginTop: "8px" }}
              value={pwForm.new_password}
              onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })} />
            <input className="admin-form-input" type={showPw ? "text" : "password"} placeholder="새 비밀번호 확인"
              style={{ marginTop: "8px" }}
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })} />
            <label style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "14px", color: "#666", cursor: "pointer" }}>
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
              비밀번호 표시
            </label>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowPwModal(false)} disabled={pwSaving}
                style={{ flex: 1, height: 46, borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#333", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
                취소
              </button>
              <button onClick={handleChangePassword} disabled={pwSaving}
                style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 16, fontWeight: 600, cursor: pwSaving ? "not-allowed" : "pointer", opacity: pwSaving ? 0.7 : 1 }}>
                {pwSaving ? "변경 중..." : "변경하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWithdraw && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 400, width: "100%" }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 10px" }}>정말 탈퇴하시겠어요?</h3>
            <p style={{ fontSize: 15, color: "#666", lineHeight: 1.6, margin: "0 0 20px" }}>
              탈퇴하면 계정과 등록한 채용공고가 비활성화되고, 되돌릴 수 없어요.
            </p>
            <input type="password" className="admin-form-input" placeholder="현재 비밀번호 입력"
              value={withdrawPw} onChange={(e) => setWithdrawPw(e.target.value)}
              style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => { setShowWithdraw(false); setWithdrawPw(""); }} disabled={withdrawing}
                style={{ flex: 1, height: 48, borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#333", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>
                취소
              </button>
              <button onClick={handleWithdraw} disabled={withdrawing}
                style={{ flex: 1, height: 48, borderRadius: 8, border: "none", background: "#e74c3c", color: "#fff", fontSize: 16, fontWeight: 600, cursor: withdrawing ? "not-allowed" : "pointer", opacity: withdrawing ? 0.7 : 1 }}>
                {withdrawing ? "처리 중..." : "탈퇴하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "brand" && (
        <div style={{ margin: "24px 0 40px", maxWidth: "800px", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
          {savedMessage && (
            <span style={{ color: "#10b981", fontSize: "15px", fontWeight: 600 }}>
              {savedMessage}
            </span>
          )}
          <button
            className="resume-save-btn-full"
            onClick={handleSave}
            disabled={saving}
            style={{ opacity: saving ? 0.7 : 1, cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "저장 중..." : "저장하기"}
          </button>
        </div>
      )}
    </CompanyLayout>
  );
}