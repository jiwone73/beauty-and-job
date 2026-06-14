"use client";
import { forwardRef } from "react";

interface JobPreviewProps {
  title: string;
  company: string;
  jobGroupType: "기업" | "매장";
  categories: string[];
  career: string;
  employment: string;
  regions: string[];
  salary: string;
  salaryNego: boolean;
  deadline: string;
  alwaysOpen: boolean;
  benefitTags: string[];
  benefits: string;
  description: string;
  requirements: string;
  preferred: string;
  hiringProcess: string[];
  notes: string;
  detailImages: { url: string; name: string }[];
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", padding: "7px 0", fontSize: "14px", borderBottom: "1px solid #f5f5f5" }}>
      <span style={{ width: "90px", color: "#888", flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#222" }}>{value}</span>
    </div>
  );
}

function Block({ title, text }: { title: string; text: string }) {
  return (
    <div className="rp-section">
      <h2 className="rp-section-title">{title}</h2>
      <p className="rp-text" style={{ whiteSpace: "pre-line" }}>{text}</p>
    </div>
  );
}

const JobPreview = forwardRef<HTMLDivElement, JobPreviewProps>(function JobPreview(p, ref) {
  const steps = p.hiringProcess.filter((s) => s.trim());
  const salaryText = p.salaryNego || !p.salary ? "협의" : `${p.salary}만원 (${p.jobGroupType === "매장" ? "월급" : "연봉"})`;
  const deadlineText = p.alwaysOpen || !p.deadline ? "상시채용" : `~ ${p.deadline}`;
  return (
    <div ref={ref} className="rp-wrap">
      <div className="rp-header">
        <h1 className="rp-name">{p.title || "공고 제목"}</h1>
        <p className="rp-meta">{[p.company, p.categories.join(", ")].filter(Boolean).join(" · ")}</p>
      </div>

      <div className="rp-section">
        <h2 className="rp-section-title">모집 조건</h2>
        <Row label="경력" value={p.career || "-"} />
        <Row label="고용형태" value={p.employment || "-"} />
        <Row label="근무지역" value={p.regions.join(", ") || "-"} />
        <Row label={p.jobGroupType === "매장" ? "급여" : "연봉"} value={salaryText} />
        <Row label="마감" value={deadlineText} />
      </div>

      {p.benefitTags.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">복리후생 · 근무조건</h2>
          <div className="rp-chips">{p.benefitTags.map((b) => <span key={b} className="rp-chip">{b}</span>)}</div>
        </div>
      )}

      {p.benefits && <Block title={p.jobGroupType === "매장" ? "근무조건·복지" : "복리후생"} text={p.benefits} />}
      {p.description && <Block title="포지션 소개" text={p.description} />}
      {p.requirements && <Block title="자격요건" text={p.requirements} />}
      {p.preferred && <Block title="우대사항" text={p.preferred} />}

      {steps.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">채용 절차</h2>
          <p className="rp-text">{steps.map((s, i) => `${i + 1}. ${s}`).join("   →   ")}</p>
        </div>
      )}

      {p.notes && <Block title="비고 · 유의사항" text={p.notes} />}

      {p.detailImages.length > 0 && (
        <div className="rp-section">
          <h2 className="rp-section-title">상세 이미지</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {p.detailImages.map((img, i) => (
              <img key={i} src={img.url} alt={img.name} style={{ width: "100%", borderRadius: "8px", border: "1px solid #eee" }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

export default JobPreview;
