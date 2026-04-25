// ─── Payment Service Abstraction ─────────────────────────────────────────────
// Architecture: the rest of the app depends only on IPaymentService.
// To go live: replace MockPaymentService with StripePaymentService or
// AsaasPaymentService below — zero changes needed in App.tsx or components.
//
// Server routes needed (see server/routes/payments.ts when ready):
//   POST /api/payments/checkout  → { url, sessionId }
//   GET  /api/payments/status    → SubscriptionStatus
//   POST /api/payments/cancel    → void
//   POST /api/payments/portal    → { url }
//   POST /api/payments/webhook   → Stripe/Asaas webhook handler

export type PlanTier = "free" | "pro" | "business";

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CheckoutOptions {
  plan: PlanTier;
  userId: string;   // user email (local identifier before backend user ID)
  email: string;
  successUrl: string;
  cancelUrl: string;
}

export interface SubscriptionStatus {
  active: boolean;
  plan: PlanTier;
  externalSubscriptionId?: string;
  currentPeriodEnd?: string;    // ISO date string
  cancelAtPeriodEnd?: boolean;
}

// ─── Contract ─────────────────────────────────────────────────────────────────

export interface IPaymentService {
  /** Returns URL for hosted checkout (Stripe Checkout / Asaas / PagSeguro) */
  createCheckoutSession(opts: CheckoutOptions): Promise<{ url: string; sessionId: string }>;
  /** Retrieve subscription state — call on app init and after webhook */
  getSubscriptionStatus(email: string): Promise<SubscriptionStatus>;
  /** Cancel at period end, no immediate loss of access */
  cancelSubscription(externalSubscriptionId: string): Promise<void>;
  /** Stripe Customer Portal or equivalent for managing billing */
  createPortalSession(email: string): Promise<{ url: string }>;
}

// ─── Mock (development) ───────────────────────────────────────────────────────
// Stores plan in localStorage. No real payment processed.
// Simulates the full flow so UI/UX is testable without a payment provider.

class MockPaymentService implements IPaymentService {
  async createCheckoutSession(opts: CheckoutOptions) {
    // TODO: replace body with:
    //   const res = await fetch("/api/payments/checkout", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify(opts),
    //   });
    //   return res.json(); // { url, sessionId }
    console.info("[PaymentService] Mock checkout — configure provider to enable real payments", opts);
    return { url: "#mock", sessionId: "mock_session" };
  }

  async getSubscriptionStatus(email: string): Promise<SubscriptionStatus> {
    // TODO: const res = await fetch(`/api/payments/status?email=${email}`);
    //       return res.json();
    const stored = localStorage.getItem(`rastro_plan_${email}`) as PlanTier | null;
    const plan: PlanTier = stored ?? "free";
    return { active: plan !== "free", plan };
  }

  async cancelSubscription(id: string) {
    // TODO: await fetch("/api/payments/cancel", { method: "POST", body: JSON.stringify({ subscriptionId: id }) });
    console.info("[PaymentService] Mock cancel", id);
  }

  async createPortalSession(email: string) {
    // TODO: const res = await fetch("/api/payments/portal", { method: "POST", body: JSON.stringify({ email }) });
    //       const { url } = await res.json(); window.location.href = url;
    console.info("[PaymentService] Mock portal", email);
    return { url: "#mock-portal" };
  }
}

// ─── Stripe implementation skeleton (uncomment when ready) ────────────────────
// import Stripe from "stripe"; // server-side only — expose via /api/payments/*
//
// class StripePaymentService implements IPaymentService {
//   async createCheckoutSession(opts: CheckoutOptions) {
//     const res = await fetch("/api/payments/checkout", {
//       method: "POST",
//       headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
//       body: JSON.stringify(opts),
//     });
//     return res.json();
//   }
//   // ... implement remaining methods
// }

// ─── Singleton export — swap implementation here, nowhere else ────────────────
export const paymentService: IPaymentService = new MockPaymentService();
