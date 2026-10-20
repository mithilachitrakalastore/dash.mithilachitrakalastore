import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { registerAIDashboardRoutes } from './aiDashboardServer.js';
import { registerTavroRoutes } from './tavroServer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';
dotenv.config({ path: path.join(__dirname, '.env'), quiet: true });
if (!isProduction) {
    dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: false, quiet: true });
}

const app = express();
const PORT = Number(process.env.PORT || 4173);
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (!isProduction ? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY : '');
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const tokenSecret = process.env.ADMIN_EMAIL_TOKEN_SECRET || supabaseKey || '';
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const cloudinary = {
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME || '',
};
const allowedOrigins = [
    process.env.AI_DASHBOARD_ORIGINS,
    process.env.AI_DASHBOARD_PUBLIC_URL,
]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

if (!supabaseUrl || !supabaseKey) {
    console.error('AI dashboard server requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}
if (!supabaseAnonKey) {
    console.warn('Supabase anon key is not configured; Google sign-in will be unavailable.');
}
if (!tokenSecret) {
    console.error('AI dashboard server requires ADMIN_EMAIL_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const genAI = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
const tavroGenAI = geminiApiKey
    ? new GoogleGenAI({
        apiKey: geminiApiKey,
        httpOptions: { timeout: 30_000, retryOptions: { attempts: 1 } },
    })
    : null;

const hashPassword = (password) => Buffer.from(`mcs-salt-${password}`).toString('base64');

const createAdminToken = (adminId) => {
    const payload = Buffer.from(JSON.stringify({
        sub: String(adminId),
        exp: Date.now() + (12 * 60 * 60 * 1000),
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
};

const createGoogleLinkGrant = (adminId) => {
    const payload = Buffer.from(JSON.stringify({
        sub: String(adminId),
        purpose: 'google-admin-link',
        exp: Date.now() + (5 * 60 * 1000),
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', tokenSecret).update(payload).digest('base64url');
    return `${payload}.${signature}`;
};

const verifyGoogleLinkGrant = (token) => {
    const [payload, signature] = String(token || '').split('.');
    if (!payload || !signature) return null;
    const expectedSignature = crypto.createHmac('sha256', tokenSecret).update(payload).digest();
    const providedSignature = Buffer.from(signature, 'base64url');
    if (providedSignature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(providedSignature, expectedSignature)) return null;
    try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (decoded.purpose !== 'google-admin-link' ||
            !decoded.sub ||
            !Number.isFinite(decoded.exp) ||
            decoded.exp <= Date.now()) return null;
        return String(decoded.sub);
    } catch {
        return null;
    }
};

const verifyAdminToken = (req) => {
    const token = String(req.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return null;

    const expectedSignature = crypto.createHmac('sha256', tokenSecret).update(payload).digest();
    const providedSignature = Buffer.from(signature, 'base64url');
    if (providedSignature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(providedSignature, expectedSignature)) return null;

    try {
        const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
        if (!decoded.sub || !Number.isFinite(decoded.exp) || decoded.exp <= Date.now()) return null;
        return String(decoded.sub);
    } catch {
        return null;
    }
};

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, '')) || !isProduction) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '512kb' }));

app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        app: 'Mithila Chitrakala AI Dashboard',
        mode: 'standalone',
    });
});

registerAIDashboardRoutes({
    app,
    supabase,
    genAI,
    model: geminiModel,
    verifyAdminToken,
    tokenSecret,
    hashPassword,
    createAdminToken,
    createGoogleLinkGrant,
    verifyGoogleLinkGrant,
    cloudinary,
});

registerTavroRoutes({
    app,
    supabase,
    genAI: tavroGenAI,
    model: geminiModel,
    verifyAdminToken,
});

const distPath = path.join(__dirname, 'dist');
if (!fs.existsSync(path.join(distPath, 'index.html'))) {
    console.error('AI dashboard build is missing. Run "npm run build" before starting the server.');
    process.exit(1);
}
app.use(express.static(distPath));

app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'AI dashboard API endpoint not found.' });
});

app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`AI Dashboard server is running on port ${PORT}`);
});
