import { createFileRoute } from "@tanstack/react-router";
import Stripe from "stripe";

// Live price IDs. Confirmed live 6 Oct 2026. Also in src/lib/stripe-prices.ts.
const PRICE_COURSE = "price_1UDsZz09n6Wx7JpJfeYRfpaN"; // $29.99 CAD, any one course
const PRICE_BUNDLE = "price_1UDtrl09n6Wx7JpJOWJWud3y"; // $149.99 CAD, all paid courses
const PRICE_SUB = "price_1UDsiD09n6Wx7JpJmY1GXfOO"; // $9.99 CAD / month

const SITE = "https://catterymanager.app";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export const Route = createFileRoute("/api/checkout")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const secret = process.env.STRIPE_SECRET_KEY;
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

        if (!secret || !supabaseUrl || !supabaseKey) {
          return json({ error: "Server is missing Stripe or Supabase settings." }, 500);
        }

        // ---- who is asking ---------------------------------------------
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (!token) return json({ error: "Not signed in." }, 401);

        const who = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { apikey: supabaseKey, authorization: `Bearer ${token}` },
        });
        if (!who.ok) return json({ error: "Session expired. Please sign in again." }, 401);

        const user = (await who.json()) as { id?: string; email?: string };
        if (!user?.id) return json({ error: "Session expired. Please sign in again." }, 401);

        // ---- what are they buying ---------------------------------------
        let body: { kind?: string; courseId?: string; courseSlug?: string };
        try {
          body = await request.json();
        } catch {
          return json({ error: "Bad request." }, 400);
        }

        const kind = body.kind;
        let price: string;
        let mode: "payment" | "subscription";

        if (kind === "course") {
          if (!body.courseId) return json({ error: "No course specified." }, 400);
          price = PRICE_COURSE;
          mode = "payment";
        } else if (kind === "bundle") {
          price = PRICE_BUNDLE;
          mode = "payment";
        } else if (kind === "subscription") {
          price = PRICE_SUB;
          mode = "subscription";
        } else {
          return json({ error: "Unknown purchase type." }, 400);
        }

        // ---- build the session -------------------------------------------
        const stripe = new Stripe(secret, {
          httpClient: Stripe.createFetchHttpClient(),
        });

        // Every paid course shares one price, so the course id has to travel
        // in metadata. The webhook reads it back out to know what to unlock.
        const metadata: Record<string, string> = {
          user_id: user.id,
          kind: kind as string,
        };
        if (body.courseId) metadata.course_id = body.courseId;

        const back = body.courseSlug ? `/academy/${body.courseSlug}` : "/academy";

        try {
          const session = await stripe.checkout.sessions.create({
            mode,
            line_items: [{ price, quantity: 1 }],
            client_reference_id: user.id,
            customer_email: user.email,
            metadata,
            // subscription events don't carry session metadata, so copy it down
            ...(mode === "subscription" ? { subscription_data: { metadata } } : {}),
            success_url: SITE + back + "?checkout=success&session_id={CHECKOUT_SESSION_ID}",
            cancel_url: SITE + back + "?checkout=cancelled",
            allow_promotion_codes: true,
          });

          return json({ url: session.url });
        } catch (err) {
          console.error("checkout error", err);
          return json({ error: "Could not start checkout." }, 500);
        }
      },
    },
  },
});
