import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

// Stripe requires a 2xx quickly, and a non-2xx makes it retry.
// So: verify, do the work, and always answer 200 unless the signature is bad.

function ok(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

// --- Supabase REST helpers (service role: bypasses RLS) --------------------
function restHeaders(key: string, extra: Record<string, string> = {}) {
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...extra,
  };
}

async function insertPurchase(
  url: string,
  key: string,
  row: Record<string, unknown>,
) {
  // stripe_session_id is unique, so a replayed event is ignored rather than
  // creating a second purchase.
  const res = await fetch(
    `${url}/rest/v1/course_purchases?on_conflict=stripe_session_id`,
    {
      method: "POST",
      headers: restHeaders(key, { Prefer: "resolution=ignore-duplicates" }),
      body: JSON.stringify(row),
    },
  );
  if (!res.ok) console.error("insertPurchase failed", res.status, await res.text());
  return res.ok;
}

async function upsertSubscription(
  url: string,
  key: string,
  row: Record<string, unknown>,
) {
  // user_id is unique, so this inserts a first subscription and updates an
  // existing one - including a customer who cancelled and came back with a
  // new Stripe subscription id.
  const res = await fetch(`${url}/rest/v1/subscriptions?on_conflict=user_id`, {
    method: "POST",
    headers: restHeaders(key, { Prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify({ ...row, updated_at: new Date().toISOString() }),
  });
  if (!res.ok) console.error("subscription upsert failed", res.status, await res.text());
  return res.ok;
}

// Newer Stripe API versions moved current_period_end onto the subscription
// item, so check both places.
function periodEnd(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as { current_period_end?: number } | undefined;
  const secs = item?.current_period_end ?? (sub as unknown as { current_period_end?: number }).current_period_end;
  return secs ? new Date(secs * 1000).toISOString() : null;
}

export const Route = createFileRoute("/api/stripe-webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const secret = process.env.STRIPE_SECRET_KEY;
        const whsec = process.env.STRIPE_WEBHOOK_SECRET;
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!secret || !whsec || !supabaseUrl || !serviceKey) {
          console.error("webhook missing settings");
          return ok({ error: "Server is missing settings." }, 500);
        }

        const sig = request.headers.get("stripe-signature");
        if (!sig) return ok({ error: "No signature." }, 400);

        const raw = await request.text();

        const stripe = new Stripe(secret, {
          httpClient: Stripe.createFetchHttpClient(),
        });

        let event: Stripe.Event;
        try {
          event = await stripe.webhooks.constructEventAsync(
            raw,
            sig,
            whsec,
            undefined,
            Stripe.createSubtleCryptoProvider(),
          );
        } catch (err) {
          console.error("bad signature", err);
          return ok({ error: "Bad signature." }, 400);
        }

        try {
          switch (event.type) {
            case "checkout.session.completed": {
              const s = event.data.object as Stripe.Checkout.Session;
              const meta = s.metadata ?? {};
              const userId = meta.user_id ?? s.client_reference_id ?? null;

              if (!userId) {
                console.error("no user_id on session", s.id);
                break;
              }

              if (s.mode === "payment") {
                const kind = meta.kind;
                await insertPurchase(supabaseUrl, serviceKey, {
                  user_id: userId,
                  course_id: kind === "bundle" ? null : (meta.course_id ?? null),
                  is_bundle: kind === "bundle",
                  amount_cents: s.amount_total ?? 0,
                  stripe_session_id: s.id,
                });
              } else if (s.mode === "subscription" && s.subscription) {
                const subId =
                  typeof s.subscription === "string" ? s.subscription : s.subscription.id;
                const sub = await stripe.subscriptions.retrieve(subId);
                await upsertSubscription(supabaseUrl, serviceKey, {
                  user_id: userId,
                  stripe_customer_id:
                    typeof s.customer === "string" ? s.customer : (s.customer?.id ?? null),
                  stripe_subscription_id: sub.id,
                  status: sub.status,
                  price_id: sub.items.data[0]?.price?.id ?? null,
                  current_period_end: periodEnd(sub),
                });
              }
              break;
            }

            case "customer.subscription.created":
            case "customer.subscription.updated":
            case "customer.subscription.deleted": {
              const sub = event.data.object as Stripe.Subscription;
              const userId = sub.metadata?.user_id;
              if (!userId) {
                console.error("no user_id on subscription", sub.id);
                break;
              }
              await upsertSubscription(supabaseUrl, serviceKey, {
                user_id: userId,
                stripe_customer_id:
                  typeof sub.customer === "string" ? sub.customer : (sub.customer?.id ?? null),
                stripe_subscription_id: sub.id,
                status: sub.status,
                price_id: sub.items.data[0]?.price?.id ?? null,
                current_period_end: periodEnd(sub),
              });
              break;
            }

            default:
              break;
          }
        } catch (err) {
          console.error("webhook handler error", event.type, err);
          // Still 200: Stripe would otherwise retry forever on a bug of ours.
        }

        return ok({ received: true });
      },
    },
  },
});
