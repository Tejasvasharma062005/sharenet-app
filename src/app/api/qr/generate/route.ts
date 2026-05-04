import { NextResponse } from 'next/server';
import { generateQRPayload } from '@/services/qr-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { donation_id, volunteer_id, ngo_id } = body;

    if (!donation_id || !volunteer_id || !ngo_id) {
      return NextResponse.json(
        { error: 'Missing required fields: donation_id, volunteer_id, ngo_id' },
        { status: 400 }
      );
    }

    const secretKey = process.env.HMAC_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Server misconfiguration: Missing HMAC_SECRET_KEY' }, { status: 500 });
    }

    // Generate the HMAC-SHA256 signed QR payload using the dedicated service
    const signedQR = generateQRPayload(donation_id, volunteer_id, ngo_id, secretKey);

    return NextResponse.json(signedQR, { status: 200 });
  } catch (error: any) {
    console.error('QR Generate Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
