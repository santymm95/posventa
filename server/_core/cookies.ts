import type { CookieOptions } from "express";
import { serialize } from 'cookie';

type AnyRequest = any;
type AnyResponse = any;

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isSecureRequest(req: AnyRequest) {
  try {
    const proto = (req && (req.protocol || req.protocol === 'https' ? req.protocol : undefined)) as string | undefined;
    if (proto === "https") return true;

    const forwardedProto = req && req.headers && (req.headers["x-forwarded-proto"] || req.headers["X-Forwarded-Proto"]);
    if (!forwardedProto) return false;

    const protoList = Array.isArray(forwardedProto)
      ? forwardedProto
      : String(forwardedProto).split(",");

    return protoList.some((p: string) => p.trim().toLowerCase() === "https");
  } catch {
    return false;
  }
}

export function getSessionCookieOptions(
  req: AnyRequest
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  // const hostname = req.hostname;
  // const shouldSetDomain =
  //   hostname &&
  //   !LOCAL_HOSTS.has(hostname) &&
  //   !isIpAddress(hostname) &&
  //   hostname !== "127.0.0.1" &&
  //   hostname !== "::1";

  // const domain =
  //   shouldSetDomain && !hostname.startsWith(".")
  //     ? `.${hostname}`
  //     : shouldSetDomain
  //       ? hostname
  //       : undefined;

  return {
    domain: undefined,
    httpOnly: true,
    path: "/",
    sameSite: (isSecureRequest(req) ? "none" : "lax") as any,
    secure: Boolean(isSecureRequest(req)),
  };
}

export function setCookie(res: AnyResponse, name: string, value: string, opts: Partial<CookieOptions> = {}) {
  if (!res) return;
  try {
    if (typeof res.cookie === 'function') {
      return res.cookie(name, value, opts as CookieOptions);
    }

    const cookieStr = serialize(name, value, {
      path: opts.path || '/',
      httpOnly: opts.httpOnly ?? true,
      sameSite: opts.sameSite as any || 'lax',
      secure: !!opts.secure,
      domain: opts.domain,
    });

    const prev = res.getHeader && (res.getHeader('Set-Cookie') || res.getHeader('set-cookie'));
    if (prev) {
      const headers = Array.isArray(prev) ? [...prev as string[], cookieStr] : [String(prev), cookieStr];
      res.setHeader('Set-Cookie', headers);
    } else if (res.setHeader) {
      res.setHeader('Set-Cookie', cookieStr);
    }
  } catch (e) {
    // best-effort
  }
}

export function clearCookie(res: AnyResponse, name: string, opts: Partial<CookieOptions> = {}) {
  if (!res) return;
  try {
    if (typeof res.clearCookie === 'function') return res.clearCookie(name, opts as CookieOptions);

    const cookieStr = serialize(name, '', { path: opts.path || '/', maxAge: 0, httpOnly: opts.httpOnly ?? true });
    const prev = res.getHeader && (res.getHeader('Set-Cookie') || res.getHeader('set-cookie'));
    if (prev) {
      const headers = Array.isArray(prev) ? [...prev as string[], cookieStr] : [String(prev), cookieStr];
      res.setHeader('Set-Cookie', headers);
    } else if (res.setHeader) {
      res.setHeader('Set-Cookie', cookieStr);
    }
  } catch (e) {
    // ignore
  }
}
