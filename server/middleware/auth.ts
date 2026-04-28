import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db";

export interface AuthRequest extends Request {
  userId?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Não autenticado" });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      iat?: number;
    };

    // Verifica se o token foi invalidado (logout server-side, troca de senha)
    if (payload.iat) {
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { tokenInvalidAt: true },
      });
      if (user?.tokenInvalidAt && payload.iat * 1000 < user.tokenInvalidAt.getTime()) {
        return res.status(401).json({ error: "Sessão expirada. Faça login novamente." });
      }
    }

    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
};
