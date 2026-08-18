export default async function handler(req: any, res: any) {
  try {
    const { default: app } = await import("../server/_core/index");
    return app(req, res);
  } catch (error: any) {
    console.error("Vercel handler crash:", error);
    res.status(500).json({
      error: true,
      message: error.message || "Vercel handler crash",
      stack: error.stack || String(error),
    });
  }
}