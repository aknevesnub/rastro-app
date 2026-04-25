/**
 * POST /api/webhook/payment
 *
 * Recebe evento de pagamento do Stripe (ou Asaas) e promove/rebaixa plano.
 * Esta é a ÚNICA rota que pode alterar o campo `plan` de um usuário.
 * Zero-trust: o frontend nunca envia plano diretamente.
 *
 * Em produção:
 *   1. Instale `stripe` no server: npm install stripe
 *   2. Substitua a validação mock pela verificação de assinatura Stripe:
 *      stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
 *   3. Adicione rawBody middleware antes do express.json() no index.ts
 */

import { Router } from "express";
import { prisma } from "../db";

export const webhookRouter = Router();

const VALID_PLANS = ["free", "pro", "business"] as const;
type PlanTier = (typeof VALID_PLANS)[number];

// Middleware: valida assinatura do webhook
// Em dev: aceita WEBHOOK_SECRET como Bearer token simples
// Em prod: substituir pela verificação criptográfica do provedor
const validateWebhookSignature = (
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction
) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    // Se WEBHOOK_SECRET não estiver configurado, bloqueia sempre em produção
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({ error: "Webhook não configurado" });
    }
    // Em dev sem secret configurado, loga aviso e permite (apenas local)
    console.warn("[Webhook] WEBHOOK_SECRET não configurado — aceitando em dev");
    return next();
  }

  const sig = req.headers["x-webhook-signature"];
  if (sig !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "Assinatura de webhook inválida" });
  }
  next();
};

// POST /api/webhook/payment — atualiza plano do usuário após pagamento confirmado
webhookRouter.post("/payment", validateWebhookSignature, async (req, res) => {
  try {
    const { event, email, plan } = req.body;

    if (!email || !plan || !event) {
      return res.status(400).json({ error: "Campos obrigatórios: event, email, plan" });
    }

    if (!VALID_PLANS.includes(plan as PlanTier)) {
      return res.status(400).json({ error: `Plano inválido: ${plan}` });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Eventos suportados
    const UPGRADE_EVENTS = ["checkout.session.completed", "invoice.payment_succeeded", "subscription.activated"];
    const DOWNGRADE_EVENTS = ["customer.subscription.deleted", "subscription.cancelled", "invoice.payment_failed"];

    if (UPGRADE_EVENTS.includes(event)) {
      await prisma.user.update({
        where: { email: normalizedEmail },
        data: { plan: plan as PlanTier },
      });
      await prisma.event.create({
        data: {
          userId: (await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } }))!.id,
          type: "plan_upgraded",
          message: `Plano atualizado para ${plan} via webhook`,
        },
      });
      return res.json({ ok: true, plan });
    }

    if (DOWNGRADE_EVENTS.includes(event)) {
      await prisma.user.update({
        where: { email: normalizedEmail },
        data: { plan: "free" },
      });
      return res.json({ ok: true, plan: "free" });
    }

    // Evento desconhecido — aceita mas não age (idempotente)
    return res.json({ ok: true, ignored: true });
  } catch (err) {
    console.error("[Webhook] Erro:", err);
    res.status(500).json({ error: "Erro interno" });
  }
});
