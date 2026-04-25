import qrcode from "qrcode";
import crypto from "node:crypto";

// Eigene RFC 6238 TOTP-Implementation (vermeidet otplib ESM-Probleme mit Next.js)

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of cleaned) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

function generateHotp(key: Buffer, counter: number): string {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const code =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  return String(code % 1_000_000).padStart(6, "0");
}

function currentCounter(): number {
  return Math.floor(Date.now() / 1000 / 30);
}

export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

export function buildTotpUri(username: string, secret: string): string {
  const issuer = encodeURIComponent("Betriebstagebuch NVB");
  const label = encodeURIComponent(`${issuer}:${username}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export async function buildTotpQrDataUrl(uri: string): Promise<string> {
  return qrcode.toDataURL(uri, { width: 220, margin: 1 });
}

export function verifyTotp(code: string, secret: string): boolean {
  const cleaned = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(cleaned)) return false;
  try {
    const key = base32Decode(secret);
    const counter = currentCounter();
    // Akzeptiere ±1 Zeit-Slot (60 Sek Toleranz)
    for (const c of [counter - 1, counter, counter + 1]) {
      if (generateHotp(key, c) === cleaned) return true;
    }
    return false;
  } catch {
    return false;
  }
}
