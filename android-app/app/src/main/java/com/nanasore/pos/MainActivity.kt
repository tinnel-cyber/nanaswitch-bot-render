package com.nanasore.pos

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase

/**
 * MainActivity gère l'authentification par lien e-mail (Email Link Authentication)
 * et les Android App Links pour Nanasore.
 *
 * Fonctionnalités :
 * - Interception des liens HTTPS de nanasore.com
 * - Validation des liens d'authentification Firebase
 * - Finalisation de l'inscription par email
 * - Gestion de la réinitialisation de mot de passe
 */
class MainActivity : AppCompatActivity() {

    private lateinit var auth: FirebaseAuth
    private val TAG = "MainActivity"

    // Clé SharedPreferences pour stocker l'email temporairement
    private val PREFS_NAME = "NanaPosPrefs"
    private val KEY_PENDING_EMAIL = "pending_email"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Initialisation Firebase Auth
        auth = Firebase.auth

        // Traiter l'intent entrant (lien email ou deep link)
        handleIncomingIntent(intent)
    }

    /**
     * Traite les intents entrants (lorsque l'application est ouverte via un lien)
     */
    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        intent?.let { handleIncomingIntent(it) }
    }

    /**
     * Traite l'intent pour déterminer s'il s'agit d'un lien d'authentification
     */
    private fun handleIncomingIntent(intent: Intent) {
        val action = intent.action
        val data = intent.data

        if (Intent.ACTION_VIEW == action && data != null) {
            val emailLink = data.toString()
            Log.d(TAG, "Lien reçu: $emailLink")

            when {
                // Lien de confirmation d'inscription
                emailLink.contains("/confirm-email") -> {
                    handleEmailConfirmation(emailLink)
                }
                // Lien de réinitialisation de mot de passe
                emailLink.contains("/reset-password") -> {
                    handlePasswordReset(emailLink)
                }
                // Lien d'authentification Firebase Email Link
                emailLink.contains("/finishSignUp") || auth.isSignInWithEmailLink(emailLink) -> {
                    handleEmailLinkSignIn(emailLink)
                }
                else -> {
                    Log.d(TAG, "Lien non reconnu, ouverture dans WebView")
                    // Lier vers l'application web Capacitor
                    loadAppUrl(emailLink)
                }
            }
        }
    }

    /**
     * Gère la confirmation d'email via token
     */
    private fun handleEmailConfirmation(emailLink: Uri) {
        val token = emailLink.getQueryParameter("token")
        val uid = emailLink.getQueryParameter("uid")

        if (token != null && uid != null) {
            Log.d(TAG, "Token de confirmation reçu: $token")
            // Rediriger vers l'application web avec le token
            val confirmUrl = "https://nanasore.com/confirm-email?token=$token&uid=$uid"
            loadAppUrl(confirmUrl)
        } else {
            Log.e(TAG, "Token ou UID manquant dans le lien de confirmation")
            loadAppUrl("https://nanasore.com/reset-password?error=invalid_link")
        }
    }

    /**
     * Gère la réinitialisation de mot de passe
     */
    private fun handlePasswordReset(emailLink: Uri) {
        val token = emailLink.getQueryParameter("token")

        if (token != null) {
            Log.d(TAG, "Token de réinitialisation reçu: $token")
            // Rediriger vers l'application web avec le token
            val resetUrl = "https://nanasore.com/reset-password?token=$token"
            loadAppUrl(resetUrl)
        } else {
            Log.e(TAG, "Token manquant dans le lien de réinitialisation")
            loadAppUrl("https://nanasore.com/reset-password?error=invalid_link")
        }
    }

    /**
     * Gère l'authentification par lien email Firebase (Email Link Authentication)
     */
    private fun handleEmailLinkSignIn(emailLink: String) {
        Log.d(TAG, "Tentative d'authentification par lien email")

        // Récupérer l'email stocké localement
        val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        var email = prefs.getString(KEY_PENDING_EMAIL, null)

        if (email == null) {
            Log.w(TAG, "Email non trouvé en local, invitation à le saisir")
            // Dans une vraie application, on afficherait un dialogue pour saisir l'email
            // Pour simplifier, on redirige vers la page de connexion
            loadAppUrl("https://nanasore.com/signup?email_required=true")
            return
        }

        // Valider le lien et authentifier l'utilisateur
        if (auth.isSignInWithEmailLink(emailLink)) {
            auth.signInWithEmailLink(email, emailLink)
                .addOnCompleteListener(this) { task ->
                    if (task.isSuccessful) {
                        Log.d(TAG, "Authentification par lien email réussie")
                        val user = auth.currentUser
                        Log.d(TAG, "Utilisateur connecté: ${user?.email}")

                        // Nettoyer l'email stocké
                        prefs.edit().remove(KEY_PENDING_EMAIL).apply()

                        // Rediriger vers le tableau de bord
                        loadAppUrl("https://nanasore.com/dashboard")
                    } else {
                        Log.e(TAG, "Échec de l'authentification par lien email", task.exception)
                        loadAppUrl("https://nanasore.com/signup?error=auth_failed")
                    }
                }
        } else {
            Log.e(TAG, "Lien email invalide")
            loadAppUrl("https://nanasore.com/signup?error=invalid_link")
        }
    }

    /**
     * Stocke l'email localement avant l'envoi du lien de confirmation
     * Cette méthode doit être appelée depuis le code JavaScript via Capacitor Plugin
     */
    fun storePendingEmail(email: String) {
        val prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        prefs.edit().putString(KEY_PENDING_EMAIL, email).apply()
        Log.d(TAG, "Email stocké localement: $email")
    }

    /**
     * Charge l'URL dans la WebView Capacitor
     */
    private fun loadAppUrl(url: String) {
        // Dans une vraie application Capacitor, on utiliserait CapacitorWebView
        // Ici, on simule le chargement en redirigeant vers l'activité web
        Log.d(TAG, "Chargement de l'URL: $url")

        // Pour Capacitor, on déclenche un événement JavaScript
        // ou on charge directement l'URL dans la WebView
        val webIntent = Intent(this, com.getcapacitor.MainActivity::class.java).apply {
            data = Uri.parse(url)
        }
        startActivity(webIntent)
    }

    override fun onStart() {
        super.onStart()
        // Vérifier si l'utilisateur est déjà connecté
        val currentUser = auth.currentUser
        if (currentUser != null) {
            Log.d(TAG, "Utilisateur déjà connecté: ${currentUser.email}")
        }
    }
}
