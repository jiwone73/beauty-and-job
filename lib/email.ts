import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "뷰티앤잡 <noreply@beautynjob.co.kr>";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://beauty-and-job.vercel.app";
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");
const LOGO_URL = `${SITE_URL}/images/logo.png`;

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

export async function sendWelcomeEmail(to: string, name: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "[뷰티앤잡] 가입을 환영해요",
    html: `
      <div style="background:#ffffff;padding:24px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
          <tr><td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td align="center" bgcolor="#f4eefc" style="padding:26px 32px;border-bottom:1px solid #e9ddf7;">
                  <img src="${LOGO_URL}" alt="뷰티앤잡" height="32" style="display:block;border:0;height:32px;" />
                </td>
              </tr>
              <tr>
                <td style="padding:32px 32px 8px;">
                  <p style="font-size:21px;font-weight:700;color:#7c3aed;margin:0 0 6px;">환영합니다, ${name} 님</p>
                  <p style="font-size:15px;color:#5f5e5a;margin:0 0 18px;">뷰티 커리어의 시작을 함께할게요.</p>
                  <p style="font-size:15px;color:#444444;line-height:1.7;margin:0 0 24px;">
                    가입해 주셔서 감사해요. 뷰티앤잡은 메이크업·헤어·네일·피부부터 매장직·사무직까지, 뷰티 업계 채용만 모았어요. 지금 이력서를 완성하면 더 많은 기업·매장에 내 프로필이 노출돼요.
                  </p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                    <tr><td align="center" bgcolor="#7c3aed" style="border-radius:8px;">
                      <a href="${SITE_URL}/profile/resume" style="display:inline-block;padding:13px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">이력서 완성하기</a>
                    </td></tr>
                  </table>
                  <p style="text-align:center;margin:14px 0 28px;">
                    <a href="${SITE_URL}/jobs" style="font-size:14px;color:#8b5cf6;text-decoration:none;">또는 공고 먼저 둘러보기 →</a>
                  </p>
                </td>
              </tr>
              <tr>
                <td bgcolor="#faf7fe" style="padding:24px 32px;border-top:1px solid #f0e9fa;">
                  <p style="font-size:14px;font-weight:700;color:#2c2c2a;margin:0 0 16px;">이렇게 시작하세요</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="40" valign="top">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                          <td align="center" valign="middle" width="28" height="28" bgcolor="#ede9fe" style="width:28px;height:28px;border-radius:14px;color:#7c3aed;font-size:14px;font-weight:700;">1</td>
                        </tr></table>
                      </td>
                      <td valign="top" style="padding:0 0 14px 4px;">
                        <p style="font-size:14px;font-weight:700;color:#2c2c2a;margin:2px 0 2px;">이력서 완성</p>
                        <p style="font-size:13px;color:#5f5e5a;margin:0;line-height:1.6;">경력·희망 직군·근무 지역을 채워주세요.</p>
                      </td>
                    </tr>
                    <tr>
                      <td width="40" valign="top">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                          <td align="center" valign="middle" width="28" height="28" bgcolor="#ede9fe" style="width:28px;height:28px;border-radius:14px;color:#7c3aed;font-size:14px;font-weight:700;">2</td>
                        </tr></table>
                      </td>
                      <td valign="top" style="padding:0 0 14px 4px;">
                        <p style="font-size:14px;font-weight:700;color:#2c2c2a;margin:2px 0 2px;">맞춤 공고 확인</p>
                        <p style="font-size:13px;color:#5f5e5a;margin:0;line-height:1.6;">관심 지역·직군 공고를 자동으로 추천해드려요.</p>
                      </td>
                    </tr>
                    <tr>
                      <td width="40" valign="top">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                          <td align="center" valign="middle" width="28" height="28" bgcolor="#ede9fe" style="width:28px;height:28px;border-radius:14px;color:#7c3aed;font-size:14px;font-weight:700;">3</td>
                        </tr></table>
                      </td>
                      <td valign="top" style="padding:0 0 0 4px;">
                        <p style="font-size:14px;font-weight:700;color:#2c2c2a;margin:2px 0 2px;">원클릭 지원</p>
                        <p style="font-size:13px;color:#5f5e5a;margin:0;line-height:1.6;">한 번 작성한 이력서로 마음에 드는 공고에 바로 지원하세요.</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#f6f3fb" style="padding:22px 32px;">
                  <p style="font-size:13px;color:#5f5e5a;margin:0 0 10px;line-height:1.6;">도움이 필요하면 언제든 문의해 주세요.</p>
                  <p style="font-size:12px;color:#888780;margin:0 0 4px;">뷰티앤잡 · <a href="${SITE_URL}" style="color:#888780;text-decoration:none;">${SITE_HOST}</a></p>
                  <p style="font-size:12px;color:#888780;margin:0 0 8px;">이 메일은 회원가입 안내를 위해 발송되었습니다.</p>
                  <p style="font-size:12px;color:#888780;margin:0;">
                    <a href="${SITE_URL}/about/contact" style="color:#8b5cf6;text-decoration:none;">문의하기</a>
                    &nbsp;·&nbsp;
                    <a href="${SITE_URL}/about/contact" style="color:#888780;text-decoration:none;">수신거부</a>
                    &nbsp;·&nbsp;© 2026 뷰티앤잡
                  </p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </div>
    `,
  });
}

export async function sendApplicationCompleteEmail(
  to: string, name: string, jobTitle: string, companyName: string, appliedDate: string
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "[뷰티앤잡] 지원이 완료됐어요",
    html: `
      <div style="background:#ffffff;padding:24px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
          <tr><td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #efeaf6;">
              <tr>
                <td align="center" bgcolor="#f4eefc" style="padding:24px 32px;border-bottom:1px solid #e9ddf7;">
                  <img src="${LOGO_URL}" alt="뷰티앤잡" height="30" style="display:block;border:0;height:30px;" />
                </td>
              </tr>
              <tr>
                <td style="padding:32px 32px 28px;">
                  <p style="font-size:20px;font-weight:700;color:#2c2c2a;text-align:center;margin:0 0 8px;">지원이 완료됐어요</p>
                  <p style="font-size:15px;color:#5f5e5a;text-align:center;line-height:1.7;margin:0 0 24px;">${name} 님, 아래 공고에 지원이 정상 접수됐어요.</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf8fe;border:1px solid #ece7f6;border-radius:10px;">
                    <tr>
                      <td style="padding:14px 20px;border-bottom:1px solid #f0ecf8;font-size:14px;color:#888780;">공고</td>
                      <td align="right" style="padding:14px 20px;border-bottom:1px solid #f0ecf8;font-size:14px;color:#2c2c2a;font-weight:700;">${jobTitle}</td>
                    </tr>
                    <tr>
                      <td style="padding:14px 20px;border-bottom:1px solid #f0ecf8;font-size:14px;color:#888780;">기업</td>
                      <td align="right" style="padding:14px 20px;border-bottom:1px solid #f0ecf8;font-size:14px;color:#2c2c2a;">${companyName}</td>
                    </tr>
                    <tr>
                      <td style="padding:14px 20px;font-size:14px;color:#888780;">지원일</td>
                      <td align="right" style="padding:14px 20px;font-size:14px;color:#2c2c2a;">${appliedDate}</td>
                    </tr>
                  </table>
                  <p style="font-size:14px;color:#5f5e5a;line-height:1.7;margin:22px 0 24px;">기업이 이력서를 검토한 뒤 개별적으로 연락드려요. 지원 현황은 마이페이지에서 언제든 확인할 수 있어요.</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                    <tr><td align="center" bgcolor="#7c3aed" style="border-radius:8px;">
                      <a href="${SITE_URL}/profile?tab=applied" style="display:inline-block;padding:12px 30px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">지원 현황 보기</a>
                    </td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#f6f3fb" style="padding:18px 32px;">
                  <p style="font-size:12px;color:#888780;margin:0;">뷰티앤잡 · <a href="${SITE_URL}" style="color:#888780;text-decoration:none;">${SITE_HOST}</a> &nbsp;·&nbsp; © 2026 뷰티앤잡</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </div>
    `,
  });
}

export async function sendNewApplicantEmail(
  to: string, companyName: string, applicantName: string, jobType: string, jobTitle: string, appliedDate: string
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "[뷰티앤잡] 새 지원자가 도착했어요",
    html: `
      <div style="background:#ffffff;padding:24px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
          <tr><td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #efeaf6;">
              <tr>
                <td align="center" bgcolor="#f4eefc" style="padding:24px 32px;border-bottom:1px solid #e9ddf7;">
                  <img src="${LOGO_URL}" alt="뷰티앤잡" height="30" style="display:block;border:0;height:30px;" />
                </td>
              </tr>
              <tr>
                <td style="padding:32px 32px 28px;">
                  <p style="font-size:20px;font-weight:700;color:#2c2c2a;text-align:center;margin:0 0 8px;">새 지원자가 도착했어요</p>
                  <p style="font-size:15px;color:#5f5e5a;text-align:center;line-height:1.7;margin:0 0 24px;">${companyName} 님, 「${jobTitle}」 공고에 새 지원자가 지원했어요.</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf8fe;border:1px solid #ece7f6;border-radius:10px;">
                    <tr>
                      <td style="padding:14px 20px;border-bottom:1px solid #f0ecf8;font-size:14px;color:#888780;">지원자</td>
                      <td align="right" style="padding:14px 20px;border-bottom:1px solid #f0ecf8;font-size:14px;color:#2c2c2a;font-weight:700;">${applicantName}</td>
                    </tr>
                    <tr>
                      <td style="padding:14px 20px;border-bottom:1px solid #f0ecf8;font-size:14px;color:#888780;">직군</td>
                      <td align="right" style="padding:14px 20px;border-bottom:1px solid #f0ecf8;font-size:14px;color:#2c2c2a;">${jobType}</td>
                    </tr>
                    <tr>
                      <td style="padding:14px 20px;font-size:14px;color:#888780;">지원일</td>
                      <td align="right" style="padding:14px 20px;font-size:14px;color:#2c2c2a;">${appliedDate}</td>
                    </tr>
                  </table>
                  <p style="font-size:13px;color:#7c3aed;background:#f3eefc;border-radius:8px;padding:12px 16px;line-height:1.6;margin:18px 0 24px;">빠른 연락이 채용 성공률을 높여요. 지금 이력서를 확인해보세요.</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                    <tr><td align="center" bgcolor="#7c3aed" style="border-radius:8px;">
                      <a href="${SITE_URL}/company/dashboard/applicants" style="display:inline-block;padding:12px 30px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">지원자 확인하기</a>
                    </td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#f6f3fb" style="padding:18px 32px;">
                  <p style="font-size:12px;color:#888780;margin:0;">뷰티앤잡 · <a href="${SITE_URL}" style="color:#888780;text-decoration:none;">${SITE_HOST}</a> &nbsp;·&nbsp; © 2026 뷰티앤잡</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </div>
    `,
  });
}

export async function sendResumeViewedEmail(
  to: string, name: string, jobTitle: string, companyName: string, viewedAt: string
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: "[뷰티앤잡] 기업이 이력서를 확인했어요",
    html: `
      <div style="background:#ffffff;padding:24px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
          <tr><td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #efeaf6;">
              <tr>
                <td align="center" bgcolor="#f4eefc" style="padding:24px 32px;border-bottom:1px solid #e9ddf7;">
                  <img src="${LOGO_URL}" alt="뷰티앤잡" height="30" style="display:block;border:0;height:30px;" />
                </td>
              </tr>
              <tr>
                <td style="padding:32px 32px 28px;">
                  <p style="font-size:20px;font-weight:700;color:#2c2c2a;text-align:center;margin:0 0 8px;">기업이 이력서를 확인했어요</p>
                  <p style="font-size:15px;color:#5f5e5a;text-align:center;line-height:1.7;margin:0 0 24px;">${name} 님, 지원하신 공고의 기업이 이력서를 열람했어요.</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf8fe;border:1px solid #ece7f6;border-radius:10px;">
                    <tr>
                      <td style="padding:14px 20px;border-bottom:1px solid #f0ecf8;font-size:14px;color:#888780;">공고</td>
                      <td align="right" style="padding:14px 20px;border-bottom:1px solid #f0ecf8;font-size:14px;color:#2c2c2a;font-weight:700;">${jobTitle}</td>
                    </tr>
                    <tr>
                      <td style="padding:14px 20px;border-bottom:1px solid #f0ecf8;font-size:14px;color:#888780;">기업</td>
                      <td align="right" style="padding:14px 20px;border-bottom:1px solid #f0ecf8;font-size:14px;color:#2c2c2a;">${companyName}</td>
                    </tr>
                    <tr>
                      <td style="padding:14px 20px;font-size:14px;color:#888780;">열람일시</td>
                      <td align="right" style="padding:14px 20px;font-size:14px;color:#7c3aed;font-weight:700;">${viewedAt}</td>
                    </tr>
                  </table>
                  <p style="font-size:14px;color:#5f5e5a;line-height:1.7;margin:22px 0 24px;">지금 서류 검토가 진행되고 있어요. 결과는 기업이 개별적으로 연락드려요. 비슷한 다른 공고에도 함께 지원해보세요.</p>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                    <tr><td align="center" bgcolor="#7c3aed" style="border-radius:8px;">
                      <a href="${SITE_URL}/profile?tab=applied" style="display:inline-block;padding:12px 30px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">지원 현황 보기</a>
                    </td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#f6f3fb" style="padding:18px 32px;">
                  <p style="font-size:12px;color:#888780;margin:0;">뷰티앤잡 · <a href="${SITE_URL}" style="color:#888780;text-decoration:none;">${SITE_HOST}</a> &nbsp;·&nbsp; © 2026 뷰티앤잡</p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </div>
    `,
  });
}
export async function sendJobRecommendationEmail(
  to: string,
  name: string,
  groupLabel: string | null,
  jobs: {
    id: string;
    title: string;
    location: string | null;
    experience_level: string | null;
    brand_name: string | null;
    company_name: string;
    logo_url: string | null;
  }[],
  unsubscribeUrl: string
) {
  const heading = groupLabel
    ? `${name} 님께 맞는<br/>${groupLabel} 관련 새 공고에요`
    : `${name} 님께 맞는<br/>새 공고를 찾았어요`;

  const cardsHtml = jobs
    .map((j) => {
      const company = j.brand_name || j.company_name || "";
      const logo = j.logo_url || LOGO_URL;
      const meta = [j.experience_level, j.location].filter(Boolean).join(" · ");
      const jobUrl = `${SITE_URL}/jobs/${j.id}`;
      return `
        <tr>
          <td style="padding:0 0 12px;">
            <a href="${jobUrl}" style="text-decoration:none;color:inherit;display:block;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid #eeeeee;border-radius:10px;">
                <tr>
                  <td width="58" valign="middle" style="padding:14px 0 14px 14px;">
                    <img src="${logo}" alt="${company}" width="44" height="44" style="display:block;width:44px;height:44px;border-radius:8px;border:1px solid #f0f0f0;object-fit:cover;" />
                  </td>
                  <td valign="middle" style="padding:14px 12px;">
                    <p style="font-size:12px;color:#8b8b8b;margin:0 0 2px;">${company}</p>
                    <p style="font-size:15px;font-weight:700;color:#1a1a1a;margin:0 0 4px;line-height:1.4;">${j.title}</p>
                    <p style="font-size:12px;color:#8b8b8b;margin:0;">${meta}</p>
                  </td>
                  <td width="44" valign="middle" align="right" style="padding:14px 14px 14px 0;">
                    <span style="font-size:13px;color:#7c3aed;white-space:nowrap;">보기 ›</span>
                  </td>
                </tr>
              </table>
            </a>
          </td>
        </tr>`;
    })
    .join("");

  return resend.emails.send({
    from: FROM,
    to,
    subject: `[프로모션] ${name} 님, 오늘의 추천 포지션이 도착했어요`,
    html: `
      <div style="background:#f7f6f9;padding:24px 0;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr><td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
              <tr>
                <td align="center" bgcolor="#f4eefc" style="padding:24px 32px;border-bottom:1px solid #e9ddf7;">
                  <img src="${LOGO_URL}" alt="뷰티앤잡" height="30" style="display:block;border:0;height:30px;" />
                </td>
              </tr>
              <tr>
                <td style="padding:30px 28px 8px;">
                  <p style="font-size:19px;font-weight:700;color:#1a1a1a;margin:0 0 22px;line-height:1.45;">${heading}</p>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    ${cardsHtml}
                  </table>
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:16px auto 28px;">
                    <tr><td align="center" bgcolor="#5f0080" style="border-radius:8px;">
                      <a href="${SITE_URL}/jobs" style="display:inline-block;padding:13px 34px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">공고 더 보러 가기</a>
                    </td></tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td bgcolor="#f6f3fb" style="padding:20px 28px;">
                  <p style="font-size:12px;color:#888780;margin:0 0 6px;line-height:1.6;">뷰티앤잡은 회원님의 메일함을 존중합니다.<br/>이 메일은 광고성 정보 수신에 동의하신 분께 발송되었습니다.</p>
                  <p style="font-size:12px;color:#888780;margin:0;">
                    뷰티앤잡 · <a href="${SITE_URL}" style="color:#888780;text-decoration:none;">${SITE_HOST}</a><br/>
                    <a href="${unsubscribeUrl}" style="color:#8b5cf6;text-decoration:none;">추천 메일 수신거부</a> &nbsp;·&nbsp; © 2026 뷰티앤잡
                  </p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </div>
    `,
  });
}export async function sendNewsletterEmail(to: string, subject: string, html: string) {
  return resend.emails.send({
    from: FROM,
    to,
    subject,
    html,
  });
}
  