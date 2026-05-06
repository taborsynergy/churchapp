import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

// No CORS — Razorpay calls this server-to-server
const jsonHeaders = { "Content-Type": "application/json" };

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: jsonHeaders,
    });
  }

  const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (!webhookSecret) {
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 503, headers: jsonHeaders,
    });
  }

  const signature = req.headers.get("x-razorpay-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing signature" }), {
      status: 400, headers: jsonHeaders,
    });
  }

  const body = await req.text();

  // Verify HMAC-SHA256 signature
  const expected = createHmac("sha256", webhookSecret).update(body).digest("hex");
  if (signature !== expected) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400, headers: jsonHeaders,
    });
  }

  let event: Record<string, unknown>;
  try { event = JSON.parse(body); }
  catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400, headers: jsonHeaders,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const entity = (event.payload as any)?.payment?.entity ?? {};
    const orderId: string = entity.order_id ?? "";
    const paymentId: string = entity.id ?? "";

    switch (event.event) {
      case "payment.captured": {
        await supabase
          .from("donations")
          .update({ status: "completed", razorpay_payment_id: paymentId })
          .eq("razorpay_order_id", orderId);
        break;
      }
      case "payment.failed": {
        await supabase
          .from("donations")
          .update({ status: "failed" })
          .eq("razorpay_order_id", orderId);
        break;
      }
      case "refund.created": {
        const refundEntity = (event.payload as any)?.refund?.entity ?? {};
        const refundPaymentId: string = refundEntity.payment_id ?? "";
        if (refundPaymentId) {
          await supabase
            .from("donations")
            .update({ status: "refunded" })
            .eq("razorpay_payment_id", refundPaymentId);
        }
        break;
      }
      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), { headers: jsonHeaders });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: jsonHeaders,
    });
  }
});
