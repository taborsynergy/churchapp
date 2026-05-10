import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Resolve the authenticated user from the Bearer token
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return new Response(JSON.stringify({ error: "Authentication required to process donations." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: { user } } = await anonClient.auth.getUser(token);

    if (!user?.id) {
      return new Response(JSON.stringify({ error: "Invalid or expired session." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up this user's church
    const { data: churchUser } = await serviceClient
      .from("church_users")
      .select("church_id")
      .eq("id", user.id)
      .maybeSingle();

    const churchId = churchUser?.church_id;
    if (!churchId) {
      return new Response(JSON.stringify({ error: "Church not found. Complete onboarding first." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch this church's Stripe keys
    const { data: keys } = await serviceClient
      .from("church_payment_keys")
      .select("stripe_secret_key")
      .eq("church_id", churchId)
      .maybeSingle();

    if (!keys?.stripe_secret_key) {
      return new Response(
        JSON.stringify({ error: "Stripe is not configured for this church. Ask your admin to add payment keys in Settings." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const stripe = new Stripe(keys.stripe_secret_key, { apiVersion: "2024-06-20" });

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { amount, fund_id, fund_name, payment_type, donor_name, donor_email, success_url, cancel_url } = body;

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

    const resolvedFundId = typeof fund_id === "string" && fund_id.length > 0 ? fund_id : null;
    if (resolvedFundId) {
      const { data: fund, error: fundError } = await serviceClient
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
      : `${allowedOrigin}/give?success=true`;
    const resolvedCancelUrl = typeof cancel_url === "string" && isSafeRedirectUrl(cancel_url)
      ? cancel_url
      : `${allowedOrigin}/give`;

    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Donation to ${sanitizedFundName}`,
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
        user_id: user.id,
        church_id: churchId,
      },
    };

    const session = await stripe.checkout.sessions.create(sessionConfig);

    await serviceClient.from("donations").insert({
      user_id: user.id,
      fund_id: resolvedFundId,
      church_id: churchId,
      amount: amount / 100,
      stripe_session_id: session.id,
      payment_type: payment_type as string,
      status: "pending",
      donor_name: sanitizedDonorName,
      donor_email: sanitizedDonorEmail ?? "",
      currency: "USD",
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
