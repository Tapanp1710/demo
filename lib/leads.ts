/**
 * Lead delivery adapter.
 *
 * The destination endpoint is UNCONFIRMED (see OPEN-QUESTIONS.md). Everything
 * else — validation, the API route, the form's success and error states — is
 * finished and tested, so wiring the real destination is a change to exactly
 * one function below.
 *
 * The console adapter is deliberately loud: a form that silently drops leads is
 * the worst possible failure for this site, so an unconfigured deployment must
 * be obvious in the server log rather than look like success.
 */

export interface Lead {
  name: string;
  email: string;
  phone: string;
  preference: string;
  consent: boolean;
  submittedAt: string;
  source: string;
}

export interface LeadResult {
  ok: boolean;
  /** Message safe to show the person who filled the form in. */
  message: string;
}

export type LeadAdapter = (lead: Lead) => Promise<LeadResult>;

/** Fallback while the destination is unknown. Logs and reports success to the user. */
const consoleAdapter: LeadAdapter = async (lead) => {
  console.warn(
    '[leads] NO DESTINATION CONFIGURED — lead captured to log only.\n' +
    '        Set LEAD_WEBHOOK_URL, or replace the adapter in lib/leads.ts.\n' +
    JSON.stringify(lead, null, 2),
  );
  return { ok: true, message: 'received' };
};

/** POSTs the lead as JSON. Enabled by setting LEAD_WEBHOOK_URL. */
const webhookAdapter = (url: string): LeadAdapter => async (lead) => {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(lead),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`webhook responded ${res.status}`);
  return { ok: true, message: 'received' };
};

/** THE ONE-LINE CHANGE: point this at the real destination once confirmed. */
export function getLeadAdapter(): LeadAdapter {
  const url = process.env.LEAD_WEBHOOK_URL;
  return url ? webhookAdapter(url) : consoleAdapter;
}

/** Server-side validation. Never trust the client's own checks. */
export function validateLead(input: unknown): { lead?: Lead; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  const b = (input ?? {}) as Record<string, unknown>;

  const name = String(b.name ?? '').trim();
  const email = String(b.email ?? '').trim();
  const phone = String(b.phone ?? '').trim();
  const preference = String(b.preference ?? '').trim();
  const consent = b.consent === true || b.consent === 'true' || b.consent === 'on';

  if (name.length < 2) errors.name = 'Please enter your name';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = 'Please enter a valid email address';
  // Indian mobile numbers, with or without +91 / leading 0.
  if (!/^(?:\+?91[-\s]?)?0?[6-9]\d{9}$/.test(phone.replace(/[\s-]/g, ''))) {
    errors.phone = 'Please enter a valid 10-digit phone number';
  }
  if (!preference) errors.preference = 'Please select your preference';
  if (!consent) errors.consent = 'Please accept to be contacted';

  if (Object.keys(errors).length) return { errors };

  return {
    errors: {},
    lead: {
      name, email, phone, preference, consent,
      submittedAt: new Date().toISOString(),
      source: 'bricksmarvella.in lead form',
    },
  };
}
