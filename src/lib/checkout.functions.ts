import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STRIPE_PRICES } from "@/lib/stripe-prices";

export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { courseId?: string; bundle?: boolean; origin: string }) => {
    if (!data || typeof data.origin !== "string") throw new Error("origin required");
    if (!data.bundle && !data.courseId) throw new Error("courseId or bundle required");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      httpClient: Stripe.createFetchHttpClient(),
    });

    const price = data.bundle ? STRIPE_PRICES.bundle : STRIPE_PRICES.singleCourse;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      client_reference_id: context.userId,
      metadata: {
        user_id: context.userId,
        course_id: data.courseId ?? "",
        is_bundle: data.bundle ? "true" : "false",
      },
      success_url: data.origin + "/academy?purchase=success",
      cancel_url: data.origin + "/academy?purchase=cancelled",
    });

    return { url: session.url };
  });
