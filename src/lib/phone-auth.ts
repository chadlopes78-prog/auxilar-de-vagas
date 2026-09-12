export const PHONE_EMAIL_DOMAIN = "phone.auxilar.app";

export const COUNTRY_DIALS = [
  { code: "MZ", dial: "258", label: "Moçambique", flag: "🇲🇿" },
  { code: "AO", dial: "244", label: "Angola", flag: "🇦🇴" },
  { code: "PT", dial: "351", label: "Portugal", flag: "🇵🇹" },
  { code: "ZA", dial: "27", label: "África do Sul", flag: "🇿🇦" },
  { code: "BR", dial: "55", label: "Brasil", flag: "🇧🇷" },
  { code: "ZW", dial: "263", label: "Zimbabwe", flag: "🇿🇼" },
  { code: "MW", dial: "265", label: "Malawi", flag: "🇲🇼" },
  { code: "TZ", dial: "255", label: "Tanzânia", flag: "🇹🇿" },
] as const;

export function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

export function toE164(dial: string, national: string) {
  let local = onlyDigits(national);
  const cc = onlyDigits(dial);
  if (local.startsWith("0")) local = local.slice(1);
  if (local.startsWith(cc)) return `+${local}`;
  return `+${cc}${local}`;
}

export function phoneToAuthEmail(dial: string, national: string) {
  const e164 = toE164(dial, national);
  return `${onlyDigits(e164)}@${PHONE_EMAIL_DOMAIN}`;
}

export function isPhoneAuthEmail(email: string | null | undefined) {
  return (email ?? "").toLowerCase().endsWith(`@${PHONE_EMAIL_DOMAIN}`);
}

export function identifierToAuthEmail(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  if (value.includes("@")) return value.toLowerCase();
  const digits = onlyDigits(value);
  if (digits.length < 8) return value.toLowerCase();
  const known = COUNTRY_DIALS.some((c) => digits.startsWith(c.dial) && digits.length >= c.dial.length + 7);
  const full = known ? digits : `258${digits.replace(/^0/, "")}`;
  return `${full}@${PHONE_EMAIL_DOMAIN}`;
}

export function displayPhone(e164: string) {
  return e164.startsWith("+") ? e164 : `+${onlyDigits(e164)}`;
}
