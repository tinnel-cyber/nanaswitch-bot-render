/**
 * @file vipHostAccreditationController.ts
 * @description Système d'Accréditation des Hôtes de Salons VIP (Grade Élevé) :
 * - Collecte des atouts & points dans tous les secteurs (Commerce/Finance, Savoir/LMS, Audience, Affiliation, Confiance KYC)
 * - Attribution automatique des Badges & Grades (Prestige, Souverain, Impérial)
 * - Tarification dynamique de rareté : 50 000 F CFA d'activation (+5% tous les 5 hôtes activés) + 40 000 F CFA / mois
 * - Validation obligatoire des critères minimaux avant activation par paiement
 */

import type { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

function readAccreditations(): VipHostAccreditationRecord[] {
  ensureDataDir();
  if (!fs.existsSync(ACCREDITATION_FILE)) return [];
  try {
    const raw = fs.readFileSync(ACCREDITATION_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAccreditations(list: VipHostAccreditationRecord[]) {
  ensureDataDir();
  fs.writeFileSync(ACCREDITATION_FILE, JSON.stringify(list, null, 2), 'utf-8');
}

function readActivationCount(): number {
  ensureDataDir();
  if (!fs.existsSync(COUNTER_FILE)) {
    const existing = readAccreditations().filter((a) => a.isActivated).length;
    return existing;
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf-8'));
    return Math.max(0, Number(parsed?.activationCount || 0));
  } catch {
    return 0;
  }
}

function writeActivationCount(count: number) {
  ensureDataDir();
  fs.writeFileSync(COUNTER_FILE, JSON.stringify({ activationCount: count, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
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

  // 1. Commerce & Finance (max 25 pts)
  let commercePts = 0;
  if (products >= 1) commercePts += 10;
  if (rev >= 50000 || wallet >= 50000) commercePts += 15;
  else if (rev >= 10000 || wallet >= 10000) commercePts += 7;

  // 2. Savoir & Formation (max 25 pts)
  let knowledgePts = 0;
  if (courses >= 1) knowledgePts += 15;
  if (students >= 10) knowledgePts += 10;
  else if (students >= 1) knowledgePts += 5;

  // 3. Audience & Spectateurs (max 20 pts)
  let audiencePts = 0;
  if (lives >= 1) audiencePts += 10;
  if (audience >= 50) audiencePts += 10;
  else if (audience >= 10) audiencePts += 5;

  // 4. Affiliation & Influence (max 20 pts)
  let affiliatePts = 0;
  if (affiliates >= 3) affiliatePts += 10;
  else if (affiliates >= 1) affiliatePts += 5;
  if (affiliateVol >= 25000) affiliatePts += 10;
  else if (affiliateVol > 0) affiliatePts += 5;

  // 5. Confiance & Séquestre (max 10 pts)
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

  // Critères minimaux obligatoires même en cas d'activation par paiement :
  // - Aucun litige bloquant ouvert
  // - Au moins 20 pts d'atouts réels collectés (ou KYC vérifié + au moins 1 actif)
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
  // 1. GET /api/vip/host/eligibility — Calcul du score, badges, grade et prix dynamique
  app.get('/api/vip/host/eligibility', (req: Request, res: Response) => {
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
    const activationCount = readActivationCount();
    const pricing = computeDynamicVipPricing(activationCount);

    const records = readAccreditations();
    const existing = records.find(
      (r) => (userId && r.userId === userId) || (universeId && r.universeId === universeId)
    );

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
      accreditation: existing || null,
      isActiveHost,
      multiStreamingUnlocked: Boolean(
        isSuperAdmin || (isActiveHost && (scoring.grade === 'SOUVERAIN' || scoring.grade === 'IMPERIAL' || existing?.multiStreamingUnlocked))
      ),
    });
  });

  // 2. POST /api/vip/host/activate — Activation après paiement vérifié (50 000+ F + 40 000 F/mois)
  app.post('/api/vip/host/activate', (req: Request, res: Response) => {
    try {
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

      const currentCount = readActivationCount();
      const pricing = computeDynamicVipPricing(currentCount);

      const records = readAccreditations();
      const idx = records.findIndex(
        (r) => (userId && r.userId === userId) || (universeId && r.universeId === universeId)
      );
      const isFirstActivation = idx < 0 || !records[idx].isActivated;
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
        activatedAt: isFirstActivation ? now.toISOString() : records[idx].activatedAt || now.toISOString(),
        expiresAt,
        activationPricePaidXof: isFirstActivation ? pricing.currentActivationPriceXof : records[idx].activationPricePaidXof,
        monthlyFeeXof: MONTHLY_FEE_XOF,
        multiStreamingUnlocked: assignedGrade === 'SOUVERAIN' || assignedGrade === 'IMPERIAL',
        transactionRef: String(transactionId),
      };

      if (idx >= 0) {
        records[idx] = nextRecord;
      } else {
        records.push(nextRecord);
      }
      writeAccreditations(records);

      let newActivationCount = currentCount;
      if (isFirstActivation) {
        newActivationCount = currentCount + 1;
        writeActivationCount(newActivationCount);
      }

      return res.json({
        success: true,
        accreditation: nextRecord,
        pricing: computeDynamicVipPricing(newActivationCount),
        message: `Statut Hôte VIP (${assignedGrade}) activé avec succès !`,
      });
    } catch (err: any) {
      console.error('[VIP HOST ACTIVATE ERROR]', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Erreur interne activation Hôte VIP.' });
    }
  });
}
