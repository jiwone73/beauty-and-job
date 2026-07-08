"use client";

interface PrivacyConsentProps {
  agreed: boolean;
  onChange: (v: boolean) => void;
  items?: string;
}

export default function PrivacyConsent({ agreed, onChange, items = "회사명, 담당자명, 이메일, 연락처, 문의 내용" }: PrivacyConsentProps) {
  return (
    <div style={{ marginTop: 8, marginBottom: 16 }}>
      <div style={{
        border: "1px solid #e5e5e5",
        borderRadius: 8,
        padding: "14px 16px",
        background: "#fafafa",
        fontSize: 13,
        color: "#555",
        lineHeight: 1.7,
        maxHeight: 140,
        overflowY: "auto",
      }}>
        <p style={{ margin: "0 0 8px", fontWeight: 600, color: "#333" }}>개인정보 수집 및 이용 동의</p>
        <p style={{ margin: 0 }}>
          · 수집 항목: {items}<br />
          · 수집 목적: 문의 접수 및 답변 제공<br />
          · 보유 기간: 문의 처리 완료 후 3년간 보관 후 파기<br />
          · 귀하는 동의를 거부할 권리가 있으며, 동의를 거부하실 경우 문의 접수가 제한될 수 있습니다.
        </p>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, cursor: "pointer", fontSize: 14, color: "#333" }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 16, height: 16, accentColor: "#5f0080", cursor: "pointer" }}
        />
        <span>개인정보 수집 및 이용에 동의합니다. <span style={{ color: "#e74c3c" }}>(필수)</span></span>
      </label>
    </div>
  );
}
