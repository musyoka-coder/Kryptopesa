// Shared helper for talking to Safaricom's Daraja API.
// Sandbox base URL — swap to https://api.safaricom.co.ke when you move to production.
const DARAJA_BASE_URL = Deno.env.get("DARAJA_BASE_URL") ?? "https://sandbox.safaricom.co.ke";

interface DarajaTokenResponse {
  access_token: string;
  expires_in: string;
}

/**
 * Requests a fresh OAuth token from Daraja. Tokens are short-lived (~1hr on
 * sandbox), so for a low-volume academic project it's simplest and most
 * reliable to fetch a new one per payout rather than caching across
 * invocations (Edge Functions don't guarantee a warm instance between calls).
 */
export async function getDarajaToken(): Promise<string> {
  const consumerKey = Deno.env.get("DARAJA_CONSUMER_KEY");
  const consumerSecret = Deno.env.get("DARAJA_CONSUMER_SECRET");

  if (!consumerKey || !consumerSecret) {
    throw new Error("Missing DARAJA_CONSUMER_KEY or DARAJA_CONSUMER_SECRET secret");
  }

  const credentials = btoa(`${consumerKey}:${consumerSecret}`);

  const res = await fetch(`${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${credentials}` },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Daraja OAuth failed (${res.status}): ${body}`);
  }

  const data: DarajaTokenResponse = await res.json();
  return data.access_token;
}

export interface B2CPayoutParams {
  phoneNumber: string; // 2547XXXXXXXX
  amountKes: number;
  originatorConversationId: string; // your own correlation id, e.g. the payout row's uuid
  remarks: string;
  occasion?: string;
}

export interface B2CInitiateResult {
  ConversationID: string;
  OriginatorConversationID: string;
  ResponseCode: string;
  ResponseDescription: string;
}

/**
 * Kicks off a B2C payout. This only returns Daraja's acknowledgement that
 * the request was accepted for processing — the actual success/failure
 * comes later, asynchronously, to the ResultURL callback.
 */
export async function initiateB2CPayout(params: B2CPayoutParams): Promise<B2CInitiateResult> {
  const token = await getDarajaToken();

  const shortcode = Deno.env.get("DARAJA_B2C_SHORTCODE");
  const initiatorName = Deno.env.get("DARAJA_INITIATOR_NAME");
  const securityCredential = Deno.env.get("DARAJA_SECURITY_CREDENTIAL");
  const resultUrl = Deno.env.get("DARAJA_RESULT_URL");
  const timeoutUrl = Deno.env.get("DARAJA_TIMEOUT_URL");

  if (!shortcode || !initiatorName || !securityCredential || !resultUrl || !timeoutUrl) {
    throw new Error(
      "Missing one of: DARAJA_B2C_SHORTCODE, DARAJA_INITIATOR_NAME, DARAJA_SECURITY_CREDENTIAL, DARAJA_RESULT_URL, DARAJA_TIMEOUT_URL"
    );
  }

  const body = {
    OriginatorConversationID: params.originatorConversationId,
    InitiatorName: initiatorName,
    SecurityCredential: securityCredential,
    CommandID: "BusinessPayment", // sandbox-friendly; production may use SalaryPayment/PromotionPayment per your paybill agreement
    Amount: Math.round(params.amountKes),
    PartyA: shortcode,
    PartyB: params.phoneNumber,
    Remarks: params.remarks.slice(0, 100),
    QueueTimeOutURL: timeoutUrl,
    ResultURL: resultUrl,
    Occasion: (params.occasion ?? "").slice(0, 100),
  };

  const res = await fetch(`${DARAJA_BASE_URL}/mpesa/b2c/v1/paymentrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Daraja B2C request failed (${res.status}): ${JSON.stringify(data)}`);
  }

  return data as B2CInitiateResult;
}

/** Normalizes local (07...) or +254 numbers to Daraja's expected 2547XXXXXXXX format. */
export function normalizePhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `254${digits}`;
  throw new Error(`Unrecognized phone number format: ${raw}`);
}
