import { createAdminClient } from "@/lib/supabase/admin";
import { isPayPalConfigured, serverEnv } from "@/lib/env";
import { CaptureOrderSchema, formatZodError } from "@/lib/validation";
import { fail, ok, toApiError } from "@/lib/api";
import { lookupByToken } from "@/lib/share";
import { captureOrder, getOrder, verifyCapture, PayPalError } from "@/lib/paypal";
import type { PaymentRow } from "@/lib/types";

/** POST /api/checkout/capture — capture + verify, then mark proposal paid. */
export async function POST(request: Request) {
  try {
    if (!isPayPalConfigured()) {
      return fail(
        "Checkout is not configured. The freelancer must set PayPal Sandbox credentials on the server.",
        503,
      );
    }
    void serverEnv.paypalEnv; // getter throws unless sandbox — enforced before any PayPal call
    const body: unknown = await request.json().catch(() => null);
    const parsed = CaptureOrderSchema.safeParse(body);
    if (!parsed.success)
      return fail("Invalid capture request.", 422, formatZodError(parsed.error));

    const found = await lookupByToken(parsed.data.token);
    if (found instanceof Response) return found;
    const { proposal, version } = found;

    const admin = createAdminClient();
    const { data: payment } = await admin
      .from("payments")
      .select("*")
      .eq("paypal_order_id", parsed.data.order_id)
      .eq("proposal_id", proposal.id)
      .single();
    if (!payment) return fail("Order not recognized for this proposal.", 404);
    const row = payment as PaymentRow;

    // Idempotent: already captured → report verified state, no duplicate work.
    if (row.status === "captured") {
      return ok({
        status: "captured",
        capture_id: row.paypal_capture_id,
        amount: row.amount,
        currency: row.currency,
      });
    }
    if (row.status === "superseded") {
      return fail(
        "This checkout session was superseded — the freelancer edited the proposal. Please ask for a fresh link.",
        409,
      );
    }

    let order;
    try {
      order = await captureOrder(row.paypal_order_id, crypto.randomUUID());
    } catch (error) {
      if (error instanceof PayPalError && error.status === 409) {
        // Already captured at PayPal (retry race) → reconcile from source of truth.
        order = await getOrder(row.paypal_order_id);
      } else {
        throw error;
      }
    }

    const verified = verifyCapture(order, {
      amount: Number(version.price),
      currency: version.currency,
      merchantEmail: serverEnv.paypalMerchantEmail || undefined,
    });

    const captureStatus = (verified.captureStatus ?? verified.orderStatus ?? "").toUpperCase();
    if (verified.orderStatus === "COMPLETED" || captureStatus === "COMPLETED") {
      await admin
        .from("payments")
        .update({
          paypal_capture_id: verified.captureId,
          status: "captured",
        })
        .eq("id", row.id);
      await admin
        .from("proposals")
        .update({ status: "paid" })
        .eq("id", proposal.id)
        .eq("status", "approved");
      await admin.from("activity_logs").insert({
        proposal_id: proposal.id,
        event: `payment_captured_${verified.captureId ?? verified.orderId}`,
      });
      return ok({
        status: "captured",
        capture_id: verified.captureId,
        amount: verified.amount,
        currency: verified.currency,
      });
    }
    if (captureStatus === "PENDING" || verified.orderStatus === "APPROVED") {
      await admin
        .from("payments")
        .update({ paypal_capture_id: verified.captureId, status: "pending" })
        .eq("id", row.id);
      return ok({ status: "pending", amount: verified.amount, currency: verified.currency });
    }
    await admin.from("payments").update({ status: "failed" }).eq("id", row.id);
    return fail("The payment was not completed. No charge was verified.", 402);
  } catch (error) {
    if (error instanceof PayPalError) return fail(error.message, error.status);
    return toApiError(error);
  }
}
