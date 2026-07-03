import net from "node:net";
import http from "node:http";

export interface ReceiptPayload {
  businessName?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  paymentMethod: "efectivo" | "transferencia" | "fiado";
  cashReceived?: number;
  changeAmount?: number;
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPaymentMethod(method: ReceiptPayload["paymentMethod"]) {
  switch (method) {
    case "efectivo":
      return "Efectivo";
    case "transferencia":
      return "Transferencia";
    case "fiado":
      return "Fiado";
  }
}

export function buildOpenDrawerBuffer() {
  return Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]);
}

export function buildSaleReceiptBuffer(payload: ReceiptPayload) {
  const lines = [
    payload.businessName || "ASADOS VENTAS",
    "----------------------------",
    new Date().toLocaleString("es-CO"),
    "",
    payload.productName,
    `Cant: ${payload.quantity}  P/U: ${formatCOP(payload.unitPrice)}`,
    `Total: ${formatCOP(payload.totalPrice)}`,
    `Pago: ${formatPaymentMethod(payload.paymentMethod)}`,
  ];

  if (payload.cashReceived !== undefined) {
    lines.push(`Recibido: ${formatCOP(payload.cashReceived)}`);
  }

  if (payload.changeAmount !== undefined) {
    lines.push(`Cambio: ${formatCOP(payload.changeAmount)}`);
  }

  lines.push("", "Gracias por su compra", "", "");

  const content = lines.join("\n");
  const init = Buffer.from([0x1b, 0x40]);
  const center = Buffer.from([0x1b, 0x61, 0x01]);
  const left = Buffer.from([0x1b, 0x61, 0x00]);
  const bold = Buffer.from([0x1b, 0x21, 0x08]);
  const normal = Buffer.from([0x1b, 0x21, 0x00]);
  const cut = Buffer.from([0x1d, 0x56, 0x41, 0x00]);
  const newline = Buffer.from("\n", "latin1");

  return Buffer.concat([
    init,
    center,
    Buffer.from(`${payload.businessName || "ASADOS VENTAS"}\n`, "latin1"),
    normal,
    Buffer.from(`${"-".repeat(28)}\n`, "latin1"),
    Buffer.from(`${new Date().toLocaleString("es-CO")}\n\n`, "latin1"),
    bold,
    Buffer.from(`${payload.productName}\n`, "latin1"),
    normal,
    Buffer.from(`Cant: ${payload.quantity}  P/U: ${formatCOP(payload.unitPrice)}\n`, "latin1"),
    Buffer.from(`Total: ${formatCOP(payload.totalPrice)}\n`, "latin1"),
    Buffer.from(`Pago: ${formatPaymentMethod(payload.paymentMethod)}\n`, "latin1"),
    ...(payload.cashReceived !== undefined ? [Buffer.from(`Recibido: ${formatCOP(payload.cashReceived)}\n`, "latin1")] : []),
    ...(payload.changeAmount !== undefined ? [Buffer.from(`Cambio: ${formatCOP(payload.changeAmount)}\n`, "latin1")] : []),
    Buffer.from(`\nGracias por su compra\n\n`, "latin1"),
    cut,
  ]);
}

export function getPrinterConfig() {
  const host = process.env.THERMAL_PRINTER_HOST?.trim();
  const port = Number(process.env.THERMAL_PRINTER_PORT || 9100);
  const bridgeUrl = process.env.THERMAL_PRINTER_BRIDGE_URL?.trim();

  return {
    enabled: Boolean(host || bridgeUrl),
    host,
    port: Number.isFinite(port) ? port : 9100,
    bridgeUrl: bridgeUrl ?? undefined,
  };
}

export async function printSaleReceipt(payload: ReceiptPayload) {
  const config = getPrinterConfig();
  if (!config.enabled) {
    return { ok: false, reason: "printer not configured" };
  }

  if (config.bridgeUrl) {
    const bridgeUrl = config.bridgeUrl;
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const body = JSON.stringify(payload);
      const req = http.request(
        bridgeUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
          },
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve({ ok: Boolean(res.statusCode && res.statusCode < 400) }));
        }
      );

      req.on("error", (error) => resolve({ ok: false, error: error.message }));
      req.write(body);
      req.end();
    });
  }

  if (!config.host) {
    return { ok: false, reason: "printer host not configured" };
  }

  return new Promise<{ ok: boolean; error?: string }>((resolve) => {
    const socket = net.createConnection({ host: config.host, port: config.port });

    const finish = (ok: boolean, error?: string) => {
      socket.destroy();
      resolve({ ok, error });
    };

    socket.setTimeout(4000);

    socket.once("connect", () => {
      try {
        socket.write(buildOpenDrawerBuffer());
        socket.write(buildSaleReceiptBuffer(payload));
        socket.end();
        finish(true);
      } catch (error) {
        finish(false, error instanceof Error ? error.message : "unknown error");
      }
    });

    socket.once("timeout", () => finish(false, "printer timeout"));
    socket.once("error", (error) => finish(false, error.message));
    socket.once("close", () => undefined);
  });
}
