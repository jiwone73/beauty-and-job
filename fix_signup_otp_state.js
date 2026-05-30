const fs = require('fs');
let content = fs.readFileSync('app/signup/email/page.tsx', 'utf8');

// 1. phone state 다음에 인증 관련 state 추가
content = content.replace(
  `  const [phone, setPhone] = useState("");`,
  `  const [phone, setPhone] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState("");`
);

// 2. handleSubmit 앞에 인증 핸들러 2개 추가
content = content.replace(
  `  const handleSubmit = async () => {`,
  `  const handleSendCode = async () => {
    const clean = phone.replace(/\\D/g, "");
    if (clean.length < 10) { setPhoneMsg("올바른 휴대폰 번호를 입력해주세요."); return; }
    setSending(true);
    setPhoneMsg("");
    try {
      const res = await fetch("/api/auth/phone/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean, purpose: "signup" }),
      });
      const data = await res.json();
      if (data.success) {
        setCodeSent(true);
        setPhoneMsg("인증번호를 발송했어요. (3분 이내 입력)");
      } else {
        setPhoneMsg(data.error?.message || "발송에 실패했습니다.");
      }
    } catch {
      setPhoneMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setSending(false);
    }
  };

  const handleVerifyCode = async () => {
    const clean = phone.replace(/\\D/g, "");
    if (!phoneCode.trim()) { setPhoneMsg("인증번호를 입력해주세요."); return; }
    setVerifying(true);
    setPhoneMsg("");
    try {
      const res = await fetch("/api/auth/phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean, code: phoneCode, purpose: "signup" }),
      });
      const data = await res.json();
      if (data.success) {
        setPhoneVerified(true);
        setPhoneMsg("휴대폰 인증이 완료됐어요.");
      } else {
        setPhoneMsg(data.error?.message || "인증번호가 올바르지 않습니다.");
      }
    } catch {
      setPhoneMsg("네트워크 오류가 발생했습니다.");
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {`
);

fs.writeFileSync('app/signup/email/page.tsx', content, 'utf8');
console.log('완료');
