// POST /mpesa-b2c-callback
// This is the public webhook Safaricom calls asynchronously after a B2C
// payout finishes (or times out). It must be deployed with JWT verification
// DISABLED (Daraja can't send your app's auth token) — lock it down instead
// by treating it as an untrusted input: validate the shape of the payload
// and only ever update rows that match a ConversationID you already issued.
//
// Deploy with:  supabase functions deploy mpesa-b2c-callback --no-verify-jwt
//
// Set this function's URL as both DARAJA_RESULT_URL and, for the timeout
// variant, DARAJA_TIMEOUT_URL on the initiate function's secrets — Daraja's
// payload shape differs slightly between a real result and a timeout, this
// handler accounts for both.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface DarajaResultParameter {
  Key: string;
  Value: string | number;
}

interface DarajaCallbackBody {
  Result?: {
    ResultType: number;
    ResultCode: number;
    ResultDesc: string;
    OriginatorConversationID: string;
    ConversationID: string;
    TransactionID?: string;
    ResultParameters?: { ResultParameter: DarajaResultParameter[] };
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  try {
    const body: DarajaCallbackBody = await req.json();
    const result = body.Result;

    if (!result?.ConversationID) {
      console.error("Malformed Daraja callback payload:", JSON.stringify(body));
      // Still return 200 — Daraja retries on non-2xx, and a malformed
      // payload won't fix itself on retry.
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    const isSuccess = result.ResultCode === 0;

    let mpesaReceiptNumber: string | null = null;
    if (isSuccess && result.ResultParameters?.ResultParameter) {
      const receiptParam = result.ResultParameters.ResultParameter.find(
        (p) => p.Key === "TransactionReceipt" || p.Key === "MpesaReceiptNumber" || p.Key === "TransactionID"
      );
      if (receiptParam) mpesaReceiptNumber = String(receiptParam.Value);
    }

    const { error: updateError } = await adminClient
      .from("mpesa_payouts")
      .update({
        status: isSuccess ? "completed" : "failed",
        mpesa_receipt_number: mpesaReceiptNumber,
        failure_reason: isSuccess ? null : result.ResultDesc,
        updated_at: new Date().toISOString(),
      })
      .eq("conversation_id", result.ConversationID);

    if (updateError) {
      console.error("Failed to update payout from callback:", updateError.message);
    }

    // TODO: if isSuccess is false, this is the point to reverse the
    // customer's internal crypto debit (or credit it back) so they aren't
    // left short after a failed disbursement.

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    console.error("mpesa-b2c-callback error:", err);
    // Return 200 anyway so Daraja doesn't hammer retries on a parse error —
    // the error is already logged for you to investigate.
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }
});
