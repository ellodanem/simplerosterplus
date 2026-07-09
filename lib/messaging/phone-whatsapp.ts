/** Normalize a stored contact number to E.164 for Twilio WhatsApp (`whatsapp:+...`). */
export function toWhatsappAddress(contactNumber: string): string | null {
  const raw = contactNumber.trim();
  if (!raw) return null;

  let digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) {
    digits = "+" + digits.slice(1).replace(/\D/g, "");
  } else {
    digits = digits.replace(/\D/g, "");
    if (digits.length === 10) digits = `1${digits}`;
    if (digits.length >= 10) digits = `+${digits}`;
    else return null;
  }

  if (!/^\+\d{10,15}$/.test(digits)) return null;
  return `whatsapp:${digits}`;
}
