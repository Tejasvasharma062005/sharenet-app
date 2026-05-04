import { NextResponse } from 'next/server';
import { verifyQRPayload, SignedQR } from '@/services/qr-service';
import { createClient } from '@supabase/supabase-js';

// Use service-role client for trusted server-side writes
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body: SignedQR = await request.json();
    const { payload, signature } = body;

    if (!payload || !signature) {
      return NextResponse.json({ error: 'Missing payload or signature' }, { status: 400 });
    }

    const secretKey = process.env.HMAC_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    // Verify using the dedicated service (includes timing-safe compare + expiry check)
    const result = verifyQRPayload({ payload, signature }, secretKey);

    if (!result.valid) {
      return NextResponse.json({ error: result.reason || 'Invalid QR code' }, { status: 401 });
    }

    // Verification passed — update delivery record and donation status
    const { donation_id, volunteer_id } = payload;

    // 1. Update donation to Delivered
    const { error: donationError } = await supabaseAdmin
      .from('donations')
      .update({ status: 'Delivered' })
      .eq('id', donation_id);

    if (donationError) throw donationError;

    // 2. Record the delivery completion
    const { error: deliveryError } = await supabaseAdmin
      .from('deliveries')
      .update({ status: 'delivered', dropoff_time: new Date().toISOString() })
      .eq('donation_id', donation_id)
      .eq('volunteer_id', volunteer_id);

    if (deliveryError) throw deliveryError;

    return NextResponse.json({
      success: true,
      message: 'QR verified. Delivery completed and recorded.',
      donation_id,
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('QR Verification Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
