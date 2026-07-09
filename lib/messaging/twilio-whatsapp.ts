import Twilio from "twilio";

export type TwilioWhatsappConfig = {
  accountSid: string;
  authToken: string;
  from: string;
  rosterContentSid: string | null;
};

export function getTwilioWhatsappConfig(): TwilioWhatsappConfig | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  if (!accountSid || !authToken || !from) return null;

  const normalizedFrom = from.startsWith("whatsapp:") ? from : `whatsapp:${from.replace(/\s/g, "")}`;
  const rosterContentSid = process.env.TWILIO_WHATSAPP_ROSTER_CONTENT_SID?.trim() || null;

  return { accountSid, authToken, from: normalizedFrom, rosterContentSid };
}

export function twilioWhatsappConfigured(): boolean {
  return getTwilioWhatsappConfig() !== null;
}

export type SendWhatsappTemplateInput = {
  to: string;
  contentSid: string;
  contentVariables: Record<string, string>;
};

export type SendWhatsappTemplateResult =
  | { ok: true; sid: string }
  | { ok: false; error: string };

export async function sendWhatsappTemplate(
  input: SendWhatsappTemplateInput,
): Promise<SendWhatsappTemplateResult> {
  const config = getTwilioWhatsappConfig();
  if (!config) {
    return { ok: false, error: "Twilio WhatsApp is not configured." };
  }

  const client = Twilio(config.accountSid, config.authToken);

  try {
    const msg = await client.messages.create({
      from: config.from,
      to: input.to,
      contentSid: input.contentSid,
      contentVariables: JSON.stringify(input.contentVariables),
    });
    return { ok: true, sid: msg.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Twilio send failed";
    return { ok: false, error: message };
  }
}
