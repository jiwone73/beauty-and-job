"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CompanyLayout from "@/components/company/CompanyLayout";
import { companyMeApi } from "@/lib/api/company";
import { passwordError, PASSWORD_HINT } from "@/lib/password";

// 계정정보 안의 작은 팝업이었는데, 세 칸을 채우고 규칙까지 읽어야 하는 일이라
// 팝업이 좁았다. 사이드에서 바로 오는 제 화면으로 뺀다.
export default function CompanyPasswordPage() {
  const router = useRouter();
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const 고치기 = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [k]: e.target.value });
    setError("");
  };

  const handleSubmit = async () => {
    if (!form.current_password || !form.new_password) {
      setError("현재 비밀번호와 새 비밀번호를 입력해주세요."); return;
    }
    const pwErr = passwordError(form.new_password);
    if (pwErr) { setError(pwErr); return; }
    if (form.new_password !== form.confirm_password) {
      setError("새 비밀번호가 일치하지 않습니다."); return;
    }
    setSaving(true);
    try {
      await companyMeApi.changePassword({
        current_password: form.current_password, new_password: form.new_password,
      });
      setForm({ current_password: "", new_password: "", confirm_password: "" });
      setDone(true);
    } catch (e: any) {
      setError(e?.message || "비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const 칸 = { marginTop: 8 } as const;

  return (
    <CompanyLayout activePage="password">
      <div style={{ maxWidth: 420 }}>
        <div className="company-card">
          <div style={{ padding: "20px" }}>
            <input className="admin-form-input" type={showPw ? "text" : "password"}
              placeholder="현재 비밀번호" autoComplete="current-password"
              value={form.current_password} onChange={고치기("current_password")} />
            <input className="admin-form-input" type={showPw ? "text" : "password"}
              placeholder={`새 비밀번호 (${PASSWORD_HINT})`} autoComplete="new-password" style={칸}
              value={form.new_password} onChange={고치기("new_password")} />
            <input className="admin-form-input" type={showPw ? "text" : "password"}
              placeholder="새 비밀번호 확인" autoComplete="new-password" style={칸}
              value={form.confirm_password} onChange={고치기("confirm_password")}
              onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }} />
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10,
              fontSize: 13, color: "#888", cursor: "pointer" }}>
              <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
              비밀번호 표시
            </label>

            {/* 실패든 성공이든 같은 자리에서 말한다 — 팝업이 없어져 알림창을 띄울 이유도 없다. */}
            {error && <p style={{ fontSize: 13, color: "#e05252", margin: "12px 0 0", lineHeight: 1.6 }}>{error}</p>}
            {done && <p style={{ fontSize: 13, color: "#10b981", margin: "12px 0 0" }}>비밀번호가 변경되었습니다.</p>}

            <button onClick={handleSubmit} disabled={saving}
              style={{ width: "100%", height: 46, marginTop: 18, borderRadius: 8, border: "none",
                background: "var(--color-primary)", color: "#fff", fontSize: 16, fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "변경 중..." : "변경하기"}
            </button>
          </div>
        </div>
      </div>
    </CompanyLayout>
  );
}
