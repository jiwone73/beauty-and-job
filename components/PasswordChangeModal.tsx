"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { passwordError, PASSWORD_HINT } from "@/lib/password";

// 계정 설정에서 '차단 기업'과 같은 자리글 방식으로 연다 — 늘 펼쳐 둔
// 아코디언 대신 판으로. 닫힐 때마다 입력한 것을 지워 다음에 열면 늘 빈
// 칸에서 시작한다(비밀번호를 남의 눈에 남겨 두지 않는다).
export default function PasswordChangeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setCurPw(""); setNewPw(""); setConfirmPw(""); }
  }, [open]);

  const handleChangePw = async () => {
    if (!curPw || !newPw) { alert("현재 비밀번호와 새 비밀번호를 입력해주세요."); return; }
    const pwErr = passwordError(newPw);
    if (pwErr) { alert(pwErr); return; }
    if (newPw !== confirmPw) { alert("새 비밀번호가 일치하지 않습니다."); return; }
    const token = localStorage.getItem("access_token");
    if (!token) { alert("로그인이 필요합니다."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ current_password: curPw, new_password: newPw }),
      });
      const data = await res.json();
      if (data.success) {
        alert("비밀번호가 변경되었습니다.");
        onClose();
      } else {
        alert(data.error?.message || "비밀번호 변경에 실패했습니다.");
      }
    } catch {
      alert("비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="cv-overlay" onClick={onClose}>
      <div className="cv-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
        <div className="cv-header">
          <h2 className="cv-title">비밀번호 변경</h2>
          <button className="cv-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="cv-body">
          <input type="password" placeholder="현재 비밀번호" value={curPw} onChange={(e) => setCurPw(e.target.value)}
            style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 8, boxSizing: "border-box" }} />
          <input type="password" placeholder={`새 비밀번호 (${PASSWORD_HINT})`} value={newPw} onChange={(e) => setNewPw(e.target.value)}
            style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 8, boxSizing: "border-box" }} />
          <input type="password" placeholder="새 비밀번호 확인" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
            style={{ width: "100%", height: 44, padding: "0 12px", borderRadius: 8, border: "1px solid #ddd", fontSize: 14, marginBottom: 16, boxSizing: "border-box" }} />
          <button onClick={handleChangePw} disabled={saving}
            style={{ width: "100%", height: 48, borderRadius: 8, border: "none", background: "#582681", color: "#fff", fontSize: 15, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "변경 중..." : "비밀번호 변경"}
          </button>
          <p style={{ fontSize: 12, color: "#999", margin: "10px 0 0" }}>카카오 등 소셜 로그인 계정은 비밀번호 변경이 불가능합니다.</p>
        </div>
      </div>
    </div>
  );
}
