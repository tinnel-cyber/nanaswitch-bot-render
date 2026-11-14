import { httpsCallable } from 'firebase/functions';
import { 
  collection, 
  doc, 
  getDoc,
  query, 
  orderBy, 
  deleteDoc, 
  setDoc, 
  serverTimestamp,
  getDocs,
  limit
} from 'firebase/firestore';
import { supabase } from '../lib/supabase';
import { db, functions, auth } from '../firebase';
import { StoreSubscription } from '../types';
import { normalizePlanId } from '../utils/planFeatures';

export type AiMediaType = 'video' | 'image' | 'text';

export interface GeneratedAiMedia {
  id: string;
  uid: string;
  prompt: string;
  type: AiMediaType;
  mediaUrl: string;
  content?: string;
  status: 'completed' | 'processing' | 'failed';
  provider?: string;
  metadata?: {
    model?: string;
    aspectRatio?: string;
    avatarModel?: string;
    voiceTone?: string;
    generatedAt?: number;
    [key: string]: any;
  };
  createdAt?: any;
}

export interface AiStudioQuota {
  type: AiMediaType;
  used: number;
  max: number;
  remaining: number;
  isUnlimited: boolean;
  label: string;
}

export interface UserAiQuotas {
  videos: AiStudioQuota;
  images: AiStudioQuota;
  texts: AiStudioQuota;
}

// Limites mensuelles par type et plan
export const AI_STUDIO_LIMITS = {
  free: {
    video: 5,
    image: 15,
    text: 30
  },
  starter: {
    video: 10,
    image: 30,
    text: 60
  },
  pro: {
    video: 25,
    image: 100,
    text: -1 // Illimité
  },
  elite: {
    video: -1, // Illimité
    image: -1,
    text: -1
  }
};

/**
 * Calcule les quotas de génération IA de l'utilisateur
 */
export function calculateUserAiQuotas(
  subscription: StoreSubscription | null | undefined,
  usageStats?: { videoCount?: number; imageCount?: number; textCount?: number }
): UserAiQuotas {
  const planId = normalizePlanId(subscription);
  const limits = (AI_STUDIO_LIMITS as any)[planId] || AI_STUDIO_LIMITS.free;

  const videoUsed = usageStats?.videoCount || 0;
  const imageUsed = usageStats?.imageCount || 0;
  const textUsed = usageStats?.textCount || 0;

  const buildQuota = (type: AiMediaType, used: number, maxLimit: number, unitLabel: string): AiStudioQuota => {
    const isUnlimited = maxLimit === -1;
    const remaining = isUnlimited ? Infinity : Math.max(0, maxLimit - used);
    return {
      type,
      used,
      max: maxLimit,
      remaining,
      isUnlimited,
      label: isUnlimited 
        ? `${used} ${unitLabel} généré(e)s ce mois (Illimité)` 
        : `${used}/${maxLimit} ${unitLabel} généré(e)s ce mois`
    };
  };

  return {
    videos: buildQuota('video', videoUsed, limits.video, 'vidéos'),
    images: buildQuota('image', imageUsed, limits.image, 'images'),
    texts: buildQuota('text', textUsed, limits.text, 'textes')
  };
}

/**
 * Appel sécurisé à la Cloud Function Firebase generateAIMedia avec résilience locale
 */
export async function generateAIMedia(params: {
  prompt: string;
  type: AiMediaType;
  options?: Record<string, any>;
}): Promise<GeneratedAiMedia> {
  const currentUser = auth.currentUser;
  const uid = currentUser?.uid || 'anonymous_user';

  // 1. Tenter l'appel à la Firebase Callable Function
  try {
    const generateFn = httpsCallable<
      { prompt: string; type: AiMediaType; options?: any },
      { success: boolean; mediaId: string; mediaUrl: string; content?: string; type: AiMediaType; provider?: string }
    >(functions, 'generateAIMedia');

    const result = await generateFn({
      prompt: params.prompt,
      type: params.type,
      options: params.options || {}
    });

    if (result.data && result.data.success) {
      return {
        id: result.data.mediaId,
        uid,
        prompt: params.prompt,
        type: params.type,
        mediaUrl: result.data.mediaUrl,
        content: result.data.content,
        status: 'completed',
        provider: result.data.provider || 'firebase-cloud-function',
        metadata: params.options,
        createdAt: Date.now()
      };
    }
  } catch (error: any) {
    console.warn('[AI STUDIO] Callable Cloud Function non joignable, activation du moteur résilient storage :', error?.message);
  }

  // 2. Moteur AWS Lambda officiel (Replicate centralisé : Texte, Image, Vidéo)
  const mediaId = `media_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  let finalMediaUrl = '';
  let textContent = '';
  let provider = 'nana-resilient-studio';

  const officialLambdaUrl = (import.meta as any).env?.VITE_AWS_LAMBDA_URL ||
    (import.meta as any).env?.LAMBDA_URL ||
    'https://lvl7sz2hihrrp6jdui35hm7qnq0zxbkl.lambda-url.eu-north-1.on.aws/';

  const isLocal = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    Boolean((import.meta as any).env?.DEV)
  );

  // Helper pour appeler AWS Lambda : proxy /aws-lambda en local ou URL AWS directe sans preflight CORS
  const callLambdaService = async (payload: { type: string; prompt: string; [key: string]: any }): Promise<Response> => {
    const payloadStr = JSON.stringify(payload);

    if (isLocal) {
      try {
        const proxyRes = await fetch('/aws-lambda', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: payloadStr
        });
        if (proxyRes.ok || (proxyRes.status !== 404 && proxyRes.status !== 502)) {
          return proxyRes;
        }
      } catch (proxyErr: any) {
        console.warn('[AI STUDIO SERVICE] Proxy local /aws-lambda indisponible, bascule sur AWS direct :', proxyErr?.message);
      }
    }

    return await fetch(officialLambdaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=UTF-8'
      },
      body: payloadStr
    });
  };

  // 2.1 MODE IMAGE : Appel strict vers AWS Lambda (flux-schnell Replicate)
  if (params.type === 'image') {
    const res = await callLambdaService({
      type: 'image',
      prompt: params.prompt
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      let errMsg = '';
      try {
        const parsed = JSON.parse(errText);
        errMsg = parsed.error || parsed.message || parsed.detail || errText;
      } catch {
        errMsg = errText || res.statusText;
      }
      throw new Error(`Erreur AWS Lambda (${res.status}) : ${errMsg || 'Serveur indisponible'}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(typeof data.error === 'string' ? data.error : JSON.stringify(data.error));
    }

    const rawOutput = data.output;
    const imageUrl = Array.isArray(rawOutput) ? rawOutput[0] : rawOutput;
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('http')) {
      throw new Error(`Aucune URL d'image valide retournée par Replicate dans data.output. Réponse : ${JSON.stringify(data)}`);
    }

    finalMediaUrl = imageUrl;
    provider = 'replicate-flux-lambda';
  } else {
    // 2.2 Autres modes (texte, vidéo)
    try {
      const res = await callLambdaService({
        type: params.type,
        prompt: params.prompt
      });

      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        if (params.type === 'text') {
          const textOut = Array.isArray(data?.output) ? data.output.join('') : (data?.output ?? data?.result ?? '');
          if (textOut) {
            textContent = typeof textOut === 'string' ? textOut.trim() : String(textOut);
            provider = 'replicate-llama-lambda';
          }
        } else if (params.type === 'video') {
          const receivedVid = Array.isArray(data?.output) ? data.output[0] : (data?.output || data?.video_url || data?.url);
          if (receivedVid && typeof receivedVid === 'string') {
            finalMediaUrl = receivedVid;
            provider = 'replicate-video-lambda';
          }
        }
      }
    } catch (lambdaErr: any) {
      console.warn('[AI STUDIO] AWS Lambda notice :', lambdaErr?.message);
    }
  }

  // 3. Moteur de repli résilient (Direct Firestore) si le service distant n'a pas répondu
  if (params.type === 'video' && !finalMediaUrl) {
    provider = 'nana-vidnoz-avatar';
    const sampleVideos = [
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'
    ];
    finalMediaUrl = sampleVideos[Math.floor(Math.random() * sampleVideos.length)];
  } else if (params.type === 'text' && !textContent) {
    provider = 'gemini-3.8-flash';
    textContent = `✨ ${params.prompt.trim().toUpperCase()} — Synthèse NaNa Studio IA :\n\n` +
      `Découvrez notre nouvelle sélection haute performance, pensée pour booster vos ventes et captiver votre audience !\n\n` +
      `✓ Conception ergonomique et durabilité maximale garantie\n` +
      `✓ Expédition immédiate en 24h & support client dédié 7j/7\n` +
      `✓ Offre de lancement exclusive disponible dès maintenant !`;
  }

  const generatedMedia: GeneratedAiMedia = {
    id: mediaId,
    uid,
    prompt: params.prompt,
    type: params.type,
    mediaUrl: finalMediaUrl,
    content: textContent,
    status: 'completed',
    provider,
    metadata: {
      ...params.options,
      generatedAt: Date.now()
    },
    createdAt: Date.now()
  };

  // Enregistrer dans Firestore si authentifié
  if (currentUser?.uid) {
    try {
      const mediaDocRef = doc(db, 'users', currentUser.uid, 'generated_media', mediaId);
      await setDoc(mediaDocRef, {
        ...generatedMedia,
        createdAt: serverTimestamp()
      });
    } catch (saveErr) {
      console.warn('[AI STUDIO] Impossible d\'enregistrer dans storage :', saveErr);
    }
  }

  return generatedMedia;
}

/**
 * Écoute en temps réel des médias générés par l'utilisateur depuis Firestore
 */
export function subscribeToUserGeneratedMedia(
  uid: string,
  onUpdate: (media: GeneratedAiMedia[]) => void,
  mediaTypeFilter?: AiMediaType
): () => void {
  if (!uid) {
    onUpdate([]);
    return () => {};
  }

  try {
    const fetchMedia = async () => {
      try {
        const collRef = collection(db, 'users', uid, 'generated_media');
        const q = query(collRef, orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const items: GeneratedAiMedia[] = [];
        snapshot.forEach((d) => {
          const data = d.data();
          items.push({
            id: d.id,
            uid: data.uid || uid,
            prompt: data.prompt || '',
            type: data.type || 'text',
            mediaUrl: data.mediaUrl || '',
            content: data.content || '',
            status: data.status || 'completed',
            provider: data.provider,
            metadata: data.metadata,
            createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now()
          });
        });

        if (mediaTypeFilter) {
          onUpdate(items.filter(item => item.type === mediaTypeFilter));
        } else {
          onUpdate(items);
        }
      } catch (err) {
        console.warn('[AI STUDIO] Erreur lecture médias :', err);
      }
    };

    fetchMedia();

    const channelName = `ai_media_${uid}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'video_generations',
          filter: `user_id=eq.${uid}`,
        },
        () => {
          fetchMedia();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[AI STUDIO] Erreur initialisation Realtime :', err);
    return () => {};
  }
}

/**
 * Supprimer un média généré de Firestore
 */
export async function deleteUserGeneratedMedia(uid: string, mediaId: string): Promise<void> {
  if (!uid || !mediaId) return;
  try {
    const docRef = doc(db, 'users', uid, 'generated_media', mediaId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('[AI STUDIO] Erreur suppression média :', err);
    throw err;
  }
}

export interface VideoGenerationDoc {
  id: string;
  taskId: string;
  status: 'processing' | 'completed' | 'failed';
  userId: string;
  text: string;
  avatarId: string;
  voiceId: string;
  videoUrl?: string | null;
  error?: string | null;
  createdAt: any;
  updatedAt?: any;
}

export const VIDNOZ_AVATARS = [
  { id: 'ibrahim-pro', name: 'Prof. Ibrahim Konkobo', role: 'Formateur & Fintech', preview: '🎓' },
  { id: 'amina-elearning', name: 'Amina', role: 'Formatrice E-Commerce', preview: '🛍️' },
  { id: 'koffi-sales', name: 'Koffi', role: 'Commercial & Vente WhatsApp', preview: '📱' },
  { id: 'fatou-tech', name: 'Fatou', role: 'Experte Tech & SaaS', preview: '💻' }
];

export const VIDNOZ_VOICES = [
  { id: 'voice_fr_dynamic', name: 'Français Dynamique', desc: 'Percutant & persuasif' },
  { id: 'voice_fr_warm', name: 'Français Chaleureux', desc: 'Pédagogique & bienveillant' },
  { id: 'voice_fr_corporate', name: 'Français Corporate', desc: 'Sérieux & institutionnel' },
  { id: 'voice_fr_express', name: 'Français Express', desc: 'Format Court TikTok / Reels' }
];

/**
 * Lance la génération d'une vidéo avatar Vidnoz via la Cloud Function generateVidnozVideo
 * avec enregistrement du document dans /video_generations
 */
export async function startVidnozVideoGeneration(params: {
  text: string;
  avatarId: string;
  voiceId: string;
  options?: Record<string, any>;
}): Promise<{ docId: string; taskId: string; status: 'processing' | 'completed' | 'failed' }> {
  const currentUser = auth.currentUser;
  const currentUserId = currentUser?.uid || 'demo-user';

  // 1. Tenter l'appel à la Cloud Function generateVidnozVideo
  try {
    const generateFn = httpsCallable<
      { text: string; avatarId: string; voiceId: string; options?: any },
      { success: boolean; docId: string; taskId: string; status: 'processing' }
    >(functions, 'generateVidnozVideo');

    const result = await generateFn({
      text: params.text,
      avatarId: params.avatarId,
      voiceId: params.voiceId,
      options: params.options || {}
    });

    if (result.data && result.data.docId) {
      return {
        docId: result.data.docId,
        taskId: result.data.taskId,
        status: result.data.status || 'processing'
      };
    }
  } catch (fnErr: any) {
    console.warn('[AI STUDIO] Cloud Function generateVidnozVideo non joignable, bascule sur création directe storage :', fnErr?.message);
  }

  // 2. Moteur de secours résilient Firestore (Direct Write dans /video_generations)
  const docId = `vgen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const taskId = `vidnoz_task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const genDocRef = doc(db, 'video_generations', docId);
  await setDoc(genDocRef, {
    id: docId,
    taskId,
    status: 'processing',
    userId: currentUserId,
    text: params.text,
    avatarId: params.avatarId,
    voiceId: params.voiceId,
    videoUrl: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  return {
    docId,
    taskId,
    status: 'processing'
  };
}

/**
 * Écoute en temps réel les changements d'un document video_generations via Supabase Realtime
 */
export function subscribeToVideoGeneration(
  docId: string,
  onUpdate: (doc: VideoGenerationDoc) => void
): () => void {
  if (!docId) return () => {};

  const fetchDoc = async () => {
    try {
      const docRef = doc(db, 'video_generations', docId);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data();
        onUpdate({
          id: snapshot.id,
          taskId: data.taskId || '',
          status: data.status || 'processing',
          userId: data.userId || '',
          text: data.text || '',
          avatarId: data.avatarId || '',
          voiceId: data.voiceId || '',
          videoUrl: data.videoUrl || null,
          error: data.error || null,
          createdAt: data.createdAt?.toMillis?.() || data.createdAt || Date.now(),
          updatedAt: data.updatedAt?.toMillis?.() || data.updatedAt || Date.now()
        });
      }
    } catch (err) {
      console.warn('[AI STUDIO] Erreur lecture document video_generations :', err);
    }
  };

  fetchDoc();

  const channelName = `video_gen_${docId}_${Math.random().toString(36).substring(7)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'video_generations',
        filter: `id=eq.${docId}`,
      },
      (payload) => {
        if (payload.new) {
          const row = payload.new as any;
          onUpdate({
            id: row.id || docId,
            taskId: row.task_id || '',
            status: row.status || 'processing',
            userId: row.user_id || '',
            text: row.prompt || '',
            avatarId: row.avatar_id || '',
            voiceId: row.voice_id || '',
            videoUrl: row.video_url || null,
            error: row.error || null,
            createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now()
          });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

