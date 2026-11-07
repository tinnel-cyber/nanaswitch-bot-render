/**
 * Service de Résolution Multi-Tenant & Académie
 * Gère la détection, la mise en cache et le chargement isolé des données de chaque tenant.
 */

import { getSupabaseClient } from './supabase';

export type TenantRoutingType = 'standard' | 'custom';
export type TenantDomainStatus = 'none' | 'pending' | 'active' | 'failed';
export type CourseStatus = 'draft' | 'published' | 'archived';
export type SubscriptionPillar = 'caisse_pos' | 'vitrine_web' | 'formateur_lms';

export interface TenantSubscriptionInfo {
  plan_code: string;
  plan_name: string;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
  selected_pillars: SubscriptionPillar[];
  is_all_inclusive: boolean;
  allow_custom_domain: boolean;
  allow_whitelabel_removal: boolean;
  max_courses: number;
  max_products: number;
  is_store_enabled: boolean;
  is_academy_enabled: boolean;
  is_pos_enabled: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  routing_type: TenantRoutingType;
  custom_domain: string | null;
  domain_status: TenantDomainStatus;
  cloudflare_hostname_id: string | null;
  dns_records?: Record<string, any>;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  owner_id?: string | null;
  settings?: Record<string, any>;
  subscription?: TenantSubscriptionInfo;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  description: string | null;
  price: number;
  thumbnail_url: string | null;
  status: CourseStatus;
  created_at: string;
  updated_at?: string;
  lessons_count?: number;
}

export interface Lesson {
  id: string;
  course_id: string;
  tenant_id: string;
  title: string;
  video_url: string | null;
  content: string | null;
  position: number;
  is_free_preview: boolean;
  created_at: string;
}

export interface Funnel {
  id: string;
  tenant_id: string;
  slug: string;
  title: string;
  template_data: Record<string, any>;
  is_published: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  description?: string | null;
  price: number;
  stock?: number;
  thumbnail_url?: string | null;
  category?: string;
  is_active?: boolean;
  created_at: string;
}

/**
 * Résout et charge les informations d'un tenant par son identifiant
 * (soit nom de domaine personnalisé, soit slug standard).
 *
 * @param identifier - Le domaine personnalisé (ex: "academie-client.com") ou le slug (ex: "formation-nana")
 * @param isCustomDomain - Vrai si la résolution s'opère par nom de domaine personnalisé
 * @returns Le profil du tenant ou null s'il n'existe pas
 */
export async function getTenantByIdentifier(
  identifier: string,
  isCustomDomain: boolean = false
): Promise<Tenant | null> {
  const supabase = getSupabaseClient(true);
  const cleanId = identifier.trim().toLowerCase();

  try {
    let query = supabase.from('tenants').select('*');

    if (isCustomDomain) {
      // Nettoie un éventuel préfixe www pour tester les deux variantes
      const withoutWww = cleanId.replace(/^www\./, '');
      const withWww = `www.${withoutWww}`;

      query = query
        .eq('routing_type', 'custom')
        .or(`custom_domain.eq.${withoutWww},custom_domain.eq.${withWww}`)
        .limit(1);
    } else {
      query = query.eq('slug', cleanId).limit(1);
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error(`[MultiTenant] Erreur de résolution pour '${cleanId}':`, error.message);
      return null;
    }

    if (!data) return null;

    // Attachement dynamique des permissions du plan d'abonnement
    const subscription = await getTenantSubscription(data.id);

    return {
      ...(data as Tenant),
      subscription,
    };
  } catch (err: any) {
    console.error(`[MultiTenant] Exception de résolution pour '${cleanId}':`, err?.message);
    return null;
  }
}

/**
 * Résout le plan d'abonnement actif et les droits modulaires du tenant.
 * Détermine les fonctionnalités activées, les quotas et l'accès à la marque blanche.
 */
export async function getTenantSubscription(tenantId: string): Promise<TenantSubscriptionInfo> {
  const supabase = getSupabaseClient(true);

  // Valeurs par défaut sécurisées
  const defaultSub: TenantSubscriptionInfo = {
    plan_code: 'CREATOR',
    plan_name: 'Pack Formateur & Académie Pro',
    status: 'ACTIVE',
    selected_pillars: ['vitrine_web', 'formateur_lms', 'caisse_pos'],
    is_all_inclusive: true,
    allow_custom_domain: true,
    allow_whitelabel_removal: true,
    max_courses: 50,
    max_products: 100,
    is_store_enabled: true,
    is_academy_enabled: true,
    is_pos_enabled: true,
  };

  try {
    const { data: subData, error: subError } = await supabase
      .from('subscriptions')
      .select(`
        id,
        status,
        plan:plans (
          id,
          code,
          name,
          billing_type
        )
      `)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (!subError && subData) {
      const plan = (subData as any).plan;
      const code = String(plan?.code || 'CREATOR').toUpperCase();
      const status = String(subData.status || 'ACTIVE').toUpperCase() as any;

      if (code === 'ZERO' || code === 'FREE') {
        return {
          plan_code: 'ZERO',
          plan_name: 'Plan Découverte Gratuit',
          status,
          selected_pillars: ['vitrine_web'],
          is_all_inclusive: false,
          allow_custom_domain: false,
          allow_whitelabel_removal: false,
          max_courses: 2,
          max_products: 5,
          is_store_enabled: true,
          is_academy_enabled: false, // Pas d'académie en plan gratuit
          is_pos_enabled: true,
        };
      }

      if (code === 'CREATOR') {
        return {
          plan_code: 'CREATOR',
          plan_name: plan?.name || 'Pack Créateur & Formateur',
          status,
          selected_pillars: ['formateur_lms', 'vitrine_web'],
          is_all_inclusive: false,
          allow_custom_domain: true,
          allow_whitelabel_removal: true,
          max_courses: 50,
          max_products: 20,
          is_store_enabled: true,
          is_academy_enabled: true,
          is_pos_enabled: false,
        };
      }

      if (code === 'MERCHANT' || code === 'BUSINESS' || code === 'ENTERPRISE') {
        return {
          plan_code: code,
          plan_name: plan?.name || 'Pack Tout Inclus Pro',
          status,
          selected_pillars: ['caisse_pos', 'vitrine_web', 'formateur_lms'],
          is_all_inclusive: true,
          allow_custom_domain: true,
          allow_whitelabel_removal: true,
          max_courses: 1000,
          max_products: 2000,
          is_store_enabled: true,
          is_academy_enabled: true,
          is_pos_enabled: true,
        };
      }
    }

    return defaultSub;
  } catch (err: any) {
    console.warn(`[MultiTenant] Erreur lecture abonnement tenant '${tenantId}':`, err?.message);
    return defaultSub;
  }
}

/**
 * Récupère STRICTEMENT le catalogue des cours publiés appartenant à un tenant donné.
 *
 * @param tenantId - L'identifiant unique UUID du tenant
 * @returns Liste ordonnée des cours du tenant
 */
export async function getTenantCourses(tenantId: string): Promise<Course[]> {
  const supabase = getSupabaseClient(true);
  const sub = await getTenantSubscription(tenantId);

  // Vérification de la validité de l'abonnement et de l'activation du pilier Académie (LMS)
  if (!sub.is_academy_enabled || sub.status === 'EXPIRED' || sub.status === 'CANCELLED') {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        tenant_id,
        title,
        slug,
        description,
        price,
        thumbnail_url,
        status,
        created_at,
        lessons:lessons(count)
      `)
      .eq('tenant_id', tenantId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(sub.max_courses);

    if (error) {
      console.error(`[MultiTenant] Erreur chargement cours pour tenant '${tenantId}':`, error.message);
      return [];
    }

    return (data || []).map((item: any) => ({
      id: item.id,
      tenant_id: item.tenant_id,
      title: item.title,
      slug: item.slug,
      description: item.description,
      price: Number(item.price) || 0,
      thumbnail_url: item.thumbnail_url,
      status: item.status,
      created_at: item.created_at,
      lessons_count: Array.isArray(item.lessons) && item.lessons[0] ? item.lessons[0].count : 0,
    }));
  } catch (err: any) {
    console.error(`[MultiTenant] Exception cours tenant '${tenantId}':`, err?.message);
    return [];
  }
}

/**
 * Récupère une formation spécifique par son slug et vérifie qu'elle appartient bien au tenant.
 */
export async function getTenantCourseBySlug(
  tenantId: string,
  courseSlug: string
): Promise<{ course: Course; lessons: Lesson[] } | null> {
  const supabase = getSupabaseClient(true);

  try {
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('slug', courseSlug.toLowerCase())
      .maybeSingle();

    if (courseError || !course) {
      return null;
    }

    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', course.id)
      .eq('tenant_id', tenantId)
      .order('position', { ascending: true });

    if (lessonsError) {
      console.warn(`[MultiTenant] Erreur chargement leçons cours '${course.id}':`, lessonsError.message);
    }

    return {
      course: {
        ...course,
        price: Number(course.price) || 0,
      },
      lessons: (lessons || []) as Lesson[],
    };
  } catch (err: any) {
    console.error(`[MultiTenant] Exception cours '${courseSlug}':`, err?.message);
    return null;
  }
}

/**
 * Récupère un tunnel de vente / landing page spécifique à un tenant.
 */
export async function getTenantFunnel(
  tenantId: string,
  funnelSlug: string
): Promise<Funnel | null> {
  const supabase = getSupabaseClient(true);

  try {
    const { data, error } = await supabase
      .from('funnels')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('slug', funnelSlug.toLowerCase())
      .eq('is_published', true)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return data as Funnel;
  } catch (err: any) {
    console.error(`[MultiTenant] Exception funnel '${funnelSlug}':`, err?.message);
    return null;
  }
}

/**
 * Récupère STRICTEMENT les produits e-commerce physiques ou numériques du tenant.
 */
export async function getTenantProducts(tenantId: string): Promise<Product[]> {
  const supabase = getSupabaseClient(true);
  const sub = await getTenantSubscription(tenantId);

  // Vérification de l'activation du pilier Vitrine E-commerce et de l'état de l'abonnement
  if (!sub.is_store_enabled || sub.status === 'EXPIRED' || sub.status === 'CANCELLED') {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(sub.max_products);

    if (error) {
      console.error(`[MultiTenant] Erreur chargement produits tenant '${tenantId}':`, error.message);
      return [];
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      tenant_id: p.tenant_id,
      title: p.title,
      slug: p.slug || p.id,
      description: p.description || null,
      price: Number(p.price) || 0,
      stock: p.stock ?? 100,
      thumbnail_url: p.thumbnail_url || p.image_url || null,
      category: p.category || 'Général',
      is_active: p.is_active ?? true,
      created_at: p.created_at,
    }));
  } catch (err: any) {
    console.error(`[MultiTenant] Exception produits tenant '${tenantId}':`, err?.message);
    return [];
  }
}

/**
 * Récupère une fiche produit spécifique pour le site vitrine.
 */
export async function getTenantProductBySlug(
  tenantId: string,
  productSlug: string
): Promise<Product | null> {
  const supabase = getSupabaseClient(true);

  try {
    let query = supabase.from('products').select('*').eq('tenant_id', tenantId);

    // Recherche par slug ou fallback par id
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(productSlug);
    if (isUuid) {
      query = query.or(`slug.eq.${productSlug.toLowerCase()},id.eq.${productSlug}`);
    } else {
      query = query.eq('slug', productSlug.toLowerCase());
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      tenant_id: data.tenant_id,
      title: data.title,
      slug: data.slug || data.id,
      description: data.description || null,
      price: Number(data.price) || 0,
      stock: data.stock ?? 100,
      thumbnail_url: data.thumbnail_url || data.image_url || null,
      category: data.category || 'Général',
      is_active: data.is_active ?? true,
      created_at: data.created_at,
    };
  } catch (err: any) {
    console.error(`[MultiTenant] Exception fiche produit '${productSlug}':`, err?.message);
    return null;
  }
}

