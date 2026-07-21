"use client";
import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { formatPhone } from "@/lib/phone";
import FilterDropdown from "@/components/company/FilterDropdown";

const DATE_LABELS: Record<string, string> = { "전체": "전체", today: "오늘", "7d": "최근 7일", "1m": "최근 1개월", "3m": "최근 3개월", "1y": "최근 1년" };
const DATE_VALUES: Record<string, string> = { "전체": "전체", "오늘": "today", "최근 7일": "7d", "최근 1개월": "1m", "최근 3개월": "3m", "최근 1년": "1y" };
import { useSearchParams } from "next/navigation";
import AdminLayout from "@/components/admin/AdminLayout";
// [SMS 발송 기능 보류] 2026-07 — SMS는 휴대폰 인증 전용. 안내는 이메일로 대체 예정.
// import SmsModal from "@/components/admin/SmsModal";
import { Search, Trash2, X, Download, Printer, FileText } from "lucide-react";

const STATUS_TO_LABEL: Record<string, string> = {
  PENDING: "승인대기",
  ACTIVE: "승인완료",
  SUSPENDED: "정지",
  REJECTED: "반려",
};
const TYPE_LABEL: Record<string, string> = {
  OFFICE: "기업",
  STORE: "매장",
  BOTH: "기업+매장",
};
const STATUS_OPTIONS = ["전체", "승인대기", "승인완료", "정지", "반려"];
const JOB_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "게시중", DRAFT: "승인대기", HIDDEN: "반려", CLOSED: "마감", EXPIRED: "만료",
};
const STATUS_CHIP: Record<string, { bg: string; color: string }> = {
  ACTIVE: { bg: "#e8f5e9", color: "#1b7a3d" },
  PENDING: { bg: "#fff4e0", color: "#a05a00" },
  SUSPENDED: { bg: "#fdeaea", color: "#c0392b" },
  REJECTED: { bg: "#f0f0f0", color: "#777" },
};

type Job = { id: string; title: string; status: string; created_at: string };
type Company = {
  id: string;
  company_name: string;
  brand_name: string | null;
  business_number: string | null;
  company_type: string;
  cover_images: any;
  email: string;
  region_sido: string | null;
  region_sigungu: string | null;
  phone: string | null;
  logo_url: string | null;
  description: string | null;
  website_url: string | null;
  address: string | null;
  company_size: string | null;
  founded_year: number | null;
  business_license_url: string | null;
  status: string;
  created_at: string;
  job_count: number;
  jobs: Job[];
};

function fmtDate(d: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  return `${dt.getFullYear()}.${String(dt.getMonth() + 1).padStart(2, "0")}.${String(dt.getDate()).padStart(2, "0")}`;
}

const SIDO_SHORT: Record<string, string> = {
  "서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
  "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종",
  "경기도": "경기", "강원특별자치도": "강원", "강원도": "강원", "충청북도": "충북", "충청남도": "충남",
  "전북특별자치도": "전북", "전라북도": "전북", "전라남도": "전남", "경상북도": "경북",
  "경상남도": "경남", "제주특별자치도": "제주", "제주도": "제주",
};
function regionFromAddress(addr: string | null) {
  if (!addr) return "-";
  const parts = addr.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "-";
  const sido = SIDO_SHORT[parts[0]] || parts[0];
  const sigungu = parts[1] || "";
  return `${sido}${sigungu ? " " + sigungu : ""}`;
}

const isPdf = (u: string) => u.split("?")[0].toLowerCase().endsWith(".pdf");
// 유료 여부 — 유료 요금제 미도입이라 현재 전부 false(무료). 도입 시 이 함수만 실제 필드로 교체.
const isPaid = (_c: Company) => false;

function AdminCompaniesContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") === "pending" ? "승인대기" : "전체";
  // 대시보드 카드에서 넘어온 초기 필터
  const typeParam = searchParams.get("type");
  const initialType =
    typeParam === "STORE" ? "매장" :
    typeParam === "OFFICE" ? "기업" :
    typeParam === "BOTH" ? "기업+매장" : "전체";
  const initialDate = searchParams.get("date") === "today" ? "today" : "전체";
  const detailId = searchParams.get("detail");

  const [companies, setCompanies] = useState<Company[]>([]);
  const [blockedMode, setBlockedMode] = useState(false);
  const [blocks, setBlocks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [typeFilter, setTypeFilter] = useState(initialType);
  const [dateFilter, setDateFilter] = useState(initialDate);
  const [planFilter, setPlanFilter] = useState("전체");
  const [jobFilter, setJobFilter] = useState("전체");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  // [SMS 발송 기능 보류] 2026-07
  // const [smsOpen, setSmsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [companyDetail, setCompanyDetail] = useState<Company | null>(null);
  const [companyPdfLoading, setCompanyPdfLoading] = useState(false);
  const companyPreviewRef = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/companies", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setCompanies(data.success ? data.data.items : []);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  // 열람제한(차단) 관계 — 토글 ON일 때만 조회
  useEffect(() => {
    if (!blockedMode) return;
    const url = `/api/admin/blocks${search ? `?search=${encodeURIComponent(search)}` : ""}`;
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => setBlocks(d.success ? d.data.items : []))
      .catch((e) => console.error("[admin blocks]", e));
  }, [blockedMode, search, token]);

  // ?detail=회사id 로 진입 시 해당 기업 정보 모달 자동 오픈
  useEffect(() => {
    if (!detailId || companies.length === 0) return;
    const match = companies.find((c) => String(c.id) === String(detailId));
    if (match) setCompanyDetail(match);
  }, [detailId, companies]);

  const handleCompanyPdf = async () => {
    if (!companyPreviewRef.current) return;
    setCompanyPdfLoading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const jsPDF = (await import("jspdf")).default;
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(companyPreviewRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight; let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(companyDetail?.company_name ? `${companyDetail.company_name}_기업정보.pdf` : "기업정보.pdf");
    } catch (e) {
      alert("다운로드 중 오류가 발생했습니다.");
    } finally {
      setCompanyPdfLoading(false);
    }
  };

  const handleCompanyPrint = async () => {
    if (!companyPreviewRef.current) return;
    try {
      const html2canvas = (await import("html2canvas")).default;
      await new Promise((r) => setTimeout(r, 300));
      const canvas = await html2canvas(companyPreviewRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const w = window.open("", "_blank");
      if (!w) return;
      w.document.write(`<html><head><title>기업정보 인쇄</title></head><body style="margin:0"><img src="${imgData}" style="width:100%" onload="window.print();window.close()" /></body></html>`);
      w.document.close();
    } catch (e) {
      alert("인쇄 준비 중 오류가 발생했습니다.");
    }
  };

  const changeStatus = async (id: string, newStatus: string) => {
    await fetch("/api/admin/companies", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status: newStatus }),
    });
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
  };

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`선택한 ${selectedIds.length}개 기업을 삭제하시겠습니까?\n등록된 공고·지원 내역도 함께 삭제됩니다.`)) return;
    await Promise.all(
      selectedIds.map((id) =>
        fetch(`/api/admin/companies?id=${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      )
    );
    setCompanies((prev) => prev.filter((c) => !selectedIds.includes(c.id)));
    setSelectedIds([]);
  };

  const matchPeriod = (d: string | null, period: string) => {
    if (!d || period === "전체") return true;
    const dt = new Date(d);
    const now = new Date();
    if (period === "today") {
      const kst = new Date(dt.getTime() + 9*60*60*1000);
        const todayKST = new Date(Date.now() + 9*60*60*1000);
        return kst.toISOString().slice(0,10) === todayKST.toISOString().slice(0,10);
    }
    const days = period === "7d" ? 7 : period === "1m" ? 30 : period === "3m" ? 90 : period === "1y" ? 365 : 0;
    if (!days) return true;
    const from = new Date();
    from.setDate(from.getDate() - days);
    return dt >= from;
  };

  const filtered = companies.filter((c) => {
    const matchSearch = !search || c.company_name?.includes(search) || c.email?.includes(search) || (c.business_number || "").includes(search);
    const matchStatus = statusFilter === "전체" || STATUS_TO_LABEL[c.status] === statusFilter;
    const matchType = typeFilter === "전체" || TYPE_LABEL[c.company_type] === typeFilter;
    const matchDate = matchPeriod(c.created_at, dateFilter);
    // 유료/무료: 유료 요금제 미도입 → 현재 전부 무료. 유료 도입 시 아래 조건에 실제 유료 판별을 추가.
    const matchPlan = planFilter === "전체" || (planFilter === "유료" ? isPaid(c) : !isPaid(c));
    const matchJob = jobFilter === "전체" || (jobFilter === "등록" ? c.job_count > 0 : c.job_count === 0);
    return matchSearch && matchStatus && matchType && matchDate && matchPlan && matchJob;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.ceil(filtered.length / PER_PAGE);

  const allPageSelected = paginated.length > 0 && paginated.every((c) => selectedIds.includes(c.id));
  const toggleAllPage = () => {
    const pageIds = paginated.map((c) => c.id);
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const counts = {
    전체: companies.length,
    승인대기: companies.filter((c) => c.status === "PENDING").length,
    승인완료: companies.filter((c) => c.status === "ACTIVE").length,
    정지: companies.filter((c) => c.status === "SUSPENDED").length,
    반려: companies.filter((c) => c.status === "REJECTED").length,
  };
  const planCounts = {
    유료: companies.filter(isPaid).length,
    무료: companies.filter((c) => !isPaid(c)).length,
  };

  const lbl: React.CSSProperties = { color: "#888" };
  const modalBtn: React.CSSProperties = {
    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600,
    padding: "6px 10px", borderRadius: 6, border: "1px solid #e3dceb", background: "#fff",
    color: "#5f0080", cursor: "pointer",
  };

  return (
    <AdminLayout activeMenu="members-companies">
      {!blockedMode && (
        <div className="admin-mini-stats">
          {Object.entries(counts).map(([label, count]) => (
            <div key={label} className="admin-mini-stat"
              onClick={() => { setStatusFilter(label); setPage(1); }}
              style={{ cursor: "pointer", ...(statusFilter === label ? { outline: "2px solid #5f0080", outlineOffset: "-2px" } : {}) }}>
              <span className="admin-mini-stat-label">{label}</span>
              <span className="admin-mini-stat-value">{count}<span className="admin-mini-unit">개사</span></span>
            </div>
          ))}
        </div>
      )}
      {!blockedMode && (
        <div className="admin-mini-stats" style={{ marginTop: 12 }}>
          {Object.entries(planCounts).map(([label, count]) => (
            <div key={label} className="admin-mini-stat"
              onClick={() => { setPlanFilter(planFilter === label ? "전체" : label); setPage(1); }}
              style={{ cursor: "pointer", ...(planFilter === label ? { outline: "2px solid #5f0080", outlineOffset: "-2px" } : {}) }}>
              <span className="admin-mini-stat-label">{label}</span>
              <span className="admin-mini-stat-value">{count}<span className="admin-mini-unit">개사</span></span>
            </div>
          ))}
        </div>
      )}
      <div className="admin-toolbar">
        <div className="admin-toolbar-left">
          <div className="admin-search-wrap">
            <Search size={16} className="admin-search-icon" />
            <input className="admin-search-input"
              placeholder={blockedMode ? "회원명, 기업명 검색" : "기업명, 이메일, 사업자번호 검색"}
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          
          {!blockedMode && (
          <FilterDropdown label="유형"
            value={typeFilter}
            options={["전체", "매장", "기업", "기업+매장"]}
            onChange={(v) => { setTypeFilter(v); setPage(1); }} />
          )}
          {!blockedMode && (
          <FilterDropdown label="요금제"
            value={planFilter}
            options={["전체", "유료", "무료"]}
            onChange={(v) => { setPlanFilter(v); setPage(1); }} />
          )}
          {!blockedMode && (
          <FilterDropdown label="공고"
            value={jobFilter}
            options={["전체", "등록", "미등록"]}
            onChange={(v) => { setJobFilter(v); setPage(1); }} />
          )}
          {!blockedMode && (<>
          <FilterDropdown label="승인상태"
            value={statusFilter}
            options={STATUS_OPTIONS as unknown as string[]}
            onChange={(v) => { setStatusFilter(v); setPage(1); }} />
          <FilterDropdown label="가입일"
            value={DATE_LABELS[dateFilter] || "전체"}
            options={["전체", "오늘", "최근 7일", "최근 1개월", "최근 3개월", "최근 1년"]}
            onChange={(v) => { setDateFilter(DATE_VALUES[v] ?? "전체"); setPage(1); }} />
          </>)}
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-table-meta" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>총 <strong>{filtered.length}</strong>개사</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => { setBlockedMode((v) => !v); setSearch(""); setPage(1); }}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 6,
                border: `1px solid ${blockedMode ? "#5f0080" : "#e3dceb"}`,
                background: blockedMode ? "#5f0080" : "#fff",
                color: blockedMode ? "#fff" : "#5f0080",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              열람제한기업
            </button>
            {/* [SMS 발송 기능 보류] 2026-07
            {!blockedMode && selectedIds.length > 0 && (
              <button
                onClick={() => setSmsOpen(true)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 6, border: "none",
                  background: "#5f0080", color: "#fff",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                }}
              >
                📱 문자 발송 ({selectedIds.length})
              </button>
            )}
            */}
            {!blockedMode && (
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.length === 0}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "6px 14px", borderRadius: 6, border: "none",
                  background: selectedIds.length ? "#e74c3c" : "#ededed",
                  color: selectedIds.length ? "#fff" : "#aaa",
                  fontSize: 14, fontWeight: 600,
                  cursor: selectedIds.length ? "pointer" : "default",
                }}
              >
                <Trash2 size={15} /> 선택 삭제{selectedIds.length ? ` (${selectedIds.length})` : ""}
              </button>
            )}
          </div>
        </div>
        {blockedMode ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>차단일시</th>
                <th>매장/기업명</th>
                <th>차단한 회원</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="admin-empty" style={{ textAlign: "center" }}>불러오는 중...</td></tr>
              ) : blocks.length === 0 ? (
                <tr><td colSpan={3} className="admin-empty" style={{ textAlign: "center" }}>열람제한(차단) 내역이 없습니다.</td></tr>
              ) : blocks.map((b) => (
                <tr key={b.id}>
                  <td className="admin-td-date">
                    {b.created_at ? new Date(b.created_at).toLocaleDateString("ko-KR") : "-"}
                  </td>
                  <td className="admin-td-brand">
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                      {b.company_name}
                      {b.company_type && (
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#999" }}>
                          {b.company_type === "STORE" ? "매장" : b.company_type === "OFFICE" ? "기업" : "기업+매장"}
                        </span>
                      )}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                        {b.user_avatar_url ? (
                          <img src={b.user_avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (b.user_name?.[0] || "·")}
                      </div>
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: 600 }}>{b.user_name}</div>
                        <div style={{ fontSize: 13, color: "#888", marginTop: 2 }}>{b.user_email}</div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="admin-table" style={{ minWidth: 1160, whiteSpace: "nowrap" }}>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: "center" }}>
                  <input type="checkbox" checked={allPageSelected} onChange={toggleAllPage} style={{ cursor: "pointer" }} />
                </th>
                <th>매장/기업명</th>
                <th>지역</th>
                <th>직원수</th>
                <th>연락처</th>
                <th>사업자번호</th>
                <th>공고</th>
                <th>가입일</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="admin-empty" style={{ textAlign: "center" }}>불러오는 중...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="admin-empty" style={{ textAlign: "center" }}>검색 결과가 없습니다.</td></tr>
              ) : paginated.map((c) => (
                <tr key={c.id} style={{ background: selectedIds.includes(c.id) ? "#faf5ff" : undefined }}>
                  <td style={{ textAlign: "center" }}>
                    <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleOne(c.id)} style={{ cursor: "pointer" }} />
                  </td>
                  {/* 매장/기업명 → 클릭 시 기업정보 모달 */}
                  <td className="admin-td-brand">
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 6, background: "#5f0080", color: "#fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                        {(() => {
                          const cover = Array.isArray(c.cover_images) && c.cover_images[0]?.url ? c.cover_images[0].url : null;
                          const img = c.logo_url || (c.company_type === "STORE" ? cover : null);
                          return img ? (
                            <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            c.company_name?.[0] || "·"
                          );
                        })()}
                      </div>
                      <span onClick={() => setCompanyDetail(c)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#1a1a1a", cursor: "pointer", fontWeight: 400 }}>
                        {c.company_name}
                        <span style={{ fontSize: 12, fontWeight: 500, color: "#999" }}>
                          {TYPE_LABEL[c.company_type] || c.company_type}
                        </span>
                      </span>
                    </div>
                  </td>
                  {/* 지역 */}
                  <td className="admin-td-date">{c.region_sido ? [c.region_sido, c.region_sigungu].filter(Boolean).join(" ") : (regionFromAddress(c.address) || "-")}</td>
                  {/* 직원수 */}
                  <td className="admin-td-date">{c.company_size || "-"}</td>
                  {/* 연락처 + 이메일 */}
                  <td className="admin-td-date">
                    <div>{c.phone ? formatPhone(c.phone) : "-"}</div>
                    <div style={{ fontSize: 13, color: "#888", marginTop: 2, wordBreak: "break-all" }}>{c.email || "-"}</div>
                  </td>
                  {/* 사업자번호 / 등록증 아이콘 */}
                  <td className="admin-td-date">
                    <div>{c.business_number || "-"}</div>
                    <div style={{ marginTop: 4 }}>
                      {c.business_license_url ? (
                        <button onClick={() => setPreviewUrl(c.business_license_url)} title="사업자등록증 보기"
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#5f0080", display: "inline-flex", alignItems: "center", gap: 3, fontSize: 13, fontWeight: 500 }}>
                          <FileText size={14} /><span>사업자등록증</span>
                        </button>
                      ) : (
                        <span style={{ color: "#ccc", display: "inline-flex", alignItems: "center", gap: 3, fontSize: 13 }} title="미제출">
                          <FileText size={14} /><span>사업자등록증</span>
                        </span>
                      )}
                    </div>
                  </td>
                  {/* 공고 → 클릭 시 해당 기업 공고 목록 */}
                  <td className="admin-td-date">
                    {c.job_count > 0 ? (
                      <a href={`/admin/jobs?search=${encodeURIComponent(c.company_name)}`}
                        title={`${c.company_name} 공고 보기`}
                        style={{ color: "#5f0080", fontWeight: 600, textDecoration: "none" }}>
                        {c.job_count}건
                      </a>
                    ) : (
                      <span style={{ color: "#bbb" }}>0건</span>
                    )}
                  </td>
                  {/* 가입일 */}
                  <td className="admin-td-date">{fmtDate(c.created_at)}</td>
                  {/* 상태 */}
                  <td>
                    <select
                      className={`admin-status-select admin-status-${
                        c.status === "ACTIVE" ? "success" :
                        c.status === "PENDING" ? "warning" : "danger"
                      }`}
                      value={STATUS_TO_LABEL[c.status]}
                      onChange={(e) => {
                        const label = e.target.value;
                        const key = Object.keys(STATUS_TO_LABEL).find((k) => STATUS_TO_LABEL[k] === label);
                        if (key) changeStatus(c.id, key);
                      }}
                    >
                      <option value="승인대기">승인대기</option>
                      <option value="승인완료">승인완료</option>
                      <option value="정지">정지</option>
                      <option value="반려">반려</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div className="admin-pagination">
            <button className="admin-page-btn" disabled={page === 1} onClick={() => setPage(page - 1)}>이전</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} className={`admin-page-btn ${page === p ? "active" : ""}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="admin-page-btn" disabled={page === totalPages} onClick={() => setPage(page + 1)}>다음</button>
          </div>
        )}
      </div>

      {/* 기업 정보 미리보기 모달 */}
      {companyDetail && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: 600, width: "92%", overflow: "hidden", padding: 0 }} onClick={(e) => e.stopPropagation()}>
            {/* 헤더 액션바 (PDF·인쇄 캡처 제외) */}
            <div className="admin-modal-header" style={{ padding: "14px 18px" }}>
              <h2 className="admin-modal-title">기업 정보</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {companyDetail.business_license_url && (
                  <button onClick={() => setPreviewUrl(companyDetail.business_license_url)} style={modalBtn}>
                    <FileText size={15} /> 사업자등록증
                  </button>
                )}
                <button onClick={handleCompanyPdf} disabled={companyPdfLoading} style={modalBtn}>
                  <Download size={15} /> {companyPdfLoading ? "저장 중..." : "PDF"}
                </button>
                <button onClick={handleCompanyPrint} style={modalBtn}>
                  <Printer size={15} /> 인쇄
                </button>
                <button className="admin-modal-close" onClick={() => setCompanyDetail(null)}><X size={20} /></button>
              </div>
            </div>

            {/* 본문 (PDF·인쇄 캡처 대상) */}
            <div ref={companyPreviewRef} style={{ maxHeight: "72vh", overflow: "auto", background: "#fff" }}>
              {/* 커버 + 로고 오버레이 */}
              {(() => {
                const cover = Array.isArray(companyDetail.cover_images) && companyDetail.cover_images[0]?.url ? companyDetail.cover_images[0].url : null;
                return (
                  <div style={{ position: "relative", height: 128, background: cover ? "#eee" : "#7c3aed" }}>
                    {cover && <img src={cover} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                    <div style={{ position: "absolute", left: 20, bottom: -28, width: 64, height: 64, borderRadius: 12, background: "#5f0080", border: "3px solid #fff", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 23, fontWeight: 700 }}>
                      {companyDetail.logo_url
                        ? <img src={companyDetail.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : (companyDetail.company_name?.[0] || "·")}
                    </div>
                  </div>
                );
              })()}

              {/* 이름 + 배지 */}
              <div style={{ padding: "38px 22px 0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 19, fontWeight: 700, color: "#1a1a1a" }}>{companyDetail.company_name}</span>
                  <span style={{ fontSize: 12, padding: "3px 9px", borderRadius: 6, background: "#f3e8ff", color: "#5f0080" }}>{TYPE_LABEL[companyDetail.company_type] || companyDetail.company_type}</span>
                  <span style={{ fontSize: 12, padding: "3px 9px", borderRadius: 6, ...(STATUS_CHIP[companyDetail.status] ? { background: STATUS_CHIP[companyDetail.status].bg, color: STATUS_CHIP[companyDetail.status].color } : { background: "#f0f0f0", color: "#777" }) }}>{STATUS_TO_LABEL[companyDetail.status] || companyDetail.status}</span>
                </div>
                {companyDetail.brand_name && <p style={{ fontSize: 14, color: "#888", margin: "4px 0 0" }}>{companyDetail.brand_name}</p>}
              </div>

              {/* 기본 정보 그리드 */}
              <div style={{ padding: "18px 22px 0" }}>
                <div style={{ display: "grid", gridTemplateColumns: "84px 1fr 84px 1fr", rowGap: 12, columnGap: 12, fontSize: 14, alignItems: "center" }}>
                  <span style={lbl}>사업자번호</span><span>{companyDetail.business_number || "-"}</span>
                  <span style={lbl}>설립연도</span><span>{companyDetail.founded_year ? `${companyDetail.founded_year}년` : "-"}</span>
                  <span style={lbl}>사원수</span><span>{companyDetail.company_size || "-"}</span>
                  <span style={lbl}>가입일</span><span>{fmtDate(companyDetail.created_at)}</span>
                  <span style={lbl}>이메일</span><span style={{ color: "#5f0080", wordBreak: "break-all" }}>{companyDetail.email || "-"}</span>
                  <span style={lbl}>연락처</span><span>{companyDetail.phone ? formatPhone(companyDetail.phone) : "-"}</span>
                  <span style={{ ...lbl, alignSelf: "start" }}>주소</span><span style={{ gridColumn: "span 3" }}>{companyDetail.address || "-"}</span>
                  <span style={lbl}>웹사이트</span>
                  <span style={{ gridColumn: "span 3", wordBreak: "break-all" }}>{companyDetail.website_url
                    ? <a href={companyDetail.website_url} target="_blank" rel="noreferrer" style={{ color: "#5f0080" }}>{companyDetail.website_url}</a>
                    : "-"}</span>
                </div>
              </div>

              {/* 소개 */}
              {companyDetail.description && (
                <div style={{ padding: "20px 22px 0" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#5f0080", marginBottom: 7 }}>기업 소개</div>
                  <p style={{ fontSize: 14, color: "#333", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{companyDetail.description}</p>
                </div>
              )}

              {/* 등록 공고 */}
              <div style={{ padding: "20px 22px 24px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#5f0080", marginBottom: 8 }}>등록 공고 ({companyDetail.job_count}건)</div>
                {companyDetail.jobs && companyDetail.jobs.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {companyDetail.jobs.map((j, i) => {
                      const closed = j.status === "CLOSED" || j.status === "EXPIRED" || j.status === "HIDDEN";
                      const row = (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: closed ? "#f5f5f5" : "#f3e8ff", borderRadius: 6, cursor: j.id ? "pointer" : "default" }}>
                          <span style={{ fontSize: 14, color: closed ? "#888" : "#1a1a1a" }}>{j.title}</span>
                          <span style={{ fontSize: 12, color: closed ? "#aaa" : "#5f0080", flexShrink: 0, marginLeft: 8 }}>{JOB_STATUS_LABEL[j.status] || j.status} · {fmtDate(j.created_at)}</span>
                        </div>
                      );
                      return j.id
                        ? <a key={i} href={`/jobs/${j.id}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>{row}</a>
                        : <div key={i}>{row}</div>;
                    })}
                  </div>
                ) : (
                  <div style={{ fontSize: 14, color: "#aaa" }}>등록된 공고가 없습니다.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 사업자등록증 미리보기 모달 */}
      {previewUrl && (
        <div className="admin-modal-overlay" onClick={() => setPreviewUrl(null)}>
          <div className="admin-modal" style={{ maxWidth: 760, width: "90%" }} onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2 className="admin-modal-title">사업자등록증</h2>
              <button className="admin-modal-close" onClick={() => setPreviewUrl(null)}><X size={20} /></button>
            </div>
            <div style={{ maxHeight: "75vh", overflow: "auto", padding: 16, background: "#f3f3f3" }}>
              {isPdf(previewUrl) ? (
                <iframe src={previewUrl} title="사업자등록증" style={{ width: "100%", height: "72vh", border: "none", background: "#fff", borderRadius: 6 }} />
              ) : (
                <img src={previewUrl} alt="사업자등록증" style={{ width: "100%", height: "auto", display: "block", borderRadius: 6 }} />
              )}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 16px", borderTop: "1px solid #ececec" }}>
              <a href={previewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 14, color: "#5f0080", fontWeight: 600 }}>
                새 탭에서 열기 ↗
              </a>
            </div>
          </div>
        </div>
      )}
      {/* [SMS 발송 기능 보류] 2026-07
      {smsOpen && (
        <SmsModal
          targets={selectedIds.map((id) => {
            const co = companies.find((c) => c.id === id);
            return { id, name: co?.company_name || "", phone: co?.phone || "" };
          })}
          onClose={() => setSmsOpen(false)}
        />
      )}
      */}
    </AdminLayout>
  );
}
export default function AdminCompaniesPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#888" }}>불러오는 중...</div>}>
      <AdminCompaniesContent />
    </Suspense>
  );
}