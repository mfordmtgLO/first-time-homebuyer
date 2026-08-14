export type CoBrandedShareDraftInput = {
  agentName: string;
  agentEmail: string;
  url: string;
};

export function buildCoBrandedShareMailto({ agentName, agentEmail, url }: CoBrandedShareDraftInput) {
  const firstName = agentName.trim().split(/\s+/)[0] || "there";
  const subject = "Your co-branded First-Time Homebuyer lead-capture page";
  const body = `Hi ${firstName},

Here is your co-branded First-Time Homebuyer lead-capture page:
${url}

Your QR code is available in the dashboard beside this link. Please feel free to share the page and QR code on social media, by email, or by text.

If you would like, I can also help set up this co-branded page in my CRM for outreach to your current and past leads once we confirm the appropriate contact permissions. We can work together to cultivate and convert those leads into pre-approved buyers and send ready buyers right back to you.

Leads captured through your co-branded page remain associated with your profile, so we can stay coordinated as they move through their Roadmap Journey to Homeownership.

I look forward to our next deal together!

Mike Ford
Cornerstone First Mortgage
(541) 729-0819`;
  return `mailto:${agentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
