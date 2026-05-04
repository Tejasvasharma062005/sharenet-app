/**
 * HMAC-SHA256 QR Service
 * Specification: SDS Section 5.3 — qr-service.ts
 * 
 * Encodes: donation_id + volunteer_id + expected delivery timestamp
 * Signs:   HMAC-SHA256 with server-side secret
 * Provides: tamper-proof, auditable proof-of-delivery
 */

import crypto from 'crypto';

export interface QRPayload {
  donation_id: string;
  volunteer_id: string;
  ngo_id: string;
  expected_delivery: number; // Unix timestamp
  issued_at: number;         // Unix timestamp
}

export interface SignedQR {
  payload: QRPayload;
  signature: string; // hex-encoded HMAC-SHA256
}

/**
 * Generate a HMAC-SHA256 signed QR payload
 * The QR encodes all delivery parties and a 5-minute expiry window
 */
export function generateQRPayload(
  donation_id: string,
  volunteer_id: string,
  ngo_id: string,
  secretKey: string
): SignedQR {
  const payload: QRPayload = {
    donation_id,
    volunteer_id,
    ngo_id,
    expected_delivery: Date.now() + 5 * 60 * 1000, // expires in 5 mins
    issued_at: Date.now(),
  };

  // Deterministic serialization — sorted keys prevent ordering attacks
  const canonicalString = JSON.stringify(payload, Object.keys(payload).sort());

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(canonicalString)
    .digest('hex');

  return { payload, signature };
}

/**
 * Verify a HMAC-SHA256 signed QR payload
 * Returns: { valid: boolean, reason?: string }
 */
export function verifyQRPayload(
  signedQR: SignedQR,
  secretKey: string
): { valid: boolean; reason?: string } {
  const { payload, signature } = signedQR;

  // 1. Check expiry window (5 minutes)
  if (Date.now() > payload.expected_delivery) {
    return { valid: false, reason: 'QR code has expired' };
  }

  // 2. Recompute HMAC using same canonical serialization
  const canonicalString = JSON.stringify(payload, Object.keys(payload).sort());
  const expectedSig = crypto
    .createHmac('sha256', secretKey)
    .update(canonicalString)
    .digest('hex');

  // 3. Timing-safe comparison to prevent timing attacks
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSig, 'hex')
    );
    return isValid ? { valid: true } : { valid: false, reason: 'Invalid signature' };
  } catch {
    return { valid: false, reason: 'Malformed signature' };
  }
}
