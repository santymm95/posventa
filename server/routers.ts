import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { 
  getAllProducts, 
  getSalesByDate, 
  getSalesByDateRange, 
  getTodayInventory, 
  getDailyBalance, 
  getCashClosingByDate, 
  getAllCashClosings, 
  getRecentCashClosings, 
  upsertInventory, 
  getSettingsByUserId, 
  upsertSettings, 
  upsertDailyBalance, 
  buildSaleWithProductName, 
  createProduct, 
  updateProduct, 
  deleteProduct, 
  getInventoryProductIds, 
  getProductById,
  getUserByEmail,
  getUserById,
  listUsers,
  createUser,
  deleteUser,
  createSale,
  createCashClosing
} from "./db";
import { comparePasswordWithCandidates, createAuthToken, hashPassword, isLocalAdminCredential } from "./_core/auth";
import { sdk } from "./_core/sdk";
import { printSaleReceipt } from "./_core/printer";
import { upsertSupabaseProduct, hasSupabaseConfig } from "./supabase";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin2026*";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const normalizedEmail = input.email.trim().toLowerCase();
        const normalizedPassword = input.password.trim();
        const canUseLocalAdminFallback = isLocalAdminCredential(normalizedEmail, normalizedPassword);

        if (canUseLocalAdminFallback) {
          const sessionToken = await sdk.createSessionToken("local-admin", { name: "Administrador" });

          try {
            const cookieOptions = getSessionCookieOptions(ctx.req);
            console.log('[Auth] Setting session cookie for local-admin', { cookieOptions });
            ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions });
          } catch (e) {
            // ignore if cookie cannot be set
          }

          return {
            token: sessionToken,
            user: {
              id: 1,
              openId: "local-admin",
              name: "Administrador",
              email: ADMIN_EMAIL,
              password: null,
              loginMethod: "local",
              role: "admin",
              createdAt: new Date(),
              updatedAt: new Date(),
              lastSignedIn: new Date(),
            },
          };
        }

        try {
          const foundUser = await getUserByEmail(normalizedEmail);

          if (!foundUser) {
            // Try Supabase Auth if configured
            if (hasSupabaseConfig()) {
              const { supabaseServer } = await import('./supabase');
              if (supabaseServer) {
                try {
                  const resp = await supabaseServer.auth.signInWithPassword({ email: normalizedEmail, password: normalizedPassword });
                  if (resp.error || !resp.data?.user) {
                    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email o contraseña incorrectos' });
                  }

                  const sbUser = resp.data.user;
                  const sessionToken = await sdk.createSessionToken(sbUser.id, { name: sbUser.user_metadata?.full_name || sbUser.email });

                  try {
                    const cookieOptions = getSessionCookieOptions(ctx.req);
                    console.log('[Auth] Setting session cookie for supabase user', { openId: sbUser.id, cookieOptions });
                    ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions });
                  } catch {}

                  return {
                    token: sessionToken,
                    user: {
                      id: sbUser.id,
                      openId: sbUser.id,
                      name: sbUser.user_metadata?.full_name || sbUser.email,
                      email: sbUser.email,
                      password: null,
                      loginMethod: 'supabase',
                      role: 'user',
                      createdAt: new Date(),
                      updatedAt: new Date(),
                      lastSignedIn: new Date(),
                    },
                  };
                } catch (e) {
                  throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email o contraseña incorrectos' });
                }
              }
            }

            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email o contraseña incorrectos' });
          }

          const passwordMatch = await comparePasswordWithCandidates(
            normalizedPassword,
            foundUser.password || '',
            foundUser.email === ADMIN_EMAIL ? ["admin123"] : []
          );

          if (!passwordMatch) {
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email o contraseña incorrectos' });
          }

          const sessionToken = await sdk.createSessionToken(foundUser.openId, { name: foundUser.name || foundUser.email || "" });

          try {
            const cookieOptions = getSessionCookieOptions(ctx.req);
            console.log('[Auth] Setting session cookie for DB user', { openId: foundUser.openId, cookieOptions });
            ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions });
          } catch {}

          return { token: sessionToken, user: foundUser };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          if (canUseLocalAdminFallback) {
            const sessionToken = await sdk.createSessionToken("local-admin", { name: "Administrador" });

            try {
              const cookieOptions = getSessionCookieOptions(ctx.req);
              console.log('[Auth] Setting session cookie for local-admin (db-down)', { cookieOptions });
              ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions });
            } catch {}

            return {
              token: sessionToken,
              user: {
                id: 1,
                openId: "local-admin",
                name: "Administrador",
                email: ADMIN_EMAIL,
                password: null,
                loginMethod: "local",
                role: "admin",
                createdAt: new Date(),
                updatedAt: new Date(),
                lastSignedIn: new Date(),
              },
            };
          }

          console.error('Login failed:', error);
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'No se pudo completar el inicio de sesión' });
        }
      }),

    register: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(6), name: z.string() }))
      .mutation(async ({ input }) => {
        // Verificar si el email ya existe
        const existing = await getUserByEmail(input.email);
        
        if (existing) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'El email ya está registrado' });
        }

        // Hash de contraseña
        const hashedPassword = await hashPassword(input.password);

        // Crear usuario
        await createUser({
          openId: `local-${Date.now()}`,
          email: input.email,
          password: hashedPassword,
          name: input.name,
          loginMethod: 'local',
          role: 'user',
        });

        return { success: true };
      }),
  }),

  users: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return listUsers();
    }),

    create: protectedProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El email ya está registrado" });
        }

        const hashedPassword = await hashPassword(input.password);
        const createdUser = await createUser({
          openId: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          email: input.email,
          password: hashedPassword,
          name: input.name || input.email,
          loginMethod: "local",
          role: "user",
        });

        return {
          success: true,
          user: createdUser,
        };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        const target = await getUserById(input.id);
        if (!target) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Usuario no encontrado" });
        }

        if (target.role === "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "No se puede eliminar al administrador" });
        }

        await deleteUser(input.id);
        return { success: true };
      }),
  }),

  products: router({
    list: publicProcedure.query(async () => {
      return getAllProducts();
    }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        price: z.number().min(0),
        imageData: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        let imagePath = "";
        if (input.imageData) {
          const fs = await import('fs/promises');
          const path = await import('path');
          const crypto = await import('crypto');
          
          try {
            const uploadsDir = path.join(process.cwd(), 'client', 'public', 'uploads');
            await fs.mkdir(uploadsDir, { recursive: true });
            
            const timestamp = Date.now();
            const random = crypto.randomBytes(4).toString('hex');
            const filename = `product-${timestamp}-${random}.jpg`;
            const filepath = path.join(uploadsDir, filename);
            
            const base64Data = input.imageData.replace(/^data:image\/\w+;base64,/, '');
            await fs.writeFile(filepath, Buffer.from(base64Data, 'base64'));
            
            imagePath = `/uploads/${filename}`;
          } catch (error) {
            console.error('Error guardando imagen:', error);
          }
        }
        
        const createdProduct = await createProduct(input.name, Math.round(input.price * 100), imagePath);

        if (hasSupabaseConfig()) {
          await upsertSupabaseProduct({
            id: createdProduct?.id,
            name: input.name,
            price: Math.round(input.price * 100),
            image: imagePath,
            category: "",
            active: 1,
            parentProductId: null,
          });
        }

        return createdProduct;
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        price: z.number().min(0).optional(),
        imageData: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        let imagePath: string | null | undefined = undefined;
        if (input.imageData !== undefined) {
          if (input.imageData) {
            const fs = await import('fs/promises');
            const path = await import('path');
            const crypto = await import('crypto');

            try {
              const uploadsDir = path.join(process.cwd(), 'client', 'public', 'uploads');
              await fs.mkdir(uploadsDir, { recursive: true });

              const timestamp = Date.now();
              const random = crypto.randomBytes(4).toString('hex');
              const filename = `product-${timestamp}-${random}.jpg`;
              const filepath = path.join(uploadsDir, filename);

              const base64Data = input.imageData.replace(/^data:image\/\w+;base64,/, '');
              await fs.writeFile(filepath, Buffer.from(base64Data, 'base64'));

              imagePath = `/uploads/${filename}`;
            } catch (error) {
              console.error('Error actualizando imagen:', error);
            }
          } else {
            imagePath = null;
          }
        }

        const updatedProduct = await updateProduct(input.id, {
          name: input.name,
          price: input.price !== undefined ? Math.round(input.price * 100) : undefined,
          image: imagePath,
        });

        if (hasSupabaseConfig()) {
          const currentProduct = await getProductById(input.id);
          await upsertSupabaseProduct({
            id: input.id,
            name: input.name ?? currentProduct?.name ?? "Producto",
            price: input.price !== undefined ? Math.round(input.price * 100) : currentProduct?.price ?? 0,
            image: imagePath ?? currentProduct?.image ?? "",
            category: currentProduct?.category ?? "",
            active: currentProduct?.active ?? 1,
            parentProductId: currentProduct?.parentProductId ?? null,
          });
        }

        return updatedProduct;
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        return deleteProduct(input.id);
      }),
    createVariant: protectedProcedure
      .input(z.object({
        parentProductId: z.number(),
        name: z.string().min(1),
        price: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        
        return createProduct(input.name, Math.round((input.price || 0) * 100), "", input.parentProductId);
      }),
  }),

  inventory: router({
    today: publicProcedure.query(async () => {
      return getTodayInventory();
    }),
    
    upsert: protectedProcedure
      .input(z.object({
        productId: z.number(),
        quantity: z.number(),
        previousDayQuantity: z.number().default(0),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await upsertInventory(
          input.productId,
          input.quantity,
          input.previousDayQuantity,
          input.notes
        );
        return { success: true, id: result };
      }),
  }),

  sales: router({
    create: protectedProcedure
      .input(z.object({
        productId: z.number(),
        quantity: z.number().positive(),
        unitPrice: z.number().positive(),
        paymentMethod: z.enum(["efectivo", "transferencia", "fiado"]),
      }))
      .mutation(async ({ input }) => {
        const product = await getProductById(input.productId);
        if (!product) throw new Error("Producto no encontrado");
        
        const inventoryProductIds = getInventoryProductIds(
          input.productId,
          product.parentProductId
        );
        
        const totalPrice = input.quantity * input.unitPrice;
        const resultId = await createSale({
          productId: input.productId,
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          totalPrice: totalPrice,
          paymentMethod: input.paymentMethod,
          date: new Date(),
        });
        
        await upsertDailyBalance(new Date(), {
          totalPrice,
          paymentMethod: input.paymentMethod,
        });
        
        // Descontar del inventario del producto vendido y, si aplica, del producto padre
        for (const inventoryProductId of inventoryProductIds) {
          await upsertInventory(inventoryProductId, -input.quantity, 0, `Venta de ${product.name || 'Producto'}`);
        }

        void printSaleReceipt({
          businessName: "ASADOS VENTAS",
          productName: product.name || "Producto",
          quantity: input.quantity,
          unitPrice: input.unitPrice,
          totalPrice: totalPrice,
          paymentMethod: input.paymentMethod,
        }).catch((error) => {
          console.error("Receipt print failed", error);
        });
        
        return { success: true, id: resultId };
      }),

    byDate: publicProcedure
      .input(z.object({ date: z.date() }))
      .query(async ({ input }) => {
        const salesRows = await getSalesByDate(input.date);

        return Promise.all(salesRows.map(async (sale: any) => {
          const product = await getProductById(sale.productId);
          return buildSaleWithProductName({
            ...sale,
            productName: product?.name,
            date: sale.date,
          });
        }));
      }),

    byDateRange: publicProcedure
      .input(z.object({ startDate: z.date(), endDate: z.date() }))
      .query(async ({ input }) => {
        const salesRows = await getSalesByDateRange(input.startDate, input.endDate);

        return Promise.all(salesRows.map(async (sale: any) => {
          const product = await getProductById(sale.productId);
          return buildSaleWithProductName({
            ...sale,
            productName: product?.name,
            date: sale.date,
          });
        }));
      }),
  }),

  reports: router({
    dailyBalance: publicProcedure
      .input(z.object({ date: z.date() }))
      .query(async ({ input }) => {
        const salesData = await getSalesByDate(input.date);
        const dailyBalanceData = await getDailyBalance(input.date);
        if (dailyBalanceData) {
          return {
            totalSales: dailyBalanceData.totalSales,
            cashSales: dailyBalanceData.cashSales,
            transferSales: dailyBalanceData.transferSales,
            creditSales: dailyBalanceData.creditSales,
            transactionCount: salesData.length,
          };
        }
        
        const totalSales = salesData.reduce((sum: number, s: any) => sum + s.totalPrice, 0);
        const cashSales = salesData
          .filter((s: any) => s.paymentMethod === "efectivo")
          .reduce((sum: number, s: any) => sum + s.totalPrice, 0);
        const transferSales = salesData
          .filter((s: any) => s.paymentMethod === "transferencia")
          .reduce((sum: number, s: any) => sum + s.totalPrice, 0);
        const creditSales = salesData
          .filter((s: any) => s.paymentMethod === "fiado")
          .reduce((sum: number, s: any) => sum + s.totalPrice, 0);
        
        return {
          totalSales,
          cashSales,
          transferSales,
          creditSales,
          transactionCount: salesData.length,
        };
      }),
  }),

  settings: router({
    get: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user?.id) throw new Error("User not authenticated");
        return getSettingsByUserId(ctx.user.id);
      }),
    
    update: protectedProcedure
      .input(z.object({
        appTitle: z.string().optional(),
        appLogo: z.string().optional(),
        primaryColor: z.string().optional(),
        secondaryColor: z.string().optional(),
        theme: z.enum(["light", "dark"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user?.id) throw new Error("User not authenticated");
        const result = await upsertSettings(ctx.user.id, input);
        return { success: true, id: result };
      }),
  }),

  cashClosings: router({
    create: protectedProcedure
      .input(z.object({
        date: z.date(),
        expectedCash: z.number(),
        actualCash: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Get sales data for the day
        const dailyBalanceData = await getDailyBalance(input.date);
        const salesData = await getSalesByDate(input.date);
        const totalSales = dailyBalanceData?.totalSales ?? salesData.reduce((sum: number, s: any) => sum + s.totalPrice, 0);
        const cashSales = dailyBalanceData?.cashSales ?? salesData
          .filter((s: any) => s.paymentMethod === "efectivo")
          .reduce((sum: number, s: any) => sum + s.totalPrice, 0);
        const transferSales = dailyBalanceData?.transferSales ?? salesData
          .filter((s: any) => s.paymentMethod === "transferencia")
          .reduce((sum: number, s: any) => sum + s.totalPrice, 0);
        const creditSales = dailyBalanceData?.creditSales ?? salesData
          .filter((s: any) => s.paymentMethod === "fiado")
          .reduce((sum: number, s: any) => sum + s.totalPrice, 0);
        
        const difference = input.actualCash - input.expectedCash;
        
        const resultId = await createCashClosing({
          date: input.date,
          totalSales,
          cashSales,
          transferSales,
          creditSales,
          expectedCash: input.expectedCash,
          actualCash: input.actualCash,
          difference,
          notes: input.notes,
          closedBy: ctx.user?.id,
        });
        
        return { success: true, id: resultId };
      }),

    byDate: publicProcedure
      .input(z.object({ date: z.date() }))
      .query(async ({ input }) => {
        return getCashClosingByDate(input.date);
      }),

    recent: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ input }) => {
        return getRecentCashClosings(input.limit);
      }),

    all: publicProcedure
      .query(async () => {
        return getAllCashClosings();
      }),
  }),
});

export type AppRouter = typeof appRouter;
