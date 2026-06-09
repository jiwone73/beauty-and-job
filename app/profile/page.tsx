"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Settings, ChevronRight, Plus, CheckCircle2, X, MapPin, Bell } from "lucide-react";
import RegionSelectModal from "@/components/RegionSelectModal";
import { useSignupStore } from "@/lib/store/signupStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { useProfileStore } from "@/lib/store/profileStore";
import { STORE_SKILL_AREAS } from "@/lib/constants";
import { SIDO_LIST, getSigunguList } from "@/lib/data/regions";
import NotificationModal from "@/components/profile/NotificationModal";


type ModalType = "notification" | null;

const PRESET_SKILL_AREAS: string[] = [...STORE_SKILL_AREAS];
const PRESET_OFFICE_JOB_AREAS = [
  "마케팅", "MD·상품기획", "영업·글로벌", "R&D·연구개발", "디자인·VMD",
  "SCM·물류·구매", "경영·재무·회계", "HR·교육", "IT·데이터",
  "CS·고객경험", "법무·컴플라이언스", "기타",
];

export default function ProfilePage() {
  const router = useRouter();
  const {
    name: signupName, birth, gender, phone,
    skillAreas, workTypePrefer, setStoreProfile,
  } = useSignupStore();

  const [officeJobAreas, setOfficeJobAreas] = useState<string[]>([]);
  const { userName, userPhone } = useAuthStore();
  const name = userName || signupName || "";

  const { setCareerVerified } = useProfileStore();

  const [activeTab, setActiveTab] = useState<"profile" | "resume" | "applied" | "bookmarks">("profile");
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [birthInput, setBirthInput] = useState("");
  const [emailEditInput, setEmailEditInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [dbJobType, setDbJobType] = useState<"OFFICE" | "STORE" | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // 거주지 주소 + 희망 근무지역
  const [addressRoad, setAddressRoad] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [regionSido, setRegionSido] = useState("");
  const [regionSigungu, setRegionSigungu] = useState("");
  const [preferredRegions, setPreferredRegions] = useState<{ sido: string; sigungu: string }[]>([]);
  const [prefSido, setPrefSido] = useState("");
  const [prefSigungu, setPrefSigungu] = useState("");
  const [prefModalOpen, setPrefModalOpen] = useState(false);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const loadNotifs = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/users/me/notifications", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setNotifs(res.data.notifications || []);
          setUnreadNotif(res.data.unread || 0);
        }
      })
      .catch((e) => console.error("[notifs]", e));
  };
  useEffect(() => { loadNotifs(); }, []);

  const handleNotifClick = async (n: any) => {
    const token = localStorage.getItem("access_token");
    if (!n.is_read && token) {
      await fetch(`/api/users/me/notifications/${n.id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    setNotifOpen(false);
    loadNotifs();
    if (n.related_type === "application") setActiveTab("applied");
  };

  const markAllReadNotif = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch("/api/users/me/notifications", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    loadNotifs();
  };
  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch(`/api/users/me/notifications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    loadNotifs();
  };
  const deleteAllNotif = async () => {
    if (!confirm("모든 알림을 삭제할까요?")) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    await fetch("/api/users/me/notifications", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    loadNotifs();
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    useProfileStore.getState().loadFromServer();

    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          if (res.data.job_type) setDbJobType(res.data.job_type);
          if (res.data.email) setEmailInput(res.data.email);
          if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url);
          if (res.data.office_job_areas?.length > 0) {
            setOfficeJobAreas(res.data.office_job_areas);
          }
          if (res.data.address_road) setAddressRoad(res.data.address_road);
          if (res.data.address_detail) setAddressDetail(res.data.address_detail);
          if (res.data.region_sido) setRegionSido(res.data.region_sido);
          if (res.data.region_sigungu) setRegionSigungu(res.data.region_sigungu);
          if (Array.isArray(res.data.preferred_regions)) setPreferredRegions(res.data.preferred_regions);
        }
      })
      .catch(console.error);

    useBookmarkStore.getState().loadFromServer();
  }, []);

  // 공통 PATCH 헬퍼
  const patchUser = async (body: Record<string, any>) => {
    const token = localStorage.getItem("access_token");
    if (!token) return false;
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) { alert(data.error?.message || "저장에 실패했습니다."); return false; }
      return true;
    } catch { alert("네트워크 오류가 발생했습니다."); return false; }
  };

  // 카카오(다음) 우편번호 검색
  const openPostcode = () => {
    const run = () => {
      new (window as any).daum.Postcode({
        oncomplete: async (data: any) => {
          const road = data.roadAddress || data.jibunAddress || data.address || "";
          setAddressRoad(road);
          setRegionSido(data.sido || "");
          setRegionSigungu(data.sigungu || "");
          await patchUser({
            address_road: road,
            region_sido: data.sido || "",
            region_sigungu: data.sigungu || "",
          });
        },
      }).open();
    };
    if ((window as any).daum?.Postcode) { run(); return; }
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = run;
    document.body.appendChild(script);
  };

  // 프로필 → 모달 형식: [{sido,sigungu}] → ["서울특별시 강남구","경기도 전체"]
  const toModalRegions = (regions: { sido: string; sigungu: string }[]) =>
    regions
      .filter((r) => r.sido !== "지역 무관")
      .map((r) => (r.sigungu ? `${r.sido} ${r.sigungu}` : `${r.sido} 전체`));

  // 모달 → 프로필 형식: ["서울특별시 강남구","경기도 전체"] → [{sido,sigungu}]
  const fromModalRegions = (arr: string[]) =>
    arr.map((s) => {
      const lastSpace = s.lastIndexOf(" ");
      const sido = s.slice(0, lastSpace);
      const tail = s.slice(lastSpace + 1);
      return { sido, sigungu: tail === "전체" ? "" : tail };
    });

  // 모달에서 "적용하기" → 프로필 형식으로 저장
  const applyPrefModal = async (modalRegions: string[]) => {
    const next = fromModalRegions(modalRegions);
    setPreferredRegions(next);
    await patchUser({ preferred_regions: next });
  };

  // "지역 무관" 토글
  const toggleAnyRegion = async () => {
    const isAny = preferredRegions.some((r) => r.sido === "지역 무관");
    const next = isAny ? [] : [{ sido: "지역 무관", sigungu: "" }];
    setPreferredRegions(next);
    await patchUser({ preferred_regions: next });
  };

  // 희망 근무지역 추가
  const addPreferredRegion = async () => {
    if (!prefSido) { alert("시/도를 선택해주세요."); return; }
    // 지역 무관: 다른 지역 모두 지우고 이것만 남김
    if (prefSido === "지역 무관") {
      const only = [{ sido: "지역 무관", sigungu: "" }];
      setPreferredRegions(only);
      setPrefSido(""); setPrefSigungu("");
      await patchUser({ preferred_regions: only });
      return;
    }
    const sigungu = prefSido === "세종특별자치시" ? "" : prefSigungu;
    if (prefSido !== "세종특별자치시" && !sigungu) { alert("시/군/구를 선택해주세요."); return; }
    if (preferredRegions.length >= 5) { alert("희망 근무지역은 최대 5개까지 선택할 수 있어요."); return; }
    if (preferredRegions.some((r) => r.sido === prefSido && r.sigungu === sigungu)) {
      alert("이미 추가된 지역이에요."); return;
    }
    // 기존에 "지역 무관"이 있으면 제거하고 구체 지역 추가
    const base = preferredRegions.filter((r) => r.sido !== "지역 무관");
    const next = [...base, { sido: prefSido, sigungu }];
    setPreferredRegions(next);
    setPrefSido(""); setPrefSigungu("");
    await patchUser({ preferred_regions: next });
  };

  const removePreferredRegion = async (idx: number) => {
    const next = preferredRegions.filter((_, i) => i !== idx);
    setPreferredRegions(next);
    await patchUser({ preferred_regions: next });
  };

  const saveOfficeJobAreas = async (newAreas: string[]) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setOfficeJobAreas(newAreas);
    useAuthStore.getState().login({
      ownerType: useAuthStore.getState().ownerType ?? "user",
      userName: useAuthStore.getState().userName,
      userPhone: useAuthStore.getState().userPhone,
      userJobType: useAuthStore.getState().userJobType,
      userJobAreas: newAreas,
    });
    await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ office_job_areas: newAreas }),
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { alert("파일 크기는 1MB 이하여야 합니다."); return; }
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      alert("JPG, PNG, WebP 이미지만 업로드 가능합니다."); return;
    }
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) setAvatarUrl(data.data.avatar_url);
      else alert(data.error?.message || "업로드에 실패했습니다.");
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const handleAvatarDelete = async () => {
    if (!confirm("프로필 사진을 삭제하시겠어요?")) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setAvatarUploading(true);
    try {
      const res = await fetch("/api/users/me/avatar", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAvatarUrl(null);
    } catch (e) {
      console.error(e);
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <main className="profile-page">
      <header className="profile-header">
        <div className="profile-header-inner">
          <Link href="/" className="profile-logo">
            <Image src="/images/logo.png" alt="뷰티앤잡" width={120} height={32} priority />
          </Link>
          <div style={{ position: "relative", display: "inline-flex" }}>
            <button
              className="profile-settings-btn"
              onClick={() => setNotifOpen((v) => !v)}
              aria-label="알림"
            >
              <Bell size={22} />
              {unreadNotif > 0 && <span className="company-notif-badge">{unreadNotif > 9 ? "9+" : unreadNotif}</span>}
            </button>
            {notifOpen && (
              <>
                <div style={{ position: "fixed", inset: 0, zIndex: 90 }} onClick={() => setNotifOpen(false)} />
                <div className="company-notif-dropdown" style={{ left: "auto", right: 0 }}>
                  <div className="company-notif-head">
                    <span>알림</span>
                    <span style={{ display: "flex", gap: 10 }}>
                      {unreadNotif > 0 && <button onClick={markAllReadNotif} className="company-notif-readall">모두 읽음</button>}
                      {notifs.length > 0 && <button onClick={deleteAllNotif} className="company-notif-readall" style={{ color: "#999" }}>전체 삭제</button>}
                    </span>
                  </div>
                  <div className="company-notif-list">
                    {notifs.length === 0 ? (
                      <p className="company-notif-empty">새 알림이 없어요</p>
                    ) : (
                      notifs.map((n) => (
                        <div key={n.id} className={`company-notif-item ${n.is_read ? "" : "unread"}`}
                          onClick={() => handleNotifClick(n)} style={{ position: "relative" }}>
                          <span className="company-notif-title">{n.title}</span>
                          <span className="company-notif-msg">{n.message}</span>
                          <span className="company-notif-time">{new Date(n.created_at).toLocaleDateString("ko-KR")}</span>
                          <button onClick={(e) => deleteNotif(n.id, e)} aria-label="삭제"
                            style={{ position: "absolute", top: 10, right: 10, border: "none", background: "transparent", color: "#bbb", cursor: "pointer", padding: 2, lineHeight: 0 }}>
                            <X size={14} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <button
            className="profile-settings-btn"
            onClick={() => setOpenModal("notification")}
            aria-label="알림 설정"
          >
            <Settings size={22} />
          </button>
        </div>
      </header>

      <div className="profile-tabs">
        <button className={`profile-tab ${activeTab === "profile" ? "active" : ""}`} onClick={() => setActiveTab("profile")}>프로필</button>
        <button className="profile-tab" onClick={() => router.push("/profile/resume")}>이력서</button>
        <button className={`profile-tab ${activeTab === "applied" ? "active" : ""}`} onClick={() => setActiveTab("applied")}>지원현황</button>
        <button className={`profile-tab ${activeTab === "bookmarks" ? "active" : ""}`} onClick={() => setActiveTab("bookmarks")}>관심공고</button>
      </div>

      <div className="profile-content">
        {activeTab === "applied" ? (
          <AppliedTab />
        ) : activeTab === "bookmarks" ? (
          <BookmarksTab />
        ) : activeTab === "profile" ? (
          <>
            {dbJobType && (
              <div style={{ margin: "16px 0", padding: "14px 16px", background: "#fff", border: "1px solid #f0e8f8", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>{dbJobType === "STORE" ? "🏪" : "🏢"}</span>
                  <div>
                    <p style={{ fontSize: "11px", color: "#888", marginBottom: "2px" }}>지금 찾고 있는 채용</p>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
                      {dbJobType === "STORE" ? "매장·샵 채용" : "기업·브랜드 채용"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <section className="profile-section">
              <div className="profile-section-head">
                <h2 className="profile-section-title">기본 정보 <CheckCircle2 size={16} className="profile-check" /></h2>
              </div>
              <div className="profile-info-card">
                <div style={{ padding: "16px 14px", borderBottom: "1px solid #f0e8f8", display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ flexShrink: 0, width: "80px", height: "80px", borderRadius: "50%", background: "#f0e8f8", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", border: "2px solid #ede0f8" }}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="프로필" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "30px", color: "#a888c0" }}>👤</span>
                    )}
                    {avatarUploading && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#5f0080", fontWeight: 600 }}>
                        업로드중
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 6px" }}>{name || "회원"}</p>
                    <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
                      <label style={{ padding: "3px 10px", borderRadius: "6px", border: "1px solid #5f0080", background: "#fff", color: "#5f0080", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                        {avatarUrl ? "변경" : "사진 추가"}
                        <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleAvatarUpload} style={{ display: "none" }} />
                      </label>
                      {avatarUrl && (
                        <button onClick={handleAvatarDelete} style={{ padding: "3px 10px", borderRadius: "6px", border: "1px solid #e0e0e0", background: "#fff", color: "#888", fontSize: "11px", cursor: "pointer" }}>
                          삭제
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: "10px", color: "#aaa", margin: 0 }}>JPG/PNG/WebP, 1MB 이하</p>
                  </div>
                </div>

                <InfoRow label="휴대전화" value={userPhone || phone || "정보 없음"} />

                {editField === "birth" ? (
                  <div className="profile-info-row" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span className="profile-info-label">생년월일</span>
                      <span style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                        <button
                          style={{ padding: "6px 16px", borderRadius: "8px", fontSize: "14px", border: "none", background: "#5f0080", color: "#fff", cursor: "pointer" }}
                          onClick={async () => {
                            if (!/^\d{8}$/.test(birthInput)) { alert("생년월일을 YYYYMMDD 8자리로 입력해주세요. (예: 19900115)"); return; }
                            try {
                              const token = localStorage.getItem("access_token");
                              const res = await fetch("/api/users/me", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ birth: birthInput }),
                              });
                              const data = await res.json();
                              if (!data.success) { alert(data.error?.message || "저장에 실패했습니다."); return; }
                              useSignupStore.getState().setBasic({ birth: birthInput });
                              setEditField(null);
                            } catch { alert("네트워크 오류가 발생했습니다."); }
                          }}>
                          저장
                        </button>
                        <button onClick={() => setEditField(null)}
                          style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "14px", border: "1px solid #ddd", background: "#fff", color: "#999", cursor: "pointer" }}>취소</button>
                      </span>
                    </div>
                    <input
                      type="text" placeholder="YYYYMMDD (예: 19900115)" maxLength={8}
                      value={birthInput}
                      onChange={(e) => setBirthInput(e.target.value.replace(/\D/g, ""))}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px" }}
                    />
                  </div>
                ) : (
                  <InfoRow label="생년월일" value={birth ? `${birth.slice(0, 4)}.${birth.slice(4, 6) || "00"}.${birth.slice(6, 8) || "00"}` : "정보 없음"} isEmpty={!birth} onClick={() => { setBirthInput(birth || ""); setEditField("birth"); }} />
                )}

                {editField === "gender" ? (
                  <div className="profile-info-row is-last" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span className="profile-info-label">성별</span>
                      <button onClick={() => setEditField(null)}
                        style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: "8px", fontSize: "14px", border: "1px solid #ddd", background: "#fff", color: "#999", cursor: "pointer" }}>
                        취소
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {["남성", "여성"].map((g) => (
                        <button key={g}
                          style={{ flex: 1, padding: "10px", borderRadius: "8px", fontSize: "14px", cursor: "pointer", border: gender === g ? "1.5px solid #5f0080" : "1px solid #ddd", background: gender === g ? "#5f0080" : "#fff", color: gender === g ? "#fff" : "#666", fontWeight: gender === g ? 600 : 400 }}
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem("access_token");
                              const res = await fetch("/api/users/me", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ gender: g }),
                              });
                              const data = await res.json();
                              if (!data.success) { alert(data.error?.message || "저장에 실패했습니다."); return; }
                              useSignupStore.getState().setBasic({ gender: g as "남성" | "여성" });
                              setEditField(null);
                            } catch { alert("네트워크 오류가 발생했습니다."); }
                          }}>
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <InfoRow label="성별" value={gender || "정보 없음"} isEmpty={!gender} onClick={() => setEditField("gender")} />
                )}

                {editField === "email" ? (
                  <div className="profile-info-row is-last" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span className="profile-info-label">이메일</span>
                      <span style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                        <button
                          style={{ padding: "6px 16px", borderRadius: "8px", fontSize: "14px", border: "none", background: "#5f0080", color: "#fff", cursor: "pointer" }}
                          onClick={async () => {
                            const val = emailEditInput.trim();
                            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { alert("올바른 이메일 형식을 입력해주세요."); return; }
                            try {
                              const token = localStorage.getItem("access_token");
                              const res = await fetch("/api/users/me", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ email: val }),
                              });
                              const data = await res.json();
                              if (!data.success) { alert(data.error?.message || "저장에 실패했습니다."); return; }
                              setEmailInput(val);
                              setEditField(null);
                            } catch { alert("네트워크 오류가 발생했습니다."); }
                          }}>
                          저장
                        </button>
                        <button onClick={() => setEditField(null)}
                          style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "14px", border: "1px solid #ddd", background: "#fff", color: "#999", cursor: "pointer" }}>취소</button>
                      </span>
                    </div>
                    <input
                      type="email" placeholder="example@email.com"
                      value={emailEditInput}
                      onChange={(e) => setEmailEditInput(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px" }}
                    />
                  </div>
                ) : (
                  <InfoRow label="이메일" value={emailInput || "입력하기"} isEmpty={!emailInput} onClick={() => { setEmailEditInput(emailInput || ""); setEditField("email"); }} isLast />
                )}
              </div>
            </section>

            {/* 거주지 · 희망 근무지역 (OFFICE/STORE 공통) */}
            <section className="profile-section">
              <div className="profile-section-head">
                <h2 className="profile-section-title">거주지 · 희망 근무지역</h2>
              </div>
              <div className="profile-info-card" style={{ padding: "16px" }}>
                <label style={{ fontSize: "13px", fontWeight: 600, color: "#333", display: "block", marginBottom: "8px" }}>거주지 주소</label>
                <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                  <input readOnly value={addressRoad} placeholder="주소 검색을 눌러주세요"
                    onClick={openPostcode}
                    style={{ flex: 1, padding: "10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", background: "#fafafa", cursor: "pointer" }} />
                  <button onClick={openPostcode}
                    style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #5f0080", background: "#5f0080", color: "#fff", fontSize: "14px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                    주소 검색
                  </button>
                </div>
                {addressRoad && (
                  <input value={addressDetail} placeholder="상세주소 (동·호수 등)"
                    onChange={(e) => setAddressDetail(e.target.value)}
                    onBlur={() => patchUser({ address_detail: addressDetail })}
                    style={{ width: "100%", padding: "10px", border: "1px solid #ddd", borderRadius: "8px", fontSize: "14px", marginBottom: "20px", boxSizing: "border-box" }} />
                )}

                <label style={{ fontSize: "13px", fontWeight: 600, color: "#333", display: "block", marginBottom: "4px" }}>
                  희망 근무지역
                </label>
                <p style={{ fontSize: "12px", color: "#aaa", marginBottom: "10px" }}>일하고 싶은 지역을 선택해주세요</p>

                {/* 지역 무관 체크 */}
                <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", cursor: "pointer", fontSize: "14px", color: "#333" }}>
                  <input type="checkbox"
                    checked={preferredRegions.some((r) => r.sido === "지역 무관")}
                    onChange={toggleAnyRegion}
                    style={{ width: "16px", height: "16px", accentColor: "#5f0080", cursor: "pointer" }} />
                  지역 무관 (전국 어디든 좋아요)
                </label>

                {/* 지역 선택 버튼 (지역 무관이면 비활성) */}
                {!preferredRegions.some((r) => r.sido === "지역 무관") && (
                  <>
                    <button onClick={() => setPrefModalOpen(true)}
                      style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 14px", borderRadius: "8px", border: "1px solid #5f0080", background: "#fff", color: "#5f0080", fontSize: "14px", fontWeight: 600, cursor: "pointer", marginBottom: "10px" }}>
                      <MapPin size={15} /> 지역 선택
                    </button>
                    {preferredRegions.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {preferredRegions.map((r, i) => (
                          <span key={`${r.sido}-${r.sigungu}-${i}`}
                            style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 8px 6px 12px", borderRadius: "20px", background: "#f3e5f5", color: "#5f0080", fontSize: "13px", fontWeight: 600 }}>
                            {r.sigungu ? `${r.sido} ${r.sigungu}` : `${r.sido} 전체`}
                            <button onClick={() => removePreferredRegion(i)}
                              style={{ display: "flex", border: "none", background: "transparent", color: "#5f0080", cursor: "pointer", padding: 0 }}
                              aria-label="삭제">
                              <X size={14} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </section>

            <RegionSelectModal
              open={prefModalOpen}
              initial={toModalRegions(preferredRegions)}
              onClose={() => setPrefModalOpen(false)}
              onApply={applyPrefModal}
            />

            {dbJobType === "OFFICE" && (
              <section className="profile-section">
                <div className="profile-section-head">
                  <h2 className="profile-section-title">직군 영역</h2>
                </div>
                <div className="profile-info-card" style={{ padding: "16px" }}>
                  <p style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>해당하는 직군 영역을 선택해 주세요 (1~3개 권장)</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                    {PRESET_OFFICE_JOB_AREAS.map((area) => (
                      <button key={area}
                        onClick={() => saveOfficeJobAreas(officeJobAreas.includes(area) ? officeJobAreas.filter(a => a !== area) : [...officeJobAreas, area])}
                        style={{ padding: "6px 14px", borderRadius: "20px", border: `1.5px solid ${officeJobAreas.includes(area) ? "#5f0080" : "#e0e0e0"}`, background: officeJobAreas.includes(area) ? "#f3e5f5" : "#fff", color: officeJobAreas.includes(area) ? "#5f0080" : "#888", fontSize: "13px", fontWeight: officeJobAreas.includes(area) ? 600 : 400, cursor: "pointer" }}>
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {dbJobType === "STORE" && (
              <section className="profile-section">
                <div className="profile-section-head">
                  <h2 className="profile-section-title">시술 분야 · 전문 영역</h2>
                </div>
                <div className="profile-info-card" style={{ padding: "16px" }}>
                  <p style={{ fontSize: "13px", color: "#888", marginBottom: "12px" }}>해당하는 시술 분야를 선택해 주세요</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                    {PRESET_SKILL_AREAS.map((area) => (
                      <button key={area}
                        onClick={() => setStoreProfile({ skillAreas: skillAreas.includes(area) ? skillAreas.filter(a => a !== area) : [...skillAreas, area] })}
                        style={{ padding: "6px 14px", borderRadius: "20px", border: `1.5px solid ${skillAreas.includes(area) ? "#5f0080" : "#e0e0e0"}`, background: skillAreas.includes(area) ? "#f3e5f5" : "#fff", color: skillAreas.includes(area) ? "#5f0080" : "#888", fontSize: "13px", fontWeight: skillAreas.includes(area) ? 600 : 400, cursor: "pointer" }}>
                        {area}
                      </button>
                    ))}
                  </div>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#333", display: "block", marginBottom: "6px" }}>희망 근무 형태</label>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {["풀타임", "파트타임", "주말근무 가능", "시급"].map((w) => (
                      <button key={w}
                        onClick={() => setStoreProfile({ workTypePrefer: workTypePrefer === w ? "" : w })}
                        style={{ padding: "6px 14px", borderRadius: "20px", border: `1.5px solid ${workTypePrefer === w ? "#5f0080" : "#e0e0e0"}`, background: workTypePrefer === w ? "#f3e5f5" : "#fff", color: workTypePrefer === w ? "#5f0080" : "#888", fontSize: "13px", fontWeight: workTypePrefer === w ? 600 : 400, cursor: "pointer" }}>
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            )}
            <div className="profile-bottom-cta">
              <button className="profile-resume-btn" onClick={() => router.push("/profile/resume")}>
                현재 프로필로 이력서 만들기
              </button>
            </div>
          </>
        ) : null}
      </div>

      <NotificationModal isOpen={openModal === "notification"} onClose={() => setOpenModal(null)} />
    </main>
  );
}

function InfoRow({ label, value, isEmpty, isLast, onClick }: {
  label: string; value: string; isEmpty?: boolean; isLast?: boolean; onClick?: () => void;
}) {
  return (
    <button className={`profile-info-row ${isLast ? "is-last" : ""}`} onClick={onClick} disabled={!onClick}>
      <span className="profile-info-label">{label}</span>
      <span className={`profile-info-value ${isEmpty ? "is-empty" : ""}`}>{value}</span>
      <ChevronRight size={16} className="profile-info-chevron" />
    </button>
  );
}

function AppliedTab() {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    fetch("/api/users/me/applications", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setApps(res.data || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusLabel: Record<string, string> = {
    APPLIED: "서류검토중", REVIEWING: "서류검토중", PASSED: "합격", REJECTED: "불합격", INTERVIEW: "면접예정",
  };
  const statusStyle: Record<string, string> = {
    APPLIED: "applied-status-review", REVIEWING: "applied-status-review", PASSED: "applied-status-pass",
    REJECTED: "applied-status-fail", INTERVIEW: "applied-status-interview",
  };

  if (loading) return <div className="profile-empty-tab"><p style={{ color: "#888", padding: "40px 0" }}>불러오는 중...</p></div>;
  if (apps.length === 0) return (
    <div className="profile-empty-tab">
      <div className="profile-empty-icon">📋</div>
      <p>아직 지원한 공고가 없어요</p>
      <a href="/jobs" className="profile-empty-btn">채용공고 보러가기</a>
    </div>
  );

  return (
    <div className="profile-tab-content">
      <div className="applied-list">
        {apps.map((app) => {
          const date = new Date(app.applied_at);
          const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
          return (
            <div key={app.id} className="applied-item">
              <div className="applied-item-left">
                <span className="applied-brand">{app.brand_name || app.company_name}</span>
                <h3 className="applied-title">{app.job_title}</h3>
                <span className="applied-date">지원일 {dateStr}</span>
              </div>
              <span className={`applied-status ${statusStyle[app.status] || "applied-status-review"}`}>
                {statusLabel[app.status] || app.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookmarksTab() {
  const [bookmarkedJobs, setBookmarkedJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    fetch("/api/users/me/bookmarks", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setBookmarkedJobs(res.data || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const formatDeadline = (deadline: string | null) => {
    if (!deadline) return "상시";
    const today = new Date();
    const dl = new Date(deadline);
    const dDay = Math.ceil((dl.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (dDay < 0) return "마감";
    if (dDay === 0) return "오늘 마감";
    return `D-${dDay}`;
  };

  if (loading) return <div className="profile-empty-tab"><p style={{ color: "#888", padding: "40px 0" }}>불러오는 중...</p></div>;
  if (bookmarkedJobs.length === 0) return (
    <div className="profile-empty-tab">
      <div className="profile-empty-icon">🔖</div>
      <p>저장한 공고가 없어요<br />관심있는 공고를 북마크해보세요</p>
      <a href="/jobs" className="profile-empty-btn">채용공고 보러가기</a>
    </div>
  );

  return (
    <div className="profile-tab-content">
      <div className="bookmark-list">
        {bookmarkedJobs.map((job) => (
          <a key={job.id} href={`/jobs/${job.job_posting_id}`} className="bookmark-item">
            <div className="bookmark-item-left">
              <span className="bookmark-brand">{job.brand_name || job.company_name}</span>
              <h3 className="bookmark-title">{job.title}</h3>
              <span className="bookmark-location">📍 {job.location || "협의"}</span>
            </div>
            <span className="bookmark-deadline">{formatDeadline(job.deadline)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
