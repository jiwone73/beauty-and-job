"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Settings, ChevronRight, Plus, CheckCircle2, X, MapPin, Bell, MoreHorizontal } from "lucide-react";
import RegionSelectModal from "@/components/RegionSelectModal";
import { useSignupStore } from "@/lib/store/signupStore";
import { useAuthStore } from "@/lib/store/authStore";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { shortRegion } from "@/lib/regionShort";
import { useProfileStore } from "@/lib/store/profileStore";
import JobGroupSelectModal from "@/components/JobGroupSelectModal";
import { SIDO_LIST, getSigunguList } from "@/lib/data/regions";
import NotificationModal from "@/components/profile/NotificationModal";
import CompanyBlockModal from "@/components/CompanyBlockModal";
import MyApplicationModal from "@/components/profile/MyApplicationModal";
import JobSearchCertificateModal from "@/components/profile/JobSearchCertificateModal";
import JobPostingCertificateModal from "@/components/profile/JobPostingCertificateModal";
import { validateBirth } from "@/lib/validateBirth";


type ModalType = "notification" | null;

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
  // URL ?tab= 으로 진입 시 해당 탭 활성화 (이력서 → 지원현황/관심공고 이동용)
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "applied" || t === "bookmarks" || t === "profile") setActiveTab(t);
  }, []);
  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    if (tab === "applied" || tab === "bookmarks" || tab === "profile") setActiveTab(tab as any);
  }, []);
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [editField, setEditField] = useState<string | null>(null);
  const [birthInput, setBirthInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [phoneOverride, setPhoneOverride] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState("");
  const formatPhone = (v: string) => {
    const d = (v || "").replace(/\D/g, "");
    if (d.length === 11) return d.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
    if (d.length === 10) return d.replace(/(\d{3})(\d{3})(\d{4})/, "$1-$2-$3");
    return d;
  };
  const [emailEditInput, setEmailEditInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailMsg, setEmailMsg] = useState("");
  const [isKakao, setIsKakao] = useState(false);
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
  const [jobAreaModal, setJobAreaModal] = useState<null | "OFFICE" | "STORE">(null);
  const [notifs, setNotifs] = useState<any[]>([]);
  const [unreadNotif, setUnreadNotif] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);

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

  // 카카오 재인증 이메일 변경 결과 처리
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("email_changed")) {
      alert("이메일이 변경되었습니다.");
      const token = localStorage.getItem("access_token");
      fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((res) => { if (res.success && res.data.email) setEmailInput(res.data.email); })
        .catch(() => {});
      window.history.replaceState({}, "", "/profile");
    } else if (sp.get("email_error")) {
      alert("이메일 변경에 실패했어요. (" + sp.get("email_error") + ") 다시 시도해주세요.");
      window.history.replaceState({}, "", "/profile");
    }
  }, []);

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
          setIsKakao(!!res.data.is_kakao);
          if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url);
          if (res.data.office_job_areas?.length > 0) {
            setOfficeJobAreas(res.data.office_job_areas);
          }
          if (res.data.address_road) setAddressRoad(res.data.address_road);
          if (res.data.address_detail) setAddressDetail(res.data.address_detail);
          if (res.data.region_sido) setRegionSido(res.data.region_sido);
          if (res.data.region_sigungu) setRegionSigungu(res.data.region_sigungu);
          if (Array.isArray(res.data.preferred_regions)) setPreferredRegions(res.data.preferred_regions);
          // 생년월일/성별 DB값을 signup store에 복원 (새로고침해도 표시 유지)
          useSignupStore.getState().setBasic({
            birth: (res.data.birth_date || "").split("T")[0].replace(/-/g, ""),
            gender: (res.data.gender || "") as "남성" | "여성",
          });
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

  // 카카오(다음) 우편번호 검색 — embed 방식 (웹뷰 호환, 닫기 버튼 직접 제공)
  const postcodeLayerRef = useRef<HTMLDivElement>(null);
  const [postcodeOpen, setPostcodeOpen] = useState(false);
  const openPostcode = () => {
    const run = () => setPostcodeOpen(true);
    if ((window as any).daum?.Postcode) { run(); return; }
    const script = document.createElement("script");
    script.src = "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = run;
    document.body.appendChild(script);
  };
  const closePostcode = () => setPostcodeOpen(false);
  const handleClearAddress = async () => {
    if (!confirm("거주지 주소를 초기화할까요?")) return;
    setAddressRoad("");
    setAddressDetail("");
    setRegionSido("");
    setRegionSigungu("");
    await patchUser({ address_road: null, address_detail: null, region_sido: null, region_sigungu: null });
  };
  // 다음 우편번호 시/도(예: "서울") → 표준 명칭("서울특별시") 변환
  const toCanonicalSido = (raw: string): string => {
    if (!raw) return "";
    if (SIDO_LIST.includes(raw)) return raw;
    const alias: Record<string, string> = {
      서울: "서울특별시", 부산: "부산광역시", 대구: "대구광역시", 인천: "인천광역시",
      광주: "광주광역시", 대전: "대전광역시", 울산: "울산광역시", 세종: "세종특별자치시",
      경기: "경기도", 강원: "강원특별자치도", 충북: "충청북도", 충남: "충청남도",
      전북: "전북특별자치도", 전남: "전라남도", 경북: "경상북도", 경남: "경상남도", 제주: "제주특별자치도",
    };
    return alias[raw] || SIDO_LIST.find((s) => s.startsWith(raw)) || raw;
  };

  // 표시용 시/도 축약 (서울특별시 → 서울, 경기도 → 경기 …)
  const shortSido = (sido: string): string => {
    const map: Record<string, string> = {
      서울특별시: "서울", 부산광역시: "부산", 대구광역시: "대구", 인천광역시: "인천",
      광주광역시: "광주", 대전광역시: "대전", 울산광역시: "울산", 세종특별자치시: "세종",
      경기도: "경기", 강원특별자치도: "강원", 충청북도: "충북", 충청남도: "충남",
      전북특별자치도: "전북", 전라남도: "전남", 경상북도: "경북", 경상남도: "경남", 제주특별자치도: "제주",
    };
    return map[sido] || sido;
  };

  useEffect(() => {
    if (!postcodeOpen || !postcodeLayerRef.current) return;
    postcodeLayerRef.current.innerHTML = "";
    new (window as any).daum.Postcode({
      oncomplete: async (data: any) => {
        const base = data.roadAddress || data.jibunAddress || data.address || "";
        const road = data.buildingName ? `${base} (${data.buildingName})` : base;
        setAddressRoad(road);
        setRegionSido(data.sido || "");
        setRegionSigungu(data.sigungu || "");
        await patchUser({
          address_road: road,
          region_sido: data.sido || "",
          region_sigungu: data.sigungu || "",
        });
        // 희망 근무지역이 비어 있으면 거주지 기준으로 자동 채움 (기존 선택은 유지)
        const canonSido = toCanonicalSido(data.sido || "");
        if (canonSido && preferredRegions.length === 0) {
          const next = [{ sido: canonSido, sigungu: data.sigungu || "" }];
          setPreferredRegions(next);
          await patchUser({ preferred_regions: next });
        }
        setPostcodeOpen(false);
      },
      width: "100%",
      height: "100%",
    }).embed(postcodeLayerRef.current);
  }, [postcodeOpen]);

  // 거주지는 있는데 희망 근무지역이 비어 있으면 페이지 로드 시 자동 채움 (1회)
  const autoFilledPrefRef = useRef(false);
  useEffect(() => {
    if (autoFilledPrefRef.current) return;
    if (regionSido && preferredRegions.length === 0) {
      const canonSido = toCanonicalSido(regionSido);
      if (!canonSido) return;
      autoFilledPrefRef.current = true;
      const next = [{ sido: canonSido, sigungu: regionSigungu || "" }];
      setPreferredRegions(next);
      patchUser({ preferred_regions: next });
    }
  }, [regionSido, regionSigungu, preferredRegions]);

  // 프로필 → 모달 형식: [{sido,sigungu}] → ["서울특별시 강남구","경기도 전체"]
  const toModalRegions = (regions: { sido: string; sigungu: string }[]) =>
    regions.map((r) => (r.sigungu ? `${r.sido} ${r.sigungu}` : `${r.sido} 전체`));

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

  // 이력서 작성 전 필수항목 판정 (프로필의 모든 항목이 필수)
  const missingRequired: string[] = [];
  if (!avatarUrl) missingRequired.push("프로필 사진");
  if (!(phoneOverride || userPhone || phone)) missingRequired.push("휴대전화");
  if (!birth) missingRequired.push("생년월일");
  if (!gender) missingRequired.push("성별");
  if (!emailInput) missingRequired.push("이메일");
  if (!addressRoad) missingRequired.push("거주지");
  if (dbJobType === "OFFICE" && officeJobAreas.length === 0) missingRequired.push("직군 영역");
  if (dbJobType === "STORE" && skillAreas.length === 0) missingRequired.push("시술 분야");
  if (dbJobType === "STORE" && !workTypePrefer) missingRequired.push("희망 근무 형태");
  if (!preferredRegions || preferredRegions.length === 0) missingRequired.push("희망 근무지역");

  // 직군/지역 한 줄 요약값
  const jobAreaSummary = (arr: string[]) =>
    arr.length ? (arr.length > 1 ? `${arr[0]} 외 ${arr.length - 1}` : arr[0]) : "선택해주세요";
  const anyRegion = preferredRegions.some((r) => r.sido === "지역 무관");
  const regionSummary = anyRegion
    ? "지역 무관 (전국 어디든)"
    : preferredRegions.length
      ? `${shortSido(preferredRegions[0].sido)} ${preferredRegions[0].sigungu || "전체"}${preferredRegions.length > 1 ? ` 외 ${preferredRegions.length - 1}` : ""}`
      : "선택해주세요";

  // 이력서로 이동 (필수항목 미완성 시 안내 후 프로필에 머무름)
  const changeEmail = async () => {
    if (!newEmailInput.trim()) { alert("새 이메일을 입력해주세요."); return; }
    if (!emailPw.trim()) { alert("현재 비밀번호를 입력해주세요."); return; }
    const token = localStorage.getItem("access_token");
    setEmailBusy(true); setEmailMsg("");
    try {
      const r = await fetch("/api/users/me/email/change", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_email: newEmailInput.trim(), password: emailPw }),
      });
      const res = await r.json();
      if (res.success) {
        setEmailInput(res.data.email);
        setShowEmailModal(false);
        alert("이메일이 변경되었습니다.");
      } else {
        setEmailMsg(res.error?.message || "변경에 실패했습니다.");
      }
    } catch { setEmailMsg("오류가 발생했습니다."); }
    finally { setEmailBusy(false); }
  };

  const startKakaoReauth = async () => {
    const token = localStorage.getItem("access_token");
    setEmailBusy(true); setEmailMsg("");
    try {
      const r = await fetch("/api/users/me/email/kakao-start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const res = await r.json();
      if (res.success && res.data?.authorize_url) {
        window.location.href = res.data.authorize_url; // 카카오로 이동 (돌아오면 콜백이 처리)
      } else {
        setEmailMsg(res.error?.message || "카카오 인증을 시작할 수 없습니다.");
        setEmailBusy(false);
      }
    } catch {
      setEmailMsg("오류가 발생했습니다.");
      setEmailBusy(false);
    }
  };

  const goToResume = () => {
    if (missingRequired.length > 0) {
      alert(
        `이력서를 작성하려면 프로필 필수항목을 먼저 완성해 주세요.\n\n[미입력 항목]\n· ${missingRequired.join("\n· ")}`
      );
      setActiveTab("profile");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.push("/profile/resume");
  };

  return (
    <main className="profile-page">
      <header className="profile-header">
        <div className="profile-header-inner">
          <Link href="/" className="profile-logo">
            <Image src="/images/logo.png" alt="뷰티워크" width={124} height={32} priority />
          </Link>

          <Link href="/jobs" className="profile-header-nav">채용공고</Link>
          <div style={{ position: "relative", display: "inline-flex", marginLeft: "auto" }}>
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
        <button className="profile-tab" onClick={goToResume}>이력서</button>
        <button className={`profile-tab ${activeTab === "applied" ? "active" : ""}`} onClick={() => setActiveTab("applied")}>지원현황</button>
        <button className={`profile-tab ${activeTab === "bookmarks" ? "active" : ""}`} onClick={() => setActiveTab("bookmarks")}>관심공고</button>
      </div>

      <div className="profile-content">
        {activeTab === "applied" ? (
          <AppliedTab userName={name} />
        ) : activeTab === "bookmarks" ? (
          <BookmarksTab />
        ) : activeTab === "profile" ? (
          <>
            {dbJobType && (
              <div style={{ margin: "16px 0", padding: "14px 16px", background: "#fff", border: "1px solid #e0d0f0", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "20px" }}>{dbJobType === "STORE" ? "🏪" : "🏢"}</span>
                  <div>
                    <p style={{ fontSize: "11px", color: "#888", marginBottom: "2px" }}>지금 찾고 있는 채용</p>
                    <p style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>
                      {dbJobType === "STORE" ? "매장직" : "사무직"}
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
                <div style={{ padding: "16px 14px", borderBottom: "1px solid #e0d0f0", display: "flex", alignItems: "center", gap: "14px" }}>
                  <div style={{ flexShrink: 0, position: "relative" }}>
                    <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#f0e8f8", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", border: "2px solid #e0d0f0" }}>
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
                    <span style={{ position: "absolute", top: "3px", right: "1px", color: "#e74c3c", fontSize: "14px", lineHeight: 1, zIndex: 2 }}>*</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 6px" }}>{name || "회원"}</p>
                    <div style={{ display: "flex", gap: "6px", marginBottom: "4px" }}>
                      <label style={{ padding: "3px 10px", borderRadius: "6px", border: "1px solid #e0d0f0", background: "#fff", color: "#333", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                        {avatarUrl ? "변경" : "사진 추가"}
                        <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleAvatarUpload} style={{ display: "none" }} />
                      </label>
                      {avatarUrl && (
                        <button onClick={handleAvatarDelete} style={{ padding: "3px 10px", borderRadius: "6px", border: "1px solid #e0d0f0", background: "#fff", color: "#333", fontSize: "11px", cursor: "pointer" }}>
                          삭제
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: "10px", color: "#aaa", margin: 0 }}>JPG/PNG/WebP, 1MB 이하</p>
                  </div>
                </div>

                {editField === "phone" ? (
                  <div className="profile-info-row" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span className="profile-info-label">휴대전화<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></span>
                      <span style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                        <button
                          style={{ padding: "6px 16px", borderRadius: "8px", fontSize: "14px", border: "none", background: phoneVerified ? "#5f0080" : "#e0e0e0", color: phoneVerified ? "#fff" : "#9a9a9a", cursor: phoneVerified ? "pointer" : "not-allowed" }}
                          disabled={!phoneVerified}
                          onClick={async () => {
                            const d = phoneInput.replace(/\D/g, "");
                            if (!phoneVerified) { alert("휴대폰 인증을 완료해주세요."); return; }
                            try {
                              const token = localStorage.getItem("access_token");
                              const res = await fetch("/api/users/me", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                                body: JSON.stringify({ phone: d }),
                              });
                              const data = await res.json();
                              if (!data.success) { alert(data.error?.message || "저장에 실패했습니다."); return; }
                              setPhoneOverride(d);
                              setEditField(null);
                              setPhoneCode(""); setPhoneCodeSent(false); setPhoneVerified(false); setPhoneMsg("");
                            } catch { alert("네트워크 오류가 발생했습니다."); }
                          }}>
                          저장
                        </button>
                        <button onClick={() => { setEditField(null); setPhoneCode(""); setPhoneCodeSent(false); setPhoneVerified(false); setPhoneMsg(""); }}
                          style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "14px", border: "1px solid #e0d0f0", background: "#fff", color: "#333", cursor: "pointer" }}>취소</button>
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="tel" inputMode="numeric" placeholder="010-0000-0000" maxLength={13}
                        value={formatPhone(phoneInput)}
                        disabled={phoneVerified}
                        onChange={(e) => { setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 11)); setPhoneVerified(false); setPhoneCodeSent(false); }}
                        style={{ flex: 1, minWidth: 0, padding: "8px 10px", border: "1px solid #e0d0f0", borderRadius: "8px", fontSize: "14px", background: phoneVerified ? "#f5f5f5" : "#fff" }}
                      />
                      <button
                        disabled={phoneSending || phoneVerified || phoneInput.replace(/\D/g, "").length < 10}
                        onClick={async () => {
                          const d = phoneInput.replace(/\D/g, "");
                          setPhoneSending(true); setPhoneMsg("");
                          try {
                            const res = await fetch("/api/auth/phone/send", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ phone: d, purpose: "signup" }),
                            });
                            const data = await res.json();
                            if (!data.success) { setPhoneMsg(data.error?.message || "전송에 실패했습니다."); return; }
                            setPhoneCodeSent(true);
                            setPhoneMsg(data.data?.dev_code ? `인증번호를 전송했어요. (테스트: ${data.data.dev_code})` : "인증번호를 전송했어요.");
                          } catch { setPhoneMsg("네트워크 오류가 발생했습니다."); }
                          finally { setPhoneSending(false); }
                        }}
                        style={{ padding: "0 14px", height: "38px", whiteSpace: "nowrap", borderRadius: "8px", fontSize: "13px", fontWeight: 600, border: "1px solid #5f0080", background: "#fff", color: "#5f0080", cursor: "pointer", opacity: (phoneVerified || phoneInput.replace(/\D/g, "").length < 10) ? 0.4 : 1 }}>
                        {phoneVerified ? "인증완료" : phoneCodeSent ? "재전송" : phoneSending ? "전송중" : "인증번호 받기"}
                      </button>
                    </div>
                    {phoneCodeSent && !phoneVerified && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="tel" inputMode="numeric" placeholder="인증번호 6자리" maxLength={6}
                          value={phoneCode}
                          onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          style={{ flex: 1, minWidth: 0, padding: "8px 10px", border: "1px solid #e0d0f0", borderRadius: "8px", fontSize: "14px" }}
                        />
                        <button
                          disabled={phoneVerifying || phoneCode.length < 6}
                          onClick={async () => {
                            const d = phoneInput.replace(/\D/g, "");
                            setPhoneVerifying(true); setPhoneMsg("");
                            try {
                              const res = await fetch("/api/auth/phone/verify", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ phone: d, code: phoneCode, purpose: "signup" }),
                              });
                              const data = await res.json();
                              if (!data.success) { setPhoneMsg(data.error?.message || "인증에 실패했습니다."); return; }
                              setPhoneVerified(true);
                              setPhoneMsg("휴대폰 인증이 완료됐어요.");
                            } catch { setPhoneMsg("네트워크 오류가 발생했습니다."); }
                            finally { setPhoneVerifying(false); }
                          }}
                          style={{ padding: "0 14px", height: "38px", whiteSpace: "nowrap", borderRadius: "8px", fontSize: "13px", fontWeight: 600, border: "none", background: "#5f0080", color: "#fff", cursor: "pointer", opacity: phoneCode.length < 6 ? 0.4 : 1 }}>
                          확인
                        </button>
                      </div>
                    )}
                    {phoneMsg && (
                      <p style={{ fontSize: "12px", margin: 0, color: phoneVerified ? "#10b981" : "#9a9a9a" }}>{phoneMsg}</p>
                    )}
                  </div>
                ) : (
                  <InfoRow label="휴대전화" value={formatPhone(phoneOverride || userPhone || phone || "") || "정보 없음"} isEmpty={!(phoneOverride || userPhone || phone)} onClick={() => { setPhoneInput((phoneOverride || userPhone || phone || "").replace(/\D/g, "")); setPhoneCode(""); setPhoneCodeSent(false); setPhoneVerified(false); setPhoneMsg(""); setEditField("phone"); }} required />
                )}

                {editField === "birth" ? (
                  <div className="profile-info-row" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span className="profile-info-label">생년월일<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></span>
                      <span style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                        <button
                          style={{ padding: "6px 16px", borderRadius: "8px", fontSize: "14px", border: "none", background: "#5f0080", color: "#fff", cursor: "pointer" }}
                          onClick={async () => {
                            const birthCheck = validateBirth(birthInput);
                            if (!birthCheck.ok) { alert(birthCheck.message); return; }
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
                          style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "14px", border: "1px solid #e0d0f0", background: "#fff", color: "#333", cursor: "pointer" }}>취소</button>
                      </span>
                    </div>
                    <input
                      type="text" placeholder="YYYYMMDD (예: 19900115)" maxLength={8}
                      value={birthInput}
                      onChange={(e) => setBirthInput(e.target.value.replace(/\D/g, ""))}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #e0d0f0", borderRadius: "8px", fontSize: "14px" }}
                    />
                  </div>
                ) : (
                  <InfoRow label="생년월일" value={birth ? `${birth.slice(0, 4)}.${birth.slice(4, 6) || "00"}.${birth.slice(6, 8) || "00"}` : "정보 없음"} isEmpty={!birth} onClick={() => { setBirthInput(birth || ""); setEditField("birth"); }} required />
                )}

                {editField === "gender" ? (
                  <div className="profile-info-row is-last" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span className="profile-info-label">성별<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></span>
                      <button onClick={() => setEditField(null)}
                        style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: "8px", fontSize: "14px", border: "1px solid #e0d0f0", background: "#fff", color: "#333", cursor: "pointer" }}>
                        취소
                      </button>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {["남성", "여성"].map((g) => (
                        <button key={g}
                          style={{ flex: 1, padding: "10px", borderRadius: "8px", fontSize: "14px", cursor: "pointer", border: gender === g ? "1.5px solid #5f0080" : "1px solid #e0d0f0", background: gender === g ? "#5f0080" : "#fff", color: gender === g ? "#fff" : "#333", fontWeight: gender === g ? 600 : 400 }}
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
                  <InfoRow label="성별" value={gender || "정보 없음"} isEmpty={!gender} onClick={() => setEditField("gender")} required />
                )}

                {editField === "email" ? (
                  <div className="profile-info-row is-last" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span className="profile-info-label">이메일<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></span>
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
                          style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "14px", border: "1px solid #e0d0f0", background: "#fff", color: "#333", cursor: "pointer" }}>취소</button>
                      </span>
                    </div>
                    <input
                      type="email" placeholder="example@email.com"
                      value={emailEditInput}
                      onChange={(e) => setEmailEditInput(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #e0d0f0", borderRadius: "8px", fontSize: "14px" }}
                    />
                  </div>
                ) : (
                  <InfoRow label="이메일" value={emailInput || "입력하기"} isEmpty={!emailInput} onClick={() => { setNewEmailInput(""); setEmailPw(""); setEmailMsg(""); setShowEmailModal(true); }} isLast required />
                )}
              </div>
            </section>


            {/* 거주지 (기본정보 하위) */}
            <section className="profile-section" style={{ marginTop: 0 }}>
              <div className="profile-info-card" style={{ padding: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                  <label style={{ fontSize: "13px", color: "var(--color-text-mute)" }}>거주지 주소<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                  {addressRoad && (
                    <button type="button" onClick={handleClearAddress}
                      style={{ fontSize: "12px", color: "#999", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", textDecoration: "underline" }}>
                      초기화
                    </button>
                  )}
                </div>
                <div style={{ marginBottom: "8px" }}>
                  <input readOnly value={addressRoad} placeholder="터치하여 주소를 검색해주세요"
                    onClick={openPostcode}
                    style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", border: "1px solid #e0d0f0", borderRadius: "8px", fontSize: "14px", background: "#fafafa", cursor: "pointer" }} />
                </div>
                {postcodeOpen && (
                  <div className="postcode-modal-overlay">
                    <div className="postcode-modal" onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", alignItems: "center", height: "52px", padding: "0 12px", borderBottom: "1px solid #eee", flexShrink: 0 }}>
                        <button onClick={closePostcode} aria-label="뒤로가기"
                          style={{ border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", padding: "8px", marginLeft: "-8px" }}>
                          <ChevronRight size={22} style={{ transform: "rotate(180deg)" }} />
                        </button>
                        <span style={{ fontSize: "16px", fontWeight: 600, marginLeft: "4px" }}>주소 검색</span>
                      </div>
                      <div ref={postcodeLayerRef} style={{ flex: 1, overflow: "hidden" }} />
                    </div>
                  </div>
                )}
                {addressRoad && (
                  <input value={addressDetail} placeholder="상세주소 (동·호수 등)"
                    onChange={(e) => setAddressDetail(e.target.value)}
                    onBlur={() => patchUser({ address_detail: addressDetail })}
                    style={{ width: "100%", padding: "10px", border: "1px solid #e0d0f0", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }} />
                )}
              </div>
            </section>

            {/* 직무·희망 조건 — 기본 정보에 이어 한 줄씩 */}
            <section className="profile-section" style={{ marginTop: 0 }}>
              <div className="profile-info-card">
                {dbJobType === "OFFICE" && (
                  <InfoRow
                    label="직군 영역"
                    value={jobAreaSummary(officeJobAreas)}
                    isEmpty={officeJobAreas.length === 0}
                    onClick={() => setJobAreaModal("OFFICE")}
                    required
                  />
                )}
                {dbJobType === "STORE" && (
                  <>
                    <InfoRow
                      label="시술 분야"
                      value={jobAreaSummary(skillAreas)}
                      isEmpty={skillAreas.length === 0}
                      onClick={() => setJobAreaModal("STORE")}
                      required
                    />
                    <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--color-border)" }}>
                      <div style={{ fontSize: "13px", color: "var(--color-text-mute)", marginBottom: "8px" }}>희망 근무 형태<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></div>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        {["풀타임", "파트타임", "주말근무 가능", "시급"].map((w) => (
                          <button key={w}
                            onClick={() => setStoreProfile({ workTypePrefer: workTypePrefer === w ? "" : w })}
                            style={{ padding: "6px 14px", borderRadius: "20px", border: `1.5px solid ${workTypePrefer === w ? "#5f0080" : "#e0d0f0"}`, background: workTypePrefer === w ? "#f3e5f5" : "#fff", color: workTypePrefer === w ? "#5f0080" : "#333", fontSize: "13px", fontWeight: workTypePrefer === w ? 600 : 400, cursor: "pointer" }}>
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <InfoRow
                  label="희망 근무지역"
                  value={regionSummary}
                  isEmpty={preferredRegions.length === 0}
                  onClick={() => setPrefModalOpen(true)}
                  isLast
                  required
                />
              </div>
            </section>

            <RegionSelectModal
              open={prefModalOpen}
              initial={toModalRegions(preferredRegions)}
              onClose={() => setPrefModalOpen(false)}
              onApply={applyPrefModal}
              allowAny
            />
            <JobGroupSelectModal
              open={jobAreaModal !== null}
              jobType={jobAreaModal ?? "OFFICE"}
              selected={jobAreaModal === "STORE" ? skillAreas : officeJobAreas}
              onChange={jobAreaModal === "STORE" ? (v: string[]) => setStoreProfile({ skillAreas: v }) : saveOfficeJobAreas}
              onClose={() => setJobAreaModal(null)}
            />
            <div className="profile-bottom-cta">
              <button className="resume-save-btn-full" onClick={goToResume}>
                현재 프로필로 이력서 만들기
              </button>
            </div>
          </>
        ) : null}
      </div>

      <NotificationModal isOpen={openModal === "notification"} onClose={() => setOpenModal(null)} onOpenBlockModal={() => setShowBlockModal(true)} />
      <CompanyBlockModal open={showBlockModal} onClose={() => setShowBlockModal(false)} />

      {showEmailModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 400, width: "100%" }}>
            <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 16px" }}>이메일 변경</h3>
            {isKakao ? (
              <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.6 }}>카카오 계정은 이메일이 카카오와 연동돼 있어요. 카카오에서 이메일을 변경하신 뒤, 아래 <b>카카오로 동기화</b>를 누르면 최신 이메일로 반영됩니다.</p>
            ) : (
              <>
                <input type="email" placeholder="새 이메일 주소" value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 8, boxSizing: "border-box" }} />
                <input type="password" placeholder="현재 비밀번호" value={emailPw}
                  onChange={(e) => setEmailPw(e.target.value)}
                  style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 4, boxSizing: "border-box" }} />
              </>
            )}
            {emailMsg && <p style={{ fontSize: 12, color: "#5f0080", margin: "6px 0 0", lineHeight: 1.5 }}>{emailMsg}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => setShowEmailModal(false)} disabled={emailBusy}
                style={{ flex: 1, height: 46, borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#333", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>취소</button>
              {isKakao ? (
                <button onClick={startKakaoReauth} disabled={emailBusy}
                  style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#FEE500", color: "#191600", fontSize: 15, fontWeight: 700, cursor: emailBusy ? "not-allowed" : "pointer", opacity: emailBusy ? 0.7 : 1 }}>{emailBusy ? "이동 중..." : "카카오로 동기화"}</button>
              ) : (
                <button onClick={changeEmail} disabled={emailBusy}
                  style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 15, fontWeight: 600, cursor: emailBusy ? "not-allowed" : "pointer", opacity: emailBusy ? 0.7 : 1 }}>{emailBusy ? "변경 중..." : "변경하기"}</button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
function InfoRow({ label, value, isEmpty, isLast, onClick, required }: {
  label: string; value: string; isEmpty?: boolean; isLast?: boolean; onClick?: () => void; required?: boolean;
}) {
  return (
    <button className={`profile-info-row ${isLast ? "is-last" : ""}`} onClick={onClick} disabled={!onClick}>
      <span className="profile-info-label">{label}{required && <span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span>}</span>
      <span className={`profile-info-value ${isEmpty ? "is-empty" : ""}`}>{value}</span>
      <ChevronRight size={16} className="profile-info-chevron" />
    </button>
  );
}

function AppliedTab({ userName }: { userName: string }) {
  const router = useRouter();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [viewAppId, setViewAppId] = useState<string | null>(null);
  const [showCert, setShowCert] = useState(false);
  const [certApp, setCertApp] = useState<any | null>(null);
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set());
  const [menuAppId, setMenuAppId] = useState<string | null>(null);
  const toggleSelect = (id: string) =>
    setSelectedApps((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  useEffect(() => {
    if (!menuAppId) return;
    const close = () => setMenuAppId(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menuAppId]);
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    let cancelled = false;
    const load = async (attempt = 0): Promise<void> => {
      try {
        const r = await fetch("/api/users/me/applications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const res = await r.json();
        if (cancelled) return;
        if (res.success) {
          setApps(res.data || []);
          setError(false);
          setLoading(false);
        } else {
          throw new Error(res.error?.message || "응답 실패");
        }
      } catch (e) {
        if (cancelled) return;
        if (attempt < 2) {
          setTimeout(() => load(attempt + 1), 600); // 콜드스타트/일시 실패 시 재시도 (최대 3회)
        } else {
          console.error("[applications]", e);
          setError(true);
          setLoading(false);
        }
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  const handleCancel = async (appId: string) => {
    if (!confirm("이 지원을 취소하시겠어요? 취소하면 되돌릴 수 없어요.")) return;
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`/api/users/me/applications/${appId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setApps((prev) => prev.map((a) => a.id === appId ? { ...a, status: "WITHDRAWN" } : a));
      } else {
        alert(data.error?.message || "지원 취소에 실패했어요.");
      }
    } catch {
      alert("지원 취소 중 오류가 발생했어요.");
    }
  };

  // 종료된 지원 건을 목록에서만 숨김 (기업에는 영향 없음)
  const handleHide = async (appId: string) => {
    if (!confirm("이 지원 내역을 목록에서 삭제할까요?\n(기업에는 영향을 주지 않으며, 되돌릴 수 없어요.)")) return;
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`/api/users/me/applications/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hidden: true }),
      });
      const data = await res.json();
      if (data.success) {
        setApps((prev) => prev.filter((a) => a.id !== appId));
      } else {
        alert(data.error?.message || "삭제에 실패했어요.");
      }
    } catch {
      alert("삭제 중 오류가 발생했어요.");
    }
  };

  const handleBulkHide = async () => {
    if (selectedApps.size === 0) { alert("삭제할 지원 내역을 선택해주세요."); return; }
    if (!confirm(`선택한 ${selectedApps.size}건을 목록에서 삭제할까요?\n(기업에는 영향을 주지 않으며, 되돌릴 수 없어요.)`)) return;
    const token = localStorage.getItem("access_token");
    const ids = Array.from(selectedApps);
    for (const id of ids) {
      try {
        await fetch(`/api/users/me/applications/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ hidden: true }),
        });
      } catch {}
    }
    setApps((prev) => prev.filter((a) => !selectedApps.has(a.id)));
    setSelectedApps(new Set());
  };

  const statusTextColor: Record<string, string> = {
    APPLIED: "#5f0080", REVIEWING: "#5f0080", VIEWED: "#5f0080",
    INTERVIEW: "#1e40af", PASSED: "#16a34a", REJECTED: "#d9534f", WITHDRAWN: "#999",
  };
  const statusLabel: Record<string, string> = {
    APPLIED: "서류검토중", REVIEWING: "서류검토중", VIEWED: "열람됨",
    INTERVIEW: "면접예정", PASSED: "합격", REJECTED: "불합격", WITHDRAWN: "지원취소",
  };
  const statusStyle: Record<string, string> = {
    APPLIED: "applied-status-review", REVIEWING: "applied-status-review", VIEWED: "applied-status-review",
    INTERVIEW: "applied-status-interview", PASSED: "applied-status-pass",
    REJECTED: "applied-status-fail", WITHDRAWN: "applied-status-fail",
  };

  if (loading) return <div className="profile-empty-tab"><p style={{ color: "#888", padding: "40px 0" }}>불러오는 중...</p></div>;
  if (error) return (
    <div className="profile-empty-tab">
      <div className="profile-empty-icon">⚠️</div>
      <p>지원 내역을 불러오지 못했어요.<br />잠시 후 새로고침해 주세요.</p>
    </div>
  );
  if (apps.length === 0) return (
    <div className="profile-empty-tab">
      <div className="profile-empty-icon">📋</div>
      <p>아직 지원한 공고가 없어요</p>
      <a href="/jobs" className="profile-empty-btn">채용공고 보러가기</a>
    </div>
  );

  return (
    <div className="profile-tab-content">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#555", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}>
          <input type="checkbox" className="applied-check"
            checked={apps.length > 0 && selectedApps.size === apps.length}
            onChange={(e) => setSelectedApps(e.target.checked ? new Set(apps.map((a) => a.id)) : new Set())}
          />
          전체{selectedApps.size > 0 ? ` (${selectedApps.size})` : ""}
        </label>
        <button
          onClick={() => { if (selectedApps.size === 0) { alert("증명서에 포함할 지원 내역을 선택해주세요."); return; } setShowCert(true); }}
          style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 5, padding: "8px 12px", borderRadius: 8, border: "1px solid #e0d0f0", background: "#fff", color: "#5f0080", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          📄 취업활동 증명서
        </button>
        <button
          onClick={handleBulkHide}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff", color: "#888", fontSize: 12.5, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}
        >
          삭제
        </button>
      </div>
      <div className="applied-list">
        {apps.map((app) => {
          const date = new Date(app.applied_at);
          const dateStr = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
          return (
            <div key={app.id} className="applied-item">
              <input type="checkbox" className="applied-check"
                checked={selectedApps.has(app.id)}
                onChange={() => toggleSelect(app.id)}
              />
              <div className="applied-body" onClick={() => app.job_id && router.push(`/jobs/${app.job_id}`)}>
                <h3 className="applied-position">{app.job_title}</h3>
                <span className="applied-company">{app.brand_name || app.company_name}</span>
                <span className="applied-date">지원일 {dateStr}</span>
              </div>
              <div className="applied-right">
                <div className="applied-menu-wrap">
                  <button
                    className="applied-menu-btn"
                    aria-label="더보기"
                    onClick={(e) => { e.stopPropagation(); setMenuAppId(menuAppId === app.id ? null : app.id); }}
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  {menuAppId === app.id && (
                    <div className="applied-menu" onClick={(e) => e.stopPropagation()}>
                      <button className="applied-menu-item" onClick={() => { setMenuAppId(null); setViewAppId(app.id); }}>내 지원서 보기</button>
                      <button className="applied-menu-item" onClick={() => { setMenuAppId(null); setCertApp(app); }}>공고 증명서</button>
                      {(app.status === "APPLIED" || app.status === "VIEWED") ? (
                        <button className="applied-menu-item danger" onClick={() => { setMenuAppId(null); handleCancel(app.id); }}>지원 취소</button>
                      ) : (
                        <button className="applied-menu-item disabled" disabled>지원 취소</button>
                      )}
                    </div>
                  )}
                </div>
                <span className="applied-status-text" style={{ color: statusTextColor[app.status] || "#5f0080" }}>
                  {statusLabel[app.status] || app.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {viewAppId && (
        <MyApplicationModal applicationId={viewAppId} onClose={() => setViewAppId(null)} />
      )}
      {showCert && (
        <JobSearchCertificateModal name={userName} apps={apps.filter((a) => selectedApps.has(a.id))} onClose={() => setShowCert(false)} />
      )}
      {certApp && (
        <JobPostingCertificateModal name={userName} app={certApp} onClose={() => setCertApp(null)} />
      )}
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

  const handleRemove = async (jobPostingId: string) => {
    if (!confirm("이 공고를 관심목록에서 삭제할까요?")) return;
    const token = localStorage.getItem("access_token");
    try {
      const res = await fetch(`/api/users/me/bookmarks?job_posting_id=${jobPostingId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setBookmarkedJobs((prev) => prev.filter((j) => j.job_posting_id !== jobPostingId));
      } else {
        alert("삭제에 실패했어요.");
      }
    } catch {
      alert("삭제 중 오류가 발생했어요.");
    }
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
              <span className="bookmark-location">📍 {job.location ? shortRegion(job.location) : "협의"}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <span className="bookmark-deadline">{formatDeadline(job.deadline)}</span>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRemove(job.job_posting_id); }}
                style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #eee", background: "#fff", color: "#999", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
              >
                삭제
              </button>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
