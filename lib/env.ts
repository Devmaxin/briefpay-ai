/**
 * Server-side environment validation.
 * Never import this module from client components.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable ${name}. See .env.example and README setup instructions.`,
    );
  }
  return value;
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const serverEnv = {
  get supabaseUrl(): string {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabasePublishableKey(): string {
    return required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  },
  get supabaseServiceRoleKey(): string {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get groqApiKey(): string {
    return required("GROQ_API_KEY");
  },
  get groqModel(): string {
    return optional("GROQ_MODEL", "llama-3.3-70b-versatile");
  },
  get paypalClientId(): string {
    return required("PAYPAL_CLIENT_ID");
  },
  get paypalClientSecret(): string {
    return required("PAYPAL_CLIENT_SECRET");
  },
  get paypalEnv(): "sandbox" {
    const env = optional("PAYPAL_ENV", "sandbox");
    if (env !== "sandbox") {
      throw new Error(
        "PAYPAL_ENV must be 'sandbox' for this hackathon MVP. Live payments are not enabled.",
      );
    }
    return "sandbox";
  },
  get paypalMerchantEmail(): string {
    return optional("PAYPAL_MERCHANT_EMAIL");
  },
};

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  paypalClientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "",
};

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function isGroqConfigured(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

export function isPayPalConfigured(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET,
  );
}
