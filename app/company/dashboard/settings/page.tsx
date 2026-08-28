"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import { Save, Camera, X, ChevronRight, Pencil } from "lucide-react";
import { companyMeApi } from "@/lib/api/company";
import { industryGroupsFor } from "@/lib/data/industries";
import { downscaleImage } from "@/lib/imageResize";
import ImageCropModal from "@/components/ImageCropModal";
import { SNS찾기 } from "@/lib/snsPresets";
import { InlineSuggest, InlineText } from "@/components/profile/inline/InlineField";
import { Plus, Trash2, Store, Tag, Link as LinkIcon, Globe, Users, Calendar,
  UserRound, Phone, Home, FileText, Image as ImageIcon, BadgeCheck,
  GalleryThumbnails } from "lucide-react";
import type { CompanyInfo } from "@/lib/types/company";

declare global {
  interface Window { daum?: any; }
}

export default function CompanySettingsPage() {
  const router = useRouter();
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  // 매장 회원은 '회사'가 아니라 '매장' 기준 용어를 쓴다.
  const isStore = info?.company_type !== "OFFICE"; // 매장·매장+본사는 매장 기준 용어를 쓴다
  const L = {
    name: isStore ? "매장명" : "기업명",
    size: isStore ? "직원수" : "사원수",
    phone: isStore ? "매장 전화번호" : "회사 대표번호",
    intro: isStore ? "매장 소개" : "기업 소개",
    // 이 사진이 무엇인지(우리 매장/기업)로 부른다. 어디에 쓰이는지는 바로 아래 공고 카드 그림이 말한다.
    thumb: isStore ? "매장 썸네일" : "기업 썸네일",
    // 매장은 홈페이지가 거의 없고 인스타가 사실상 포트폴리오라, 같은 필드를 SNS로 쓴다.
    site: isStore ? "매장 SNS" : "웹사이트",
    sitePh: isStore ? "인스타·유튜브 주소" : "https://",
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [signboardUrl, setSignboardUrl] = useState<string | null>(null);
  const [signboardUploading, setSignboardUploading] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  /** 항목마다 왼쪽에 놓는 아이콘. 라벨 이름으로 고른다 — 칸이 늘어도 여기만 손보면 된다. */
  const 칸그림 = (이름: string) => {
    const 표: Record<string, any> = {
      "매장명": Store, "기업명": Store, "회사명": Store, "업종": Tag,
      "SNS": LinkIcon, "웹사이트": Globe, "브랜드명": BadgeCheck,
      "직원수": Users, "사원수": Users, "설립연도": Calendar,
      "대표자": UserRound, "매장 전화번호": Phone, "회사 대표번호": Phone,
      "주소": Home, "사업자등록번호": FileText,
      "매장 소개": FileText, "기업 소개": FileText,
      "회사 로고": ImageIcon, "매장 썸네일": GalleryThumbnails, "기업 썸네일": GalleryThumbnails,
    };
    const G = 표[이름];
    return G ? <G size={15} className="admin-form-icon" /> : null;
  };

  // SNS·홈페이지 — 개인회원 프로필과 같은 방식으로 여러 개를 담는다.
  //   website_url 은 열다섯 곳에서 읽고 있어 그대로 두고, 첫 링크를 늘 거기에 맞춘다.
  const [links, setLinks] = useState<{ id: string; category: string; url: string }[]>([]);
  const 새id = () => `l${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
  // 화면에만 세워 둔 빈 줄("__빈")을 고치면 그때 진짜 목록에 담는다.
  const 링크고치기 = (id: string, patch: Partial<{ category: string; url: string }>) =>
    setLinks((ls) => (ls.some((l) => l.id === id)
      ? ls.map((l) => (l.id === id ? { ...l, ...patch } : l))
      : [...ls, { id: 새id(), category: "", url: "", ...patch }]));
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
    company_phone: "",
    representative_name: "",
    company_size: "",
    founded_year: "",
    region_sido: "",
    region_sigungu: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await companyMeApi.get();
        setInfo(res.data);
        setLogoUrl((res.data as any).logo_url || null);
        setSignboardUrl((res.data as any).signboard_url || null);
        // 링크 목록. 아직 없으면 여태 쓰던 website_url 한 줄로 시작한다.
        const raw = (res.data as any).links;
        const 온것 = Array.isArray(raw) ? raw.filter((l: any) => l?.url) : [];
        const 첫줄 = res.data.website_url ? [{ category: "", url: res.data.website_url }] : [];
        setLinks((온것.length ? 온것 : 첫줄).slice(0, 1).map((l: any) => ({
          id: `l${Math.random().toString(36).slice(2, 8)}`, category: l.category || "", url: l.url || "",
        })));
        setForm({
          company_name: res.data.company_name || "",
          brand_name: res.data.brand_name || "",
          industry: (res.data as any).industry || "",
          description: res.data.description || "",
          website_url: res.data.website_url || "",
          address: (res.data as any).address || "",
          address_detail: (res.data as any).address_detail || "",
          company_phone: (res.data as any).company_phone || "",
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
      // 로고는 화면에서 최대 64px로 보인다. 256px면 3배 해상도 화면까지 충분해 파일이 훨씬 가벼워진다.
      const resized = await downscaleImage(file, { maxDim: 256, maxBytes: 120 * 1024, mime: "image/webp" });
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

  // 썸네일 — 고르면 바로 올리지 않고 자르기 화면부터 연다.
  const handleSignboardPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setCropFile(file);
    e.target.value = "";
  };

  const handleSignboardCropped = async (blob: Blob) => {
    setCropFile(null);
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    setSignboardUploading(true);
    try {
      const cropped = new File([blob], "signboard.webp", { type: "image/webp" });
      const resized = await downscaleImage(cropped, { maxDim: 480, maxBytes: 200 * 1024, mime: "image/webp" });
      const fd = new FormData();
      fd.append("file", resized);
      const res = await fetch("/api/company/me/signboard", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setSignboardUrl(data.data.signboard_url);
      } else {
        alert(data.error?.message || `${L.thumb} 업로드에 실패했습니다.`);
      }
    } finally {
      setSignboardUploading(false);
    }
  };

  const handleSignboardDelete = async () => {
    if (!confirm(`${L.thumb}을 삭제하시겠습니까?`)) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch("/api/company/me/signboard", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setSignboardUrl(null);
    } catch (e) {
      console.error(e);
    }
  };

  // 직원수 구간은 매장과 본사가 다르다. 미용실은 1인샵~20명 남짓이 현실 범위라
  // "300~1000명" 같은 칸을 보여주면 고를 게 없다.
  const SIZE_OPTIONS = isStore
    ? ["1명 (1인샵)", "2~4명", "5~9명", "10~19명", "20명 이상"]
    : ["1~10명", "10~50명", "50~100명", "100~300명", "300~1000명", "1000명 이상"];
  // 예전에 저장된 값이 새 구간에 없더라도 그대로 보이게 선택지에 남겨 둔다(임의로 바꾸지 않는다).
  const sizeOptions = form.company_size && !SIZE_OPTIONS.includes(form.company_size)
    ? [form.company_size, ...SIZE_OPTIONS]
    : SIZE_OPTIONS;

  // 카카오 우편번호 검색
  // 주소 검색: 팝업(.open)은 모바일 인앱 브라우저에서 닫을 방법이 없어 갇힌다 → 닫기 버튼이 있는 레이어로 띄운다.
  const addrBoxRef = useRef<HTMLDivElement>(null);
  const [addrOpen, setAddrOpen] = useState(false);
  const handleAddressSearch = () => {
    setAddrOpen(true);
    const embed = () => {
      const el = addrBoxRef.current;
      if (!el) return;
      el.innerHTML = "";
      new window.daum.Postcode({
        oncomplete: (data: any) => {
          const base = data.roadAddress || data.jibunAddress || "";
          setForm((prev) => ({
            ...prev,
            region_sido: data.sido || "",
            region_sigungu: data.sigungu || "",
            address: data.buildingName ? `${base} (${data.buildingName})` : base,
          }));
          setAddrOpen(false);
        },
        onclose: () => setAddrOpen(false),
        width: "100%",
        height: "100%",
      }).embed(el);
    };
    // 레이어가 그려진 뒤 삽입
    setTimeout(() => {
      if (window.daum?.Postcode) { embed(); return; }
      const script = document.createElement("script");
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.onload = embed;
      document.body.appendChild(script);
    }, 0);
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

  // SNS·홈페이지 목록 — 매장과 본사가 같은 것을 쓴다(개인회원 프로필과 같은 부품).
  // SNS·홈페이지 목록 — 매장과 본사가 같은 것을 쓴다(개인회원 프로필과 같은 부품).
  //   라벨 옆에 바로 칸이 붙어 한 줄로 읽힌다. 빈 줄 하나는 늘 세워 둔다 —
  //   "넣어 보세요" 같은 안내 단추 없이도 무엇을 적는 자리인지 자리글이 말해 준다.
  // SNS·홈페이지 — 개인회원 프로필과 같은 부품. 2열 한 칸에 들어가는 크기다.
  //   ＋ 는 두지 않는다. 맨 아래에 늘 빈 줄이 하나 서 있어, 채우면 그 아래로
  //   빈 줄이 또 따라 붙는다(누를 것 없이 계속 넣을 수 있다).
  // SNS·홈페이지 — 한 줄만 받는다. 매장이 여러 곳을 쓰더라도 공고에 내보내는 것은
  //   대표 한 곳이면 충분하다(저장은 links 배열에 한 칸, 첫 링크가 website_url 이 된다).
  const 링크한줄 = links[0] || { id: "__빈", category: "", url: "" };
  /* 계정 통제(로그인) 정보가 아니라 이 사업자가 법적으로 누구인지에 대한 사실이라
     프로필에 둔다("사업자등록번호는 계정설정보다 프로필이 맞다"). 가입 때 검증한
     값이라 여기서도 고치지는 못한다. 매장·본사가 짝지을 칸이 달라 조각으로 빼 둔다. */
  const 사업자번호칸 = (
    <div className="admin-form-row">
      <label className="admin-form-label">{칸그림("사업자등록번호")}사업자등록번호</label>
      <span style={{ fontSize: 15, color: info?.business_number ? "#333" : "#bbb" }}>{info?.business_number || "미등록"}</span>
    </div>
  );
  const 링크목록 = (
    <div className="admin-form-row">
      <label className="admin-form-label">{칸그림(isStore ? "SNS" : "웹사이트")}{isStore ? "SNS" : "웹사이트"}</label>
      <div className="if-row if-row-plain" style={{ borderBottom: "none", padding: 0, minWidth: 0 }}>
        <div className="if-row-body">
          <div className="if-line">
            <InlineSuggest value={링크한줄.category} placeholder="SNS명"
              찾기={SNS찾기}
              onPick={(k) => 링크고치기(링크한줄.id, { category: k.이름, url: 링크한줄.url || k.앞부분 })}
              onSave={(v) => 링크고치기(링크한줄.id, { category: v })} />
            <span className="if-sep">|</span>
            <InlineText value={링크한줄.url} placeholder="https://"
              onSave={(v) => 링크고치기(링크한줄.id, { url: v })} />
          </div>
        </div>
        {links.length > 0 && (
          <button className="if-row-del" aria-label="지우기" onClick={() => setLinks([])}>
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </div>
  );

  const handleSave = async () => {
    if (!form.company_name.trim()) {
      alert(`${L.name}은 필수입니다.`);
      return;
    }
    if (!form.industry) {
      alert("업종은 필수입니다.");
      return;
    }
    if (!form.address.trim()) {
      alert("주소는 필수입니다. 주소 검색으로 입력해주세요.");
      return;
    }
    // 썸네일은 공고 카드의 표지다 — 없으면 목록에서 우리 매장만 빈 칸으로 남는다.
    if (isStore && !signboardUrl) {
      alert(`${L.thumb}은 필수입니다. 로고나 간판 사진을 올려주세요.`);
      return;
    }
    setSaving(true);
    try {
      // 빈 줄은 버린다. 첫 링크는 website_url 에도 넣어 기존 화면들이 그대로 돌게 한다.
      const 낼링크 = links.filter((l) => l.url.trim()).slice(0, 1)
        .map((l) => ({ category: l.category.trim(), url: l.url.trim() }));
      const res = await companyMeApi.update({ ...form, links: 낼링크, website_url: 낼링크[0]?.url || "" } as any);
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
      {(
        <div className="admin-form-grid" style={{ gridTemplateColumns: "1fr", maxWidth: "800px" }}>
      {/* 썸네일 — 매장은 로고 대신, 로고나 매장명이 보이는 사진을 등록한다.
          공고 카드 표지이자 헤더 아바타로 쓰인다.
          칸 이름도 테두리도 없이 카드 밖 위에 홀로 둔다 — 적어 넣는 칸들과 성격이
          다르고(그 자리에서 바로 올라간다), 그림이 곧 이름이라 글이 필요 없다. */}
      {isStore && (
      <div style={{marginBottom:16}}>
        <div>
        {/* 어디에 쓰이는지는 글보다 그림이 빠르다. 실제 공고 카드를 작게
            그려 두고, 그 사진 자리를 그대로 올리기 단추로 쓴다 — 누르는 곳과
            바뀌는 곳이 같아야 무엇을 하는 건지 설명이 필요 없다. 실물과
            어긋나지 않게 채용공고 카드와 같은 class 를 쓴다. */}
        <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap:"8px"}}>
          <div style={{width:114, flexShrink:0}}>
            <div className={`jobcard${signboardUrl ? " jobcard-photo" : ""}`}
              /* 지우기 단추가 이 카드 안에 자리 잡도록 기준을 준다 */
              style={{cursor:"default", transform:"none", boxShadow:"none", borderRadius:9, position:"relative"}}>
              <label className={`jobcard-cover${signboardUrl ? "" : " jobcard-cover-empty"}`}
                title={signboardUrl ? "사진 바꾸기" : "사진 올리기"}
                style={{ aspectRatio: "3 / 2", display:"block",
                  cursor: signboardUploading ? "wait" : "pointer" }}>
                <input type="file" accept="image/jpeg,image/png,image/webp"
                  disabled={signboardUploading} onChange={handleSignboardPick} style={{display:"none"}} />
                {signboardUrl ? (
                  <img src={signboardUrl} alt={L.thumb} className="jobcard-cover-img" />
                ) : (
                  /* 빈 칸이 곧 올리기 단추다. 무엇을 올리는 자리인지만 적고,
                     누르면 된다는 신호는 아래 연필 단추가 맡는다. */
                  <span style={{position:"absolute", inset:0, display:"flex", flexDirection:"column",
                    alignItems:"center", justifyContent:"center", gap:2, color:"#a99bbd"}}>
                    {signboardUploading ? <span style={{fontSize:11}}>올리는 중…</span> : (
                      <>
                        {/* 칸 이름이 없어졌으니 무엇을 올리는 자리인지는 이 줄이 다 말한다.
                            필수 표시(*)도 여기 붙는다 — 이름이 있던 자리가 여기다. */}
                        <span style={{fontSize:11.5, fontWeight:500, lineHeight:1.35}}>
                          로고/간판<br />썸네일<span style={{color:"#e74c3c", marginLeft:2}}>*</span>
                        </span>
                        {/* 고르기 창이 받는 것과 같은 목록(accept) — 다른 파일을 골랐다 되돌아오는 일을 던다 */}
                        <span style={{fontSize:8.5, color:"#c4b8d3"}}>JPG · PNG · WEBP</span>
                      </>
                    )}
                  </span>
                )}
                {/* 사진이 있든 없든 늘 같은 자리에 있는 '고치기' 표시.
                    label 안이라 이 동그라미를 눌러도 파일 고르기가 열린다. */}
                <span style={{position:"absolute", right:4, bottom:4, width:19, height:19,
                  borderRadius:"50%", background:"#582681", color:"#fff", display:"flex",
                  alignItems:"center", justifyContent:"center",
                  boxShadow:"0 1px 3px rgba(0,0,0,0.28)", zIndex:2}}>
                  <Pencil size={10} />
                </span>
              </label>
              {signboardUrl && (
                <button type="button" onClick={handleSignboardDelete} title="사진 지우기"
                  style={{position:"absolute", top:4, right:4, width:18, height:18, borderRadius:"50%",
                    background:"rgba(0,0,0,0.55)", color:"#fff", border:"none", cursor:"pointer",
                    display:"flex", alignItems:"center", justifyContent:"center", zIndex:2}}>
                  <X size={10} />
                </button>
              )}
              {/* 카드 아래 글자도 위 '로고 / 간판'과 같은 크기·굵기·색으로 — 둘 다
                  아직 안 채워진 자리를 보여주는 견본이라 무게가 같아야 한다. */}
              <div className="jobcard-body" style={{padding:"5px 9px 7px"}}>
                <p className="jobcard-title" style={{fontSize:11.5, fontWeight:500, color:"#a99bbd",
                  margin:0, textAlign:"center"}}>
                  채용공고
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
      )}
          <div className="company-card">
            <div className="admin-form-body settings-compact">
              {/* 회사 로고 — 매장은 상호가 곧 브랜드라 쓸 만한 로고 파일이 없는 경우가 많고,
                  목록 썸네일·공고 상단은 배너 이미지가 이미 채운다. 그래서 본사에만 둔다. */}
              {!isStore && (
              <div className="admin-form-row">
                <div>
                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px"}}>
                  <label className="admin-form-label" style={{margin:0}}>{칸그림("회사 로고")}회사 로고</label>
                  <label title={logoUrl ? "로고 변경" : "로고 등록"}
                    style={{display:"inline-flex", alignItems:"center", justifyContent:"center", width:38, height:38, flexShrink:0,
                      borderRadius:10, border:"1px solid #e2e2e6", background:"#fff", color:"#582681",
                      cursor: logoUploading ? "wait" : "pointer"}}>
                    {logoUploading ? "…" : <Camera size={18} />}
                    <input type="file" accept="image/jpeg,image/png,image/webp"
                      disabled={logoUploading} onChange={handleLogoUpload} style={{display:"none"}} />
                  </label>
                </div>
                <div style={{display:"flex", alignItems:"center", gap:"12px"}}>
                  {/* 공고에 실제로 찍히는 크기(56px)에 맞춘 미리보기. 로고는 여백이 살아야 해서 잘라내지 않고(contain) 흰 바탕에 얹는다. */}
                  <div style={{position:"relative", width:64, height:64, borderRadius:"12px", border:"1px solid #eee",
                    background:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
                    overflow:"hidden", flexShrink:0, padding:6, boxSizing:"border-box"}}>
                    {logoUrl ? (
                      <>
                        <img src={logoUrl} alt="회사 로고" style={{width:"100%", height:"100%", objectFit:"contain"}} />
                        <button type="button" onClick={handleLogoDelete} title="로고 삭제"
                          style={{position:"absolute", top:2, right:2, width:18, height:18, borderRadius:"50%",
                            background:"rgba(0,0,0,0.55)", color:"#fff", border:"none", cursor:"pointer",
                            display:"flex", alignItems:"center", justifyContent:"center"}}>
                          <X size={11} />
                        </button>
                      </>
                    ) : (
                      <span style={{fontSize:"20px", fontWeight:700, color:"#e3e3e6"}}>{form.company_name?.[0] || "?"}</span>
                    )}
                  </div>
                  <p style={{flex:1, minWidth:0, fontSize:"12.5px", color:"#999", margin:0, lineHeight:1.5}}>공고에 자동으로 노출되는 대표 로고예요.</p>
                </div>
                </div>
              </div>
              )}


              {/* 이 매장·회사가 무엇인지부터 — 이름과 업종이 맨 위에 온다.
                  사업자등록번호는 읽기 전용이라 먼저 나올 이유가 없어 아래 짝에 넣었다. */}
              <div className="admin-form-row-2col">
                <div className="admin-form-row">
                  <label className="admin-form-label">{칸그림(L.name)}{L.name}<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                  <input className="admin-form-input" placeholder={isStore ? "예) 준오헤어 광명점" : "예) (주)뷰티워크"}
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
                </div>
                <div className="admin-form-row">
                  <label className="admin-form-label">{칸그림("업종")}업종<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                  <select className="admin-form-select" data-empty={!form.industry} style={{ height: 42, boxSizing: "border-box" }}
                    value={form.industry}
                    onChange={(e) => setForm({ ...form, industry: e.target.value })}>
                    <option value="">선택하기</option>
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

              {/* 매장은 상호가 곧 브랜드라 이름 칸이 하나면 된다(브랜드명·대표자·설립연도·매장 전화번호 없음).
                  본사(매장이 아닌 곳)는 근로계약이 법인 기준이라 기업명과 브랜드명을 따로 받는다. */}
              {isStore ? (
                <>
                {/* 두 칸씩 끝까지 맞아떨어지게 짝을 지었다 — 혼자 남아 반쪽만 차지하는 줄이 없다. */}
                <div className="admin-form-row-2col">
                  {사업자번호칸}
                  <div className="admin-form-row">
                    <label className="admin-form-label">{칸그림(L.size)}{L.size}</label>
                    <select className="admin-form-select" data-empty={!form.company_size}
                      style={{ height: 42, boxSizing: "border-box" }}
                      value={form.company_size}
                      onChange={(e) => setForm({ ...form, company_size: e.target.value })}>
                      <option value="">선택하기</option>
                      {sizeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                {/* 담당자 휴대폰(계정 설정, 내부용)과는 별개로 예약 문의 등에 쓸 매장 공개
                    번호 — 필수는 아니다("매장전화번호 추가해줘. 필수는 아닌듯"). */}
                <div className="admin-form-row-2col">
                  <div className="admin-form-row">
                    <label className="admin-form-label">{칸그림(L.phone)}{L.phone}</label>
                    <input className="admin-form-input" placeholder="숫자만 입력해주세요" inputMode="numeric" maxLength={13}
                      value={formatPhone(form.company_phone)}
                      onChange={(e) => setForm({ ...form, company_phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} />
                  </div>
                  {링크목록}
                </div>
                </>
              ) : (
                <>
                  <div className="admin-form-row-2col">
                    {사업자번호칸}
                    <div className="admin-form-row">
                      <label className="admin-form-label">{칸그림("브랜드명")}브랜드명</label>
                      <input className="admin-form-input" placeholder="예) 헤라, 닥터지"
                        value={form.brand_name}
                        onChange={(e) => setForm({ ...form, brand_name: e.target.value })} />
                    </div>
                  </div>
                  <div className="admin-form-row-2col">
                    <div className="admin-form-row">
                      <label className="admin-form-label">{칸그림("대표자")}대표자</label>
                      <input className="admin-form-input" placeholder="예) 홍길동"
                        value={form.representative_name}
                        onChange={(e) => setForm({ ...form, representative_name: e.target.value })} />
                    </div>
                    <div className="admin-form-row">
                      <label className="admin-form-label">{칸그림("설립연도")}설립연도</label>
                      <input type="number" className="admin-form-input" placeholder="예) 2020"
                        style={{ height: 42, boxSizing: "border-box" }}
                        min="1900" max={new Date().getFullYear()}
                        value={form.founded_year}
                        onChange={(e) => setForm({ ...form, founded_year: e.target.value })} />
                    </div>
                  </div>
                  <div className="admin-form-row-2col">
                    <div className="admin-form-row">
                      <label className="admin-form-label">{칸그림(L.size)}{L.size}</label>
                      <select className="admin-form-select" data-empty={!form.company_size}
                        style={{ height: 42, boxSizing: "border-box" }}
                        value={form.company_size}
                        onChange={(e) => setForm({ ...form, company_size: e.target.value })}>
                        <option value="">선택하기</option>
                        {sizeOptions.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div className="admin-form-row">
                      <label className="admin-form-label">{칸그림(L.phone)}{L.phone}</label>
                      <input className="admin-form-input" placeholder="숫자만 입력해주세요" inputMode="numeric" maxLength={13}
                        value={formatPhone(form.company_phone)}
                        onChange={(e) => setForm({ ...form, company_phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} />
                    </div>
                  </div>
                  {/* 본사는 칸이 홀수라 하나가 짝 없이 남는다. 반쪽만 차지하고 옆이 비는
                      것보다, 주소·소개처럼 한 줄을 다 쓰게 두는 편이 낫다(주소가 긴 칸이기도 하다). */}
                  {링크목록}
                </>
              )}
              {/* 주소도 다른 칸과 같은 결로 — 큰 테두리 상자 둘 대신 라벨 옆 한 줄.
                  주소는 검색으로만 넣으므로 눌러서 여는 자리글, 상세주소는 그 자리에서 친다. */}
              <div className="admin-form-row" style={{ gridColumn: "1 / -1" }}>
                <label className="admin-form-label">{칸그림("주소")}주소<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                <div className="if-row if-row-plain" style={{ borderBottom: "none", padding: 0 }}>
                  <div className="if-row-body">
                    <div className="if-line">
                      <button type="button" className={`if-slot ${form.address ? "on" : ""}`} onClick={handleAddressSearch}>
                        {form.address || "주소 검색"}{!form.address && <i className="if-req">*</i>}
                      </button>
                      <span className="if-sep">|</span>
                      <InlineText value={form.address_detail} placeholder="동·호수"
                        onSave={(v) => setForm({ ...form, address_detail: v })} />
                    </div>
                  </div>
                  {form.address && (
                    <button className="if-row-del" aria-label="주소 초기화" title="주소 초기화"
                      onClick={handleClearAddress}>
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="admin-form-row">
                <label className="admin-form-label">{칸그림(L.intro)}{L.intro}</label>
                <textarea className="admin-form-textarea" rows={5}
                  placeholder={isStore
                    ? "어떤 매장인지 적어 주세요 — 주 고객층, 시술 강점, 분위기, 직원 구성, 교육·성장 지원처럼"
                    : "어떤 회사인지 적어 주세요 — 무엇을 만드는지, 브랜드, 팀 구성, 일하는 방식, 복지처럼"}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
          </div>
        </div>
      )}

      {(
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
      {/* 주소 검색 레이어 — 닫기 버튼이 있어 언제든 빠져나올 수 있다 */}
      {addrOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}
          onClick={() => setAddrOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 480, height: "min(560px, 85vh)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #f0f0f0", flexShrink: 0 }}>
              <span style={{ fontSize: 15, color: "#222" }}>주소 검색</span>
              <button type="button" onClick={() => setAddrOpen(false)}
                style={{ border: "none", background: "none", fontSize: 22, lineHeight: 1, color: "#999", cursor: "pointer", padding: "0 4px" }} aria-label="닫기">×</button>
            </div>
            <div ref={addrBoxRef} style={{ flex: 1, minHeight: 0 }} />
          </div>
        </div>
      )}
      {cropFile && (
        /* 공고 카드와 같은 3:2 를 권하되 잠그지는 않는다 — 간판 사진은 가로로 길고
           로고는 정사각에 가까워, 억지로 잠그면 꼭 필요한 부분이 잘려 나간다.
           카드에서 가장 크게 보이는 곳이 313px 이라 2배 화면까지 900px 을 권한다. */
        <ImageCropModal file={cropFile}
          guides={[{ key: "3:2", ratio: 3 / 2, note: "공고 카드" }]}
          minLongEdge={900}
          onCancel={() => setCropFile(null)}
          onCropped={handleSignboardCropped} />
      )}
    </CompanyLayout>
  );
}