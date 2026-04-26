import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL as BASE_URL } from '../config/api';

const FRAISE = `${BASE_URL}/api/fraise`;
const TOKEN_KEY = 'fraise_member_token';

// ── Token ─────────────────────────────────────────────────────────────────────

export async function getMemberToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}
export async function setMemberToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}
export async function deleteMemberToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}
async function h(): Promise<Record<string, string>> {
  const t = await getMemberToken();
  return t ? { 'x-member-token': t } : {};
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FraiseEvent {
  id: number;
  title: string;
  description: string | null;
  price_cents: number;
  min_seats: number;
  max_seats: number;
  seats_claimed: number;
  status: 'open' | 'threshold_met' | 'confirmed';
  event_date: string | null;
  created_at: string;
  business_slug: string;
  business_name: string;
  business_lat: number | null;
  business_lng: number | null;
}

export interface FraiseMember {
  id: number;
  name: string;
  email: string;
  credit_balance: number;
  credits_purchased: number;
  created_at: string;
}

export interface FraiseClaim {
  id: number;
  status: string;
  created_at: string;
  event_id: number;
  title: string;
  description: string | null;
  price_cents: number;
  min_seats: number;
  max_seats: number;
  seats_claimed: number;
  event_status: string;
  event_date: string | null;
  business_name: string;
  business_slug: string;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function memberLogin(email: string, password: string): Promise<FraiseMember & { token: string }> {
  const r = await fetch(`${FRAISE}/members/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'login failed');
  return data;
}

export async function memberSignup(name: string, email: string, password: string): Promise<FraiseMember & { token: string }> {
  const r = await fetch(`${FRAISE}/members/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'signup failed');
  return data;
}

export async function fetchMe(): Promise<FraiseMember | null> {
  const headers = await h();
  if (!headers['x-member-token']) return null;
  const r = await fetch(`${FRAISE}/members/me`, { headers });
  if (!r.ok) return null;
  return r.json();
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function fetchEvents(): Promise<FraiseEvent[]> {
  const r = await fetch(`${FRAISE}/events`);
  if (!r.ok) return [];
  const data = await r.json();
  return data.events || [];
}

// ── Claims ────────────────────────────────────────────────────────────────────

export async function fetchMyClaims(): Promise<FraiseClaim[]> {
  const headers = await h();
  if (!headers['x-member-token']) return [];
  const r = await fetch(`${FRAISE}/members/claims`, { headers });
  if (!r.ok) return [];
  const data = await r.json();
  return data.claims || [];
}

export async function claimEvent(eventId: number): Promise<{ credit_balance: number; seats_claimed: number }> {
  const headers = await h();
  const r = await fetch(`${FRAISE}/events/${eventId}/claim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'claim failed');
  return data;
}

export async function declineClaim(eventId: number): Promise<{ credit_balance: number }> {
  const headers = await h();
  const r = await fetch(`${FRAISE}/events/${eventId}/decline`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'decline failed');
  return data;
}

// ── Credits ───────────────────────────────────────────────────────────────────

export async function creditsCheckout(credits: number): Promise<{ client_secret: string; amount_cents: number }> {
  const headers = await h();
  const r = await fetch(`${FRAISE}/members/credits/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ credits }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'checkout failed');
  return data;
}

export async function creditsConfirm(paymentIntentId: string): Promise<{ credit_balance: number; credits_added: number }> {
  const headers = await h();
  const r = await fetch(`${FRAISE}/members/credits/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ payment_intent_id: paymentIntentId }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'confirm failed');
  return data;
}

// ── Push token ────────────────────────────────────────────────────────────────

export async function updatePushToken(pushToken: string): Promise<void> {
  const headers = await h();
  if (!headers['x-member-token']) return;
  await fetch(`${FRAISE}/members/push-token`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ push_token: pushToken }),
  }).catch(() => {});
}
