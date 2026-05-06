import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

// Restrict to the app's own origin. SITE_URL must be set in the Supabase
// project's edge-function secrets (e.g. https://gracecommunity.church).
const allowedOrigin = Deno.env.get("SITE_URL") ?? "";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
  ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
};

const ALLOWED_PAYMENT_TYPES = ["one_time", "recurring"];
const MAX_AMOUNT_CENTS = 100_000_00;
const MIN_AMOUNT_CENTS = 100;

function isSafeRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function sanitizeText(value: unknown, maxLen = 200): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response(
        JSON.stringify({ error: "Payment processing is not available." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amount, fund_id, fund_name, payment_type, donor_name, donor_email, user_id, success_url, cancel_url } = body;

    if (typeof amount !== "number" || !Number.isInteger(amount) || amount < MIN_AMOUNT_CENTS || amount > MAX_AMOUNT_CENTS) {
      return new Response(JSON.stringify({ error: "Invalid amount. Must be between $1 and $100,000." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_PAYMENT_TYPES.includes(payment_type as string)) {
      return new Response(JSON.stringify({ error: "Invalid payment type." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitizedFundName = sanitizeText(fund_name) || "General Fund";
    const sanitizedDonorName = sanitizeText(donor_name, 100);
    const sanitizedDonorEmail = typeof donor_email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(donor_email)
      ? donor_email.trim().slice(0, 254)
      : undefined;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const resolvedFundId = typeof fund_id === "string" && fund_id.length > 0 ? fund_id : null;
    if (resolvedFundId) {
      const { data: fund, error: fundError } = await supabase
        .from("giving_funds")
        .select("id, name, is_active")
        .eq("id", resolvedFundId)
        .eq("is_active", true)
        .maybeSingle();

      if (fundError || !fund) {
        return new Response(JSON.stringify({ error: "Invalid or inactive fund." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const resolvedSuccessUrl = typeof success_url === "string" && isSafeRedirectUrl(success_url)
      ? success_url
      : "https://example.com/give?success=true";
    const resolvedCancelUrl = typeof cancel_url === "string" && isSafeRedirectUrl(cancel_url)
      ? cancel_url
      : "https://example.com/give";

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Donation to ${sanitizedFundName}`,
              description: `Grace Community Church — ${sanitizedFundName}`,
            },
            unit_amount: amount,
            ...(payment_type === "recurring" ? { recurring: { interval: "month" } } : {}),
          },
          quantity: 1,
        },
      ],
      mode: payment_type === "recurring" ? "subscription" : "payment",
      success_url: resolvedSuccessUrl,
      cancel_url: resolvedCancelUrl,
      customer_email: sanitizedDonorEmail,
      metadata: {
        fund_id: resolvedFundId ?? "",
        fund_name: sanitizedFundName,
        donor_name: sanitizedDonorName,
        user_id: typeof user_id === "string" ? user_id.slice(0, 36) : "",
      },
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    await supabase.from("donations").insert({
      user_id: typeof user_id === "string" && user_id.length > 0 ? user_id : null,
      fund_id: resolvedFundId,
      amount: amount / 100,
      stripe_session_id: session.id,
      payment_type: payment_type as string,
      status: "pending",
      donor_name: sanitizedDonorName,
      donor_email: sanitizedDonorEmail ?? "",
    });

    return new Response(
      JSON.stringify({ url: session.url, session_id: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
