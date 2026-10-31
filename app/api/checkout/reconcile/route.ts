import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fail, ok, requireUser, toApiError } from "@/lib/api";
import { getOrder, verifyCapture, PayPalError } from "@/lib/paypal";
import type { PaymentRow } from "@/lib/types";

interface PendingPayment extends PaymentRow {
  proposals: { owner_id: string; status: string } | null;
}

/**
 * POST /api/checkout/reconcile — reconcile pending/created payments against PayPal.
 *
 * Requires the freelancer's session. Finds payments in "pending" or "created"
 * status for the freelancer's proposals and re-checks them against PayPal.
 * Used to resolve uncertain outcomes (e.g. network timeout during capture).
 *
 * Safe to call repeatedly — idempotent.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const auth = await requireUser();
    if (auth.response) return auth.response;
    const { user } = auth;

    const body: unknown = await request.json().catch(() => null);
    const { order_id } = (body as { order_id?: string } | null) ?? {};

    const admin = createAdminClient();

    // Build the query: pending/created payments for this freelancer's proposals.
    let query = admin
      .from("payments")
      .select("*, proposals!inner(owner_id, status)")
      .in("status", ["created", "pending"])
      .eq("proposals.owner_id", user.id);

    if (order_id) {
      query = query.eq("paypal_order_id", order_id);
    }

    const { data: payments, error } = await query;
    if (error) return fail("Could not load payments for reconciliation.", 500);

    const rows = ((payments ?? []) as unknown as PendingPayment[]).filter(
      (row) => row.proposals?.owner_id === user.id,
    );

    const results = await Promise.allSettled(
      rows.map(async (row: PendingPayment) => {
        let order;
        try {
          order = await getOrder(row.paypal_order_id);
        } catch {
          return {
            order_id: row.paypal_order_id,
            error: "Could not reach PayPal.",
            status: row.status,
          };
        }

        try {
          const verified = verifyCapture(order, {
            amount: Number(row.amount),
            currency: row.currency,
          });

          const captureStatus = (verified.captureStatus ?? verified.orderStatus ?? "").toUpperCase();

          if (
            verified.orderStatus === "COMPLETED" ||
            captureStatus === "COMPLETED"
          ) {
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
              .eq("id", row.proposal_id)
              .eq("status", "approved");
            await admin.from("activity_logs").insert({
              proposal_id: row.proposal_id,
              event: `payment_reconciled_captured_${verified.captureId ?? verified.orderId}`,
            });
            return {
              order_id: row.paypal_order_id,
              status: "captured",
              capture_id: verified.captureId,
            };
          }

          if (
            captureStatus === "PENDING" ||
            verified.orderStatus === "APPROVED"
          ) {
            await admin
              .from("payments")
              .update({
                paypal_capture_id: verified.captureId,
                status: "pending",
              })
              .eq("id", row.id);
            return {
              order_id: row.paypal_order_id,
              status: "pending",
            };
          }

          await admin.from("payments").update({ status: "failed" }).eq("id", row.id);
          return {
            order_id: row.paypal_order_id,
            status: "failed",
          };
        } catch (err) {
          if (err instanceof PayPalError && err.status === 409) {
            // Already captured at PayPal — reconcile from source of truth.
            try {
              order = await getOrder(row.paypal_order_id);
              const verified = verifyCapture(order, {
                amount: Number(row.amount),
                currency: row.currency,
              });
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
                .eq("id", row.proposal_id)
                .eq("status", "approved");
              return {
                order_id: row.paypal_order_id,
                status: "captured",
                capture_id: verified.captureId,
              };
            } catch (err2) {
              return {
                order_id: row.paypal_order_id,
                error: err2 instanceof Error ? err2.message : "Reconciliation failed.",
                status: row.status,
              };
            }
          }
          return {
            order_id: row.paypal_order_id,
            error: err instanceof Error ? err.message : "Reconciliation failed.",
            status: row.status,
          };
        }
      }),
    );

    const reconciledCount = results.reduce((n, r) => {
      if (r.status === "fulfilled" && !r.value.error) {
        return n + 1;
      }
      return n;
    }, 0);

    const failedCount = results.reduce((n, r) => {
      if (r.status === "rejected" || (r.status === "fulfilled" && r.value.error)) {
        return n + 1;
      }
      return n;
    }, 0);

    return ok({
      reconciled: reconciledCount,
      failed: failedCount,
      results: results.map((r) =>
        r.status === "fulfilled" ? r.value : { error: String(r.reason) },
      ),
    });
  } catch (error) {
    return toApiError(error);
  }
}
