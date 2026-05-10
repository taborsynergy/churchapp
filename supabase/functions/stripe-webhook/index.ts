import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

// No CORS headers — this endpoint is called server-to-server by Stripe, never from a browser.
const jsonHeaders = { "Content-Type": "application/json" };

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: jsonHeaders,
    });
  }

  try {
    // Each church registers: https://<project>.supabase.co/functions/v1/stripe-webhook?church_id=<uuid>
    const url = new URL(req.url);
    const churchId = url.searchParams.get("church_id");

    if (!churchId) {
      return new Response(JSON.stringify({ error: "Missing church_id query parameter." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Fetch this church's Stripe keys
    const { data: keys } = await serviceClient
      .from("church_payment_keys")
      .select("stripe_secret_key, stripe_webhook_secret")
      .eq("church_id", churchId)
      .maybeSingle();

    if (!keys?.stripe_secret_key || !keys?.stripe_webhook_secret) {
      return new Response(JSON.stringify({ error: "Stripe not configured for this church." }), {
        status: 503,
        headers: jsonHeaders,
      });
    }

    const stripe = new Stripe(keys.stripe_secret_key, { apiVersion: "2024-06-20" });
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return new Response(JSON.stringify({ error: "Missing stripe-signature header." }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const body = await req.text();

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, keys.stripe_webhook_secret);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Webhook signature verification failed";
      return new Response(JSON.stringify({ error: msg }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await serviceClient
          .from("donations")
          .update({ status: "completed", stripe_payment_id: session.payment_intent as string ?? "" })
          .eq("stripe_session_id", session.id);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await serviceClient
          .from("donations")
          .update({ status: "failed" })
          .eq("stripe_session_id", session.id);
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        await serviceClient
          .from("donations")
          .update({ status: "failed" })
          .eq("stripe_payment_id", intent.id);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : "";
        if (paymentIntentId) {
          await serviceClient
            .from("donations")
            .update({ status: "refunded" })
            .eq("stripe_payment_id", paymentIntentId);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        if (subscription.status === "active") {
          await serviceClient
            .from("donations")
            .update({ status: "completed" })
            .eq("stripe_session_id", subscription.metadata?.session_id ?? "___no_match___");
        }
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), { headers: jsonHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
