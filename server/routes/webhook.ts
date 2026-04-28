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
import crypto from "node:crypto";
import { prisma } from "../db";

export const webhookRouter = Router();

const VALID_PLANS = ["free", "pro", "business"] as const;
type PlanTier = (typeof VALID_PLANS)[number];

// Janela máxima entre timestamp do payload e o tempo do servidor (anti-replay)
const MAX_WEBHOOK_AGE_MS = 5 * 60 * 1000; // 5 minutos

// Compara strings em tempo constante (evita timing attacks)
const safeEqual = (a: string, b: string): boolean => {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
};

// Middleware: valida assinatura HMAC-SHA256 do webhook + timestamp anti-replay
// Header esperado: x-webhook-signature: t=<unix-timestamp>,v1=<hmac-sha256-hex>
// Compatível com formato similar ao Stripe e Asaas
const validateWebhookSignature = (
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction
) => {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return res.status(503).json({ error: "Webhook não configurado" });
    }
    console.warn("[Webhook] WEBHOOK_SECRET não configurado — aceitando em dev");
    return next();
  }

  const header = req.headers["x-webhook-signature"];
  if (typeof header !== "string" || !header) {
    return res.status(401).json({ error: "Assinatura ausente" });
  }

  // Parse do header: "t=...,v1=..."
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.trim().split("=") as [string, string])
  );
  const ts = Number(parts.t);
  const sig = parts.v1;
  if (!ts || !sig) {
    return res.status(401).json({ error: "Formato de assinatura inválido" });
  }

  // Anti-replay: rejeita payloads muito antigos
  const now = Date.now();
  if (Math.abs(now - ts * 1000) > MAX_WEBHOOK_AGE_MS) {
    return res.status(401).json({ error: "Timestamp expirado" });
  }

  // Reconstrói payload assinado: "<ts>.<json-body>"
  const signedPayload = `${ts}.${JSON.stringify(req.body)}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  if (!safeEqual(sig, expected)) {
    return res.status(401).json({ error: "Assinatura inválida" });
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

    // Busca usuário primeiro — evita 500 silencioso se email não existir
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, plan: true },
    });
    if (!user) {
      // Retorna 200 para não causar retry do provedor (idempotente)
      console.warn(`[Webhook] Usuário não encontrado: ${normalizedEmail}`);
      return res.json({ ok: true, ignored: true, reason: "user_not_found" });
    }

    if (UPGRADE_EVENTS.includes(event)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: plan as PlanTier },
      });
      await prisma.event.create({
        data: {
          userId: user.id,
          type: "plan_upgraded",
          message: `Plano atualizado para ${plan} via webhook`,
        },
      });
      return res.json({ ok: true, plan });
    }

    if (DOWNGRADE_EVENTS.includes(event)) {
      await prisma.user.update({
        where: { id: user.id },
        data: { plan: "free" },
      });
      await prisma.event.create({
        data: {
          userId: user.id,
          type: "plan_downgraded",
          message: `Plano rebaixado para free via webhook (${event})`,
        },
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
