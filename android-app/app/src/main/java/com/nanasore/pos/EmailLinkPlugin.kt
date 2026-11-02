package com.nanasore.pos

import android.content.SharedPreferences
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/**
 * Plugin Capacitor personnalisé pour gérer l'authentification par lien email
 * Permet au code JavaScript de stocker l'email localement et de récupérer l'email pending
 */
@CapacitorPlugin(name = "EmailLinkAuth")
class EmailLinkPlugin : Plugin() {

    private val PREFS_NAME = "NanaPosPrefs"
    private val KEY_PENDING_EMAIL = "pending_email"
    private val KEY_CONFIRMATION_URL = "confirmation_url"

    /**
     * Stocke l'email localement avant l'envoi du lien de confirmation
     * Utile pour la récupération lors de l'authentification par lien email
     */
    @PluginMethod
    fun storePendingEmail(call: PluginCall) {
        val email = call.getString("email")

        if (email == null) {
            call.reject("Email est requis")
            return
        }

        val prefs = context.getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        prefs.edit().putString(KEY_PENDING_EMAIL, email).apply()

        val result = JSObject()
        result.put("success", true)
        result.put("message", "Email stocké avec succès")
        call.resolve(result)
    }

    /**
     * Récupère l'email stocké localement
     */
    @PluginMethod
    fun getPendingEmail(call: PluginCall) {
        val prefs = context.getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        val email = prefs.getString(KEY_PENDING_EMAIL, null)

        val result = JSObject()
        result.put("email", email)
        call.resolve(result)
    }

    /**
     * Stocke l'URL de confirmation pour usage futur
     */
    @PluginMethod
    fun storeConfirmationUrl(call: PluginCall) {
        val url = call.getString("url")

        if (url == null) {
            call.reject("URL est requise")
            return
        }

        val prefs = context.getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        prefs.edit().putString(KEY_CONFIRMATION_URL, url).apply()

        val result = JSObject()
        result.put("success", true)
        call.resolve(result)
    }

    /**
     * Récupère l'URL de confirmation stockée
     */
    @PluginMethod
    fun getConfirmationUrl(call: PluginCall) {
        val prefs = context.getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        val url = prefs.getString(KEY_CONFIRMATION_URL, null)

        val result = JSObject()
        result.put("url", url)
        call.resolve(result)
    }

    /**
     * Nettoie les données temporaires stockées
     */
    @PluginMethod
    fun clearPendingData(call: PluginCall) {
        val prefs = context.getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        prefs.edit()
            .remove(KEY_PENDING_EMAIL)
            .remove(KEY_CONFIRMATION_URL)
            .apply()

        val result = JSObject()
        result.put("success", true)
        call.resolve(result)
    }
}
