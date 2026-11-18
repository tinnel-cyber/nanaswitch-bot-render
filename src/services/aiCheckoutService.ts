// ============================================================================
// SERVICE FRONTEND WAMEET : DÉTECTION D'INTENTION D'ACHAT PAR IA (GEMINI)
// ============================================================================

export interface DetectedOrderItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface ChatOrderIntentResult {
  isOrderIntent: boolean;
  detectedItems: DetectedOrderItem[];
  totalAmount: number;
}

const PAYMENT_API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_PAYMENT_API_URL ||
  'https://p02--nanaswitch-bot--p8yx28yyjhbx.code.run';

/**
 * Analyse silencieusement un message ou l'historique du chat pour détecter une intention d'achat.
 * Si le modèle est surchargé ou indisponible, la fonction retourne silencieusement null.
 */
export async function detectChatOrderIntent(
  chatHistory: string | Array<{ sender?: string; text?: string }>,
  currentInventory?: Array<{ id: string; name: string; unitPrice: number }>
): Promise<ChatOrderIntentResult | null> {
  try {
    const response = await fetch(`${PAYMENT_API_BASE_URL}/api/ai/analyze-order-intent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chatHistory,
        currentInventory
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data?.intent ?? null;
  } catch (err: any) {
    // Mode silencieux : Ne jamais bloquer la messagerie
    console.warn('[AI CHECKOUT CLIENT NOTICE] Détection ignorée :', err?.message);
    return null;
  }
}
