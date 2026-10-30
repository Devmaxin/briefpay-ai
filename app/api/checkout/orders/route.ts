import { createAdminClient } from "@/lib/supabase/admin";
import { isPayPalConfigured, serverEnv } from "@/lib/env";
import { CreateOrderSchema, formatZodError } from "@/lib/validation";
import { fail, ok, toApiError } from "@/lib/api";
import { lookupByToken } from "@/lib/share";
import { createOrder, getOrder, PayPalError } from "@/lib/paypal";
import type { PaymentRow } from "@/lib/types";

/** POST /api/checkout/orders — create a Sandbox order for the approved version. */
export async function POST(request: Request) {
  try {
    if (!isPayPalConfigured()) {
      return fail(
        "Checkout is not configured. The freelancer must set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET on the server.",
        503,
      );
    }
    void serverEnv.paypalEnv; // getter throws unless sandbox — enforced before any PayPal call
    const body: unknown = await request.json().catch(() => null);
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success)
      return fail("Invalid checkout request.", 422, formatZodError(parsed.error));

    const found = await lookupByToken(parsed.data.token);
    if (found instanceof Response) return found;
    const { proposal, version } = found;
    if (proposal.status === "paid")
      return fail("This proposal has already been paid.", 409);

    const admin = createAdminClient();
    // Idempotency: reuse an existing open order for this version if present.
    const { data: existing } = await admin
      .from("payments")
      .select("*")
      .eq("proposal_id", proposal.id)
      .eq("version_id", version.id)
      .eq("status", "created")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (existing) {
      const row = existing as PaymentRow;
      try {
        const live = await getOrder(row.paypal_order_id);
        if (["CREATED", "APPROVED", "SAVED"].includes(live.status)) {
          return ok({
            order_id: row.paypal_order_id,
            amount: row.amount,
            currency: row.currency,
          });
        }
      } catch {
        // Stale order — mark failed and create a fresh one below.
        await admin.from("payments").update({ status: "failed" }).eq("id", row.id);
      }
    }

    const requestId = crypto.randomUUID();
    const order = await createOrder({
      proposalId: proposal.id,
      amount: Number(version.price),
      currency: version.currency,
      requestId,
      returnToken: parsed.data.token,
    });

    await admin.from("payments").insert({
      proposal_id: proposal.id,
      version_id: version.id,
      paypal_order_id: order.id,
      amount: Number(version.price),
      currency: version.currency,
      status: "created",
      request_id: requestId,
    });
    return ok({
      order_id: order.id,
      amount: Number(version.price),
      currency: version.currency,
    });
  } catch (error) {
    if (error instanceof PayPalError) return fail(error.message, error.status);
    return toApiError(error);
  }
}
