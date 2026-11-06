/**
 * Cloudflare Worker - Nanasore Edge Agent & Web Application Router
 * Intégration Supabase (PostgreSQL + Auth) & Brevo (SMTP/Transactional Email)
 */

import { createSupabaseClient, createSupabaseAdminClient, extractBearerToken } from './lib/supabase.js';
import { sendTransactionalEmail, sendWelcomeEmail, sendAgentNotification } from './lib/brevo.js';

// Configuration CORS standard pour autoriser les applications web et les agents
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Agent-Id',
};

/**
 * Générateur de réponse JSON formatée avec en-têtes CORS
 */
function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

/**
 * Point d'entrée principal Cloudflare Worker (ES Modules)
 */
export default {
  async fetch(request, env, ctx) {
    // Gestion du preflight CORS
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // -------------------------------------------------------------
      // 1. Healthcheck & Metadata
      // -------------------------------------------------------------
      if (path === '/' || path === '/health' || path === '/api/health') {
        return json({
          status: 'ok',
          service: 'Cloudflare Worker Supabase & Brevo Agent Gateway',
          version: '1.0.0',
          environment: env.ENVIRONMENT || 'production',
          features: {
            supabaseAuthRLS: true,
            brevoSMTP: true,
            agentIntegration: true,
          },
          brevoSender: env.BREVO_SENDER_NAME || 'Nanasore Team',
          timestamp: new Date().toISOString(),
        });
      }

      // -------------------------------------------------------------
      // 2. Profil Utilisateur (Lecture sécurisée via RLS et JWT)
      //    GET /api/profile
      // -------------------------------------------------------------
      if (path === '/api/profile' && method === 'GET') {
        const token = extractBearerToken(request);
        if (!token) {
          return json({ error: 'Non autorisé : Bearer token JWT manquant dans l\'en-tête Authorization' }, 401);
        }

        // Instanciation de la fabrique avec injection dynamique du JWT utilisateur
        const supabase = createSupabaseClient(env, token);

        // 1. Vérification de l'utilisateur authentifié
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return json({ error: 'Token utilisateur invalide ou expiré', details: authError?.message }, 401);
        }

        // 2. Récupération du profil dans public.profiles (Filtré strictement par la politique RLS)
        const { data: profile, error: dbError } = await supabase
          .from('profiles')
          .select('id, full_name, role, is_active, updated_at')
          .eq('id', user.id)
          .single();

        if (dbError) {
          return json({ error: 'Impossible de charger le profil', details: dbError.message }, 400);
        }

        return json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
          },
          profile,
        });
      }

      // -------------------------------------------------------------
      // 3. Mise à jour du Profil (Modification sécurisée via RLS)
      //    PUT /api/profile ou PATCH /api/profile
      // -------------------------------------------------------------
      if (path === '/api/profile' && (method === 'PUT' || method === 'PATCH')) {
        const token = extractBearerToken(request);
        if (!token) {
          return json({ error: 'Non autorisé : Bearer token JWT manquant' }, 401);
        }

        const body = await request.json().catch(() => ({}));
        const { full_name } = body;

        if (typeof full_name === 'undefined') {
          return json({ error: 'Le champ full_name est requis pour la mise à jour' }, 400);
        }

        const supabase = createSupabaseClient(env, token);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
          return json({ error: 'Session invalide', details: authError?.message }, 401);
        }

        // Mise à jour respectant la RLS (seul auth.uid() = id peut modifier son profil)
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: String(full_name).trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)
          .select()
          .single();

        if (updateError) {
          return json({ error: 'Échec de la mise à jour du profil', details: updateError.message }, 400);
        }

        return json({
          success: true,
          message: 'Profil mis à jour avec succès',
          profile: updatedProfile,
        });
      }

      // -------------------------------------------------------------
      // 4. Envoi d'Email Transactionnel Brevo (SMTP v3)
      //    POST /api/email/send
      // -------------------------------------------------------------
      if (path === '/api/email/send' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { to, subject, htmlContent, textContent, sender } = body;

        if (!to || !subject || (!htmlContent && !textContent)) {
          return json({
            error: 'Paramètres manquants : to, subject et htmlContent/textContent sont obligatoires',
          }, 400);
        }

        const result = await sendTransactionalEmail(env, {
          to,
          subject,
          htmlContent,
          textContent,
          sender,
        });

        return json({
          success: true,
          message: 'Email envoyé via Brevo avec succès',
          messageId: result.messageId,
        });
      }

      // -------------------------------------------------------------
      // 5. Endpoint Agent IA & Automatisation : Tâche + Notification
      //    POST /api/agent/notify
      // -------------------------------------------------------------
      if (path === '/api/agent/notify' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const { email, title, message, actionUrl } = body;

        if (!email || !title || !message) {
          return json({ error: 'Champs requis: email, title, message' }, 400);
        }

        const result = await sendAgentNotification(env, {
          email,
          title,
          message,
          actionUrl,
        });

        return json({
          success: true,
          message: 'Notification agent transmise',
          messageId: result.messageId,
        });
      }

      // -------------------------------------------------------------
      // 6. Webhook / Inscription : Notification de Bienvenue
      //    POST /api/auth/welcome-hook
      // -------------------------------------------------------------
      if (path === '/api/auth/welcome-hook' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const email = body.email || body.record?.email;
        const fullName = body.full_name || body.record?.raw_user_meta_data?.full_name;

        if (!email) {
          return json({ error: 'Email manquant dans le corps de la requête' }, 400);
        }

        const result = await sendWelcomeEmail(env, {
          email,
          fullName,
        });

        return json({
          success: true,
          message: 'Courriel de bienvenue expédié par Nanasore Team',
          messageId: result.messageId,
        });
      }

      // Route 404 par défaut
      return json({
        error: 'Route non trouvée',
        path,
        method,
        availableRoutes: [
          'GET  /api/health',
          'GET  /api/profile (avec Authorization: Bearer <jwt>)',
          'PUT  /api/profile (avec Authorization: Bearer <jwt>)',
          'POST /api/email/send',
          'POST /api/agent/notify',
          'POST /api/auth/welcome-hook',
        ],
      }, 404);

    } catch (err) {
      console.error('Erreur Worker non gérée:', err);
      return json({
        error: 'Erreur interne du serveur',
        message: err.message || 'Une exception imprévue est survenue.',
      }, 500);
    }
  },
};
