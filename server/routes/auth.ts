import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../db";

export const authRouter = Router();

const SALT_ROUNDS = 12;

// POST /api/auth/register
authRouter.post("/register", async (req, res) => {
  try {
    const { email, password, farmName, name, phone } = req.body;

    if (!email || !password || !farmName) {
      return res.status(400).json({
        error: "Campos obrigatórios: email, senha, nome da fazenda",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: "E-mail inválido" });
    }

    if (password.length < 6 || password.length > 128) {
      return res
        .status(400)
        .json({ error: "Senha deve ter entre 6 e 128 caracteres" });
    }

    if (farmName.trim().length > 100) {
      return res
        .status(400)
        .json({ error: "Nome da fazenda: máx 100 caracteres" });
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (existing) {
      return res.status(409).json({ error: "E-mail já cadastrado" });
    }

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hashed,
        farmName: farmName.trim(),
        name: name?.trim(),
        phone: phone?.trim(),
      },
      select: { id: true, email: true, farmName: true, name: true },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "30d",
    });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "E-mail e senha obrigatórios" });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { products: true, certs: true },
    });

    if (!user) {
      return res.status(401).json({ error: "E-mail ou senha incorretos" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "E-mail ou senha incorretos" });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, {
      expiresIn: "30d",
    });

    const { password: _, ...userWithoutPassword } = user;
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

// POST /api/auth/refresh
authRouter.post("/refresh", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token obrigatório" });

    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
    };
    const newToken = jwt.sign(
      { userId: payload.userId },
      process.env.JWT_SECRET!,
      { expiresIn: "30d" }
    );
    res.json({ token: newToken });
  } catch {
    res.status(401).json({ error: "Token inválido" });
  }
});
