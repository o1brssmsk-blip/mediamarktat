export type WheelPrizeKind = "amount" | "message";

export interface WheelPrizeSegment {
  kind: WheelPrizeKind;
  text: string;
  selectionIndex: number;
  rotationIndex: number;
  amount: number | null;
  popupLines: readonly string[];
}

export const WHEEL_CURRENCY = "€";

export const WHEEL_PRIZES: readonly WheelPrizeSegment[] = [
  { kind: "amount", text: "€2,000", selectionIndex: 0, rotationIndex: 0, amount: 2000, popupLines: ["€ 2,000"] },
  { kind: "amount", text: "€2,500", selectionIndex: 1, rotationIndex: 1, amount: 2500, popupLines: ["€ 2,500"] },
  { kind: "amount", text: "€3,000", selectionIndex: 2, rotationIndex: 2, amount: 3000, popupLines: ["€ 3,000"] },
  { kind: "amount", text: "€3,500", selectionIndex: 3, rotationIndex: 3, amount: 3500, popupLines: ["€ 3,500"] },
  { kind: "amount", text: "€4,000", selectionIndex: 4, rotationIndex: 4, amount: 4000, popupLines: ["€ 4,000"] },
  { kind: "amount", text: "€5,000", selectionIndex: 5, rotationIndex: 5, amount: 5000, popupLines: ["€ 5,000"] },
  { kind: "message", text: "NOCHMAL", selectionIndex: 6, rotationIndex: 6, amount: null, popupLines: ["NOCH", "MAL"] },
  { kind: "message", text: "NAECHSTES MAL", selectionIndex: 7, rotationIndex: 7, amount: null, popupLines: ["BEIM", "NAECHSTEN", "MAL"] },
] as const;

export function getWheelPrizeByRotationIndex(idx: unknown): WheelPrizeSegment | null {
  if (typeof idx !== "number" || !Number.isFinite(idx)) return null;
  const norm = ((idx % WHEEL_PRIZES.length) + WHEEL_PRIZES.length) % WHEEL_PRIZES.length;
  return WHEEL_PRIZES[norm] ?? null;
}

export function getWheelPrizeByText(label: unknown): WheelPrizeSegment | null {
  if (typeof label !== "string" || !label.trim()) return null;
  const t = label.trim();
  return WHEEL_PRIZES.find((p) => p.text === t) ?? null;
}

export function getWheelPrizeByAmount(amt: unknown): WheelPrizeSegment | null {
  if (typeof amt !== "number" || !Number.isFinite(amt) || amt <= 0) return null;
  return WHEEL_PRIZES.find((p) => p.amount === amt) ?? null;
}

export interface ResolvedWheelPrize {
  amount: number;
  label: string;
  source: "rotationIndex" | "label" | "amount" | "rowAmount" | "none";
}

export function resolveWheelPrize(
  formData: Record<string, unknown> | null | undefined,
  rowAmount: number | null | undefined,
): ResolvedWheelPrize {
  // ⭐ 1. EN GUVENILIR KAYNAK: wheel_rotation_index (carkin tam olarak durdugu dilim)
  const fromRotation = getWheelPrizeByRotationIndex(formData?.wheel_rotation_index);
  if (fromRotation) {
    return {
      amount: fromRotation.amount ?? 0,
      label: fromRotation.text,
      source: "rotationIndex",
    };
  }

  // ⭐ 2. SONRAKI: wheel_result_label (dilimin text'i "AUD$4,500" gibi)
  const fromLabel = getWheelPrizeByText(formData?.wheel_result_label);
  if (fromLabel) {
    return {
      amount: fromLabel.amount ?? 0,
      label: fromLabel.text,
      source: "label",
    };
  }

  // ⭐ 3. SONRAKI: wheel_result_amount (dilimin miktari)
  const fromAmount = getWheelPrizeByAmount(formData?.wheel_result_amount);
  if (fromAmount) {
    return {
      amount: fromAmount.amount ?? 0,
      label: fromAmount.text,
      source: "amount",
    };
  }

  // ⭐ 4. Yedek: sessions.amount kolonu (admin duzenlemis olabilir, ama yine de prize ara)
  if (typeof rowAmount === "number" && Number.isFinite(rowAmount) && rowAmount > 0) {
    const fromRow = getWheelPrizeByAmount(rowAmount);
    if (fromRow) {
      return { amount: fromRow.amount ?? 0, label: fromRow.text, source: "rowAmount" };
    }
    // Prize listesinde yoksa (ornegin custom odul) dogrudan formatla
    return {
      amount: rowAmount,
      label: `${WHEEL_CURRENCY}${Number(rowAmount).toLocaleString("en-AU")}`,
      source: "rowAmount",
    };
  }

  return { amount: 0, label: "", source: "none" };
}
