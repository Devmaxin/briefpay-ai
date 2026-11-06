"use client";

import { useState } from "react";
import { AcceptanceForm } from "@/components/acceptance-form";
import { CheckoutPanel } from "@/components/checkout-panel";
import { publicEnv } from "@/lib/env";

interface CheckoutFlowProps {
  token: string;
  amount: number;
  currency: string;
  /** True when the proposal already has a recorded acceptance. */
  accepted?: boolean;
}

/**
 * Manages the client-side payment flow:
 * 1. Client accepts the proposal (AcceptanceForm)
 * 2. Client pays via PayPal Sandbox (CheckoutPanel)
 *
 * No authentication is required — authorization is the share token plus
 * an approved, non-revoked proposal.
 */
export function CheckoutFlow({
  token,
  amount,
  currency,
  accepted: initiallyAccepted = false,
}: CheckoutFlowProps) {
  const [accepted, setAccepted] = useState(initiallyAccepted);

  if (accepted) {
    return (
      <CheckoutPanel
        token={token}
        amount={amount}
        currency={currency}
        clientId={publicEnv.paypalClientId}
        proposalPaid={false}
      />
    );
  }

  return (
    <AcceptanceForm
      token={token}
      amount={amount}
      currency={currency}
      onAccept={() => setAccepted(true)}
    />
  );
}
