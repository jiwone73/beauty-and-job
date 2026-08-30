"use client";
import { industryGroupsFor } from "@/lib/data/industries";
import { useState, useEffect, useLayoutEffect, useRef, useCallback, type ChangeEvent, type ClipboardEvent, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronDown, Trash2, Upload, Eye, Save, Briefcase, Building2, Clock, Users, Tag, GraduationCap, Settings, Send, ImagePlus, Wand2, Bookmark, Crop, MapPinPlus } from "lucide-react";
import { shortRegion } from "@/lib/regionShort";
import JobDetailView from "@/components/jobs/JobDetailView";
import { formatSalaryWon } from "@/lib/salary";
import CategoryPickPopover from "@/components/jobs/CategoryPickPopover";
import WorkScheduleModal from "@/components/jobs/WorkScheduleModal";
import RegionSelectModal from "@/components/RegionSelectModal";
import AddressMap from "@/components/AddressMap";
import ImageCropModal from "@/components/ImageCropModal";
import BannerStrip from "@/components/jobs/BannerStrip";
import { getGroupOfItem, getJobGroups, 직군의경력단계 } from "@/lib/data/jobGroups";
import { BANNER_PRESETS, drawSampleBanner } from "@/lib/bannerTemplate";
import { REGIONS } from "@/lib/data/regions";
import { EMPLOYMENT_TYPES } from "@/lib/data/employment";
import { composeCompanyAddress, splitAddress } from "@/lib/address";

// 근무지역 인라인 자동완성용: "시도 시군구" 평탄화 목록
const ALL_REGIONS: string[] = REGIONS.flatMap((r) => r.sigungu.map((g) => `${r.sido} ${g}`));

const WORK_DAY_OPTIONS = ["월", "화", "수", "목", "금", "토", "일"];
const WEEKDAY_DAYS = ["월", "화", "수", "목", "금"]; // 평일(미입력 시 기본값)
// 근무시간 풀다운 옵션: 오전/오후 구분 없이 24시간 표기, 1시간 간격, 오전 9시~밤 11시(자정~오전 8시 제외)
const CAREER_OPTIONS = ["신입", "1년 이상", "2년 이상", "3년 이상", "5년 이상", "경력 무관"];
const EDUCATION_OPTIONS = ["학력무관", "고졸 이상", "초대졸 이상", "대졸 이상", "석사 이상"];
// 모집부문 표용 간결 옵션(여백 확보, 직접입력 없음)
const POS_CAREER = ["무관", "신입", "경력", "1년~", "3년~", "5년~", "10년~", "매니저", "실장", "부원장", "원장"];
// 급여: 지급 주기를 고르면 앞머리(시·주·월·연)가 자동으로 붙고 금액만 적으면 된다. 협의는 단독 값.
const SALARY_UNITS: { label: string; prefix: string }[] = [
  { label: "시급", prefix: "시" },
  { label: "일급", prefix: "일" },
  { label: "주급", prefix: "주" },
  { label: "월급", prefix: "월" },
  { label: "연봉", prefix: "연" },
];
// 최저임금은 해마다 바뀐다 — 고시되면 이 두 줄만 고치면 된다.
const 최저임금해 = 2026;
const 최저시급원 = 10320;
// "고졸"만 적으면 고졸인 사람만 되는 것처럼 읽힌다("최저학력이라고 해야 하나" 고민도 이 때문).
// 헤더를 바꾸는 대신 값 자체를 표준 표기로 — EDUCATION_OPTIONS(불러오기 검증용)와 같은 방식이다.
const POS_EDU = ["무관", "고졸 이상", "초대졸 이상", "대졸 이상", "석사 이상"];
// 업로드 전 압축. 서버는 5MB·JPG/PNG/WebP만 받는데, 휴대폰 사진은 그보다 크거나 HEIC라 그냥 올리면 실패한다.
//   긴 변을 1600px로 줄이고 JPEG 품질을 낮춰가며 목표 용량 아래로 맞춘다.
//   캔버스를 거치면서 HEIC도 JPEG로 바뀐다(사파리는 HEIC 디코딩 가능). EXIF 회전은 적용해서 그린다.
const MAX_UPLOAD_BYTES = 300 * 1024; // 장당 0.3MB 목표
async function compressImage(file: File, maxBytes = MAX_UPLOAD_BYTES): Promise<File> {
  // 이미 규격이고 목표보다 작으면 원본 그대로(재인코딩으로 괜히 화질 깎지 않음)
  if (/^image\/(jpeg|png|webp)$/i.test(file.type) && file.size <= maxBytes) return file;
  let src: ImageBitmap | HTMLImageElement | null = null;
  let objUrl = "";
  try {
    try {
      src = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      objUrl = URL.createObjectURL(file);
      src = await new Promise<HTMLImageElement>((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => rej(new Error("decode"));
        im.src = objUrl;
      });
    }
    const w0 = (src as any).width as number;
    const h0 = (src as any).height as number;
    if (!w0 || !h0) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    // 긴 변을 단계적으로 줄이고, 각 단계에서 품질을 낮춰가며 목표 용량 이하가 되면 멈춘다.
    //   사진마다 압축률이 달라 고정 품질로는 용량이 들쭉날쭉해서, 목표를 정해두고 맞춘다.
    let smallest: Blob | null = null;
    let prevW = Infinity;
    for (const edge of [1600, 1280, 1024, 800]) {
      const scale = Math.min(1, edge / Math.max(w0, h0));
      const w = Math.max(1, Math.round(w0 * scale));
      if (w >= prevW) continue; // 원본이 작아 이 단계에서 더 줄지 않으면 건너뜀
      prevW = w;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = Math.max(1, Math.round(h0 * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(src as any, 0, 0, canvas.width, canvas.height);
      for (const q of [0.82, 0.7, 0.6, 0.5, 0.42]) {
        const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", q));
        if (!blob) break;
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= maxBytes) return new File([blob], name, { type: "image/jpeg" });
      }
    }
    return smallest ? new File([smallest], name, { type: "image/jpeg" }) : file;
  } catch {
    return file; // 디코딩 실패 시 원본으로 시도(서버 검증 메시지가 뜨게)
  } finally {
    if (objUrl) URL.revokeObjectURL(objUrl);
    if (src && "close" in (src as any)) (src as ImageBitmap).close();
  }
}

// 공고 이슈 메모에서 선택하는 문제 필드 목록(불러오기 파싱 오류를 어느 항목인지 특정)
// 불러오기 시 반드시 문제없이 들어와야 하는 핵심 항목만 이슈 대상으로.
// 공고를 퍼 오는 카페 구인 게시판. 붙여넣기 할 때 여기로 바로 건너뛴다.
// 다른 카페를 더 쓰게 되면 여기에 주소만 보태면 된다.
const SOURCE_CAFES: { name: string; url: string }[] = [
  { name: "맨사", url: "https://cafe.naver.com/f-e/cafes/16402471/menus/71" },
  { name: "뷰앤잡", url: "https://cafe.naver.com/f-e/cafes/15101779/menus/45?viewType=L" },
];

const ISSUE_FIELDS = ["채용유형", "상단 배너", "회사명", "제목", "모집분야", "근무지역", "상세요강 이미지", "기타"];
const CONTACT_METHOD_OPTIONS = ["문자", "이메일", "전화", "직접방문", "뷰티워크 온라인지원", "회사 홈페이지 지원", "상세요강 참조"]; // 지원방법(복수)
const CONVERTIBLE_SUFFIX = " · 정규직 전환 가능"; // 계약직·인턴 하위 옵션

// 내용에 맞춰 늘어나는 textarea.
// 높이를 JS 로 재던 방식은 재는 순간의 폭에 좌우돼, 불러오기로 값이 채워지거나
// 배치가 뒤늦게 다시 잡히면 엉뚱한 높이가 굳어 글이 잘렸다. 여기서는 같은 글을
// 안 보이게 겹쳐 그려(.autogrow::after) 브라우저가 높이를 직접 정하게 한다.
// 글꼴·줄간격·여백·폭은 style 로 바깥에 주고, 안쪽 둘이 그대로 물려받는다.
function AutoTextarea({
  value, style, className, ...rest
}: { value: string; style?: CSSProperties } & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "style" | "rows"
>) {
  // className 은 바깥(span)에 붙인다. 높이를 재는 것은 span 의 ::after 인데, 글자
  // 크기를 정하는 클래스가 안쪽 textarea 에만 붙어 있으면 재는 크기와 그려지는
  // 크기가 어긋난다. 그러면 칸이 작게 잡혀 긴 제목의 끝 글자가 잘려 나갔다.
  // (안쪽 둘은 .autogrow 규칙의 font: inherit 로 이 크기를 그대로 물려받는다.)
  return (
    <span
      className={`autogrow${className ? ` ${className}` : ""}`}
      // 재는 글자에 공백을 덧붙이면 그 한 칸 때문에 실제 글자보다 먼저 줄이 바뀐다.
      // 같은 제목인데 폼만 두 줄이 되고 미리보기는 한 줄이던 것이 이 탓이다.
      // 공백은 줄바꿈으로 끝날 때만 붙인다 — 그때만 마지막 빈 줄을 잡아 줘야 한다.
      data-value={value.endsWith("\n") ? `${value} ` : value}
      style={style}
    >
      <textarea {...rest} value={value} rows={1} />
    </span>
  );
}
const WORK_PERIODS = ["~6개월", "6개월 ~ 1년", "1년 이상", "협의"];
// 복리후생 옵션은 DB 마스터(benefit_tags)로 이관 → /api/benefit-tags 에서 로드
const PRESET_PROCESS: Record<string, string[]> = {
  기업: ["서류전형", "전화면접", "1차 면접", "2차 면접", "과제전형", "최종합격"],
  매장: ["서류전형", "전화면접", "대면면접", "시술테스트", "최종합격"],
};

type Company = { id: string; company_name: string; brand_name: string | null };

type TextKey = "benefits" | "description" | "responsibilities" | "requirements" | "preferred";

export interface JobPostFormProps {
  mode: "company" | "admin";
  editId?: string | null;
  listHref: string;
  companyType?: "OFFICE" | "STORE" | null;
  companies?: Company[];
  uploadImage: (file: File) => Promise<{ success: boolean; url?: string; name?: string; error?: string }>;
  onSubmit: (payload: any, status: "draft" | "publish", company: { companyId: string | null; newCompany: { company_name: string; brand_name: string } | null }) => Promise<{ success: boolean; error?: string; id?: string }>;
  loadEditData?: (editId: string) => Promise<any | null>;
  // 임시저장(DRAFT) 목록 로더 — 넘기면 상단에 "임시저장 목록" 노출(관리자 직접등록 전용)
  listDrafts?: () => Promise<Array<{ id: string; title: string; company_name?: string; created_at?: string }>>;
  initialFindQuery?: string; // 외부에서 전달된 초기 검색어(회사명/URL) — 검색창에 미리 채움
}

// 공고 상단 이미지(기업 커버) 표시 전용 배너 — 한 배너에 최대 3개 균등, 3개 초과 시 ▶로 회전
// 이 문서(탭)에서 등록 화면이 이미 열린 적이 있는지. 메뉴를 눌러 화면만 갈아끼운
// 경우를 새로고침과 구분하려고 둔다. 새로고침하면 문서가 새로 뜨므로 false 로 돌아간다.
let 폼이열린적있음 = false;

export default function JobPostForm({
  mode, editId = null, listHref, companyType = null, companies = [],
  uploadImage, onSubmit, loadEditData, listDrafts, initialFindQuery = "",
}: JobPostFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  // 임시저장 목록(관리자 직접등록 전용) — 상단에서 이어쓰기
  const [drafts, setDrafts] = useState<Array<{ id: string; title: string; company_name?: string; created_at?: string }>>([]);
  const [draftMenuOpen, setDraftMenuOpen] = useState(false); // 임시저장 버튼 옆 드롭다운(목록)
  const draftMenuRef = useRef<HTMLDivElement>(null);
  const reloadDrafts = useCallback(() => {
    if (!listDrafts) return;
    listDrafts().then((d) => setDrafts(Array.isArray(d) ? d : [])).catch(() => {});
  }, [listDrafts]);
  useEffect(() => { reloadDrafts(); }, [reloadDrafts]);
  // ── 이 공고 이슈 메모(불러온 원문 URL에 매칭, DB 저장 → 클로드가 조회·수정) ──
  const [issueItems, setIssueItems] = useState<{ field: string; note: string }[]>([]);
  const [issueStatus, setIssueStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const issueTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // ── 전체 공고 이슈 개수/목록(상단 '🐞 이슈' 버튼 → 별도 페이지) ──
  const [issueList, setIssueList] = useState<{ url: string; title: string; items: { field: string; note: string }[] }[]>([]);
  const reloadIssueList = useCallback(() => {
    if (mode !== "admin") return;
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    fetch(`/api/admin/app-notes?list=jobissue`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setIssueList(res.data.items || []); })
      .catch(() => {});
  }, [mode]);
  useEffect(() => { reloadIssueList(); }, [reloadIssueList]);
  useEffect(() => {
    if (!draftMenuOpen) return;
    const onDown = (e: MouseEvent) => { if (draftMenuRef.current && !draftMenuRef.current.contains(e.target as Node)) setDraftMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [draftMenuOpen]);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // 최상단 헤더(알림종 옆)로 임시저장·미리보기 아이콘을 포탈
  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderSlot(document.getElementById("co-m-header-slot"));
  }, [isMobile]);

  // 기업설정에 등록한 커버 이미지 — 신규 공고의 상단 이미지 기본값으로 한 번만 채운다.
  //   여기서 지우거나 바꿔도 기업정보의 커버는 건드리지 않는다(공고 단위로만 저장).
  const [coverImages, setCoverImages] = useState<string[]>([]);
  const [companyProfile, setCompanyProfile] = useState<any>(null); // 기업정보 페이지 값(미리보기·공고 하단 기업정보에 사용)
  const coverSeeded = useRef(false);
  useEffect(() => {
    if (mode !== "company") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/company/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (!res.success || !res.data) return;
        const c = res.data;
        if (Array.isArray(c.cover_images)) {
          const urls = c.cover_images.map((x: any) => x?.url).filter(Boolean);
          setCoverImages(urls);
          // 수정 모드(editId)는 저장된 공고 값이 들어오므로 기본값을 덮어쓰지 않는다.
          if (!editId && !coverSeeded.current && urls.length) {
            coverSeeded.current = true;
            setBannerImages((prev) => (prev.length ? prev : urls.map((u: string) => ({ url: u, name: "기업 커버" }))));
          }
        }
        // 기업정보 페이지 값을 공고 하단 '기업정보'에 그대로 채운다(공고 상세 맨 아래에 표시됨).
        setCompanyProfile(c);
        if (!editId) {
          setNewCompanyName((v) => v || c.company_name || "");
          setNewBrandName((v) => v || c.brand_name || "");
          setNmIndustry((v) => v || c.industry || "");
          setNmHomepage((v) => v || c.website_url || "");
          setNmSize((v) => v || c.company_size || "");
          setNmFounded((v) => v || (c.founded_year ? String(c.founded_year) : ""));
          setNmRepresentative((v) => v || c.representative_name || "");
          setNmPhone((v) => v || c.company_phone || "");
          setNmDescription((v) => v || c.description || "");
          setNmAddress((v) => v || c.address || "");
          setNmAddressDetail((v) => v || c.address_detail || "");
        } else {
          // 수정 모드에서도 근무지역만은 비어 있으면 매장 주소로 채운다.
          // 공고 상세의 '근무지역'은 매장 주소를 보여주는데, 폼 칸은 비어 있어
          // "폼은 공란인데 미리보기엔 주소가 뜬다" 는 어긋남이 생겼다.
          // 값이 있는 공고는 건드리지 않는다(빈 것만 채운다).
          setNmAddress((v) => v || c.address || "");
          setNmAddressDetail((v) => v || c.address_detail || "");
        }
      })
      .catch(() => {});
  }, [mode, editId]);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyQuery, setCompanyQuery] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [showCompanyList, setShowCompanyList] = useState(false);
  const [nonMember, setNonMember] = useState(mode === "admin");
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [nmContactEmail, setNmContactEmail] = useState("");
  const [nmHomepage, setNmHomepage] = useState("");
  const [applyMethod, setApplyMethod] = useState<"MANAGED" | "EMAIL" | "REDIRECT">("MANAGED");
  const [externalApplyUrl, setExternalApplyUrl] = useState("");
  const [nmDescription, setNmDescription] = useState("");
  const [nmAddress, setNmAddress] = useState("");        // 우편번호 검색으로 채우는 기본 주소
  const [nmAddressDetail, setNmAddressDetail] = useState(""); // 동·호수 등 직접 입력
  // 저장·미리보기·지도는 상세주소까지 합친 값을 쓴다(공고 API는 address 한 필드만 받는다).
  const nmFullAddress = [nmAddress.trim(), nmAddressDetail.trim()].filter(Boolean).join(" ");
  // 주소는 자유입력이면 표기가 흔들려 지도 좌표도, 시·군·구 필터도 어긋난다.
  // 기업정보·개인 프로필과 같은 우편번호 검색으로 통일한다(팝업은 인앱 브라우저에서 닫히지 않아 레이어로 띄운다).
  const addrBoxRef = useRef<HTMLDivElement>(null);
  const [addrOpen, setAddrOpen] = useState(false);
  // 근무지가 여러 곳인 공고가 있다(지점을 함께 뽑는 브랜드 등).
  // 대표 주소는 기업 정보에 두고, 여기에는 '추가' 근무지만 담는다.
  const [extraLocations, setExtraLocations] = useState<{ address: string; detail: string }[]>([]);

  // 주소 검색은 대표 주소 칸과 추가 근무지 칸이 같이 쓴다.
  // onPick 을 넘기면 그 칸에 넣고, 안 넘기면 대표 주소에 넣는다.
  const openAddressSearch = (onPick?: (addr: string) => void) => {
    setAddrOpen(true);
    const embed = () => {
      const el = addrBoxRef.current;
      if (!el) return;
      el.innerHTML = "";
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          const base = data.roadAddress || data.jibunAddress || "";
          const withBuilding = data.buildingName ? `${base} (${data.buildingName})` : base;
          if (onPick) onPick(withBuilding);
          else {
            setNmAddress(withBuilding);
            const r = deriveRegion(withBuilding);
            if (r.length) setRegionList(r);
          }
          setAddrOpen(false);
        },
        onclose: () => setAddrOpen(false),
        width: "100%",
        height: "100%",
      }).embed(el);
    };
    setTimeout(() => {
      if ((window as any).daum?.Postcode) { embed(); return; }
      const script = document.createElement("script");
      script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
      script.onload = embed;
      document.body.appendChild(script);
    }, 0);
  };
  const [nmIndustry, setNmIndustry] = useState("");
  const [nmSize, setNmSize] = useState("");
  const [nmFounded, setNmFounded] = useState("");
  const [nmRepresentative, setNmRepresentative] = useState("");
  const [nmPhone, setNmPhone] = useState("");
  // fromSource: 불러오기가 원문에서 가져온 그림. 손으로 올린 그림과 구분해야
  // 다시 불러올 때 원문 것만 갈아끼우고 손으로 올린 것은 살릴 수 있다.
  const [bannerImages, setBannerImages] = useState<{ url: string; name: string; fromSource?: boolean }[]>([]); // 상단 배너(여러 장, 두 장씩 회전)
  // 배너 영역 버튼은 매장/기업정보 페이지와 같은 모양으로 맞춘다.
  // 모바일은 테두리·아이콘을 빼고 글자만 남겨 좁은 폭을 제목에 내준다.
  const bannerBtn = (on: boolean): CSSProperties => isMobile
    // 제목 글자 높이를 넘지 않게 작게: 테두리만 남기고 아이콘·여백을 줄인다.
    ? { display: "inline-flex", alignItems: "center", justifyContent: "center", height: 18, padding: "0 6px",
        borderRadius: 5, border: "1px solid #dcdce0", background: on ? "#f4f4f6" : "#fff",
        color: on ? "#582681" : "#777", fontSize: 11.5, lineHeight: 1, fontWeight: 500,
        cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }
    : { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 9,
        border: "1px solid #e2e2e6", background: on ? "#f4f4f6" : "#fff", color: "#666",
        fontSize: 13, fontWeight: 500, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" };
  const infoPageLabel = companyProfile?.company_type === "OFFICE" ? "기업정보" : "매장정보";
  // 배너 칸이 비어 있으면 무슨 사진을 올리는 자리인지 몰라 그냥 넘어가기 쉽다.
  // (배너는 프로필이 아니라 공고마다 이 자리에서 올린다.)
  const bannerHint = mode === "company" && bannerImages.length === 0 ? (
    <p style={{ fontSize: 12.5, color: "#999", lineHeight: 1.55, margin: "8px 0 0" }}>
      {companyProfile?.company_type === "OFFICE" ? "사무실이나 팀 사진" : "매장 내부·외관 사진"}을 올리면
      공고 맨 위에 크게 붙어요. 2장 이상 올리면 나란히 놓여 가로로 꽉 차요.
    </p>
  ) : null;
  const [nmCoverUploading, setNmCoverUploading] = useState(false);
  // 샘플 배너(사진 위에 공고 제목만) 생성 UI
  const [bannerGenOpen, setBannerGenOpen] = useState(false);
  const [bannerGenTitle, setBannerGenTitle] = useState("");
  const [bannerGenPreset, setBannerGenPreset] = useState(0);
  const [bannerGenBusy, setBannerGenBusy] = useState(false);
  const [nmManagerName, setNmManagerName] = useState("");
  const [nmManagerPhone, setNmManagerPhone] = useState("");
  const [contactMethods, setContactMethods] = useState<string[]>([]); // 지원방법: 문자·이메일·전화·뷰티워크 온라인지원(복수)
  const toggleContactMethod = (m: string) =>
    setContactMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]).sort((a, b) => CONTACT_METHOD_OPTIONS.indexOf(a) - CONTACT_METHOD_OPTIONS.indexOf(b)));
  const [contactMethodsOpen, setContactMethodsOpen] = useState(false);
  const contactMethodsRef = useRef<HTMLDivElement>(null);
  const [parseUrl, setParseUrl] = useState("");
  const [parseFail, setParseFail] = useState(""); // 모델 호출 자체가 실패했을 때만
  const [urlEditing, setUrlEditing] = useState(true); // 불러오기 후엔 URL을 링크로 표시(클릭 시 원문 새 창)
  // 회사명/URL · 글 붙여넣기 · 화면 캡처
  // 붙여넣기를 먼저 두는 이유: 카페·블로그 글은 드래그 복사가 되고,
  // 글자로 보내면 캡처(이미지)보다 훨씬 싸고 전화번호를 잘못 읽을 일도 없다.
  const [importMode, setImportMode] = useState<"url" | "paste" | "ocr">("url");
  const [pasteText, setPasteText] = useState("");
  const [importImages, setImportImages] = useState<string[]>([]); // 북마클릿이 넘긴 사진 주소
  // 상세요강 그림에서 글자를 읽을지. 켤 때만 그림이 모델로 가고 요금이 붙는다.
  // (자동저장이 이 값을 읽으므로 선언이 그 위에 있어야 한다.)
  const [importingImgs, setImportingImgs] = useState(false);
  const [ocrFiles, setOcrFiles] = useState<File[]>([]); // OCR: 여러 장 캡처 누적
  // 캡처로 등록할 때의 원문 주소(인스타 게시물·카페 글 등).
  // 이게 없으면 어디서 가져온 공고인지 기록이 안 남아, 같은 글을 두 번 올려도 못 잡는다.
  const [ocrSourceUrl, setOcrSourceUrl] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState("");
  const [siteNameWarn, setSiteNameWarn] = useState(""); // 불러온 내용에 채용사이트 이름이 섞였을 때 경고(반드시 삭제)
  // 회사명으로 공고 찾기(헤어인잡)
  const [findQuery, setFindQuery] = useState(initialFindQuery);
  const [finding, setFinding] = useState(false);
  const [findMsg, setFindMsg] = useState("");
  const [findResults, setFindResults] = useState<{ idx: number; title: string; url: string; source: string }[]>([]);
  // 검색 목록에서 특정 공고를 불러오면 상단 입력칸 대신 '선택한 공고'를 링크로 표시(클릭 시 원문 새 탭)
  const [picked, setPicked] = useState<{ title: string; url: string; source?: string } | null>(null);
  // 이슈 메모: 불러온 원문 URL이 바뀌면 그 공고의 저장된 이슈를 불러온다.
  useEffect(() => {
    if (mode !== "admin" || !picked?.url) { setIssueItems([]); setIssueStatus("idle"); return; }
    const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
    fetch(`/api/admin/app-notes?key=${encodeURIComponent(`jobissue:${picked.url}`)}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) return;
        try { const v = JSON.parse(res.data.value || "{}"); setIssueItems(Array.isArray(v.items) ? v.items : []); }
        catch { setIssueItems([]); }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picked?.url, mode]);
  // 이슈 메모 저장(디바운스) — 전체 목록을 원문 URL 키로 저장
  const saveIssues = (items: { field: string; note: string }[]) => {
    if (!picked?.url) return;
    setIssueStatus("saving");
    if (issueTimer.current) clearTimeout(issueTimer.current);
    const url = picked.url, title = picked.title;
    issueTimer.current = setTimeout(async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
        const res = await fetch(`/api/admin/app-notes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ key: `jobissue:${url}`, value: JSON.stringify({ title, items: items.filter((it) => it.field || it.note.trim()) }) }),
        });
        // fetch는 HTTP 400/500에도 예외를 안 던지므로 res.ok로 실제 성공 여부 판정(거짓 "저장됨" 방지)
        if (!res.ok) { setIssueStatus("error"); return; }
        setIssueStatus("saved");
        reloadIssueList(); // 상단 '이슈' 드롭다운 카운트·목록 갱신
      } catch { setIssueStatus("error"); }
    }, 600);
  };
  const updateIssues = (items: { field: string; note: string }[]) => { setIssueItems(items); saveIssues(items); };
  const [contactNotice, setContactNotice] = useState("");
  const [curating, setCurating] = useState(false);
  const [jobGroupType, setJobGroupType] = useState<"" | "기업" | "매장">("매장"); // 기본값 매장(관리자). 선택 전 직군·급여·복지 잠금 해제용
  const [categories, setCategories] = useState<string[]>([]);
  // 모집부문 표: 모집분야(=categories)별 경력·고용형태·급여·근무요일·근무시간·인원·성별우대.
  // shiftNego·salaryNego: 값을 정해 두고도 "협의 가능"을 따로 표시할 때. 기존 '협의'는
  // 값 자체를 지우고 그 말로 채우는 것이라, 값은 정해졌지만 조율 여지가 있다는 뜻은 못 담았다.
  // extraShifts: 요일마다 시간이 다를 때("월·수·금은 이 시간, 화·목은 저 시간") 기본
  // 근무요일/시간 한 벌로는 못 담아 추가로 쌓는 근무시간 묶음.
  // shiftText: 근무요일/시간을 원티드식으로 자유 문장 하나로 받는다("월, 수 10시-18시
  // / 금 12시-20시"). 요일 원형 버튼+근무시간 묶음 추가로 구조를 다 갖추던 방식은
  // 이 문장 하나로 대체한다. workDays/workTime/extraShifts/shiftNego 는 이 필드가
  // 생기기 전에 저장된 공고를 그대로 보여주기 위한 하위호환용으로만 남긴다.
  type ShiftSlot = { days: string; time: string };
  // salaryNego: "" 확정 / "hidden" 협의(금액 비공개) / "open" 협의(금액 제시).
  type PosRow = { career: string; education: string; employment: string; salary: string; workDays: string; workTime: string; shiftText: string; headcount: string; gender: string; location: string; shiftNego: boolean; salaryNego: "" | "open" | "hidden"; extraShifts: ShiftSlot[] };
  const emptyPos: PosRow = { career: "", education: "", employment: "", salary: "", workDays: "", workTime: "", shiftText: "", headcount: "", gender: "", location: "", shiftNego: false, salaryNego: "", extraShifts: [] };
  const [posMeta, setPosMeta] = useState<Record<string, PosRow>>({});
  // 예전에 저장해 둔 행에는 나중에 생긴 칸이 없다 — 빈 행을 바탕에 깔고 덮어 읽는다.
  // 그냥 읽으면 undefined.trim() 에서 터지고, 그게 단추를 누른 순간이라
  // 아무 일도 일어나지 않은 것처럼 보인다.
  const 행읽기 = (cat: string): PosRow => ({ ...emptyPos, ...(posMeta[cat] || {}) });
  const setPos = <K extends keyof PosRow>(cat: string, k: K, v: PosRow[K]) =>
    setPosMeta((m) => { const cur = m[cat] || emptyPos; return { ...m, [cat]: { ...cur, [k]: v } }; });
  // 같은 모집분야를 여러 행으로 쓸 수 있게(예: 헤어디자이너 신입 1 · 경력 1) 내부 키에만 "#2" 꼬리표를 붙인다.
  //   화면 표시·저장은 항상 꼬리표를 뗀 원래 분야명으로 나간다.
  const baseCat = (c: string) => c.replace(/#\d+$/, "");
  const nextDupKey = (base: string, list: string[]) => { let i = 2; while (list.includes(`${base}#${i}`)) i++; return `${base}#${i}`; };
  const MAX_POS_ROWS = 10;
  // "추가 ＋"에서 고른 분야를 새 행으로 붙인다. 이미 있는 분야면 중복 행이 된다(신입/경력 분리 모집).
  // 한 부문의 모든 단계 행에 같은 값을 넣는다 — 고용형태·근무요일/시간·학력·성별은
  // 부문 단위로 정한다(단계마다 다르면 그건 사실상 다른 부문이다).
  const set부문 = <K extends keyof PosRow>(rows: string[], k: K, v: PosRow[K]) =>
    setPosMeta((m) => { const n = { ...m }; rows.forEach((c) => { n[c] = { ...(n[c] || emptyPos), [k]: v }; }); return n; });
  const 부문조건 = ["employment", "workDays", "workTime", "shiftText", "shiftNego", "education", "gender", "location"] as const;
  const addCatRow = (base: string) => {
    if (categories.length >= MAX_POS_ROWS) { alert(`모집부문은 최대 ${MAX_POS_ROWS}행까지예요.`); return; }
    const dup = categories.some((c) => baseCat(c) === base);
    const key = dup ? nextDupKey(base, categories) : base;
    setCategories([...categories, key]);
    // 같은 분야가 이미 있으면 첫 행 값을 복제해 두고 다른 부분(경력 등)만 고치게
    const src = categories.find((c) => baseCat(c) === base);
    // 새 부문이면 앞 부문의 근무 조건을 미리 채운다 — 대개 같고, 다르면 그 카드만 고치면 된다.
    const 앞 = categories[0];
    setPosMeta((m) => {
      if (src) return { ...m, [key]: { ...(m[src] || emptyPos) } };
      if (!앞) return m;
      const a = { ...emptyPos, ...(m[앞] || {}) };
      const 물림: Partial<PosRow> = {};
      부문조건.forEach((k) => { (물림 as any)[k] = a[k]; });
      return { ...m, [key]: { ...emptyPos, ...물림 } };
    });
  };
  const removeCatRow = (cat: string) => {
    setCategories((prev) => prev.filter((c) => c !== cat));
    setPosMeta((m) => { const { [cat]: _drop, ...rest } = m; return rest; });
  };
  // 불러오기로 파싱된 경력·급여·인원을, 관리자가 모집분야를 고르면 첫 행에 채워줌(수기 재입력 방지).
  const [parsedPrimary, setParsedPrimary] = useState<PosRow | null>(null);
  const [shiftModalCat, setShiftModalCat] = useState<string | null>(null); // WorkScheduleModal 이 열린 분야
  const [cellOpen, setCellOpen] = useState<string | null>(null); // 표 셀 직접입력 팝오버 `${cat}|${field}`
  const cellInputRef = useRef<HTMLInputElement>(null); // 표 셀 직접입력 팝오버의 입력칸(주기 클릭 후 바로 타이핑되게)
  const [열린그룹, set열린그룹] = useState<string[]>([]);
  const [addRowOpen, setAddRowOpen] = useState(false); // 모집부문 '행 추가' — 분야를 골라 행을 붙임(같은 분야 중복 가능)
  // 표 안 팝오버는 화면 기준(fixed) 좌표로 띄운다. 표를 overflow visible로 바꾸면 720px 표가
  //   페이지 밖으로 넘쳐 화면 전체가 옆으로 밀리기 때문(모바일에서 특히 심함).
  const [popAt, setPopAt] = useState<{ left: number; top: number } | null>(null);
  const [cellFree, setCellFree] = useState(false); // 목록 대신 직접입력 모드
  const popTrigger = useRef<{ el: HTMLElement; width: number; height: number } | null>(null);
  const placePop = (el: HTMLElement, width: number, height: number) => {
    const r = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    // 아래 공간이 모자라면 트리거 위쪽으로 뒤집어 띄운다(모바일 하단에서 잘리지 않게).
    //   위쪽도 모자라면(내용이 큰 팝오버가 화면 중간 트리거에서 열릴 때) 무조건 위로
    //   뒤집지 않고 공간이 더 넉넉한 쪽을 골라 잘리는 걸 줄인다.
    const below = r.bottom + 4;
    const spaceBelow = window.innerHeight - 8 - below;
    const spaceAbove = r.top - 4 - 8;
    const raw = below + height > window.innerHeight - 8 && spaceAbove > spaceBelow ? r.top - height - 4 : below;
    const top = Math.max(8, Math.min(raw, window.innerHeight - height - 8)); // 항상 화면 안
    setPopAt({ left, top });
  };
  const openPopAt = (el: HTMLElement | null, width: number, height: number) => {
    if (!el) return;
    popTrigger.current = { el, width, height };
    placePop(el, width, height);
  };
  // 팝오버가 그려진 뒤 실제 크기를 재서 위치를 다시 잡는다(내용에 맞춘 폭이라 추정치와 다를 수 있음)
  // 고용형태는 한 자리에 둘 이상 걸리는 일이 흔하다(정규직·아르바이트 둘 다 받는 식).
  // 셋까지 고르게 하고, 저장은 지금까지처럼 쉼표로 이은 한 줄이다.
  const [고용열림, set고용열림] = useState<string | null>(null);
  const 고용최대 = 3;
  const popRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    const t = popTrigger.current;
    const el = popRef.current;
    if (!popAt || !t || !el) return;
    const { width, height } = el.getBoundingClientRect();
    if (Math.abs(width - t.width) < 1 && Math.abs(height - t.height) < 1) return;
    popTrigger.current = { ...t, width, height };
    placePop(t.el, width, height);
  }, [popAt]);
  // 스크롤·리사이즈에는 닫지 말고 위치만 다시 잡는다.
  //   (터치로 표를 스크롤하면 곧바로 scroll 이벤트가 떠서, 닫아버리면 팝오버가 안 열린 것처럼 보인다)
  useEffect(() => {
    if (!popAt) return;
    const onMove = () => {
      const t = popTrigger.current;
      if (!t || !t.el.isConnected) return;
      // 팝오버 안에서 입력 중이면 그대로 둔다(키보드가 뷰포트를 줄이면서 팝오버가 튀는 것 방지)
      const ae = document.activeElement as HTMLElement | null;
      if (ae?.closest?.(".poscell-pop, .posshift-pop")) return;
      placePop(t.el, t.width, t.height);
    };
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    // 회사 프로필(배너·기본정보)이 늦게 도착해 트리거 버튼이 밀리는 경우가 있다
    //   (스크롤·리사이즈가 아니라 콘텐츠 높이 변화라 위 리스너로는 못 잡는다 —
    //   "+ 누르면 그자리에서 팝오버여야 하는데 위치 내려갔어"). 본문 높이 변화를 관찰해 같이 재배치한다.
    const ro = new ResizeObserver(onMove);
    ro.observe(document.body);
    return () => { window.removeEventListener("scroll", onMove, true); window.removeEventListener("resize", onMove); ro.disconnect(); };
  }, [popAt !== null]);
  const [coverStart, setCoverStart] = useState(0); // 공고 상단 이미지 썸네일: 두 장을 넘으면 화살표로 넘길 시작 위치
  const [regionList, setRegionList] = useState<string[]>([]);
  const [regionModalOpen, setRegionModalOpen] = useState(false);
  const [regionOpen, setRegionOpen] = useState(false);
  const [regionQuery, setRegionQuery] = useState("");
  const regionInlineRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    title: "", career: "", education: "",
    type: "", deadline: "", salary: "", description: "",
    requirements: "", preferred: "", benefits: "", responsibilities: "",
    headcount: "",
  });
  const [saved, setSaved] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false); // 임시저장 완료 표시(발행완료와 구분)
  const [alwaysOpen, setAlwaysOpen] = useState(false);
  const [detailImages, setDetailImages] = useState<{ url: string; name: string; readable?: boolean; fromSource?: boolean }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [hiringProcess, setHiringProcess] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [benefitTags, setBenefitTags] = useState<string[]>([]);
  const [benefitTagOptions, setBenefitTagOptions] = useState<{ name: string; is_curated: boolean }[]>([]); // 복리후생 마스터(DB)
  const [benefitSearch, setBenefitSearch] = useState("");
  const [salaryNego, setSalaryNego] = useState(false);
  const [salaryModalOpen, setSalaryModalOpen] = useState(false);
  const [salaryDraft, setSalaryDraft] = useState("");
  const [salaryNegoDraft, setSalaryNegoDraft] = useState(false);
  const [salaryType, setSalaryType] = useState<string>("MONTHLY");     // ANNUAL/MONTHLY/WEEKLY/HOURLY
  const [salaryTypeDraft, setSalaryTypeDraft] = useState<string>("MONTHLY");
  const [salaryMax, setSalaryMax] = useState<string>("");             // 급여 상한(범위 공고). 단일이면 ""
  const [salaryByCat, setSalaryByCat] = useState<Record<string, string>>({}); // 모집분야별 급여(자유텍스트): {분야명: "월 300"}
  const salaryRef = useRef<HTMLDivElement>(null);

  // ── 쓰던 내용을 브라우저에 남긴다 ──
  //
  // 배포될 때마다 화면이 새로 뜨는데, 그때 붙여넣은 글과 불러온 값이 다 날아가
  // 처음부터 다시 해야 했다. 서버 임시저장은 버튼을 눌러야 하고, 그 전에 새로고침이
  // 나면 소용이 없다. 그래서 값이 바뀔 때마다 이 브라우저에 조용히 남긴다.
  //
  // 새로 쓰는 공고에서만 한다. 기존 공고를 고칠 때는 서버 값이 맞는 값이라,
  // 남아 있던 옛 입력이 그 위에 덮이면 안 된다.
  const AUTOSAVE_KEY = "jobpost:autosave:new";
  const autosaveReady = useRef(false);
  const snapshot = () => ({
    v: 1,
    at: new Date().toISOString(),
    form, notes, categories, posMeta, regionList, alwaysOpen, jobGroupType, extraLocations,
    detailImages, bannerImages, hiringProcess, benefitTags,
    salaryNego, salaryType, salaryMax, salaryByCat,
    pasteText, ocrSourceUrl, parseUrl, importMode, findQuery,
    // 아직 배너에 안 넣은 '가져온 사진'과 텍스트 인식 토글도 같이 남긴다.
    // 새로고침 한 번에 다시 가져오고 다시 켜야 하면 유지의 뜻이 없다.
    importImages,
    nonMember, newCompanyName, newBrandName, nmDescription, nmAddress, nmAddressDetail,
    nmIndustry, nmSize, nmFounded, nmRepresentative, nmPhone, nmHomepage,
    nmManagerName, nmManagerPhone, nmContactEmail, contactMethods,
    applyMethod, externalApplyUrl,
  });

  // 값이 바뀔 때마다 저장. 타자마다 쓰지 않도록 잠깐 모았다가 한 번 쓴다.
  useEffect(() => {
    if (editId || mode !== "admin") return;
    if (!autosaveReady.current) { autosaveReady.current = true; return; } // 복원 직후 한 번은 건너뛴다
    const t = setTimeout(() => {
      try { localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(snapshot())); } catch { /* 용량 초과 등은 무시 */ }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, notes, categories, posMeta, regionList, alwaysOpen, jobGroupType, extraLocations, detailImages, bannerImages,
      hiringProcess, benefitTags, salaryNego, salaryType, salaryMax, salaryByCat, pasteText, ocrSourceUrl,
      parseUrl, importMode, findQuery, importImages, nonMember, newCompanyName, newBrandName, nmDescription, nmAddress,
      nmAddressDetail, nmIndustry, nmSize, nmFounded, nmRepresentative, nmPhone, nmHomepage,
      nmManagerName, nmManagerPhone, nmContactEmail, contactMethods, applyMethod, externalApplyUrl, editId, mode]);

  const [restored, setRestored] = useState<string | null>(null);
  const clearAutosave = () => { try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* noop */ } setRestored(null); };

  // 화면이 뜰 때 남아 있던 내용을 되살린다.
  //
  // 되살리는 건 "같은 화면을 새로고침했을 때"뿐이다. 다른 데서 등록 화면으로
  // 넘어온 것은 새 공고를 쓰겠다는 뜻이라, 지난 내용이 남아 있으면 지우고 시작해야
  // 한다. 브라우저가 알려주는 이동 방식(reload / navigate)으로 가른다.
  const 판단함 = useRef(false);
  useEffect(() => {
    if (editId || mode !== "admin") return;
    if (판단함.current) return; // 개발 모드에서 효과가 두 번 도는 것 방지
    판단함.current = true;

    // 같은 문서 안에서 화면만 갈아끼운 경우(메뉴 클릭)도 '넘어온 것'이다.
    const 화면전환 = 폼이열린적있음;
    폼이열린적있음 = true;
    const 이동방식 = (performance.getEntriesByType?.("navigation")?.[0] as PerformanceNavigationTiming | undefined)?.type;
    if (화면전환 || 이동방식 !== "reload") {
      try { localStorage.removeItem(AUTOSAVE_KEY); } catch { /* noop */ }
      return;
    }

    let d: any = null;
    try { d = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || "null"); } catch { d = null; }
    if (!d || d.v !== 1) return;
    // 빈 껍데기는 되살릴 것이 없다.
    //
    // 여기에 항목을 빠뜨리면 저장은 됐는데 되살리지 않는다. 실제로 주소가 빠져 있어,
    // 제목을 아직 안 쓴 채 근무지역만 넣고 새로고침하면 통째로 날아갔다.
    // 그래서 낱낱이 세지 않고 "글자든 목록이든 뭐라도 들어 있으면" 으로 본다.
    const 뭔가있음 = (v: any): boolean =>
      typeof v === "string" ? !!v.trim()
      : Array.isArray(v) ? v.some(뭔가있음)
      : v && typeof v === "object" ? Object.values(v).some(뭔가있음)
      : false;
    const 살펴볼것 = ["form", "notes", "categories", "posMeta", "regionList", "extraLocations",
      "detailImages", "bannerImages", "importImages", "hiringProcess", "benefitTags",
      "pasteText", "ocrSourceUrl", "parseUrl", "findQuery",
      "newCompanyName", "newBrandName", "nmDescription", "nmAddress", "nmAddressDetail",
      "nmIndustry", "nmSize", "nmFounded", "nmRepresentative", "nmPhone", "nmHomepage",
      "nmManagerName", "nmManagerPhone", "nmContactEmail", "contactMethods", "externalApplyUrl"];
    if (!살펴볼것.some((k) => 뭔가있음(d[k]))) return;
    const set = <T,>(fn: (v: T) => void, v: T | undefined) => { if (v !== undefined && v !== null) fn(v); };
    set(setForm, d.form); set(setNotes, d.notes); set(setCategories, d.categories); set(setPosMeta, d.posMeta);
    set(setRegionList, d.regionList); set(setAlwaysOpen, d.alwaysOpen); set(setJobGroupType, d.jobGroupType);
    set(setExtraLocations, d.extraLocations);
    set(setDetailImages, d.detailImages); set(setBannerImages, d.bannerImages);
    set(setHiringProcess, d.hiringProcess); set(setBenefitTags, d.benefitTags);
    set(setSalaryNego, d.salaryNego); set(setSalaryType, d.salaryType); set(setSalaryMax, d.salaryMax); set(setSalaryByCat, d.salaryByCat);
    set(setPasteText, d.pasteText); set(setOcrSourceUrl, d.ocrSourceUrl); set(setParseUrl, d.parseUrl);
    set(setImportMode, d.importMode); set(setFindQuery, d.findQuery);
    set(setImportImages, d.importImages);
    set(setNonMember, d.nonMember); set(setNewCompanyName, d.newCompanyName); set(setNewBrandName, d.newBrandName);
    set(setNmDescription, d.nmDescription); set(setNmAddress, d.nmAddress); set(setNmAddressDetail, d.nmAddressDetail);
    set(setNmIndustry, d.nmIndustry); set(setNmSize, d.nmSize); set(setNmFounded, d.nmFounded);
    set(setNmRepresentative, d.nmRepresentative); set(setNmPhone, d.nmPhone); set(setNmHomepage, d.nmHomepage);
    set(setNmManagerName, d.nmManagerName); set(setNmManagerPhone, d.nmManagerPhone); set(setNmContactEmail, d.nmContactEmail);
    set(setContactMethods, d.contactMethods); set(setApplyMethod, d.applyMethod); set(setExternalApplyUrl, d.externalApplyUrl);
    setRestored(d.at || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, mode]);
  // 급여 표시(범위면 "연봉 3,000만원 ~ 3,300만원")
  const fmtSalary = (): string => {
    if (salaryNego) return "급여 협의";
    const min = parseInt(String(form.salary).replace(/[^0-9]/g, "")) || 0;
    if (!min) return "급여 협의";
    const unit = (salaryType === "HOURLY" || salaryType === "DAILY") ? 1 : 10000;
    const base = formatSalaryWon(min * unit, salaryType);
    const max = parseInt(String(salaryMax).replace(/[^0-9]/g, "")) || 0;
    if (max > min) return `${base} ~ ${formatSalaryWon(max * unit, salaryType).replace(/^[^0-9]*/, "")}`;
    return base;
  };
  const applySalary = () => {
    setFiSalary(""); // 위젯으로 값 지정 시 직접입력(대체값) 해제
    setSalaryNego(salaryNegoDraft);
    setSalaryType(salaryTypeDraft);
    setSalaryMax(""); // 수동 입력 시 범위 초기화(단일 값)
    setForm({ ...form, salary: salaryNegoDraft ? "" : salaryDraft });
    setSalaryModalOpen(false);
  };
  // 신규 등록 시 채용유형에 맞춰 기본 급여유형 설정(편집·불러오기로 지정된 급여유형은 덮어쓰지 않음)
  const importSalaryRef = useRef(false);
  useEffect(() => {
    if (editId) return;
    if (!jobGroupType) return; // 미선택이면 급여유형 자동설정 보류(선택 시 설정)
    if (importSalaryRef.current) { importSalaryRef.current = false; return; }
    setSalaryType(jobGroupType === "매장" ? "MONTHLY" : "ANNUAL");
    // 본사(기업)는 급여가 대부분 회사내규/면접 후 협의 → 협의를 기본값으로
    setSalaryNego(jobGroupType === "기업");
  }, [jobGroupType, editId]);
  useEffect(() => {
    if (!salaryModalOpen) return;
    const onDown = (e: MouseEvent) => {
      if (salaryRef.current && !salaryRef.current.contains(e.target as Node)) setSalaryModalOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [salaryModalOpen]);
  // 직접입력 팝오버: 바깥 클릭 시 닫기(팝오버·트리거 영역 .fi-pop 밖 클릭이면 닫음)
  const [fiOpen, setFiOpen] = useState<string | null>(null); // 열려 있는 직접입력 팝오버 키
  useEffect(() => {
    if (!fiOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement)?.closest?.(".fi-pop")) setFiOpen(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [fiOpen]);
  // 파싱값 → 모집분야 선택 시 첫 행에 시딩(한 번만)
  useEffect(() => {
    if (!parsedPrimary || categories.length === 0) return;
    const c0 = categories[0];
    setPosMeta((m) => (m[c0] && (m[c0].career || m[c0].salary || m[c0].headcount || m[c0].employment)) ? m : { ...m, [c0]: { ...emptyPos, ...parsedPrimary } });
    setParsedPrimary(null);
  }, [parsedPrimary, categories]);
  // 표 셀 직접입력 팝오버: 바깥 클릭 시 닫기
  useEffect(() => {
    if (!cellOpen) return;
    const onDown = (e: MouseEvent) => { if (!(e.target as HTMLElement)?.closest?.(".poscell-pop")) setCellOpen(null); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [cellOpen]);
  // 모집분야 고르개: 바깥 클릭 시 접기. 시간으로 닫으면 고르는 중에 닫히거나,
  // 다 고르고 나서도 한참 열려 있다 — 다른 데를 누르는 순간이 곧 다 골랐다는 뜻이다.
  useEffect(() => {
    if (열린그룹.length === 0) return;
    const onDown = (e: MouseEvent) => { if (!(e.target as HTMLElement)?.closest?.(".jp-pick")) set열린그룹([]); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [열린그룹]);
  // 고용형태 팝오버: 바깥 클릭 시 닫기
  useEffect(() => {
    if (!고용열림) return;
    const onDown = (e: MouseEvent) => { if (!(e.target as HTMLElement)?.closest?.(".jp-emp-pop")) set고용열림(null); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [고용열림]);
  // 근무요일/시간 팝오버: 바깥 클릭 시 닫기
  useEffect(() => {
    if (!shiftModalCat) return;
    const onDown = (e: MouseEvent) => { if (!(e.target as HTMLElement)?.closest?.(".posshift-pop")) setShiftModalCat(null); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [shiftModalCat]);
  // 모집분야 추가 팝오버: 바깥 클릭 시 닫기
  useEffect(() => {
    if (!addRowOpen) return;
    const onDown = (e: MouseEvent) => { if (!(e.target as HTMLElement)?.closest?.(".catpick-pop")) setAddRowOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [addRowOpen]);
  // 근무지역 인라인 자동완성: 바깥 클릭 시 닫기
  useEffect(() => {
    if (!regionOpen) return;
    const onDown = (e: MouseEvent) => {
      if (regionInlineRef.current && !regionInlineRef.current.contains(e.target as Node)) { setRegionOpen(false); setRegionQuery(""); }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [regionOpen]);
  const [deadlineModalOpen, setDeadlineModalOpen] = useState(false);
  const [deadlineDraft, setDeadlineDraft] = useState("");
  const [alwaysOpenDraft, setAlwaysOpenDraft] = useState(false);
  const deadlineRef = useRef<HTMLDivElement>(null);
  const applyDeadline = () => {
    setAlwaysOpen(alwaysOpenDraft);
    setForm({ ...form, deadline: alwaysOpenDraft ? "" : deadlineDraft });
    setDeadlineModalOpen(false);
  };
  useEffect(() => {
    if (!deadlineModalOpen) return;
    const onDown = (e: MouseEvent) => {
      if (deadlineRef.current && !deadlineRef.current.contains(e.target as Node)) setDeadlineModalOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [deadlineModalOpen]);
  const [imgModalOpen, setImgModalOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // 붙여넣기(Ctrl+V) 대상 표시 — 포커스된 드롭존을 강조해 어디로 붙는지 알려준다.
  const [pasteZone, setPasteZone] = useState<"banner" | "body" | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!imgModalOpen) return;
    const onDown = (e: MouseEvent) => {
      if (imgRef.current && !imgRef.current.contains(e.target as Node)) setImgModalOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [imgModalOpen]);
  const [welfareOpen, setWelfareOpen] = useState(false);
  const [workcondOpen, setWorkcondOpen] = useState(false);
  const welfareRef = useRef<HTMLDivElement>(null);
  const workcondRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!welfareOpen) return;
    const onDown = (e: MouseEvent) => {
      if (welfareRef.current && !welfareRef.current.contains(e.target as Node)) setWelfareOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [welfareOpen]);
  useEffect(() => {
    if (!workcondOpen) return;
    const onDown = (e: MouseEvent) => {
      if (workcondRef.current && !workcondRef.current.contains(e.target as Node)) setWorkcondOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [workcondOpen]);
  // 매장으로 바꾸면 '회사 홈페이지 지원'은 선택지에서 사라지므로, 이미 골라둔 값도 함께 정리한다.
  useEffect(() => {
    if (jobGroupType === "기업") return;
    setContactMethods((prev) => (prev.includes("회사 홈페이지 지원") ? prev.filter((m) => m !== "회사 홈페이지 지원") : prev));
  }, [jobGroupType]);
  useEffect(() => {
    if (!contactMethodsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (contactMethodsRef.current && !contactMethodsRef.current.contains(e.target as Node)) setContactMethodsOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [contactMethodsOpen]);
  // 근무 조건(매장직): 요일 / 시간 / 시간대
  const [workDays, setWorkDays] = useState<string[]>([]);
  const [workDaysNego, setWorkDaysNego] = useState(false);
  const [workDaysOpen, setWorkDaysOpen] = useState(false);
  const workDaysRef = useRef<HTMLDivElement>(null);
  const [workPeriod, setWorkPeriod] = useState(""); // 근무기간
  const [genderPref, setGenderPref] = useState(""); // 성별우대(매장 전용): 남성/여성/무관
  const [workPeriodOpen, setWorkPeriodOpen] = useState(false);
  const workPeriodRef = useRef<HTMLDivElement>(null);
  const [employOpen, setEmployOpen] = useState(false);
  const employRef = useRef<HTMLDivElement>(null);
  const [fullTimeConvertible, setFullTimeConvertible] = useState(false); // 계약직·인턴 → 정규직 전환 가능
  const [workTimeStart, setWorkTimeStart] = useState("");
  const [workTimeEnd, setWorkTimeEnd] = useState("");
  const [workTimeNego, setWorkTimeNego] = useState(false);
  // ── 비회원(관리자) 자유입력: 원문이 선택지에 안 맞을 때 그대로 입력. 채우면 저장값으로 우선 ──
  //   문자열 필드는 기존 컬럼에 override 저장, 급여·모집인원은 salary_text·headcount_text에 저장.
  const [fiEmployment, setFiEmployment] = useState(""); // 고용형태
  const [fiWorkPeriod, setFiWorkPeriod] = useState(""); // 근무기간
  const [fiWorkDays, setFiWorkDays] = useState("");     // 근무요일
  const [fiWorkTime, setFiWorkTime] = useState("");     // 근무시간
  const [fiBenefits, setFiBenefits] = useState("");     // 복리후생(콤마 구분)
  const [fiIndustry, setFiIndustry] = useState("");     // 업종
  const [fiSalary, setFiSalary] = useState("");         // 급여
  const [fiHeadcount, setFiHeadcount] = useState("");   // 모집인원
  const [workTimeOpen, setWorkTimeOpen] = useState(false);
  const workTimeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!workDaysOpen) return;
    const onDown = (e: MouseEvent) => { if (workDaysRef.current && !workDaysRef.current.contains(e.target as Node)) setWorkDaysOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [workDaysOpen]);
  useEffect(() => {
    if (!workTimeOpen) return;
    const onDown = (e: MouseEvent) => { if (workTimeRef.current && !workTimeRef.current.contains(e.target as Node)) setWorkTimeOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [workTimeOpen]);
  useEffect(() => {
    if (!workPeriodOpen) return;
    const onDown = (e: MouseEvent) => { if (workPeriodRef.current && !workPeriodRef.current.contains(e.target as Node)) setWorkPeriodOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [workPeriodOpen]);
  useEffect(() => {
    if (!employOpen) return;
    const onDown = (e: MouseEvent) => { if (employRef.current && !employRef.current.contains(e.target as Node)) setEmployOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [employOpen]);
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    if (!showPreview || mode !== "company" || companyProfile) return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("/api/company/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d?.success && d.data) setCompanyProfile(d.data); })
      .catch(() => {});
  }, [showPreview, mode, companyProfile]);
  const [isDownloading, setIsDownloading] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  // ── 모달 상태 ──────────────────────────────
  const [textModalKey, setTextModalKey] = useState<TextKey | null>(null);
  const [textModalValue, setTextModalValue] = useState("");
  const textPopRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!textModalKey) return;
    const onDown = (e: MouseEvent) => {
      if (textPopRef.current && !textPopRef.current.contains(e.target as Node)) setTextModalKey(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [textModalKey]);
  const [processModalOpen, setProcessModalOpen] = useState(false);
  const [processDraft, setProcessDraft] = useState<string[]>([]);
  const [processCustom, setProcessCustom] = useState("");
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesModalValue, setNotesModalValue] = useState("");
  const processPopRef = useRef<HTMLDivElement>(null);
  const notesPopRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!processModalOpen) return;
    const onDown = (e: MouseEvent) => {
      if (processPopRef.current && !processPopRef.current.contains(e.target as Node)) setProcessModalOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [processModalOpen]);
  useEffect(() => {
    if (!notesModalOpen) return;
    const onDown = (e: MouseEvent) => {
      if (notesPopRef.current && !notesPopRef.current.contains(e.target as Node)) setNotesModalOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [notesModalOpen]);

  useEffect(() => {
    // 업체 유형이 정해진 기업회원은 자동 지정(잠금 없음). 관리자는 미선택("")으로 시작해 직접 고르게 함.
    if (companyType === "STORE") setJobGroupType("매장");
    else if (companyType === "OFFICE") setJobGroupType("기업");
  }, [companyType]);

  useEffect(() => {
    if (!editId || !loadEditData) return;
    loadEditData(editId).then((j) => {
      if (!j) return;
      const career = j.experience_level === "NEW" ? "신입"
        : j.experience_level === "EXPERIENCED" ? "2년 이상" : "경력 무관";
      const rawType = j.employment_type
        || (j.work_type === "PART_TIME" ? "파트타임"
          : j.work_type === "CONTRACT" ? "계약직" : "정규직");
      // 저장된 "계약직 · 정규직 전환 가능" → 기본 고용형태 + 전환 체크 복원
      const convertible = typeof rawType === "string" && rawType.includes("정규직 전환 가능");
      const type = convertible ? rawType.replace(CONVERTIBLE_SUFFIX, "").trim() : rawType;
      setFullTimeConvertible(convertible);
      const loadedSalaryType = j.salary_type || (j.job_type === "STORE" ? "MONTHLY" : "ANNUAL");
      const salary = j.salary_min ? String(loadedSalaryType === "HOURLY" ? j.salary_min : j.salary_min / 10000) : "";
      setSalaryMax(j.salary_max && j.salary_max > j.salary_min ? String(loadedSalaryType === "HOURLY" ? j.salary_max : j.salary_max / 10000) : "");
      setSalaryType(loadedSalaryType);
      setForm({
        title: j.title || "", career, education: j.education || "", type,
        deadline: j.deadline ? String(j.deadline).slice(0, 10) : "",
        salary, description: j.description || "", requirements: j.requirements || "",
        preferred: j.preferred_qualifications || "", benefits: j.benefits || "",
        responsibilities: j.responsibilities || "",
        headcount: j.headcount != null ? String(j.headcount) : "",
      });
      setAlwaysOpen(!j.deadline);
      // 저장된 모집부문 행을 그대로 복원한다. 같은 분야가 여러 행이면 내부 키에 "#2"를 붙여 행을 유지.
      const savedPos = (Array.isArray(j.positions) ? j.positions : []).filter((p: any) => p?.category);
      if (savedPos.length) {
        const keys: string[] = [];
        const meta: Record<string, PosRow> = {};
        for (const p of savedPos) {
          const base = String(p.category);
          const key = keys.includes(base) ? nextDupKey(base, keys) : base;
          keys.push(key);
          // 예전엔 salaryNego 가 boolean(true=협의+금액제시) 이었다 — true 를 "open" 으로 옮긴다.
          const savedSalaryNego: "" | "open" | "hidden" = p.salaryNego === true ? "open" : (p.salaryNego === "open" || p.salaryNego === "hidden" ? p.salaryNego : "");
          meta[key] = { career: p.career || "", education: p.education || "", employment: p.employment || "", salary: p.salary || "", workDays: p.workDays || "", workTime: p.workTime || "", shiftText: p.shiftText || "", headcount: p.headcount || "", gender: p.gender || "", location: p.location || "", shiftNego: !!p.shiftNego, salaryNego: savedSalaryNego, extraShifts: Array.isArray(p.extraShifts) ? p.extraShifts.filter((s: any) => s?.days || s?.time) : [] };
        }
        setCategories(keys);
        setPosMeta(meta);
      } else {
        setCategories(j.categories || []);
        setPosMeta({});
      }
      setRegionList(j.location ? String(j.location).split(",").map((s: string) => s.trim()).filter(Boolean) : []);
      setDetailImages(j.detail_images || []);
      setExtraLocations(Array.isArray(j.work_locations) ? j.work_locations : []);
      // 공고에 저장된 상단 이미지를 그대로 복원. 빈 배열이면 '없음'을 유지(기업 커버로 되살리지 않음).
      setBannerImages(((Array.isArray(j.cover_images) ? j.cover_images : (j.company?.cover_images || [])) as any[]).map((c: any) => ({ url: c?.url, name: "배너" })).filter((x: any) => x.url));
      setHiringProcess(j.hiring_process || []);
      setNotes(j.notes || "");
      setBenefitTags(j.benefit_tags || []);
      // 근무 조건 복원
      setWorkPeriod(j.work_period || "");
      setGenderPref(j.gender_preference || "");
      if (j.work_days === "협의") { setWorkDaysNego(true); setWorkDays([]); }
      else { setWorkDaysNego(false); setWorkDays(j.work_days ? String(j.work_days).split(",").filter(Boolean) : []); }
      if (j.work_time === "협의") { setWorkTimeNego(true); setWorkTimeStart(""); setWorkTimeEnd(""); }
      else if (j.work_time && String(j.work_time).includes("~")) {
        const [st, en] = String(j.work_time).split("~");
        setWorkTimeNego(false); setWorkTimeStart(st || ""); setWorkTimeEnd(en || "");
      } else { setWorkTimeNego(false); setWorkTimeStart(""); setWorkTimeEnd(""); }
      setSalaryNego(!j.salary_min);
      setSalaryByCat(Array.isArray(j.salary_by_category) ? Object.fromEntries(j.salary_by_category.map((x: any) => [x.category, x.text])) : {});
      // 비회원 자유입력 복원: 저장값이 선택지에 없으면 자유입력 칸으로(그래야 편집 저장 시 안 사라짐 + 관리자가 인지)
      setFiSalary(j.salary_text || "");
      setFiHeadcount(j.headcount_text || "");
      setFiEmployment(type && !EMPLOYMENT_TYPES.includes(type) ? type : "");
      setFiWorkPeriod(j.work_period && !WORK_PERIODS.includes(j.work_period) ? j.work_period : "");
      setFiWorkDays(j.work_days && j.work_days !== "협의" && String(j.work_days).split(",").some((d: string) => !WORK_DAY_OPTIONS.includes(d.trim())) ? j.work_days : "");
      setFiWorkTime(j.work_time && j.work_time !== "협의" && !String(j.work_time).includes("~") ? j.work_time : "");
      if (j.job_type) setJobGroupType(j.job_type === "STORE" ? "매장" : "기업");
      if (j.company_id) setCompanyId(j.company_id);

      // 관리자 편집: 회원 공고면 회원 모드, 외부(비회원) 공고면 회사·담당자·지원방식 복원
      if (mode === "admin") {
        const isMemberJob = j.company?.is_member === true;
        setNonMember(!isMemberJob);
        if (!isMemberJob && j.company) {
          setNewCompanyName(j.company.company_name || "");
          setNewBrandName(j.company.brand_name || "");
          setNmDescription(j.company.description || "");
          setNmHomepage(j.company.website_url || "");
          {
            // 저장은 한 문자열이라, 편집할 땐 기본/상세로 되돌려 검색칸과 상세칸에 나눠 넣는다.
            const a = splitAddress(
              j.company.address ||
              [j.company.region_sido, j.company.region_sigungu].filter(Boolean).join(" ")
            );
            setNmAddress(a.base);
            setNmAddressDetail(a.detail);
          }
          setNmIndustry(j.company.industry || "");
          setNmSize(j.company.company_size || "");
          setNmFounded(j.company.founded_year ? String(j.company.founded_year) : "");
          setNmRepresentative(j.company.representative_name || "");
          setNmPhone(j.company.company_phone || "");
        }
        setNmManagerName(j.external_contact_name || "");
        setNmManagerPhone(j.external_contact_phone || "");
        setNmContactEmail(j.external_contact_email || "");
        setContactMethods(Array.isArray(j.contact_methods) ? j.contact_methods : []);
        if (["MANAGED", "EMAIL", "REDIRECT"].includes(j.apply_method)) {
          setApplyMethod(j.apply_method === "EMAIL" ? "MANAGED" : j.apply_method);
        }
        setExternalApplyUrl(j.external_apply_url || "");
      }
    }).catch(console.error);
  }, [editId, loadEditData]);

  const showTypeToggle = mode === "admin";
  // 채용유형 미선택(관리자·BOTH가 아직 안 고름) → 직군·급여·복지 입력 잠금
  const typeLocked = showTypeToggle && !jobGroupType;

  // ── 텍스트 모달 핸들러 ─────────────────────
  const openTextModal = (key: TextKey) => {
    setTextModalKey(key);
    setTextModalValue((form as any)[key] || "");
  };
  const saveTextModal = () => {
    if (textModalKey) setForm({ ...form, [textModalKey]: textModalValue });
    setTextModalKey(null);
  };

  // ── 채용절차 모달 핸들러 ───────────────────
  const openProcessModal = () => {
    setProcessDraft([...hiringProcess]);
    setProcessCustom("");
    setProcessModalOpen(true);
  };
  const togglePreset = (p: string) =>
    setProcessDraft((d) => (d.includes(p) ? d.filter((x) => x !== p) : [...d, p]));
  const addCustomStep = () => {
    const v = processCustom.trim();
    if (!v) return;
    if (processDraft.includes(v)) { setProcessCustom(""); return; }
    if (processDraft.length >= 8) { alert("채용 절차는 최대 8단계까지 추가할 수 있어요."); return; }
    setProcessDraft([...processDraft, v]);
    setProcessCustom("");
  };
  const removeDraftStep = (idx: number) =>
    setProcessDraft(processDraft.filter((_, i) => i !== idx));
  const saveProcessModal = () => {
    setHiringProcess(processDraft.map((s) => s.trim()).filter(Boolean));
    setProcessModalOpen(false);
  };

  // ── 비고 모달 핸들러 ───────────────────────
  const openNotesModal = () => { setNotesModalValue(notes); setNotesModalOpen(true); };
  const saveNotesModal = () => { setNotes(notesModalValue); setNotesModalOpen(false); };

  // 그림에 글자가 있는지 대충 가려낸다. 포스터는 흰 바탕에 검은 글씨라 밝기가
  // 양극단에 몰리고 가로줄마다 밝기가 급하게 오르내린다. 매장 사진은 그 반대다.
  // 정확한 판별이 아니라 "읽어 볼까요?" 를 먼저 권할지 정하는 용도다 — 사람이 끄고 켤 수 있다.

  // 상세요강에 붙인 그림(글자 있는 것)에서 값을 읽어 온다. 글을 붙여넣었으면 함께 보내
  // 글에 있는 값은 글을 그대로 쓰게 한다 — 그림에서 읽은 전화번호는 한 자리씩 틀린다.
  // 상세요강 그림에서 글자를 읽던 기능은 걷었다. 요금이 드는 데다, 읽어 온
   // 값이 맞는지 사람이 다시 다 봐야 해서 손이 줄지 않았다. 사진은 사진대로
   // 붙이고 글은 글로 적는다.
  const sendImageUrls: string[] = [];
  // 그림 한 장이 대략 2,000토큰. 소넷 5 입력 $2/MTok 기준 장당 6원쯤 더 붙는다.
  const imageCostWon = sendImageUrls.length * 6;

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    if (detailImages.length + files.length > 12) {
      alert("상세 이미지는 최대 12장까지 첨부할 수 있습니다."); return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const r = await uploadImage(await compressImage(file));
        if (r.success && r.url) {
          setDetailImages((prev) => [...prev, { url: r.url!, name: r.name || file.name }]);
        } else {
          alert(r.error || "이미지 업로드에 실패했습니다.");
        }
      }
    } finally {
      setUploading(false);
    }
  };
  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files || []);
    e.target.value = "";
  };
  // 클립보드(Ctrl+V)에 담긴 이미지 파일 추출 — 스크린샷·복사한 이미지 붙여넣기 지원(드롭존이 포커스일 때)
  const imagesFromClipboard = (e: ClipboardEvent): File[] => {
    const items = e.clipboardData?.items ? Array.from(e.clipboardData.items) : [];
    const out: File[] = [];
    for (const it of items) {
      if (it.kind === "file" && it.type.startsWith("image/")) {
        const f = it.getAsFile();
        if (f) out.push(f);
      }
    }
    return out;
  };
  // 비회원 기업 로고/커버 단일 업로드
  const uploadSingle = async (file: File, setUrl: (u: string) => void, setBusy: (b: boolean) => void) => {
    setBusy(true);
    try {
      const r = await uploadImage(file);
      if (r.success && r.url) setUrl(r.url);
      else alert(r.error || "이미지 업로드에 실패했습니다.");
    } finally { setBusy(false); }
  };

  // 사진을 고르면 자르기 창이 바로 뜬다. 여러 장이면 줄을 세워 한 장씩 묻는다.
  // '자르지 않고 넣기'로 넘기면 원본 그대로 올라가니, 자를 생각이 없어도 사진을 잃지 않는다.
  const [제목쓰는중, set제목쓰는중] = useState(false);
  const [자를줄, set자를줄] = useState<{ zone: "banner"; files: File[] } | null>(null);
  const 줄세우기 = (zone: "banner", fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    if (bannerImages.length + files.length > 10) { alert("배너는 최대 10장까지예요."); return; }
    set자를줄({ zone, files });
  };
  const 줄에서올리기 = async (f: File) => {
    const 줄 = 자를줄;
    if (!줄) return;
    const 남은 = 줄.files.slice(1);
    set자를줄(남은.length ? { zone: 줄.zone, files: 남은 } : null);
    await addBannerFiles([f]);
  };

  // 배너 자르기 — 실제로 찍히는 모양이 정해져 있다: 한 장이면 6:2, 여러 장이면 3:2.
  // 잠그지는 않는다(사진에 따라 꼭 필요한 데가 잘려 나간다). 점선으로 권하기만 한다.
  const [자를배너, set자를배너] = useState<{ idx: number; file: File } | null>(null);
  const 사진가져오기 = async (url: string, name: string) => {
    const r = await fetch(url);
    const b = await r.blob();
    return new File([b], name, { type: b.type || "image/jpeg" });
  };
  const 배너자르기열기 = async (idx: number) => {
    const src = bannerImages[idx];
    if (!src?.url) return;
    try { set자를배너({ idx, file: await 사진가져오기(src.url, src.name || `배너${idx + 1}.jpg`) }); }
    catch { alert("사진을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요."); }
  };
  const 배너자른뒤 = async (blob: Blob) => {
    const 대상 = 자를배너;
    set자를배너(null);
    if (!대상) return;
    setNmCoverUploading(true);
    try {
      const f = new File([blob], 대상.file.name, { type: blob.type || "image/jpeg" });
      const r = await uploadImage(await compressImage(f));
      if (r.success && r.url) {
        setBannerImages((prev) => prev.map((x, i) => (i === 대상.idx ? { url: r.url!, name: r.name || x.name } : x)));
      } else {
        alert(r.error || "이미지 업로드에 실패했습니다.");
      }
    } finally {
      setNmCoverUploading(false);
    }
  };

  // 첨부한 사진을 그 자리에서 자른다. 올린 뒤에 자르는 쪽이 낫다 — 자르기 창이 먼저 뜨면
  // 자를 생각이 없던 사람도 매번 창을 닫아야 한다.
  const [자를사진, set자를사진] = useState<{ idx: number; file: File } | null>(null);
  const 자르기열기 = async (idx: number) => {
    const src = detailImages[idx];
    if (!src?.url) return;
    try {
      set자를사진({ idx, file: await 사진가져오기(src.url, src.name || `상세${idx + 1}.jpg`) });
    } catch {
      alert("사진을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    }
  };
  const 자른뒤 = async (blob: Blob) => {
    const 대상 = 자를사진;
    set자를사진(null);
    if (!대상) return;
    setUploading(true);
    try {
      const f = new File([blob], 대상.file.name, { type: blob.type || "image/jpeg" });
      const r = await uploadImage(await compressImage(f));
      if (r.success && r.url) {
        setDetailImages((prev) => prev.map((x, i) => (i === 대상.idx ? { url: r.url!, name: r.name || x.name } : x)));
      } else {
        alert(r.error || "이미지 업로드에 실패했습니다.");
      }
    } finally {
      setUploading(false);
    }
  };
  const removeImage = (idx: number) =>
    setDetailImages((prev) => prev.filter((_, i) => i !== idx));

  // ── 배너(bannerImages) ↔ 상세 이미지(detailImages) 드래그 이동/재정렬 ──
  const imgDragRef = useRef<{ zone: "banner" | "body"; idx: number } | null>(null);
  const dropToBanner = (dropIdx: number | null = null) => {
    const src = imgDragRef.current; imgDragRef.current = null;
    if (!src) return;
    if (src.zone === "banner") {
      // 배너 내 재정렬
      if (dropIdx == null || dropIdx === src.idx) return;
      const arr = [...bannerImages];
      const [it] = arr.splice(src.idx, 1);
      arr.splice(dropIdx > src.idx ? dropIdx - 1 : dropIdx, 0, it);
      setBannerImages(arr);
    } else {
      // 본문 → 배너
      if (bannerImages.length >= 10) { alert("배너는 최대 10장까지예요."); return; }
      const body = [...detailImages];
      const moved = body[src.idx]; if (!moved) return;
      body.splice(src.idx, 1);
      const arr = [...bannerImages];
      if (dropIdx == null) arr.push(moved); else arr.splice(dropIdx, 0, moved);
      setDetailImages(body);
      setBannerImages(arr);
    }
  };
  const dropToBody = (dropIdx: number | null = null) => {
    const src = imgDragRef.current; imgDragRef.current = null;
    if (!src) return;
    if (src.zone === "body") {
      // 본문 내 재정렬
      if (dropIdx == null || dropIdx === src.idx) return;
      const arr = [...detailImages];
      const [it] = arr.splice(src.idx, 1);
      arr.splice(dropIdx > src.idx ? dropIdx - 1 : dropIdx, 0, it);
      setDetailImages(arr);
    } else {
      // 배너 → 본문
      const arr = [...bannerImages];
      const moved = arr[src.idx]; if (!moved) return;
      arr.splice(src.idx, 1);
      const body = [...detailImages];
      if (dropIdx == null) body.push(moved); else body.splice(dropIdx, 0, moved);
      setBannerImages(arr);
      setDetailImages(body);
    }
  };
  // 배너 직접 업로드(여러 장 추가)
  const addBannerFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (!files.length) return;
    if (bannerImages.length + files.length > 10) { alert("배너는 최대 10장까지예요."); return; }
    setNmCoverUploading(true);
    try {
      for (const file of files) {
        const r = await uploadImage(await compressImage(file));
        if (r.success && r.url) setBannerImages((prev) => [...prev, { url: r.url!, name: r.name || file.name }]);
        else alert(r.error || "이미지 업로드에 실패했습니다.");
      }
    } finally { setNmCoverUploading(false); }
  };

  // 샘플 배너 생성 → PNG 업로드 → 배너에 추가
  const addSampleBanner = async () => {
    const title = bannerGenTitle.trim();
    if (!title) { alert("배너에 넣을 제목을 입력하세요."); return; }
    if (bannerImages.length >= 10) { alert("배너는 최대 10장까지예요."); return; }
    setBannerGenBusy(true);
    try {
      const canvas = document.createElement("canvas");
      await drawSampleBanner(canvas, BANNER_PRESETS[bannerGenPreset] || BANNER_PRESETS[0], title);
      const blob: Blob | null = await new Promise((res) => canvas.toBlob((b) => res(b), "image/png", 0.92));
      if (!blob) { alert("배너 생성에 실패했어요."); return; }
      const file = new File([blob], `banner-${Date.now()}.png`, { type: "image/png" });
      const r = await uploadImage(file);
      if (r.success && r.url) {
        setBannerImages((prev) => [...prev, { url: r.url!, name: "샘플 배너" }]);
        setBannerGenOpen(false); setBannerGenTitle("");
      } else alert(r.error || "배너 업로드에 실패했어요.");
    } finally { setBannerGenBusy(false); }
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setIsDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight, position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${form.title || "채용공고"}.pdf`);
    } catch { alert("다운로드 중 오류가 발생했습니다."); }
    finally { setIsDownloading(false); }
  };

  const handlePrint = async () => {
    if (!previewRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const imgData = canvas.toDataURL("image/png");
      const w = window.open();
      if (w) w.document.write(`<html><head><title>채용공고 인쇄</title></head><body style="margin:0"><img src="${imgData}" style="width:100%" onload="window.print();window.close()" /></body></html>`);
    } catch { alert("인쇄 준비 중 오류가 발생했습니다."); }
  };

  const lbl: React.CSSProperties = { fontSize: 14, fontWeight: 500, color: "#444", marginBottom: 6 };
  const inp: React.CSSProperties = { width: "100%", height: 44, border: "1px solid #e0e0e0", borderRadius: 8, padding: "0 12px", fontSize: 14, boxSizing: "border-box", background: "#fff" };
  // 셀렉트: 네이티브 회색 배경 제거 → 인풋과 동일한 흰 배경 + 커스텀 화살표
  const sel: React.CSSProperties = { ...inp, appearance: "none", WebkitAppearance: "none", MozAppearance: "none", paddingRight: 34, backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" };
  // 빈 값 자리엔 흐린 회색 플레이스홀더 텍스트(칩·배경 없음). 채워지면 평체 텍스트로 노출.
  // 기업정보처럼 목록에서 고르는 항목은 '선택'(기본), 값을 직접 적는 항목은 '입력'.
  // 빈 값 자리엔 텍스트 없이 화이트톤 연보라 하이라이트 블록으로 통일(4글자 폭·텍스트 높이, 고정 px).
  const PH_BG = "#f7f7f8"; // 거의 화이트에 가까운 아주 연한 연보라
  const pick = (_label?: string) => (
    <span style={{ display: "inline-block", width: 56, height: 20, padding: 0, borderRadius: 5, background: PH_BG, verticalAlign: "middle" }} />
  );
  // 네이티브 셀렉트(경력·학력·고용형태·근무기간)도 동일 규격. 값 유무와 무관하게 높이·글자크기 고정으로 '입력 시 커짐' 방지.
  const emptySel = (filled: boolean): CSSProperties => ({
    fontSize: 15, lineHeight: "20px", height: 20,
    paddingLeft: 0, paddingRight: 0, // 좌우 패딩 없이(좁은 화면 공간 확보)
    background: filled ? "transparent" : PH_BG,
    borderRadius: filled ? 0 : 5,
    width: filled ? "auto" : 56,
  });
  // 불러온 데이터(d)를 폼 각 필드에 반영 — URL 불러오기·OCR이 공용으로 사용
  const applyParsed = (d: any) => {
      // 서버가 '모델 호출이 실패했다'고 알려 주면 띄운다. 이 말이 없으면 관리자는
      // 빈 항목을 보고 "원문에 없나 보다" 하고 그대로 등록하게 된다.
      // 뒤따라오는 성공 문구에 덮이지 않도록 별도 줄로 둔다.
      setParseFail(d?.ai_failed ? String(d.ai_failed) : "");
      // ── 불러오기는 '새 소스로 통째 교체' ── 다른 공고로 갈아탈 때 이전 값(이미지·지역·회사정보 등)이
      //    섞이지 않도록, 소스가 값을 주지 않는 항목도 먼저 비우고 시작한다.
      //    다만 손으로 올린 그림(배너·포스터)은 이 화면에서 사람이 직접 넣은 것이라 지우면 안 된다.
      //    지난번 불러오기가 원문에서 끌어온 그림만 걷어낸다.
      setBannerImages((prev) => prev.filter((b) => !b.fromSource));
      setDetailImages((prev) => prev.filter((b) => !b.fromSource));
      setRegionList([]);
      setBenefitTags([]); setHiringProcess([]); setCategories([]); setPosMeta({});
      setWorkPeriod(""); setWorkDays([]); setWorkDaysNego(false);
      setWorkTimeStart(""); setWorkTimeEnd(""); setWorkTimeNego(false);
      setSalaryNego(false); setSalaryMax(""); setNotes("");
      if (mode === "admin") {
        setNewCompanyName(""); setNewBrandName(""); setNmHomepage(""); setNmContactEmail("");
        setNmDescription(""); setNmAddress(""); setNmAddressDetail(""); setNmIndustry("");
        setNmSize(""); setNmFounded("");
        setNmRepresentative(""); setNmPhone("");
        setNmManagerName(""); setNmManagerPhone("");
      }
      // 회사 정보(회사명·홈페이지·이메일·주소·소개·업종·지원방식)는 관리자 비회원 입력에만 채움.
      // 기업회원은 자기 프로필을 쓰되, 불러온 값이 있으면 우선 반영(레이아웃 편집 단계에서 필드로 노출 예정).
      if (mode === "admin") {
        if (d.company_name) setNewCompanyName(d.company_name);
        if (d.homepage_url) setNmHomepage(d.homepage_url);
        // 담당자 연락처는 '관리자 확인용'으로만 저장(구직자 비노출). 파싱값이 있으면 채워둔다.
        if (d.contact_email) setNmContactEmail(d.contact_email);
        if (d.contact_phone) setNmManagerPhone(d.contact_phone);
        // 지원방법을 골라야 담당자 연락처 칸이 화면에 나타난다.
        // 이걸 안 채우면 번호를 읽어 와도 담을 자리가 없어 사라진 것처럼 보인다.
        {
          const ms: string[] = Array.isArray(d.contact_methods)
            ? d.contact_methods.filter((m: any) => CONTACT_METHOD_OPTIONS.includes(m)) : [];
          if (!ms.length) {
            if (d.contact_phone) ms.push("전화");
            if (d.contact_email) ms.push("이메일");
          }
          if (ms.length) setContactMethods([...new Set(ms)]);
        }
        if (d.contact_name) setNmManagerName(d.contact_name);
        // 비회원 외부 불러오기는 '관리자 대행'만 사용 → 파싱값과 무관하게 MANAGED 고정
        setApplyMethod("MANAGED");
        if (d.company_description) setNmDescription(d.company_description);
        if (d.address) { const a = splitAddress(d.address); setNmAddress(a.base); setNmAddressDetail(a.detail); }
        if (d.industry) setNmIndustry(d.industry);
        // 설립연도·사원수(기업정보) — 잡코리아 회사 소개에서 파싱된 값
        if (d.founded_year && Number(d.founded_year) > 1900) setNmFounded(String(Number(d.founded_year)));
        if (typeof d.company_size === "string" && d.company_size.trim()) setNmSize(d.company_size.trim());
        if (d.representative_name) setNmRepresentative(d.representative_name);
        if (d.company_phone) setNmPhone(d.company_phone);
        // 이미지는 "외부공고에 보이는 순서 그대로" 반영.
        //  - 갤러리(d.images)가 있으면 그걸 그대로 사용(첫 장=커버, 나머지=상세).
        //  - 없으면 대표 이미지(og:image)라도 커버로.
        const imgs: string[] = Array.isArray(d.images) ? d.images.filter(Boolean) : [];
        // 포스터형 공고(뷰티잡 등): 서버가 detail_images로 내려줌 → 배너 없이 상세 본문 이미지로 배치.
        const detailImgs: string[] = Array.isArray(d.detail_images) ? d.detail_images.filter(Boolean) : [];
        const addBanner = (urls: string[]) =>
          setBannerImages((prev) =>
            [...prev, ...urls.filter((u) => !prev.some((b) => b.url === u)).map((u) => ({ url: u, name: "배너", fromSource: true }))].slice(0, 10)
          );
        if (detailImgs.length) {
          setDetailImages((prev) =>
            [...prev, ...detailImgs.filter((u) => !prev.some((b) => b.url === u)).map((u, i) => ({ url: u, name: `이미지 ${i + 1}`, fromSource: true }))].slice(0, 12)
          );
          // 파서가 배너용 이미지(매장 사진 등)를 함께 내려주면 전부 상단 배너로.
          if (imgs.length) addBanner(imgs);
        } else if (imgs.length) {
          // d.images는 파서가 '배너(매장 사진)'로 분류한 갤러리 → 전부 상단 배너로.
          //   (기존엔 첫 장만 배너·나머지는 상세로 쪼개, 셀렉미 매장사진 여러 장이 상세요강으로 새던 버그)
          addBanner(imgs);
        } else if (d.cover_image) {
          addBanner([d.cover_image]);
        }
      }
      // 채용유형: 토글이 열려 있을 때만(관리자 또는 BOTH 기업) 불러온 값으로 변경. 타입 고정 기업회원은 유지.
      if (d.job_type && showTypeToggle) setJobGroupType(d.job_type === "STORE" ? "매장" : "기업");
      if (Array.isArray(d.hiring_process) && d.hiring_process.length) setHiringProcess(d.hiring_process);
      // 직군(칩) — 서버가 공식 목록에 맞춰 골라줌
      if (["남성", "여성", "무관"].includes(String(d.gender_preference || ""))) setGenderPref(String(d.gender_preference));
      if (Array.isArray(d.job_categories) && d.job_categories.length) setCategories(d.job_categories);
      // 우리 직군 목록에 없는 일이라도 원문에 적힌 말로 담는다.
      // 비워 두면 그 공고는 모집분야 없이 올라가 검색에도 안 걸린다.
      else if (String(d.job_category_raw || "").trim()) setCategories([String(d.job_category_raw).trim()]);
      // 근무지역 — "시도 시군구" 형식 그대로 반영
      if (d.region) setRegionList([d.region]);
      // 복리후생·근무조건 태그(칩)
      if (Array.isArray(d.benefit_tags) && d.benefit_tags.length) setBenefitTags(d.benefit_tags);
      // 마감일: 상시채용이면 토글 ON, 아니면 날짜 세팅
      const isAlways = d.always_open === true || (!d.deadline);
      setAlwaysOpen(isAlways);
      // 불러온 본문 자동 정렬: 원문 HTML에서 <p>·<br>가 줄바꿈으로 변환되며 줄 사이 빈 줄(엔터 여러 번)이 잔뜩 끼는데,
      // 이걸 그대로 두면 상세요강 행간이 과하게 벌어진다. → 줄 끝 공백 제거 + 빈 줄 모두 제거(단일 행간)로 정돈.
      const tidyText = (s: string) => s
        .replace(/\r\n?/g, "\n")
        .split("\n").map((l) => l.replace(/\s+$/g, "")).join("\n")
        .replace(/\n{2,}/g, "\n")
        .trim();
      // 텍스트 필드가 배열로 와도 안전하게 문자열로 변환 + 행간 정돈
      const asText = (v: any, fb: string) => {
        if (Array.isArray(v)) { const j = v.filter(Boolean).join("\n"); return j ? tidyText(j) : fb; }
        return (typeof v === "string" && v.trim()) ? tidyText(v) : fb;
      };
      // 불러오기는 '새 소스로 통째 교체' → 소스에 없는 항목은 이전 불러오기 잔여값을 남기지 않고 비운다.
      setForm((f) => ({
        ...f,
        title: d.title || "",
        description: asText(d.description, ""),
        deadline: isAlways ? "" : (d.deadline || ""),
        requirements: asText(d.requirements, ""),
        preferred: asText(d.preferred, ""),
        benefits: asText(d.benefits, ""),
        responsibilities: asText(d.main_duties, ""),
        career: (CAREER_OPTIONS.includes(d.career) ? d.career : ""),
        education: (EDUCATION_OPTIONS.includes(d.education) ? d.education : ""),
        // 고용형태: 폼 옵션(EMPLOYMENT_TYPES) 전체 허용 + 예전 '파트타임'은 '아르바이트'로 별칭 매핑
        type: (() => { const e = d.employment_type === "파트타임" ? "아르바이트" : d.employment_type; return EMPLOYMENT_TYPES.includes(e) ? e : ""; })(),
        headcount: (d.headcount != null && Number(d.headcount) > 0) ? String(Number(d.headcount)) : "",
      }));
      // 급여: 구조화된 값이 있으면 급여 필드에 반영, 협의/비율제면 '협의' 처리
      const salaryStructured = Number(d.salary_amount) > 0 && ["ANNUAL", "MONTHLY", "WEEKLY", "HOURLY"].includes(d.salary_type);
      if (salaryStructured) {
        importSalaryRef.current = true; // 매장 기본값(월급) useEffect가 이 값을 덮어쓰지 않게
        setSalaryType(d.salary_type);
        setSalaryNego(false);
        setForm((f) => ({ ...f, salary: String(Number(d.salary_amount)) }));
        setSalaryMax(Number(d.salary_amount_max) > Number(d.salary_amount) ? String(Number(d.salary_amount_max)) : "");
      } else if (d.salary_negotiable) {
        setSalaryNego(true);
        setSalaryMax("");
        setForm((f) => ({ ...f, salary: "" }));
      }
      // 파싱값을 모집부문 표 첫 행 시딩용으로 보관(관리자가 모집분야 고르면 채워짐)
      const salaryStr = salaryStructured
        ? `${({ ANNUAL: "연봉", MONTHLY: "월급", WEEKLY: "주급", HOURLY: "시급", DAILY: "일급" } as Record<string, string>)[d.salary_type] || ""} ${Number(d.salary_amount).toLocaleString()}${(d.salary_type === "HOURLY" || d.salary_type === "DAILY") ? "원" : "만원"}`.trim()
        : (d.salary_negotiable ? "협의" : (typeof d.salary === "string" ? d.salary : ""));
      setParsedPrimary({
        career: typeof d.career === "string" ? d.career : "",
        education: typeof d.education === "string" ? d.education : "",
        employment: (() => { const e = d.employment_type === "파트타임" ? "아르바이트" : d.employment_type; return typeof e === "string" ? e : ""; })(),
        salary: salaryStr,
        workDays: typeof d.work_days === "string" ? d.work_days : "",
        workTime: typeof d.work_time === "string" ? d.work_time : "",
        headcount: (d.headcount != null && Number(d.headcount) > 0) ? `${Number(d.headcount)}명` : "",
        gender: "",
        location: "",
        shiftNego: false,
        salaryNego: d.salary_negotiable ? "open" : "",
        shiftText: "",
        extraShifts: [],
      });
      // 근무기간 (매장 공고)
      if (typeof d.work_period === "string" && WORK_PERIODS.includes(d.work_period)) setWorkPeriod(d.work_period);
      // 근무요일 (매장 공고에 주로 필요)
      if (d.work_days === "협의") { setWorkDaysNego(true); setWorkDays([]); }
      else if (typeof d.work_days === "string" && d.work_days.trim()) {
        const parsed: string[] = (d.work_days as string).split(/[,\s·]+/).map((s) => s.trim()).filter((x) => WORK_DAY_OPTIONS.includes(x));
        const days: string[] = [...new Set(parsed)].sort((a, b) => WORK_DAY_OPTIONS.indexOf(a) - WORK_DAY_OPTIONS.indexOf(b));
        if (days.length) { setWorkDaysNego(false); setWorkDays(days); }
      }
      // 근무시간
      if (d.work_time === "협의") { setWorkTimeNego(true); setWorkTimeStart(""); setWorkTimeEnd(""); }
      else if (typeof d.work_time === "string") {
        const m = d.work_time.trim().match(/^(\d{1,2}):(\d{2})\s*~\s*(\d{1,2}):(\d{2})$/);
        if (m) { setWorkTimeNego(false); setWorkTimeStart(`${m[1].padStart(2, "0")}:${m[2]}`); setWorkTimeEnd(`${m[3].padStart(2, "0")}:${m[4]}`); }
      }
      const extraLines = [(!salaryStructured && d.salary) ? `급여: ${d.salary}` : "", d.extra_notes || ""].filter(Boolean).join("\n\n");
      if (extraLines) setNotes(extraLines);
      {
        const c: string[] = [];
        if (d.contact_phone) c.push(`전화 ${d.contact_phone}`);
        if (d.contact_email) c.push(`이메일 ${d.contact_email}`);
        setContactNotice(c.length
          ? `📞 본문에서 연락처를 찾아 ‘채용 담당자’에 넣었어요 (${c.join(" · ")}). 지원방식(관리자 대행·이메일 중계·외부 링크)을 이 연락처 기준으로 확인해 정하세요.`
          : "");
      }
      if (d.ai_parsed) {
        setParseMsg("✓ 불러왔어요. 직군·경력·지역·급여·근무조건·이미지까지 자동 반영했어요. 값만 확인하고 등록하세요.");
      } else {
        setParseMsg("⚠ AI 자동 정리에 실패해 제목·회사 등 기본 정보만 채웠어요. 다른 URL을 넣거나 OCR(화면 캡처)로 다시 시도해보세요.");
      }
      // 불러온 내용에 '채용사이트 이름'이 섞였으면 경고 — 등록 전 반드시 삭제해야 함(타 사이트 홍보문구 유입 방지).
      {
        const SITE_NAMES = /뷰티잡매니저|뷰티잡|뷰티인잡|미용인잡|헤어인잡|알바몬|잡코리아|사람인|셀렉트?미|알바천국|인크루트|워크넷|beautyjob|hairinjob|albamon|jobkorea|saramin|selectme|incruit/i;
        const scan: Record<string, any> = {
          "제목": d.title, "상세요강": d.description, "자격요건": d.requirements, "우대사항": d.preferred,
          "복리후생": d.benefits, "담당업무": d.main_duties, "회사 소개": d.company_description, "기타": d.extra_notes,
        };
        const hits: string[] = [];
        for (const [label, v] of Object.entries(scan)) {
          if (typeof v === "string") { const m = v.match(SITE_NAMES); if (m) hits.push(`${label}(“${m[0]}”)`); }
        }
        if (hits.length) {
          const msg = `⚠ 불러온 내용에 채용사이트 이름이 들어 있어요: ${hits.join(", ")}.\n등록 전 반드시 삭제하세요.`;
          setSiteNameWarn(msg);
          if (typeof window !== "undefined") window.alert(msg);
        } else {
          setSiteNameWarn("");
        }
      }
  };

  // 넘겨받은 사진을 우리 저장소로 옮겨 배너에 넣는다.
  // 카페 이미지는 다른 도메인에서 직접 못 불러오고 원본이 지워지면 같이 사라진다.
  const attachImportedImages = async () => {
    if (!importImages.length) return;
    setImportingImgs(true);
    try {
      const token = mode === "admin" ? localStorage.getItem("admin_token") : localStorage.getItem("access_token");
      const res = await fetch("/api/admin/jobs/import-images", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ urls: importImages, referer: ocrSourceUrl || undefined }),
      });
      const d = await res.json();
      if (!d.success) { setParseMsg(d.error?.message || "사진을 가져오지 못했어요."); return; }
      const got: string[] = d.data.urls || [];
      if (got.length) setBannerImages((prev) => [...prev, ...got.map((u) => ({ url: u, name: "배너" }))]);
      setImportImages([]);
      setParseMsg(`✓ 사진 ${got.length}장을 배너에 넣었어요.`);
    } finally {
      setImportingImgs(false);
    }
  };

  // 붙여넣은 글을 클로드에 보내 폼을 채운다. 캡처와 같은 규칙을 쓰지만 입력이 글자다.
  const runPaste = async () => {
    const text = pasteText.trim();
    if (!text) { setParseMsg("공고 내용을 붙여넣어 주세요."); return; }
    if (mode === "admin") { setNonMember(true); setCompanyId(null); }
    setParsing(true); setParseMsg("");
    try {
      // 연락처·주소·모집분야를 포스터 그림에만 넣는 공고가 많다. 글에 없는 값을
      // 그림에서 채우도록, 딸려 온 사진이 있으면 글과 함께 보낸다.
      //
      // 그 포스터는 구직자에게도 보여줘야 할 상세요강이다. 같은 파일을 두 번
      // 올리게 하지 않도록, 올린 김에 상세요강에도 걸어 둔다(빼려면 ×를 누르면 된다).
      const imgs: string[] = sendImageUrls;
      const token = mode === "admin" ? localStorage.getItem("admin_token") : localStorage.getItem("access_token");
      const res = await fetch("/api/admin/external-jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        // 원문 주소는 '기록용'이라 파싱에 넘기지 않는다.
        // 넘기면 서버가 그 페이지를 열어 이미지를 긁는데, 카페는 글 사진이 로그인 뒤에 있어
        // 카페 로고가 대신 딸려 오고 그게 공고 배너로 박힌다.
        body: JSON.stringify(imgs.length ? { text, image_urls: imgs.slice(0, 8) } : { text }),
      });
      const data = await res.json();
      if (!data.success) { setParseMsg(data.error?.message || "불러오지 못했어요."); return; }
      applyParsed(data.data);
      setParseMsg(imgs.length
        ? `✓ 글과 사진 ${imgs.length}장으로 채웠어요. 값을 확인해 주세요.`
        : "✓ 붙여넣은 내용으로 채웠어요. 값을 확인해 주세요.");
    } catch {
      setParseMsg("네트워크 오류가 발생했어요.");
    } finally {
      setParsing(false);
    }
  };

  // 주소만으로는 못 읽는 곳. 본문이 로그인 뒤에 있어 카페 이름·로고만 딸려 온다.
  // 막지 않으면 회사명에 카페 이름이 들어가고 엉뚱한 사진이 배너로 붙는다.
  const LOGIN_WALLED = /cafe\.naver\.com|blog\.naver\.com\/PostView|instagram\.com|facebook\.com|band\.us/i;

  const runParse = async (urlOverride?: string) => {
    const useUrl = (typeof urlOverride === "string" ? urlOverride : parseUrl).trim();
    if (!useUrl) { setParseMsg("공고 URL을 입력해주세요."); return; }
    if (LOGIN_WALLED.test(useUrl)) {
      const where = /cafe\.naver/i.test(useUrl) ? "네이버 카페" : /instagram/i.test(useUrl) ? "인스타" : "이 사이트";
      setParseMsg(`${where} 글은 주소만으로 못 읽어요. 글을 복사해 ‘글 붙여넣기’에 넣거나, 즐겨찾기의 ‘뷰티워크로 옮기기’를 쓰세요.`);
      setImportMode("paste");
      setOcrSourceUrl(useUrl);
      return;
    }
    if (mode === "admin") { setNonMember(true); setCompanyId(null); }
    setParsing(true); setParseMsg(""); setContactNotice("");
    try {
      // 관리자는 admin_token, 기업회원은 access_token 사용
      const token = mode === "admin" ? localStorage.getItem("admin_token") : localStorage.getItem("access_token");
      const res = await fetch("/api/admin/external-jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        // 상세요강에 붙인 그림 중 '읽기 켬' 인 것을 함께 보낸다. 원문 페이지에 없는
        // 연락처·주소가 포스터 그림에만 있는 공고가 많다. 토글을 켰을 때만 보낸다.
        body: JSON.stringify(
          sendImageUrls.length ? { url: useUrl, image_urls: sendImageUrls } : { url: useUrl }
        ),
      });
      const j = await res.json();
      if (!j.success) { setParseMsg(j.error?.message || "불러오기에 실패했어요."); return; }
      applyParsed(j.data);
      if (sendImageUrls.length) setParseMsg(`✓ 원문과 그림 ${sendImageUrls.length}장으로 채웠어요.`);
      if (useUrl) { setParseUrl(useUrl); setUrlEditing(false); } // 불러오기 성공 → URL을 링크로 표시
    } catch { setParseMsg("오류가 발생했습니다."); }
    finally { setParsing(false); }
  };

  // OCR: 공고 화면 캡처 이미지를 업로드→서버가 비전(Haiku)으로 읽어 폼에 반영
  const runOcr = async (file: File) => {
    if (!file) return;
    if (mode === "admin") { setNonMember(true); setCompanyId(null); }
    setParsing(true); setParseMsg(""); setContactNotice("");
    try {
      const up = await uploadImage(file);
      if (!up.success || !up.url) { setParseMsg(up.error || "이미지 업로드에 실패했어요."); return; }
      const token = mode === "admin" ? localStorage.getItem("admin_token") : localStorage.getItem("access_token");
      const res = await fetch("/api/admin/external-jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image_url: up.url }),
      });
      const j = await res.json();
      if (!j.success) { setParseMsg(j.error?.message || "이미지 인식에 실패했어요."); return; }
      applyParsed(j.data);
    } catch { setParseMsg("오류가 발생했습니다."); }
    finally { setParsing(false); }
  };

  // OCR 다중: 여러 장의 캡처를 업로드해 한 번에 인식(위→아래 순서 유지)
  const runOcrMulti = async (files: File[]) => {
    if (!files.length) return;
    if (mode === "admin") { setNonMember(true); setCompanyId(null); }
    setParsing(true); setParseMsg(""); setContactNotice("");
    try {
      const urls: string[] = [];
      for (const f of files) {
        const up = await uploadImage(f);
        if (up.success && up.url) urls.push(up.url);
      }
      if (!urls.length) { setParseMsg("이미지 업로드에 실패했어요."); return; }
      const token = mode === "admin" ? localStorage.getItem("admin_token") : localStorage.getItem("access_token");
      const res = await fetch("/api/admin/external-jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ image_urls: urls }),
      });
      const j = await res.json();
      if (!j.success) { setParseMsg(j.error?.message || "이미지 인식에 실패했어요."); return; }
      applyParsed(j.data);
      setParseMsg(`✓ ${urls.length}장 인식 완료`);
      setOcrFiles([]);
    } catch { setParseMsg("오류가 발생했습니다."); }
    finally { setParsing(false); }
  };

  // 회사명으로 헤어인잡 공고 조회 → 결과에서 '불러오기'로 자동 파싱 연결
  const runFindByCompany = async () => {
    const q = findQuery.trim();
    if (!q) { setFindMsg("회사명을 입력해주세요."); return; }
    setFinding(true); setFindMsg(""); setFindResults([]);
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch(`/api/admin/external-jobs/find-by-company?company=${encodeURIComponent(q)}&maxPages=5`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const j = await res.json();
      if (!j.success) { setFindMsg(j.error || "조회에 실패했어요."); return; }
      const jobs = (j.jobs || []) as { idx: number; title: string; url: string; source: string }[];
      setFindResults(jobs);
      setFindMsg(jobs.length ? `${jobs.length}건 찾았어요. 공고를 선택하면 자동으로 불러와요.` : "일치하는 공고가 없어요. (헤어인잡 기준)");
    } catch {
      setFindMsg("조회 중 오류가 발생했어요.");
    } finally { setFinding(false); }
  };

  // 검색 목록에서 라디오로 공고를 '선택'만 함 → 상단 검색칸에 제목 표시. 실제 불러오기는 상단 '불러오기' 버튼에서.
  const selectFoundJob = (r: { title: string; url: string; source?: string }) => {
    setPicked({ title: r.title, url: r.url, source: r.source });
    setFindQuery(r.title);
  };

  // 통합 검색: 입력값이 URL 형태면 바로 불러오기, 아니면 회사명으로 공고 검색
  const isUrlLike = (s: string) =>
    /^https?:\/\//i.test(s) || /^www\./i.test(s) || /[a-z0-9가-힣-]+\.[a-z]{2,}(\/|\?|:|$)/i.test(s);
  const runImport = () => {
    const q = findQuery.trim();
    if (!q) { setFindMsg("회사명 또는 공고 URL을 입력해주세요."); return; }
    // 목록에서 라디오로 고른 공고가 있으면(입력칸을 손대지 않았으면) 그 공고를 불러옴
    if (picked && q === picked.title.trim()) {
      setFindResults([]); setFindMsg(""); setParseUrl(picked.url); runParse(picked.url); return;
    }
    if (isUrlLike(q)) { setFindResults([]); setFindMsg(""); setParseUrl(q); setPicked({ title: q, url: q.startsWith("http") ? q : `https://${q}` }); runParse(q); }
    else { setPicked(null); runFindByCompany(); }
  };
  // 북마클릿이 넘겨준 내용(#import=...)을 받아 폼을 채운다.
  //
  // 카페 본문은 로그인 뒤에 있어 서버가 가져올 수 없다. 그래서 알바 브라우저에서
  // 보고 있는 화면의 글·사진 주소를 그대로 넘겨받는다. 주소창 뒤(#)에 실어 보내므로
  // 서버로는 가지 않고 이 화면에서만 읽힌다.
  const importedRef = useRef(false);
  useEffect(() => {
    if (importedRef.current || editId) return;
    const h = typeof window === "undefined" ? "" : window.location.hash;
    const m = h.match(/[#&]import=([^&]+)/);
    if (!m) return;
    importedRef.current = true;
    let payload: any = null;
    try {
      payload = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(m[1])))));
    } catch {
      try { payload = JSON.parse(decodeURIComponent(m[1])); } catch { payload = null; }
    }
    // 주소창에서 지워 둔다 — 새로고침할 때 또 채워지지 않게.
    history.replaceState(null, "", window.location.pathname + window.location.search);
    if (!payload) { setParseMsg("가져온 내용을 읽지 못했어요. 글을 복사해 붙여넣어 주세요."); return; }

    setImportMode("paste");
    if (payload.text) setPasteText(String(payload.text).slice(0, 16000));
    if (payload.url) setOcrSourceUrl(String(payload.url));
    if (Array.isArray(payload.images) && payload.images.length) setImportImages(payload.images.slice(0, 10));
    setParseMsg("가져왔어요. [불러오기]를 누르면 항목별로 채워집니다.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  // ?url= 로 들어오면 검색칸에 주소만 채워 두고, 불러오기는 사람이 누른다.
  // 예전엔 자동으로 한 번 불러왔는데, 들어오자마자 요금이 나가고 상세요강 그림에서
  // 글자를 읽을지 고를 틈도 없이 값이 채워져 버렸다.
  const autoRanRef = useRef(false);
  useEffect(() => {
    if (autoRanRef.current || editId) return;
    const q = (initialFindQuery || "").trim();
    if (q && isUrlLike(q)) { setOcrSourceUrl(q); autoRanRef.current = true; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFindQuery, editId]);

  // 큐레이션(관리자 전용): 현재 채워진 내용을 뷰티워크 톤·형식으로 AI가 다듬기
  const runCurate = async () => {
    const hasAny = [form.title, nmDescription, form.description, form.responsibilities, form.requirements, form.preferred, form.benefits, notes].some((v) => (v || "").trim());
    if (!hasAny) { setParseMsg("먼저 공고 내용을 채워주세요."); return; }
    setCurating(true); setParseMsg("");
    try {
      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/admin/external-jobs/curate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title, company_description: nmDescription,
          description: form.description, responsibilities: form.responsibilities,
          requirements: form.requirements, preferred: form.preferred,
          benefits: form.benefits, notes,
          job_type: jobGroupType === "기업" ? "OFFICE" : "STORE",
        }),
      });
      const j = await res.json();
      if (!j.success) { setParseMsg(j.error?.message || "큐레이션에 실패했어요."); return; }
      const d = j.data;
      if (!d.curated) { setParseMsg("⚠ 큐레이션에 실패했어요. 잠시 후 다시 시도해주세요."); return; }
      setForm((f) => ({
        ...f,
        title: d.title || f.title,
        description: d.description || f.description,
        responsibilities: d.responsibilities || f.responsibilities,
        requirements: d.requirements || f.requirements,
        preferred: d.preferred || f.preferred,
        benefits: d.benefits || f.benefits,
      }));
      if (typeof d.company_description === "string" && d.company_description.trim()) setNmDescription(d.company_description);
      if (typeof d.notes === "string" && d.notes.trim()) setNotes(d.notes);
      setParseMsg("✓ 큐레이션 완료 — 내용을 뷰티워크 톤으로 다듬었어요. 확인 후 등록하세요.");
    } catch { setParseMsg("오류가 발생했습니다."); }
    finally { setCurating(false); }
  };

  const handleSubmit = async (status: "draft" | "publish") => {
    // 비회원(관리자 대행) 공고는 관리자가 자유롭게 대행 등록 → 필수 검증 없이 등록 허용.
    const isNmAdmin = mode === "admin" && nonMember;
    if (mode === "admin" && !nonMember && !companyId) { alert("기업을 선택해주세요."); return; }
    // 추가 근무지의 지역도 함께 담아야 그 지역으로 찾는 사람에게도 보인다.
    const extraRegions = extraLocations.flatMap((l) => deriveRegion([l.address, l.detail].filter(Boolean).join(" ")));
    const effRegions = [...new Set([...(regionList.length ? regionList : deriveRegion(nmFullAddress)), ...extraRegions])];
    if (!isNmAdmin) {
      if (showTypeToggle && !jobGroupType) { alert("채용유형(매장/본사)을 선택해주세요."); return; }
      if (!form.title.trim()) { alert("공고 제목을 입력해주세요."); return; }
      if (categories.length === 0) { alert("모집분야를 선택해주세요."); return; }
      // 주소를 붙여넣거나 임시저장에서 복원하면 입력 onChange가 안 타 regionList가 비어 있을 수 있다.
      //   저장 시점에 주소에서 한 번 더 뽑아 쓴다.
      if (effRegions.length === 0) {
        alert(nmFullAddress
          ? "근무지역 주소에 시·군·구가 들어가게 입력해주세요. (예: 서울 금천구 벚꽃로 40)"
          : "근무지역(주소)을 입력해주세요.");
        return;
      }
      // 근무조건 필수(발행 시). 경력·고용형태·급여·근무요일/시간·인원은 모집부문 표에서 분야별(협의·미정 허용)이라 하드 필수 아님.
      if (status === "publish") {
        if (detailImages.length === 0
            && !["description", "responsibilities", "requirements", "preferred"]
                 .some((k) => String((form as any)[k] || "").trim())) {
          alert("상세요강에 사진이나 글 중 하나는 넣어주세요.");
          return;
        }
        if (benefitTags.length === 0 && !fiBenefits.trim()) { alert("복리후생을 1개 이상 선택해주세요."); return; }
        // 아래 둘도 제목에 별표를 달았다 — 화면과 같은 기준으로 막는다.
        if (bannerImages.length === 0) { alert("공고배너 이미지를 1장 이상 넣어주세요."); return; }
        if (contactMethods.length === 0) { alert("지원방법을 1개 이상 선택해주세요."); return; }
      }
      // 마감일: 날짜 선택 또는 상시채용 필수
      if (status === "publish" && !alwaysOpen && !form.deadline) {
        alert("마감일을 선택하거나 상시채용을 체크해주세요.");
        return;
      }
    }

    // 모집부문 표(positions) — 부문마다 경력·고용형태·급여·근무요일/시간·인원·성별우대를
    // 따로 담는다. 같은 날 같은 시간에 다 뽑는 게 아니라 자리마다 다르다.
    // 필터·호환용 대표값은 첫 행에서 유도.
    const positions = categories.map((c) => { const r = 행읽기(c); return { category: baseCat(c), career: r.career.trim(), education: r.education.trim(), employment: r.employment.trim(), salary: r.salary.trim(), workDays: r.workDays.trim(), workTime: normWorkTime(r.workTime), headcount: r.headcount.trim(), gender: r.gender.trim(), location: r.location.trim(), shiftNego: r.shiftNego, salaryNego: r.salaryNego, shiftText: r.shiftText.trim(), extraShifts: r.extraShifts.map((s) => ({ days: s.days.trim(), time: normWorkTime(s.time) })).filter((s) => s.days || s.time) }; });
    // 발행 시 꼭 있어야 하는 것은 모집분야뿐이다.
    //
    // 고용형태는 원문에 아예 언급이 없는 공고가 흔하다. 필수로 두면 관리자가 없는
    // 값을 골라 채우게 되는데, 그건 "원문에 없으면 공란" 원칙과 정면으로 어긋난다
    // (파서 쪽은 근거 없는 값을 코드로 지우고 있는데 폼이 도로 채우게 하는 꼴).
    // 경력·급여·근무요일도 마찬가지라, 비면 화면에서 "협의"·"상세요강 참조"로 보인다.
    if (status === "publish" && categories.length === 0) {
      alert("모집분야를 1개 이상 선택해주세요.");
      return;
    }
    // 직급은 필수 — 화면에서 별표를 달고 아래 칸을 잠가 두었으니 발행도 같은 기준으로 막는다.
    if (status === "publish") {
      const 빈직급 = positions.find((p) => !p.career);
      if (빈직급) {
        alert(`${빈직급.category}의 직급을 선택해주세요.`);
        return;
      }
    }
    const p0 = positions[0] || { career: "", education: "", employment: "", headcount: "", workDays: "", workTime: "", gender: "" };
    const primaryHeadcount = parseInt((p0.headcount || "").replace(/[^0-9]/g, "")) || null;
    // 모집부문 표의 '경력/직책'을 공고 필터(신입·경력직·경력무관)로 옮긴다.
    // 첫 행만 보면 '신입+경력' 처럼 섞인 공고가 한쪽으로만 잡히므로 모든 행을 본다.
    // 직책(매니저·실장·부원장·원장)은 신입에게 주지 않는 자리라 경력직으로 센다.
    const careers = positions.map((p) => p.career).filter(Boolean);
    const isNew = (c: string) => c.includes("신입");
    const isExp = (c: string) => /\d+\s*년/.test(c) || c.includes("경력") || /매니저|실장|부원장|원장|점장/.test(c);
    const anyFree = careers.some((c) => c.includes("무관"));
    const anyNew = careers.some(isNew);
    const anyExp = careers.some((c) => !isNew(c) && isExp(c));
    const expLevel = anyFree || (anyNew && anyExp) ? "ANY"
      : anyNew ? "NEW"
      : anyExp ? "EXPERIENCED" : "ANY";
    // 고용형태는 여럿을 쉼표로 잇는다 — 공고 하나에 붙는 대표값은 첫 번째로 잡는다.
    const 대표고용 = String(p0.employment || "").split(",")[0].trim();
    const workType = (대표고용 === "아르바이트" || 대표고용 === "스페어") ? "PART_TIME"
      : 대표고용 === "계약직" ? "CONTRACT" : "FULL_TIME";
    let salaryMin: number | null = null;
    let salaryMaxVal: number | null = null;
    if (!salaryNego && form.salary) {
      const n = parseInt(String(form.salary).replace(/[^0-9]/g, ""));
      const wonUnit = (salaryType === "HOURLY" || salaryType === "DAILY");
      if (n > 0) salaryMin = wonUnit ? n : n * 10000;
      const mx = parseInt(String(salaryMax).replace(/[^0-9]/g, "")) || 0;
      if (mx > n) salaryMaxVal = wonUnit ? mx : mx * 10000;
    }

    const payload: any = {
      title: form.title,
      job_type: jobGroupType === "기업" ? "OFFICE" : "STORE",
      description: form.description || null,
      requirements: form.requirements || null,
      preferred_qualifications: form.preferred || null,
      // 복리후생 자유입력이 있으면 텍스트 컬럼에도 줄바꿈으로 저장(공개 상세가 benefits 텍스트를 표시)
      benefits: fiBenefits.trim() ? fiBenefits.split(",").map((s) => s.trim()).filter(Boolean).join("\n") : (form.benefits || null),
      responsibilities: form.responsibilities || null,
      education: p0.education || null, // 모집부문 표 첫 행 기준
      salary_min: salaryMin, salary_max: salaryMaxVal,
      salary_type: salaryMin ? salaryType : null,
      salary_text: fiSalary.trim() || null, // 비회원 자유입력(예: "추후협의") — 있으면 표시 우선
      positions: positions.length ? positions : null, // 모집부문 표(분야별 경력·급여·인원)
      location: effRegions.join(", ") || null,
      // 이 공고의 근무지 주소. 기본값은 매장 프로필 주소를 채워 두지만, 회원이 여기서
      // 고치면 이 공고에만 적용된다 — 매장 프로필은 매장 설정에서만 바뀐다.
      address: nmFullAddress.trim() || null,
      work_locations: extraLocations.filter((l) => l.address.trim()).length
        ? extraLocations.filter((l) => l.address.trim())
        : null,
      work_type: workType,
      // 자유입력(fi*)이 채워졌으면 그 값으로 override(비회원 원문 보존). 비어 있으면 기존 위젯 값.
      employment_type: p0.employment || null, // 모집부문 표 첫 행 기준(대표값)
      experience_level: expLevel,
      benefit_tags: fiBenefits.trim() ? fiBenefits.split(",").map((s) => s.trim()).filter(Boolean) : benefitTags,
      work_period: fiWorkPeriod.trim() || workPeriod || null,
      work_days: p0.workDays || null,
      work_time: p0.workTime || null,
      work_time_slots: null,
      deadline: form.deadline || null,
      headcount: primaryHeadcount,
      headcount_text: fiHeadcount.trim() || null, // 비회원 자유입력(예: "인원미정") — 있으면 표시 우선
      gender_preference: p0.gender || null, // 모집부문 표 첫 행 기준
      categories: [...new Set(categories.map(baseCat))],
      detail_images: detailImages,
      hiring_process: hiringProcess.filter((s) => s.trim()),
      notes: notes.trim() || null,
      apply_method: applyMethod,
      external_apply_url: externalApplyUrl.trim() || null,
      external_contact_email: 낼담당.메일 || null,
      external_contact_name: 낼담당.이름 || null,
      external_contact_phone: 낼담당.전화.replace(/\D/g, "") || null,
      contact_methods: contactMethods,
      // 불러온 원문 URL 저장 → 이후 파서 개선 시 일괄 재파싱·백필 가능(picked.url 우선)
      source_url: (picked?.url || parseUrl || ocrSourceUrl || "").trim() || null,
      // 공고 전용 상단 이미지. 기업회원이 여기서 지워도 기업정보의 커버는 그대로 둔다.
      //   (빈 배열이면 '이 공고는 상단 이미지 없음'으로 저장)
      ...(mode === "company" ? { cover_images: bannerImages.map((b) => ({ url: b.url })) } : {}),
    };

    const company: any = nonMember
      ? { companyId: null, newCompany: { company_name: newCompanyName.trim(), brand_name: newBrandName.trim(), homepage_url: nmHomepage.trim(), contact_email: nmContactEmail.trim(), description: nmDescription.trim(), address: nmFullAddress, industry: fiIndustry.trim() || nmIndustry, company_size: nmSize, founded_year: nmFounded, representative_name: nmRepresentative.trim(), company_phone: nmPhone.replace(/\D/g, ""), logo_url: null, cover_images: bannerImages.map((b) => ({ url: b.url })) } }
      : { companyId, newCompany: null };
    const result = await onSubmit(payload, status, company);
    if (!result.success) {
      alert(result.error || (editId ? "공고 수정에 실패했습니다." : "공고 등록에 실패했습니다."));
      return;
    }
    // 관리자 직접등록 임시저장: 목록으로 나가지 않고 이 페이지에 머문다.
    //  · 신규 → 저장된 draft 편집 모드(?id=)로 전환해 이 페이지 유지 + 재저장 시 중복 방지(PATCH)
    //  · 기존 draft → 그대로 머물며 상단 임시저장 목록만 갱신
    if (mode === "admin" && status === "draft") {
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 1800);
      if (!editId && result.id) {
        setTimeout(() => router.push(`${pathname}?id=${result.id}`), 600);
      } else {
        reloadDrafts();
      }
      return;
    }
    setSaved(true);
    clearAutosave(); // 등록됐으니 브라우저에 남겨 둔 내용은 지운다
    setTimeout(() => router.push(listHref), 1000);
  };

  // ── 복리후생: DB 마스터 태그 + 검색/자동완성 + 새 태그 소프트 등록 ─────────────
  const benefitJobType = jobGroupType === "기업" ? "OFFICE" : jobGroupType === "매장" ? "STORE" : "";
  const benefitAuthToken = () => (typeof window !== "undefined" ? localStorage.getItem(mode === "admin" ? "admin_token" : "access_token") : null);
  useEffect(() => {
    if (!benefitJobType) return;
    fetch(`/api/benefit-tags?job_type=${benefitJobType}`, { headers: { Authorization: `Bearer ${benefitAuthToken()}` } })
      .then((r) => r.json())
      .then((res) => { if (res.success) setBenefitTagOptions(res.data.items || []); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [benefitJobType, mode]);
  const toggleBenefit = (b: string) => {
    setFiBenefits(""); // 태그 선택 시 직접입력(대체값) 해제
    setBenefitTags(benefitTags.includes(b) ? benefitTags.filter((x) => x !== b) : [...benefitTags, b]);
  };
  // 목록에 없는 복리후생 직접 추가 → 선택 + DB에 소프트 등록(관리자 검수 대상)
  const addNewBenefit = async (raw: string) => {
    const name = raw.replace(/\s+/g, " ").trim();
    if (!name || name.length > 40) return;
    // 한글 조합이 끝나기 전에 Enter 를 누르면 '명절귀향ㅂ' 처럼 자모가 남는다. 그대로 등록하지 않는다.
    if (/[ㄱ-ㅎㅏ-ㅣ]/.test(name)) { alert("글자가 덜 입력됐어요. 다시 입력해주세요."); return; }
    setFiBenefits(""); // 태그 추가 시 직접입력(대체값) 해제
    if (!benefitTags.includes(name)) setBenefitTags([...benefitTags, name]);
    setBenefitSearch("");
    if (!benefitTagOptions.some((o) => o.name === name)) setBenefitTagOptions((prev) => [{ name, is_curated: false }, ...prev]);
    try {
      await fetch(`/api/benefit-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${benefitAuthToken()}` },
        body: JSON.stringify({ name, job_type: benefitJobType || "BOTH" }),
      });
    } catch { /* 등록 실패해도 이 공고엔 선택된 채로 유지 */ }
  };

  // 직접 추가한 태그 삭제 — 오타로 만든 값을 스스로 지운다(공용 검수 태그는 대상 아님).
  const removeNewBenefit = async (name: string) => {
    if (!confirm(`'${name}'을(를) 목록에서 지울까요?`)) return;
    try {
      const res = await fetch(`/api/benefit-tags?name=${encodeURIComponent(name)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${benefitAuthToken()}` },
      });
      const d = await res.json().catch(() => ({}));
      if (!d.success) { alert(d.error?.message || "지우지 못했어요."); return; }
      setBenefitTagOptions((prev) => prev.filter((o) => o.name !== name));
      setBenefitTags((prev) => prev.filter((t) => t !== name));
    } catch {
      alert("네트워크 오류가 발생했습니다.");
    }
  };

  // 전체 주소 문자열에서 필터용 근무지역(시도 시군구)을 추출
  const deriveRegion = (addr: string) => {
    const SIDO_MAP: Record<string, string> = { 서울: "서울특별시", 부산: "부산광역시", 대구: "대구광역시", 인천: "인천광역시", 광주: "광주광역시", 대전: "대전광역시", 울산: "울산광역시", 세종: "세종특별자치시", 경기: "경기도", 강원: "강원특별자치도", 충북: "충청북도", 충남: "충청남도", 전북: "전북특별자치도", 전남: "전라남도", 경북: "경상북도", 경남: "경상남도", 제주: "제주특별자치도" };
    const m = (addr || "").match(/(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\S*\s*([가-힣]+[시군구])/);
    return m ? [`${SIDO_MAP[m[1]] || m[1]} ${m[2]}`] : [];
  };
  // 이 공고에 등록된 근무지들 — 시/구까지만. 카드에서 부문마다 고르게 할 목록이다.
  const 짧은지역 = (r: string) => r.replace(/(특별자치도|특별자치시|특별시|광역시|도)\s/, " ").trim();
  const 근무지목록 = [...new Set(
    [nmFullAddress, ...extraLocations.map((l) => [l.address, l.detail].filter(Boolean).join(" "))]
      .flatMap((a) => deriveRegion(a)).map(짧은지역))];

  // ── 텍스트 항목 메타 ───────────────────────
  const benefitsLabel = jobGroupType === "매장" ? "근무조건·복지" : "복리후생";
  // 모집부문 표 셀 스타일
  // 13.5px — 실제 미리보기(JobDetailView) 표와 같은 크기. 여기서 잘리지 않으면
  // 거기서도 잘리지 않는다. 글자 크기가 다르면 여기서 안 잘려 보여도 막상
  // 등록하면 잘릴 수 있어, 폼만 보고는 미리 알 수 없었다.
  // 칸 사이 경계가 없으니 여러 줄로 접힌 값(근무요일/시간·급여)이 어느 줄까지 한 칸인지
  // 구분이 안 됐다("테이블 라인을 만들 수 있나"). 흐린 회색 선으로 칸을 나눈다.
  const thc: React.CSSProperties = { textAlign: "center", padding: "0 4px 5px", fontSize: 13.5, color: "#8a8a90", fontWeight: 400, whiteSpace: "nowrap", borderBottom: "1px solid #e4e4e8", borderRight: "1px solid #e4e4e8" };
  const reqStar = <span style={{ color: "#e74c3c", marginLeft: 2 }}>*</span>; // 필수 열 표시(모집분야만)
  const tdc: React.CSSProperties = { padding: "9px 4px", borderBottom: "1px solid #e4e4e8", borderRight: "1px solid #e4e4e8", verticalAlign: "middle" };
  // 첫 열 왼쪽 여백 — 표에 테두리를 두르기 전엔 0으로 비워 위 라벨과 시작점을
  // 맞췄는데, 테두리가 생긴 뒤로는 글자가 선에 바로 붙어 보였다("문제성이
  // 왼쪽 테두리하고 딱 붙었어 · 1칸정도 띄어줘").
  const firstCol: React.CSSProperties = { paddingLeft: 10 };
  const cellInput: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #efeff1", borderRadius: 6, padding: "5px 8px", fontSize: 13.5, background: "#fff" };
  // 근무시간 숫자 입력: 타이핑 중에는 숫자·콜론만 남기고, 칸을 벗어날 때 HH:MM으로 정리한다.
  //   "9"→09:00, "930"→09:30, "0930"→09:30, "2000"→20:00 (24시 넘거나 60분 넘으면 잘라 맞춤)
  // 전화번호에 하이픈을 넣어 준다. 저장할 때는 숫자만 남기므로 화면 표기만 바뀐다.
  //   02 는 지역번호가 두 자리, 나머지는 세 자리다.
  const 전화꼴 = (v: string) => {
    const d = (v || "").replace(/\D/g, "").slice(0, 11);
    const 서울 = d.startsWith("02");
    const 앞 = 서울 ? 2 : 3;
    if (d.length <= 앞) return d;
    if (d.length <= 앞 + 4) return `${d.slice(0, 앞)}-${d.slice(앞)}`;
    return `${d.slice(0, 앞)}-${d.slice(앞, d.length - 4)}-${d.slice(-4)}`;
  };
  const fmtTime = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    if (!d) return "";
    const h = parseInt(d.length <= 2 ? d : d.slice(0, d.length - 2), 10);
    const m = d.length <= 2 ? 0 : parseInt(d.slice(-2), 10);
    if (isNaN(h)) return "";
    return `${String(Math.min(23, h)).padStart(2, "0")}:${String(Math.min(59, isNaN(m) ? 0 : m)).padStart(2, "0")}`;
  };
  // 저장·미리보기 시 한 번 더 정리 — 입력 직후 칸을 벗어나지 않고 바로 등록해도 09:30 형태로 나가게
  const normWorkTime = (v: string) => {
    const t = (v || "").trim();
    if (!t || !t.includes("~")) return t;
    const [a, b] = t.split("~");
    const f = (x: string) => (/^\d{1,4}$/.test((x || "").trim()) ? fmtTime(x) : (x || "").trim());
    const st = f(a), en = f(b);
    return st || en ? `${st}~${en}` : "";
  };
  const cellSelect: React.CSSProperties = { width: "100%", minHeight: 24, boxSizing: "border-box", border: "none", borderRadius: 5, padding: "3px 6px", fontSize: 13.5, WebkitAppearance: "none", appearance: "none", cursor: "pointer" };
  // 값이 없으면 연보라 자리표시, 채우면 배경 없이 글자만(테두리는 쓰지 않음)
  const cellFill = (filled: boolean): React.CSSProperties => ({ background: filled ? "transparent" : PH_BG });
  // 클릭-선택 셀: 옵션 있으면 드롭다운(+비회원 '직접입력…'). 값이 목록에 없으면 클릭 텍스트→팝오버. 급여처럼 옵션 없으면 항상 팝오버.
  // 급여 앞머리 교체: "월 300" 에서 주기만 바꿔도 금액은 남는다. 협의였으면 금액 없이 시작.
  const withSalaryUnit = (cur: string, prefix: string) => {
    const rest = cur.replace(/^\s*[시일주월연]\s*/, "").replace(/^협의\s*$/, "").trim();
    return rest ? `${prefix} ${rest}` : `${prefix} `;
  };
  // 근무요일/시간 표시 문구. shiftText(원티드식 자유 문장)가 있으면 그대로 쓰고,
  // 아직 그 필드가 없던 예전 공고(수정 진입)는 구조화 필드로 최대한 문장을 만들어 보여준다.
  // 급여는 "월 320만원 이상" 같은 한 줄로 저장된다(공개 화면·검색이 그 모양을 읽는다).
  // 화면에서는 형태·금액·기준 셋으로 나눠 받고, 저장할 때 다시 한 줄로 잇는다.
  // 시급·일급은 원, 나머지는 만 원으로 받는다 — 시급을 만 원으로 받으면 0.95 같은
  // 소수를 적어야 하고, 월급을 원으로 받으면 0을 여섯 개 세야 한다.
  const 원단위 = (형태: string) => 형태 === "시급" || 형태 === "일급";
  const 급여단위 = (형태: string) => (원단위(형태) ? "원" : "만원");
  const 급여읽기 = (v: string) => {
    const u = SALARY_UNITS.find((x) => v.startsWith(x.prefix) || v.startsWith(x.label));
    // 예전 공고는 '일급 14만원'처럼 단위가 다를 수 있다 — 지금 쓰는 단위로 옮겨 읽는다.
    const m = v.match(/([\d,.]+)\s*(만원|원)/);
    const 원값 = m ? Number(m[1].replace(/,/g, "")) * (m[2] === "만원" ? 10000 : 1) : null;
    const 금액 = 원값 == null ? ""
      : 원단위(u?.label || "") ? String(원값) : String(원값 / 10000);
    // 금액을 적기 전까지는 '이상'으로 둔다 — 문자열에 '이상'은 금액이 있어야 붙기 때문에,
    // 형태만 고른 상태에서 '정액'으로 뒤집혀 보이던 것을 막는다(기존 공고도 대부분 '이상'이다).
    return { 형태: u?.label || "", 금액, 이상: 금액 ? /이상/.test(v) : true };
  };
  const 급여쓰기 = (형태: string, 금액: string, 이상: boolean) => {
    if (!형태 && !금액) return "";
    const p = SALARY_UNITS.find((x) => x.label === 형태)?.prefix || "";
    const [정수, 소수] = String(금액).split(".");
    const n = 금액
      ? `${Number(정수 || 0).toLocaleString()}${소수 != null ? `.${소수}` : ""}${급여단위(형태)}`
      : "";
    return [p, n, 이상 && n ? "이상" : ""].filter(Boolean).join(" ");
  };
  const shiftDisplay = (row: PosRow): string => {
    if (row.shiftText) return row.shiftText;
    if (!row.workDays && !row.workTime) return "";
    if (row.workDays === "협의" && row.workTime === "협의") return "협의";
    const parts = [row.workDays, row.workTime].filter(Boolean);
    const extra = row.extraShifts.map((s) => [s.days, s.time].filter(Boolean).join(" ")).filter(Boolean);
    return [parts.join(" "), ...extra].filter(Boolean).join(" / ");
  };
  // 표 셀 입력: iOS 네이티브 select 피커가 화면 절반을 덮을 만큼 커서, 목록도 자체 팝오버로 띄운다.
  //   options가 있으면 컴팩트 목록, units(급여)면 지급주기 칩, 그 외에는 자유입력.
  const posCell = (cat: string, field: keyof PosRow, options: string[], ph = "직접 입력", allowFi = true, units?: typeof SALARY_UNITS, wrap = false, nego: "" | "open" | "hidden" = "", onNegoChange?: (v: "" | "open" | "hidden") => void) => {
    const v = 행읽기(cat)[field] as string;
    // 협의를 셋으로 나눈다 — "확정"(그대로 노출), "비공개 협의"(금액은 감추고
    // '협의'만), "제시 협의"(금액을 보여주고 조율 여지도 표시, 예전의 '협의+').
    // 값을 지우고 그 자리를 '협의'로 바꿔치기하던 예전 방식은 이미 적어 둔
    // 급여를 날려 버리는 사고로 이어져 없앴다 — 값은 그대로 두고 표시만 바뀐다.
    // 협의 여지를 값과 나란히 "(협의)"로 붙이면 표에서도 금액의 일부처럼 읽힌다
    // (공개 화면과 같은 이유). 아래 줄에 "협의가능"으로 뗀다.
    const shown = nego === "hidden" ? "협의"
      : nego === "open" ? (v && v !== "협의" ? <>{v}<div>협의가능</div></> : "협의")
      : v;
    const key = `${cat}|${field}`;
    const open = cellOpen === key;
    const freeInput = options.length === 0 || cellFree;      // 목록 없는 칸이거나 '직접입력'을 고른 상태
    // 급여는 "300"(확정) · "300~"(이상) · "300~350"(범위) 세 가지 형태가 섞여 쓰인다.
    // 최소·최대 두 칸으로 나눠 받고, 최대를 비운 채로 "이상" 표시만 고를 수 있게 한다.
    // 급여유형을 아직 안 골랐으면 매장은 월급, 본사는 연봉을 기본으로 삼는다 — 숫자만
    // 입력해도 그 단위가 자동으로 붙는다.
    const salaryPrefix = units ? (v.match(/^\s*([시일주월연])\s*/)?.[1] || (jobGroupType === "매장" ? "월" : "연")) : "";
    const salaryRest = units ? v.replace(/^\s*[시일주월연]\s*/, "") : "";
    const salaryParts = units ? salaryRest.match(/^(\d+)(~)?(\d*)$/) : null;
    const sMin = salaryParts ? salaryParts[1] : "";
    const sMax = salaryParts ? salaryParts[3] : "";
    const sOpenEnded = salaryParts ? !!salaryParts[2] : false;
    const buildSalary = (min: string, max: string, openEnded: boolean) => {
      const body = !min ? "" : max ? `${min}~${max}` : (openEnded ? `${min}~` : min);
      return salaryPrefix ? (body ? `${salaryPrefix} ${body}` : `${salaryPrefix} `) : body;
    };
    const width = units ? 214 : 168;
    const height = freeInput ? (units ? (onNegoChange ? 210 : 168) : 88) : Math.min(options.length + (allowFi && nonMember ? 1 : 0), 7) * 30 + 14;
    return (
      <span className="poscell-pop" style={{ position: "relative", display: "block" }}>
        {/* 빈 칸은 옅은 밑줄과 ▾ 로 "누르면 목록이 뜬다"만 알린다. 회색 덩어리는
            비었다는 말만 할 뿐 누를 수 있다는 말을 못 했고, 칸마다 '선택하기' 를
            적으면 머리줄과 같은 말이 위아래로 겹친다. 채우면 둘 다 사라지고 값만 남는다. */}
        <button type="button"
          onClick={(e) => { if (open) { setCellOpen(null); return; } setCellFree(false); openPopAt(e.currentTarget, width, height); setCellOpen(key); }}
          style={{ ...cellSelect, background: "transparent", textAlign: "center", color: v ? "#333" : "#b4b4b9",
            display: "flex", alignItems: wrap ? "flex-start" : "center", justifyContent: "center", gap: 4,
            border: "none", borderRadius: 0 }}>
          {/* 값을 잘라내지(...) 않고 접는다("말줄임은 절대 나오면 안됨") — 표가
              fixed 레이아웃 + 칸 너비 비율(글자 수 기반)로 이미 칸마다 필요한
              만큼을 배정해 두니, 칸 안에서는 minWidth 없이 그대로 접히면 된다. */}
          <span style={wrap
            ? { flex: 1, minWidth: 0, whiteSpace: "normal", wordBreak: "keep-all", lineHeight: 1.3 }
            : { flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{shown || ph}</span>
          {!v && <ChevronDown size={12} style={{ flexShrink: 0, color: "#c4c4c9", marginTop: wrap ? 2 : 0 }} />}
        </button>
        {open && popAt && (
          <div ref={popRef} style={{ position: "fixed", left: popAt.left, top: popAt.top, zIndex: 200, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 6, boxSizing: "border-box",
            // 목록은 항목 길이에 맞춰 좁게(오른쪽 빈 공간 제거), 자유입력·급여는 입력칸이 있어 고정 폭
            ...(freeInput ? { width } : { width: "max-content", minWidth: 84, maxWidth: 220 }) }}>
            {!freeInput ? (
              <div style={{ maxHeight: 216, overflowY: "auto" }}>
                {/* 목록 맨 위에 둔다 — 아래로 스크롤해야 나오면 지울 일이 있을 때마다
                    매번 목록을 다 훑어야 했다. */}
                {v && (
                  <button type="button" onClick={() => { setPos(cat, field, ""); setCellOpen(null); }}
                    style={{ display: "block", width: "100%", textAlign: "left", border: "none", borderBottom: "1px solid #f0f0f0", background: "transparent", borderRadius: 5, padding: "6px 8px", fontSize: 11.5, color: "#aaa", cursor: "pointer" }}>선택 해제</button>
                )}
                {options.map((o) => (
                  <button key={o} type="button" onClick={() => { setPos(cat, field, o); setCellOpen(null); }}
                    style={{ display: "block", width: "100%", textAlign: "left", border: "none", borderRadius: 5, padding: "6px 8px", fontSize: 12.5, lineHeight: 1.2, cursor: "pointer",
                      background: o === v ? "#f7f7f8" : "transparent", color: o === v ? "#582681" : "#333" }}>{o}</button>
                ))}
                {allowFi && nonMember && (
                  <button type="button" onClick={() => setCellFree(true)}
                    style={{ display: "block", width: "100%", textAlign: "left", border: "none", borderTop: "1px solid #f0f0f0", background: "transparent", borderRadius: 5, padding: "6px 8px", fontSize: 11.5, color: "#582681", cursor: "pointer" }}>직접입력…</button>
                )}
              </div>
            ) : (
              <>
                {units && (
                  /* 지급 주기 선택 → 앞머리(시·주·월·연) 자동 입력. 금액만 이어서 적으면 된다.
                     '협의' 버튼은 없앴다 — 값을 지우고 그 자리를 대체하는 방식이라, 이미
                     적어 둔 급여를 눌러서 날려 버리는 사고로 이어졌다. 값을 두고도, 값
                     없이도 '협의'를 남기는 건 이제 아래 '협의 가능' 체크 하나로 한다. */
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                    {units.map((u) => {
                      const on = u.prefix === salaryPrefix;
                      return (
                        <button key={u.label} type="button"
                          onClick={() => { setPos(cat, field, withSalaryUnit(v, u.prefix)); cellInputRef.current?.focus({ preventScroll: true }); }}
                          style={{ border: `1px solid ${on ? "#582681" : "#ddd"}`, background: on ? "#582681" : "#fff", color: on ? "#fff" : "#582681", borderRadius: 6, padding: "2px 7px", fontSize: 11.5, cursor: "pointer" }}>{u.label}</button>
                      );
                    })}
                  </div>
                )}
                {units ? (
                  <div style={{ marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input ref={cellInputRef} type="text" inputMode="numeric" placeholder="최소" value={sMin}
                        onChange={(e) => setPos(cat, field, buildSalary(e.target.value.replace(/\D/g, ""), sMax, sOpenEnded))}
                        onKeyDown={(e) => { if (e.key === "Enter") setCellOpen(null); }}
                        style={{ width: 0, flex: 1, boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 6, padding: "5px 7px", fontSize: 12, textAlign: "center" }} />
                      <span style={{ color: "#888", fontSize: 12, flexShrink: 0 }}>~</span>
                      <input type="text" inputMode="numeric" placeholder="최대(선택)" value={sMax}
                        onChange={(e) => setPos(cat, field, buildSalary(sMin, e.target.value.replace(/\D/g, ""), sOpenEnded))}
                        onKeyDown={(e) => { if (e.key === "Enter") setCellOpen(null); }}
                        style={{ width: 0, flex: 1, boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 6, padding: "5px 7px", fontSize: 12, textAlign: "center" }} />
                    </div>
                  </div>
                ) : (
                  <input ref={cellInputRef} type="text" value={v} onChange={(e) => setPos(cat, field, e.target.value)} placeholder={ph}
                    onKeyDown={(e) => { if (e.key === "Enter") setCellOpen(null); }}
                    style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 6, padding: "5px 7px", fontSize: 12 }} />
                )}
                {/* 표 칸 밑에 상시 노출하면 값·근무요일/시간 칸이 늘 3행이 되어 표가
                    지저분해 보였다("3행이라 너무 보기 안좋아") — 팝오버 안으로 옮긴다.
                    "협의 가능"을 하나로 뭉치면 금액을 보여줄지 감출지를 못 갈랐다 —
                    셋으로 나눈다: 확정 / 협의(금액 비공개) / 협의(금액 제시). */}
                {onNegoChange && (
                  <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5 }}>
                    {([
                      { v: "" as const, label: "확정 (그대로 노출)" },
                      { v: "hidden" as const, label: "협의 · 금액 비공개" },
                      { v: "open" as const, label: "협의 · 금액 제시" },
                    ]).map((o) => (
                      <label key={o.v} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#555", cursor: "pointer" }}>
                        <input type="radio" name={`nego-${key}`} checked={nego === o.v} onChange={() => onNegoChange(o.v)}
                          style={{ width: 13, height: 13, margin: 0, accentColor: "#582681" }} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  {options.length > 0 ? <button type="button" onClick={() => setCellFree(false)} style={{ border: "none", background: "none", color: "#888", fontSize: 11.5, cursor: "pointer" }}>목록으로</button> : <span />}
                  <button type="button" onClick={() => setCellOpen(null)} className="company-primary-btn"
                    style={{ padding: "3px 11px", fontSize: 11.5 }}>확인</button>
                </div>
              </>
            )}
          </div>
        )}
      </span>
    );
  };
  // 비회원(관리자) 자유입력 칸 공용 스타일 + 렌더 헬퍼(기존 위젯 옆에 추가). 채우면 저장값 우선.
  // 비회원 직접입력: 트리거는 각 위젯 메뉴 안의 "직접입력" 항목(setFiOpen). 여기서는
  //   ① 채운 값을 항목 우측에 일반 텍스트로 표시(클릭해 수정) ② 입력 팝오버(2행·넓게)만 렌더.
  //   편집 중에는 값 텍스트를 숨겨 앵커 폭을 고정 → 타이핑 중 팝오버가 움직이지 않음.
  //   showLink=true(모집인원처럼 메뉴가 없는 항목)일 때만 우측에 '직접입력' 링크를 직접 노출.
  const freeField = (key: string, val: string, setVal: (v: string) => void, ph = "직접 입력…", showLink = false, clearWidget?: () => void) =>
    nonMember ? (
      <span className="fi-pop" style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 8 }}>
        {fiOpen === key
          ? <span style={{ fontSize: 12, color: "#b0a7bf", whiteSpace: "nowrap" }}>입력 중…</span>
          : (val.trim()
              ? <span onClick={() => setFiOpen(key)} title="클릭해 수정" style={{ fontSize: 15, color: "#333", cursor: "pointer", maxWidth: 320, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{val}</span>
              : (showLink
                  ? <button type="button" onClick={() => setFiOpen(key)} style={{ border: "none", background: "none", padding: 0, fontSize: 12, color: "#b0a7bf", cursor: "pointer", textDecoration: "underline", whiteSpace: "nowrap" }}>직접입력</button>
                  : null))}
        {fiOpen === key && (
          <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, zIndex: 60, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 12, width: 360 }}>
            <textarea autoFocus rows={2} value={val} onChange={(e) => { const v = e.target.value; setVal(v); if (v.trim() && clearWidget) clearWidget(); }} placeholder={ph}
              style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 8, padding: "8px 10px", fontSize: 14, lineHeight: 1.5, resize: "vertical", fontFamily: "inherit" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
              <button type="button" onClick={() => { setVal(""); setFiOpen(null); }} style={{ border: "none", background: "none", color: "#c0392b", fontSize: 12, cursor: "pointer" }}>지우기</button>
              <button type="button" onClick={() => setFiOpen(null)} className="company-primary-btn" style={{ padding: "5px 14px", fontSize: 13 }}>적용</button>
            </div>
          </div>
        )}
      </span>
    ) : null;
  const isOffice = jobGroupType === "기업";
  // 고른 지원방법이 부르는 담당자 칸만 내보낸다. 문자·전화 → 전화 / 이메일 → 메일 /
  //   둘 중 하나라도 → 이름. 미리보기와 저장이 같은 규칙을 써야 보이는 대로 나간다.
  const 쓸전화 = contactMethods.includes("문자") || contactMethods.includes("전화");
  const 쓸메일 = contactMethods.includes("이메일");
  const 낼담당 = { 이름: (쓸전화 || 쓸메일) ? nmManagerName.trim() : "",
                  전화: 쓸전화 ? nmManagerPhone.trim() : "",
                  메일: 쓸메일 ? nmContactEmail.trim() : "" };
  // 매장은 '회사'가 아니라 '매장' 기준으로 부른다. 기업회원 설정 화면
  // (company/dashboard/settings)과 같은 말을 쓴다 — 같은 값을 두 화면에서
  // 다르게 부르면 관리자도 매장도 헷갈린다.
  const L = {
    section: isOffice ? "기업정보" : "매장정보",
    intro: isOffice ? "기업 소개" : "매장 소개",
    name: isOffice ? "회사명" : "매장명",
    size: isOffice ? "사원수" : "직원수",
    phone: isOffice ? "대표번호" : "전화번호",
    // 매장은 홈페이지가 거의 없고 인스타가 사실상 포트폴리오다.
    site: isOffice ? "웹사이트" : "매장 SNS",
  };
  // 부제(hint)는 두지 않는다. '필수 (이미지 없을 시)' 같은 말을 라벨 옆에 달면
  // 칸마다 설명이 붙어 어수선하다. 필수 여부는 빨간 * 하나로 말한다 —
  // 이미지가 없어 이 글이 곧 상세요강일 때만 별이 뜬다.
  // 자리글은 두지 않는다 — 칸 이름이 이미 무엇을 적는 자리인지 말한다. 예시를 길게
  // 깔면 그만큼 화면이 지저분해지고, 정작 읽지도 않는다.
  const textFieldMeta: Record<TextKey, { label: string }> = {
    benefits: { label: "혜택·복지" },
    responsibilities: { label: "담당업무" },
    // 매장 공고에만 선다(textFields 참조 — 본사는 담당업무가 그 자리다).
    description: { label: "상세요강 글" },
    requirements: { label: "자격요건" },
    preferred: { label: "우대사항" },
  };
  // 본사는 담당업무(JD) 중심, 매장은 상세요강 글 중심
  const textFields: TextKey[] = isOffice
    ? ["responsibilities", "requirements", "preferred"]
    : ["description", "requirements", "preferred"];

  // 제목 자리글은 한 글자 칠 때마다 앞에서 한 글자씩 지워진다 — 쳐 넣는 글이 자리글을
  // 밀어내는 모양이라, 예시를 보면서 끝까지 쓸 수 있다. 칸을 떠나면 남은 자리글은 지운다.
  const 제목자리글 = "공고 제목을 입력하세요 * (예: 리안헤어 광명점 헤어디자이너·인턴 모집)";
  const 남은자리글 = (제목쓰는중 || !form.title) ? 제목자리글.slice(form.title.length) : "";

  const processFilled = hiringProcess.length > 0;
  const notesFilled = !!notes.trim();

  // 미리보기용 job 객체 (실제 상세 페이지와 동일한 뷰로 렌더)
  const cp = companyProfile;
  const isNm = mode === "admin" && nonMember; // 비회원(외부) 공고면 nm* 값 사용
  const previewCompanyName = isNm ? newCompanyName : (cp?.company_name || (mode === "admin" ? companyName : ""));
  const previewJob = {
    id: editId || "preview",
    companyId: "",
    brand: isNm ? (newBrandName || newCompanyName) : (cp?.brand_name || cp?.company_name || (mode === "admin" ? companyName : "우리 회사")),
    brandDesc: isNm ? nmDescription : (cp?.description || ""),
    tags: [] as string[],
    title: form.title || "공고 제목",
    jobType: jobGroupType === "기업" ? "본사" : "매장",
    jobCategories: [...new Set(categories.map(baseCat))],
    career: form.career,
    education: form.education || "",
    region: regionList.join(", "),
    employType: fiEmployment.trim() || (form.type ? form.type + ((fullTimeConvertible && (form.type === "계약직" || form.type === "인턴")) ? CONVERTIBLE_SUFFIX : "") : ""),
    headcount: fiHeadcount.trim() || (form.headcount ? `${form.headcount}명` : ""),
    genderPref: jobGroupType === "매장" ? genderPref : "",
    deadline: alwaysOpen ? "상시채용" : (form.deadline ? form.deadline.replace(/-/g, ".") : ""),
    salary: String(form.salary || "").trim() ? fmtSalary() : "",
    positions: categories.map((c) => { const r = 행읽기(c); return { category: baseCat(c), career: r.career.trim(), education: r.education.trim(), employment: r.employment.trim(), salary: r.salary.trim(), workDays: r.workDays.trim(), workTime: normWorkTime(r.workTime), headcount: r.headcount.trim(), gender: r.gender.trim(), shiftNego: r.shiftNego, salaryNego: r.salaryNego, shiftText: r.shiftText.trim(), extraShifts: r.extraShifts.map((s) => ({ days: s.days.trim(), time: normWorkTime(s.time) })).filter((s) => s.days || s.time) }; }),
    color: "#f7f7f8",
    description: form.description || "",
    requirements: form.requirements ? form.requirements.split("\n").filter(Boolean) : [],
    preferreds: form.preferred ? form.preferred.split("\n").filter(Boolean) : [],
    benefits: fiBenefits.trim() ? fiBenefits.split(",").map((s) => s.trim()).filter(Boolean) : (form.benefits ? form.benefits.split("\n").filter(Boolean) : benefitTags),
    responsibilities: form.responsibilities ? form.responsibilities.split("\n").filter(Boolean) : [],
    process: hiringProcess.filter((s) => s.trim()),
    notes: notes,
    logo_url: isNm ? null : cp?.logo_url,
    // 실제 저장값(payload.cover_images)과 똑같이 이 폼의 bannerImages를 그대로 쓴다.
    // 예전엔 기업회원 모드에서 companyProfile의 커버를 썼는데, 이 공고만 배너를
    // 지우거나 새로 올리면 미리보기가 그걸 반영하지 못하고 매장정보 배너를 계속 보여줬다.
    cover_images: bannerImages.map((b) => ({ url: b.url })),
    detailImages: detailImages,
    companyInfo: {
      name: previewCompanyName,
      brandName: isNm ? newBrandName : (cp?.brand_name || ""),
      industry: isNm ? (fiIndustry.trim() || nmIndustry) : (cp?.industry || ""),
      representative: isNm ? nmRepresentative : (cp?.representative_name || ""),
      companyType: jobGroupType === "매장" ? "매장" : "본사",
      size: isNm ? nmSize : (cp?.company_size || ""),
      founded: isNm ? (nmFounded ? `${nmFounded}년` : "") : (cp?.founded_year || ""),
      phone: isNm ? nmPhone : (cp?.company_phone || ""),
      website: isNm ? nmHomepage : (cp?.website_url || ""),
      location: isNm ? nmFullAddress : (cp ? composeCompanyAddress(cp.region_sido, cp.region_sigungu, cp.address) : ""),
      latitude: null,
      longitude: null,
    },
    // 근무지역은 이 공고의 주소를 먼저 쓰고, 비어 있을 때만 매장 프로필 주소로 물러선다.
    companyAddress: nmFullAddress.trim() || (cp ? composeCompanyAddress(cp.region_sido, cp.region_sigungu, cp.address) : ""),
    // 안 고른 것은 비워 둔다 — 화면이 '협의'로 채우면 고른 적 없는 조건이 공고에 적힌다.
    workDaysText: fiWorkDays.trim() || (workDaysNego ? "요일 협의" : workDays.join("·")),
    workPeriodText: fiWorkPeriod.trim() || workPeriod,
    workTimeText: fiWorkTime.trim() || (workTimeNego ? "시간 협의" : (workTimeStart && workTimeEnd ? `${workTimeStart}~${workTimeEnd}` : "")),
    // 관리자가 대신 올리는 공고는 지원 안내를 '뷰티워크 온라인지원' 하나로만 낸다.
    //   원래 공고에 적혀 있던 담당자 이름·전화·이메일은 폼에 그대로 남아 저장되지만
    //   (나중에 그 번호로 연락해 회원가입을 권해야 한다), 화면에 내보내면 구직자가
    //   뷰티워크를 건너뛰고 매장으로 바로 연락해 버린다 — 지원이 남지 않아 매장도
    //   우리도 무슨 일이 있었는지 알 수 없다.
    // 기업이 직접 쓰는 폼은 그대로 둔다 — 제 연락처를 제 공고에 싣는 것이라
    //   ("전화번호나 지원방법 정보가 빠져서 문맥이 맞지 않는다") 폼과 미리보기가 같아야 한다.
    isExternal: isNm,
    contactName: mode === "admin" ? "" : 낼담당.이름,
    contactPhone: mode === "admin" ? "" : 낼담당.전화,
    contactEmail: mode === "admin" ? "" : 낼담당.메일,
    contactMethods: mode === "admin" ? ["뷰티워크 온라인지원"] : contactMethods,
  };

  // 본문 콘텐츠 가로 정렬. 사이드가 생긴 뒤로는 기업 폼도 왼쪽으로 붙인다 —
  // 가운데 두면 사이드바와 본문 사이가 아니라 사이드 왼쪽에 빈 띠가 넓게 남는다.
  const mx = "0";
  // 기업이 쓰는 화면인지. 관리자 화면은 지금 짜임을 그대로 둔다.
  const 기업폼 = mode !== "admin";
  // 기업 폼은 브라우저를 넓히면 끝없이 늘어났다("본문 내용도 넓이도 계속
  // 늘어나는데") — 매장정보 페이지(설정 화면 본문 800px)와 같은 값으로 고정한다.
  // 기업 폼은 폭을 따로 묶지 않는다 — 바깥 칸(사이드 옆 본문)이 이미 폭을 정하고 있어
  // 여기서 또 묶으면 그 안에서 한 번 더 좁아진다. 모집분야가 일곱 칸짜리 표라
  // 남는 폭을 다 써야 고르는 글자가 안 잘린다.
  const 콘텐츠폭: number | "none" = 기업폼 ? "none" : 760;
  // 왼쪽 사이드에 세울 칸 목록. 아래로 내려가지 않아도 무엇이 남았는지 보인다.
  // 작성 현황은 '지금 발행할 수 있나'를 말해야 쓸모가 있다. 그래서 판정을 발행 검증과
  // 한 글자씩 맞춘다. 어긋나 있던 것들:
  //   · 제목이 아예 목록에 없었다(발행을 막는 첫 항목인데).
  //   · 근무지역을 regionList 로만 봤다. 주소를 붙여넣으면 그 배열이 비어 있어도
  //     발행은 되는데(주소에서 다시 뽑는다) 현황은 끝까지 미완료로 남았다.
  //   · 복리후생을 태그로만 봤다. 자유입력으로 적으면 발행은 되는데 미완료였다.
  //   · 전형절차는 발행을 막지 않는다(필수 아님) — 목록에서 뺀다.
  // 배너만 예외로 남긴다. 발행은 되지만 비면 공고가 회색 칸으로 나가 얼굴이 없다.
  const 지역참 = regionList.length > 0
    || deriveRegion(nmFullAddress).length > 0
    || extraLocations.some((l) => deriveRegion([l.address, l.detail].filter(Boolean).join(" ")).length > 0);
  const 할칸 = [
    { id: "banner", label: "배너", done: bannerImages.length > 0 },
    { id: "title", label: "제목", done: !!form.title.trim() },
    { id: "positions", label: "모집분야", done: categories.length > 0 },
    { id: "deadline", label: "마감일", done: !!form.deadline || alwaysOpen },
    { id: "region", label: "근무지역", done: 지역참 },
    { id: "benefit", label: "복리후생", done: benefitTags.length > 0 || !!fiBenefits.trim() },
    // 상세요강: 이미지가 있으면 됐고, 없으면 본문(본사=담당업무 / 매장=상세요강 글)과 자격요건.
    //   전엔 description 만 봐서 본사 공고는 아무리 채워도 안 채운 것으로 셌다.
    { id: "detail", label: "상세요강", done: detailImages.length > 0
        || (!!String(isOffice ? form.responsibilities : form.description || "").trim()
            && !!String(form.requirements || "").trim()) },
  ];
  const 채운칸 = 할칸.filter((c) => c.done).length;
  const 작성률 = Math.round((채운칸 / 할칸.length) * 100);

  // 모집부문 표 칸 너비 — 고정 퍼센트로 두니 "아르바이트"·"여성 우대"·"초대졸 이상"처럼
  // 값이 긴 칸은 말줄임(...)으로 잘리고, 근무요일/시간·급여는 늘 남아돌았다
  // ("다른항목이 잘렸어" · "근무요일/시간 여백이 너무 넓어"). 미리보기 표와 같은 방식으로
  // 실제로 채운 값의 글자 수를 재서 칸마다 비율을 다시 매긴다. table-layout은 fixed로
  // 두니(font-swap 반응 없음) 칸 너비는 이 비율 그대로 못박힌다.
  const posColLenOf = (s: string) => { let n = 0; for (const ch of s) n += /\s/.test(ch) ? 0.5 : 1; return n; };
  const POS_TABLE_COLS: { key: keyof PosRow | "category"; label: string }[] = [
    // 고용형태·성별·학력·근무요일/시간은 '근무 조건'에서 한 번만 받는다.
    { key: "category", label: "모집분야" },
    { key: "career", label: "경력/직책" },
    { key: "salary", label: "급여" },
  ];
  const POS_TABLE_CAP: Partial<Record<string, number>> = { category: 22, shiftText: 16, salary: 14 };
  const posTableWeights = POS_TABLE_COLS.map((c) => {
    let w = posColLenOf(c.label);
    categories.forEach((cat) => {
      const row = 행읽기(cat);
      if (c.key === "category") { w = Math.max(w, posColLenOf(baseCat(cat))); return; }
      if (c.key === "shiftText") {
        const lines = shiftDisplay(row).replace(/\s*\/\s*/g, "\n").replace(/\s*\(\+?협의\)\s*$/, "\n협의가능").split("\n").filter(Boolean);
        lines.forEach((l) => { w = Math.max(w, posColLenOf(l)); });
        return;
      }
      w = Math.max(w, posColLenOf(String(row[c.key as keyof PosRow] || "")));
    });
    return Math.min(w, POS_TABLE_CAP[c.key as string] || 10);
  });
  const posTableAvg = posTableWeights.reduce((s, w) => s + w, 0) / posTableWeights.length;
  const posTableBlended = posTableWeights.map((w) => w * 0.5 + posTableAvg * 0.5);
  const posTableTotal = posTableBlended.reduce((s, w) => s + w, 0) || 1;
  const posColPct = posTableBlended.map((w) => (w / posTableTotal) * 100);

  return (
    <>
      {/* 헤더 폭·정렬을 본문과 일치 → 상단 버튼 오른쪽 끝이 본문 오른쪽 끝과 맞음.
          기업폼은 본문이 jp-shell 그리드(사이드 150px+간격 26px)만큼 오른쪽으로 밀려
          있어, 헤더도 같은 만큼 밀어야 오른쪽 끝이 맞는다(jp-header-offset, CSS). */}
      <div className={`admin-form-header${기업폼 ? " jp-header-offset" : ""}`}
        style={{ maxWidth: 콘텐츠폭, marginLeft: 기업폼 ? undefined : mx, marginRight: mx }}>
        {/* 모바일은 사이드 메뉴가 없어 되돌아갈 길이 이 버튼뿐이다. 데스크톱은
            사이드의 '채용공고 관리'가 그 역할을 하니, 같은 자리에 제목을 둔다. */}
        {기업폼 && isMobile && (
          <button className="admin-back-btn" onClick={() => router.push(listHref)}>
            <ChevronLeft size={18} /> 목록으로
          </button>
        )}
        {/* 제목은 이제 페이지 맨 위 마스트헤드가 대신 보여준다("헤더쪽 채용공고 관리를
            삭제하고 밑에 있는 채용공고 등록 텍스트를 이동해줘" — CompanyLayout의
            PAGE_TITLES["jobs-new"]). 여기는 버튼을 오른쪽 끝으로 미는 빈 자리만 남긴다. */}
        {!isMobile && <span style={{ marginRight: "auto" }} />}
        {!isMobile && (
          <div className="admin-form-actions">
            {/* 임시저장 버튼 + (관리자) 임시저장 목록 드롭다운 — 페이지를 밀지 않도록 버튼에서 팝오버로 노출 */}
            <div ref={draftMenuRef} style={{ position: "relative", display: "inline-flex", alignItems: "stretch" }}>
              <button className="admin-secondary-btn" onClick={() => handleSubmit("draft")}
                style={mode === "admin" && drafts.length > 0 ? { borderTopRightRadius: 0, borderBottomRightRadius: 0 } : undefined}>
                <Save size={15} /> {draftSaved ? "임시저장됨 ✓" : "임시저장"}
              </button>
              {mode === "admin" && drafts.length > 0 && (
                <button type="button" className="admin-secondary-btn" title="임시저장 목록"
                  onClick={() => setDraftMenuOpen((v) => !v)}
                  style={{ marginLeft: -1, padding: "0 8px", borderTopLeftRadius: 0, borderBottomLeftRadius: 0, display: "inline-flex", alignItems: "center", gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#582681" }}>{drafts.length}</span>
                  <ChevronDown size={13} style={{ color: "#999", transform: draftMenuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }} />
                </button>
              )}
              {draftMenuOpen && drafts.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 60, width: 340, maxWidth: "80vw", background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 8 }}>
                  <div style={{ fontSize: 12, color: "#9a92a6", padding: "2px 6px 6px" }}>임시저장 {drafts.length}건 · 클릭하면 이어서 작성돼요</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 320, overflowY: "auto" }}>
                    {drafts.map((d) => {
                      const on = editId === d.id;
                      return (
                        <button key={d.id} type="button"
                          onClick={() => { setDraftMenuOpen(false); if (!on) router.push(`${pathname}?id=${d.id}`); }}
                          style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left", width: "100%", padding: "8px 10px", borderRadius: 8, border: on ? "1.5px solid #582681" : "1px solid #eee", background: on ? "#f7f7f8" : "#fff", cursor: on ? "default" : "pointer", font: "inherit" }}>
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14, color: "#2b2533" }}>
                            {d.title || "(제목 없음)"}
                            {d.company_name && <span style={{ color: "#9a92a6", marginLeft: 6, fontSize: 13 }}>· {d.company_name}</span>}
                          </span>
                          {on ? (
                            <span style={{ flexShrink: 0, fontSize: 12, color: "#582681", fontWeight: 600 }}>편집 중</span>
                          ) : d.created_at ? (
                            <span style={{ flexShrink: 0, fontSize: 12, color: "#b3adbd" }}>{new Date(d.created_at).toLocaleDateString("ko-KR")}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            {/* 이슈 모아보기 — 별도 관리 페이지로 이동(100건+ 대비) */}
            {mode === "admin" && issueList.length > 0 && (
              <button type="button" className="admin-secondary-btn" onClick={() => router.push("/admin/jobs/issues")} title="기록된 이슈 목록 페이지 보기"
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                🐞 이슈 <span style={{ fontSize: 12, fontWeight: 700, color: "#c0392b" }}>{issueList.length}</span>
              </button>
            )}
            {mode === "admin" && (
              <button type="button" className="admin-secondary-btn" onClick={runCurate} disabled={parsing || curating} title="현재 채워진 공고 내용을 뷰티워크 톤·형식으로 AI가 다듬어요">
                {curating ? "다듬는 중..." : "✨ 큐레이션"}
              </button>
            )}
            <button className="admin-secondary-btn" onClick={() => setShowPreview(true)}><Eye size={15} /> 미리보기</button>
            <button className="company-primary-btn" onClick={() => handleSubmit("publish")}>
              {saved ? (editId ? "✅ 수정완료" : "✅ 등록완료") : (editId ? "공고 수정" : "공고 등록")}
            </button>
          </div>
        )}
      </div>

      {isMobile && headerSlot && createPortal(
        <>
          <button className="co-m-ibtn" onClick={() => handleSubmit("draft")} aria-label="임시저장" title="임시저장">
            <Save size={20} />
          </button>
          <button className="co-m-ibtn" onClick={() => setShowPreview(true)} aria-label="미리보기" title="미리보기">
            <Eye size={20} />
          </button>
        </>,
        headerSlot
      )}

      {/* 관리자 화면 제목 — 기업 폼은 위 헤더 줄로 옮겼다(목록으로 링크가 있던 자리). */}
      {mode === "admin" && !isMobile && (
        <div style={{ width: "100%", maxWidth: 콘텐츠폭, margin: `0 ${mx} 10px`, boxSizing: "border-box" }}>
          <h2 style={{ fontSize: 18, fontWeight: 400, color: "#1a1a1a", margin: "0 0 0 2px" }}>
            {editId ? "채용공고 수정" : "채용공고 등록"}
          </h2>
        </div>
      )}


      {/* 채용유형(매장/본사) — 최상단, 외부 불러오기 박스 밖. 라디오 선택, 불러오기로 자동 추정 후 확정·수정 */}
      {showTypeToggle && (
        <div style={{ width: "100%", maxWidth: 콘텐츠폭, margin: `0 ${mx} 12px`, boxSizing: "border-box", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 24px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#582681", fontSize: 16, fontWeight: 400 }}>
            <Settings size={16} /> 채용유형
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {([["매장", "매장"], ["기업", "본사"]] as ["" | "기업" | "매장", string][]).map(([val, label]) => {
              const on = jobGroupType === val;
              return (
                <label key={val} style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 16, fontWeight: 400, color: on ? "#1a1a1a" : "#666" }}>
                  <span style={{ width: 16, height: 16, borderRadius: "50%", border: on ? "1.5px solid #555" : "1.5px solid #cfcfcf", boxSizing: "border-box", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {on && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#555" }} />}
                  </span>
                  <input type="radio" name="jobGroupType" checked={on} onChange={() => setJobGroupType(val)} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} />
                  {label}
                </label>
              );
            })}
          </div>
          {!jobGroupType && <span style={{ fontSize: 12, color: "var(--color-primary)" }}>선택하면 급여·복지 등 항목이 열립니다.</span>}
        </div>
      )}

      {/* 새로고침 뒤 남아 있던 내용을 되살렸다는 표시. 원치 않으면 여기서 비운다. */}
      {restored && (
        <div style={{ width: "100%", maxWidth: 콘텐츠폭, margin: `0 ${mx} 12px`, boxSizing: "border-box",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          padding: "10px 14px", background: "#f7f7f8", border: "1px solid #efeff1", borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, color: "#4a4453" }}>
            쓰던 내용을 되살렸어요{restored ? ` (${new Date(restored).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 기준)` : ""}.
          </span>
          <button type="button"
            onClick={() => { if (confirm("쓰던 내용을 지우고 빈 화면에서 새로 쓸까요?")) { clearAutosave(); location.reload(); } }}
            style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 8, border: "1px solid #efeff1", background: "#fff", color: "#582681", fontSize: 13, cursor: "pointer" }}>
            새로 쓰기
          </button>
        </div>
      )}

      {mode === "admin" && (
        <div style={{ width: "100%", maxWidth: 콘텐츠폭, margin: `0 ${mx} 16px`, boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 16px", marginBottom: 8, marginLeft: 2 }}>
            <span style={{ fontWeight: 400, fontSize: 16, color: "#582681" }}>{mode === "admin" ? "외부 공고 불러오기" : "타 사이트 공고 불러오기"}</span>
            <div style={{ display: "flex", gap: 20 }}>
              {([["url", "회사명 / URL"], ["paste", "글 붙여넣기"]] as ["url" | "paste" | "ocr", string][]).map(([v, l]) => (
                <label key={v} style={{ display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer", fontSize: 16, fontWeight: 400, color: importMode === v ? "#1a1a1a" : "#666" }}>
                  <span style={{ width: 16, height: 16, borderRadius: "50%", border: importMode === v ? "1.5px solid #555" : "1.5px solid #cfcfcf", boxSizing: "border-box", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {importMode === v && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#555" }} />}
                  </span>
                  <input type="radio" name="importMode" checked={importMode === v} onChange={() => { setImportMode(v); setParseMsg(""); }} style={{ position: "absolute", opacity: 0, width: 0, height: 0 }} /> {l}
                </label>
              ))}
            </div>
            {/* 붙여넣기를 고르면 글을 퍼 올 카페로 바로 갈 수 있게 한다. */}
            {importMode === "paste" && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "#9a92a6" }}>구인글 보러가기</span>
                {SOURCE_CAFES.map((c) => (
                  <a key={c.name} href={c.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 13.5, color: "#582681", textDecoration: "none", whiteSpace: "nowrap" }}>
                    {c.name} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
          <div style={{ background: "#f7f7f8", border: "1px solid #efeff1", borderRadius: 10, padding: "12px 16px", boxSizing: "border-box" }}>

          {importMode === "paste" ? (
          /* 글 붙여넣기: 카페·블로그 글은 드래그 복사가 된다. 캡처보다 싸고 정확하다. */
          <div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"공고 글을 통째로 복사해 붙여넣으세요.\n(제목·모집분야·급여·근무시간·연락처가 다 들어가면 좋아요)"}
              style={{ width: "100%", minHeight: 160, padding: 12, border: "1.5px solid #e3e3e6", borderRadius: 8, fontSize: 13.5, lineHeight: 1.6, resize: "vertical", background: "#fff" }}
            />
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <input
                type="text"
                value={ocrSourceUrl}
                onChange={(e) => setOcrSourceUrl(e.target.value)}
                placeholder="원문 주소 (예: cafe.naver.com/… , instagram.com/p/… )"
                style={{ flex: 1, minWidth: 0, height: 38, padding: "0 12px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 13.5 }}
              />
              <button type="button" onClick={runPaste} disabled={parsing || !pasteText.trim()}
                style={{ flexShrink: 0, padding: "9px 18px", borderRadius: 8, border: "none", background: "#582681", color: "#fff", fontSize: 14, fontWeight: 700, cursor: (parsing || !pasteText.trim()) ? "default" : "pointer", opacity: parsing ? 0.6 : 1 }}>
                {parsing ? "불러오는 중..." : "불러오기"}
              </button>
            </div>
            <div style={{ marginTop: 6, fontSize: 12.5, color: "#6f6f75" }}>
              글자만 읽어요 · 붙여 둔 사진은 요금이 붙지 않아요
            </div>
            {importImages.length > 0 && (
              <div style={{ marginTop: 8, padding: "10px 12px", background: "#f7f7f8", border: "1px solid #efeff1", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "#582681" }}>가져온 사진 {importImages.length}장</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {importImages.slice(0, 6).map((u, i) => (
                    <img key={i} src={u} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid #efeff1" }} />
                  ))}
                </div>
                <button type="button" onClick={attachImportedImages} disabled={importingImgs}
                  style={{ marginLeft: "auto", padding: "7px 14px", borderRadius: 8, border: "none", background: "#582681", color: "#fff", fontSize: 13, cursor: "pointer", opacity: importingImgs ? 0.6 : 1 }}>
                  {importingImgs ? "가져오는 중…" : "배너에 넣기"}
                </button>
              </div>
            )}
          </div>
          ) : importMode === "url" ? (
          /* 통합 검색: 회사명 또는 공고 URL을 한 칸에서 자동 구분 */
          <div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="admin-form-input" style={{ flex: 1 }} placeholder="회사명 또는 공고 URL 입력 (예: 준오헤어 · https://…)"
                value={findQuery} onChange={(e) => { setFindQuery(e.target.value); if (picked && e.target.value !== picked.title) setPicked(null); }}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runImport(); } }} />
              {picked && (
                <a href={picked.url} target="_blank" rel="noopener noreferrer" title="선택한 공고 원문을 새 탭으로 열기"
                  style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", padding: "0 12px", borderRadius: 8, border: "1px solid #efeff1", background: "#fff", color: "#582681", fontSize: 15, fontWeight: 400, textDecoration: "none", whiteSpace: "nowrap" }}>원문 ↗</a>
              )}
              <button type="button" onClick={runImport} disabled={finding || parsing}
                style={{ flexShrink: 0, padding: "0 18px", borderRadius: 8, border: "none", background: "#582681", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: (finding || parsing) ? 0.6 : 1, whiteSpace: "nowrap" }}>
                {(finding || parsing) ? "불러오는 중..." : "불러오기"}</button>
            </div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 6 }}>회사명을 넣으면 공고 목록을 보여줘요. 목록에서 공고를 선택한 뒤 <b>불러오기</b>를 누르면 값을 가져와요. (URL을 넣으면 바로 불러와요.)</div>
            {findMsg && <div style={{ fontSize: 12.5, marginTop: 6, color: findResults.length ? "#10b981" : "#c0392b" }}>{findMsg}</div>}
            {findResults.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 220, overflowY: "auto", border: "1px solid #efeff1", borderRadius: 8, background: "#fff" }}>
                {findResults.map((r) => { const on = picked?.url === r.url; return (
                  <div key={r.idx}
                    onClick={() => selectFoundJob(r)}
                    title="선택하면 위 검색칸에 표시돼요. ↗로 원문을 새 탭에서 볼 수 있어요."
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid #f7f7f8", cursor: "pointer", background: on ? "#f7f7f8" : "transparent", transition: "background 0.12s" }}>
                    {/* 라디오(선택) */}
                    <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: "50%", border: on ? "1.5px solid #582681" : "1.5px solid #cfcfcf", display: "inline-flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
                      {on && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#582681" }} />}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: "#582681", background: "#f7f7f8", border: "1px solid #efeff1", borderRadius: 5, padding: "1px 6px" }}>{r.source}</span>
                    <span style={{ flex: 1, fontSize: 13, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.title}>{r.title}</span>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} title="원문 공고 새 탭으로 열기"
                      style={{ flexShrink: 0, color: "#bbb", fontSize: 13, textDecoration: "none", padding: "0 2px" }}>↗</a>
                  </div>
                ); })}
              </div>
            )}
          </div>
          ) : (
          /* 화면 캡처(OCR): 여러 장 드래그·추가 → 한 번에 인식 */
          <div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const fs = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/")); if (fs.length) setOcrFiles((prev) => [...prev, ...fs]); }}
              style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: 12, borderRadius: 8, border: "1.5px dashed #e3e3e6", background: "#fff" }}>
              {ocrFiles.map((f, idx) => (
                <div key={idx} style={{ position: "relative", width: 72 }}>
                  <img src={URL.createObjectURL(f)} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }} />
                  <span style={{ position: "absolute", bottom: 2, left: 2, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10, borderRadius: 4, padding: "0 4px" }}>{idx + 1}</span>
                  <button type="button" onClick={() => setOcrFiles((prev) => prev.filter((_, i) => i !== idx))}
                    style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, lineHeight: 1 }}>×</button>
                </div>
              ))}
              <label style={{ width: 72, height: 72, flexShrink: 0, border: "1.5px dashed #e3e3e6", borderRadius: 6, background: "#f7f7f8", color: "#582681", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer" }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
                <span style={{ fontSize: 10 }}>추가</span>
                <input type="file" accept="image/*" multiple hidden onChange={(e) => { const fs = Array.from(e.target.files || []); if (fs.length) setOcrFiles((prev) => [...prev, ...fs]); e.currentTarget.value = ""; }} />
              </label>
              {ocrFiles.length === 0 && <span style={{ fontSize: 13, color: "#bbb" }}>공고 화면 캡처를 여기로 드래그하거나 추가하세요. 긴 공고는 위→아래로 여러 장 캡처하면 됩니다.</span>}
              <button type="button" onClick={() => processFiles(ocrFiles)} disabled={uploading || ocrFiles.length === 0}
                title="캡처한 그림을 그대로 상세요강에 넣습니다. 브라우저 화면이 같이 찍혔다면 잘라내고 넣으세요."
                style={{ marginLeft: "auto", alignSelf: "flex-end", padding: "8px 14px", borderRadius: 8, border: "1px solid #582681", background: "#fff", color: "#582681", fontSize: 13.5, cursor: (uploading || ocrFiles.length === 0) ? "default" : "pointer", opacity: uploading ? 0.6 : 1 }}>
                {uploading ? "넣는 중…" : "상세요강에 넣기"}</button>
              <button type="button" onClick={() => runOcrMulti(ocrFiles)} disabled={parsing || ocrFiles.length === 0}
                style={{ alignSelf: "flex-end", padding: "8px 18px", borderRadius: 8, border: "none", background: "#582681", color: "#fff", fontSize: 14, fontWeight: 700, cursor: (parsing || ocrFiles.length === 0) ? "default" : "pointer", opacity: parsing ? 0.6 : 1 }}>
                {parsing ? "불러오는 중..." : `불러오기${ocrFiles.length ? ` (${ocrFiles.length}장)` : ""}`}</button>
            </div>
            {/* 원문 주소 — 인스타 게시물·카페 글 주소를 남겨야 같은 공고를 두 번 올리지 않는다.
                캡처만 붙이면 어디서 가져왔는지 기록이 사라진다. */}
            <div style={{ marginTop: 8 }}>
              <input
                type="text"
                value={ocrSourceUrl}
                onChange={(e) => setOcrSourceUrl(e.target.value)}
                placeholder="원문 주소 (예: instagram.com/p/… , cafe.naver.com/… )"
                style={{ width: "100%", height: 38, padding: "0 12px", border: "1px solid #e0e0e0", borderRadius: 8, fontSize: 13.5 }}
              />
              <div style={{ fontSize: 12, color: "#9a92a6", marginTop: 4 }}>
                캡처한 공고의 원문 주소예요. 넣어 두면 같은 공고를 두 번 올리지 않고, 나중에 원문을 다시 볼 수 있어요.
              </div>
            </div>
          </div>
          )}
          {parseMsg && <div style={{ fontSize: 12.5, marginTop: 6, color: parseMsg.startsWith("✓") ? "#10b981" : "#c0392b" }}>{parseMsg}</div>}
          {parseFail && <div style={{ fontSize: 12.5, marginTop: 4, color: "#c0392b" }}>⚠ {parseFail}</div>}
          {siteNameWarn && (
            <div style={{ marginTop: 8, padding: "10px 12px", background: "#fef2f2", border: "1px solid #f3c0c0", borderRadius: 8, fontSize: 13, color: "#b3261e", whiteSpace: "pre-line", display: "flex", alignItems: "flex-start", gap: 8 }}>
              <span style={{ flex: 1 }}>{siteNameWarn}</span>
              <button type="button" onClick={() => setSiteNameWarn("")} style={{ border: "none", background: "none", color: "#b3261e", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>확인</button>
            </div>
          )}
          {mode !== "admin" && <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>타 사이트에 올린 공고의 URL을 넣으면 제목·직군·경력·근무지역·자격요건 등 <b>공고 내용</b>이 자동으로 채워져요. 회사 정보는 등록된 기업 프로필을 사용합니다. 확인·수정 후 등록하세요.</div>}

          </div>
        </div>
      )}

      {/* 이 공고 이슈 메모 — 불러온 원문(picked.url)에 매칭. 필드 선택 + 한 줄 메모, 자동저장 */}
      {mode === "admin" && picked?.url && (
        <div style={{ width: "100%", maxWidth: 콘텐츠폭, margin: `0 ${mx} 16px`, boxSizing: "border-box", border: "1px solid #f0d9d9", background: "#fff8f6", borderRadius: 10, padding: "10px 12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: issueItems.length ? 8 : 0 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "#c0392b" }}>🐞 이 공고 이슈</span>
            <span style={{ fontSize: 12, color: "#b08a86" }}>불러온 원문과 다른·잘못된 항목을 적어두면 자동저장돼요</span>
            <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: issueStatus === "error" ? 600 : 400, color: issueStatus === "error" ? "#c0392b" : issueStatus === "saved" ? "#22a06b" : "#c4a29e", minWidth: 44, textAlign: "right" }}>
              {issueStatus === "saving" ? "저장 중…" : issueStatus === "saved" ? "저장됨 ✓" : issueStatus === "error" ? "⚠ 저장 안 됨" : ""}
            </span>
          </div>
          {issueItems.map((it, idx) => (
            <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
              <select value={it.field} onChange={(e) => updateIssues(issueItems.map((x, i) => (i === idx ? { ...x, field: e.target.value } : x)))}
                style={{ flexShrink: 0, width: 150, padding: "6px 8px", borderRadius: 6, border: "1px solid #e6cfca", background: "#fff", fontSize: 13, color: it.field ? "#2b2533" : "#aaa" }}>
                <option value="">필드 선택</option>
                {ISSUE_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <input value={it.note} placeholder="무엇이 잘못됐는지 / 올바른 값"
                onChange={(e) => updateIssues(issueItems.map((x, i) => (i === idx ? { ...x, note: e.target.value } : x)))}
                style={{ flex: 1, minWidth: 0, padding: "6px 10px", borderRadius: 6, border: "1px solid #e6cfca", background: "#fff", fontSize: 13.5, boxSizing: "border-box" }} />
              <button type="button" title="삭제" onClick={() => updateIssues(issueItems.filter((_, i) => i !== idx))}
                style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 6, border: "1px solid #eee", background: "#fff", color: "#c0392b", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
          ))}
          <button type="button" onClick={() => updateIssues([...issueItems, { field: "", note: "" }])}
            style={{ marginTop: issueItems.length ? 2 : 8, padding: "5px 12px", borderRadius: 6, border: "1px dashed #d9b3ac", background: "#fff", color: "#c0392b", fontSize: 13, cursor: "pointer" }}>+ 이슈 추가</button>
        </div>
      )}

      {/* 비회원 기업 정보 입력은 폼 맨 하단으로 이동(프로필 양식과 동일 구성) */}

      {/* 기업이 쓰는 화면만 사이드와 두 열로 세운다. 관리자는 외부 공고를
          붙여넣고 위에서 아래로 훑어 내리는 작업이라 한 줄이 맞다 — 그쪽은
          클래스를 비워 두어 이 감싸개가 아무 일도 하지 않는다. */}
      <div className={기업폼 ? "jp-shell" : undefined}>
        {/* 작성 현황 — 오른쪽 세로 사이드였는데, 칸 목록이 폼과 같은 말을 두 번 하고 있었다.
            남길 것은 "얼마나 왔나" 하나뿐이라 폼 맨 위에 가로 띠 하나로 둔다. */}
        {기업폼 && (
          <div className="jp-prog">
            <span className="jp-prog-label">작성 현황</span>
            <span className="jp-prog-bar"><span style={{ width: `${작성률}%` }} /></span>
            <span className="jp-prog-count">{채운칸}/{할칸.length} 완료</span>
          </div>
        )}
        <div className={기업폼 ? "jp-body" : undefined}>
      {/* 공고 상단 이미지 */}
      {mode === "company" && isMobile ? (
        <div style={{ width: "100%", maxWidth: 콘텐츠폭, margin: `0 ${mx} 16px`, boxSizing: "border-box" }}>
          {/* 제목 옆에 ＋(이미지 추가) — 카드 안 공간을 쓰지 않는다 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
            <h2 className="jobpost-section-title" style={{ margin: 0 }}>공고배너 이미지{reqStar}</h2>
            <label title="이미지 추가 (올릴 때 자동으로 0.3MB 내외로 줄여서 저장돼요)" style={{ ...bannerBtn(false), cursor: nmCoverUploading ? "wait" : "pointer" }}>
              {!isMobile && <ImagePlus size={16} />}{nmCoverUploading ? (isMobile ? "…" : "업로드 중…") : (isMobile ? "＋" : "추가")}
              <input type="file" accept="image/*" multiple disabled={nmCoverUploading || bannerImages.length >= 10}
                onChange={(e) => { 줄세우기("banner", e.target.files || []); e.currentTarget.value = ""; }} style={{ display: "none" }} />
            </label>
          </div>
          <div style={{ marginTop: 8, background: "#fff", border: "1px solid #ececef", borderRadius: 12, padding: 12, boxSizing: "border-box" }}>
            {/* 썸네일마다 ×로 이 공고에서만 제거 */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              {/* 한 줄에 두 장. 세 장부터는 좌우 화살표로 넘겨 본다. */}
              {bannerImages.length > 0 && (
                <div style={{ width: "100%" }}>
                  {/* 공고 상세와 같은 컴포넌트로 그린다 — 편집 화면에서 보이는 모양이 곧 공개 화면 모양. */}
                  <BannerStrip images={bannerImages.map((b) => b.url)} showIndex
                    onCrop={배너자르기열기}
                    onDelete={(url) => setBannerImages((prev) => prev.filter((b) => b.url !== url))}
                    onReorder={(from, to) => setBannerImages((prev) => {
                      const next = [...prev];
                      const [moved] = next.splice(from, 1);
                      next.splice(to, 0, moved);
                      return next;
                    })} />
                </div>
              )}
              {coverImages.length > 0 && bannerImages.length === 0 && (
                <button type="button" onClick={() => setBannerImages(coverImages.map((u) => ({ url: u, name: "기업 커버" })))}
                  style={{ flexShrink: 0, border: "1px solid #efeff1", background: "#fff", color: "#666", borderRadius: 8, padding: "6px 10px", fontSize: 12.5, cursor: "pointer" }}>{L.section} 사진 불러오기</button>
              )}
            </div>
            {bannerHint}
          </div>
        </div>
      ) : (() => {
        return (
          // 위쪽 여백을 0으로 없앴더니 상단 액션줄의 "공고 등록"과 이 줄의 "추가"가
          // 버튼끼리 거의 맞붙어 보였다("추가버튼하고 공고등록 버튼이 너무 붙었네").
          <div style={{ width: "100%", maxWidth: 콘텐츠폭, margin: `${기업폼 ? 16 : 0}px ${mx} 16px`, boxSizing: "border-box" }}>
            {/* 제목 옆에 ＋(이미지 추가)·샘플 배너 — 드래그 박스 안을 버튼으로 채우지 않는다. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 4px" }}>
              {/* 제목은 왼쪽, 단추는 오른쪽 끝으로 밀어 붙인다. */}
              <h2 id="jp-banner" className="jobpost-section-title" style={{ marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: "auto" }}>공고배너 이미지{reqStar}</h2>
              <label title="이미지 추가 (올릴 때 자동으로 0.3MB 내외로 줄여서 저장돼요)" style={{ ...bannerBtn(false), cursor: nmCoverUploading ? "wait" : "pointer" }}>
                {!isMobile && <ImagePlus size={17} />}{nmCoverUploading ? (isMobile ? "…" : "업로드 중…") : (isMobile ? "＋" : "추가")}
                <input type="file" accept="image/*" multiple disabled={nmCoverUploading || bannerImages.length >= 10}
                  onChange={(e) => { 줄세우기("banner", e.target.files || []); e.currentTarget.value = ""; }} style={{ display: "none" }} />
              </label>
              {/* 샘플 배너는 관리자 대행 등록에만 둔다. 기업회원은 매장/기업정보에서
                  한 번 만들어 두고 공고에서는 '불러오기'로 가져다 쓴다 — 같은 일을 하는
                  자리가 둘이면 어디서 만든 것인지 헷갈린다. */}
              {mode === "admin" && (
              <button type="button" onClick={() => setBannerGenOpen((v) => !v)} title="쓸 만한 사진이 없을 때, 준비된 배경에 문구만 넣어 배너를 만들어요" style={bannerBtn(bannerGenOpen)}>
                {!isMobile && <Wand2 size={16} />}{isMobile ? "샘플" : "샘플 배너"}
              </button>
              )}
              {mode === "company" && coverImages.length > 0 && bannerImages.length === 0 && (
                <button type="button" onClick={() => setBannerImages(coverImages.map((u) => ({ url: u, name: "기업 커버" })))}
                  style={{ ...bannerBtn(false), color: "#666" }}>{L.section} 사진 불러오기</button>
              )}
            </div>
            <div style={{ marginTop: 8, background: "#fff", border: "1px solid #ececef", borderRadius: 12, padding: "16px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 16 }}>

              {/* ── 상단 배너 (cover, 여러 장 · 공개화면에서 두 장씩 화살표로 회전) ── */}
              <div>
                <div
                  tabIndex={0}
                  onFocus={() => setPasteZone("banner")}
                  onBlur={() => setPasteZone((z) => (z === "banner" ? null : z))}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); if (imgDragRef.current) { dropToBanner(null); return; } const f = e.dataTransfer.files; if (f && f.length && !nmCoverUploading) 줄세우기("banner", f); }}
                  onPaste={(e) => { const fs = imagesFromClipboard(e); if (fs.length) { e.preventDefault(); if (!nmCoverUploading) 줄세우기("banner", fs); } }}
                  style={{ padding: bannerImages.length ? 6 : 10, borderRadius: 10, border: `1.5px dashed ${dragOver || pasteZone === "banner" ? "#582681" : "#efeff1"}`, background: dragOver || pasteZone === "banner" ? "#f7f7f8" : "#f7f7f8", outline: "none" }}>
                  {bannerImages.length > 0 ? (
                    /* 공고에 실제로 찍히는 모양(3:1 · 한 장은 1/3 폭) 그대로 보여준다. 끌어서 순서를 바꿀 수 있다. */
                    <BannerStrip images={bannerImages.map((b) => b.url)} showIndex
                      onCrop={배너자르기열기}
                      onDelete={(url) => setBannerImages((prev) => prev.filter((b) => b.url !== url))}
                      onReorder={(from, to) => setBannerImages((prev) => {
                        const next = [...prev];
                        const [moved] = next.splice(from, 1);
                        next.splice(to, 0, moved);
                        return next;
                      })} />
                  ) : (
                    /* 어떤 사진을 올리는 칸인지 먼저 말한다. '이미지'만으로는 로고를 올리거나
                       공고 포스터를 올려 배너가 글자로 뒤덮인다. 넣는 법은 그 아래 작게.
                       매장정보에 이미 사진이 있으면 그걸 그대로 쓰는 길도 알려 준다 —
                       비워 두면 배너 없이 나가지, 매장정보 사진으로 대신 채워지지 않는다. */
                    <div style={{ minHeight: 76, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, lineHeight: 1.5, textAlign: "center", padding: "0 8px" }}>
                      <div style={{ fontSize: 13.5, color: "#8a8a8f" }}>
                        {isOffice ? "회사·사무실 홍보 사진" : "매장 내·외관 홍보 사진"}
                      </div>
                      <div style={{ fontSize: 12, color: "#b4b4b9" }}>
                        <b style={{ margin: "0 2px", fontWeight: 600 }}>드래그</b>하거나 <b style={{ margin: "0 2px", fontWeight: 600 }}>Ctrl+V</b>로 붙여넣어 주세요
                      </div>
                      {mode === "company" && coverImages.length > 0 && (
                        <div style={{ fontSize: 12, color: "#b4b4b9" }}>
                          {L.section}에 올린 사진을 그대로 쓰려면 위 <b style={{ fontWeight: 600 }}>{L.section} 사진 불러오기</b>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {bannerHint}
                {/* 샘플 배너 생성 패널 */}
                {bannerGenOpen && mode === "admin" && (
                  <div style={{ marginTop: 10, padding: 12, border: "1px solid #efeff1", borderRadius: 10, background: "#f7f7f8" }}>
                    <div style={{ fontSize: 13, color: "#582681", fontWeight: 600, marginBottom: 8 }}>샘플 배너 만들기 <span style={{ fontWeight: 400, color: "#999" }}>· 가운데 제목만 넣어요(줄바꿈 가능)</span></div>
                    <textarea value={bannerGenTitle} onChange={(e) => setBannerGenTitle(e.target.value)} rows={2}
                      placeholder={"예: 부 원장 급 여자 선생님\n(중국어 가능자 우대)"}
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid #efeff1", borderRadius: 8, padding: "8px 10px", fontSize: 14, resize: "vertical", outline: "none" }} />
                    {/* 배경 미리보기(프리셋이 하나일 땐 선택 없이 배경만 보여줌) */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0" }}>
                      {BANNER_PRESETS.map((p, i) => (
                        <button key={p.key} type="button" onClick={() => setBannerGenPreset(i)}
                          style={{ width: 168, height: 62, borderRadius: 8, cursor: BANNER_PRESETS.length > 1 ? "pointer" : "default", overflow: "hidden",
                            border: BANNER_PRESETS.length > 1 && bannerGenPreset === i ? "2px solid #582681" : "1.5px solid #efeff1",
                            backgroundImage: `url(${p.img})`, backgroundSize: "cover", backgroundPosition: "center",
                            color: p.text, fontSize: 11, fontWeight: 700 }}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" onClick={addSampleBanner} disabled={bannerGenBusy || !bannerGenTitle.trim()}
                        className="company-primary-btn" style={{ padding: "8px 16px", fontSize: 13, opacity: (bannerGenBusy || !bannerGenTitle.trim()) ? 0.6 : 1 }}>
                        {bannerGenBusy ? "만드는 중…" : "배너로 추가"}
                      </button>
                      <button type="button" onClick={() => setBannerGenOpen(false)} style={{ border: "1px solid #efeff1", background: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: "#666" }}>취소</button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      <div className="admin-form-grid jobpost-form" style={{ width: "100%", maxWidth: 콘텐츠폭, margin: mx, gridTemplateColumns: "1fr", justifyContent: "stretch", justifyItems: "stretch", rowGap: "16px" }}>
        {/* ═══ 왼쪽 컬럼: 기본정보 ═══ */}
        <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: "8px" }}>

          {/* 공고제목 — 매장명과 제목만 받는다. 마감일은 '언제까지 어떻게 지원하나'가
              한 덩어리라 지원 방법으로 옮겼다. */}
          <h2 className="jobpost-section-title">공고제목{reqStar}</h2>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">

              {/* 공고 헤더(미리보기형): 실제 상세화면 최상단에 보일 브랜드 + 제목 */}
              <div style={{ padding: "4px 0 14px", marginBottom: 4 }}>
                <div style={{ marginBottom: 6 }}>
                  {nonMember ? (
                    <input
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      placeholder="회사명 (예: 리안헤어 광명점)"
                      className="jobpost-brand-input"
                      style={{ fontWeight: 700, color: "#6f6f75", border: "none", outline: "none", background: "transparent", padding: 0, width: "100%" }}
                    />
                  ) : (
                    <div className="jobpost-brand-input" style={{ fontWeight: 700, color: "#6f6f75" }}>
                      {previewCompanyName}
                    </div>
                  )}
                </div>
                {/* 예시는 치는 동안에도 옆에 남아 있어야 참고가 된다. 자리글은 첫 글자에
                    통째로 사라지므로, 예시만 따로 겹쳐 그린다 — 적은 글자 뒤에 붙어
                    따라 밀리다가 칸 끝에서 잘려 나간다. */}
                <div style={{ position: "relative" }}>
                  <AutoTextarea
                    id="jp-title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                    onFocus={() => set제목쓰는중(true)}
                    onBlur={() => set제목쓰는중(false)}
                    className="jobpost-title-input"
                    style={{ width: "100%", fontWeight: 400, color: "#1a1a1a", lineHeight: 1.3, fontFamily: "inherit", position: "relative", zIndex: 1, background: "transparent" }}
                  />
                  {!!남은자리글 && (
                    <div aria-hidden className="jobpost-title-input jp-title-eg">
                      <span>{form.title}</span>
                      <em>{남은자리글}</em>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* 모집부문 — 이 조건으로 이만큼 뽑는다는 한 덩어리. 부문 안에 무엇이 들어가든
              이름이 흔들리지 않아, 근무 조건을 안으로 들여도 제목을 다시 고민할 일이 없다. */}
          <h2 className="jobpost-section-title" style={{ marginTop: 20 }}>모집부문{reqStar}</h2>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">
              <span id="jp-positions" />
              {/* 모집분야 — 대분류를 누르면 그 자리에서 소분류가 펼쳐진다.
                  모달로 덮으면 이미 고른 것이 안 보여 무엇을 더 골라야 할지 알 수 없었다. */}
              <div className="jp-pick">
                {getJobGroups(jobGroupType === "기업" ? "OFFICE" : "STORE").map((g) => {
                  const 고른수 = g.items.filter((it) => categories.some((c) => baseCat(c) === it)).length;
                  const 열림 = 열린그룹.includes(g.group);
                  return (
                    <div key={g.group}>
                      <button type="button" className={`jp-pick-g ${고른수 > 0 ? "on" : ""} ${열림 ? "open" : ""}`}
                        onClick={() => set열린그룹((p) => p.includes(g.group) ? p.filter((x) => x !== g.group) : [...p, g.group])}>
                        {g.group}
                        <span className="n">{고른수 > 0 ? `${고른수}/${g.items.length}` : g.items.length}</span>
                      </button>
                      {열림 && (
                        <div className="jp-pick-items">
                          {g.items.map((it) => {
                            const 켜짐 = categories.some((c) => baseCat(c) === it);
                            return (
                              <button key={it} type="button" className={`jp-pick-i ${켜짐 ? "on" : ""}`}
                                onClick={() => {
                                  if (켜짐) { categories.filter((c) => baseCat(c) === it).forEach(removeCatRow); return; }
                                  addCatRow(it);
                                }}>
                                {it}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="job-detail-meta-item" style={{ margin: "0 0 12px", display: "none" }}>
                <span style={{ fontSize: 15, color: "#999", flexShrink: 0 }}>모집분야<span style={{ color: "#e74c3c", marginLeft: 2 }}>*</span></span>
                {/* 분야를 골라 모집부문 표에 행을 붙인다(같은 분야를 또 골라 신입·경력 분리 모집 가능).
                    고른 분야는 표에만 행으로 보이고 여기엔 값을 표시하지 않는다. */}
                <span className="jp-add-wrap catpick-pop" style={{ position: "relative" }}>
                  <button type="button" disabled={typeLocked} onClick={() => setAddRowOpen((v) => !v)} title="모집분야를 골라 행을 추가해요. 같은 분야를 또 고르면 신입·경력처럼 나눠 모집할 수 있어요"
                    className="jp-add-cat" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "none", background: "none", color: typeLocked ? "#ddd" : "#582681", lineHeight: 1, padding: 0, cursor: typeLocked ? "default" : "pointer" }}>＋</button>
                  {/* 고정좌표(popAt) 팝오버는 화면 기준이라, 콘텐츠가 늦게 도착해 트리거가 밀리면
                      따라가지 못했다("+ 버튼 바로 밑에서 떠야지"). 여기는 표 밖이라 가로 스크롤에
                      잘릴 일이 없으니, 트리거에 상대 위치로 붙여 항상 바로 밑에 뜨게 한다. */}
                  {addRowOpen && (
                    <CategoryPickPopover
                      jobType={jobGroupType === "기업" ? "OFFICE" : "STORE"}
                      onPick={(item) => { addCatRow(item); setAddRowOpen(false); }}
                      onClose={() => setAddRowOpen(false)}
                    />
                  )}
                </span>
              </div>

              {/* 고른 분야마다 카드 하나. 단계를 켜면 그 단계가 한 줄이 되고 줄마다 인원과 급여를 받는다. */}
              <div style={{ margin: "4px 0 20px" }}>
                {[...new Set(categories.map(baseCat))].map((item) => {
                  // 맨 끝에 '무관' — 직급을 가리지 않고 뽑는 자리가 흔하다.
                  const 단계들 = [...직군의경력단계(item), "경력무관"];
                  const 내행 = categories.filter((c) => baseCat(c) === item);
                  const 켜진단계 = 내행.map((c) => 행읽기(c).career).filter(Boolean);
                  const 그룹 = getGroupOfItem(jobGroupType === "기업" ? "OFFICE" : "STORE", item);
                  const 단계행 = (st: string) => 내행.find((c) => 행읽기(c).career === st);
                  return (
                    <div key={item} className="jp-job">
                      <div className="jp-job-head">
                        {/* 대분류를 위에 두고 화살표로 아래를 가리킨다 — 위에서 아래로
                            좁혀 고른 길이 그대로 보인다. 대분류는 흐리게, 주인공은 소분류다. */}
                        <span className="jp-job-name">
                          {그룹 && <span className="jp-job-grp">{그룹}<ChevronDown size={12} strokeWidth={2} className="jp-job-arrow" /></span>}
                          <span className="jp-job-item">{item}</span>
                        </span>
                        <span className="jp-job-steps">
                          <b className="jp-req">*</b>
                          {단계들.map((st) => (
                            <button key={st} type="button"
                              className={`jp-step ${켜진단계.includes(st) ? "on" : ""}`}
                              onClick={() => {
                                const 있음 = 단계행(st);
                                if (있음) {
                                  if (내행.length === 1) { setPos(있음, "career", ""); return; }
                                  removeCatRow(있음);
                                  return;
                                }
                                const 빈행 = 내행.find((c) => !행읽기(c).career);
                                if (빈행) { setPosMeta((m) => ({ ...m, [빈행]: { ...(m[빈행] || emptyPos), career: st, headcount: (m[빈행] || emptyPos).headcount || "1" } })); return; }
                                const key = nextDupKey(item, categories);
                                setCategories([...categories, key]);
                                // 같은 부문의 근무 조건을 그대로 물려준다 — 단계만 다른 줄이다.
                                setPosMeta((m) => {
                                  const a = { ...emptyPos, ...(m[내행[0]] || {}) };
                                  const 물림: Partial<PosRow> = {};
                                  부문조건.forEach((k) => { (물림 as any)[k] = a[k]; });
                                  return { ...m, [key]: { ...emptyPos, ...물림, career: st, headcount: "1" } };
                                });
                              }}>{st}</button>
                          ))}
                        </span>
                        <button type="button" className="jp-job-x" title="이 분야 빼기"
                          onClick={() => 내행.forEach(removeCatRow)}>×</button>
                      </div>
                      {내행.map((c) => {
                        const row = 행읽기(c);
                        // 직급을 고르기 전에는 아래를 못 만지게 둔다 — 누구를 뽑는지부터 정해야
                        // 인원도 급여도 뜻이 생긴다. 라벨은 가장 흔한 신입을 흐리게 미리 보여 준다.
                        const 미정 = !row.career;
                        return (
                          <div key={c} className={`jp-job-row ${미정 ? "off" : ""}`}>
                            <span className="jp-job-lab">{row.career || "경력무관"}</span>
                            {!isOffice && (() => {
                              const n = Math.max(1, Number(row.headcount.replace(/[^0-9]/g, "")) || 1);
                              return (<>
                                <span className="jp-step-num">
                                  <button type="button" onClick={() => setPos(c, "headcount", String(Math.max(1, n - 1)))}
                                    disabled={미정 || n <= 1} aria-label="한 명 줄이기">−</button>
                                  <b>{n}</b>
                                  <button type="button" disabled={미정} onClick={() => setPos(c, "headcount", String(Math.min(99, n + 1)))}
                                    aria-label="한 명 늘리기">＋</button>
                                </span>
                                <span className="jp-job-unit">명</span>
                              </>);
                            })()}
                            {(() => {
                              const g = 급여읽기(row.salary);
                              return (
                                <span className={`jp-sal ${미정 ? "off" : ""}`}>
                                  <select className="jp-sal-unit" disabled={미정} value={g.형태}
                                    onChange={(e) => {
                                      const 새형태 = e.target.value;
                                      const 옮김 = !g.금액 || 원단위(g.형태) === 원단위(새형태) ? g.금액
                                        : 원단위(새형태) ? String(Number(g.금액) * 10000) : String(Number(g.금액) / 10000);
                                      setPos(c, "salary", 급여쓰기(새형태, 옮김, g.이상));
                                    }}>
                                    <option value="">급여형태</option>
                                    {SALARY_UNITS.map((u) => <option key={u.label} value={u.label}>{u.label}</option>)}
                                  </select>
                                  <span className="jp-sal-amt">
                                    <input inputMode="decimal" disabled={미정} placeholder="0" value={g.금액}
                                      onChange={(e) => {
                                        const 원 = 원단위(g.형태);
                                        const v = 원 ? e.target.value.replace(/[^0-9]/g, "")
                                          : e.target.value.replace(/[^0-9.]/g, "").replace(/^(\d*\.\d*).*$/, "$1");
                                        setPos(c, "salary", 급여쓰기(g.형태, v, g.이상));
                                      }} />
                                    <em>{급여단위(g.형태)}</em>
                                  </span>
                                  {/* 협의를 따로 체크하지 않는다 — 적어 둔 금액을 어떻게 볼지(이상·정액·협의)를
                                      금액 바로 옆에서 고르게 한다. 체크 하나를 줄 끝에 떼어 두면 금액과 상관없어 보인다. */}
                                  <select className="jp-sal-basis" disabled={미정}
                                    value={row.salaryNego === "open" ? "협의" : (g.이상 ? "이상" : "정액")}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      if (v === "협의") {
                                        setPos(c, "salaryNego", "open");
                                        setPos(c, "salary", 급여쓰기(g.형태, g.금액, false));
                                        return;
                                      }
                                      setPos(c, "salaryNego", "");
                                      setPos(c, "salary", 급여쓰기(g.형태, g.금액, v === "이상"));
                                    }}>
                                    <option value="이상">이상</option>
                                    <option value="정액">정액</option>
                                    <option value="협의">협의</option>
                                  </select>
                                </span>
                              );
                            })()}
                            {(() => {
                              const g = 급여읽기(row.salary);
                              if (g.형태 !== "시급") return null;
                              // 최저시급을 외우고 있는 사장님은 드물다 — 눌러서 채운다.

                              return (
                                <button type="button" className="jp-minwage" disabled={미정}
                                  title={`${최저임금해}년 최저임금 ${최저시급원.toLocaleString()}원`}
                                  onClick={() => setPos(c, "salary", 급여쓰기("시급", String(최저시급원), g.이상))}>
                                  최저시급
                                </button>
                              );
                            })()}
                            {/* 조건은 줄마다 따로 갖는다 — 인턴과 신입은 같은 자리가 아니다.
                                새 단계를 켜면 앞 줄 값을 물려받으니, 같으면 손댈 일이 없다. */}
                            <div className={`jp-job-cond ${미정 ? "off" : ""}`}>
                              {(() => {
                                const 고른것 = row.employment.split(",").map((x) => x.trim()).filter(Boolean);
                                return (
                                  <span className="jp-cond-f jp-emp-pop" style={{ position: "relative" }}>
                                    <span>고용형태</span>
                                    <button type="button" disabled={미정}
                                      className={`jp-cond-sel jp-cond-shift ${고른것.length ? "" : "ph"}`}
                                      onClick={(e) => { if (고용열림 === c) { set고용열림(null); return; } openPopAt(e.currentTarget, 232, 190); set고용열림(c); }}>
                                      {고른것.join(", ") || "선택하기"}
                                    </button>
                                    {고용열림 === c && popAt && (
                                      <div ref={popRef} style={{ position: "fixed", left: popAt.left, top: popAt.top, zIndex: 200, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 10, width: 232, maxWidth: "calc(100vw - 16px)", boxSizing: "border-box", display: "flex", flexWrap: "wrap", gap: 6 }}>
                                        {EMPLOYMENT_TYPES.map((t) => {
                                          const on = 고른것.includes(t);
                                          // 셋을 채우면 더는 못 켜되, 이미 켠 것은 언제든 끌 수 있어야 한다.
                                          const 잠김 = !on && 고른것.length >= 고용최대;
                                          return (
                                            <button key={t} type="button" disabled={잠김}
                                              onClick={() => setPos(c, "employment",
                                                (on ? 고른것.filter((x) => x !== t) : [...고른것, t]).join(", "))}
                                              style={{ padding: "5px 11px", borderRadius: 999, fontSize: 13,
                                                cursor: 잠김 ? "not-allowed" : "pointer",
                                                border: on ? "1.5px solid #582681" : "1.5px solid #efeff1",
                                                background: on ? "#582681" : "#fff",
                                                color: on ? "#fff" : (잠김 ? "#cfcfcf" : "#666") }}>{t}</button>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </span>
                                );
                              })()}
                              {!isOffice && (
                              <span className="jp-cond-f posshift-pop" style={{ position: "relative" }}>
                                <span>근무요일 / 시간</span>
                                <button type="button" disabled={미정} className={`jp-cond-sel jp-cond-shift ${shiftDisplay(row) ? "" : "ph"}`}
                                  onClick={(e) => { if (shiftModalCat === c) { setShiftModalCat(null); return; } openPopAt(e.currentTarget, 320, 360); setShiftModalCat(c); }}>
                                  {shiftDisplay(row) || "-"}
                                </button>
                                {shiftModalCat === c && popAt && (
                                  <WorkScheduleModal
                                    value={shiftDisplay(row)}
                                    onChange={(v) => setPos(c, "shiftText", v)}
                                    onClose={() => setShiftModalCat(null)}
                                    popRef={popRef}
                                    left={popAt.left}
                                    top={popAt.top}
                                    defaultStart={jobGroupType === "매장" ? 10 : 7}
                                    defaultEnd={jobGroupType === "매장" ? 20 : 19}
                                  />
                                )}
                              </span>
                              )}
                              {isOffice && (
                                <label className="jp-cond-f">
                                  <span>학력</span>
                                  <select className="jp-cond-sel" disabled={미정} value={row.education}
                                    onChange={(e) => setPos(c, "education", e.target.value)}>
                                    <option value="">선택하기</option>
                                    {POS_EDU.map((t) => <option key={t} value={t}>{t}</option>)}
                                  </select>
                                </label>
                              )}
                              <label className="jp-cond-f">
                                <span>성별</span>
                                <select className="jp-cond-sel" disabled={미정} value={row.gender}
                                  onChange={(e) => setPos(c, "gender", e.target.value)}>
                                  <option value="">선택하기</option>
                                  {["무관", "여성 우대", "남성 우대"].map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </label>
                              {근무지목록.length >= 2 && (
                                <label className="jp-cond-f">
                                  <span>근무지</span>
                                  <select className="jp-cond-sel" disabled={미정} value={row.location}
                                    onChange={(e) => setPos(c, "location", e.target.value)}>
                                    <option value="">전체</option>
                                    {근무지목록.map((r) => <option key={r} value={r}>{r}</option>)}
                                  </select>
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

            </div>
          </div>

          {/* 근무 조건 섹션은 없앴다 — 고용형태·근무요일/시간·학력·성별은 자리마다 다를 수
              있는 값이라 모집부문 카드 안으로 들어갔다. 남은 복리후생은 매장 전체 얘기라
              제 제목을 달고 선다(전엔 근무 조건에 얹혀 하위 항목처럼 읽혔다).
              근무기간은 뺐다. 매장 공고는 대부분 상시 근무라 139건 중 1건만 채워져 있었다. */}
          <h2 className="jobpost-section-title" style={{ marginTop: 20 }}>복리후생{reqStar}</h2>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">
              <div>
                <div className="job-detail-company-info">
                  {/* 복리후생 — 한 행을 다 쓴다. 태그가 여럿이라 좁으면 읽기 나쁘다. */}
                  <div id="jp-benefit" className="job-detail-company-row" ref={welfareRef} style={{ alignItems: "flex-start", position: "relative", gridColumn: "1 / -1" }}>
                    {/* 글자만 눌린다. flex:1 로 행을 다 차지하면 오른쪽 빈 곳을 눌러도
                        팝오버가 열려, 뭘 눌러서 열렸는지 알 수 없었다. */}
                    {!fiBenefits.trim() && (
                    <button type="button" disabled={typeLocked} onClick={() => { if (!typeLocked) setWelfareOpen((v) => !v); }}
                      style={{ flex: "0 0 auto", maxWidth: "100%", alignSelf: "flex-start", textAlign: "left", border: "none", background: "none", padding: 0, fontSize: 15, cursor: typeLocked ? "default" : "pointer", lineHeight: 1.6, color: typeLocked ? "#cfcfcf" : (benefitTags.length ? "#333" : "#cfcfcf") }}>
                      {typeLocked ? "채용유형을 먼저 선택하세요" : (benefitTags.length ? benefitTags.join(", ") : "목록에서 선택하기")}
                    </button>
                    )}
                    {freeField("benefits", fiBenefits, setFiBenefits, "예: 4대보험, 인센티브", false, () => setBenefitTags([]))}
                    {welfareOpen && !typeLocked && (() => {
                      const qq = benefitSearch.trim().toLowerCase();
                      // 처음엔 검색해야만 보였는데, 매장 입장에선 뭐가 있는지도 모른 채 빈
                      // 검색창만 보게 돼 진입장벽이었다("검색이 아니라 목록에 있는 걸 고르는게
                      // 나을듯"). 이제 목록을 항상 다 보여주고, 검색은 그 안에서 좁히는
                      // 용도로만 쓴다. 훑어보기 쉽게 가나다순으로 정렬한다.
                      const match = (n: string) => n.toLowerCase().includes(qq);
                      const customSel = benefitTags.filter((t) => !benefitTagOptions.some((o) => o.name === t) && match(t)).map((t) => ({ name: t, is_curated: false }));
                      const visible = [...customSel, ...benefitTagOptions.filter((o) => match(o.name))]
                        .sort((a, b) => a.name.localeCompare(b.name, "ko"));
                      const exact = benefitTagOptions.some((o) => o.name === benefitSearch.trim()) || benefitTags.includes(benefitSearch.trim());
                      const canAdd = benefitSearch.trim().length > 0 && !exact;
                      return (
                      <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 12, width: 360, maxWidth: "80vw" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input autoFocus value={benefitSearch} onChange={(e) => setBenefitSearch(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (canAdd) addNewBenefit(benefitSearch); } }}
                            placeholder="검색으로 좁혀보기"
                            style={{ flex: 1, minWidth: 0, boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid #efeff1", fontSize: 14, outline: "none" }} />
                          <button type="button" onClick={() => { if (canAdd) addNewBenefit(benefitSearch); }} disabled={!canAdd}
                            style={{ flexShrink: 0, padding: "0 12px", borderRadius: 8, border: "1px solid #efeff1", background: "#fff", fontSize: 13, whiteSpace: "nowrap",
                              color: canAdd ? "#582681" : "#c4c4c9", cursor: canAdd ? "pointer" : "default" }}>직접입력</button>
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 200, overflowY: "auto", marginTop: 10 }}>
                          {visible.map((o) => { const on = benefitTags.includes(o.name); return (
                            <button key={o.name} type="button" onClick={() => toggleBenefit(o.name)}
                              style={{ padding: "7px 13px", borderRadius: 999, fontSize: 14, cursor: "pointer", border: on ? "1.5px solid #582681" : "1.5px solid #efeff1", background: on ? "#582681" : "#fff", color: on ? "#fff" : "#666", display: "inline-flex", alignItems: "center", gap: 4 }}>
                              {o.name}
                              {/* 고른 것은 여기 x로 바로 뺀다 — 아래 "담은 것" 칩을 따로 또
                                  두면 같은 값이 위아래로 겹쳐 보여 헷갈렸다. */}
                              {on ? (
                                <span aria-hidden style={{ marginLeft: 1, fontSize: 13, lineHeight: 1, color: "#efeff1" }}>×</span>
                              ) : !o.is_curated && (
                                <span role="button" title="목록에서 지우기" aria-label={`${o.name} 지우기`}
                                  onClick={(e) => { e.stopPropagation(); removeNewBenefit(o.name); }}
                                  style={{ marginLeft: 1, fontSize: 13, lineHeight: 1, cursor: "pointer", color: "#a8a8ad" }}>×</span>
                              )}
                            </button>
                          ); })}
                          {visible.length === 0 && <span style={{ fontSize: 13, color: "#bbb" }}>맞는 것이 없어요. ‘직접입력’으로 넣을 수 있어요.</span>}
                        </div>

                        {nonMember && <button type="button" onClick={() => { setWelfareOpen(false); setFiOpen("benefits"); }}
                          style={{ display: "block", width: "100%", textAlign: "left", marginTop: 10, border: "none", borderTop: "1px solid #eee", background: "none", padding: "9px 0 0", fontSize: 13, color: "#582681", cursor: "pointer" }}>✎ 한 줄로 직접 쓰기</button>}
                      </div>
                      );
                    })()}
                  </div>
                  </div>
                </div>

            </div>
          </div>

          {/* 근무지 — 전체 주소에서 필터용 시·군·구를 뽑아내고 지도를 함께 보여준다. */}
          {/* 카드 안에 '근무지역' 제목을 또 달면 섹션 이름과 같은 말이 위아래로 겹친다.
              필수 표시는 섹션 제목이 받고, 추가 단추는 그 줄 오른쪽 끝에 선다. */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 20 }}>
            <h2 id="jp-region" className="jobpost-section-title" style={{ margin: 0 }}>근무지{reqStar}</h2>
            <button type="button" onClick={() => setExtraLocations((prev) => [...prev, { address: "", detail: "" }])}
              title="근무지를 하나 더 넣어요" className="jp-add-btn">
              <MapPinPlus size={14} />근무지 추가</button>
          </div>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">
              <div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 8 : 12 }}>
                  <input readOnly value={nmAddress} onClick={() => openAddressSearch()}
                    placeholder="주소 검색을 눌러주세요"
                    style={{ minWidth: 0, boxSizing: "border-box", border: "1px solid #efeff1", borderRadius: 8, background: "#fff", fontSize: 15, outline: "none", padding: "9px 11px", textAlign: "left", cursor: "pointer" }} />
                  <input value={nmAddressDetail} onChange={(e) => setNmAddressDetail(e.target.value)}
                    placeholder="상세주소 (동·호수 등)"
                    style={{ minWidth: 0, boxSizing: "border-box", border: "1px solid #efeff1", borderRadius: 8, background: "#fff", fontSize: 15, outline: "none", padding: "9px 11px", textAlign: "left" }} />
                </div>
                {/* 주소 없이 지점명만 있으면 지도를 그리지 않는다. 카카오는 주소를 못 찾으면
                    낱말로 장소를 검색해 첫 결과를 찍는데, "천안청당점" 으로는 엉뚱한 가게가
                    잡힌다. 틀린 지도는 없는 지도보다 나쁘다 — 구직자가 그리로 찾아간다. */}
                {nmAddress.trim()
                  ? <AddressMap address={nmFullAddress} name={newCompanyName.trim() || undefined} height={220} />
                  : nmAddressDetail.trim()
                    ? <div style={{ fontSize: 12.5, color: "#c0392b", marginTop: 6 }}>주소 검색을 눌러 주소를 넣어야 지도가 나와요. 지점명만으로는 엉뚱한 곳이 찍혀요.</div>
                    : null}

                {/* 근무지가 여러 곳인 공고 — 주소 칸을 하나씩 더 만들고, 각자 지도를 붙인다.
                    여기 담긴 주소에서도 지역을 뽑아 검색에 걸리게 한다. */}
                {extraLocations.map((loc, i) => {
                  const full = [loc.address.trim(), loc.detail.trim()].filter(Boolean).join(" ");
                  const 고치기 = (patch: Partial<{ address: string; detail: string }>) =>
                    setExtraLocations((prev) => prev.map((x, k) => (k === i ? { ...x, ...patch } : x)));
                  return (
                    <div key={i} style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #f7f7f8" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: "#6f6f75" }}>근무지 {i + 2}</span>
                        <button type="button" onClick={() => setExtraLocations((prev) => prev.filter((_, k) => k !== i))}
                          title="이 근무지 빼기" aria-label={`근무지 ${i + 2} 빼기`}
                          style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", border: "none", background: "none", color: "#c4c4c9", padding: 0, cursor: "pointer" }}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)", gap: isMobile ? 8 : 12 }}>
                        <input readOnly value={loc.address} onClick={() => openAddressSearch((addr) => 고치기({ address: addr }))}
                          placeholder="주소 검색을 눌러주세요"
                          style={{ minWidth: 0, boxSizing: "border-box", border: "1px solid #efeff1", borderRadius: 8, background: "#fff", fontSize: 15, outline: "none", padding: "9px 11px", textAlign: "left", cursor: "pointer" }} />
                        <input value={loc.detail} onChange={(e) => 고치기({ detail: e.target.value })}
                          placeholder="상세주소 (동·호수 등)"
                          style={{ minWidth: 0, boxSizing: "border-box", border: "1px solid #efeff1", borderRadius: 8, background: "#fff", fontSize: 15, outline: "none", padding: "9px 11px", textAlign: "left" }} />
                      </div>
                      {/* 이름표는 지점명(상세 칸)을 쓴다. 그게 곧 그 자리의 이름이다.
                          다만 주소 없이 지점명만으로는 지도를 그리지 않는다(위와 같은 이유). */}
                      {loc.address.trim()
                        ? <AddressMap address={full} name={loc.detail.trim() || newCompanyName.trim() || undefined} height={200} />
                        : loc.detail.trim()
                          ? <div style={{ fontSize: 12.5, color: "#c0392b", marginTop: 6 }}>주소 검색을 눌러 주소를 넣어야 지도가 나와요.</div>
                          : null}
                    </div>
                  );
                })}

              </div>

            </div>
          </div>

          {/* 지원 방법 — 어디로 어떻게 넣는가(접수방법 · 담당자 · 채용 절차). */}
          <h2 className="jobpost-section-title" style={{ marginTop: 20 }}>지원 안내{reqStar}</h2>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">
              <div>
              {/* 지원방법(좌) · 담당자(우) 2열 — 기업회원·비회원 공용.
                  지원방법을 팝오버에서 고르면, 그 방법에 필요한 칸만 오른쪽에 생긴다.
                  문자·전화 → 전화 / 이메일 → 메일 / 둘 중 하나라도 → 이름 / 회사 홈페이지 지원 → 홈페이지 URL.
                  뷰티워크 온라인지원만 고르면 담당자 칸은 생기지 않는다(연락처가 필요 없는 방법이라).
                  비회원 공고의 담당자 연락처는 상세화면에서 구직자에게 노출되지 않는다(JobDetailView). */}
              {(() => {
                // 매장 공고는 자체 채용 홈페이지가 없는 경우가 대부분이라 '회사 홈페이지 지원'을 빼고, 본사에서만 쓴다.
                // 매장은 '직접방문'(워크인)이 흔하고, 본사는 그런 접수를 받지 않는다.
                // '회사 홈페이지 지원'은 그 반대 — 매장은 자체 채용 홈페이지가 없다.
                // 문자·전화도 매장만 — 본사 채용은 담당자 개인 번호로 받지 않는다.
                const methodOptions = CONTACT_METHOD_OPTIONS
                  .filter((m) => m !== "회사 홈페이지 지원" || isOffice)
                  .filter((m) => m !== "직접방문" || !isOffice)
                  .filter((m) => (m !== "문자" && m !== "전화") || !isOffice)
                  // '상세요강 참조'는 관리자 대행 등록에만 연다. 기업에게 열어 두면 가장 쉬운
                  // 길이라 다들 그걸 고르고 연락처를 안 채운다 — 구직자가 지원할 길이 사라진다.
                  // 관리자는 원문 연락처가 본문에만 있는 외부 공고를 옮길 때 달리 고를 것이 없다.
                  .filter((m) => m !== "상세요강 참조" || mode === "admin");
                const canPhone = contactMethods.includes("문자") || contactMethods.includes("전화");
                const canEmail = contactMethods.includes("이메일");
                const canName = canPhone || canEmail;
                const canUrl = isOffice && contactMethods.includes("회사 홈페이지 지원");
                // 담당자 칸이 생기면 URL은 지원방법 밑(좌)에, 우측이 비면 URL을 우측에 둔다.
                const urlOnLeft = canUrl && canName;
                const isNmAdminJob = mode === "admin" && nonMember;
                const lblS: CSSProperties = { width: 68, flexShrink: 0, whiteSpace: "nowrap", color: "#999", fontSize: 15, paddingTop: 4 };
                // 값이 없으면 연보라 블록, 채우면 글자만 — 폼의 다른 칸과 같은 규칙
                // 빈 값은 폼의 다른 항목과 같은 규격(56px 연보라 블록), 채우면 남은 폭을 쓴다.
                // 값은 라벨(제목)보다 커지지 않게 한다 — 라벨이 15 이므로 값은 14.
                // 값이 더 크면 라벨이 부제처럼 보여 어느 쪽이 항목 이름인지 헷갈린다.
                const fld = (filled: boolean): CSSProperties => filled
                  ? { flex: 1, minWidth: 0, border: "none", background: "transparent", borderRadius: 5, fontSize: 14, fontWeight: 400, color: "#333", outline: "none", padding: "3px 2px", minHeight: 24, boxSizing: "border-box" }
                  : { flexShrink: 0, width: 56, height: 20, border: "none", background: PH_BG, borderRadius: 5, fontSize: 14, fontWeight: 400, color: "#333", outline: "none", padding: 0, boxSizing: "border-box" };
                return (
                  /* 좁은 화면에선 두 칸이 너무 좁아 세로로 쌓는다(.jobpost-form이 admin-form-row-2col을 1열로 덮어서 직접 지정) */
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)", gap: isMobile ? "0" : "10px 28px", alignItems: "start" }}>
                    {/* 지원방법 (좌) — 연보라 블록을 눌러 팝오버에서 복수 선택 */}
                    <div ref={contactMethodsRef} style={{ position: "relative", minWidth: 0 }}>
                     {/* 제목을 값 위에 세운다 — 옆에 두면 라벨 폭(68px)만큼 값이 안으로 밀려
                         왼쪽 끝이 다른 섹션과 어긋났다. 모집부문 조건 칸과 같은 규칙이다. */}
                     <div style={{ padding: "4px 0" }}>
                      <div style={{ ...lblS, width: "auto", paddingTop: 0, marginBottom: 3 }}>지원방법</div>
                      <div style={{ minWidth: 0 }}>
                        <button type="button"
                          onClick={(e) => { if (contactMethodsOpen) { setContactMethodsOpen(false); return; } openPopAt(e.currentTarget, 232, 150); setContactMethodsOpen(true); }}
                          style={{ ...fld(contactMethods.length > 0), textAlign: "left", cursor: "pointer", lineHeight: 1.5,
                            ...(contactMethods.length ? null : { width: "auto", height: "auto", minHeight: 24, background: "none", padding: 0, color: "#cfcfcf" }) }}>
                          {/* 복리후생의 '검색하기'와 짝. 왼쪽 라벨이 이미 무슨 칸인지 말한다. */}
                          {contactMethods.length ? contactMethods.join(", ") : "선택하기"}
                        </button>
                        {contactMethodsOpen && popAt && (
                          <div ref={popRef} style={{ position: "fixed", left: popAt.left, top: popAt.top, zIndex: 200, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 10, width: 232, maxWidth: "calc(100vw - 16px)", boxSizing: "border-box", display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {methodOptions.map((m) => {
                              const on = contactMethods.includes(m);
                              return (
                                <button key={m} type="button"
                                  onClick={() => setContactMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))}
                                  style={{ padding: "5px 11px", borderRadius: 999, fontSize: 13, cursor: "pointer", border: on ? "1.5px solid #582681" : "1.5px solid #efeff1", background: on ? "#582681" : "#fff", color: on ? "#fff" : "#666" }}>{m}</button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                     </div>
                     {urlOnLeft && (
                       <div style={{ padding: "4px 0" }}>
                         <div style={{ ...lblS, width: "auto", paddingTop: 0, marginBottom: 3 }}>홈페이지 URL</div>
                         <input value={externalApplyUrl} onChange={(e) => setExternalApplyUrl(e.target.value)}
                           placeholder="https://example.com/recruit" inputMode="url" style={fld(!!externalApplyUrl)} />
                       </div>
                     )}
                    </div>
                    {/* 담당자 (우) — 고른 방법에 필요한 칸만 생성. 우측이 빌 때는 홈페이지 URL을 여기에 둔다 */}
                    {(canName || canUrl) ? (
                      <div style={{ padding: "4px 0", minWidth: 0 }}>
                        <div style={{ ...lblS, width: "auto", paddingTop: 0, marginBottom: 3 }}>
                          {canName ? "담당자" : "홈페이지 URL"}
                          {isNmAdminJob && canName && <span style={{ fontSize: 10, color: "#e3e3e6", marginLeft: 5 }}>관리자용</span>}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          {canUrl && !urlOnLeft && (
                            <input value={externalApplyUrl} onChange={(e) => setExternalApplyUrl(e.target.value)}
                              placeholder="https://example.com/recruit" inputMode="url" style={fld(!!externalApplyUrl)} />
                          )}
                          {/* 이름·전화·메일을 한 줄에 세로바로 나눈다. 칸 이름은 자리글로 들어가
                              제목 세 줄이 사라진다. 고른 방법에 따라 나오는 칸만 사이에 바를 넣는다. */}
                          {canName && (() => {
                            const 칸 = [
                              { k: "name", ph: "이름", v: nmManagerName, set: setNmManagerName, im: undefined as ("numeric" | "email" | undefined), 폭: 66 },
                              canPhone ? { k: "phone", ph: "전화", v: nmManagerPhone, set: (v: string) => setNmManagerPhone(전화꼴(v)), im: "numeric" as const, 폭: 122 } : null,
                              canEmail ? { k: "mail", ph: "메일", v: nmContactEmail, set: setNmContactEmail, im: "email" as const, 폭: 168 } : null,
                            ].filter(Boolean) as { k: string; ph: string; v: string; set: (v: string) => void; im?: "numeric" | "email"; 폭: number }[];
                            // 이름·전화와 한 줄을 나눠 쓰면 메일에 200px도 안 남는다 —
                            // 주소가 조금만 길어도 끝이 잘려 무엇을 적었는지 못 본다.
                            // 셋 다 있을 때는 메일을 아랫줄로 내려 칸 폭을 다 준다.
                            const 메일따로 = canPhone && canEmail;
                            return (
                              // 두 칸짜리 격자 — 첫 칸은 이름(제 폭만), 둘째 칸이 남는 자리를 다 쓴다.
                              // 메일은 둘째 칸으로 내려 전화와 왼쪽 끝이 맞는다(칸 폭을 어림해
                              // 들여쓰면 화면 폭에 따라 어긋난다). 칸 이름은 자리글로 들어가
                              // 제목 세 줄이 사라진다.
                              <div style={{ display: "grid", gridTemplateColumns: `${칸[0].폭}px minmax(0, 1fr)`,
                                alignItems: "center", gap: "6px", padding: "3px 0", minWidth: 0 }}>
                                {칸.map((f, i) => (
                                  <span key={f.k} style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0,
                                    ...(f.k === "mail" && 메일따로 ? { gridColumn: 2 } : null) }}>
                                    {i > 0 && (
                                      <span aria-hidden style={{ flexShrink: 0,
                                        color: 메일따로 && f.k === "mail" ? "transparent" : "#dcdce0" }}>|</span>
                                    )}
                                    {/* 크롬은 placeholder·name 에 든 낱말('전화'·'메일')로 칸을 알아보고
                                        연락처 아이콘을 띄운다. 그래서 자리글을 속성에서 빼고 우리가 그린다.
                                        name·autocomplete 도 뜻 없는 값으로 둔다. */}
                                    <span style={{ position: "relative", display: "flex", flex: 1, minWidth: 0 }}>
                                      <input value={f.v} inputMode={f.im} aria-label={`담당자 ${f.ph}`}
                                        autoComplete={`bw-${i}`} name={`bw-${i}`} data-lpignore="true" data-1p-ignore
                                        onChange={(e) => f.set(e.target.value)}
                                        style={{ flex: 1, minWidth: 0, height: 22, border: "none", borderRadius: 5, fontSize: 14, color: "#333", outline: "none",
                                          background: f.v ? "transparent" : PH_BG, padding: f.v ? "0 2px" : "0 8px", boxSizing: "border-box" }} />
                                      {!f.v && (
                                        <span aria-hidden style={{ position: "absolute", left: 8, top: 0, bottom: 0, display: "flex", alignItems: "center",
                                          fontSize: 14, color: "#b4b4b9", pointerEvents: "none" }}>{f.ph}</span>
                                      )}
                                    </span>
                                  </span>
                                ))}
                              </div>
                            );
                          })()}
                          {isNmAdminJob && canName && (
                            <div style={{ fontSize: 11, color: "#a8a8ad", marginTop: 3 }}>구직자에게는 노출되지 않아요 · 회원가입 유도용 내부 연락처</div>
                          )}
                        </div>
                      </div>
                    ) : <div />}
                  </div>
                );
              })()}
              {/* 마감일 — 언제까지 받는지는 어떻게 받는지 다음에 온다. */}
              <div id="jp-deadline" ref={deadlineRef} style={{ position: "relative", padding: "4px 0", marginTop: 10 }}>
                <div style={{ fontSize: 15, color: "#999", marginBottom: 3 }}>마감일<span style={{ color: "#e74c3c", marginLeft: 2 }}>*</span></div>
                <button type="button"
                  onClick={(e) => { if (deadlineModalOpen) { setDeadlineModalOpen(false); return; } setDeadlineDraft(alwaysOpen ? "" : form.deadline); setAlwaysOpenDraft(alwaysOpen); openPopAt(e.currentTarget, 240, 168); setDeadlineModalOpen(true); }}
                  style={{ border: "none", background: "transparent", padding: 0, fontSize: 15, color: (alwaysOpen || form.deadline) ? "#333" : "#cfcfcf", cursor: "pointer" }}>
                  {alwaysOpen ? "상시채용" : form.deadline ? `~ ${form.deadline.replace(/-/g, ".")}` : "YYYY.MM.DD"}
                </button>
                {deadlineModalOpen && popAt && (
                  /* 절대위치 240px이라 좁은 화면에서 오른쪽으로 넘쳐 잘렸다 → 표 팝오버와 같은 화면 고정 좌표로. */
                  <div ref={popRef} style={{ position: "fixed", left: popAt.left, top: popAt.top, zIndex: 200, background: "#fff", border: "1px solid #e5e5e5", borderRadius: "10px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: "12px", width: 240, maxWidth: "calc(100vw - 16px)", boxSizing: "border-box" }}>
                    <input type="date" min={new Date().toISOString().slice(0, 10)} value={alwaysOpenDraft ? "" : deadlineDraft} disabled={alwaysOpenDraft} onChange={(e) => setDeadlineDraft(e.target.value)}
                      style={{ width: "100%", height: 40, boxSizing: "border-box", border: "1px solid #ddd", borderRadius: "8px", padding: "0 12px", fontSize: "14px", background: alwaysOpenDraft ? "#f5f5f5" : "#fff", color: alwaysOpenDraft ? "#aaa" : "#333" }} />
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", marginTop: "10px", fontSize: "13px", color: "#555", cursor: "pointer" }}>
                      <input type="checkbox" checked={alwaysOpenDraft} onChange={(e) => setAlwaysOpenDraft(e.target.checked)} /> 상시채용 (마감일 없음)
                    </label>
                    <div style={{ display: "flex", gap: "6px", marginTop: "12px", justifyContent: "flex-end" }}>
                      <button type="button" className="admin-secondary-btn" style={{ padding: "6px 12px", fontSize: "13px" }} onClick={() => setDeadlineModalOpen(false)}>취소</button>
                      <button type="button" className="company-primary-btn" style={{ padding: "6px 14px", fontSize: "13px" }} onClick={applyDeadline}>적용</button>
                    </div>
                  </div>
                )}
              </div>



              {/* 채용 절차 — 본사(기업) 공고에서만 노출 */}
              {jobGroupType === "기업" && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "7px 0" }}>
                  <span style={{ width: 72, flexShrink: 0, color: "#999", fontSize: 15 }}>채용 절차</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", flex: 1 }}>
                    {PRESET_PROCESS.기업.map((p) => {
                      const on = hiringProcess.includes(p);
                      return (
                        <button key={p} type="button"
                          onClick={() => setHiringProcess(on ? hiringProcess.filter((x) => x !== p) : [...hiringProcess, p])}
                          style={{ border: "none", background: "none", padding: 0, fontSize: 15, cursor: "pointer", color: on ? "#582681" : "#c4c4c4" }}>
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

        </div>

        {/* ═══ 오른쪽 컬럼: 상세이미지 + 상세내용 + 채용절차·비고 ═══ */}
        <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: "8px" }}>

          {/* 상세요강 */}
          {/* 위 여백은 '공고제목' 제목과 같게(앞 카드 아래 40px) — 컬럼 gap 8 + 카드 marginBottom을 감안해 24 추가. */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4, marginTop: 24 }}>
            {/* 필수는 칸이 아니라 섹션이 진다 — 사진이든 글이든 하나만 올라오면 된다. */}
            <h2 id="jp-detail" className="jobpost-section-title" style={{ margin: 0 }}>상세요강{reqStar}</h2>
          </div>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">

              {/* 상세 항목 → 그 자리에서 바로 쓰는 인라인 textarea(모달·팝오버 없음, 자동 높이) */}
              {textFields.map((k) => {
                const meta = textFieldMeta[k];
                const content = ((form as any)[k] || "") as string;
                return (
                  <div key={k} style={{ padding: "8px 0", borderBottom: k === textFields[textFields.length - 1] ? "none" : "1px solid var(--color-border)" }}>
                    {isOffice && (
                      <label className="admin-form-label" style={{ margin: "0 0 4px", display: "block", color: "#a8a8ad", fontWeight: 400 }}>
                        {meta.label}
                      </label>
                    )}
                    <AutoTextarea
                      value={content}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      style={{ width: "100%", fontSize: 16, color: "#333", lineHeight: 1.5, fontFamily: "inherit" }} />
                  </div>
                );
              })}

              {mode === "admin" && (
                <div
                  tabIndex={0}
                  onFocus={() => setPasteZone("body")}
                  onBlur={() => setPasteZone((z) => (z === "body" ? null : z))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (imgDragRef.current) { dropToBody(null); return; } if (!uploading) processFiles(e.dataTransfer.files); }}
                  onPaste={(e) => { const fs = imagesFromClipboard(e); if (fs.length) { e.preventDefault(); if (!uploading) processFiles(fs); } }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 72, marginTop: 14, padding: 10, borderRadius: 10, border: `1.5px dashed ${pasteZone === "body" ? "#582681" : "#efeff1"}`, background: "#f7f7f8", outline: "none", fontSize: 13, color: "#a8a8ad" }}>
                  여기로 끌어다 놓거나, 눌러서 Ctrl+V
                </div>
              )}
              {/* 첨부 — 회원은 글 아래 한 줄. 파일 고르기 하나면 된다.
                  관리자 직접등록만 점선 상자를 남긴다: 외부 공고를 옮길 때 스크린샷을
                  Ctrl+V 로 바로 붙이고 여러 장을 끌어다 놓는 일이 실제 작업이다. */}
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 10, paddingTop: 14, borderTop: "1px solid var(--color-border)" }}>
                <label style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0, height: 34, padding: "0 14px", border: "1px solid #d8d8de", borderRadius: 8, background: "#fff", fontSize: 13.5, color: uploading ? "#b4b4b9" : "#444", cursor: uploading ? "wait" : "pointer" }}>
                  {uploading ? "올리는 중…" : "파일 첨부하기"}
                  <input type="file" accept="image/*" multiple disabled={uploading || detailImages.length >= 12} onChange={handleImageUpload} style={{ display: "none" }} />
                </label>
                <span style={{ fontSize: 13, color: "#8a8a90" }}>
                  이미지 {detailImages.length}/12 · JPG·PNG·WebP · 5MB 이하
                </span>
              </div>
              {detailImages.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                  {detailImages.map((d, idx) => (
                    <div key={d.url + idx} draggable
                      onDragStart={() => { imgDragRef.current = { zone: "body", idx }; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); if (imgDragRef.current) dropToBody(idx); }}
                      title="끌어서 순서를 바꿔요"
                      style={{ position: "relative", width: 84, cursor: "grab" }}>
                      <img src={d.url} alt={`상세 ${idx + 1}`} style={{ display: "block", width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }} />
                      <span style={{ position: "absolute", bottom: 3, left: 3, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "0 4px" }}>{idx + 1}</span>
                      <button type="button" onClick={() => removeImage(idx)} title="삭제"
                        style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, lineHeight: 1 }}>×</button>
                      <button type="button" onClick={() => 자르기열기(idx)} title="사진 자르기"
                        style={{ position: "absolute", bottom: 3, right: 3, display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer" }}>
                        <Crop size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* 자르기 창은 배너·상세 칸이 모바일/PC로 갈리지 않는 이 자리에 모아 둔다. */}
              {자를줄 && 자를줄.files.length > 0 && (
                <ImageCropModal file={자를줄.files[0]}
                  guides={[{ key: "6:2", ratio: 3, note: "한 장일 때" }, { key: "3:2", ratio: 3 / 2, note: "여러 장일 때" }]}
                  minLongEdge={900} cancelLabel="자르지 않고 넣기"
                  onCancel={() => 줄에서올리기(자를줄.files[0])}
                  onCropped={(blob) => {
                    const 원 = 자를줄.files[0];
                    줄에서올리기(new File([blob], 원.name, { type: blob.type || "image/jpeg" }));
                  }} />
              )}
              {!자를줄 && 자를사진 && (
                <ImageCropModal file={자를사진.file} minLongEdge={900}
                  onCancel={() => set자를사진(null)} onCropped={자른뒤} />
              )}
              {!자를줄 && 자를배너 && (
                <ImageCropModal file={자를배너.file}
                  guides={[{ key: "6:2", ratio: 3, note: "한 장일 때" }, { key: "3:2", ratio: 3 / 2, note: "여러 장일 때" }]}
                  minLongEdge={900}
                  onCancel={() => set자를배너(null)} onCropped={배너자른뒤} />
              )}
            </div>
          </div>

        </div>
      </div>
        </div>
      </div>

      {/* ═══ 매장정보/기업정보 (맨 하단, 기업회원 전용) ═══
          이 폼에서 새로 받지 않는다 — 매장정보 설정 페이지에 이미 저장된 값을
          그대로 불러와 보여주기만 한다("매장정보로 항목 추가해서 불러와줘").
          같은 값을 두 군데서 받으면 어긋날 수 있어 여기서는 읽기 전용이다. */}
      {기업폼 && cp && (
        <div className="jobpost-form jp-header-offset" style={{ width: "100%", maxWidth: 콘텐츠폭, margin: `16px ${mx} 0`, boxSizing: "border-box" }}>
          <h2 className="jobpost-section-title">{infoPageLabel}</h2>
          <div style={{ fontSize: 12, color: "#999", margin: "8px 0 8px 2px" }}>
            {infoPageLabel} 페이지에 저장된 값이 그대로 나가요 · <a href="/company/dashboard/settings" style={{ color: "#582681" }}>{infoPageLabel} 수정하기</a>
          </div>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">
              {(() => {
                const row: CSSProperties = { display: "flex", alignItems: "flex-start", gap: 12, padding: "7px 0" };
                const lbl2: CSSProperties = { width: 76, flexShrink: 0, color: "#999", fontSize: 15, paddingTop: 1 };
                const val: CSSProperties = { fontSize: 15, color: "#333", lineHeight: 1.5 };
                const location = composeCompanyAddress(cp.region_sido, cp.region_sigungu, cp.address);
                const rows: [string, string][] = isOffice
                  ? [["회사명", cp.company_name], ["업종", cp.industry], ["직원수", cp.company_size], ["홈페이지", cp.website_url], ["주소", location]]
                  : [["매장명", cp.company_name], ["업종", cp.industry], ["주소", location], [infoPageLabel, cp.description]];
                const filled = rows.filter(([, v]) => (v || "").trim());
                return filled.length ? filled.map(([k, v]) => (
                  <div key={k} style={row}><span style={lbl2}>{k}</span><span style={val}>{v}</span></div>
                )) : <p style={{ fontSize: 13.5, color: "#999", margin: 0 }}>{infoPageLabel}에 값을 채우면 여기 나와요.</p>;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ═══ 기업 정보 (맨 하단) · 상세 다른 섹션과 동일한 인라인 스타일 ═══ */}
      {mode === "admin" && nonMember && (
        <div className="jobpost-form" style={{ width: "100%", maxWidth: 콘텐츠폭, margin: `16px ${mx} 0`, boxSizing: "border-box" }}>
          <h2 className="jobpost-section-title">{L.section}</h2>
          <div style={{ fontSize: 12, color: "#999", margin: "8px 0 8px 2px" }}>기업회원 페이지의 “{L.section}”를 불러와 자동 작성돼요 · 공고 상세 맨 아래에 표시됩니다</div>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">
              {(() => {
                const row: CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "7px 0" };
                const lbl2: CSSProperties = { width: 76, flexShrink: 0, color: "#999", fontSize: 15 };
                const req: CSSProperties = { color: "var(--color-primary)" };
                // 모집요강과 동일: 빈 값이면 텍스트 없는 연보라 하이라이트 블록, 입력하면 확장(플레이스홀더 없음)
                const inpHl = (filled: boolean): CSSProperties => filled
                  ? { flex: 1, minWidth: 0, border: "none", background: "transparent", fontSize: 15, fontWeight: 400, color: "#333", outline: "none", padding: "6px 2px", height: 32, lineHeight: "20px", boxSizing: "border-box" }
                  : { flexShrink: 0, border: "none", background: PH_BG, borderRadius: 5, width: 56, height: 20, padding: 0, fontSize: 15, color: "#333", outline: "none", boxSizing: "border-box" };
                const sel3 = (filled: boolean): CSSProperties => ({ ...inpHl(filled), appearance: "none", WebkitAppearance: "none", MozAppearance: "none", cursor: "pointer" });
                const full: CSSProperties = { gridColumn: "1 / -1" };
                return (
                  // 트랙을 그냥 1fr 로 두면 긴 값(인스타 주소 등)이 칸을 밀어내 카드 밖으로 삐져나간다.
                  // minmax(0,1fr) 이어야 칸 안에서 줄바꿈된다.
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)", gap: "2px 20px" }}>
                    <div style={{ ...row, ...full, alignItems: "flex-start" }}>
                      <span style={{ ...lbl2, paddingTop: 6 }}>{L.intro}</span>
                      <AutoTextarea style={nmDescription ? { flex: 1, minWidth: 0, fontSize: 15, color: "#333", padding: "6px 2px", fontFamily: "inherit", lineHeight: 1.6 } : { ...inpHl(false), marginTop: 6 }} value={nmDescription} onChange={(e) => setNmDescription(e.target.value)} />
                    </div>
                    <div style={row}><span style={lbl2}>{L.name}<span style={req}> *</span></span><input style={inpHl(!!newCompanyName)} value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} /></div>
                    <div style={row}><span style={lbl2}>업종</span>{!fiIndustry.trim() && (<select style={sel3(!!nmIndustry)} value={nmIndustry} onChange={(e) => { if (e.target.value === "__fi__") { setFiOpen("industry"); return; } setFiIndustry(""); setNmIndustry(e.target.value); }}><option value=""></option>{industryGroupsFor(jobGroupType === "매장" ? "STORE" : "OFFICE").flatMap((g) => g.items).map((it) => (<option key={it} value={it}>{it}</option>))}{nonMember && <option value="__fi__">직접입력…</option>}</select>)}{freeField("industry", fiIndustry, setFiIndustry, "직접 입력…", false, () => setNmIndustry(""))}</div>
                    <div style={row}><span style={lbl2}>브랜드명</span><input style={inpHl(!!newBrandName)} value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)} /></div>
                    <div style={{ ...row, alignItems: "flex-start" }}><span style={{ ...lbl2, paddingTop: 6 }}>{L.site}</span>
                      {/* 인스타 주소는 한 줄에 안 들어간다. input 은 줄바꿈이 안 되므로 늘어나는 칸을 쓴다. */}
                      <AutoTextarea style={nmHomepage ? { flex: 1, minWidth: 0, fontSize: 15, color: "#333", padding: "6px 2px", fontFamily: "inherit", lineHeight: 1.5 } : { ...inpHl(false), marginTop: 6 }}
                        value={nmHomepage} onChange={(e) => setNmHomepage(e.target.value)} /></div>
                    <div style={row}><span style={lbl2}>주소<span style={req}> *</span></span>
                      <input readOnly style={{ ...inpHl(!!nmAddress), cursor: "pointer" }} value={nmAddress}
                        onClick={() => openAddressSearch()} placeholder="주소 검색을 눌러주세요" />
                    </div>
                    <div style={row}><span style={lbl2}>상세주소</span>
                      <input style={inpHl(!!nmAddressDetail)} value={nmAddressDetail}
                        onChange={(e) => setNmAddressDetail(e.target.value)} placeholder="동·호수 등" />
                    </div>
                    <div style={row}><span style={lbl2}>{L.size}</span><select style={sel3(!!nmSize)} value={nmSize} onChange={(e) => setNmSize(e.target.value)}><option value=""></option>{["1~10명", "10~50명", "50~100명", "100~300명", "300~1000명", "1000명 이상"].map((s) => (<option key={s} value={s}>{s}</option>))}</select></div>
                    <div style={row}><span style={lbl2}>설립연도</span><input type="number" min="1900" max={new Date().getFullYear()} style={inpHl(!!nmFounded)} value={nmFounded} onChange={(e) => setNmFounded(e.target.value)} /></div>
                    <div style={row}><span style={lbl2}>대표자</span><input style={inpHl(!!nmRepresentative)} value={nmRepresentative} onChange={(e) => setNmRepresentative(e.target.value)} /></div>
                    <div style={row}><span style={lbl2}>{L.phone}</span><input style={inpHl(!!nmPhone)} value={nmPhone} onChange={(e) => setNmPhone(e.target.value)} /></div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {isMobile && mode === "admin" && (
        <button type="button" onClick={runCurate} disabled={parsing || curating}
          style={{ width: "100%", maxWidth: 콘텐츠폭, margin: `0 ${mx} 12px`, display: "block", padding: "10px", borderRadius: 8, border: "1px solid #582681", background: "#fff", color: "#582681", fontSize: 14, fontWeight: 700, boxSizing: "border-box", opacity: curating ? 0.6 : 1 }}>
          {curating ? "다듬는 중..." : "✨ 큐레이션"}
        </button>
      )}
      {isMobile && (
        <button type="button" className="jobpost-mobile-submit" onClick={() => handleSubmit("publish")}>
          {saved ? (editId ? "✅ 수정완료" : "✅ 등록완료") : (editId ? "공고 수정 완료" : "공고 등록")}
        </button>
      )}

      <RegionSelectModal
        open={regionModalOpen}
        initial={regionList}
        onClose={() => setRegionModalOpen(false)}
        onApply={(regions) => { setRegionList(regions); setRegionModalOpen(false); }}
      />

      {/* 우편번호 검색 레이어 — 닫기 버튼을 직접 두어 인앱 브라우저에서도 빠져나올 수 있게 한다. */}
      {addrOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 480, height: "70vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", borderBottom: "1px solid #eee" }}>
              <span style={{ fontSize: 15 }}>주소 검색</span>
              <button type="button" onClick={() => setAddrOpen(false)}
                style={{ background: "none", border: "none", fontSize: 22, lineHeight: 1, color: "#888", cursor: "pointer" }}>×</button>
            </div>
            <div ref={addrBoxRef} style={{ flex: 1, minHeight: 0 }} />
          </div>
        </div>
      )}



      {showPreview && (
        <div className="jobpost-preview-overlay" onClick={() => setShowPreview(false)}>
          <div className="jobpost-preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="jobpost-preview-head">
              {/* 좁은 화면에서는 괄호 안 설명을 감춘다. 두 줄로 접히면 그만큼 정작 봐야 할
                  공고가 밀려난다. 무엇을 보는 화면인지는 "공고 미리보기" 로 이미 통한다. */}
              <span>공고 미리보기<span className="jobpost-preview-head-sub"> (구직자에게 보이는 실제 화면)</span></span>
              <button onClick={() => setShowPreview(false)} aria-label="닫기">×</button>
            </div>
            <div className="jobpost-preview-scope">
              <JobDetailView ref={previewRef} job={previewJob} previewMode
                asideAction={
                  <>
                    <button className="job-detail-apply-btn" disabled style={{ opacity: 0.7, cursor: "default" }}>
                      지원서 작성하기
                    </button>
                    {/* 구직자 화면에 있는 버튼이라 미리보기에도 있어야 한다. 누를 일은 없으니 꺼 둔다. */}
                    <button className="job-detail-aside-bookmark" disabled style={{ opacity: 0.7, cursor: "default" }}>
                      <Bookmark size={16} />
                      스크랩
                    </button>
                  </>
                }
              />
            </div>
            <div className="jobpost-preview-foot">
              <button className="admin-secondary-btn" onClick={handlePrint}>인쇄</button>
              <button className="admin-secondary-btn" onClick={handleDownloadPdf}>{isDownloading ? "저장 중..." : "PDF 다운로드"}</button>
              <button className="company-primary-btn" onClick={() => { setShowPreview(false); handleSubmit("publish"); }}>이대로 등록</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}