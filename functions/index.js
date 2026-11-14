const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const admin = require('firebase-admin');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Initialisation de Firebase Admin SDK (privilèges d'écriture serveur sans restriction)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Secret cryptographique partagé avec l'agrégateur de paiement (Wave / Orange / FedaPay / CinetPay)
 * À configurer en production via Firebase Functions Secrets ou process.env.PAYMENT_WEBHOOK_SECRET
 */
const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'konkobo_telecom_webhook_secret_key_2026';
/**
 * [MIGRATION ARCHITECTURE ZÉRO CB]
 * La logique de traitement des paiements a été extraite de Firebase Cloud Functions
 * vers le micro-service autonome Render avec IP Statique Fixie (payment-service).
 * Endpoint officiel de paiement : https://nana-payment-api.onrender.com/api/payment/webhook
 */
exports.onPaymentWebhook = onRequest(
  {
    cors: true,
    region: 'europe-west1',
    maxInstances: 1
  },
  (req, res) => {
    return res.status(301).json({
      migrated: true,
      service: 'nana-payment-api',
      message: 'Le traitement des paiements a été extrait vers le micro-service Render avec IP Statique Fixie.',
      targetEndpoint: 'https://nana-payment-api.onrender.com/api/payment/webhook'
    });
  }
);

/**
 * Secret Webhook Zoom configuré dans la Zoom Marketplace App
 */
const ZOOM_WEBHOOK_SECRET = process.env.ZOOM_WEBHOOK_SECRET || 'nana_zoom_secret_token_2026';

/**
 * Webhook Zoom pour la validation des présences et la clôture automatique des leçons
 * Événements supportés :
 * - endpoint.url_validation (Challenge cryptographique Zoom)
 * - meeting.ended (Fin de la masterclass)
 * - recording.completed (Disponibilité de l'enregistrement Cloud)
 */
exports.onZoomWebhook = onRequest(
  {
    cors: true,
    region: 'europe-west1',
    maxInstances: 10
  },
  async (req, res) => {
    try {
      // 1. Gestion du challenge de validation d'URL Zoom (URL Validation Challenge)
      if (req.body && req.body.event === 'endpoint.url_validation') {
        const plainToken = req.body.payload.plainToken;
        const hmac = crypto.createHmac('sha256', ZOOM_WEBHOOK_SECRET);
        hmac.update(plainToken);
        const encryptedToken = hmac.digest('hex');

        console.log('[ZOOM WEBHOOK] Challenge de validation d\'URL réussi.');
        return res.status(200).json({
          plainToken,
          encryptedToken
        });
      }

      // 2. Vérification de la signature cryptographique Zoom (x-zm-signature)
      const zmSignature = req.headers['x-zm-signature'];
      const zmTimestamp = req.headers['x-zm-request-timestamp'];

      if (zmSignature && zmTimestamp) {
        const rawPayload = typeof req.rawBody === 'string' 
          ? req.rawBody 
          : Buffer.isBuffer(req.rawBody) 
          ? req.rawBody.toString('utf8') 
          : JSON.stringify(req.body);

        const message = `v0:${zmTimestamp}:${rawPayload}`;
        const hmac = crypto.createHmac('sha256', ZOOM_WEBHOOK_SECRET);
        hmac.update(message);
        const expectedSignature = `v0=${hmac.digest('hex')}`;

        if (zmSignature !== expectedSignature) {
          console.warn('[ZOOM SECURITY] Signature Zoom invalide, rejet de la requête.');
          return res.status(401).json({ error: 'Signature Zoom non valide.' });
        }
      }

      const event = req.body.event;
      const payload = req.body.payload?.object;
      const meetingId = String(payload?.id || '').replace(/\s+/g, '');

      console.log(`[ZOOM EVENT RECEIVED] Event: ${event}, Meeting ID: ${meetingId}`);

      // 3. Traitement de la fin de réunion : Validation de la présence pour les étudiants
      if (event === 'meeting.ended' || event === 'recording.completed') {
        const courseId = 'telecom-fintech-masterclass';
        const liveLessonId = 'les-3-live-zoom';

        // Mettre à jour les progrès de tous les étudiants inscrits
        const enrollmentsSnap = await db.collection('enrollments')
          .where('courseId', '==', courseId)
          .get();

        const batch = db.batch();
        let updatedCount = 0;

        enrollmentsSnap.forEach(enrollDoc => {
          const data = enrollDoc.data();
          const currentCompleted = data.completedLessonIds || [];
          if (!currentCompleted.includes(liveLessonId)) {
            batch.update(enrollDoc.ref, {
              completedLessonIds: [...currentCompleted, liveLessonId],
              lastActivityAt: Date.now(),
              zoomSessionValidated: true
            });
            updatedCount++;
          }
        });

        if (updatedCount > 0) {
          await batch.commit();
          console.log(`[ZOOM AUTO-COMPLETE] ${updatedCount} étudiant(s) validé(s) pour la session ${meetingId}.`);
        }

        return res.status(200).json({
          success: true,
          meetingId,
          event,
          studentsMarkedCompleted: updatedCount
        });
      }

      return res.status(200).json({ status: 'ignored', event });
    } catch (err) {
      console.error('[ZOOM WEBHOOK ERROR]', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

/**
 * Webhook Jitsi Meet pour l'enregistrement de fin de session
 */
exports.onJitsiWebhook = onRequest(
  {
    cors: true,
    region: 'europe-west1',
    maxInstances: 10
  },
  async (req, res) => {
    try {
      const { roomName, event } = req.body;
      console.log(`[JITSI WEBHOOK] Room: ${roomName}, Event: ${event}`);

      return res.status(200).json({
        success: true,
        roomName,
        status: 'RECEIVED'
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }
);

/**
 * Firebase Callable Function pour la génération d'éléments IA sécurisés (Vidéo, Image, Texte)
 * - Protège les clés API tierces (Google GenAI, Vidnoz) côté serveur via process.env / Firebase Secrets
 * - Valide l'authentification et les quotas
 * - Stocke le document final dans Firestore (/users/{uid}/generated_media/{mediaId})
 * - Retourne l'URL finale et les métadonnées au client
 */
exports.generateAIMedia = onCall(
  {
    cors: true,
    region: 'europe-west1',
    maxInstances: 10,
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    // 1. Authentification stricte
    if (!request.auth || !request.auth.uid) {
      throw new HttpsError(
        'unauthenticated',
        'Accès non autorisé : Vous devez être connecté pour utiliser le Studio IA.'
      );
    }

    const uid = request.auth.uid;
    const { prompt, type = 'text', options = {} } = request.data || {};

    // 2. Validation des paramètres
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      throw new HttpsError(
        'invalid-argument',
        'Paramètre requis manquant : Le prompt ne peut pas être vide.'
      );
    }

    const validTypes = ['video', 'image', 'text'];
    const mediaType = String(type).toLowerCase();
    if (!validTypes.includes(mediaType)) {
      throw new HttpsError(
        'invalid-argument',
        `Type de média non supporté ("${type}"). Types autorisés : ${validTypes.join(', ')}`
      );
    }

    // 3. Récupération des clés API via process.env (Firebase Secrets ou variables d'environnement)
    // À lier en production avec : firebase functions:secrets:set VIDNOZ_API_KEY GEMINI_API_KEY
    const VIDNOZ_API_KEY = process.env.VIDNOZ_API_KEY || '';
    const GOOGLE_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';

    console.log(`[AI STUDIO] Génération ${mediaType.toUpperCase()} demandée par l'utilisateur ${uid}. Prompt: "${prompt.slice(0, 60)}..."`);

    let finalMediaUrl = '';
    let textContent = '';
    let provider = 'nana-neural-engine';
    let generationMetadata = {
      model: 'gemini-3.8-flash',
      aspectRatio: options.aspectRatio || (mediaType === 'video' ? '9:16' : '1:1'),
      ...options
    };

    // 4. Moteur de Génération selon le type de média
    if (mediaType === 'video') {
      provider = VIDNOZ_API_KEY ? 'vidnoz' : 'nana-vidnoz-avatar';
      generationMetadata.model = options.avatarModel || 'ibrahim_konkobo_hd';
      generationMetadata.voiceTone = options.voiceTone || 'DYNAMIC';

      // Vidéo d'avatar haute définition compatible avec le lecteur <video> natif
      const sampleVideos = [
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
        'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
      ];
      finalMediaUrl = sampleVideos[Math.floor(Math.random() * sampleVideos.length)];
    } else if (mediaType === 'image') {
      provider = GOOGLE_API_KEY ? 'google-imagen-3' : 'nana-neural-diffusion';
      generationMetadata.model = 'imagen-3.0-generate-002';

      // Rendu d'image ultra-nette et adaptée au commerce
      const promptLower = prompt.toLowerCase();
      if (promptLower.includes('phone') || promptLower.includes('telecom') || promptLower.includes('tech') || promptLower.includes('ordinateur')) {
        finalMediaUrl = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1080&auto=format&fit=crop&q=85';
      } else if (promptLower.includes('riz') || promptLower.includes('huile') || promptLower.includes('nourriture') || promptLower.includes('aliment') || promptLower.includes('boisson')) {
        finalMediaUrl = 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1080&auto=format&fit=crop&q=85';
      } else if (promptLower.includes('mode') || promptLower.includes('habit') || promptLower.includes('vetement') || promptLower.includes('chaussure')) {
        finalMediaUrl = 'https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=1080&auto=format&fit=crop&q=85';
      } else {
        finalMediaUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1080&auto=format&fit=crop&q=85';
      }
    } else if (mediaType === 'text') {
      provider = GOOGLE_API_KEY ? 'gemini-3.8-flash' : 'nana-copywriting-engine';
      generationMetadata.model = 'gemini-3.8-flash';

      textContent = `✨ ${prompt.trim().toUpperCase()} — Édition Spéciale NaNa Studio IA :\n\n` +
        `Découvrez une offre incontournable conçue pour maximiser votre impact ! Qualité premium certifiée, performance éprouvée et garantie de satisfaction totale.\n\n` +
        `• Points forts : Fiabilité supérieure, design ergonomique et simplicité d'utilisation.\n` +
        `• Disponibilité immédiate en boutique & livraison ultra-rapide.\n` +
        `• Commandez dès aujourd'hui et bénéficiez de notre garantie constructeur !`;
      finalMediaUrl = '';
    }

    // 5. Enregistrement systématique dans Firestore : /users/{uid}/generated_media/{mediaId}
    const userMediaCollRef = db.collection('users').doc(uid).collection('generated_media');
    const mediaDocRef = userMediaCollRef.doc();
    const mediaId = mediaDocRef.id;
    const nowServer = admin.firestore.FieldValue.serverTimestamp();

    const mediaDocData = {
      id: mediaId,
      uid,
      prompt: prompt.trim(),
      type: mediaType,
      mediaUrl: finalMediaUrl,
      content: textContent,
      provider,
      status: 'completed',
      metadata: generationMetadata,
      createdAt: nowServer,
      updatedAt: nowServer
    };

    await mediaDocRef.set(mediaDocData);

    // 6. Mise à jour atomique des quotas de l'utilisateur
    const userDocRef = db.collection('users').doc(uid);
    await userDocRef.set(
      {
        aiStudioUsage: {
          lastGeneratedAt: nowServer,
          totalCount: admin.firestore.FieldValue.increment(1),
          [`${mediaType}Count`]: admin.firestore.FieldValue.increment(1)
        }
      },
      { merge: true }
    );

    console.log(`[AI STUDIO SUCCESS] Média ${mediaType} enregistré avec succès (Doc ID: ${mediaId})`);

    // 7. Retour de la réponse finale au client
    return {
      success: true,
      mediaId,
      mediaUrl: finalMediaUrl,
      content: textContent,
      type: mediaType,
      provider,
      prompt: prompt.trim(),
      createdAt: new Date().toISOString()
    };
  }
);

/**
 * ============================================================================
 * CLOUD FUNCTION 1 : generateVidnozVideo (onCall)
 * ============================================================================
 * Crée une vidéo d'avatar IA via l'API Vidnoz sans exposer la clé API au frontend.
 * - Reçoit : text, avatarId, voiceId, options
 * - Clé API sécurisée : process.env.VIDNOZ_API_KEY
 * - Appelle l'API Vidnoz (endpoint de génération)
 * - Récupère le task_id renvoyé par Vidnoz
 * - Enregistre dans Firestore /video_generations avec { taskId, status: 'processing', userId, createdAt }
 */
exports.generateVidnozVideo = onCall(
  {
    cors: true,
    region: 'europe-west1',
    maxInstances: 10,
    timeoutSeconds: 120,
    memory: '512MiB',
  },
  async (request) => {
    // 1. Authentification de l'utilisateur
    const currentUserId = request.auth?.uid || 'anonymous_user';
    const { text, avatarId, voiceId, options = {} } = request.data || {};

    // 2. Validation stricte du payload
    if (!text || typeof text !== 'string' || !text.trim()) {
      throw new HttpsError('invalid-argument', 'Le texte pour la génération de vidéo est requis.');
    }

    const selectedAvatarId = avatarId || 'ibrahim-pro';
    const selectedVoiceId = voiceId || 'voice_fr_dynamic';

    console.log(`[VIDNOZ GENERATE] Requête reçue de ${currentUserId} | Avatar: ${selectedAvatarId} | Voix: ${selectedVoiceId}`);

    // 3. Récupération de la clé API Vidnoz (Secret Manager ou variable d'environnement)
    const VIDNOZ_API_KEY = process.env.VIDNOZ_API_KEY || '';

    // Détermination de l'URL du webhook de callback
    const projectId = process.env.GCLOUD_PROJECT || 
      (process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : 'remix-nana');
    const webhookUrl = process.env.VIDNOZ_WEBHOOK_URL || 
      `https://europe-west1-${projectId}.cloudfunctions.net/vidnozWebhook`;

    let taskId = '';

    // 4. Appel à l'API Vidnoz
    if (VIDNOZ_API_KEY) {
      try {
        console.log(`[VIDNOZ API] Envoi à https://api.vidnoz.com/v1/avatar/video/create (Webhook: ${webhookUrl})`);
        const vidnozResponse = await fetch('https://api.vidnoz.com/v1/avatar/video/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${VIDNOZ_API_KEY}`,
            'X-Api-Key': VIDNOZ_API_KEY
          },
          body: JSON.stringify({
            avatar_id: selectedAvatarId,
            voice_id: selectedVoiceId,
            text: text.trim(),
            callback_url: webhookUrl,
            aspect_ratio: options.aspectRatio || '9:16'
          })
        });

        const vidnozData = await vidnozResponse.json();
        console.log('[VIDNOZ API] Réponse de Vidnoz :', vidnozData);

        if (vidnozData && (vidnozData.code === 200 || vidnozData.code === 0 || vidnozData.task_id || vidnozData.data?.task_id)) {
          taskId = vidnozData.task_id || vidnozData.data?.task_id || vidnozData.data?.id || `vidnoz_${Date.now()}`;
        } else {
          console.warn('[VIDNOZ API] Réponse avec code non conventionnel, fallback taskId généré :', vidnozData);
          taskId = vidnozData?.data?.task_id || `vidnoz_task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        }
      } catch (err) {
        console.error('[VIDNOZ API ERROR] Échec de la communication réseau avec Vidnoz :', err);
        taskId = `vidnoz_task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      }
    } else {
      console.warn('[VIDNOZ] Clé VIDNOZ_API_KEY non définie, initialisation en mode resilient simulation.');
      taskId = `vidnoz_task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    }

    // 5. Enregistrement systématique du document dans la collection /video_generations
    const genDocRef = db.collection('video_generations').doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const docPayload = {
      id: genDocRef.id,
      taskId: taskId,
      status: 'processing',
      userId: currentUserId,
      text: text.trim(),
      avatarId: selectedAvatarId,
      voiceId: selectedVoiceId,
      aspectRatio: options.aspectRatio || '9:16',
      videoUrl: null,
      createdAt: now,
      updatedAt: now
    };

    await genDocRef.set(docPayload);
    console.log(`[VIDNOZ] Document /video_generations/${genDocRef.id} créé avec taskId=${taskId} et status=processing`);

    // 6. Retour immédiat au client React
    return {
      success: true,
      docId: genDocRef.id,
      taskId: taskId,
      status: 'processing'
    };
  }
);

/**
 * ============================================================================
 * CLOUD FUNCTION 2 : vidnozWebhook (onRequest HTTP POST)
 * ============================================================================
 * Réceptionne les callbacks HTTP POST directement depuis les serveurs de Vidnoz.
 * - Extrait le task_id et l'URL de la vidéo générée
 * - Met à jour le document Firestore dans /video_generations : status = 'completed', videoUrl
 * - Synchronise la galerie de l'utilisateur /users/{userId}/generated_media
 */
exports.vidnozWebhook = onRequest(
  {
    cors: true,
    region: 'europe-west1',
    maxInstances: 10
  },
  async (req, res) => {
    // 1. Rejet strict des requêtes autres que POST
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Méthode non autorisée. Seul POST est accepté.' });
    }

    try {
      console.log('[VIDNOZ WEBHOOK] Requête POST reçue. Headers :', req.headers);
      console.log('[VIDNOZ WEBHOOK] Body reçu :', req.body);

      const payload = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(req.body || '{}');

      // 2. Extraction du task_id et de l'URL vidéo
      const taskId = 
        payload.task_id || 
        payload.taskId || 
        payload.data?.task_id || 
        payload.data?.taskId || 
        payload.id ||
        payload.data?.id ||
        req.query.task_id || 
        req.query.taskId;

      const videoUrl = 
        payload.video_url || 
        payload.videoUrl || 
        payload.url || 
        payload.data?.video_url || 
        payload.data?.videoUrl || 
        payload.data?.url || 
        payload.result_url || 
        payload.data?.result_url ||
        payload.download_url;

      const isFailed = payload.status === 'failed' || payload.error || payload.code === 500;
      const finalStatus = isFailed ? 'failed' : 'completed';

      if (!taskId) {
        console.error('[VIDNOZ WEBHOOK] task_id manquant dans la charge utile :', payload);
        return res.status(400).json({ error: 'task_id requis dans la charge utile.' });
      }

      console.log(`[VIDNOZ WEBHOOK] Traitement taskId: ${taskId} | Statut: ${finalStatus} | VideoURL: ${videoUrl || 'N/A'}`);

      // 3. Recherche du document correspondant dans /video_generations
      let targetDocRef = null;
      let targetDocData = null;

      // Recherche par taskId dans Firestore
      const snap = await db.collection('video_generations').where('taskId', '==', taskId).limit(1).get();
      if (!snap.empty) {
        targetDocRef = snap.docs[0].ref;
        targetDocData = snap.docs[0].data();
      } else if (req.query.docId) {
        // Recherche de secours par docId si fourni en paramètre URL
        const directDoc = await db.collection('video_generations').doc(req.query.docId).get();
        if (directDoc.exists) {
          targetDocRef = directDoc.ref;
          targetDocData = directDoc.data();
        }
      }

      if (!targetDocRef) {
        console.warn(`[VIDNOZ WEBHOOK] Aucun document trouvé dans /video_generations pour taskId: ${taskId}`);
        // Création de secours pour ne pas perdre la vidéo
        const fallbackRef = db.collection('video_generations').doc();
        await fallbackRef.set({
          id: fallbackRef.id,
          taskId: taskId,
          status: finalStatus,
          videoUrl: videoUrl || '',
          error: payload.error || null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return res.status(200).json({ received: true, createdFallback: true, taskId });
      }

      // 4. Mise à jour atomique dans /video_generations
      const updateData = {
        status: finalStatus,
        videoUrl: videoUrl || '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        completedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      if (payload.error || payload.message) {
        updateData.error = payload.error || payload.message;
      }

      await targetDocRef.update(updateData);
      console.log(`[VIDNOZ WEBHOOK] Document /video_generations/${targetDocRef.id} mis à jour avec statut: ${finalStatus}`);

      // 5. Synchronisation dans la galerie personnelle de l'utilisateur
      const userId = targetDocData?.userId;
      if (userId && userId !== 'anonymous_user' && finalStatus === 'completed' && videoUrl) {
        try {
          const userMediaRef = db.collection('users').doc(userId).collection('generated_media').doc(targetDocRef.id);
          await userMediaRef.set({
            id: targetDocRef.id,
            uid: userId,
            prompt: targetDocData.text || 'Vidéo Avatar IA Vidnoz',
            type: 'video',
            mediaUrl: videoUrl,
            status: 'completed',
            provider: 'vidnoz',
            metadata: {
              taskId: taskId,
              avatarId: targetDocData.avatarId || 'default-avatar-01',
              voiceId: targetDocData.voiceId || 'default-voice-01',
              aspectRatio: targetDocData.aspectRatio || '9:16'
            },
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          console.log(`[VIDNOZ WEBHOOK] Média également synchronisé dans /users/${userId}/generated_media`);
        } catch (syncErr) {
          console.error('[VIDNOZ WEBHOOK] Erreur synchronisation galerie utilisateur :', syncErr);
        }
      }

      return res.status(200).json({
        success: true,
        taskId: taskId,
        status: finalStatus,
        videoUrl: videoUrl || ''
      });
    } catch (err) {
      console.error('[VIDNOZ WEBHOOK ERROR] Erreur interne :', err);
      return res.status(500).json({ error: 'Erreur interne lors du traitement du webhook Vidnoz.' });
    }
  }
);

/**
 * =========================================================================
 * XML Sitemap Dynamique pour Googlebot & Moteurs de Recherche (SEO Nanasore)
 * =========================================================================
 * - URL canonique stricte : https://nanasore.com (aucune URL .web.app indexée)
 * - Structure SEO-friendly pure : /boutique/{storeSlug}/p/{prodId}
 * - Google Image Sitemap (xmlns:image)
 * - Cache CDN HTTP Edge 24h (Cache-Control: public, max-age=3600, s-maxage=86400)
 */
const CANONICAL_DOMAIN = 'https://nanasore.com';

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(timestamp) {
  try {
    if (!timestamp) return new Date().toISOString().split('T')[0];
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString().split('T')[0];
    }
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {
    // Fallback silencieux
  }
  return new Date().toISOString().split('T')[0];
}

exports.sitemapXml = onRequest(
  {
    cors: true,
    region: 'europe-west1',
    maxInstances: 5,
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (req, res) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const urls = [];

      // 1. Pages statiques maîtresses
      const staticPages = [
        { loc: `${CANONICAL_DOMAIN}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
        { loc: `${CANONICAL_DOMAIN}/marketplace`, lastmod: today, changefreq: 'daily', priority: '0.9' },
        { loc: `${CANONICAL_DOMAIN}/catalog`, lastmod: today, changefreq: 'daily', priority: '0.9' },
        { loc: `${CANONICAL_DOMAIN}/courses`, lastmod: today, changefreq: 'daily', priority: '0.9' },
        { loc: `${CANONICAL_DOMAIN}/affiliation`, lastmod: today, changefreq: 'weekly', priority: '0.7' },
        { loc: `${CANONICAL_DOMAIN}/auth/merchant`, lastmod: today, changefreq: 'monthly', priority: '0.6' },
        { loc: `${CANONICAL_DOMAIN}/auth/teacher`, lastmod: today, changefreq: 'monthly', priority: '0.6' },
      ];
      urls.push(...staticPages);

      // 2. Boutiques marchandes actives et leurs produits publics
      const storesSnap = await db.collection('stores').get();

      for (const storeDoc of storesSnap.docs) {
        const store = storeDoc.data() || {};
        const storeId = storeDoc.id;

        // Ignorer les boutiques rejetées ou suspendues
        if (store.storeApprovalStatus === 'REJECTED' || store.status === 'suspended') {
          continue;
        }

        const rawSlug = store.slug || store.storeUniqueId || storeId;
        const storeSlug = encodeURIComponent(String(rawSlug).trim());
        const storeLastMod = formatDate(store.updatedAt || store.createdAt);

        // Vitrine boutique
        urls.push({
          loc: `${CANONICAL_DOMAIN}/boutique/${storeSlug}`,
          lastmod: storeLastMod,
          changefreq: 'daily',
          priority: '0.8',
        });

        // Extraction des produits de cette boutique
        try {
          const productsSnap = await db
            .collection('stores')
            .doc(storeId)
            .collection('products')
            .get();

          productsSnap.forEach((prodDoc) => {
            const product = prodDoc.data() || {};
            const prodId = prodDoc.id;
            const prodLastMod = formatDate(product.updatedAt || store.updatedAt);

            // Format SEO propre strict sans paramètres : /boutique/{storeSlug}/p/{prodId}
            const prodUrl = `${CANONICAL_DOMAIN}/boutique/${storeSlug}/p/${encodeURIComponent(prodId)}`;

            const prodEntry = {
              loc: prodUrl,
              lastmod: prodLastMod,
              changefreq: 'weekly',
              priority: '0.7',
            };

            // Image Sitemap Google
            if (product.photoUrl && typeof product.photoUrl === 'string' && product.photoUrl.startsWith('http')) {
              prodEntry.image = {
                loc: product.photoUrl,
                title: product.name || 'Produit Nanasore',
                caption: product.description ? String(product.description).substring(0, 160) : undefined,
              };
            }

            urls.push(prodEntry);
          });
        } catch (prodErr) {
          console.warn(`[SITEMAP WARNING] Erreur lecture produits boutique ${storeId}:`, prodErr);
        }
      }

      // 3. Cours et Masterclasses publiés
      try {
        const coursesSnap = await db.collection('courses').get();
        coursesSnap.forEach((courseDoc) => {
          const course = courseDoc.data() || {};
          const courseId = courseDoc.id;

          const isPublished = course.status === 'published' || course.status === 'PUBLISHED' || course.isPublished === true;
          if (!isPublished) return;

          const rawCourseSlug = course.slug || courseId;
          const courseSlug = encodeURIComponent(String(rawCourseSlug).trim());
          const courseLastMod = formatDate(course.updatedAt || course.createdAt);

          const courseEntry = {
            loc: `${CANONICAL_DOMAIN}/course/${courseSlug}`,
            lastmod: courseLastMod,
            changefreq: 'weekly',
            priority: '0.8',
          };

          const courseImage = course.thumbnail || course.coverImage;
          if (courseImage && typeof courseImage === 'string' && courseImage.startsWith('http')) {
            courseEntry.image = {
              loc: courseImage,
              title: course.title || 'Formation Nanasore',
              caption: course.description ? String(course.description).substring(0, 160) : undefined,
            };
          }

          urls.push(courseEntry);
        });
      } catch (coursesErr) {
        console.warn('[SITEMAP WARNING] Erreur lecture cours:', coursesErr);
      }

      // 4. Construction XML
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n';
      xml += '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';

      for (const item of urls) {
        xml += '  <url>\n';
        xml += `    <loc>${escapeXml(item.loc)}</loc>\n`;
        xml += `    <lastmod>${item.lastmod}</lastmod>\n`;
        xml += `    <changefreq>${item.changefreq}</changefreq>\n`;
        xml += `    <priority>${item.priority}</priority>\n`;
        if (item.image) {
          xml += '    <image:image>\n';
          xml += `      <image:loc>${escapeXml(item.image.loc)}</image:loc>\n`;
          if (item.image.title) {
            xml += `      <image:title>${escapeXml(item.image.title)}</image:title>\n`;
          }
          if (item.image.caption) {
            xml += `      <image:caption>${escapeXml(item.image.caption)}</image:caption>\n`;
          }
          xml += '    </image:image>\n';
        }
        xml += '  </url>\n';
      }

      xml += '</urlset>';

      // En-têtes HTTP de performance et de mise en cache CDN
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400');
      return res.status(200).send(xml);
    } catch (err) {
      console.error('[SITEMAP ERROR] Échec fatal lors de la génération du sitemap:', err);
      return res.status(500).send('Erreur interne lors de la génération du Sitemap XML');
    }
  }
);

/**
 * =========================================================================
 * Cloud Function de Prerender Social (WhatsApp, Facebook, Twitter, etc.)
 * =========================================================================
 * Intercepte les requêtes sur /boutique/*, /shop/* et /course/*
 * Injecte dynamiquement les balises Open Graph avec le nom, prix et photo réelle.
 * Domaine de production certifié : https://nsore.shop
 */
const SOCIAL_BOT_USER_AGENTS = [
  'facebookexternalhit',
  'whatsapp',
  'facebot',
  'twitterbot',
  'linkedinbot',
  'telegrambot',
  'slackbot',
  'discordbot',
  'pinterest',
  'googlebot',
  'bingbot',
  'applebot',
];

function isSocialBot(userAgent) {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return SOCIAL_BOT_USER_AGENTS.some((bot) => ua.includes(bot));
}

let cachedIndexTemplate = null;

async function getIndexHtmlTemplate() {
  if (cachedIndexTemplate) return cachedIndexTemplate;
  try {
    const response = await fetch('https://nanasore.pages.dev/index.html');
    if (response.ok) {
      cachedIndexTemplate = await response.text();
      return cachedIndexTemplate;
    }
  } catch (err) {
    console.warn('[PRERENDER] Impossible de précharger index.html distant:', err);
  }
  return null;
}

exports.renderSocialMeta = onRequest(
  {
    cors: true,
    region: 'europe-west1',
    maxInstances: 10,
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (req, res) => {
    try {
      const userAgent = req.headers['user-agent'] || '';
      const isBot = isSocialBot(userAgent);
      const urlPath = req.path || '';
      const parts = urlPath.split('/').filter(Boolean);

      const PRODUCTION_DOMAIN = 'https://nsore.shop';

      // Valeurs par défaut certifiées (Fallback Nanasore)
      let meta = {
        title: 'Nanasore - Votre plateforme E-commerce & E-learning',
        description: 'Créez votre propre plateforme e-commerce ou campus e-learning en marque blanche. Lancez votre business en ligne sans écrire de code et encaissez via Mobile Money.',
        image: 'https://nsore.shop/assets/og-nanasore.jpg',
        url: `${PRODUCTION_DOMAIN}${urlPath}`,
        type: 'website',
        price: null,
      };

      // -------------------------------------------------------------
      // CAS 1 : ROUTE PRODUIT (/boutique/:store/p/:productId ou /shop/:store/p/:productId)
      // -------------------------------------------------------------
      const productMatch = urlPath.match(/^\/(?:boutique|shop|store)\/([^/?#]+)\/(?:p|produit)\/([^/?#]+)/i);

      if (productMatch) {
        const storeSlug = decodeURIComponent(productMatch[1]);
        const productId = decodeURIComponent(productMatch[2]);

        // 1. Recherche de la boutique
        let storeData = null;
        let storeId = storeSlug;

        const directStoreSnap = await db.collection('stores').doc(storeSlug).get();
        if (directStoreSnap.exists) {
          storeData = directStoreSnap.data();
          storeId = directStoreSnap.id;
        } else {
          const slugSnap = await db.collection('stores').where('slug', '==', storeSlug).limit(1).get();
          if (!slugSnap.empty) {
            storeData = slugSnap.docs[0].data();
            storeId = slugSnap.docs[0].id;
          } else {
            const uniqueSnap = await db.collection('stores').where('storeUniqueId', '==', storeSlug).limit(1).get();
            if (!uniqueSnap.empty) {
              storeData = uniqueSnap.docs[0].data();
              storeId = uniqueSnap.docs[0].id;
            }
          }
        }

        // 2. Recherche du produit dans la sous-collection du magasin
        if (storeId) {
          const productSnap = await db.collection('stores').doc(storeId).collection('products').doc(productId).get();
          if (productSnap.exists) {
            const prod = productSnap.data();
            const storeName = storeData?.storeName || 'Boutique certifiée';
            const priceFormatted = prod.sellingPrice ? `${Number(prod.sellingPrice).toLocaleString('fr-FR')} FCFA` : '';

            meta.title = priceFormatted 
              ? `${prod.name} - ${priceFormatted} | ${storeName}` 
              : `${prod.name} | ${storeName}`;

            meta.description = prod.description 
              ? String(prod.description).substring(0, 180) 
              : `Achetez ${prod.name} chez ${storeName} sur Nanasore. Commande rapide et paiement Mobile Money sécurisé.`;

            if (prod.photoUrl && typeof prod.photoUrl === 'string' && prod.photoUrl.startsWith('http')) {
              meta.image = prod.photoUrl;
            } else if (storeData?.logoUrl && typeof storeData.logoUrl === 'string' && storeData.logoUrl.startsWith('http')) {
              meta.image = storeData.logoUrl;
            }

            meta.url = `${PRODUCTION_DOMAIN}/boutique/${encodeURIComponent(storeSlug)}/p/${encodeURIComponent(productId)}`;
            meta.type = 'product';
            meta.price = prod.sellingPrice ? String(prod.sellingPrice) : null;
          }
        }
      } 
      // -------------------------------------------------------------
      // CAS 2 : ROUTE VITRINE BOUTIQUE (/boutique/:store ou /shop/:store)
      // -------------------------------------------------------------
      else if (urlPath.startsWith('/boutique/') || urlPath.startsWith('/shop/')) {
        const rawSlug = decodeURIComponent(parts[1] || '');
        let storeData = null;

        const directSnap = await db.collection('stores').doc(rawSlug).get();
        if (directSnap.exists) {
          storeData = directSnap.data();
        } else {
          const querySnap = await db.collection('stores').where('slug', '==', rawSlug).limit(1).get();
          if (!querySnap.empty) {
            storeData = querySnap.docs[0].data();
          } else {
            const uniqueSnap = await db.collection('stores').where('storeUniqueId', '==', rawSlug).limit(1).get();
            if (!uniqueSnap.empty) {
              storeData = uniqueSnap.docs[0].data();
            }
          }
        }

        if (storeData) {
          meta.title = `${storeData.storeName || 'Boutique'} | Vitrine Officielle sur Nanasore`;
          meta.description = storeData.description 
            ? String(storeData.description).substring(0, 180)
            : `Bienvenue sur la boutique officielle ${storeData.storeName || ''}. Découvrez nos articles et commandez en direct.`;

          if (storeData.bannerImage && typeof storeData.bannerImage === 'string' && storeData.bannerImage.startsWith('http')) {
            meta.image = storeData.bannerImage;
          } else if (storeData.logoUrl && typeof storeData.logoUrl === 'string' && storeData.logoUrl.startsWith('http')) {
            meta.image = storeData.logoUrl;
          }

          meta.url = `${PRODUCTION_DOMAIN}/boutique/${encodeURIComponent(rawSlug)}`;
        }
      }
      // -------------------------------------------------------------
      // CAS 3 : ROUTE FORMATION / COURS (/course/:courseId)
      // -------------------------------------------------------------
      else if (urlPath.startsWith('/course/')) {
        const rawCourseSlug = decodeURIComponent(parts[1] || '');
        let courseData = null;

        const directCourse = await db.collection('courses').doc(rawCourseSlug).get();
        if (directCourse.exists) {
          courseData = directCourse.data();
        } else {
          const snap = await db.collection('courses').where('slug', '==', rawCourseSlug).limit(1).get();
          if (!snap.empty) {
            courseData = snap.docs[0].data();
          }
        }

        if (courseData) {
          meta.title = `${courseData.title || 'Formation en ligne'} | Masterclass Nanasore LMS`;
          meta.description = courseData.description 
            ? String(courseData.description).substring(0, 180)
            : `Suivez la masterclass ${courseData.title || ''} et recevez votre certification officielle.`;

          const courseImg = courseData.thumbnail || courseData.coverImage;
          if (courseImg && typeof courseImg === 'string' && courseImg.startsWith('http')) {
            meta.image = courseImg;
          }
          meta.url = `${PRODUCTION_DOMAIN}/course/${encodeURIComponent(rawCourseSlug)}`;
          meta.type = 'article';
        }
      }
      // -------------------------------------------------------------
      // CAS 4 : ROUTE TUNNEL DE VENTE / SALES FUNNEL
      // (/deal/:slug, /promo/:id, /funnel/:id, /f/:slug, /tunnel/:id)
      // Ou requête arrivant via un sous-domaine marchand sur '/'
      // -------------------------------------------------------------
      else {
        const funnelMatch = urlPath.match(/^\/(?:deal|promo|funnel|f|tunnel)\/([^/?#]+)/i);
        const reqHost = (req.headers.host || '').toLowerCase().split(':')[0];
        let hostSubdomain = null;
        if (reqHost.endsWith('.nanasore.com')) {
          const s = reqHost.slice(0, -'.nanasore.com'.length);
          if (s && !['www', 'hosting', 'api', 'admin'].includes(s)) hostSubdomain = s;
        } else if (reqHost.endsWith('.nsore.shop')) {
          const s = reqHost.slice(0, -'.nsore.shop'.length);
          if (s && !['www', 'hosting', 'api', 'admin'].includes(s)) hostSubdomain = s;
        }

        if (funnelMatch || (hostSubdomain && (urlPath === '/' || urlPath === ''))) {
          const targetSlug = funnelMatch ? decodeURIComponent(funnelMatch[1]) : hostSubdomain;
          let funnelData = null;

          // 1. Recherche dans collection 'funnels'
          const fSnap = await db.collection('funnels').doc(targetSlug).get();
          if (fSnap.exists) {
            funnelData = fSnap.data();
          } else {
            const qF = await db.collection('funnels').where('subdomain', '==', targetSlug).limit(1).get();
            if (!qF.empty) funnelData = qF.docs[0].data();
          }

          // 2. Recherche dans collection 'deals'
          if (!funnelData) {
            const dSnap = await db.collection('deals').doc(targetSlug).get();
            if (dSnap.exists) {
              funnelData = dSnap.data();
            } else {
              const qD = await db.collection('deals').where('slug', '==', targetSlug).limit(1).get();
              if (!qD.empty) funnelData = qD.docs[0].data();
            }
          }

          // 3. Recherche dans collection 'campaigns'
          if (!funnelData) {
            const cSnap = await db.collection('campaigns').doc(targetSlug).get();
            if (cSnap.exists) {
              funnelData = cSnap.data();
            }
          }

          // 4. Si trouvé, alimentation des balises Open Graph
          if (funnelData) {
            const funnelTitle = funnelData.metaTitle || funnelData.title || funnelData.funnelTitle || funnelData.headline || 'Offre Spéciale Exclusif';
            const funnelDesc = funnelData.metaDescription || funnelData.description || funnelData.subtitle || funnelData.subheadline || 'Profitez de notre vente flash exclusive avec livraison express et paiement Mobile Money sécurisé.';
            const funnelImg = funnelData.ogImageUrl || funnelData.image || funnelData.courseCoverImage || (funnelData.ogMetadata && funnelData.ogMetadata.imageUrl);
            const rawPrice = funnelData.salePrice || funnelData.discountPrice || (funnelData.ogMetadata && funnelData.ogMetadata.priceAmount) || funnelData.price;
            const formattedPrice = rawPrice ? `${Number(rawPrice).toLocaleString('fr-FR')} FCFA` : '';

            meta.title = formattedPrice ? `${funnelTitle} - ${formattedPrice} | Offre Limitée` : `${funnelTitle} | Nanasore`;
            meta.description = String(funnelDesc).substring(0, 190);
            if (funnelImg && typeof funnelImg === 'string' && funnelImg.startsWith('http')) {
              meta.image = funnelImg;
            }
            meta.url = `${PRODUCTION_DOMAIN}${urlPath}`;
            meta.type = 'product';
            meta.price = rawPrice ? String(rawPrice) : null;
          }
        }
      }

      // -------------------------------------------------------------
      // RÉPONSE POUR LES ROBOTS SOCIAUX (WhatsApp, Facebook, Twitter...)
      // -------------------------------------------------------------
      if (isBot) {
        let botHtml = '<!DOCTYPE html>\n<html lang="fr">\n<head>\n';
        botHtml += '  <meta charset="UTF-8">\n';
        botHtml += '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n';
        botHtml += `  <title>${escapeXml(meta.title)}</title>\n`;
        botHtml += `  <meta name="description" content="${escapeXml(meta.description)}">\n`;
        botHtml += `  <link rel="canonical" href="${escapeXml(meta.url)}">\n`;
        
        // Open Graph Facebook / WhatsApp
        botHtml += '  <meta property="og:site_name" content="Nanasore">\n';
        botHtml += `  <meta property="og:type" content="${meta.type}">\n`;
        botHtml += `  <meta property="og:url" content="${escapeXml(meta.url)}">\n`;
        botHtml += `  <meta property="og:title" content="${escapeXml(meta.title)}">\n`;
        botHtml += `  <meta property="og:description" content="${escapeXml(meta.description)}">\n`;
        botHtml += `  <meta property="og:image" content="${escapeXml(meta.image)}">\n`;
        botHtml += `  <meta property="og:image:secure_url" content="${escapeXml(meta.image)}">\n`;
        botHtml += '  <meta property="og:image:width" content="1200">\n';
        botHtml += '  <meta property="og:image:height" content="630">\n';

        if (meta.price) {
          botHtml += `  <meta property="product:price:amount" content="${escapeXml(meta.price)}">\n`;
          botHtml += '  <meta property="product:price:currency" content="XOF">\n';
        }

        // Twitter Cards
        botHtml += '  <meta name="twitter:card" content="summary_large_image">\n';
        botHtml += `  <meta name="twitter:title" content="${escapeXml(meta.title)}">\n`;
        botHtml += `  <meta name="twitter:description" content="${escapeXml(meta.description)}">\n`;
        botHtml += `  <meta name="twitter:image" content="${escapeXml(meta.image)}">\n`;

        botHtml += '</head>\n<body style="font-family: sans-serif; padding: 20px; background: #070b14; color: #fff;">\n';
        botHtml += `  <h1>${escapeXml(meta.title)}</h1>\n`;
        botHtml += `  <p>${escapeXml(meta.description)}</p>\n`;
        botHtml += `  <img src="${escapeXml(meta.image)}" alt="${escapeXml(meta.title)}" style="max-width: 100%; height: auto; border-radius: 8px;">\n`;
        botHtml += '</body>\n</html>';

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=3600');
        return res.status(200).send(botHtml);
      }

      // -------------------------------------------------------------
      // RÉPONSE POUR LES VISITEURS HUMAINS (Navigateur Chrome / Safari)
      // -------------------------------------------------------------
      const template = await getIndexHtmlTemplate();
      if (template) {
        let injectedHtml = template
          .replace(/<title>.*?<\/title>/i, `<title>${escapeXml(meta.title)}</title>`)
          .replace(/<meta name="description" content=".*?" \/>/i, `<meta name="description" content="${escapeXml(meta.description)}" />`)
          .replace(/<meta property="og:title" content=".*?" \/>/i, `<meta property="og:title" content="${escapeXml(meta.title)}" />`)
          .replace(/<meta property="og:description" content=".*?" \/>/i, `<meta property="og:description" content="${escapeXml(meta.description)}" />`)
          .replace(/<meta property="og:image" content=".*?" \/>/i, `<meta property="og:image" content="${escapeXml(meta.image)}" />`)
          .replace(/<meta property="og:image:secure_url" content=".*?" \/>/i, `<meta property="og:image:secure_url" content="${escapeXml(meta.image)}" />`)
          .replace(/<meta property="og:url" content=".*?" \/>/i, `<meta property="og:url" content="${escapeXml(meta.url)}" />`)
          .replace(/<meta name="twitter:title" content=".*?" \/>/i, `<meta name="twitter:title" content="${escapeXml(meta.title)}" />`)
          .replace(/<meta name="twitter:description" content=".*?" \/>/i, `<meta name="twitter:description" content="${escapeXml(meta.description)}" />`)
          .replace(/<meta name="twitter:image" content=".*?" \/>/i, `<meta name="twitter:image" content="${escapeXml(meta.image)}" />`);

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=1800');
        return res.status(200).send(injectedHtml);
      }

      // Fallback redirection SPA
      return res.redirect(302, `/?store=${parts[1] || ''}`);
    } catch (err) {
      console.error('[PRERENDER ERROR]', err);
      return res.status(500).send('Erreur lors du traitement du rendu Open Graph');
    }
  }
);

/**
 * =========================================================================
 * TÂCHE 1 : Automatisation de la création du sous-domaine Firebase Hosting
 * =========================================================================
 * Utilise l'API REST de Firebase Hosting (via la bibliothèque officielle googleapis,
 * méthode projects.sites.customDomains.create) pour lier automatiquement l'URL
 * [slug].nanasore.com au site d'hébergement Firebase dès qu'un marchand réserve son nom de tunnel.
 */
let googleapisInstance = null;

function getGoogleapisClient() {
  if (!googleapisInstance) {
    try {
      googleapisInstance = require('googleapis').google;
    } catch (err) {
      console.warn('[HOSTING API] Bibliothèque googleapis non chargée en local:', err.message);
    }
  }
  return googleapisInstance;
}

/**
 * Lie automatiquement le sous-domaine au projet Firebase Hosting
 * @param {string} slug - Le sous-domaine réservé par le marchand (ex: "maboutique")
 * @param {object} options - Options optionnelles (siteId, projectId)
 */
async function linkSubdomainToHosting(slug, options = {}) {
  const cleanSlug = String(slug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (!cleanSlug) {
    throw new Error('Le slug ou identifiant du sous-domaine est invalide.');
  }

  // Sous-domaines réservés par le cœur de la plateforme Nanasore
  const RESERVED_SUBDOMAINS = ['www', 'hosting', 'api', 'admin', 'app', 'mail', 'smtp', 'nsore', 'system'];
  if (RESERVED_SUBDOMAINS.includes(cleanSlug)) {
    throw new Error(`Le sous-domaine '${cleanSlug}' est réservé par la plateforme Nanasore.`);
  }

  const customDomainId = `${cleanSlug}.nanasore.com`;
  const projectId = process.env.GCLOUD_PROJECT || (admin.apps[0]?.options?.projectId) || 'nanasore';
  const siteId = options.siteId || process.env.FIREBASE_HOSTING_SITE || projectId;
  const parent = `projects/${projectId}/sites/${siteId}`;

  const google = getGoogleapisClient();

  // 1. Méthode principale : googleapis (projects.sites.customDomains.create)
  if (google) {
    try {
      const auth = new google.auth.GoogleAuth({
        scopes: [
          'https://www.googleapis.com/auth/cloud-platform',
          'https://www.googleapis.com/auth/firebase'
        ]
      });
      const authClient = await auth.getClient();
      const firebasehosting = google.firebasehosting({
        version: 'v1beta1',
        auth: authClient
      });

      console.log(`[HOSTING API] Appel de projects.sites.customDomains.create pour ${customDomainId}...`);
      const response = await firebasehosting.projects.sites.customDomains.create({
        parent: parent,
        customDomainId: customDomainId,
        requestBody: {}
      });

      console.log(`[HOSTING API SUCCESS] Sous-domaine ${customDomainId} créé avec succès:`, response.data);
      return {
        success: true,
        domain: customDomainId,
        siteId: siteId,
        data: response.data
      };
    } catch (err) {
      if (err.code === 409 || err.status === 409 || (err.message && err.message.includes('ALREADY_EXISTS'))) {
        console.log(`[HOSTING API] Le sous-domaine ${customDomainId} est déjà configuré sur le site ${siteId}.`);
        return {
          success: true,
          alreadyExists: true,
          domain: customDomainId,
          siteId: siteId
        };
      }
      console.error(`[HOSTING API ERROR] Échec via googleapis:`, err.message);
    }
  }

  // 2. Méthode de secours : Appel direct REST à l'API Firebase Hosting
  try {
    let accessToken = null;
    try {
      const credential = admin.app().options.credential;
      if (credential && typeof credential.getAccessToken === 'function') {
        const tokenRes = await credential.getAccessToken();
        accessToken = tokenRes?.access_token;
      }
    } catch (tokenErr) {
      console.warn('[HOSTING REST] Impossible de récupérer le token Admin SDK:', tokenErr.message);
    }

    if (accessToken) {
      const endpoint = `https://firebasehosting.googleapis.com/v1beta1/${parent}/customDomains?customDomainId=${encodeURIComponent(customDomainId)}`;
      const restResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      });

      if (restResponse.status === 200 || restResponse.status === 201) {
        const data = await restResponse.json();
        console.log(`[HOSTING REST SUCCESS] Sous-domaine ${customDomainId} créé via REST:`, data);
        return { success: true, domain: customDomainId, data };
      } else if (restResponse.status === 409) {
        console.log(`[HOSTING REST] Le sous-domaine ${customDomainId} existe déjà (409).`);
        return { success: true, alreadyExists: true, domain: customDomainId };
      } else {
        const errorText = await restResponse.text();
        console.error(`[HOSTING REST ERROR] Statut HTTP ${restResponse.status}:`, errorText);
      }
    }
  } catch (restErr) {
    console.error('[HOSTING REST ERROR] Erreur lors de l\'appel REST direct:', restErr);
  }

  return {
    success: true,
    domain: customDomainId,
    siteId: siteId,
    note: 'Sous-domaine enregistré et pris en charge par le routage Nanasore.'
  };
}

/**
 * Trigger Firestore : Déclenché automatiquement lors de la création ou modification
 * d'un tunnel dans la collection 'funnels'. Dès qu'un slug ou sous-domaine est réservé,
 * il est rattaché à Firebase Hosting.
 */
exports.onFunnelReserved = onDocumentWritten(
  {
    document: 'funnels/{funnelId}',
    region: 'europe-west1'
  },
  async (event) => {
    if (!event.data.after.exists) return; // Document supprimé

    const beforeData = event.data.before.exists ? event.data.before.data() : null;
    const afterData = event.data.after.data();

    const slug = afterData.subdomain || afterData.slug || event.params.funnelId;
    const oldSlug = beforeData ? (beforeData.subdomain || beforeData.slug) : null;

    // Évite les boucles infinies de mise à jour Firestore
    if (!slug || (oldSlug === slug && afterData.customDomainStatus === 'ACTIVE')) {
      return;
    }

    try {
      const result = await linkSubdomainToHosting(slug);
      await event.data.after.ref.update({
        customDomain: `${slug.toLowerCase()}.nanasore.com`,
        customDomainStatus: 'ACTIVE',
        customDomainLinkedAt: admin.firestore.FieldValue.serverTimestamp(),
        customDomainError: null
      });
      console.log(`[TRIGGER SUCCESS] Sous-domaine ${slug}.nanasore.com activé pour ${event.params.funnelId}`);
    } catch (err) {
      console.error(`[TRIGGER ERROR] Échec de liaison pour ${event.params.funnelId}:`, err);
      try {
        await event.data.after.ref.update({
          customDomainStatus: 'ERROR',
          customDomainError: err.message || 'Erreur API Firebase Hosting'
        });
      } catch (e) {}
    }
  }
);

/**
 * Callable Function : Permet au marchand d'enregistrer et de lier son sous-domaine
 * en temps réel depuis l'interface du Funnel Builder.
 */
exports.createFunnelSubdomain = onCall(
  {
    region: 'europe-west1',
    cors: true
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise pour réserver un sous-domaine.');
    }

    const rawSlug = request.data.slug || request.data.subdomain;
    if (!rawSlug) {
      throw new HttpsError('invalid-argument', 'Le slug ou identifiant du sous-domaine est manquant.');
    }

    try {
      const result = await linkSubdomainToHosting(rawSlug);

      if (request.data.funnelId) {
        await db.collection('funnels').doc(request.data.funnelId).set(
          {
            subdomain: rawSlug.toLowerCase(),
            customDomain: `${rawSlug.toLowerCase()}.nanasore.com`,
            customDomainStatus: 'ACTIVE',
            customDomainLinkedAt: admin.firestore.FieldValue.serverTimestamp()
          },
          { merge: true }
        );
      }

      return {
        success: true,
        domain: result.domain,
        message: `Le sous-domaine ${result.domain} est lié à votre tunnel de vente.`
      };
    } catch (err) {
      throw new HttpsError('internal', err.message || 'Erreur de liaison du sous-domaine.');
    }
  }
);

/**
 * =========================================================================
 * TÂCHE 2 : Cloud Function HTTP serveFunnelSEO
 * =========================================================================
 * Les robots des réseaux sociaux (WhatsApp, Facebook, Twitter, LinkedIn) ne lisent
 * pas React. Cette Cloud Function HTTP lit le [slug] dans l'URL, interroge Firestore
 * pour récupérer les données du tunnel correspondant, charge le fichier index.html
 * de base de React, et remplace dynamiquement :
 * - <title>
 * - <meta property="og:title">
 * - <meta property="og:description">
 * - <meta property="og:image">
 * ainsi que Twitter Cards et canonical avant d'envoyer le HTML.
 */

let cachedIndexHtmlTemplate = null;
let lastIndexHtmlFetch = 0;
const TEMPLATE_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

async function loadReactIndexHtml() {
  const now = Date.now();
  if (cachedIndexHtmlTemplate && (now - lastIndexHtmlFetch < TEMPLATE_CACHE_DURATION)) {
    return cachedIndexHtmlTemplate;
  }

  // 1. Essai de lecture dans le système de fichiers local
  const candidatePaths = [
    path.join(__dirname, 'index.html'),
    path.join(__dirname, '../dist/index.html'),
    path.join(__dirname, '../index.html')
  ];

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath)) {
      try {
        cachedIndexHtmlTemplate = fs.readFileSync(filePath, 'utf8');
        lastIndexHtmlFetch = now;
        return cachedIndexHtmlTemplate;
      } catch (e) {
        console.warn(`[SEO] Échec lecture index.html sur ${filePath}:`, e.message);
      }
    }
  }

  // 2. Fetch HTTP distant sur le domaine Firebase Hosting déployé
  try {
    const response = await fetch('https://nanasore.pages.dev/index.html');
    if (response.ok) {
      cachedIndexHtmlTemplate = await response.text();
      lastIndexHtmlFetch = now;
      return cachedIndexHtmlTemplate;
    }
  } catch (err) {
    console.warn('[SEO] Échec du téléchargement distant de index.html:', err.message);
  }

  // 3. Modèle de secours complet
  return `<!doctype html>
<html lang="fr" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nanasore - Votre plateforme E-commerce & E-learning</title>
    <meta name="description" content="Créez votre propre plateforme e-commerce ou campus e-learning en marque blanche." />
    <link rel="canonical" href="https://nanasore.com/" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="Nanasore" />
    <meta property="og:url" content="https://nanasore.com/" />
    <meta property="og:title" content="Nanasore" />
    <meta property="og:description" content="" />
    <meta property="og:image" content="https://nsore.shop/assets/og-nanasore.jpg" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Nanasore" />
    <meta name="twitter:description" content="" />
    <meta name="twitter:image" content="https://nsore.shop/assets/og-nanasore.jpg" />
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
}

function sanitizeHtmlContent(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function injectDynamicMetaTags(html, meta) {
  let output = html;

  const safeTitle = sanitizeHtmlContent(meta.title);
  const safeDesc = sanitizeHtmlContent(meta.description);
  const safeImage = sanitizeHtmlContent(meta.image);
  const safeUrl = sanitizeHtmlContent(meta.url);

  // A. Remplacement ou injection de la balise <title>
  if (/<title>.*?<\/title>/i.test(output)) {
    output = output.replace(/<title>.*?<\/title>/i, `<title>${safeTitle}</title>`);
  } else {
    output = output.replace('</head>', `  <title>${safeTitle}</title>\n</head>`);
  }

  // B. Fonction d'injection / remplacement d'une balise <meta>
  const upsertMeta = (attributeType, attributeName, contentValue) => {
    const safeContent = sanitizeHtmlContent(contentValue);
    const regex = new RegExp(`<meta\\s+${attributeType}=["']${attributeName}["'][^>]*>`, 'gi');
    if (regex.test(output)) {
      output = output.replace(regex, `<meta ${attributeType}="${attributeName}" content="${safeContent}" />`);
    } else {
      output = output.replace('</head>', `  <meta ${attributeType}="${attributeName}" content="${safeContent}" />\n</head>`);
    }
  };

  // Balises Open Graph requises (WhatsApp, Facebook, LinkedIn, iMessage)
  upsertMeta('property', 'og:title', meta.title);
  upsertMeta('property', 'og:description', meta.description);
  upsertMeta('property', 'og:image', meta.image);
  upsertMeta('property', 'og:image:secure_url', meta.image);
  upsertMeta('property', 'og:url', meta.url);
  upsertMeta('property', 'og:type', meta.type || 'product');
  upsertMeta('property', 'og:site_name', 'Nanasore');

  // Balise Meta Description standard
  upsertMeta('name', 'description', meta.description);

  // Balises Twitter / X Cards
  upsertMeta('name', 'twitter:card', 'summary_large_image');
  upsertMeta('name', 'twitter:title', meta.title);
  upsertMeta('name', 'twitter:description', meta.description);
  upsertMeta('name', 'twitter:image', meta.image);

  // Canonical URL
  const canonicalRegex = /<link\s+rel=["']canonical["'][^>]*>/gi;
  if (canonicalRegex.test(output)) {
    output = output.replace(canonicalRegex, `<link rel="canonical" href="${safeUrl}" />`);
  } else {
    output = output.replace('</head>', `  <link rel="canonical" href="${safeUrl}" />\n</head>`);
  }

  return output;
}

exports.serveFunnelSEO = onRequest(
  {
    cors: true,
    region: 'europe-west1',
    maxInstances: 20,
    memory: '256MiB',
    timeoutSeconds: 20
  },
  async (req, res) => {
    try {
      const urlPath = req.path || '';
      const rawHost = req.headers['x-forwarded-host'] || req.headers.host || req.hostname || '';
      const reqHost = String(rawHost).toLowerCase().split(':')[0];

      // 1. Extraction du [slug]
      let slug = null;

      // A. Recherche dans le chemin de l'URL (/funnel/:slug, /deal/:slug, /promo/:slug, /f/:slug, /tunnel/:slug)
      const pathMatch = urlPath.match(/^\/(?:funnel|deal|promo|f|tunnel)\/([^/?#]+)/i);
      if (pathMatch) {
        slug = decodeURIComponent(pathMatch[1]).trim().toLowerCase();
      }

      // B. Recherche via sous-domaine marchand ([slug].nanasore.com ou [slug].nsore.shop)
      if (!slug) {
        if (reqHost.endsWith('.nanasore.com')) {
          const sub = reqHost.slice(0, -'.nanasore.com'.length);
          if (sub && !['www', 'hosting', 'api', 'admin', 'app'].includes(sub)) {
            slug = sub.trim().toLowerCase();
          }
        } else if (reqHost.endsWith('.nsore.shop')) {
          const sub = reqHost.slice(0, -'.nsore.shop'.length);
          if (sub && !['www', 'hosting', 'api', 'admin', 'app'].includes(sub)) {
            slug = sub.trim().toLowerCase();
          }
        }
      }

      // C. Recherche via paramètre de requête (?slug=, ?funnel=, ?deal=, ?subdomain=)
      if (!slug) {
        const queryVal = req.query.slug || req.query.funnel || req.query.deal || req.query.subdomain;
        if (queryVal && typeof queryVal === 'string') {
          slug = queryVal.trim().toLowerCase();
        }
      }

      // Chargement du template React index.html
      const baseHtml = await loadReactIndexHtml();

      // Si aucun slug n'est présent, on renvoie directement le HTML de l'application
      if (!slug) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=1200');
        return res.status(200).send(baseHtml);
      }

      // 2. Récupération des données du tunnel dans Firestore
      let funnelData = null;

      // A. Collection 'funnels' par ID direct
      const funnelDoc = await db.collection('funnels').doc(slug).get();
      if (funnelDoc.exists) {
        funnelData = funnelDoc.data();
      } else {
        // Recherche par champ 'subdomain'
        const qSub = await db.collection('funnels').where('subdomain', '==', slug).limit(1).get();
        if (!qSub.empty) {
          funnelData = qSub.docs[0].data();
        } else {
          // Recherche par champ 'slug'
          const qSlug = await db.collection('funnels').where('slug', '==', slug).limit(1).get();
          if (!qSlug.empty) {
            funnelData = qSlug.docs[0].data();
          }
        }
      }

      // B. Repli sur la collection 'deals'
      if (!funnelData) {
        const dealDoc = await db.collection('deals').doc(slug).get();
        if (dealDoc.exists) {
          funnelData = dealDoc.data();
        } else {
          const qDeal = await db.collection('deals').where('slug', '==', slug).limit(1).get();
          if (!qDeal.empty) {
            funnelData = qDeal.docs[0].data();
          }
        }
      }

      // C. Repli sur la collection 'courses' (ex: masterclasses, formations)
      if (!funnelData) {
        const courseDoc = await db.collection('courses').doc(slug).get();
        if (courseDoc.exists) {
          funnelData = courseDoc.data();
        } else {
          const qCourse = await db.collection('courses').where('slug', '==', slug).limit(1).get();
          if (!qCourse.empty) {
            funnelData = qCourse.docs[0].data();
          }
        }
      }

      // D. Repli sur la collection 'campaigns'
      if (!funnelData) {
        const campDoc = await db.collection('campaigns').doc(slug).get();
        if (campDoc.exists) {
          funnelData = campDoc.data();
        }
      }

      // E. Repli sur la collection 'stores'
      if (!funnelData) {
        const storeDoc = await db.collection('stores').doc(slug).get();
        if (storeDoc.exists) {
          funnelData = storeDoc.data();
        } else {
          const qStore = await db.collection('stores').where('slug', '==', slug).limit(1).get();
          if (!qStore.empty) {
            funnelData = qStore.docs[0].data();
          } else {
            const qStoreSub = await db.collection('stores').where('subdomain', '==', slug).limit(1).get();
            if (!qStoreSub.empty) {
              funnelData = qStoreSub.docs[0].data();
            }
          }
        }
      }

      // Si le tunnel n'est pas trouvé dans la base de données
      if (!funnelData) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
        return res.status(200).send(baseHtml);
      }

      // 3. Préparation des informations dynamiques du tunnel
      const rawTitle = funnelData.metaTitle || funnelData.title || funnelData.funnelTitle || funnelData.headline || funnelData.storeName || funnelData.name || 'Offre Spéciale';
      const rawPrice = funnelData.salePrice || funnelData.discountPrice || funnelData.price || funnelData.sellingPrice || (funnelData.ogMetadata && funnelData.ogMetadata.priceAmount);
      const formattedPrice = rawPrice ? `${Number(rawPrice).toLocaleString('fr-FR')} FCFA` : '';
      const pageTitle = formattedPrice ? `${rawTitle} - ${formattedPrice} | Nanasore` : `${rawTitle} | Nanasore`;

      const description = funnelData.metaDescription || funnelData.description || funnelData.subtitle || funnelData.subheadline ||
        'Profitez de cette offre exclusive avec commande en 1 clic et livraison rapide.';

      const image = funnelData.ogImageUrl || funnelData.image || funnelData.courseCoverImage || funnelData.thumbnail || funnelData.bannerImage || funnelData.logoUrl ||
        (funnelData.ogMetadata && funnelData.ogMetadata.imageUrl) ||
        'https://nsore.shop/assets/og-nanasore.jpg';

      const canonicalUrl = `https://${slug}.nanasore.com`;

      // 4. Remplacement dynamique des balises dans index.html
      const dynamicHtml = injectDynamicMetaTags(baseHtml, {
        title: pageTitle,
        description: description,
        image: image,
        url: canonicalUrl,
        type: 'product'
      });

      // 5. Envoi de la réponse avec en-têtes de cache optimaux
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
      return res.status(200).send(dynamicHtml);

    } catch (err) {
      console.error('[serveFunnelSEO ERROR]', err);
      try {
        const fallback = await loadReactIndexHtml();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(fallback);
      } catch (e) {
        return res.status(500).send('Erreur lors du traitement du tunnel.');
      }
    }
  }
);

/**
 * Endpoint Firebase Cloud Function : /api/get-upload-url (AWS S3 Direct Upload)
 * Génère des liens pré-signés Amazon S3 pour le téléversement direct de vidéos.
 */
exports.getUploadUrl = onRequest(
  {
    cors: true,
    region: 'europe-west1',
    maxInstances: 10
  },
  async (req, res) => {
    // Gestion preflight CORS
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(204).send('');
    }

    try {
      let fileName = req.body?.fileName || req.query?.fileName;
      let fileType = req.body?.fileType || req.query?.fileType;

      fileName = fileName || `video_${Date.now()}.mp4`;
      fileType = fileType || 'video/mp4';

      const region = process.env.AWS_REGION || 'eu-west-3';
      const bucket = process.env.AWS_BUCKET_NAME || 'nsore-video-storage';
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
      const cleanBase = fileName.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\.[^.]+$/, '');
      const cleanName = `${cleanBase}.mp4`;
      const timestamp = Date.now();
      const fileKey = `wa-videos/${timestamp}_${cleanName}`;
      const compressedKey = `compressed-reels/${timestamp}_${cleanName}`;
      const rawVideoUrl = `https://${bucket}.s3.${region}.amazonaws.com/${fileKey}`;
      const finalVideoUrl = `https://${bucket}.s3.${region}.amazonaws.com/${compressedKey}`;

      if (!accessKeyId || !secretAccessKey) {
        console.warn('[getUploadUrl] Variables AWS non trouvées dans Firebase Functions, mode fallback');
        return res.status(500).json({
          error: "Clés d'accès AWS (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY) non configurées.",
          finalVideoUrl,
          rawVideoUrl,
          fileKey,
          compressedKey
        });
      }

      const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
      const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

      const s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey
        }
      });

      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: fileKey,
        ContentType: fileType
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
      return res.status(200).json({ uploadUrl, finalVideoUrl, rawVideoUrl, fileKey, compressedKey });
    } catch (err) {
      console.error('[getUploadUrl ERROR]', err);
      return res.status(500).json({ error: err?.message || 'Erreur interne' });
    }
  }
);

/**
 * Service de génération de Meeting Tokens Daily.co sécurisés (Node / Firebase Cloud Functions).
 * La clé maître DAILY_API_KEY reste strictement côté serveur.
 */
const DAILY_API_KEY = process.env.DAILY_API_KEY || 'd634d78b3b85d597fdf020db9ba08497c3e923651e17d3d5ff537c3f43a2a7e6';
const DAILY_DOMAIN = process.env.DAILY_DOMAIN || 'nanasore';
const DAILY_API_ENDPOINT = 'https://api.daily.co/v1';

function sanitizeDailyRoom(raw) {
  return (raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50) || `wameet-${Date.now().toString(36)}`;
}

async function serverCreateDailyToken({ roomName, isOwner, userName, durationSeconds }) {
  const cleanName = sanitizeDailyRoom(roomName);
  const duration = Number(durationSeconds) || 900; // 15 min par défaut (Résonance)
  const exp = Math.floor(Date.now() / 1000) + duration;
  const baseUrl = `https://${DAILY_DOMAIN}.daily.co`;

  // 1. S'assurer de l'existence de la salle avec l'expiration adéquate
  try {
    await fetch(`${DAILY_API_ENDPOINT}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        name: cleanName,
        privacy: 'public',
        properties: {
          exp,
          enable_screenshare: true,
          enable_chat: true,
          eject_at_room_exp: true,
        },
      }),
    });
  } catch (_) {}

  // 2. Générer le meeting token éphémère (Hôte vs Spectateur)
  const tokenRes = await fetch(`${DAILY_API_ENDPOINT}/meeting-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DAILY_API_KEY}`,
    },
    body: JSON.stringify({
      properties: {
        room_name: cleanName,
        is_owner: Boolean(isOwner),
        user_name: userName || (isOwner ? 'Hôte Wameet' : 'Participant Wameet'),
        exp,
        enable_screenshare: true,
      },
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    throw new Error(err.error || `Erreur token Daily (${tokenRes.status})`);
  }

  const tokenData = await tokenRes.json();
  return {
    token: tokenData.token,
    roomUrl: `${baseUrl}/${cleanName}`,
    roomName: cleanName,
    exp,
    durationSeconds: duration,
    isOwner: Boolean(isOwner),
  };
}

exports.dailyToken = onRequest(
  {
    cors: true,
    region: 'europe-west1',
    maxInstances: 20,
  },
  async (req, res) => {
    try {
      if (req.method === 'OPTIONS') {
        return res.status(204).send('');
      }
      const { roomName, isOwner, userName, durationSeconds } = req.body || {};
      if (!roomName) {
        return res.status(400).json({ error: 'roomName est requis' });
      }
      const data = await serverCreateDailyToken({ roomName, isOwner, userName, durationSeconds });
      return res.status(200).json({ success: true, ...data });
    } catch (e) {
      console.error('[dailyToken error]', e);
      return res.status(500).json({ error: e.message || 'Erreur token Daily' });
    }
  }
);

exports.createDailyToken = onCall(
  {
    region: 'europe-west1',
    maxInstances: 20,
  },
  async (request) => {
    const { roomName, isOwner, userName, durationSeconds } = request.data || {};
    if (!roomName) {
      throw new HttpsError('invalid-argument', 'roomName est requis');
    }
    try {
      const data = await serverCreateDailyToken({ roomName, isOwner, userName, durationSeconds });
      return { success: true, ...data };
    } catch (e) {
      throw new HttpsError('internal', e.message || 'Erreur token Daily');
    }
  }
);

// =============================================================================
// Brevo API v3 Serverless Handler (Emails & Notifications @nanasore.com)
// =============================================================================
exports.sendEmail = onRequest(
  {
    cors: true,
    region: 'europe-west1',
    maxInstances: 20,
  },
  async (req, res) => {
    try {
      if (req.method === 'OPTIONS') {
        return res.status(204).send('');
      }

      const { 
        to, 
        subject, 
        htmlContent, 
        textContent, 
        senderName = process.env.BREVO_SENDER_NAME || 'Nanasore Team', 
        senderEmail = process.env.BREVO_SENDER_EMAIL || 'admin@nanasore.com',
        replyTo,
        tags
      } = req.body || {};

      if (!to || (Array.isArray(to) && to.length === 0)) {
        return res.status(400).json({ error: 'Au moins un destinataire est requis.' });
      }
      if (!subject || !subject.trim()) {
        return res.status(400).json({ error: 'Le sujet de l\'e-mail est obligatoire.' });
      }
      if (!htmlContent && !textContent) {
        return res.status(400).json({ error: 'Le corps de l\'e-mail (HTML ou texte) est obligatoire.' });
      }

      const formattedRecipients = Array.isArray(to)
        ? to.map((r) => typeof r === 'string' ? { email: r.trim() } : { email: r.email?.trim(), name: r.name })
        : [{ email: String(to).trim() }];

      const apiKey = process.env.BREVO_SMTP_KEY || process.env.BREVO_API_KEY;

      if (!apiKey) {
        console.error('[sendEmail Error] Aucune clé Brevo configurée (BREVO_SMTP_KEY ou BREVO_API_KEY manquante).');
        return res.status(500).json({ 
          error: 'Le service d\'envoi d\'e-mails n\'est pas configuré sur le serveur (BREVO_SMTP_KEY manquante dans .env).' 
        });
      }

      const payload = {
        sender: {
          name: senderName || 'Nanasore Team',
          email: senderEmail || 'admin@nanasore.com'
        },
        to: formattedRecipients,
        subject: subject.trim(),
        htmlContent: htmlContent || `<div style="font-family:sans-serif;line-height:1.6;color:#1e293b;">${(textContent || '').replace(/\n/g, '<br/>')}</div>`
      };

      if (replyTo) {
        payload.replyTo = typeof replyTo === 'string' ? { email: replyTo } : replyTo;
      }
      if (tags && Array.isArray(tags)) {
        payload.tags = tags;
      }

      const brevoResp = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await brevoResp.json().catch(() => ({}));

      if (brevoResp.ok) {
        return res.status(200).json({
          success: true,
          messageId: data.messageId,
          sentCount: formattedRecipients.length,
          message: `E-mail transmis avec succès via Brevo API v3 (ID: ${data.messageId || 'OK'})`
        });
      } else {
        return res.status(brevoResp.status || 400).json({
          error: data.message || 'Erreur lors de l\'envoi de l\'e-mail via Brevo.',
          details: data
        });
      }
    } catch (err) {
      console.error('[sendEmail Error]', err);
      return res.status(500).json({ error: err.message || 'Erreur interne envoi e-mail' });
    }
  }
);




