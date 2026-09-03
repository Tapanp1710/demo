import { NextResponse } from 'next/server';
import { getLeadAdapter, validateLead } from '@/lib/leads';

/**
 * Lead intake. Validates server-side, then hands off to whichever adapter is
 * configured (see lib/leads.ts — currently the console fallback, because the
 * destination is unconfirmed).
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, errors: { form: 'Malformed request' } }, { status: 400 });
  }

  const { lead, errors } = validateLead(body);
  if (!lead) return NextResponse.json({ ok: false, errors }, { status: 422 });

  try {
    const result = await getLeadAdapter()(lead);
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    // The lead is still logged so it is never lost to a delivery outage.
    console.error('[leads] delivery failed:', err, JSON.stringify(lead));
    return NextResponse.json(
      { ok: false, errors: { form: 'delivery-failed' } },
      { status: 502 },
    );
  }
}
