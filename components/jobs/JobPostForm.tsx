"use client";
import { industryGroupsFor } from "@/lib/data/industries";
import { useState, useEffect, useLayoutEffect, useRef, useCallback, type ChangeEvent, type ClipboardEvent, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronDown, Trash2, Upload, Eye, Save, MapPin, Briefcase, Building2, Clock, Users, Tag, GraduationCap, Settings, Send, ImagePlus, Wand2, Bookmark } from "lucide-react";
import { shortRegion } from "@/lib/regionShort";
import JobDetailView from "@/components/jobs/JobDetailView";
import { formatSalaryWon } from "@/lib/salary";
import JobGroupSelectModal from "@/components/JobGroupSelectModal";
import RegionSelectModal from "@/components/RegionSelectModal";
import AddressMap from "@/components/AddressMap";
import BannerStrip from "@/components/jobs/BannerStrip";
import { BANNER_PRESETS, drawSampleBanner } from "@/lib/bannerTemplate";
import { REGIONS } from "@/lib/data/regions";
import { EMPLOYMENT_TYPES } from "@/lib/data/employment";
import { composeCompanyAddress, splitAddress } from "@/lib/address";

// 근무지역 인라인 자동완성용: "시도 시군구" 평탄화 목록
const ALL_REGIONS: string[] = REGIONS.flatMap((r) => r.sigungu.map((g) => `${r.sido} ${g}`));

const WORK_DAY_OPTIONS = ["월", "화", "수", "목", "금", "토", "일"];
const WEEKDAY_DAYS = ["월", "화", "수", "목", "금"]; // 평일(미입력 시 기본값)
const WEEKEND_DAYS = ["토", "일"]; // 주말
// 근무시간 풀다운 옵션: 오전/오후 구분 없이 24시간 표기, 1시간 간격, 오전 9시~밤 11시(자정~오전 8시 제외)
const CAREER_OPTIONS = ["신입", "1년 이상", "2년 이상", "3년 이상", "5년 이상", "경력 무관"];
const EDUCATION_OPTIONS = ["학력무관", "고졸 이상", "초대졸 이상", "대졸 이상", "석사 이상"];
// 모집부문 표용 간결 옵션(여백 확보, 직접입력 없음)
const POS_CAREER = ["무관", "신입", "경력", "1년~", "3년~", "5년~", "10년~", "매니저", "실장", "부원장", "원장"];
// 급여: 지급 주기를 고르면 앞머리(시·주·월·연)가 자동으로 붙고 금액만 적으면 된다. 협의는 단독 값.
const SALARY_UNITS: { label: string; prefix: string }[] = [
  { label: "시급", prefix: "시" },
  { label: "주급", prefix: "주" },
  { label: "월급", prefix: "월" },
  { label: "연봉", prefix: "연" },
];
const POS_EDU = ["무관", "고졸", "초대졸", "대졸", "석사"];
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
const CONTACT_METHOD_OPTIONS = ["문자", "이메일", "전화", "뷰티워크 온라인지원", "회사 홈페이지 지원"]; // 지원방법(복수)
const CONVERTIBLE_SUFFIX = " · 정규직 전환 가능"; // 계약직·인턴 하위 옵션

// 내용에 맞춰 늘어나는 textarea.
// 높이를 JS 로 재던 방식은 재는 순간의 폭에 좌우돼, 불러오기로 값이 채워지거나
// 배치가 뒤늦게 다시 잡히면 엉뚱한 높이가 굳어 글이 잘렸다. 여기서는 같은 글을
// 안 보이게 겹쳐 그려(.autogrow::after) 브라우저가 높이를 직접 정하게 한다.
// 글꼴·줄간격·여백·폭은 style 로 바깥에 주고, 안쪽 둘이 그대로 물려받는다.
function AutoTextarea({
  value, style, ...rest
}: { value: string; style?: CSSProperties } & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "style" | "rows"
>) {
  return (
    <span className="autogrow" data-value={value} style={style}>
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
        color: on ? "#5f0080" : "#777", fontSize: 11.5, lineHeight: 1, fontWeight: 500,
        cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }
    : { display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 11px", borderRadius: 9,
        border: "1px solid #e2e2e6", background: on ? "#f4f4f6" : "#fff", color: "#666",
        fontSize: 13, fontWeight: 500, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" };
  // 배너 칸이 비어 있으면 "공고마다 또 올려야 하나" 싶어 그냥 넘어가기 쉽다.
  // 한 번 등록해 두면 자동으로 들어온다는 걸 이 자리에서 알려 준다.
  const infoPageLabel = companyProfile?.company_type === "OFFICE" ? "기업정보" : "매장정보";
  const bannerHint = mode === "company" && bannerImages.length === 0 ? (
    <p style={{ fontSize: 12.5, color: "#999", lineHeight: 1.55, margin: "8px 0 0" }}>
      {infoPageLabel}에 배너를 등록해 두면 공고를 올릴 때마다 자동으로 들어가요.
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
  const [ocrEnabled, setOcrEnabled] = useState(false);
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
  type PosRow = { career: string; education: string; employment: string; salary: string; workDays: string; workTime: string; headcount: string; gender: string };
  const emptyPos: PosRow = { career: "", education: "", employment: "", salary: "", workDays: "", workTime: "", headcount: "", gender: "" };
  const [posMeta, setPosMeta] = useState<Record<string, PosRow>>({});
  const setPos = (cat: string, k: keyof PosRow, v: string) =>
    setPosMeta((m) => { const cur = m[cat] || emptyPos; return { ...m, [cat]: { ...cur, [k]: v } }; });
  // 같은 모집분야를 여러 행으로 쓸 수 있게(예: 헤어디자이너 신입 1 · 경력 1) 내부 키에만 "#2" 꼬리표를 붙인다.
  //   화면 표시·저장은 항상 꼬리표를 뗀 원래 분야명으로 나간다.
  const baseCat = (c: string) => c.replace(/#\d+$/, "");
  const nextDupKey = (base: string, list: string[]) => { let i = 2; while (list.includes(`${base}#${i}`)) i++; return `${base}#${i}`; };
  const MAX_POS_ROWS = 10;
  // "추가 ＋"에서 고른 분야를 새 행으로 붙인다. 이미 있는 분야면 중복 행이 된다(신입/경력 분리 모집).
  const addCatRow = (base: string) => {
    if (categories.length >= MAX_POS_ROWS) { alert(`모집부문은 최대 ${MAX_POS_ROWS}행까지예요.`); return; }
    const dup = categories.some((c) => baseCat(c) === base);
    const key = dup ? nextDupKey(base, categories) : base;
    setCategories([...categories, key]);
    // 같은 분야가 이미 있으면 첫 행 값을 복제해 두고 다른 부분(경력 등)만 고치게
    const src = categories.find((c) => baseCat(c) === base);
    if (src) setPosMeta((m) => ({ ...m, [key]: { ...(m[src] || emptyPos) } }));
  };
  const removeCatRow = (cat: string) => {
    setCategories((prev) => prev.filter((c) => c !== cat));
    setPosMeta((m) => { const { [cat]: _drop, ...rest } = m; return rest; });
  };
  // 불러오기로 파싱된 경력·급여·인원을, 관리자가 모집분야를 고르면 첫 행에 채워줌(수기 재입력 방지).
  const [parsedPrimary, setParsedPrimary] = useState<PosRow | null>(null);
  const [posShiftOpen, setPosShiftOpen] = useState<string | null>(null); // 근무요일/시간 팝오버가 열린 분야
  const [cellOpen, setCellOpen] = useState<string | null>(null); // 표 셀 직접입력 팝오버 `${cat}|${field}`
  const cellInputRef = useRef<HTMLInputElement>(null); // 표 셀 직접입력 팝오버의 입력칸(주기 클릭 후 바로 타이핑되게)
  const [addRowOpen, setAddRowOpen] = useState(false); // 모집부문 '행 추가' — 분야를 골라 행을 붙임(같은 분야 중복 가능)
  // 표 안 팝오버는 화면 기준(fixed) 좌표로 띄운다. 표를 overflow visible로 바꾸면 720px 표가
  //   페이지 밖으로 넘쳐 화면 전체가 옆으로 밀리기 때문(모바일에서 특히 심함).
  const [popAt, setPopAt] = useState<{ left: number; top: number } | null>(null);
  const [cellFree, setCellFree] = useState(false); // 목록 대신 직접입력 모드
  const popTrigger = useRef<{ el: HTMLElement; width: number; height: number } | null>(null);
  const placePop = (el: HTMLElement, width: number, height: number) => {
    const r = el.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
    // 아래 공간이 모자라면 트리거 위쪽으로 뒤집어 띄운다(모바일 하단에서 잘리지 않게)
    const below = r.bottom + 4;
    const raw = below + height > window.innerHeight - 8 ? r.top - height - 4 : below;
    const top = Math.max(8, Math.min(raw, window.innerHeight - height - 8)); // 항상 화면 안
    setPopAt({ left, top });
  };
  const openPopAt = (el: HTMLElement | null, width: number, height: number) => {
    if (!el) return;
    popTrigger.current = { el, width, height };
    placePop(el, width, height);
  };
  // 팝오버가 그려진 뒤 실제 크기를 재서 위치를 다시 잡는다(내용에 맞춘 폭이라 추정치와 다를 수 있음)
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
    return () => { window.removeEventListener("scroll", onMove, true); window.removeEventListener("resize", onMove); };
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
    importImages, ocrEnabled,
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
      parseUrl, importMode, findQuery, importImages, ocrEnabled, nonMember, newCompanyName, newBrandName, nmDescription, nmAddress,
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
    set(setImportImages, d.importImages); set(setOcrEnabled, d.ocrEnabled);
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
    // 오피스(기업)는 급여가 대부분 회사내규/면접 후 협의 → 협의를 기본값으로
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
  // 근무요일/시간 팝오버: 바깥 클릭 시 닫기
  useEffect(() => {
    if (!posShiftOpen) return;
    const onDown = (e: MouseEvent) => { if (!(e.target as HTMLElement)?.closest?.(".posshift-pop")) setPosShiftOpen(null); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [posShiftOpen]);
  // 표 셀 직접입력 팝오버: 바깥 클릭 시 닫기
  useEffect(() => {
    if (!cellOpen) return;
    const onDown = (e: MouseEvent) => { if (!(e.target as HTMLElement)?.closest?.(".poscell-pop")) setCellOpen(null); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [cellOpen]);
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
          meta[key] = { career: p.career || "", education: p.education || "", employment: p.employment || "", salary: p.salary || "", workDays: p.workDays || "", workTime: p.workTime || "", headcount: p.headcount || "", gender: p.gender || "" };
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
  const looksLikeText = (file: File): Promise<boolean> =>
    new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const W = 160, H = Math.max(1, Math.round((img.height / img.width) * W));
          const cv = document.createElement("canvas");
          cv.width = W; cv.height = H;
          const cx = cv.getContext("2d");
          if (!cx) return resolve(false);
          cx.drawImage(img, 0, 0, W, H);
          const px = cx.getImageData(0, 0, W, H).data;
          const gray = new Float32Array(W * H);
          let extreme = 0;
          for (let i = 0; i < W * H; i++) {
            const g = (px[i * 4] * 0.299 + px[i * 4 + 1] * 0.587 + px[i * 4 + 2] * 0.114) / 255;
            gray[i] = g;
            if (g < 0.2 || g > 0.85) extreme++;
          }
          let edges = 0;
          for (let y = 0; y < H; y++) {
            for (let x = 1; x < W; x++) {
              if (Math.abs(gray[y * W + x] - gray[y * W + x - 1]) > 0.35) edges++;
            }
          }
          resolve(extreme / (W * H) > 0.7 && edges / (W * H) > 0.02);
        } catch { resolve(false); }
        finally { URL.revokeObjectURL(url); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); resolve(false); };
      img.src = url;
    });

  // 상세요강에 붙인 그림(글자 있는 것)에서 값을 읽어 온다. 글을 붙여넣었으면 함께 보내
  // 글에 있는 값은 글을 그대로 쓰게 한다 — 그림에서 읽은 전화번호는 한 자리씩 틀린다.
  const [readingImgs, setReadingImgs] = useState(false);
  // 그림에서 글자를 읽는 건 요금이 든다. 켠 적이 없는데 돈이 나가는 일이 없도록
  // 늘 꺼진 채로 시작하고, 저장해 두지도 않는다(다음에 열어도 다시 꺼져 있다).
  const readableImageUrls = ocrEnabled ? detailImages.filter((d) => d.readable).map((d) => d.url).slice(0, 8) : [];
  // 그림을 모델에 보낼지는 '텍스트 인식' 토글 하나로만 정한다. 붙이는 것과 읽는 것은
  // 다른 일이다 — 사진은 얼마든지 붙여 두되, 읽어서 요금을 물릴지는 사람이 고른다.
  // (예전엔 북마클릿이 가져온 사진이 토글을 우회해 늘 읽혔다.)
  const sendImageUrls = ocrEnabled ? [...importImages, ...readableImageUrls].slice(0, 8) : [];
  // 그림 한 장이 대략 2,000토큰. 소넷 5 입력 $2/MTok 기준 장당 6원쯤 더 붙는다.
  const imageCostWon = sendImageUrls.length * 6;
  const readFromDetailImages = async () => {
    if (!ocrEnabled) return;
    const urls = readableImageUrls;
    if (!urls.length) return;
    if (mode === "admin") { setNonMember(true); setCompanyId(null); }
    setReadingImgs(true); setParseMsg("");
    try {
      const token = mode === "admin" ? localStorage.getItem("admin_token") : localStorage.getItem("access_token");
      const text = pasteText.trim();
      const res = await fetch("/api/admin/external-jobs/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(text ? { text, image_urls: urls.slice(0, 8) } : { image_urls: urls.slice(0, 8) }),
      });
      const j = await res.json();
      if (!j.success) { setParseMsg(j.error?.message || "그림에서 읽지 못했어요."); return; }
      applyParsed(j.data);
      setParseMsg(`✓ 그림 ${urls.length}장에서 읽어 채웠어요. 값을 확인해 주세요.`);
    } catch { setParseMsg("네트워크 오류가 발생했어요."); }
    finally { setReadingImgs(false); }
  };

  const processFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    if (detailImages.length + files.length > 12) {
      alert("상세 이미지는 최대 12장까지 첨부할 수 있습니다."); return;
    }
    setUploading(true);
    try {
      for (const file of files) {
        const hasText = await looksLikeText(file);
        const r = await uploadImage(await compressImage(file));
        if (r.success && r.url) {
          setDetailImages((prev) => [...prev, { url: r.url!, name: r.name || file.name, readable: hasText }]);
        } else {
          alert(r.error || "이미지 업로드에 실패했습니다.");
        }
      }
    } finally {
      setUploading(false);
    }
  };
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    await processFiles(e.target.files || []);
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
  const PH_BG = "#f8f6fd"; // 거의 화이트에 가까운 아주 연한 연보라
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
      if (showTypeToggle && !jobGroupType) { alert("채용유형(매장/오피스)을 선택해주세요."); return; }
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
        // 자격요건은 선택 — 조건 없이 뽑는 공고도 있어 필수로 두지 않는다.
        if (jobGroupType === "매장") {
          // 매장: 상세요강 이미지 또는 포지션 소개
          if (detailImages.length === 0 && !form.description?.trim()) {
            alert("상세요강 이미지를 1장 이상 첨부하거나,\n이미지가 없으면 상세요강 글을 입력해주세요.");
            return;
          }
        } else {
          // 오피스: 담당업무는 상세 이미지가 없을 때만 필수(경력·학력은 모집부문 표에서)
          if (detailImages.length === 0 && !form.responsibilities?.trim()) {
            alert("담당업무를 입력하거나 상세요강 이미지를 첨부해주세요."); return;
          }
        }
        if (benefitTags.length === 0 && !fiBenefits.trim()) { alert("복리후생을 1개 이상 선택해주세요."); return; }
      }
      // 마감일: 날짜 선택 또는 상시채용 필수
      if (status === "publish" && !alwaysOpen && !form.deadline) {
        alert("마감일을 선택하거나 상시채용을 체크해주세요.");
        return;
      }
    }

    // 모집부문 표(positions) — 분야별 경력·고용형태·급여·근무요일/시간·인원·성별우대. 필터·호환용 대표값은 첫 행에서 유도.
    const positions = categories.map((c) => { const r = posMeta[c] || emptyPos; return { category: baseCat(c), career: r.career.trim(), education: r.education.trim(), employment: r.employment.trim(), salary: r.salary.trim(), workDays: r.workDays.trim() || WEEKDAY_DAYS.join("·"), workTime: normWorkTime(r.workTime), headcount: r.headcount.trim(), gender: r.gender.trim() }; });
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
    const workType = (p0.employment === "아르바이트" || p0.employment === "스페어") ? "PART_TIME"
      : p0.employment === "계약직" ? "CONTRACT" : "FULL_TIME";
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
      external_contact_email: nmContactEmail.trim() || null,
      external_contact_name: nmManagerName.trim() || null,
      external_contact_phone: nmManagerPhone.replace(/\D/g, "") || null,
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

  // ── 텍스트 항목 메타 ───────────────────────
  const benefitsLabel = jobGroupType === "매장" ? "근무조건·복지" : "복리후생";
  // 모집부문 표 셀 스타일
  const thc: React.CSSProperties = { textAlign: "left", padding: "9px 4px", fontSize: 12.5, color: "#7a6f8a", fontWeight: 600, borderBottom: "1px solid #ece7f2", whiteSpace: "nowrap" };
  const reqStar = <span style={{ color: "#e9a3a3" }}> *</span>; // 필수 열 표시(모집분야만)
  const tdc: React.CSSProperties = { padding: "9px 4px", borderBottom: "1px solid #f3f0f8", verticalAlign: "middle" };
  // 첫 열은 왼쪽 여백을 없애 위 '모집부문'·'모집분야' 라벨과 시작점을 맞춘다.
  const firstCol: React.CSSProperties = { paddingLeft: 0 };
  const cellInput: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #e0d8ec", borderRadius: 6, padding: "5px 8px", fontSize: 13.5, background: "#fff" };
  // 근무시간 숫자 입력: 타이핑 중에는 숫자·콜론만 남기고, 칸을 벗어날 때 HH:MM으로 정리한다.
  //   "9"→09:00, "930"→09:30, "0930"→09:30, "2000"→20:00 (24시 넘거나 60분 넘으면 잘라 맞춤)
  const cleanTime = (v: string) => v.replace(/[^\d:]/g, "").slice(0, 5);
  const fmtTime = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    if (!d) return "";
    const h = parseInt(d.length <= 2 ? d : d.slice(0, d.length - 2), 10);
    const m = d.length <= 2 ? 0 : parseInt(d.slice(-2), 10);
    if (isNaN(h)) return "";
    return `${String(Math.min(23, h)).padStart(2, "0")}:${String(Math.min(59, isNaN(m) ? 0 : m)).padStart(2, "0")}`;
  };
  // 둘 다 비면 workTime 자체를 비운다("~"만 남지 않게)
  const setTimeRange = (cat: string, start: string, end: string) =>
    setPos(cat, "workTime", start || end ? `${start}~${end}` : "");
  // 저장·미리보기 시 한 번 더 정리 — 입력 직후 칸을 벗어나지 않고 바로 등록해도 09:30 형태로 나가게
  const normWorkTime = (v: string) => {
    const t = (v || "").trim();
    if (!t || !t.includes("~")) return t;
    const [a, b] = t.split("~");
    const f = (x: string) => (/^\d{1,4}$/.test((x || "").trim()) ? fmtTime(x) : (x || "").trim());
    const st = f(a), en = f(b);
    return st || en ? `${st}~${en}` : "";
  };
  const cellSelect: React.CSSProperties = { width: "100%", minHeight: 24, boxSizing: "border-box", border: "none", borderRadius: 5, padding: "3px 6px", fontSize: 12.5, WebkitAppearance: "none", appearance: "none", cursor: "pointer" };
  // 값이 없으면 연보라 자리표시, 채우면 배경 없이 글자만(테두리는 쓰지 않음)
  const cellFill = (filled: boolean): React.CSSProperties => ({ background: filled ? "transparent" : PH_BG });
  // 클릭-선택 셀: 옵션 있으면 드롭다운(+비회원 '직접입력…'). 값이 목록에 없으면 클릭 텍스트→팝오버. 급여처럼 옵션 없으면 항상 팝오버.
  // 급여 앞머리 교체: "월 300" 에서 주기만 바꿔도 금액은 남는다. 협의였으면 금액 없이 시작.
  const withSalaryUnit = (cur: string, prefix: string) => {
    const rest = cur.replace(/^\s*[시주월연]\s*/, "").replace(/^협의\s*$/, "").trim();
    return rest ? `${prefix} ${rest}` : `${prefix} `;
  };
  // 표 셀 입력: iOS 네이티브 select 피커가 화면 절반을 덮을 만큼 커서, 목록도 자체 팝오버로 띄운다.
  //   options가 있으면 컴팩트 목록, units(급여)면 지급주기 칩, 그 외에는 자유입력.
  const posCell = (cat: string, field: keyof PosRow, options: string[], ph = "직접 입력", allowFi = true, units?: typeof SALARY_UNITS) => {
    const v = (posMeta[cat] || emptyPos)[field];
    const key = `${cat}|${field}`;
    const open = cellOpen === key;
    const freeInput = options.length === 0 || cellFree;      // 목록 없는 칸이거나 '직접입력'을 고른 상태
    const width = units ? 214 : 168;
    const height = freeInput ? (units ? 126 : 88) : Math.min(options.length + (allowFi && nonMember ? 1 : 0), 7) * 30 + 14;
    return (
      <span className="poscell-pop" style={{ position: "relative", display: "block" }}>
        <button type="button"
          onClick={(e) => { if (open) { setCellOpen(null); return; } setCellFree(false); openPopAt(e.currentTarget, width, height); setCellOpen(key); }}
          style={{ ...cellSelect, ...cellFill(!!v), textAlign: "left", color: "#333", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v || ""}</button>
        {open && popAt && (
          <div ref={popRef} style={{ position: "fixed", left: popAt.left, top: popAt.top, zIndex: 200, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 6, boxSizing: "border-box",
            // 목록은 항목 길이에 맞춰 좁게(오른쪽 빈 공간 제거), 자유입력·급여는 입력칸이 있어 고정 폭
            ...(freeInput ? { width } : { width: "max-content", minWidth: 84, maxWidth: 220 }) }}>
            {!freeInput ? (
              <div style={{ maxHeight: 216, overflowY: "auto" }}>
                {options.map((o) => (
                  <button key={o} type="button" onClick={() => { setPos(cat, field, o); setCellOpen(null); }}
                    style={{ display: "block", width: "100%", textAlign: "left", border: "none", borderRadius: 5, padding: "6px 8px", fontSize: 12.5, lineHeight: 1.2, cursor: "pointer",
                      background: o === v ? "#f7f1fd" : "transparent", color: o === v ? "#5f0080" : "#333" }}>{o}</button>
                ))}
                {v && (
                  <button type="button" onClick={() => { setPos(cat, field, ""); setCellOpen(null); }}
                    style={{ display: "block", width: "100%", textAlign: "left", border: "none", borderTop: "1px solid #f0f0f0", background: "transparent", borderRadius: 5, padding: "6px 8px", fontSize: 11.5, color: "#aaa", cursor: "pointer" }}>선택 해제</button>
                )}
                {allowFi && nonMember && (
                  <button type="button" onClick={() => setCellFree(true)}
                    style={{ display: "block", width: "100%", textAlign: "left", border: "none", borderTop: "1px solid #f0f0f0", background: "transparent", borderRadius: 5, padding: "6px 8px", fontSize: 11.5, color: "#5f0080", cursor: "pointer" }}>직접입력…</button>
                )}
              </div>
            ) : (
              <>
                {units && (
                  /* 지급 주기 선택 → 앞머리(시·주·월·연) 자동 입력. 금액만 이어서 적으면 된다. */
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                    {units.map((u) => {
                      const on = v.trim().startsWith(u.prefix);
                      return (
                        <button key={u.label} type="button"
                          onClick={() => { setPos(cat, field, withSalaryUnit(v, u.prefix)); cellInputRef.current?.focus({ preventScroll: true }); }}
                          style={{ border: `1px solid ${on ? "#5f0080" : "#e0d8ec"}`, background: on ? "#f7f1fd" : "#fff", color: on ? "#5f0080" : "#666", borderRadius: 6, padding: "2px 7px", fontSize: 11.5, cursor: "pointer" }}>{u.label}</button>
                      );
                    })}
                    <button type="button" onClick={() => { setPos(cat, field, "협의"); setCellOpen(null); }}
                      style={{ border: `1px solid ${v.trim() === "협의" ? "#5f0080" : "#e0d8ec"}`, background: v.trim() === "협의" ? "#f7f1fd" : "#fff", color: v.trim() === "협의" ? "#5f0080" : "#666", borderRadius: 6, padding: "2px 7px", fontSize: 11.5, cursor: "pointer" }}>협의</button>
                  </div>
                )}
                <input ref={cellInputRef} type="text" value={v} onChange={(e) => setPos(cat, field, e.target.value)} placeholder={ph}
                  onKeyDown={(e) => { if (e.key === "Enter") setCellOpen(null); }}
                  style={{ width: "100%", boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 6, padding: "5px 7px", fontSize: 12 }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  {options.length > 0 ? <button type="button" onClick={() => setCellFree(false)} style={{ border: "none", background: "none", color: "#888", fontSize: 11.5, cursor: "pointer" }}>목록으로</button> : <span />}
                  <button type="button" onClick={() => setCellOpen(null)} className="company-primary-btn" style={{ padding: "3px 11px", fontSize: 11.5 }}>확인</button>
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
  const textFieldMeta: Record<TextKey, { label: string; hint?: string; placeholder: string }> = {
    benefits: { label: "혜택·복지", placeholder: "복리후생·혜택을 입력하세요" },
    responsibilities: { label: "담당업무", hint: "필수 · 주요 업무를 입력", placeholder: "담당 업무를 입력하세요" },
    description: {
      // 섹션 제목도 '상세요강'이라 그 안의 글 칸임을 드러낸다(위는 이미지 칸).
      label: "상세요강 글",
      hint: detailImages.length > 0 ? "선택 · 상세 이미지 아래에 표시" : "필수 (이미지 없을 시)",
      placeholder: "",
    },
    requirements: { label: "자격요건", placeholder: "" },
    preferred: { label: "우대사항", placeholder: "" },
  };
  // 오피스는 담당업무(JD) 중심, 매장은 포지션 소개 중심
  const textFields: TextKey[] = isOffice
    ? ["responsibilities", "requirements", "preferred"]
    : ["description", "requirements", "preferred"];

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
    jobType: jobGroupType === "기업" ? "사무직" : "매장직",
    jobCategories: [...new Set(categories.map(baseCat))],
    career: form.career || "경력무관",
    education: form.education || "",
    region: regionList.join(", "),
    employType: fiEmployment.trim() || (form.type ? form.type + ((fullTimeConvertible && (form.type === "계약직" || form.type === "인턴")) ? CONVERTIBLE_SUFFIX : "") : "협의"),
    headcount: fiHeadcount.trim() || (form.headcount ? `${form.headcount}명` : "00명"), // 자유입력 우선, 미언급 시 '00명'
    genderPref: jobGroupType === "매장" ? genderPref : "",
    deadline: (alwaysOpen || !form.deadline) ? "상시채용" : form.deadline.replace(/-/g, "."),
    salary: fmtSalary() || "면접 후 협의",
    positions: categories.map((c) => { const r = posMeta[c] || emptyPos; return { category: baseCat(c), career: r.career.trim(), education: r.education.trim(), employment: r.employment.trim(), salary: r.salary.trim(), workDays: r.workDays.trim() || WEEKDAY_DAYS.join("·"), workTime: normWorkTime(r.workTime), headcount: r.headcount.trim(), gender: r.gender.trim() }; }),
    color: "#e8f0fe",
    description: form.description || "",
    requirements: form.requirements ? form.requirements.split("\n").filter(Boolean) : [],
    preferreds: form.preferred ? form.preferred.split("\n").filter(Boolean) : [],
    benefits: fiBenefits.trim() ? fiBenefits.split(",").map((s) => s.trim()).filter(Boolean) : (form.benefits ? form.benefits.split("\n").filter(Boolean) : benefitTags),
    responsibilities: form.responsibilities ? form.responsibilities.split("\n").filter(Boolean) : [],
    process: hiringProcess.filter((s) => s.trim()),
    notes: notes,
    logo_url: isNm ? null : cp?.logo_url,
    cover_images: isNm ? bannerImages.map((b) => ({ url: b.url })) : (cp?.cover_images || []),
    detailImages: detailImages,
    companyInfo: {
      name: previewCompanyName,
      brandName: isNm ? newBrandName : (cp?.brand_name || ""),
      industry: isNm ? (fiIndustry.trim() || nmIndustry) : "",
      representative: isNm ? nmRepresentative : (cp?.representative_name || ""),
      companyType: jobGroupType === "매장" ? "매장" : "오피스",
      size: isNm ? nmSize : (cp?.company_size || ""),
      founded: isNm ? (nmFounded ? `${nmFounded}년` : "") : (cp?.founded_year || ""),
      phone: isNm ? nmPhone : (cp?.company_phone || ""),
      website: isNm ? nmHomepage : (cp?.website_url || ""),
      location: isNm ? nmFullAddress : (cp ? composeCompanyAddress(cp.region_sido, cp.region_sigungu, cp.address) : ""),
      latitude: null,
      longitude: null,
    },
    companyAddress: isNm ? nmFullAddress : (cp ? composeCompanyAddress(cp.region_sido, cp.region_sigungu, cp.address) : ""),
    workDaysText: fiWorkDays.trim() || (workDaysNego ? "요일 협의" : (workDays.length ? workDays.join("·") : "요일 협의")),
    workPeriodText: fiWorkPeriod.trim() || workPeriod || "협의",
    workTimeText: fiWorkTime.trim() || (workTimeNego ? "시간 협의" : (workTimeStart && workTimeEnd ? `${workTimeStart}~${workTimeEnd}` : "시간 협의")),
    // 비회원(관리자) 공고는 담당자 연락처를 구직자에게 노출하지 않음 → 미리보기도 동일하게 숨기고 '뷰티워크 온라인지원'만
    isExternal: isNm,
    contactName: "",
    contactPhone: "",
    contactEmail: "",
    contactMethods: isNm ? ["뷰티워크 온라인지원"] : contactMethods,
  };

  // 본문 콘텐츠(760px) 가로 정렬: 관리자 직접등록은 목록과 맞춰 왼쪽 정렬, 기업회원 폼은 기존대로 가운데 정렬.
  const mx = mode === "admin" ? "0" : "auto";

  return (
    <>
      {/* 헤더 폭·정렬을 본문(760px)과 일치 → 상단 버튼 오른쪽 끝이 본문 오른쪽 끝과 맞음 */}
      <div className="admin-form-header" style={{ maxWidth: 760, marginLeft: mx, marginRight: mx }}>
        {mode !== "admin" && (
          <button className="admin-back-btn" onClick={() => router.push(listHref)}>
            <ChevronLeft size={18} /> 목록으로
          </button>
        )}
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
                  <span style={{ fontSize: 12, fontWeight: 600, color: "#5f0080" }}>{drafts.length}</span>
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
                          style={{ display: "flex", alignItems: "center", gap: 8, textAlign: "left", width: "100%", padding: "8px 10px", borderRadius: 8, border: on ? "1.5px solid #5f0080" : "1px solid #eee", background: on ? "#f3ecfb" : "#fff", cursor: on ? "default" : "pointer", font: "inherit" }}>
                          <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 14, color: "#2b2533" }}>
                            {d.title || "(제목 없음)"}
                            {d.company_name && <span style={{ color: "#9a92a6", marginLeft: 6, fontSize: 13 }}>· {d.company_name}</span>}
                          </span>
                          {on ? (
                            <span style={{ flexShrink: 0, fontSize: 12, color: "#5f0080", fontWeight: 600 }}>편집 중</span>
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

      {/* 페이지 제목 — 아래 콘텐츠(760px, mx 정렬)와 시작점을 맞춘다 */}
      {!isMobile && (
        <div style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 10px`, boxSizing: "border-box" }}>
          <h2 style={{ fontSize: 18, fontWeight: 400, color: "#1a1a1a", margin: "0 0 0 2px" }}>
            {editId ? "채용공고 수정" : "채용공고 등록"}
          </h2>
        </div>
      )}


      {/* 채용유형(매장/오피스) — 최상단, 외부 불러오기 박스 밖. 라디오 선택, 불러오기로 자동 추정 후 확정·수정 */}
      {showTypeToggle && (
        <div style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 12px`, boxSizing: "border-box", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 24px" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#5f0080", fontSize: 16, fontWeight: 400 }}>
            <Settings size={16} /> 채용유형
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {([["매장", "매장"], ["기업", "오피스"]] as ["" | "기업" | "매장", string][]).map(([val, label]) => {
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
          {!jobGroupType && <span style={{ fontSize: 12, color: "#e9a3a3" }}>선택하면 급여·복지 등 항목이 열립니다.</span>}
        </div>
      )}

      {/* 새로고침 뒤 남아 있던 내용을 되살렸다는 표시. 원치 않으면 여기서 비운다. */}
      {restored && (
        <div style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 12px`, boxSizing: "border-box",
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          padding: "10px 14px", background: "#f7f1fd", border: "1px solid #e0d5ee", borderRadius: 10 }}>
          <span style={{ fontSize: 13.5, color: "#4a4453" }}>
            쓰던 내용을 되살렸어요{restored ? ` (${new Date(restored).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} 기준)` : ""}.
          </span>
          <button type="button"
            onClick={() => { if (confirm("쓰던 내용을 지우고 빈 화면에서 새로 쓸까요?")) { clearAutosave(); location.reload(); } }}
            style={{ marginLeft: "auto", padding: "6px 12px", borderRadius: 8, border: "1px solid #d9cfe8", background: "#fff", color: "#5f0080", fontSize: 13, cursor: "pointer" }}>
            새로 쓰기
          </button>
        </div>
      )}

      {mode === "admin" && (
        <div style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 16px`, boxSizing: "border-box" }}>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "6px 16px", marginBottom: 8, marginLeft: 2 }}>
            <span style={{ fontWeight: 400, fontSize: 16, color: "#5f0080" }}>{mode === "admin" ? "외부 공고 불러오기" : "타 사이트 공고 불러오기"}</span>
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
                    style={{ fontSize: 13.5, color: "#5f0080", textDecoration: "none", whiteSpace: "nowrap" }}>
                    {c.name} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
          <div style={{ background: "#f6f3fb", border: "1px solid #e5e0eb", borderRadius: 10, padding: "12px 16px", boxSizing: "border-box" }}>

          {importMode === "paste" ? (
          /* 글 붙여넣기: 카페·블로그 글은 드래그 복사가 된다. 캡처보다 싸고 정확하다. */
          <div>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={"공고 글을 통째로 복사해 붙여넣으세요.\n(제목·모집분야·급여·근무시간·연락처가 다 들어가면 좋아요)"}
              style={{ width: "100%", minHeight: 160, padding: 12, border: "1.5px solid #c9b8de", borderRadius: 8, fontSize: 13.5, lineHeight: 1.6, resize: "vertical", background: "#fff" }}
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
                style={{ flexShrink: 0, padding: "9px 18px", borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 700, cursor: (parsing || !pasteText.trim()) ? "default" : "pointer", opacity: parsing ? 0.6 : 1 }}>
                {parsing ? "불러오는 중..." : "불러오기"}
              </button>
            </div>
            {/* 붙인 사진이 요금에 얼마나 얹히는지 눌러 보기 전에 알려준다. */}
            <div style={{ marginTop: 6, fontSize: 12.5, color: "#8d84a0" }}>
              {sendImageUrls.length
                ? `글과 사진 ${sendImageUrls.length}장을 읽어요 · 사진값 약 ${imageCostWon}원이 더 붙어요`
                : "글자만 읽어요 · 붙여 둔 사진은 요금이 붙지 않아요"}
            </div>
            {importImages.length > 0 && (
              <div style={{ marginTop: 8, padding: "10px 12px", background: "#f7f1fd", border: "1px solid #e0d5ee", borderRadius: 8, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: "#5f0080" }}>가져온 사진 {importImages.length}장</span>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {importImages.slice(0, 6).map((u, i) => (
                    <img key={i} src={u} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid #e0d5ee" }} />
                  ))}
                </div>
                <button type="button" onClick={attachImportedImages} disabled={importingImgs}
                  style={{ marginLeft: "auto", padding: "7px 14px", borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 13, cursor: "pointer", opacity: importingImgs ? 0.6 : 1 }}>
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
                  style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", padding: "0 12px", borderRadius: 8, border: "1px solid #e5e0eb", background: "#fff", color: "#5f0080", fontSize: 15, fontWeight: 400, textDecoration: "none", whiteSpace: "nowrap" }}>원문 ↗</a>
              )}
              <button type="button" onClick={runImport} disabled={finding || parsing}
                style={{ flexShrink: 0, padding: "0 18px", borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", opacity: (finding || parsing) ? 0.6 : 1, whiteSpace: "nowrap" }}>
                {(finding || parsing) ? "불러오는 중..." : "불러오기"}</button>
            </div>
            <div style={{ fontSize: 12, color: "#999", marginTop: 6 }}>회사명을 넣으면 공고 목록을 보여줘요. 목록에서 공고를 선택한 뒤 <b>불러오기</b>를 누르면 값을 가져와요. (URL을 넣으면 바로 불러와요.)</div>
            {findMsg && <div style={{ fontSize: 12.5, marginTop: 6, color: findResults.length ? "#10b981" : "#c0392b" }}>{findMsg}</div>}
            {findResults.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 220, overflowY: "auto", border: "1px solid #e5e0eb", borderRadius: 8, background: "#fff" }}>
                {findResults.map((r) => { const on = picked?.url === r.url; return (
                  <div key={r.idx}
                    onClick={() => selectFoundJob(r)}
                    title="선택하면 위 검색칸에 표시돼요. ↗로 원문을 새 탭에서 볼 수 있어요."
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderBottom: "1px solid #f2eef8", cursor: "pointer", background: on ? "#faf7fe" : "transparent", transition: "background 0.12s" }}>
                    {/* 라디오(선택) */}
                    <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: "50%", border: on ? "1.5px solid #5f0080" : "1.5px solid #cfcfcf", display: "inline-flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
                      {on && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#5f0080" }} />}
                    </span>
                    <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: "#5f0080", background: "#f3e5f5", border: "1px solid #e4d3f2", borderRadius: 5, padding: "1px 6px" }}>{r.source}</span>
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
              style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: 12, borderRadius: 8, border: "1.5px dashed #c9b8de", background: "#fff" }}>
              {ocrFiles.map((f, idx) => (
                <div key={idx} style={{ position: "relative", width: 72 }}>
                  <img src={URL.createObjectURL(f)} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, border: "1px solid #eee" }} />
                  <span style={{ position: "absolute", bottom: 2, left: 2, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10, borderRadius: 4, padding: "0 4px" }}>{idx + 1}</span>
                  <button type="button" onClick={() => setOcrFiles((prev) => prev.filter((_, i) => i !== idx))}
                    style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, lineHeight: 1 }}>×</button>
                </div>
              ))}
              <label style={{ width: 72, height: 72, flexShrink: 0, border: "1.5px dashed #c4b5d4", borderRadius: 6, background: "#faf7fe", color: "#5f0080", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer" }}>
                <span style={{ fontSize: 20, lineHeight: 1 }}>+</span>
                <span style={{ fontSize: 10 }}>추가</span>
                <input type="file" accept="image/*" multiple hidden onChange={(e) => { const fs = Array.from(e.target.files || []); if (fs.length) setOcrFiles((prev) => [...prev, ...fs]); e.currentTarget.value = ""; }} />
              </label>
              {ocrFiles.length === 0 && <span style={{ fontSize: 13, color: "#bbb" }}>공고 화면 캡처를 여기로 드래그하거나 추가하세요. 긴 공고는 위→아래로 여러 장 캡처하면 됩니다.</span>}
              <button type="button" onClick={() => processFiles(ocrFiles)} disabled={uploading || ocrFiles.length === 0}
                title="캡처한 그림을 그대로 상세요강에 넣습니다. 브라우저 화면이 같이 찍혔다면 잘라내고 넣으세요."
                style={{ marginLeft: "auto", alignSelf: "flex-end", padding: "8px 14px", borderRadius: 8, border: "1px solid #5f0080", background: "#fff", color: "#5f0080", fontSize: 13.5, cursor: (uploading || ocrFiles.length === 0) ? "default" : "pointer", opacity: uploading ? 0.6 : 1 }}>
                {uploading ? "넣는 중…" : "상세요강에 넣기"}</button>
              <button type="button" onClick={() => runOcrMulti(ocrFiles)} disabled={parsing || ocrFiles.length === 0}
                style={{ alignSelf: "flex-end", padding: "8px 18px", borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 700, cursor: (parsing || ocrFiles.length === 0) ? "default" : "pointer", opacity: parsing ? 0.6 : 1 }}>
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
        <div style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 16px`, boxSizing: "border-box", border: "1px solid #f0d9d9", background: "#fff8f6", borderRadius: 10, padding: "10px 12px" }}>
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

      {/* 공고 상단 이미지 */}
      {mode === "company" && isMobile ? (
        <div style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 16px`, boxSizing: "border-box" }}>
          {/* 제목 옆에 ＋(이미지 추가) — 카드 안 공간을 쓰지 않는다 */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
            <h2 className="jobpost-section-title" style={{ margin: 0 }}>공고 배너 이미지</h2>
            <label title="이미지 추가 (올릴 때 자동으로 0.3MB 내외로 줄여서 저장돼요)" style={{ ...bannerBtn(false), cursor: nmCoverUploading ? "wait" : "pointer" }}>
              {!isMobile && <ImagePlus size={16} />}{nmCoverUploading ? (isMobile ? "…" : "업로드 중…") : (isMobile ? "＋" : "추가")}
              <input type="file" accept="image/*" multiple disabled={nmCoverUploading || bannerImages.length >= 10}
                onChange={(e) => { addBannerFiles(e.target.files || []); e.currentTarget.value = ""; }} style={{ display: "none" }} />
            </label>
            <button type="button" onClick={() => setBannerGenOpen((v) => !v)} title="쓸 만한 사진이 없을 때, 준비된 배경에 문구만 넣어 배너를 만들어요" style={bannerBtn(bannerGenOpen)}>
              {!isMobile && <Wand2 size={15} />}{isMobile ? "샘플" : "샘플 배너"}
            </button>
          </div>
          <div style={{ marginTop: 8, background: "#fff", border: "1px solid #ececef", borderRadius: 12, padding: 12, boxSizing: "border-box" }}>
            {/* 썸네일마다 ×로 이 공고에서만 제거 */}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
              {/* 한 줄에 두 장. 세 장부터는 좌우 화살표로 넘겨 본다. */}
              {bannerImages.length > 0 && (
                <div style={{ width: "100%" }}>
                  {/* 공고 상세와 같은 컴포넌트로 그린다 — 편집 화면에서 보이는 모양이 곧 공개 화면 모양. */}
                  <BannerStrip images={bannerImages.map((b) => b.url)} showIndex
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
                  style={{ flexShrink: 0, border: "1px solid #e0d8ec", background: "#fff", color: "#666", borderRadius: 8, padding: "6px 10px", fontSize: 12.5, cursor: "pointer" }}>기업 이미지 불러오기</button>
              )}
            </div>
            {bannerHint}
          </div>
        </div>
      ) : (() => {
        return (
          <div style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 16px`, boxSizing: "border-box" }}>
            {/* 제목 옆에 ＋(이미지 추가)·샘플 배너 — 드래그 박스 안을 버튼으로 채우지 않는다. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4 }}>
              <h2 className="jobpost-section-title" style={{ margin: 0 }}>공고 배너 이미지</h2>
              <label title="이미지 추가 (올릴 때 자동으로 0.3MB 내외로 줄여서 저장돼요)" style={{ ...bannerBtn(false), cursor: nmCoverUploading ? "wait" : "pointer" }}>
                {!isMobile && <ImagePlus size={17} />}{nmCoverUploading ? (isMobile ? "…" : "업로드 중…") : (isMobile ? "＋" : "추가")}
                <input type="file" accept="image/*" multiple disabled={nmCoverUploading || bannerImages.length >= 10}
                  onChange={(e) => { addBannerFiles(e.target.files || []); e.currentTarget.value = ""; }} style={{ display: "none" }} />
              </label>
              <button type="button" onClick={() => setBannerGenOpen((v) => !v)} title="쓸 만한 사진이 없을 때, 준비된 배경에 문구만 넣어 배너를 만들어요" style={bannerBtn(bannerGenOpen)}>
                {!isMobile && <Wand2 size={16} />}{isMobile ? "샘플" : "샘플 배너"}
              </button>
              {mode === "company" && coverImages.length > 0 && bannerImages.length === 0 && (
                <button type="button" onClick={() => setBannerImages(coverImages.map((u) => ({ url: u, name: "기업 커버" })))}
                  style={{ ...bannerBtn(false), color: "#666" }}>기업 이미지 불러오기</button>
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
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); if (imgDragRef.current) { dropToBanner(null); return; } const f = e.dataTransfer.files; if (f && f.length && !nmCoverUploading) addBannerFiles(f); }}
                  onPaste={(e) => { const fs = imagesFromClipboard(e); if (fs.length) { e.preventDefault(); if (!nmCoverUploading) addBannerFiles(fs); } }}
                  style={{ padding: bannerImages.length ? 6 : 10, borderRadius: 10, border: `1.5px dashed ${dragOver || pasteZone === "banner" ? "#5f0080" : "#e0d5ee"}`, background: dragOver || pasteZone === "banner" ? "#f7f1fd" : "#fbf9ff", outline: "none" }}>
                  {bannerImages.length > 0 ? (
                    /* 공고에 실제로 찍히는 모양(3:1 · 한 장은 1/3 폭) 그대로 보여준다. 끌어서 순서를 바꿀 수 있다. */
                    <BannerStrip images={bannerImages.map((b) => b.url)} showIndex
                      onDelete={(url) => setBannerImages((prev) => prev.filter((b) => b.url !== url))}
                      onReorder={(from, to) => setBannerImages((prev) => {
                        const next = [...prev];
                        const [moved] = next.splice(from, 1);
                        next.splice(to, 0, moved);
                        return next;
                      })} />
                  ) : (
                    <div style={{ minHeight: 76, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, color: "#999", lineHeight: 1.5, textAlign: "center" }}>
                      이미지를 <b style={{ margin: "0 3px" }}>드래그</b>하거나 <b style={{ margin: "0 3px" }}>Ctrl+V</b>로 붙여넣어 주세요.
                    </div>
                  )}
                </div>
                {bannerHint}
                {/* 샘플 배너 생성 패널 */}
                {bannerGenOpen && (
                  <div style={{ marginTop: 10, padding: 12, border: "1px solid #e5e2ea", borderRadius: 10, background: "#faf9fc" }}>
                    <div style={{ fontSize: 13, color: "#5f0080", fontWeight: 600, marginBottom: 8 }}>샘플 배너 만들기 <span style={{ fontWeight: 400, color: "#999" }}>· 가운데 제목만 넣어요(줄바꿈 가능)</span></div>
                    <textarea value={bannerGenTitle} onChange={(e) => setBannerGenTitle(e.target.value)} rows={2}
                      placeholder={"예: 부 원장 급 여자 선생님\n(중국어 가능자 우대)"}
                      style={{ width: "100%", boxSizing: "border-box", border: "1px solid #e0d8ec", borderRadius: 8, padding: "8px 10px", fontSize: 14, resize: "vertical", outline: "none" }} />
                    {/* 배경 미리보기(프리셋이 하나일 땐 선택 없이 배경만 보여줌) */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "10px 0" }}>
                      {BANNER_PRESETS.map((p, i) => (
                        <button key={p.key} type="button" onClick={() => setBannerGenPreset(i)}
                          style={{ width: 168, height: 62, borderRadius: 8, cursor: BANNER_PRESETS.length > 1 ? "pointer" : "default", overflow: "hidden",
                            border: BANNER_PRESETS.length > 1 && bannerGenPreset === i ? "2px solid #5f0080" : "1.5px solid #e0d8ec",
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
                      <button type="button" onClick={() => setBannerGenOpen(false)} style={{ border: "1px solid #e0d8ec", background: "#fff", borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: "#666" }}>취소</button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        );
      })()}

      <div className="admin-form-grid jobpost-form" style={{ width: "100%", maxWidth: 760, margin: mx, gridTemplateColumns: "1fr", justifyContent: "stretch", justifyItems: "stretch", rowGap: "16px" }}>
        {/* ═══ 왼쪽 컬럼: 기본정보 ═══ */}
        <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", gap: "8px" }}>

          {/* 기본정보 */}
          <h2 className="jobpost-section-title">기본정보</h2>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">

              {/* 공고 헤더(미리보기형): 실제 상세화면 최상단에 보일 브랜드 + 제목 */}
              <div style={{ padding: "4px 0 14px", marginBottom: 4 }}>
                <div style={{ marginBottom: 6 }}>
                  <input
                    value={newCompanyName}
                    onChange={(e) => setNewCompanyName(e.target.value)}
                    placeholder="회사명 (예: 리안헤어 광명점)"
                    className="jobpost-brand-input"
                    style={{ fontWeight: 700, color: "#8a7fa0", border: "none", outline: "none", background: "transparent", padding: 0, width: "100%" }}
                  />
                </div>
                <AutoTextarea
                  placeholder="공고 제목을 입력하세요 * (예: 리안헤어 광명점 헤어디자이너·인턴 모집)"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                  className="jobpost-title-input"
                  style={{ width: "100%", fontWeight: 400, color: "#1a1a1a", lineHeight: 1.3, fontFamily: "inherit" }}
                />
              </div>

              {/* ── 모집부문 제목(모집분야 위, '지원 안내'와 동일 스타일) ── */}
              <div className="admin-form-label" style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, margin: "0 0 16px", paddingTop: 14, borderTop: "1px solid #f0edf5", fontWeight: 400, color: "#333" }}>
                <Briefcase size={16} style={{ color: "#5f0080", flexShrink: 0 }} />모집부문
              </div>
              {/* ── 모집분야 + 마감일(같은 행). 모집분야는 모집부문 표의 행이 됨 ── */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px 16px", margin: "0 0 12px", alignItems: "center" }}>
                <div className="job-detail-meta-item">
                  <span style={{ fontSize: 15, color: "#999", flexShrink: 0, width: 68 }}>모집분야<span style={{ color: "#e9a3a3" }}> *</span></span>
                  {/* 분야를 골라 모집부문 표에 행을 붙인다(같은 분야를 또 골라 신입·경력 분리 모집 가능).
                      고른 분야는 표에만 행으로 보이고 여기엔 값을 표시하지 않는다. */}
                  <button type="button" disabled={typeLocked} onClick={() => setAddRowOpen(true)} title="모집분야를 골라 행을 추가해요. 같은 분야를 또 고르면 신입·경력처럼 나눠 모집할 수 있어요"
                    style={{ display: "inline-flex", alignItems: "center", gap: 3, flexShrink: 0, borderRadius: 7, border: "1px solid #e0d8ec", background: "#fff", color: typeLocked ? "#ddd" : "#999", fontSize: 15, lineHeight: 1, padding: "4px 8px", cursor: typeLocked ? "default" : "pointer" }}>＋</button>
                </div>
                <div className="job-detail-meta-item" ref={deadlineRef} style={{ position: "relative" }}>
                  <span style={{ fontSize: 15, color: "#999", flexShrink: 0, width: 68 }}>마감일<span style={{ color: "#e9a3a3" }}> *</span></span>
                  <button type="button"
                    onClick={(e) => { if (deadlineModalOpen) { setDeadlineModalOpen(false); return; } setDeadlineDraft(alwaysOpen ? "" : form.deadline); setAlwaysOpenDraft(alwaysOpen); openPopAt(e.currentTarget, 240, 168); setDeadlineModalOpen(true); }}
                    style={{ border: "none", background: "transparent", padding: 0, fontSize: 15, color: (alwaysOpen || form.deadline) ? "#333" : "#cfcfcf", cursor: "pointer" }}>
                    {alwaysOpen ? "상시채용" : form.deadline ? `~ ${form.deadline.replace(/-/g, ".")}` : pick()}
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
              </div>

              {/* ── 모집부문 표: 분야별 고용형태·성별·경력/직책·학력·근무·급여 ── */}
              <div style={{ margin: "10px 0 22px" }}>
                {categories.length === 0 ? (
                  <div style={{ fontSize: 13, color: "#bbb", padding: "6px 0 2px" }}>위 <b>모집분야 ＋</b>를 눌러 모집할 분야를 담아주세요.</div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ minWidth: 566, borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={{ ...thc, ...firstCol, minWidth: 92 }}>모집분야{reqStar}</th>
                          <th style={{ ...thc, minWidth: 66 }}>고용형태</th>
                          <th style={{ ...thc, minWidth: 56 }}>성별우대</th>
                          <th style={{ ...thc, minWidth: 72 }}>경력/직책</th>
                          <th style={{ ...thc, minWidth: 52 }}>학력</th>
                          <th style={{ ...thc, minWidth: 124 }}>근무요일 / 시간</th>
                          <th style={{ ...thc, minWidth: 82 }}>급여</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categories.map((cat) => {
                          const row = posMeta[cat] || emptyPos;
                          return (
                            <tr key={cat}>
                              <td style={{ ...tdc, ...firstCol, fontSize: 12.5, color: "#333" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                                  <span style={{ flex: 1, minWidth: 0 }}>{baseCat(cat)}</span>
                                  <button type="button" onClick={() => removeCatRow(cat)} title="이 행 삭제"
                                    style={{ width: 18, height: 18, flexShrink: 0, borderRadius: 5, border: "1px solid #eee", background: "#fff", color: "#bbb", fontSize: 12, lineHeight: 1, cursor: "pointer", padding: 0 }}>×</button>
                                </div>
                              </td>
                              <td style={{ ...tdc, position: "relative" }}>{posCell(cat, "employment", EMPLOYMENT_TYPES, "예: 정규직")}</td>
                              <td style={{ ...tdc, position: "relative" }}>{posCell(cat, "gender", ["무관", "여성", "남성"], "예: 무관", false)}</td>
                              <td style={{ ...tdc, position: "relative" }}>{posCell(cat, "career", POS_CAREER, "", false)}</td>
                              <td style={{ ...tdc, position: "relative" }}>{posCell(cat, "education", POS_EDU, "", false)}</td>
                              <td style={{ ...tdc, position: "relative" }} className="posshift-pop">
                                <button type="button" onClick={(e) => { if (posShiftOpen === cat) { setPosShiftOpen(null); return; } openPopAt(e.currentTarget, 244, 250); setPosShiftOpen(cat); }}
                                  style={{ width: "100%", minHeight: 24, boxSizing: "border-box", textAlign: "left", border: "none", borderRadius: 5, padding: "3px 6px", fontSize: 12.5, lineHeight: 1.35, cursor: "pointer", color: "#333", ...cellFill(!!(row.workDays || row.workTime)) }}>
                                  {(row.workDays || row.workTime) ? (
                                    (row.workDays === "협의" && row.workTime === "협의") ? (
                                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>협의</div>
                                    ) : (
                                    <>
                                      {row.workDays && <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.workDays}</div>}
                                      {row.workTime && <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.workTime}</div>}
                                    </>
                                    )
                                  ) : ""}
                                </button>
                                {posShiftOpen === cat && (() => {
                                  const days = (row.workDays && row.workDays !== "협의") ? row.workDays.split(/[·,]/).map((s) => s.trim()).filter((d) => WORK_DAY_OPTIONS.includes(d)) : [];
                                  const daysNego = row.workDays === "협의";
                                  const timeParts = (row.workTime && row.workTime !== "협의") ? row.workTime.split("~") : [];
                                  const tStart = (timeParts[0] || "").trim();
                                  const tEnd = (timeParts[1] || "").trim();
                                  const tm = /^\d{1,2}:\d{2}~\d{1,2}:\d{2}$/.test((row.workTime || "").replace(/\s/g, "")) ? [row.workTime, tStart, tEnd] as const : null;
                                  const timeNego = row.workTime === "협의";
                                  const toggleDay = (d: string) => { const nd = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort((a, b) => WORK_DAY_OPTIONS.indexOf(a) - WORK_DAY_OPTIONS.indexOf(b)); setPos(cat, "workDays", nd.join("·")); };
                                  const setDays = (arr: string[]) => setPos(cat, "workDays", [...new Set(arr)].sort((a, b) => WORK_DAY_OPTIONS.indexOf(a) - WORK_DAY_OPTIONS.indexOf(b)).join("·"));
                                  const toggleGroup = (grp: string[], on: boolean) => { const base = days.filter((d) => !grp.includes(d)); setDays(on ? [...base, ...grp] : base); };
                                  const allWeekday = WEEKDAY_DAYS.every((d) => days.includes(d));
                                  const allWeekend = WEEKEND_DAYS.every((d) => days.includes(d));
                                  const timeSel: React.CSSProperties = { flex: 1, minWidth: 0, height: 29, boxSizing: "border-box", border: "1px solid #ddd", borderRadius: 6, padding: "0 6px", fontSize: 12, background: timeNego ? "#f5f5f5" : "#fff", color: timeNego ? "#bbb" : "#333", cursor: timeNego ? "default" : "pointer" };
                                  return (
                                    <div ref={popRef} style={{ position: "fixed", left: popAt?.left ?? 8, top: popAt?.top ?? 8, zIndex: 200, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 10, width: 244 }}>
                                      <div style={{ fontSize: 11.5, color: "#888", marginBottom: 5 }}>근무요일</div>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                        {WORK_DAY_OPTIONS.map((d) => { const on = days.includes(d); return (
                                          <button key={d} type="button" disabled={daysNego} onClick={() => toggleDay(d)}
                                            style={{ width: 27, height: 27, borderRadius: "50%", fontSize: 12, cursor: daysNego ? "default" : "pointer", border: on ? "1.5px solid #5f0080" : "1px solid #ddd", background: on ? "#5f0080" : "#fff", color: daysNego ? "#ccc" : (on ? "#fff" : "#666") }}>{d}</button>
                                        ); })}
                                      </div>
                                      <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
                                        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: daysNego ? "#bbb" : "#555", cursor: daysNego ? "default" : "pointer" }}>
                                          <input type="checkbox" disabled={daysNego} checked={allWeekday} onChange={(e) => toggleGroup(WEEKDAY_DAYS, e.target.checked)} /> 평일
                                        </label>
                                        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: daysNego ? "#bbb" : "#555", cursor: daysNego ? "default" : "pointer" }}>
                                          <input type="checkbox" disabled={daysNego} checked={allWeekend} onChange={(e) => toggleGroup(WEEKEND_DAYS, e.target.checked)} /> 주말
                                        </label>
                                        <label style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#555", cursor: "pointer" }}>
                                          <input type="checkbox" checked={daysNego} onChange={(e) => setPos(cat, "workDays", e.target.checked ? "협의" : "")} /> 협의
                                        </label>
                                      </div>
                                      <div style={{ fontSize: 11.5, color: "#888", margin: "10px 0 5px" }}>근무시간</div>
                                      {/* 30분 단위 등 자유로운 시간을 넣을 수 있게 숫자 입력. 0930 처럼 쳐도 09:30으로 정리된다. */}
                                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                        <input type="text" inputMode="numeric" disabled={timeNego} placeholder="0930" aria-label="근무 시작 시간"
                                          value={tStart}
                                          onChange={(e) => setTimeRange(cat, cleanTime(e.target.value), tEnd)}
                                          onBlur={(e) => setTimeRange(cat, fmtTime(e.target.value), tEnd)}
                                          style={{ ...timeSel, textAlign: "center", cursor: timeNego ? "default" : "text" }} />
                                        <span style={{ color: "#888" }}>~</span>
                                        <input type="text" inputMode="numeric" disabled={timeNego} placeholder="2000" aria-label="근무 종료 시간"
                                          value={tEnd}
                                          onChange={(e) => setTimeRange(cat, tStart, cleanTime(e.target.value))}
                                          onBlur={(e) => setTimeRange(cat, tStart, fmtTime(e.target.value))}
                                          style={{ ...timeSel, textAlign: "center", cursor: timeNego ? "default" : "text" }} />
                                      </div>
                                      <label style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, fontSize: 12.5, color: "#555", cursor: "pointer" }}>
                                        <input type="checkbox" checked={timeNego} onChange={(e) => setPos(cat, "workTime", e.target.checked ? "협의" : "")} /> 시간 협의
                                      </label>
                                      {nonMember && (
                                        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid #eee" }}>
                                          <input type="text" value={(days.length || daysNego) ? "" : row.workDays} onChange={(e) => setPos(cat, "workDays", e.target.value)} placeholder="요일 직접입력(예: 주말만)" style={{ ...cellInput, marginBottom: 6 }} />
                                          <input type="text" value={(tm || timeNego || /[\d]|~/.test(row.workTime || "")) ? "" : row.workTime} onChange={(e) => setPos(cat, "workTime", e.target.value)} placeholder="시간 직접입력(예: 평일 저녁)" style={cellInput} />
                                        </div>
                                      )}
                                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                                        <button type="button" onClick={() => setPosShiftOpen(null)} className="company-primary-btn" style={{ padding: "5px 14px", fontSize: 13 }}>닫기</button>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </td>
                              <td style={{ ...tdc, position: "relative" }}>{posCell(cat, "salary", [], "예: 300~350", true, SALARY_UNITS)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* 행 추가용 분야 선택 — 고르는 즉시 행이 붙는다(선택 상태를 비워 둬 같은 분야도 다시 고를 수 있음) */}
                <JobGroupSelectModal
                  open={addRowOpen}
                  jobType={jobGroupType === "기업" ? "OFFICE" : "STORE"}
                  selected={[]}
                  onChange={(next) => { const picked = next[next.length - 1]; if (picked) addCatRow(picked); setAddRowOpen(false); }}
                  onClose={() => setAddRowOpen(false)}
                  title="모집분야 추가 (같은 분야도 다시 고를 수 있어요)"
                />
              </div>

              {/* ── 복리후생 (모집부문 안으로 통합, 별도 타이틀·구분선 없음) ──
                  근무기간은 뺐다. 매장 공고는 대부분 상시 근무라 139건 중 1건만 채워져
                  있었고, 그 반열이 복리후생을 좁혀 태그가 여러 줄로 접혔다. */}
              <div style={{ marginTop: 4 }}>
                <div className="job-detail-company-info">
                  {/* 복리후생 — 한 행을 다 쓴다. 태그가 여럿이라 좁으면 읽기 나쁘다. */}
                  <div className="job-detail-company-row" ref={welfareRef} style={{ alignItems: "flex-start", position: "relative", gridColumn: "1 / -1" }}>
                    <span className="job-detail-company-label" style={{ fontSize: 15 }}>복리후생<span style={{ color: "#e9a3a3" }}> *</span></span>
                    {!fiBenefits.trim() && (
                    <button type="button" disabled={typeLocked} onClick={() => { if (!typeLocked) setWelfareOpen((v) => !v); }}
                      style={{ flex: 1, textAlign: "left", border: "none", background: "none", padding: 0, fontSize: 15, cursor: typeLocked ? "default" : "pointer", lineHeight: 1.6, color: typeLocked ? "#cfcfcf" : (benefitTags.length ? "#333" : "#cfcfcf") }}>
                      {typeLocked ? "채용유형을 먼저 선택하세요" : (benefitTags.length ? benefitTags.join(", ") : pick())}
                    </button>
                    )}
                    {freeField("benefits", fiBenefits, setFiBenefits, "예: 4대보험, 인센티브", false, () => setBenefitTags([]))}
                    {welfareOpen && !typeLocked && (() => {
                      const qq = benefitSearch.trim().toLowerCase();
                      const match = (n: string) => !qq || n.toLowerCase().includes(qq);
                      // 선택됐지만 마스터에 없는 커스텀 태그를 먼저, 그다음 마스터 옵션
                      const customSel = benefitTags.filter((t) => !benefitTagOptions.some((o) => o.name === t) && match(t)).map((t) => ({ name: t, is_curated: false }));
                      const visible = [...customSel, ...benefitTagOptions.filter((o) => match(o.name))];
                      const exact = benefitTagOptions.some((o) => o.name === benefitSearch.trim()) || benefitTags.includes(benefitSearch.trim());
                      const canAdd = benefitSearch.trim().length > 0 && !exact;
                      return (
                      <div style={{ position: "absolute", top: "100%", left: 0, marginTop: 6, zIndex: 50, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 12, width: 360, maxWidth: "80vw" }}>
                        <input autoFocus value={benefitSearch} onChange={(e) => setBenefitSearch(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (canAdd) addNewBenefit(benefitSearch); } }}
                          placeholder="복리후생 검색 또는 직접 추가 후 Enter"
                          style={{ width: "100%", boxSizing: "border-box", padding: "8px 10px", borderRadius: 8, border: "1px solid #e0d5ee", fontSize: 14, marginBottom: 10, outline: "none" }} />
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                          {visible.map((o) => { const on = benefitTags.includes(o.name); return (
                            <button key={o.name} type="button" onClick={() => toggleBenefit(o.name)}
                              style={{ padding: "7px 13px", borderRadius: 999, fontSize: 14, cursor: "pointer", border: on ? "1.5px solid #5f0080" : "1.5px solid #e5e2ea", background: on ? "#5f0080" : "#fff", color: on ? "#fff" : "#666", display: "inline-flex", alignItems: "center", gap: 4 }}>
                              {o.name}
                              {!o.is_curated && <span style={{ fontSize: 10, color: on ? "#e6d5f0" : "#b9a9cc" }}>추가됨</span>}
                              {!o.is_curated && (
                                <span role="button" title="목록에서 지우기" aria-label={`${o.name} 지우기`}
                                  onClick={(e) => { e.stopPropagation(); removeNewBenefit(o.name); }}
                                  style={{ marginLeft: 1, fontSize: 13, lineHeight: 1, cursor: "pointer", color: on ? "#e6d5f0" : "#b9a9cc" }}>×</span>
                              )}
                            </button>
                          ); })}
                          {canAdd && (
                            <button type="button" onClick={() => addNewBenefit(benefitSearch)}
                              style={{ padding: "7px 13px", borderRadius: 999, fontSize: 14, cursor: "pointer", border: "1.5px dashed #5f0080", background: "#faf7ff", color: "#5f0080", fontWeight: 600 }}>
                              + &quot;{benefitSearch.trim()}&quot; 추가
                            </button>
                          )}
                          {visible.length === 0 && !canAdd && <span style={{ fontSize: 13, color: "#bbb" }}>검색 결과가 없어요.</span>}
                        </div>
                        {nonMember && <button type="button" onClick={() => { setWelfareOpen(false); setFiOpen("benefits"); }}
                          style={{ display: "block", width: "100%", textAlign: "left", marginTop: 10, border: "none", borderTop: "1px solid #eee", background: "none", padding: "9px 0 0", fontSize: 13, color: "#5f0080", cursor: "pointer" }}>✎ 직접입력…</button>}
                      </div>
                      );
                    })()}
                  </div>
                  </div>
                </div>

              {/* 근무지역: 별도 섹션(제목+아이콘, 지원 안내와 동일 스타일). 전체 주소 → 필터용 시·군·구 자동 추출 + 지도 */}
              <div style={{ paddingTop: 14, borderTop: "1px solid #f0edf5", marginTop: 6 }}>
                <div className="admin-form-label" style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 10px", fontWeight: 400, color: "#333" }}>
                  <MapPin size={16} style={{ color: "#5f0080", flexShrink: 0 }} />근무지역 <span style={{ color: "#e9a3a3" }}>*</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 8 : 12 }}>
                  <input readOnly value={nmAddress} onClick={() => openAddressSearch()}
                    placeholder="주소 검색을 눌러주세요"
                    style={{ minWidth: 0, boxSizing: "border-box", border: "1px solid #e0d8ec", borderRadius: 8, background: "#fff", fontSize: 15, outline: "none", padding: "9px 11px", textAlign: "left", cursor: "pointer" }} />
                  <input value={nmAddressDetail} onChange={(e) => setNmAddressDetail(e.target.value)}
                    placeholder="상세주소 (동·호수 등)"
                    style={{ minWidth: 0, boxSizing: "border-box", border: "1px solid #e0d8ec", borderRadius: 8, background: "#fff", fontSize: 15, outline: "none", padding: "9px 11px", textAlign: "left" }} />
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
                    <div key={i} style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed #efeaf5" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: "#7a6f8a" }}>근무지 {i + 2}</span>
                        <button type="button" onClick={() => setExtraLocations((prev) => prev.filter((_, k) => k !== i))}
                          title="이 근무지 빼기"
                          style={{ marginLeft: "auto", border: "none", background: "none", color: "#c0392b", fontSize: 12.5, cursor: "pointer" }}>
                          빼기
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)", gap: isMobile ? 8 : 12 }}>
                        <input readOnly value={loc.address} onClick={() => openAddressSearch((addr) => 고치기({ address: addr }))}
                          placeholder="주소 검색을 눌러주세요"
                          style={{ minWidth: 0, boxSizing: "border-box", border: "1px solid #e0d8ec", borderRadius: 8, background: "#fff", fontSize: 15, outline: "none", padding: "9px 11px", textAlign: "left", cursor: "pointer" }} />
                        <input value={loc.detail} onChange={(e) => 고치기({ detail: e.target.value })}
                          placeholder="상세주소 (동·호수 등)"
                          style={{ minWidth: 0, boxSizing: "border-box", border: "1px solid #e0d8ec", borderRadius: 8, background: "#fff", fontSize: 15, outline: "none", padding: "9px 11px", textAlign: "left" }} />
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

                <button type="button" onClick={() => setExtraLocations((prev) => [...prev, { address: "", detail: "" }])}
                  style={{ marginTop: 10, padding: "7px 12px", borderRadius: 8, border: "1px dashed #c9b8de", background: "#fff", color: "#5f0080", fontSize: 13.5, cursor: "pointer" }}>
                  ＋ 근무지역 추가
                </button>
              </div>

              {/* 지원 안내 (채용 담당자 · 접수방법 · 채용 절차) */}
              <div style={{ paddingTop: 14, borderTop: "1px solid #f0edf5", marginTop: 6 }}>
                <div className="admin-form-label" style={{ display: "flex", alignItems: "center", gap: 6, margin: "0 0 10px", fontWeight: 400, color: "#333" }}><Send size={16} style={{ color: "#5f0080", flexShrink: 0 }} />지원 안내</div>

              {/* 지원방법(좌) · 담당자(우) 2열 — 기업회원·비회원 공용.
                  지원방법을 팝오버에서 고르면, 그 방법에 필요한 칸만 오른쪽에 생긴다.
                  문자·전화 → 전화 / 이메일 → 메일 / 둘 중 하나라도 → 이름 / 회사 홈페이지 지원 → 홈페이지 URL.
                  뷰티워크 온라인지원만 고르면 담당자 칸은 생기지 않는다(연락처가 필요 없는 방법이라).
                  비회원 공고의 담당자 연락처는 상세화면에서 구직자에게 노출되지 않는다(JobDetailView). */}
              {(() => {
                // 매장 공고는 자체 채용 홈페이지가 없는 경우가 대부분이라 '회사 홈페이지 지원'을 빼고, 오피스에서만 쓴다.
                const methodOptions = CONTACT_METHOD_OPTIONS.filter((m) => m !== "회사 홈페이지 지원" || isOffice);
                const canPhone = contactMethods.includes("문자") || contactMethods.includes("전화");
                const canEmail = contactMethods.includes("이메일");
                const canName = canPhone || canEmail;
                const canUrl = isOffice && contactMethods.includes("회사 홈페이지 지원");
                // 담당자 칸이 생기면 URL은 지원방법 밑(좌)에, 우측이 비면 URL을 우측에 둔다.
                const urlOnLeft = canUrl && canName;
                const isNmAdminJob = mode === "admin" && nonMember;
                const lblS: CSSProperties = { width: 68, flexShrink: 0, whiteSpace: "nowrap", color: "#999", fontSize: 15, paddingTop: 4 };
                const subLbl: CSSProperties = { width: 34, flexShrink: 0, color: "#999", fontSize: 14 };
                // 값이 없으면 연보라 블록, 채우면 글자만 — 폼의 다른 칸과 같은 규칙
                // 빈 값은 폼의 다른 항목과 같은 규격(56px 연보라 블록), 채우면 남은 폭을 쓴다.
                // 값은 라벨(제목)보다 커지지 않게 한다 — subLbl 이 14 이므로 값도 14.
                // 값이 더 크면 라벨이 부제처럼 보여 어느 쪽이 항목 이름인지 헷갈린다.
                const fld = (filled: boolean): CSSProperties => filled
                  ? { flex: 1, minWidth: 0, border: "none", background: "transparent", borderRadius: 5, fontSize: 14, fontWeight: 400, color: "#333", outline: "none", padding: "3px 2px", minHeight: 24, boxSizing: "border-box" }
                  : { flexShrink: 0, width: 56, height: 20, border: "none", background: PH_BG, borderRadius: 5, fontSize: 14, fontWeight: 400, color: "#333", outline: "none", padding: 0, boxSizing: "border-box" };
                const rowS: CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "3px 0" };
                return (
                  /* 좁은 화면에선 두 칸이 너무 좁아 세로로 쌓는다(.jobpost-form이 admin-form-row-2col을 1열로 덮어서 직접 지정) */
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)", gap: isMobile ? "0" : "10px 28px", alignItems: "start" }}>
                    {/* 지원방법 (좌) — 연보라 블록을 눌러 팝오버에서 복수 선택 */}
                    <div ref={contactMethodsRef} style={{ position: "relative", minWidth: 0 }}>
                     <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "4px 0" }}>
                      <span style={lblS}>지원방법</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <button type="button"
                          onClick={(e) => { if (contactMethodsOpen) { setContactMethodsOpen(false); return; } openPopAt(e.currentTarget, 232, 150); setContactMethodsOpen(true); }}
                          style={{ ...fld(contactMethods.length > 0), textAlign: "left", cursor: "pointer", lineHeight: 1.5 }}>
                          {contactMethods.join(", ")}
                        </button>
                        {contactMethodsOpen && popAt && (
                          <div ref={popRef} style={{ position: "fixed", left: popAt.left, top: popAt.top, zIndex: 200, background: "#fff", border: "1px solid #e5e5e5", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", padding: 10, width: 232, maxWidth: "calc(100vw - 16px)", boxSizing: "border-box", display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {methodOptions.map((m) => {
                              const on = contactMethods.includes(m);
                              return (
                                <button key={m} type="button"
                                  onClick={() => setContactMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))}
                                  style={{ padding: "5px 11px", borderRadius: 999, fontSize: 13, cursor: "pointer", border: on ? "1.5px solid #5f0080" : "1.5px solid #e5e2ea", background: on ? "#5f0080" : "#fff", color: on ? "#fff" : "#666" }}>{m}</button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                     </div>
                     {urlOnLeft && (
                       <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "4px 0" }}>
                         <span style={{ ...lblS, width: 88 }}>홈페이지 URL</span>
                         <input value={externalApplyUrl} onChange={(e) => setExternalApplyUrl(e.target.value)}
                           placeholder="https://example.com/recruit" inputMode="url" style={fld(!!externalApplyUrl)} />
                       </div>
                     )}
                    </div>
                    {/* 담당자 (우) — 고른 방법에 필요한 칸만 생성. 우측이 빌 때는 홈페이지 URL을 여기에 둔다 */}
                    {(canName || canUrl) ? (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "4px 0", minWidth: 0 }}>
                        <span style={{ ...lblS, ...(canName ? null : { width: 88 }) }}>
                          {canName ? "담당자" : "홈페이지 URL"}
                          {isNmAdminJob && canName && <><br /><span style={{ fontSize: 10, color: "#c9a3d6" }}>관리자용</span></>}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {canUrl && !urlOnLeft && (
                            <input value={externalApplyUrl} onChange={(e) => setExternalApplyUrl(e.target.value)}
                              placeholder="https://example.com/recruit" inputMode="url" style={fld(!!externalApplyUrl)} />
                          )}
                          {canName && (
                            <div style={rowS}>
                              <span style={subLbl}>이름</span>
                              <input value={nmManagerName} onChange={(e) => setNmManagerName(e.target.value)} style={fld(!!nmManagerName)} />
                            </div>
                          )}
                          {canPhone && (
                            <div style={rowS}>
                              <span style={subLbl}>전화</span>
                              <input value={nmManagerPhone} inputMode="numeric" onChange={(e) => setNmManagerPhone(e.target.value)} style={fld(!!nmManagerPhone)} />
                            </div>
                          )}
                          {canEmail && (
                            <div style={rowS}>
                              <span style={subLbl}>메일</span>
                              <input value={nmContactEmail} inputMode="email" onChange={(e) => setNmContactEmail(e.target.value)} style={fld(!!nmContactEmail)} />
                            </div>
                          )}
                          {isNmAdminJob && canName && (
                            <div style={{ fontSize: 11, color: "#b58fc7", marginTop: 3 }}>구직자에게는 노출되지 않아요 · 회원가입 유도용 내부 연락처</div>
                          )}
                        </div>
                      </div>
                    ) : <div />}
                  </div>
                );
              })()}

              {/* 채용 절차 — 오피스(기업) 공고에서만 노출 */}
              {jobGroupType === "기업" && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "7px 0" }}>
                  <span style={{ width: 72, flexShrink: 0, color: "#999", fontSize: 15 }}>채용 절차</span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 16px", flex: 1 }}>
                    {PRESET_PROCESS.기업.map((p) => {
                      const on = hiringProcess.includes(p);
                      return (
                        <button key={p} type="button"
                          onClick={() => setHiringProcess(on ? hiringProcess.filter((x) => x !== p) : [...hiringProcess, p])}
                          style={{ border: "none", background: "none", padding: 0, fontSize: 15, cursor: "pointer", color: on ? "#5f0080" : "#c4c4c4" }}>
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
          {/* 모바일만 제목 옆 ＋(자리 절약). PC는 아래 드래그 박스에서 첨부한다.
              위 여백은 '기본정보' 제목과 같게(앞 카드 아래 40px) — 컬럼 gap 8 + 카드 marginBottom을 감안해 24 추가. */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 4, marginTop: 24 }}>
            <h2 className="jobpost-section-title" style={{ margin: 0 }}>상세요강</h2>
            {isMobile && (
              <label title="상세요강 이미지 추가"
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, flexShrink: 0, border: "1px solid #e0d8ec", background: "#fff", color: uploading ? "#bbb" : "#5f0080", borderRadius: 7, fontSize: 13, lineHeight: 1, cursor: uploading ? "wait" : "pointer" }}>
                {uploading ? "…" : "＋"}
                <input type="file" accept="image/*" multiple disabled={uploading || detailImages.length >= 12} onChange={handleImageUpload} style={{ display: "none" }} />
              </label>
            )}
          </div>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">

              {/* ── 상세 내용 이미지 (본문 세로 스택) — 실제 미리보기의 상세요강 위치와 동일 ── */}
              <div style={{ paddingBottom: 16, borderBottom: "1px solid var(--color-border)", marginBottom: 4 }}>
                {isMobile
                  ? detailImages.length === 0 && (
                      <div style={{ fontSize: 12, color: "#999", marginBottom: 6 }}>상세요강 이미지가 있다면 <b>＋</b>를 눌러서 첨부해 주세요.</div>
                    )
                  : (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: "#999" }}>갖고 계신 상세요강 이미지가 있다면 첨부해 주세요.</span>
                      <button type="button" role="switch" aria-checked={ocrEnabled} onClick={() => setOcrEnabled((v) => !v)}
                        title="글자가 든 포스터에서 연락처·주소·모집분야를 읽어 옵니다. 읽을 때마다 요금이 듭니다."
                        style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 7, padding: "4px 10px 4px 6px", borderRadius: 999, border: `1px solid ${ocrEnabled ? "#5f0080" : "#e0d8ec"}`, background: ocrEnabled ? "#f7f1fd" : "#fff", cursor: "pointer" }}>
                        <span style={{ width: 30, height: 17, borderRadius: 999, background: ocrEnabled ? "#5f0080" : "#d6d0e0", position: "relative", transition: "background .15s" }}>
                          <span style={{ position: "absolute", top: 2, left: ocrEnabled ? 15 : 2, width: 13, height: 13, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
                        </span>
                        <span style={{ fontSize: 12.5, color: ocrEnabled ? "#5f0080" : "#8d84a0" }}>
                          텍스트 인식 {ocrEnabled ? "켬" : "끔"}
                          {ocrEnabled && <span style={{ color: "#b9866b" }}> (유료)</span>}
                        </span>
                      </button>
                    </div>
                  )}
                {ocrEnabled && detailImages.some((d) => d.readable) && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", margin: "0 0 10px", padding: "10px 12px", background: "#f7f1fd", border: "1px solid #e0d5ee", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, color: "#4a4453" }}>
                      글자가 든 그림이 <b>{detailImages.filter((d) => d.readable).length}장</b> 있어요.
                      연락처·주소·모집분야를 여기서 읽어 올까요?
                    </span>
                    <button type="button" onClick={readFromDetailImages} disabled={readingImgs}
                      style={{ marginLeft: "auto", padding: "7px 14px", borderRadius: 8, border: "none", background: "#5f0080", color: "#fff", fontSize: 13, fontWeight: 500, cursor: readingImgs ? "default" : "pointer", opacity: readingImgs ? 0.6 : 1 }}>
                      {readingImgs ? "읽는 중…" : "그림에서 읽기 (유료)"}
                    </button>
                    <span style={{ width: "100%", fontSize: 12, color: "#8d84a0", lineHeight: 1.7 }}>
                      그림 한 장을 읽을 때마다 요금이 듭니다(장당 5원 안팎). 매장 사진처럼 글자가 없는 그림은
                      아래 썸네일의 <b>읽기</b>를 꺼 두세요. 글을 붙여넣으셨다면 글에 있는 값은 글을 그대로 씁니다.
                    </span>
                  </div>
                )}
                {/* PC는 원래의 점선 드래그·붙여넣기 박스, 모바일은 테두리 없이 썸네일만(좌우 간격 절반). */}
                <div
                  tabIndex={isMobile ? -1 : 0}
                  onFocus={() => setPasteZone("body")}
                  onBlur={() => setPasteZone((z) => (z === "body" ? null : z))}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); if (imgDragRef.current) { dropToBody(null); return; } if (!uploading) processFiles(e.dataTransfer.files); }}
                  onPaste={(e) => { const fs = imagesFromClipboard(e); if (fs.length) { e.preventDefault(); if (!uploading) processFiles(fs); } }}
                  style={isMobile
                    ? { display: "flex", flexWrap: "wrap", gap: "8px 4px", alignItems: "center", outline: "none" }
                    : { display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", minHeight: 96, padding: 10, borderRadius: 10, border: `1.5px dashed ${pasteZone === "body" ? "#5f0080" : "#e0d5ee"}`, background: pasteZone === "body" ? "#f7f1fd" : "#fbf9ff", outline: "none" }}>
                  {detailImages.map((d, idx) => (
                    <div key={d.url + idx} draggable
                      onDragStart={() => { imgDragRef.current = { zone: "body", idx }; }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); if (imgDragRef.current) dropToBody(idx); }}
                      style={{ position: "relative", width: 84, cursor: "grab" }}>
                      <img src={d.url} alt={`상세 ${idx + 1}`} style={{ display: "block", width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid #eee" }} />
                      <span style={{ position: "absolute", bottom: 3, left: 3, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "0 4px" }}>{idx + 1}</span>
                      <button type="button" onClick={() => removeImage(idx)} title="삭제"
                        style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, lineHeight: 1 }}>×</button>
                      {ocrEnabled && (
                      <button type="button"
                        onClick={() => setDetailImages((prev) => prev.map((x, i) => (i === idx ? { ...x, readable: !x.readable } : x)))}
                        title={d.readable ? "이 그림의 글자를 읽습니다. 눌러서 끄기" : "읽지 않습니다. 눌러서 켜기"}
                        style={{ position: "absolute", bottom: 3, right: 3, padding: "1px 6px", borderRadius: 4, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700, lineHeight: 1.6, background: d.readable ? "#5f0080" : "rgba(0,0,0,0.45)", color: "#fff" }}>
                        읽기 {d.readable ? "켬" : "끔"}
                      </button>
                      )}
                    </div>
                  ))}
                  {/* PC 드래그 박스 안의 추가 타일·안내(모바일은 제목 옆 ＋로 대체) */}
                  {!isMobile && (
                    <label title="이미지 추가"
                      style={{ width: 84, height: 84, flexShrink: 0, border: "1.5px dashed #c4b5d4", borderRadius: 8, background: "#fff", color: "#5f0080", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: uploading ? "wait" : "pointer" }}>
                      <span style={{ fontSize: 22, lineHeight: 1 }}>{uploading ? "…" : "+"}</span>
                      <span style={{ fontSize: 10 }}>추가</span>
                      <input type="file" accept="image/*" multiple disabled={uploading || detailImages.length >= 12} onChange={handleImageUpload} style={{ display: "none" }} />
                    </label>
                  )}
                  {!isMobile && detailImages.length === 0 && (
                    <span style={{ fontSize: 13, color: "#bbb" }}>상세요강 이미지가 있다면 여기로 첨부하거나, 이 영역을 클릭한 뒤 <b>Ctrl+V</b>로 붙여넣어 주세요.</span>
                  )}
                </div>
              </div>

              {/* 상세 항목 → 그 자리에서 바로 쓰는 인라인 textarea(모달·팝오버 없음, 자동 높이) */}
              {textFields.map((k) => {
                const meta = textFieldMeta[k];
                const content = ((form as any)[k] || "") as string;
                // 상세 이미지가 없을 때만 본문(오피스=담당업무 / 매장=포지션 소개)을 필수로 표시.
                //   자격요건은 선택 — 조건 없이 뽑는 공고도 있다.
                const isReq = detailImages.length === 0 && k === (isOffice ? "responsibilities" : "description");
                return (
                  <div key={k} style={{ padding: "8px 0", borderBottom: k === textFields[textFields.length - 1] ? "none" : "1px solid var(--color-border)" }}>
                    <label className="admin-form-label" style={{ margin: "0 0 4px", display: "block" }}>
                      {meta.label}
                      {isReq && <span style={{ color: "#dc2626", marginLeft: "3px" }}>*</span>}
                      {meta.hint && <span style={{ fontSize: 11, fontWeight: 400, color: "#bbb", marginLeft: 6 }}>{meta.hint}</span>}
                    </label>
                    <AutoTextarea
                      placeholder=""
                      value={content}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                      style={{ width: "100%", fontSize: 14, color: "#333", lineHeight: 1.5, fontFamily: "inherit" }} />
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ═══ 기업 정보 (맨 하단) · 상세 다른 섹션과 동일한 인라인 스타일 ═══ */}
      {mode === "admin" && nonMember && (
        <div className="jobpost-form" style={{ width: "100%", maxWidth: 760, margin: `16px ${mx} 0`, boxSizing: "border-box" }}>
          <h2 className="jobpost-section-title">{L.section}</h2>
          <div style={{ fontSize: 12, color: "#999", margin: "8px 0 8px 2px" }}>기업회원 페이지의 “{L.section}”를 불러와 자동 작성돼요 · 공고 상세 맨 아래에 표시됩니다</div>
          <div className="company-card" style={{ overflow: "visible" }}>
            <div className="admin-form-body">
              {(() => {
                const row: CSSProperties = { display: "flex", alignItems: "center", gap: 12, padding: "7px 0" };
                const lbl2: CSSProperties = { width: 76, flexShrink: 0, color: "#999", fontSize: 15 };
                const req: CSSProperties = { color: "#e9a3a3" };
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
          style={{ width: "100%", maxWidth: 760, margin: `0 ${mx} 12px`, display: "block", padding: "10px", borderRadius: 8, border: "1px solid #5f0080", background: "#fff", color: "#5f0080", fontSize: 14, fontWeight: 700, boxSizing: "border-box", opacity: curating ? 0.6 : 1 }}>
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
        <div onClick={() => setShowPreview(false)} style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 20px" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: "12px", width: "100%", maxWidth: "1120px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #eee" }}>
              <span style={{ fontSize: "16px", fontWeight: 400 }}>공고 미리보기 (구직자에게 보이는 실제 화면)</span>
              <button onClick={() => setShowPreview(false)} style={{ background: "none", border: "none", fontSize: "22px", cursor: "pointer", color: "#888", lineHeight: 1 }}>×</button>
            </div>
            <div className="jobpost-preview-scope" style={{ padding: 0, maxHeight: "72vh", overflowY: "auto", overflowX: "hidden", background: "#faf7fc" }}>
              <JobDetailView ref={previewRef} job={previewJob}
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
            <div style={{ display: "flex", gap: "8px", padding: "16px 20px", borderTop: "1px solid #eee", justifyContent: "flex-end" }}>
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