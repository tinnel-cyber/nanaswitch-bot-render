/**
 * @file vipHostAccreditationController.ts
 * @description Système d'Accréditation des Hôtes de Salons VIP (Grade Élevé) persisté dans Supabase SQL :
 * - Collecte des atouts & points dans tous les secteurs (Commerce/Finance, Savoir/LMS, Audience, Affiliation, Confiance KYC)
 * - Attribution automatique des Badges & Grades (Prestige, Souverain, Impérial)
 * - Tarification dynamique de rareté : 50 000 F CFA d'activation (+5% tous les 5 hôtes activés) + 40 000 F CFA / mois
 * - Persistance primaire dans Supabase Postgres (public.vip_host_accreditations) + contrôle d'identité Bearer
 */

import type { Express, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export type VipHostGrade = 'NON_ELIGIBLE' | 'PRESTIGE' | 'SOUVERAIN' | 'IMPERIAL';

export interface VipSectorScore {
  id: 'commerce' | 'knowledge' | 'audience' | 'affiliate' | 'trust';
  label: string;
  points: number;
  maxPoints: number;
  badgeName: string;
  badgeEarned: boolean;
  details: string;
}

export interface VipHostAccreditationRecord {
  userId: string;
  universeId: string;
  email?: string;
  fullName?: string;
  score: number;
  grade: VipHostGrade;
  badges: string[];
  sectors: VipSectorScore[];
  isActivated: boolean;
  activatedAt?: string;
  expiresAt?: string;
  activationPricePaidXof?: number;
  monthlyFeeXof: number;
  multiStreamingUnlocked: boolean;
  transactionRef?: string;
}

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://wsxnznobeefrsoicjqte.supabase.co';
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  '';

const supabaseAdmin = supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

const DATA_DIR = path.join(process.cwd(), 'data');
const ACCREDITATION_FILE = path.join(DATA_DIR, 'vip_host_accreditations.json');
const COUNTER_FILE = path.join(DATA_DIR, 'vip_host_activation_counter.json');

const BASE_ACTIVATION_PRICE_XOF = 50000;
const MONTHLY_FEE_XOF = 40000;
const STEP_SIZE = 5;
const STEP_INCREASE_RATE = 0.05; // +5% après chaque activation de 5 personnes

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readLocalAccreditations(): VipHostAccreditationRecord[] {
  ensureDataDir();
  if (!fs.existsSync(ACCREDITATION_FILE)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(ACCREDITATION_FILE, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalAccreditations(list: VipHostAccreditationRecord[]) {
  ensureDataDir();
  fs.writeFileSync(ACCREDITATION_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

function mapRowToRecord(row: any): VipHostAccreditationRecord {
  return {
    userId: row.user_id,
    universeId: row.universe_id,
    email: row.email || undefined,
    fullName: row.full_name || undefined,
    score: Number(row.score || 0),
    grade: (row.grade as VipHostGrade) || 'NON_ELIGIBLE',
    badges: Array.isArray(row.badges) ? row.badges : [],
    sectors: Array.isArray(row.sectors) ? row.sectors : [],
    isActivated: Boolean(row.is_activated),
    activatedAt: row.activated_at || undefined,
    expiresAt: row.expires_at || undefined,
    activationPricePaidXof: row.activation_price_paid_xof ?? undefined,
    monthlyFeeXof: Number(row.monthly_fee_xof || MONTHLY_FEE_XOF),
    multiStreamingUnlocked: Boolean(row.multi_streaming_unlocked),
    transactionRef: row.transaction_ref || undefined,
  };
}

async function getActivationCountFromDb(): Promise<number> {
  if (supabaseAdmin) {
    try {
      const { count, error } = await supabaseAdmin
        .from('vip_host_accreditations')
        .select('id', { count: 'exact', head: true })
        .eq('is_activated', true);
      if (!error && typeof count === 'number') {
        return count;
      }
    } catch {}
  }
  if (fs.existsSync(COUNTER_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf-8'));
      return Math.max(0, Number(parsed?.activationCount || 0));
    } catch {}
  }
  return readLocalAccreditations().filter((a) => a.isActivated).length;
}

async function findExistingAccreditation(userId: string, universeId: string): Promise<VipHostAccreditationRecord | null> {
  if (supabaseAdmin) {
    try {
      const filters: string[] = [];
      if (userId) filters.push(`user_id.eq.${userId}`);
      if (universeId) filters.push(`universe_id.eq.${universeId}`);
      if (filters.length > 0) {
        const { data, error } = await supabaseAdmin
          .from('vip_host_accreditations')
          .select('*')
          .or(filters.join(','))
          .limit(1)
          .maybeSingle();
        if (!error && data) return mapRowToRecord(data);
      }
    } catch {}
  }
  const local = readLocalAccreditations();
  return local.find((r) => (userId && r.userId === userId) || (universeId && r.universeId === universeId)) || null;
}

async function persistAccreditationToDb(record: VipHostAccreditationRecord): Promise<void> {
  const rowId = record.universeId || record.userId;
  if (supabaseAdmin) {
    const { error } = await supabaseAdmin.from('vip_host_accreditations').upsert(
      {
        id: rowId,
        user_id: record.userId,
        universe_id: record.universeId,
        email: record.email || null,
        full_name: record.fullName || null,
        score: record.score,
        grade: record.grade,
        badges: record.badges,
        sectors: record.sectors,
        is_activated: record.isActivated,
        activated_at: record.activatedAt || null,
        expires_at: record.expiresAt || null,
        activation_price_paid_xof: record.activationPricePaidXof ?? null,
        monthly_fee_xof: record.monthlyFeeXof,
        multi_streaming_unlocked: record.multiStreamingUnlocked,
        transaction_ref: record.transactionRef || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.error('[VIP HOST SUPABASE UPSERT ERROR]', error.message);
    }
  }

  const list = readLocalAccreditations();
  const idx = list.findIndex((r) => r.userId === record.userId || r.universeId === record.universeId);
  if (idx >= 0) list[idx] = record;
  else list.push(record);
  writeLocalAccreditations(list);

  ensureDataDir();
  const totalActivated = list.filter((a) => a.isActivated).length;
  fs.writeFileSync(COUNTER_FILE, JSON.stringify({ activationCount: totalActivated, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
}

export function computeDynamicVipPricing(activationCount: number) {
  const tierSteps = Math.floor(Math.max(0, activationCount) / STEP_SIZE);
  const currentActivationPriceXof = Math.round(
    BASE_ACTIVATION_PRICE_XOF * Math.pow(1 + STEP_INCREASE_RATE, tierSteps)
  );
  const nextActivationPriceXof = Math.round(
    BASE_ACTIVATION_PRICE_XOF * Math.pow(1 + STEP_INCREASE_RATE, tierSteps + 1)
  );
  const remainingInCurrentTier = STEP_SIZE - (Math.max(0, activationCount) % STEP_SIZE);
  return {
    activationCount,
    tierSteps,
    baseActivationPriceXof: BASE_ACTIVATION_PRICE_XOF,
    currentActivationPriceXof,
    nextActivationPriceXof,
    monthlyFeeXof: MONTHLY_FEE_XOF,
    totalFirstActivationXof: currentActivationPriceXof + MONTHLY_FEE_XOF,
    remainingInCurrentTier,
  };
}

export function computeSectorScoring(metrics: {
  revenueXof?: number;
  walletBalanceXof?: number;
  productsCount?: number;
  coursesCount?: number;
  studentsCount?: number;
  liveSessionsCount?: number;
  audienceCount?: number;
  affiliatesCount?: number;
  affiliateVolumeXof?: number;
  kycVerified?: boolean;
  openDisputesCount?: number;
}) {
  const rev = Math.max(0, Number(metrics.revenueXof || 0));
  const wallet = Math.max(0, Number(metrics.walletBalanceXof || 0));
  const products = Math.max(0, Number(metrics.productsCount || 0));
  const courses = Math.max(0, Number(metrics.coursesCount || 0));
  const students = Math.max(0, Number(metrics.studentsCount || 0));
  const lives = Math.max(0, Number(metrics.liveSessionsCount || 0));
  const audience = Math.max(0, Number(metrics.audienceCount || 0));
  const affiliates = Math.max(0, Number(metrics.affiliatesCount || 0));
  const affiliateVol = Math.max(0, Number(metrics.affiliateVolumeXof || 0));
  const kycOk = Boolean(metrics.kycVerified);
  const disputes = Math.max(0, Number(metrics.openDisputesCount || 0));

  let commercePts = 0;
  if (products >= 1) commercePts += 10;
  if (rev >= 50000 || wallet >= 50000) commercePts += 15;
  else if (rev >= 10000 || wallet >= 10000) commercePts += 7;

  let knowledgePts = 0;
  if (courses >= 1) knowledgePts += 15;
  if (students >= 10) knowledgePts += 10;
  else if (students >= 1) knowledgePts += 5;

  let audiencePts = 0;
  if (lives >= 1) audiencePts += 10;
  if (audience >= 50) audiencePts += 10;
  else if (audience >= 10) audiencePts += 5;

  let affiliatePts = 0;
  if (affiliates >= 3) affiliatePts += 10;
  else if (affiliates >= 1) affiliatePts += 5;
  if (affiliateVol >= 25000) affiliatePts += 10;
  else if (affiliateVol > 0) affiliatePts += 5;

  let trustPts = 0;
  if (kycOk && disputes === 0) trustPts = 10;
  else if (disputes === 0) trustPts = 5;

  const sectors: VipSectorScore[] = [
    {
      id: 'commerce',
      label: 'Commerce & Valeur Financière',
      points: commercePts,
      maxPoints: 25,
      badgeName: 'Bâtisseur Commerce',
      badgeEarned: commercePts >= 15,
      details: `${products} produit(s) • ${rev.toLocaleString('fr-FR')} F CFA encaissés`,
    },
    {
      id: 'knowledge',
      label: 'Savoir & Formations',
      points: knowledgePts,
      maxPoints: 25,
      badgeName: 'Maître du Savoir',
      badgeEarned: knowledgePts >= 15,
      details: `${courses} formation(s) • ${students} apprenant(s)`,
    },
    {
      id: 'audience',
      label: 'Audience & Spectateurs',
      points: audiencePts,
      maxPoints: 20,
      badgeName: "Aimant d'Audience",
      badgeEarned: audiencePts >= 10,
      details: `${lives} live(s) • ${audience} spectateur(s)`,
    },
    {
      id: 'affiliate',
      label: 'Affiliation & Influence',
      points: affiliatePts,
      maxPoints: 20,
      badgeName: 'Leader Affiliation',
      badgeEarned: affiliatePts >= 10,
      details: `${affiliates} affilié(s) • ${affiliateVol.toLocaleString('fr-FR')} F CFA générés`,
    },
    {
      id: 'trust',
      label: 'Confiance KYC & Zéro Litige',
      points: trustPts,
      maxPoints: 10,
      badgeName: 'Tiers de Confiance',
      badgeEarned: kycOk && disputes === 0,
      details: kycOk ? 'Identité KYC vérifiée' : 'KYC en attente de validation',
    },
  ];

  const totalScore = sectors.reduce((sum, s) => sum + s.points, 0);
  const badges = sectors.filter((s) => s.badgeEarned).map((s) => s.badgeName);

  let grade: VipHostGrade = 'NON_ELIGIBLE';
  if (totalScore >= 85) grade = 'IMPERIAL';
  else if (totalScore >= 60) grade = 'SOUVERAIN';
  else if (totalScore >= 30) grade = 'PRESTIGE';

  const hasRealAsset = products >= 1 || courses >= 1 || lives >= 1 || affiliates >= 1 || rev > 0 || wallet >= 10000;
  const meetsMinimumPaymentCriteria = disputes === 0 && hasRealAsset && totalScore >= 15;

  return {
    totalScore,
    grade,
    badges,
    sectors,
    meetsMinimumPaymentCriteria,
    failureReasons: [
      ...(disputes > 0 ? ['Vous avez un litige en cours non résolu.'] : []),
      ...(!hasRealAsset ? ['Ajoutez au moins un actif réel (produit, formation, live ou affilié parrainé).'] : []),
      ...(totalScore < 15 ? ['Score d’atouts insuffisant (minimum 15 points requis pour activer par paiement).'] : []),
    ],
  };
}

export function attachVipHostAccreditationRoutes(app: Express): void {
  // 1. GET /api/vip/host/eligibility — Calcul du score, badges, grade et prix dynamique (Supabase)
  app.get('/api/vip/host/eligibility', async (req: Request, res: Response) => {
    const userId = String(req.query.userId || '').trim();
    const universeId = String(req.query.universeId || '').trim();
    const isSuperAdmin = String(req.query.isSuperAdmin || '') === 'true';

    const metrics = {
      revenueXof: Number(req.query.revenueXof || 0),
      walletBalanceXof: Number(req.query.walletBalanceXof || 0),
      productsCount: Number(req.query.productsCount || 0),
      coursesCount: Number(req.query.coursesCount || 0),
      studentsCount: Number(req.query.studentsCount || 0),
      liveSessionsCount: Number(req.query.liveSessionsCount || 0),
      audienceCount: Number(req.query.audienceCount || 0),
      affiliatesCount: Number(req.query.affiliatesCount || 0),
      affiliateVolumeXof: Number(req.query.affiliateVolumeXof || 0),
      kycVerified: String(req.query.kycVerified || '') === 'true' || isSuperAdmin,
      openDisputesCount: Number(req.query.openDisputesCount || 0),
    };

    const scoring = computeSectorScoring(metrics);
    const activationCount = await getActivationCountFromDb();
    const pricing = computeDynamicVipPricing(activationCount);
    const existing = await findExistingAccreditation(userId, universeId);

    const isActiveHost = Boolean(
      isSuperAdmin ||
      (existing?.isActivated && (!existing.expiresAt || new Date(existing.expiresAt).getTime() > Date.now()))
    );

    return res.json({
      success: true,
      scoring: {
        ...scoring,
        grade: isSuperAdmin ? 'IMPERIAL' : scoring.grade,
        meetsMinimumPaymentCriteria: isSuperAdmin ? true : scoring.meetsMinimumPaymentCriteria,
      },
      pricing,
      accreditation: existing,
      isActiveHost,
      multiStreamingUnlocked: Boolean(
        isSuperAdmin || (isActiveHost && (scoring.grade === 'SOUVERAIN' || scoring.grade === 'IMPERIAL' || existing?.multiStreamingUnlocked))
      ),
    });
  });

  // 2. POST /api/vip/host/activate — Activation persistée dans Supabase SQL (protégée Bearer)
  app.post('/api/vip/host/activate', async (req: Request, res: Response) => {
    try {
      const authHeader = String(req.headers.authorization || '');
      if (supabaseAdmin && authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7).trim();
        const { data: userData, error: authErr } = await supabaseAdmin.auth.getUser(token);
        if (authErr || !userData?.user) {
          return res.status(401).json({ success: false, error: 'Session expirée ou invalide.' });
        }
      } else if (process.env.NODE_ENV === 'production' && supabaseAdmin) {
        return res.status(401).json({ success: false, error: 'Authentification requise.' });
      }

      const {
        userId = '',
        universeId = '',
        email = '',
        fullName = '',
        transactionId = '',
        amountPaidXof = 0,
        metrics = {},
      } = req.body || {};

      if (!userId && !universeId) {
        return res.status(400).json({ success: false, error: 'Identifiant utilisateur ou boutique requis.' });
      }
      if (!transactionId || String(transactionId).trim().length < 6) {
        return res.status(400).json({ success: false, error: 'Référence de transaction vérifiée requise.' });
      }

      const scoring = computeSectorScoring(metrics);
      if (!scoring.meetsMinimumPaymentCriteria) {
        return res.status(403).json({
          success: false,
          error: scoring.failureReasons[0] || 'Critères minimaux non remplis pour activer un Salon VIP.',
          failureReasons: scoring.failureReasons,
        });
      }

      const currentCount = await getActivationCountFromDb();
      const pricing = computeDynamicVipPricing(currentCount);
      const existing = await findExistingAccreditation(String(userId), String(universeId));
      const isFirstActivation = !existing || !existing.isActivated;
      const expectedMinAmount = isFirstActivation ? pricing.totalFirstActivationXof : pricing.monthlyFeeXof;

      if (Number(amountPaidXof) < expectedMinAmount) {
        return res.status(402).json({
          success: false,
          error: `Montant insuffisant (${expectedMinAmount.toLocaleString('fr-FR')} F CFA requis).`,
        });
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const assignedGrade: VipHostGrade = scoring.grade === 'NON_ELIGIBLE' ? 'PRESTIGE' : scoring.grade;

      const nextRecord: VipHostAccreditationRecord = {
        userId: String(userId || universeId),
        universeId: String(universeId || userId),
        email: String(email || ''),
        fullName: String(fullName || 'Hôte VIP Certifié'),
        score: scoring.totalScore,
        grade: assignedGrade,
        badges: scoring.badges,
        sectors: scoring.sectors,
        isActivated: true,
        activatedAt: isFirstActivation ? now.toISOString() : existing.activatedAt || now.toISOString(),
        expiresAt,
        activationPricePaidXof: isFirstActivation ? pricing.currentActivationPriceXof : existing.activationPricePaidXof,
        monthlyFeeXof: MONTHLY_FEE_XOF,
        multiStreamingUnlocked: assignedGrade === 'SOUVERAIN' || assignedGrade === 'IMPERIAL',
        transactionRef: String(transactionId),
      };

      await persistAccreditationToDb(nextRecord);
      const updatedCount = await getActivationCountFromDb();

      return res.json({
        success: true,
        accreditation: nextRecord,
        pricing: computeDynamicVipPricing(updatedCount),
        message: `Statut Hôte VIP (${assignedGrade}) activé et persisté dans Supabase !`,
      });
    } catch (err: any) {
      console.error('[VIP HOST ACTIVATE ERROR]', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Erreur interne activation Hôte VIP.' });
    }
  });
}
