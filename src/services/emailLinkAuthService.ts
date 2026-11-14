import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

/**
 * Interface du plugin EmailLinkAuth pour TypeScript
 */
export interface EmailLinkAuthPlugin {
  storePendingEmail(options: { email: string }): Promise<{ success: boolean; message: string }>;
  getPendingEmail(): Promise<{ email: string | null }>;
  storeConfirmationUrl(options: { url: string }): Promise<{ success: boolean }>;
  getConfirmationUrl(): Promise<{ url: string | null }>;
  clearPendingData(): Promise<{ success: boolean }>;
}

/**
 * Enregistrement du plugin Capacitor EmailLinkAuth
 */
const EmailLinkAuth = registerPlugin<EmailLinkAuthPlugin>('EmailLinkAuth');

/**
 * Service d'authentification par lien email pour Nanasore
 * Gère le stockage local de l'email et l'intégration avec Capacitor
 */
export class EmailLinkAuthService {
  private static instance: EmailLinkAuthService;

  private constructor() {}

  public static getInstance(): EmailLinkAuthService {
    if (!EmailLinkAuthService.instance) {
      EmailLinkAuthService.instance = new EmailLinkAuthService();
    }
    return EmailLinkAuthService.instance;
  }

  /**
   * Vérifie si l'application tourne sur Android
   */
  public isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  /**
   * Stocke l'email localement avant l'envoi du lien de confirmation
   * Nécessaire pour l'authentification par lien email Firebase
   */
  public async storePendingEmail(email: string): Promise<boolean> {
    if (!this.isAndroid()) {
      console.log('[EmailLinkAuth] Pas sur Android, stockage en localStorage');
      localStorage.setItem('pending_email', email);
      return true;
    }

    try {
      const result = await EmailLinkAuth.storePendingEmail({ email });
      console.log('[EmailLinkAuth] Email stocké avec succès:', result);
      return result.success;
    } catch (error) {
      console.error('[EmailLinkAuth] Erreur stockage email:', error);
      // Fallback localStorage
      localStorage.setItem('pending_email', email);
      return false;
    }
  }

  /**
   * Récupère l'email stocké localement
   */
  public async getPendingEmail(): Promise<string | null> {
    if (!this.isAndroid()) {
      return localStorage.getItem('pending_email');
    }

    try {
      const result = await EmailLinkAuth.getPendingEmail();
      return result.email;
    } catch (error) {
      console.error('[EmailLinkAuth] Erreur récupération email:', error);
      return localStorage.getItem('pending_email');
    }
  }

  /**
   * Stocke l'URL de confirmation
   */
  public async storeConfirmationUrl(url: string): Promise<boolean> {
    if (!this.isAndroid()) {
      localStorage.setItem('confirmation_url', url);
      return true;
    }

    try {
      const result = await EmailLinkAuth.storeConfirmationUrl({ url });
      console.log('[EmailLinkAuth] URL de confirmation stockée:', result);
      return result.success;
    } catch (error) {
      console.error('[EmailLinkAuth] Erreur stockage URL:', error);
      localStorage.setItem('confirmation_url', url);
      return false;
    }
  }

  /**
   * Récupère l'URL de confirmation stockée
   */
  public async getConfirmationUrl(): Promise<string | null> {
    if (!this.isAndroid()) {
      return localStorage.getItem('confirmation_url');
    }

    try {
      const result = await EmailLinkAuth.getConfirmationUrl();
      return result.url;
    } catch (error) {
      console.error('[EmailLinkAuth] Erreur récupération URL:', error);
      return localStorage.getItem('confirmation_url');
    }
  }

  /**
   * Nettoie les données temporaires stockées
   */
  public async clearPendingData(): Promise<boolean> {
    if (!this.isAndroid()) {
      localStorage.removeItem('pending_email');
      localStorage.removeItem('confirmation_url');
      return true;
    }

    try {
      const result = await EmailLinkAuth.clearPendingData();
      console.log('[EmailLinkAuth] Données nettoyées:', result);
      return result.success;
    } catch (error) {
      console.error('[EmailLinkAuth] Erreur nettoyage données:', error);
      localStorage.removeItem('pending_email');
      localStorage.removeItem('confirmation_url');
      return false;
    }
  }

  /**
   * Gère le processus complet d'inscription par lien email
   * 1. Stocke l'email localement
   * 2. Envoie l'email de confirmation via l'API
   * 3. Stocke l'URL de confirmation
   */
  public async initiateEmailLinkSignup(
    email: string,
    name?: string,
    sellerMode?: string
  ): Promise<{ success: boolean; message: string; confirmationUrl?: string }> {
    try {
      // 1. Stocker l'email localement (nécessaire pour Android)
      await this.storePendingEmail(email);

      // 2. Appeler l'API backend pour créer l'utilisateur et envoyer l'email
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: this.generateTempPassword(), // Mot de passe temporaire pour Firebase
          name,
          sellerMode,
          emailLinkAuth: true // Flag pour indiquer l'auth par lien email
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'inscription');
      }

      // 3. Stocker l'URL de confirmation (si fournie)
      if (data.confirmationUrl) {
        await this.storeConfirmationUrl(data.confirmationUrl);
      }

      return {
        success: true,
        message: data.message || 'Email de confirmation envoyé',
        confirmationUrl: data.confirmationUrl
      };
    } catch (error: any) {
      console.error('[EmailLinkAuth] Erreur inscription par lien email:', error);
      return {
        success: false,
        message: error.message || 'Erreur lors de l\'inscription'
      };
    }
  }

  /**
   * Génère un mot de passe temporaire pour Firebase (requis pour créer l'utilisateur)
   * Ce mot de passe sera remplacé par l'authentification par lien email
   */
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 16; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * Écoute les événements d'URL entrante (App Links / Deep Links)
   */
  public async handleIncomingUrl(): Promise<{ url: string | null }> {
    // Sur Android, Capacitor gère automatiquement les App Links
    // On peut utiliser Capacitor App Plugin pour écouter les URLs
    try {
      const { App } = await import('@capacitor/app');
      const appUrlListener = await App.addListener('appUrlOpen', (event: { url: string }) => {
        console.log('[EmailLinkAuth] URL ouverte:', event.url);
        this.handleUrl(event.url);
      });

      return { url: null }; // L'écouteur est actif
    } catch (error) {
      console.error('[EmailLinkAuth] Erreur configuration écouteur URL:', error);
      return { url: null };
    }
  }

  /**
   * Traite une URL entrante
   */
  private async handleUrl(url: string): Promise<void> {
    console.log('[EmailLinkAuth] Traitement URL:', url);

    if (url.includes('/confirm-email')) {
      // Rediriger vers la page de confirmation
      window.location.href = url;
    } else if (url.includes('/reset-password')) {
      // Rediriger vers la page de réinitialisation
      window.location.href = url;
    } else if (url.includes('/finishSignUp')) {
      // Lien d'authentification Firebase Email Link
      // Firebase Auth web SDK gérera cela automatiquement
      console.log('[EmailLinkAuth] Lien d\'authentification Firebase détecté');
    }
  }
}

// Export singleton
export const emailLinkAuthService = EmailLinkAuthService.getInstance();
