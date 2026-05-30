const fs = require('fs');
let content = fs.readFileSync('app/signup/email/page.tsx', 'utf8');

content = content.replace(
  `          {/* 휴대폰 번호 */}
          <div className="mb-4">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">휴대폰 번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="(예시) 010-1234-5678"
              className="w-full h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
            />
            <p className="text-[12px] text-[#9a9a9a] mt-1.5">
              채용 매칭 시 기업이 연락드릴 번호예요
            </p>
          </div>`,
  `          {/* 휴대폰 번호 + 인증 */}
          <div className="mb-4">
            <label className="block text-[13px] text-[#6b6b6b] mb-1.5">휴대폰 번호</label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setPhoneVerified(false); setCodeSent(false); }}
                placeholder="(예시) 010-1234-5678"
                disabled={phoneVerified}
                className="flex-1 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080] disabled:bg-[#f5f5f5]"
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sending || phoneVerified || phone.replace(/\\D/g, "").length < 10}
                className="px-4 h-[48px] whitespace-nowrap rounded-lg text-[13px] font-semibold border border-[#5f0080] text-[#5f0080] disabled:border-[#ddd] disabled:text-[#aaa] hover:bg-[#f5ebfa] transition"
              >
                {phoneVerified ? "인증완료" : codeSent ? "재전송" : sending ? "전송중" : "인증번호 받기"}
              </button>
            </div>

            {codeSent && !phoneVerified && (
              <div className="flex gap-2 mt-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={phoneCode}
                  onChange={(e) => setPhoneCode(e.target.value.replace(/\\D/g, "").slice(0, 6))}
                  placeholder="인증번호 6자리"
                  className="flex-1 h-[48px] px-4 border border-[#e0e0e0] rounded-lg text-[14px] focus:outline-none focus:border-[#5f0080]"
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verifying || phoneCode.length < 6}
                  className="px-4 h-[48px] whitespace-nowrap rounded-lg text-[13px] font-semibold bg-[#5f0080] text-white disabled:opacity-40 hover:opacity-90 transition"
                >
                  {verifying ? "확인중" : "확인"}
                </button>
              </div>
            )}

            {phoneMsg && (
              <p className={\`text-[12px] mt-1.5 \${phoneVerified ? "text-[#10b981]" : "text-[#9a9a9a]"}\`}>
                {phoneMsg}
              </p>
            )}
          </div>`
);

fs.writeFileSync('app/signup/email/page.tsx', content, 'utf8');
console.log('완료');
