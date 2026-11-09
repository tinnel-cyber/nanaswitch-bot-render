import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productName, description, priceCFA, originalPriceCFA, imageUrl } = body

    if (!productName) {
      return NextResponse.json(
        { success: false, error: 'Le nom du produit est requis.' },
        { status: 400 }
      )
    }

    const price = Number(priceCFA) || 25000
    const originalPrice = Number(originalPriceCFA) || Math.round(price * 1.35)
    const discountPct = Math.max(10, Math.round(((originalPrice - price) / originalPrice) * 100))

    let headline = `${productName} : L'Élégance & l'Excellence au Quotidien`
    let subheadline = description || 'Profitez de notre vente flash exclusive avec livraison express et paiement sécurisé.'
    let bullets = [
      { title: 'Conception Haut de Gamme', desc: 'Matériaux certifiés durables et résistants aux chocs quotidiens.' },
      { title: 'Garantie Intégrale 12 Mois', desc: 'Échange immédiat sans frais en cas de non-conformité.' },
      { title: 'Livraison Express Sous 4H', desc: 'Vérifiez et inspectez votre colis en toute sérénité avant paiement.' }
    ]

    // Tentative d'enrichissement par Gemini si la clé API est disponible
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey })
        const prompt = `Tu es un expert en copywriting AIDA et CRO (conversion rate optimization) pour l'e-commerce en Afrique de l'Ouest (Côte d'Ivoire, Sénégal, Burkina Faso).
Rédige les éléments d'une page de vente physique pour le produit : "${productName}".
Description brute : "${description || productName}".
Prix : ${price} FCFA.
Fournis un résultat JSON strict avec la structure suivante :
{
  "headline": "Titre percutant (max 10 mots)",
  "subheadline": "Sous-titre engageant mettant en avant le bénéfice principal (max 25 mots)",
  "bullets": [
    { "title": "Bénéfice 1", "desc": "Explication courte" },
    { "title": "Bénéfice 2", "desc": "Explication courte" },
    { "title": "Bénéfice 3", "desc": "Explication courte" }
  ]
}`

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json'
          }
        })

        const text = response.text
        if (text) {
          const parsed = JSON.parse(text)
          if (parsed.headline) headline = parsed.headline
          if (parsed.subheadline) subheadline = parsed.subheadline
          if (Array.isArray(parsed.bullets) && parsed.bullets.length >= 2) {
            bullets = parsed.bullets
          }
        }
      } catch (aiErr) {
        console.warn('[AutoFunnelAI] Fallback copywriting local:', aiErr)
      }
    }

    const blocks = [
      {
        id: `block_hero_${Date.now()}`,
        type: 'HERO_PRODUCT',
        title: 'Hero Vitrine Standard CRO',
        visible: true,
        props: {
          headline,
          subheadline,
          badgeText: 'VENTE FLASH EXCLUSIVE • STOCK LIMITÉ',
          price,
          originalPrice,
          discountBadge: `-${discountPct}% AUJOURD'HUI`,
          ctaText: 'Commander avec Wave / Orange Money',
          imageUrl: imageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'
        }
      },
      {
        id: `block_scarcity_${Date.now()}`,
        type: 'SCARCITY_URGENCY',
        title: 'Jauge Rareté & Compte à Rebours',
        visible: true,
        props: {
          totalStock: 30,
          remainingStock: 7,
          hoursLeft: 3,
          urgencyText: 'Plus que 7 exemplaires disponibles à ce tarif promotionnel !'
        }
      },
      {
        id: `block_benefits_${Date.now()}`,
        type: 'BENEFITS_LIST',
        title: "Liste d'Avantages AIDA",
        visible: true,
        props: {
          headline: 'Pourquoi nos clients recommandent ce produit :',
          bullets
        }
      },
      {
        id: `block_flash_live_${Date.now()}`,
        type: 'FLASH_LIVE_CTA',
        title: 'Bouton Concierge WebRTC',
        visible: true,
        props: {
          buttonText: '👁️ Voir le produit en direct (Visio 5 min)',
          badgeText: 'VENDEUR CONNECTÉ EN BOUTIQUE',
          merchantPhone: '+22507000000'
        }
      },
      {
        id: `block_trust_${Date.now()}`,
        type: 'TRUST_BADGES',
        title: 'Badges de Confiance',
        visible: true,
        props: {
          badges: [
            'Paiement 100% Sécurisé Wave & Orange Money',
            'Livraison Express & Sécurisée',
            'Garantie Satisfait ou Remboursé'
          ]
        }
      },
      {
        id: `block_mini_market_${Date.now()}`,
        type: 'MINI_MARKET_DRAWER',
        title: 'Mini-Market Express (Auto-composition)',
        visible: true,
        props: {
          buttonText: 'Explorer le Mini-Market',
          badgeText: 'Auto-composition',
          headline: 'Complétez votre commande avec le Mini-Market',
          subheadline: 'Ajoutez des articles et accessoires complémentaires directement.',
          floatingButtonEnabled: true
        }
      },
      {
        id: `block_reviews_${Date.now()}`,
        type: 'CUSTOMER_REVIEWS',
        title: 'Avis Clients Vérifiés',
        visible: true,
        props: {
          headline: 'Avis Clients Vérifiés (4.9 / 5)',
          rating: '4.9/5',
          reviews: [
            { name: 'Kouamé Y.', city: 'Abidjan', comment: 'Livraison reçue en 4h chrono, produit conforme à 100% !' },
            { name: 'Fatou D.', city: 'Dakar', comment: "Très bonne qualité, j'ai pu payer par Wave à la livraison." }
          ]
        }
      },
      {
        id: `block_checkout_${Date.now()}`,
        type: 'INLINE_CHECKOUT',
        title: 'Caisse Geo-Routée Intégrée',
        visible: true,
        props: {
          heading: 'Finalisez votre commande en 1 minute',
          subheading: 'Paiement sans contact ou règlement à la livraison',
          defaultProvider: 'WAVE'
        }
      },
      {
        id: `block_fomo_${Date.now()}`,
        type: 'LIVE_SALE_TOAST',
        title: 'Preuve Sociale FOMO',
        visible: true,
        props: {
          intervalSeconds: 12,
          enabled: true
        }
      }
    ]

    return NextResponse.json({
      success: true,
      brandColor: '#10b981',
      blocks
    })
  } catch (error: any) {
    console.error('[API /api/ai/auto-funnel/generate] Erreur:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Erreur interne lors de la génération du funnel.' },
      { status: 500 }
    )
  }
}
