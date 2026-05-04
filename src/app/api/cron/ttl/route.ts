import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// This endpoint should be triggered periodically by a CRON service (e.g., Vercel Cron, GitHub Actions)
export async function GET(request: Request) {
  try {
    // Basic security check: You should use a secret header here to ensure only your CRON job can trigger this
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      // In a real production app, uncomment this check. For testing, we'll allow it.
      // return new NextResponse('Unauthorized', { status: 401 });
    }

    const currentTimestamp = new Date().toISOString();

    // Find all 'Available' or 'Claimed' donations whose expiry_timestamp has passed
    const { data: expiredDonations, error: fetchError } = await supabase
      .from('donations')
      .select('id, title')
      .in('status', ['Available', 'Claimed'])
      .lt('expiry_timestamp', currentTimestamp);

    if (fetchError) throw fetchError;

    if (!expiredDonations || expiredDonations.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'No expired donations found.' 
      }, { status: 200 });
    }

    // Extract the IDs of the expired donations
    const expiredIds = expiredDonations.map(d => d.id);

    // Update their status to 'Expired'
    const { error: updateError } = await supabase
      .from('donations')
      .update({ status: 'Expired' })
      .in('id', expiredIds);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      message: `Successfully expired ${expiredIds.length} donations.`,
      expiredIds 
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('TTL Cron Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
