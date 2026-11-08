import React from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getSupabaseClient } from '../../../lib/supabase'
import PublicDealClient, { DealData } from '../../../components/public-deal/PublicDealClient'

interface DealPageProps {
  params: Promise<{ slug: string }>
}

/**
 * Génération dynamique des métadonnées SEO & OpenGraph pour le Physical Deal Funnel
 */
export async function generateMetadata({ params }: DealPageProps): Promise<Metadata> {
  const { slug } = await params
  const cleanSlug = decodeURIComponent(slug).toLowerCase()
  const supabase = getSupabaseClient(true)

  try {
    const { data: funnel } = await supabase
      .from('funnels')
      .select('title, template_data')
      .eq('slug', cleanSlug)
      .maybeSingle()

    const title = funnel?.title || `Offre Exclusive • ${cleanSlug.replace(/-/g, ' ').toUpperCase()}`
    const desc =
      funnel?.template_data?.headline ||
      'Découvrez notre offre deal exclusive avec auto-composition Mini-Market et paiement Mobile Money.'

    return {
      title: `${title} | Nanasore Deal Funnel`,
      description: desc,
      openGraph: {
        title,
        description: desc,
        type: 'website',
      },
    }
  } catch (_e) {
    return {
      title: 'Offre Spéciale | Nanasore',
      description: 'Offre deal exclusive avec retrait caisse physique ou livraison express.',
    }
  }
}

/**
 * Page Principale Serveur Next.js (App Router) : /deal/[slug]
 */
export default async function DealPage({ params }: DealPageProps) {
  const { slug } = await params
  const cleanSlug = decodeURIComponent(slug).toLowerCase()
  const supabase = getSupabaseClient(true)

  let deal: DealData | null = null

  try {
    // 1. Recherche dans la table `funnels` (avec jointure sur le tenant)
    const { data: funnelData, error: funnelError } = await supabase
      .from('funnels')
      .select('*, tenants(*)')
      .eq('slug', cleanSlug)
      .maybeSingle()

    if (!funnelError && funnelData) {
      const tData = funnelData.template_data || {}
      deal = {
        id: funnelData.id,
        title: funnelData.title || tData.headline || `Offre Spéciale ${cleanSlug}`,
        description: tData.subheadline || tData.description || 'Commandez en direct avec notre système de caisse express et Mini-Market intégré.',
        headline: tData.headline,
        subheadline: tData.subheadline,
        price: Number(tData.price) || 29000,
        originalPrice: Number(tData.original_price) || 39000,
        discountBadge: tData.discount_badge || '-25% EXCLUSIF',
        imageUrl: tData.image_url || tData.video_poster || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
        tenantId: funnelData.tenant_id,
        tenantName: funnelData.tenants?.name || 'Boutique Nanasore',
        brandColor: funnelData.tenants?.primary_color || '#10b981',
        merchantWhatsapp: funnelData.tenants?.settings?.whatsapp || '+2250700000000',
        stock: 12,
      }
    } else {
      // 2. Recherche alternative si le slug correspond à un tenant
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', cleanSlug)
        .maybeSingle()

      if (tenantData) {
        deal = {
          id: `tenant_deal_${tenantData.id}`,
          title: `Offre Vedette • ${tenantData.name}`,
          description: `Découvrez l'offre exclusive du magasin ${tenantData.name}. Profitez de notre Mini-Market latéral pour compléter votre commande.`,
          price: 25000,
          originalPrice: 35000,
          discountBadge: '-28% FLASH',
          imageUrl: tenantData.logo_url || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80',
          tenantId: tenantData.id,
          tenantName: tenantData.name,
          brandColor: tenantData.primary_color || '#10b981',
          stock: 15,
        }
      }
    }

    // 3. Fallback élégant Physical Funnel Builder pour tester n'importe quel slug
    if (!deal) {
      // Récupération éventuelle du premier tenant actif
      const { data: defaultTenant } = await supabase
        .from('tenants')
        .select('*')
        .limit(1)
        .maybeSingle()

      deal = {
        id: `deal_${cleanSlug}`,
        title: `Pack Promo • ${cleanSlug.replace(/-/g, ' ').toUpperCase()}`,
        description: 'Vente flash exclusive physical funnel builder avec paiement Mobile Money et retrait immédiat en caisse.',
        price: 32000,
        originalPrice: 42000,
        discountBadge: '-24% AUJOURD’HUI',
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
        tenantId: defaultTenant?.id || 'default-tenant-01',
        tenantName: defaultTenant?.name || 'Boutique Caisse Express',
        brandColor: defaultTenant?.primary_color || '#10b981',
        merchantWhatsapp: '+2250700000000',
        stock: 9,
      }
    }
  } catch (err) {
    console.warn(`[DealPage] Exception pour slug '${cleanSlug}':`, err)
    deal = {
      id: `deal_${cleanSlug}`,
      title: `Offre Exclusive • ${cleanSlug.toUpperCase()}`,
      description: 'Offre promotionnelle avec tiroir Mini-Market auto-composé.',
      price: 29000,
      originalPrice: 39000,
      discountBadge: '-25% SPÉCIAL',
      imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80',
      tenantId: 'default-tenant-01',
      tenantName: 'Nanasore Store',
      brandColor: '#10b981',
      stock: 10,
    }
  }

  if (!deal) {
    return notFound()
  }

  return <PublicDealClient deal={deal} slug={cleanSlug} />
}
