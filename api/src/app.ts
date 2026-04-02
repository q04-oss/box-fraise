import 'dotenv/config';
import * as Sentry from '@sentry/node';
import express from 'express';
import rateLimit from 'express-rate-limit';
import path from 'path';
import varietiesRouter from './routes/varieties';
import { locationsRouter, slotsRouter, timeSlotsPublicRouter } from './routes/locations';
import ordersRouter from './routes/orders';
import stripeRouter from './routes/stripe';
import adminRouter from './routes/admin';
import chocolatierRouter from './routes/chocolatier';
import supplierRouter from './routes/supplier';
import verifyRouter from './routes/verify';
import standingOrdersRouter from './routes/standing-orders';
import usersRouter from './routes/users';
import giftNoteRouter from './routes/gift-note';
import campaignsRouter from './routes/campaigns';
import businessesRouter from './routes/businesses';
import posRouter from './routes/pos';
import askRouter from './routes/ask';
import authRouter from './routes/auth';
import popupsRouter from './routes/popups';
import popupRequestsRouter from './routes/popup-requests';
import campaignCommissionsRouter from './routes/campaign-commissions';
import contractsRouter from './routes/contracts';
import searchRouter from './routes/search';
import { membershipsRouter, membersRouter, fundRouter } from './routes/memberships';
import editorialRouter from './routes/editorial';
import { logger } from './lib/logger';

const app = express();

const limiter = rateLimit({ windowMs: 60_000, max: 120, standardHeaders: true, legacyHeaders: false });
app.use('/api', limiter);

// Raw body for Stripe webhook — must be registered before express.json()
app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.use('/api/varieties', varietiesRouter);
app.use('/api/locations', locationsRouter);
app.use('/api/slots', slotsRouter);
app.use('/api/time-slots', timeSlotsPublicRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/stripe', stripeRouter);
app.use('/api/admin', adminRouter);
app.use('/api/chocolatier', chocolatierRouter);
app.use('/api/supplier', supplierRouter);
app.use('/api/verify', verifyRouter);
app.use('/api/standing-orders', standingOrdersRouter);
app.use('/api/users', usersRouter);
app.use('/api/gift-note', giftNoteRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/businesses', businessesRouter);
app.use('/api/pos', posRouter);
app.use('/api/ask', askRouter);
app.use('/api/auth', authRouter);
app.use('/api/popups', popupsRouter);
app.use('/api/popup-requests', popupRequestsRouter);
app.use('/api/campaign-commissions', campaignCommissionsRouter);
app.use('/api/contracts', contractsRouter);
app.use('/api/search', searchRouter);
app.use('/api/memberships', membershipsRouter);
app.use('/api/members', membersRouter);
app.use('/api/fund', fundRouter);
app.use('/api/editorial', editorialRouter);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use(express.static(path.join(__dirname, '../public')));

app.get('/operator', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/operator.html'));
});

app.get('/privacy', (_req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Privacy Policy — Maison Fraise</title>
  <style>body{font-family:Georgia,serif;max-width:680px;margin:60px auto;padding:0 24px;color:#1a1a1a;line-height:1.7}h1{font-size:24px}h2{font-size:18px;margin-top:32px}p{margin:12px 0}</style></head>
  <body><h1>Privacy Policy</h1><p>Last updated: ${new Date().toLocaleDateString('en-CA')}</p>
  <p>Maison Fraise ("we", "our") operates the Maison Fraise mobile application. This policy describes how we collect, use, and protect your information.</p>
  <h2>Information We Collect</h2><p>We collect your name, email address, and Apple ID when you sign in with Apple. We collect order information including variety, quantity, pickup location, and payment details processed by Stripe.</p>
  <h2>How We Use Your Information</h2><p>We use your information to process orders, send order confirmations and status updates, and improve our service. We do not sell your personal information.</p>
  <h2>Data Retention</h2><p>We retain order records for accounting purposes. You may request deletion of your account by contacting us.</p>
  <h2>Contact</h2><p>For privacy inquiries: privacy@maison-fraise.com</p>
  </body></html>`);
});

app.get('/terms', (_req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Terms of Service — Maison Fraise</title>
  <style>body{font-family:Georgia,serif;max-width:680px;margin:60px auto;padding:0 24px;color:#1a1a1a;line-height:1.7}h1{font-size:24px}h2{font-size:18px;margin-top:32px}p{margin:12px 0}</style></head>
  <body><h1>Terms of Service</h1><p>Last updated: ${new Date().toLocaleDateString('en-CA')}</p>
  <p>By using the Maison Fraise app, you agree to these terms.</p>
  <h2>Orders</h2><p>All orders are final. Refunds are issued at our discretion for quality issues. Orders not collected within 2 hours of the designated time slot may be forfeited.</p>
  <h2>Payments</h2><p>Payments are processed securely by Stripe. We do not store card details.</p>
  <h2>Accounts</h2><p>You are responsible for maintaining the security of your account. We may terminate accounts that violate these terms.</p>
  <h2>Contact</h2><p>For support: hello@maison-fraise.com</p>
  </body></html>`);
});

app.get('/support', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/support.html'));
});

// Sentry error handler — must be after all routes
app.use(Sentry.expressErrorHandler());

export default app;
