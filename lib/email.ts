import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "뷰티앤잡 <noreply@beautynjob.co.kr>";

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "[뷰티앤잡] 비밀번호 재설정 안내",
    html: `
      <div style="max-width:480px;margin:0 auto;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#1a1a1a;">
        <div style="padding:24px 0;border-bottom:2px solid #5f0080;">
          <span style="font-size:20px;font-weight:700;color:#5f0080;">뷰티앤잡</span>
        </div>
        <div style="padding:32px 0;">
          <h1 style="font-size:18px;margin:0 0 16px;">비밀번호 재설정</h1>
          <p style="font-size:14px;line-height:1.7;color:#444;margin:0 0 24px;">
            아래 버튼을 눌러 비밀번호를 재설정해 주세요.<br/>
            이 링크는 <strong>30분간</strong> 유효합니다.
          </p>
          <a href="${resetUrl}"
             style="display:inline-block;padding:13px 28px;background:#5f0080;color:#fff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
            비밀번호 재설정하기
          </a>
          <p style="font-size:12px;color:#999;line-height:1.7;margin:24px 0 0;">
            본인이 요청하지 않았다면 이 메일을 무시하셔도 됩니다.<br/>
            버튼이 작동하지 않으면 아래 주소를 복사해 접속하세요:<br/>
            <span style="color:#5f0080;word-break:break-all;">${resetUrl}</span>
          </p>
        </div>
        <div style="padding:16px 0;border-top:1px solid #eee;font-size:11px;color:#aaa;">
          © 뷰티앤잡 (Beauty & Job)
        </div>
      </div>
    `,
  });
}
