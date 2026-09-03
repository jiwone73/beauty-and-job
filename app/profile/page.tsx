"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Settings, ChevronRight, Plus, X, MapPin, Bell, MoreHorizontal, Trash2,
  User, Store, Building2, Globe, Phone, Cake, Users as UsersIcon, Mail, Home, Briefcase, Pencil, Wallet } from "lucide-react";
import RegionSelectModal from "@/components/RegionSelectModal";
import ImageCropModal from "@/components/ImageCropModal";
import { useSignupStore } from "@/lib/store/signupStore";
import { useAuthStore } from "@/lib/store/authStore";
import { InlineText, InlinePick, InlineYMD } from "@/components/profile/inline/InlineField";
import { useBookmarkStore } from "@/lib/store/bookmarkStore";
import { useApplicationStore } from "@/lib/store/applicationStore";
import { shortRegion } from "@/lib/regionShort";
import { SALARY_TYPE_LABEL } from "@/lib/salary";
import { useProfileStore } from "@/lib/store/profileStore";
import JobGroupSelectModal from "@/components/JobGroupSelectModal";
import { SIDO_LIST, getSigunguList } from "@/lib/data/regions";
import NotificationModal from "@/components/profile/NotificationModal";
import ProfileShell from "@/components/profile/ProfileShell";
import MyApplicationModal from "@/components/profile/MyApplicationModal";
import JobSearchCertificateModal from "@/components/profile/JobSearchCertificateModal";
import JobPostingCertificateModal from "@/components/profile/JobPostingCertificateModal";
import { validateBirth } from "@/lib/validateBirth";


type ModalType = "notification" | null;

export default function ProfilePage() {
  const router = useRouter();
  const {
    name: signupName, birth, gender, phone,
    skillAreas, setStoreProfile,
  } = useSignupStore();

  const [officeJobAreas, setOfficeJobAreas] = useState<string[]>([]);
  const { userName, userPhone, logout } = useAuthStore();
  const name = userName || signupName || "";

  const { setCareerVerified } = useProfileStore();

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
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [isKakao, setIsKakao] = useState(false);
  const [dbJobType, setDbJobType] = useState<"OFFICE" | "STORE" | null>(null);
  // 얼굴은 경력보다 민감하다. 사진만 빼고 싶은 사람이 프로필을 통째로 닫지
  // 않도록 따로 끌 수 있게 한다. 기본은 공개.
  const [avatarPublic, setAvatarPublic] = useState(true);
  // 국적 — 살롱 채용에 외국인 구직자가 적지 않다. 비자·의사소통 때문에 매장이
  //   지원 전에 알아야 한다. 안 밝혀도 되도록 필수로 두지 않는다.
  const [nationality, setNationality] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarMenu, setAvatarMenu] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!avatarMenu) return;
    const close = () => setAvatarMenu(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [avatarMenu]);

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
  // 희망급여 — 매장이 제안할 때 가장 먼저 맞춰 보는 값인데 칸이 없었다.
  // 공고와 같은 모양(원 단위 + 유형)이라 「희망 급여와 같아요」로 맞대어 볼 수 있다.
  const [salaryType, setSalaryType] = useState("MONTHLY");
  const [salaryMan, setSalaryMan] = useState("");
  // 금액을 안 적었으면 협의다. 따로 저장하는 값이 아니라 금액에서 따라 나온다.
  const [협의, set협의] = useState(false);

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


  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setAvatarLoaded(true); return; }

    useProfileStore.getState().loadFromServer();

    // 사진 공개 여부 불러오기 (아바타 메뉴의 '사진 비공개')
    fetch("/api/users/me/profile", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (typeof res?.data?.avatar_public === "boolean") setAvatarPublic(res.data.avatar_public);
        const pf = res?.data?.profile;
        if (pf?.salary_type) setSalaryType(pf.salary_type);
        if (pf?.salary_min !== null && pf?.salary_min !== undefined && Number(pf.salary_min) === 0) {
          set협의(true);
        } else if (pf?.salary_min) {
          const 배수 = pf.salary_type === "HOURLY" || pf.salary_type === "DAILY" ? 1 : 10000;
          setSalaryMan(String(Math.round(Number(pf.salary_min) / 배수)));
          set협의(false);
        }
      })
      .catch(() => {});

    fetch("/api/users/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          if (res.data.job_type) setDbJobType(res.data.job_type);
          if (res.data.nationality) setNationality(res.data.nationality);
          if (res.data.email) setEmailInput(res.data.email);
          setIsKakao(!!res.data.is_kakao);
          if (res.data.avatar_url) setAvatarUrl(res.data.avatar_url);
          if (res.data.office_job_areas?.length > 0) {
            setOfficeJobAreas(res.data.office_job_areas);
          }
          // 전화는 서버가 가진 것이 참이다. 예전에는 로그인 때 스토어에 담긴
          // 값만 봤는데, 그 값은 새로고침·다른 기기·JWT 재발급에서 비어 있어
          // 이미 넣어 둔 번호가 화면에서만 사라졌다(프로필이 미완성으로 보였다).
          if (res.data.phone) setPhoneOverride(res.data.phone);
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
      .catch(console.error)
      .finally(() => setAvatarLoaded(true));

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

  // 시술분야·희망근무형태 등 STORE 필수항목을 서버에 저장(하위 항목 미영향 PATCH).
  // 만원 단위로 적고 원 단위로 저장한다 — 공고와 같은 값이라야 맞대어 볼 수 있다.
  // 「협의」는 0원으로 적는다 — 0원을 희망할 리 없으니 그 자리를 빌려 쓴다.
  // null(아직 안 정함)과 0(협의로 정함)이 갈라져야 체크가 다시 열 때도 남는다.
  const 급여저장 = async (type: string, man: string, 협의로?: boolean) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const 배수 = type === "HOURLY" || type === "DAILY" ? 1 : 10000;
    const won = 협의로 ? 0 : (man ? Number(man) * 배수 : null);
    try {
      await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ salary_type: type, salary_min: won }),
      });
    } catch (e) { console.error("[급여저장]", e); }
  };

  const persistStoreProfile = async (patch: { skill_areas?: string[]; work_type_prefer?: string; region_prefer?: string; office_job_areas?: string[] }) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const s = useSignupStore.getState();
    try {
      await fetch("/api/users/me/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          skill_areas: patch.skill_areas ?? s.skillAreas ?? [],
          work_type_prefer: patch.work_type_prefer ?? s.workTypePrefer ?? "",
          region_prefer: patch.region_prefer ?? s.regionPrefer ?? "",
          office_job_areas: patch.office_job_areas ?? s.officeJobAreas ?? [],
        }),
      });
    } catch (e) { console.error("[persistStoreProfile]", e); }
  };

  const saveAvatarPublic = async (next: boolean) => {
    setAvatarPublic(next);
    const token = localStorage.getItem("access_token");
    if (!token) return;
    // 한 항목만 바꾸는 것이라 PATCH. PUT 은 이력서 전체를 갈아 끼우는 쪽이다.
    await fetch("/api/users/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatar_public: next }),
    }).catch(() => setAvatarPublic(!next));
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

  // 업로드 전 자동 리사이즈·압축 (긴 변 1000px, JPEG 0.82). 실패 시 원본 반환.
  const compressImage = (f: File): Promise<Blob> => new Promise((resolve) => {
    const url = URL.createObjectURL(f);
    const img = document.createElement("img");
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1000;
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      if (width > MAX || height > MAX) {
        if (width >= height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(f); return; }
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, width, height); // 투명 PNG 배경 흰색 처리
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob || f), "image/jpeg", 0.82);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(f); };
    img.src = url;
  });

  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      alert("JPG, PNG, WebP 이미지만 업로드 가능합니다."); e.target.value = ""; return;
    }
    if (file.size > 10 * 1024 * 1024) { alert("이미지가 너무 커요. 10MB 이하로 올려주세요."); e.target.value = ""; return; }
    e.target.value = "";
    setAvatarCropFile(file);
  };

  const handleAvatarCropped = async (blob: Blob) => {
    const originalName = avatarCropFile?.name || "avatar";
    setAvatarCropFile(null);
    const file = new File([blob], (originalName.replace(/\.[^.]+$/, "") || "avatar") + ".webp", { type: "image/webp" });
    const token = localStorage.getItem("access_token");
    if (!token) return;
    setAvatarUploading(true);
    try {
      const compressed = await compressImage(file);
      if (compressed.size > 3 * 1024 * 1024) { alert("사진 용량이 커요. 3MB 이하 이미지로 올려주세요."); return; }
      const uploadName = (file.name.replace(/\.[^.]+$/, "") || "avatar") + ".jpg";
      const formData = new FormData();
      formData.append("file", new File([compressed], uploadName, { type: "image/jpeg" }));
      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAvatarUrl(data.data.avatar_url);
        useAuthStore.getState().setAvatar(data.data.avatar_url || "");  // 헤더 아바타 즉시 반영
      }
      else alert(data.error?.message || "업로드에 실패했습니다.");
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    } finally {
      setAvatarUploading(false);
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
      if (data.success) {
        setAvatarUrl(null);
        useAuthStore.getState().setAvatar("");
      }
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
  if (dbJobType === "OFFICE" && officeJobAreas.length === 0) missingRequired.push("희망직군");
  if (dbJobType === "STORE" && skillAreas.length === 0) missingRequired.push("희망직군");
  if (!preferredRegions || preferredRegions.length === 0) missingRequired.push("희망 근무지역");

  // 직군/지역 한 줄 요약값
  const jobAreaSummary = (arr: string[]) => (arr.length ? arr.join(", ") : "선택해주세요");
  const anyRegion = preferredRegions.some((r) => r.sido === "지역 무관");
  const regionSummary = anyRegion
    ? "지역 무관 (전국 어디든)"
    : preferredRegions.length
      ? preferredRegions.map((r) => `${shortSido(r.sido)} ${r.sigungu || "전체"}`).join(", ")
      : "선택해주세요";

  // 이력서로 이동 (필수항목 미완성 시 안내 후 프로필에 머무름)
  // 1) 새 이메일로 인증코드 발송
  const sendEmailCode = async () => {
    if (!newEmailInput.trim()) { alert("새 이메일을 입력해주세요."); return; }
    const token = localStorage.getItem("access_token");
    setEmailSending(true); setEmailMsg("");
    try {
      const r = await fetch("/api/users/me/email/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_email: newEmailInput.trim() }),
      });
      const res = await r.json();
      if (res.success) {
        setEmailCodeSent(true);
        setEmailMsg(res.data?.dev_code ? `인증번호를 전송했어요. (테스트: ${res.data.dev_code})` : "인증번호를 전송했어요. 새 이메일을 확인해주세요.");
      } else {
        setEmailMsg(res.error?.message || "인증번호 전송에 실패했습니다.");
      }
    } catch { setEmailMsg("오류가 발생했습니다."); }
    finally { setEmailSending(false); }
  };

  // 2) 인증코드 확인 후 이메일 변경
  const changeEmail = async () => {
    if (!newEmailInput.trim()) { alert("새 이메일을 입력해주세요."); return; }
    if (!emailCodeSent) { alert("먼저 인증번호를 받아주세요."); return; }
    if (!emailCode.trim()) { alert("인증번호를 입력해주세요."); return; }
    const token = localStorage.getItem("access_token");
    setEmailBusy(true); setEmailMsg("");
    try {
      const r = await fetch("/api/users/me/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_email: newEmailInput.trim(), code: emailCode.trim() }),
      });
      const res = await r.json();
      if (res.success) {
        setEmailInput(res.data.email);
        setShowEmailModal(false);
        setEmailCode(""); setEmailCodeSent(false); setNewEmailInput("");
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
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    router.push("/profile/resume");
  };

  return (
    <ProfileShell>
      <div className="profile-content">
            <section className="profile-section">
              <div className="profile-info-card pf-grid">
                {/* 이름 — 목록 맨 위. 사진은 이 줄 오른쪽 끝에 둔다(누르면 바꾸기·지우기). */}
                <div className="profile-info-row pf-wide" style={{ cursor: "default", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 14 }}>
                  <span className="pf-labelwrap" style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <span className="profile-info-label">{칸그림("이름")}이름<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></span>
                    <span className={`profile-info-value ${name ? "" : "is-empty"}`}>{name || "이름"}</span>
                  </span>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", position: "relative" }}>
                    <div
                      onClick={(e) => { e.stopPropagation(); setAvatarMenu((v) => !v); }}
                      title="사진 변경/삭제"
                      style={{ width: "80px", height: "80px", borderRadius: "50%", background: avatarLoaded ? "#f7f7f8" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", position: "relative", border: avatarLoaded ? "1px solid #f2f2f2" : "1px solid transparent", cursor: "pointer" }}>
                      {/* 사진을 비공개로 두면 이 자리도 기본 아바타로 바꾼다. 남에게
                          안 보이는데 나에게만 보이면, 껐는지 켰는지 매번 메뉴를 열어
                          확인해야 한다. 사진 자체는 지워지지 않고 그대로 있다. */}
                      {avatarUrl && avatarPublic ? (
                        <img src={avatarUrl} alt="프로필" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : avatarLoaded ? (
                        <span style={{ fontSize: "30px", color: "#a8a8ad" }}>👤</span>
                      ) : null}
                      {avatarUploading && (
                        <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: "#582681", fontWeight: 600 }}>
                          업로드중
                        </div>
                      )}
                    </div>
                    {/* 원 안에 아이콘 하나 없으면 눌러서 사진을 바꾼다는 게 안 보인다.
                        가장자리에 카메라 배지를 얹어 클릭을 유도한다(원티드 방식). 원 바깥으로
                        살짝 걸치게 두는 거라, overflow:hidden 인 원 안이 아니라 바깥에 둔다. */}
                    <div style={{ position: "absolute", right: 0, bottom: 6, width: 26, height: 26, borderRadius: "50%",
                      background: "#582681", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                      <Pencil size={13} color="#fff" />
                    </div>
                    {avatarMenu && (
                      <div onClick={(e) => e.stopPropagation()}
                        style={{ position: "absolute", top: "100%", right: 0, marginTop: "6px", zIndex: 30, background: "#fff", border: "1px solid #efeff1", borderRadius: "10px", boxShadow: "0 6px 20px rgba(0,0,0,0.12)", padding: "6px", minWidth: "196px" }}>
                        <button
                          onClick={() => { avatarFileRef.current?.click(); setAvatarMenu(false); }}
                          style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: "none", background: "transparent", fontSize: "13px", color: "#333", cursor: "pointer", borderRadius: "6px" }}>
                          {avatarUrl ? "사진 변경" : "사진 추가"}
                        </button>
                        {avatarUrl && (
                          <button
                            onClick={() => { handleAvatarDelete(); setAvatarMenu(false); }}
                            style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: "none", background: "transparent", fontSize: "13px", color: "#e74c3c", cursor: "pointer", borderRadius: "6px" }}>
                            사진 삭제
                          </button>
                        )}
                        {/* 사진을 감추는 일은 사진을 만지는 자리에서 하는 게 맞다.
                            예전엔 공개 설정 모달 안에 숨어 있어, 사진을 바꾸러 온
                            사람은 그런 선택이 있는 줄도 몰랐다. */}
                        {avatarUrl && (
                          <>
                            <div style={{ height: 1, background: "#f7f7f8", margin: "5px 6px" }} />
                            <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", cursor: "pointer" }}>
                              <input type="checkbox" className="applied-check"
                                checked={!avatarPublic}
                                onChange={(e) => saveAvatarPublic(!e.target.checked)} />
                              <span style={{ fontSize: "13px", color: "#333" }}>사진 비공개</span>
                            </label>
                            {/* avatar_public 은 인재검색 쪽만 막는다. 지원한 곳은 그대로 본다.
                                사진이 화면에서 사라지므로 지워진 것으로 오해하지 않게 적는다. */}
                            <div style={{ fontSize: "11px", color: "#aaa", padding: "0 10px 4px", lineHeight: 1.5 }}>
                              {avatarPublic
                                ? "내가 지원한 매장에는 그대로 보여요."
                                : "사진은 지워지지 않아요. 내가 지원한 매장에는 그대로 보여요."}
                            </div>
                            <div style={{ height: 1, background: "#f7f7f8", margin: "1px 6px 5px" }} />
                          </>
                        )}
                        <div style={{ fontSize: "11px", color: "#aaa", padding: "4px 10px 2px" }}>JPG/PNG/WebP · 자동 최적화 (최대 3MB)</div>
                      </div>
                    )}
                    <input ref={avatarFileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleAvatarUpload} style={{ display: "none" }} />
                  </div>
                </div>
                {/* 구직유형 — 가입 때 정한다. 바꾸면 아래 직군·스킬이 통째로 어긋나므로
                    보여만 준다. 이 값이 '직군' 의 뜻을 정하니 목록 맨 위가 제 자리다. */}
                <div className="profile-info-row" style={{ cursor: "default" }}>
                  <span className="profile-info-label">{칸그림("구직유형")}구직유형</span>
                  <span className={`profile-info-value ${dbJobType ? "" : "is-empty"}`}>
                    {dbJobType === "STORE" ? "매장" : dbJobType === "OFFICE" ? "본사" : "선택하기"}
                    {/* 무엇을 뜻하는 유형인지 — 메인 히어로에서 쓰는 말 그대로.
                        같은 것을 두 화면이 다르게 설명하면 어느 쪽이 맞는지 헷갈린다. */}
                    {dbJobType && (
                      <em className="profile-info-note">
                        {dbJobType === "STORE"
                          ? "살롱·샵 등 매장에서 근무하는 직군이에요"
                          : "브랜드·제조·유통·교육·협력사 등 매장이 아닌 곳에서 근무하는 직군이에요"}
                      </em>
                    )}
                  </span>
                </div>

                {/* 국적 — 원티드식으로 그 자리에서 고른다. 펼쳐지는 판·취소 단추를
                    따로 두지 않는다(칸 하나 고르자고 화면이 들썩일 이유가 없다).
                    목록에 없는 나라는 '기타'로 두고 자세한 것은 이력서 어학에서 읽는다. */}
                <div className="profile-info-row" style={{ cursor: "default" }}>
                  <span className="profile-info-label">{칸그림("국적")}국적</span>
                  <span>
                    <InlinePick value={nationality} placeholder="선택하기"
                      options={["대한민국", "중국", "베트남", "일본", "몽골", "우즈베키스탄", "러시아", "태국", "필리핀", "기타"]}
                      onSave={(v) => {
                        const 앞 = nationality;
                        setNationality(v);
                        const token = localStorage.getItem("access_token");
                        fetch("/api/users/me", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ nationality: v }),
                        }).then((r) => r.json()).then((d) => {
                          if (!d.success) { setNationality(앞); alert(d.error?.message || "저장에 실패했어요."); }
                        }).catch(() => { setNationality(앞); alert("네트워크 오류가 났어요."); });
                      }} />
                  </span>
                </div>

                {editField === "phone" ? (
                  <div className="profile-info-row" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span className="profile-info-label">{칸그림("휴대전화")}휴대전화<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></span>
                      <span style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                        <button onClick={() => { setEditField(null); setPhoneCode(""); setPhoneCodeSent(false); setPhoneVerified(false); setPhoneMsg(""); }}
                          style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "14px", border: "1px solid #efeff1", background: "#fff", color: "#333", cursor: "pointer" }}>취소</button>
                        <button
                          style={{ padding: "6px 16px", borderRadius: "8px", fontSize: "14px", border: "none", background: phoneVerified ? "#582681" : "#e0e0e0", color: phoneVerified ? "#fff" : "#9a9a9a", cursor: phoneVerified ? "pointer" : "not-allowed" }}
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
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="tel" inputMode="numeric" placeholder="010-0000-0000" maxLength={13}
                        value={formatPhone(phoneInput)}
                        disabled={phoneVerified}
                        onChange={(e) => { setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 11)); setPhoneVerified(false); setPhoneCodeSent(false); }}
                        style={{ flex: 1, minWidth: 0, padding: "8px 10px", border: "1px solid #efeff1", borderRadius: "8px", fontSize: "14px", background: phoneVerified ? "#f5f5f5" : "#fff" }}
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
                        style={{ padding: "0 14px", height: "38px", whiteSpace: "nowrap", borderRadius: "8px", fontSize: "13px", fontWeight: 600, border: "1px solid #582681", background: "#fff", color: "#582681", cursor: "pointer", opacity: (phoneVerified || phoneInput.replace(/\D/g, "").length < 10) ? 0.4 : 1 }}>
                        {phoneVerified ? "인증완료" : phoneCodeSent ? "재전송" : phoneSending ? "전송중" : "인증번호 받기"}
                      </button>
                    </div>
                    {phoneCodeSent && !phoneVerified && (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input
                          type="tel" inputMode="numeric" placeholder="인증번호 6자리" maxLength={6}
                          value={phoneCode}
                          onChange={(e) => setPhoneCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          style={{ flex: 1, minWidth: 0, padding: "8px 10px", border: "1px solid #efeff1", borderRadius: "8px", fontSize: "14px" }}
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
                          style={{ padding: "0 14px", height: "38px", whiteSpace: "nowrap", borderRadius: "8px", fontSize: "13px", fontWeight: 600, border: "none", background: "#582681", color: "#fff", cursor: "pointer", opacity: phoneCode.length < 6 ? 0.4 : 1 }}>
                          확인
                        </button>
                      </div>
                    )}
                    {phoneMsg && (
                      <p style={{ fontSize: "12px", margin: 0, color: phoneVerified ? "#10b981" : "#9a9a9a" }}>{phoneMsg}</p>
                    )}
                  </div>
                ) : (
                  <InfoRow label="휴대전화" value={formatPhone(phoneOverride || userPhone || phone || "") || "010-XXXX-XXXX"} isEmpty={!(phoneOverride || userPhone || phone)} onClick={() => { setPhoneInput((phoneOverride || userPhone || phone || "").replace(/\D/g, "")); setPhoneCode(""); setPhoneCodeSent(false); setPhoneVerified(false); setPhoneMsg(""); setEditField("phone"); }} required />
                )}

                {/* 생년월일 — 큰 입력칸에 여덟 자리를 치게 하고 저장·취소를 붙여 두니
                    칸 하나 고치자고 화면이 들썩였다. 그 자리에서 연→월→일로 고른다. */}
                <div className="profile-info-row" style={{ cursor: "default" }}>
                  <span className="profile-info-label">{칸그림("생년월일")}생년월일<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></span>
                  <span>
                    <InlineYMD required
                      value={birth ? `${birth.slice(0, 4)}.${birth.slice(4, 6)}.${birth.slice(6, 8)}` : ""}
                      placeholder="YYYY.MM.DD"
                      onSave={async (v) => {
                        const d = v.replace(/\D/g, "");
                        if (d.length !== 8) return;
                        const 검사 = validateBirth(d);
                        if (!검사.ok) { alert(검사.message); return; }
                        try {
                          const token = localStorage.getItem("access_token");
                          const res = await fetch("/api/users/me", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ birth: d }),
                          });
                          const data = await res.json();
                          if (!data.success) { alert(data.error?.message || "저장에 실패했어요."); return; }
                          useSignupStore.getState().setBasic({ birth: d });
                        } catch { alert("네트워크 오류가 났어요."); }
                      }} />
                  </span>
                </div>

                {/* 성별 — 국적·생년월일과 같은 결로 그 자리에서 고른다. */}
                <div className="profile-info-row" style={{ cursor: "default" }}>
                  <span className="profile-info-label">{칸그림("성별")}성별<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></span>
                  <span>
                    <InlinePick required placeholder="선택하기" options={["남성", "여성"]}
                      value={/^m/i.test(gender) ? "남성" : /^f/i.test(gender) ? "여성" : (gender || "")}
                      onSave={async (v) => {
                        if (!v) return;
                        try {
                          const token = localStorage.getItem("access_token");
                          const res = await fetch("/api/users/me", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ gender: v }),
                          });
                          const data = await res.json();
                          if (!data.success) { alert(data.error?.message || "저장에 실패했어요."); return; }
                          useSignupStore.getState().setBasic({ gender: v as "남성" | "여성" });
                        } catch { alert("네트워크 오류가 났어요."); }
                      }} />
                  </span>
                </div>

                {editField === "email" ? (
                  <div className="profile-info-row is-last" style={{ cursor: "default", flexDirection: "column", alignItems: "stretch", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center" }}>
                      <span className="profile-info-label">{칸그림("이메일")}이메일<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></span>
                      <span style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
                        <button onClick={() => setEditField(null)}
                          style={{ padding: "6px 12px", borderRadius: "8px", fontSize: "14px", border: "1px solid #efeff1", background: "#fff", color: "#333", cursor: "pointer" }}>취소</button>
                        <button
                          style={{ padding: "6px 16px", borderRadius: "8px", fontSize: "14px", border: "none", background: "#582681", color: "#fff", cursor: "pointer" }}
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
                      </span>
                    </div>
                    <input
                      type="email" placeholder="example@email.com"
                      value={emailEditInput}
                      onChange={(e) => setEmailEditInput(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", border: "1px solid #efeff1", borderRadius: "8px", fontSize: "14px" }}
                    />
                  </div>
                ) : (
                  <InfoRow label="이메일" value={emailInput || "예) hong@gmail.com"} isEmpty={!emailInput} onClick={() => { setNewEmailInput(""); setEmailPw(""); setEmailMsg(""); setShowEmailModal(true); }} required />
                )}
                {/* 거주지 — 기업정보와 같은 결로 라벨 옆 한 줄. 카드를 따로 두지 않는다:
                    셋으로 갈라 두니 한 페이지가 아니라 세 덩어리로 읽혔다. */}
                <div className="pf-wide" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6, padding: "13px 0", borderBottom: "1px solid #f2f2f2" }}>
                  <label className="profile-info-label">{칸그림("거주지 주소")}거주지 주소<span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span></label>
                  {/* 왼쪽 18px 은 라벨 글자 선(아이콘 16 + 사이 6 = 22)에서 슬롯 제 여백 4 를 뺀 값. */}
                  <div className="if-row if-row-plain" style={{ flex: 1, minWidth: 0, borderBottom: "none", padding: "0 0 0 18px" }}>
                    <div className="if-row-body">
                      <div className="if-line">
                        <button type="button" className={`if-slot ${addressRoad ? "on" : ""}`} onClick={openPostcode}>
                          {addressRoad || "주소 검색"}{!addressRoad && <i className="if-req">*</i>}
                        </button>
                        <span className="if-sep">|</span>
                        <InlineText value={addressDetail} placeholder="동·호수"
                          onSave={(v) => { setAddressDetail(v); patchUser({ address_detail: v }); }} />
                      </div>
                    </div>
                    {addressRoad && (
                      <button className="if-row-del" aria-label="주소 초기화" title="주소 초기화" onClick={handleClearAddress}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
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
                <InfoRow
                  label="희망직군"
                  value={jobAreaSummary([...skillAreas, ...officeJobAreas])}
                  isEmpty={dbJobType === "STORE" ? skillAreas.length === 0 : officeJobAreas.length === 0}
                  onClick={() => setJobAreaModal(dbJobType === "STORE" ? "STORE" : "OFFICE")}
                  required
                />
                {/* 프로필 공개는 계정 설정으로 옮겼다 — 한 값을 두 곳에서 고치면
                    어느 쪽이 맞는지 헷갈린다. Header 의 '계정 설정'에 있다. */}
                <InfoRow
                  label="희망 근무지역"
                  value={regionSummary}
                  isEmpty={preferredRegions.length === 0}
                  onClick={() => setPrefModalOpen(true)}
                  required
                />
                {/* 원티드식 인라인 — 그 자리에서 고르고 적는다. 비우면 「급여 협의」다. */}
                <div className="profile-info-row is-last" style={{ cursor: "default" }}>
                  <span className="profile-info-label">{칸그림("희망급여")}희망급여</span>
                  <span className="pf-pay">
                    <select className="pf-pay-sel" value={salaryType}
                      onChange={(e) => { setSalaryType(e.target.value); 급여저장(e.target.value, salaryMan, 협의); }}>
                      {Object.entries(SALARY_TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <input className="pf-pay-in" inputMode="numeric" value={salaryMan}
                      placeholder="숫자만 입력" disabled={협의}
                      onChange={(e) => setSalaryMan(e.target.value.replace(/[^0-9]/g, ""))}
                      onBlur={() => 급여저장(salaryType, salaryMan, false)} />
                    <span className="pf-pay-unit">{salaryType === "HOURLY" || salaryType === "DAILY" ? "원" : "만원"}</span>
                    {/* 「협의」는 금액을 안 적은 것과 결과가 같다(이력서에 '협의'로
                        나간다). 그래도 칸을 비워 두는 것과 협의로 정한 것은 마음이
                        다르다 — 비워 두면 아직 안 정한 것처럼 읽힌다. */}
                    <label className="pf-pay-nego">
                      <input type="checkbox" checked={협의}
                        onChange={(e) => {
                          const 켬 = e.target.checked;
                          set협의(켬);
                          setSalaryMan("");
                          급여저장(salaryType, "", 켬);
                        }} />
                      협의
                    </label>
                  </span>
                </div>
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
              selected={[]}
              onChange={() => {}}
              enableToggle
              storeSelected={skillAreas}
              officeSelected={officeJobAreas}
              onChangeStore={(v: string[]) => { setStoreProfile({ skillAreas: v }); persistStoreProfile({ skill_areas: v }); }}
              onChangeOffice={saveOfficeJobAreas}
              onClose={() => setJobAreaModal(null)}
            />
            <div className="profile-bottom-cta">
              <button className="resume-save-btn-full" onClick={goToResume}>
                현재 프로필로 이력서 만들기
              </button>
            </div>

            {/* 폰에는 사이드 메뉴가 없어 로그아웃이 갈 곳이 여기뿐이다.
                PC 는 사이드에 있으므로 이 칸을 접는다. */}
            <div className="profile-account pf-mob">
              {/* 계정 설정은 위 톱니가 맡는다. 여기 또 두면 같은 곳으로 가는
                  길이 한 화면에 둘이 된다. */}
              <button type="button" className="profile-account-row logout" onClick={() => {
                useSignupStore.getState().reset();
                useProfileStore.getState().reset();
                useBookmarkStore.getState().reset();
                useApplicationStore.getState().reset();
                logout();
                router.push("/");
              }}>
                로그아웃
              </button>
            </div>
      </div>

      <NotificationModal isOpen={openModal === "notification"} onClose={() => setOpenModal(null)} />

      {showEmailModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 24, maxWidth: 400, width: "100%" }}>
            <h3 style={{ fontSize: 17, fontWeight: 400, margin: "0 0 16px" }}>이메일 변경</h3>
            {isKakao ? (
              <p style={{ fontSize: 13, color: "#555", margin: 0, lineHeight: 1.6 }}>카카오 계정은 이메일이 카카오와 연동돼 있어요. 카카오에서 이메일을 변경하신 뒤, 아래 <b>카카오로 동기화</b>를 누르면 최신 이메일로 반영됩니다.</p>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input type="email" placeholder="새 이메일 주소" value={newEmailInput}
                    onChange={(e) => { setNewEmailInput(e.target.value); setEmailCodeSent(false); setEmailCode(""); }}
                    style={{ flex: 1, minWidth: 0, height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, boxSizing: "border-box" }} />
                  <button onClick={sendEmailCode} disabled={emailSending || !newEmailInput.trim()}
                    style={{ flexShrink: 0, height: 44, padding: "0 14px", borderRadius: 8, border: "1px solid #582681", background: "#fff", color: "#582681", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", cursor: emailSending ? "not-allowed" : "pointer", opacity: emailSending ? 0.6 : 1 }}>
                    {emailSending ? "전송중" : emailCodeSent ? "재전송" : "인증번호 받기"}
                  </button>
                </div>
                {emailCodeSent && (
                  <input type="text" inputMode="numeric" placeholder="인증번호 6자리" maxLength={6} value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/[^0-9]/g, ""))}
                    style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 4, boxSizing: "border-box", letterSpacing: "2px" }} />
                )}
              </>
            )}
            {emailMsg && <p style={{ fontSize: 12, color: "#582681", margin: "6px 0 0", lineHeight: 1.5 }}>{emailMsg}</p>}
            <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
              <button onClick={() => { setShowEmailModal(false); setEmailCode(""); setEmailCodeSent(false); setEmailMsg(""); }} disabled={emailBusy}
                style={{ flex: 1, height: 46, borderRadius: 8, border: "1px solid #ddd", background: "#fff", color: "#333", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>취소</button>
              {isKakao ? (
                <button onClick={startKakaoReauth} disabled={emailBusy}
                  style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#FEE500", color: "#191600", fontSize: 15, fontWeight: 700, cursor: emailBusy ? "not-allowed" : "pointer", opacity: emailBusy ? 0.7 : 1 }}>{emailBusy ? "이동 중..." : "카카오로 동기화"}</button>
              ) : (
                <button onClick={changeEmail} disabled={emailBusy || !emailCodeSent || !emailCode.trim()}
                  style={{ flex: 1, height: 46, borderRadius: 8, border: "none", background: "#582681", color: "#fff", fontSize: 15, fontWeight: 600, cursor: (emailBusy || !emailCodeSent || !emailCode.trim()) ? "not-allowed" : "pointer", opacity: (emailBusy || !emailCodeSent || !emailCode.trim()) ? 0.5 : 1 }}>{emailBusy ? "변경 중..." : "변경하기"}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {avatarCropFile && (
        /* 개인 프로필 사진은 정사각으로 잠근다 — 이력서 사진 칸과 동그란 아바타
           양쪽에 쓰여서, 비율이 흔들리면 어느 한쪽이 늘 잘린다. 가장 크게 보이는
           곳이 이력서 100x128 이라 2배 화면까지 500px 이면 넉넉하다. */
        <ImageCropModal file={avatarCropFile} aspect={1} minLongEdge={500}
          onCancel={() => setAvatarCropFile(null)}
          onCropped={handleAvatarCropped} />
      )}
    </ProfileShell>
  );
}
/** 항목마다 왼쪽에 놓는 아이콘. 라벨 이름으로 고른다 — 칸이 늘어도 여기만 손보면 된다. */
function 칸그림(label: string) {
  const 표: Record<string, any> = {
    "이름": User, "구직유형": Store, "국적": Globe, "휴대전화": Phone,
    "생년월일": Cake, "성별": UsersIcon, "이메일": Mail,
    "거주지 주소": Home, "희망직군": Briefcase, "희망 근무지역": MapPin, "희망급여": Wallet,
  };
  const G = 표[label];
  return G ? <G size={16} className="profile-info-icon" /> : null;
}

function InfoRow({ label, value, isEmpty, isLast, onClick, required }: {
  label: string; value: string; isEmpty?: boolean; isLast?: boolean; onClick?: () => void; required?: boolean;
}) {
  return (
    <button className={`profile-info-row ${isLast ? "is-last" : ""}`} onClick={onClick} disabled={!onClick}>
      <span className="profile-info-label">{칸그림(label)}{label}{required && <span style={{ color: "#e74c3c", marginLeft: "2px" }}>*</span>}</span>
      <span className={`profile-info-value ${isEmpty ? "is-empty" : ""}`}>{value}</span>
    </button>
  );
}
