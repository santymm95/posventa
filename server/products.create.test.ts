import { describe, it, expect, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("products.create", () => {
  const createdProductIds: number[] = [];

  afterAll(async () => {
    // Nota: La limpieza se haría aquí si fuera necesario
    // Por ahora, dejamos los datos de prueba para inspección manual
  });

  it("should create a product with image path", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.products.create({
      name: "Test Chorizo",
      price: 15, // 15 pesos
      imageData: undefined, // Sin imagen para este test
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("Test Chorizo");
    expect(result.price).toBe(1500); // Convertido a centavos
    expect(result.image).toBe(""); // Sin imagen

    if (result.id) {
      createdProductIds.push(result.id);
    }
  });

  it("should create a product without image", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.products.create({
      name: "Test Asado",
      price: 25,
      imageData: undefined,
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("Test Asado");
    expect(result.price).toBe(2500);
    expect(result.image).toBe("");

    if (result.id) {
      createdProductIds.push(result.id);
    }
  });

  it("should require admin role to create product", async () => {
    const ctx = createAuthContext();
    ctx.user!.role = "user"; // Cambiar a usuario no-admin
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.products.create({
        name: "Unauthorized Product",
        price: 10,
        imageData: undefined,
      });
      // Si llegamos aquí, el test falla
      expect(true).toBe(false);
    } catch (error: any) {
      // Se espera un error FORBIDDEN
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should require product name", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.products.create({
        name: "", // Nombre vacío
        price: 10,
        imageData: undefined,
      });
      // Si llegamos aquí, el test falla
      expect(true).toBe(false);
    } catch (error: any) {
      // Se espera un error de validación
      expect(error.code).toBe("BAD_REQUEST");
    }
  });
});
