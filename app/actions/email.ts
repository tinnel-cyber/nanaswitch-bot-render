"use server";

import { supabase } from "@/lib/supabase";

export interface SendEmailCampaignParams {
  to_email: string;
  to_name?: string;
  subject: string;
  html_content: string;
  sender_name?: string;
  sender_email?: string;
}

export interface SendEmailCampaignResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Server Action Next.js pour l'envoi d'emails via l'Edge Function Supabase `email-campaign`
 * Exécuté exclusivement côté serveur (Next.js App Router)
 */
export async function sendEmailCampaign(
  params: SendEmailCampaignParams
): Promise<SendEmailCampaignResult> {
  try {
    const {
      to_email,
      to_name,
      subject,
      html_content,
      sender_name,
      sender_email,
    } = params;

    // 1. Validation minimale côté serveur
    if (!to_email || typeof to_email !== "string" || !to_email.trim()) {
      return {
        success: false,
        error: "L'adresse email du destinataire ('to_email') est requise.",
      };
    }

    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return {
        success: false,
        error: "L'objet du courriel ('subject') est requis.",
      };
    }

    if (!html_content || typeof html_content !== "string" || !html_content.trim()) {
      return {
        success: false,
        error: "Le contenu HTML ('html_content') est requis.",
      };
    }

    // 2. Invocation de l'Edge Function Supabase 'email-campaign'
    const { data, error } = await supabase.functions.invoke("email-campaign", {
      body: {
        to_email: to_email.trim(),
        to_name: to_name?.trim() || undefined,
        subject: subject.trim(),
        html_content,
        sender_name: sender_name?.trim() || undefined,
        sender_email: sender_email?.trim() || undefined,
      },
    });

    // 3. Gestion des erreurs d'invocation Supabase Functions
    if (error) {
      console.error("[SERVER ACTION sendEmailCampaign] Erreur Supabase Functions :", error);
      return {
        success: false,
        error: error.message || "Erreur lors de l'invocation de l'Edge Function email-campaign",
      };
    }

    // Si la fonction a retourné un statut d'erreur dans son body
    if (data && data.success === false) {
      return {
        success: false,
        data,
        error: data.error || "Échec de l'envoi de l'email via le service Brevo",
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err: any) {
    console.error("[SERVER ACTION sendEmailCampaign] Exception non interceptée :", err);
    return {
      success: false,
      error: err?.message || "Une erreur inattendue est survenue lors de l'envoi de l'email.",
    };
  }
}
