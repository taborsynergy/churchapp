const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://app.taborsynergy.com';

// ── PayPal SaaS subscription email templates ──────────────────────────────────

export function subscriptionActivatedHtml(
  churchName: string,
  plan: string,
  expiresAt: string
): string {
  const expiry = new Date(expiresAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  return `
    <p>Hi ${churchName} team 👋</p>
    <p>Your <strong>ChurchConnect ${plan}</strong> subscription is now <strong>active</strong>!</p>
    <p>Your plan renews on <strong>${expiry}</strong>. You can manage your subscription anytime from your admin settings.</p>
    <p><a href="${base}/admin" style="background:#14b8a6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Go to Dashboard →</a></p>
    <p>Thank you for choosing ChurchConnect. We're honoured to serve your ministry.</p>
    ${footer}
  `;
}

export function subscriptionRenewedHtml(
  churchName: string,
  plan: string,
  nextBilling: string
): string {
  const next = new Date(nextBilling).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  return `
    <p>Hi ${churchName} team,</p>
    <p>Your <strong>ChurchConnect ${plan}</strong> subscription has been successfully renewed.</p>
    <p>Next billing date: <strong>${next}</strong></p>
    <p><a href="${base}/admin/settings" style="background:#14b8a6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Manage Subscription</a></p>
    ${footer}
  `;
}

export function subscriptionCancelledHtml(
  churchName: string,
  graceEndsAt: string
): string {
  const grace = new Date(graceEndsAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  return `
    <p>Hi ${churchName} team,</p>
    <p>Your ChurchConnect subscription has been cancelled.</p>
    <p>You still have access until <strong>${grace}</strong>. After that, your church data will be preserved but access will be restricted.</p>
    <p>Changed your mind? Reactivate anytime:</p>
    <p><a href="${base}/pricing" style="background:#14b8a6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Reactivate Subscription</a></p>
    ${footer}
  `;
}
const footer = `
  <hr style="margin:32px 0;border-color:#334155"/>
  <p style="color:#64748b;font-size:12px">
    ChurchConnect — Powered by <a href="https://taborsynergy.com" style="color:#14b8a6">Tabor Synergy</a><br/>
    admin@taborsynergy.com | taborsynergy.com
  </p>
`;

export function welcomeEmail(name: string, churchName: string) {
  return `
    <p>Hi ${name},</p>
    <p>Welcome to <strong>${churchName}</strong> on ChurchConnect! Your account is ready.</p>
    <p><a href="${base}/login" style="background:#14b8a6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Sign In Now</a></p>
    <p>If you have any questions, reply to this email or contact your church admin.</p>
    ${footer}
  `;
}

export function donationReceiptEmail(opts: {
  donorName: string;
  amount: string;
  currency: 'INR' | 'USD';
  fund: string;
  churchName: string;
  txnId: string;
  date: string;
}) {
  const symbol = opts.currency === 'INR' ? '₹' : '$';
  return `
    <p>Dear ${opts.donorName},</p>
    <p>Thank you for your generous donation to <strong>${opts.churchName}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:24px 0">
      <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #1e293b">Fund</td><td style="padding:8px;border-bottom:1px solid #1e293b">${opts.fund}</td></tr>
      <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #1e293b">Amount</td><td style="padding:8px;border-bottom:1px solid #1e293b"><strong>${symbol}${opts.amount}</strong></td></tr>
      <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #1e293b">Date</td><td style="padding:8px;border-bottom:1px solid #1e293b">${opts.date}</td></tr>
      <tr><td style="padding:8px;color:#64748b">Transaction ID</td><td style="padding:8px;font-family:monospace;font-size:12px">${opts.txnId}</td></tr>
    </table>
    <p>This is your official donation receipt. Please keep it for your records.</p>
    ${footer}
  `;
}

export function eventReminderEmail(opts: {
  name: string;
  eventTitle: string;
  eventDate: string;
  location: string;
  churchName: string;
  eventUrl: string;
}) {
  return `
    <p>Hi ${opts.name},</p>
    <p>This is a reminder that you have RSVP'd for <strong>${opts.eventTitle}</strong> at <strong>${opts.churchName}</strong>.</p>
    <p><strong>When:</strong> ${opts.eventDate}<br/><strong>Where:</strong> ${opts.location}</p>
    <p><a href="${opts.eventUrl}" style="background:#14b8a6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">View Event</a></p>
    ${footer}
  `;
}

export function passwordResetEmail(link: string) {
  return `
    <p>You requested a password reset for your ChurchConnect account.</p>
    <p><a href="${link}" style="background:#14b8a6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a></p>
    <p>This link expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
    ${footer}
  `;
}

export function licenseActivatedEmail(churchName: string, plan: string, expiresAt: string) {
  return `
    <p>Your ChurchConnect <strong>${plan}</strong> licence for <strong>${churchName}</strong> is now active.</p>
    <p><strong>Valid until:</strong> ${expiresAt}</p>
    <p><a href="${base}/dashboard" style="background:#14b8a6;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">Go to Dashboard</a></p>
    ${footer}
  `;
}
