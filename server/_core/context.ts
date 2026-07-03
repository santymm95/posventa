import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { COOKIE_NAME } from "@shared/const";
import { verifyAuthToken } from "./auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function buildFallbackUserFromToken(token: string): User | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    const userId = typeof payload.userId === "string" ? Number(payload.userId) : payload.userId;
    const email = typeof payload.email === "string" ? payload.email : null;
    const role = payload.role === "admin" ? "admin" : "user";

    if (typeof userId !== "number" || !Number.isFinite(userId)) {
      return null;
    }

    return {
      id: userId,
      openId: `jwt-${userId}`,
      name: typeof payload.name === "string" ? payload.name : (email || "Administrador"),
      email,
      password: null,
      loginMethod: "local",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    } as User;
  } catch {
    return null;
  }
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
  }

  // If sdk.authenticateRequest failed (for example DB or OAuth not available),
  // try a lightweight session cookie verification as a fallback so local
  // development sessions (local-admin or SDK-signed cookies) still work.
  if (!user) {
    try {
      const cookieHeader = (opts.req.headers && (opts.req.headers as any).cookie) || undefined;
      let sessionCookie: string | undefined = undefined;
      if (cookieHeader) {
        const parts = cookieHeader.split(";").map((s: string) => s.trim());
        const match = parts.find((p: string) => p.startsWith(`${COOKIE_NAME}=`) || p.startsWith("session="));
        if (match) {
          const idx = match.indexOf("=");
          sessionCookie = match.substring(idx + 1);
        } else {
          // try to find by known cookie key
          const candidate = parts.find((p: string) => p.includes("=") && p.split("=")[0].length > 0);
          if (candidate) sessionCookie = candidate.split("=")[1];
        }
      }
      const parsed = await sdk.verifySession(sessionCookie);
      if (parsed && parsed.openId) {
        const fallbackUser: User = {
          id: parsed.openId === 'local-admin' ? 1 : 0,
          openId: parsed.openId,
          name: parsed.name || parsed.openId,
          email: null,
          password: null,
          loginMethod: 'local',
          role: parsed.openId === 'local-admin' ? 'admin' : 'user',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        } as User;

        user = fallbackUser;
      }
    } catch {
      // ignore fallback errors
    }
  }

  if (!user) {
    try {
      const authHeader = opts.req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7);
        const verified = await verifyAuthToken(token);
        if (verified && typeof verified.userId === "number") {
          user = buildFallbackUserFromToken(token);
        }
      }
    } catch {
      user = null;
    }
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
