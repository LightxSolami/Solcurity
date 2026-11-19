import { NextRequest, NextResponse } from 'next/server';
import { BOT_TOKEN, WEBHOOK_URL } from '@/lib/telegram/bot';
import { hasBearerToken, secureEquals } from '@/lib/telegram/auth';
import { bot } from '@/lib/telegram/handler';
import type { Update } from '@/lib/telegram/bot';

export const runtime = 'nodejs';

function isTelegramUpdate(value: unknown): value is Update {
  if (!value || typeof value !== 'object') return false;
  const updateId = (value as Record<string, unknown>).update_id;
  return typeof updateId === 'number' && Number.isInteger(updateId) && updateId >= 0;
}

export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'Webhook secret is not configured' }, { status: 503 });
  }
  const suppliedSecret = request.headers.get('x-telegram-bot-api-secret-token');
  if (!suppliedSecret || !secureEquals(secret, suppliedSecret)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: 'Telegram bot is not configured' }, { status: 503 });
  }

  let update: unknown;
  try {
    update = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!isTelegramUpdate(update)) {
    return NextResponse.json({ ok: false, error: 'Invalid update' }, { status: 400 });
  }

  try {
    await bot.processUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to process update' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (!action) {
    return NextResponse.json({ ok: true, message: 'Solcurity Telegram webhook endpoint' });
  }
  if (!['set', 'delete', 'info', 'me'].includes(action)) {
    return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
  }
  if (!process.env.TELEGRAM_WEBHOOK_ADMIN_TOKEN) {
    return NextResponse.json({ ok: false, error: 'Webhook admin access is not configured' }, { status: 503 });
  }
  if (!hasBearerToken(request.headers.get('authorization'), process.env.TELEGRAM_WEBHOOK_ADMIN_TOKEN)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!BOT_TOKEN) {
    return NextResponse.json({ ok: false, error: 'Telegram bot is not configured' }, { status: 503 });
  }
  if (action === 'set' && !process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, error: 'Webhook secret is not configured' }, { status: 503 });
  }

  const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}`;
  const endpoint = action === 'set'
    ? `${telegramUrl}/setWebhook`
    : `${telegramUrl}/${action === 'delete' ? 'deleteWebhook' : action === 'info' ? 'getWebhookInfo' : 'getMe'}`;

  try {
    const result = await fetch(endpoint, action === 'set' ? {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: `${WEBHOOK_URL}/api/telegram/webhook`,
        allowed_updates: ['message', 'callback_query'],
        secret_token: process.env.TELEGRAM_WEBHOOK_SECRET,
      }),
    } : { method: action === 'delete' ? 'POST' : 'GET' });
    return NextResponse.json(await result.json(), { status: result.ok ? 200 : 502 });
  } catch (error) {
    console.error('Telegram webhook administration failed:', error);
    return NextResponse.json({ ok: false, error: 'Telegram API request failed' }, { status: 502 });
  }
}