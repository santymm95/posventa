export default async function handler(req: any, res: any) {
  try {
    const { default: app } = await import("../server/_core/index");
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel handler crash:", error);
    res.status(500).json({
      error: {
        json: {
          message: error.message || "Vercel handler crash",
          code: -32603,
          data: {
            code: "INTERNAL_SERVER_ERROR",
            httpStatus: 500,
            stack: error.stack || String(error),
          },
        },
      },
    });
  }
}