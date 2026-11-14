# Guide Android App Links & Authentification par Lien Email - Nanasore

## Vue d'ensemble

Ce guide explique comment configurer les Android App Links et l'authentification par lien email (Email Link Authentication) pour l'application mobile Nanasore, en remplaçant les Firebase Dynamic Links dépréciés.

## Architecture

### Composants

1. **AndroidManifest.xml** - Configuration des intent filters pour intercepter les liens HTTPS
2. **MainActivity.kt** - Logique Kotlin pour traiter les liens entrants
3. **EmailLinkPlugin.kt** - Plugin Capacitor personnalisé pour le stockage local
4. **emailLinkAuthService.ts** - Service TypeScript pour l'intégration frontend
5. **assetlinks.json** - Fichier de vérification App Links (Digital Asset Links)

## Flux d'authentification par lien email

### 1. Inscription avec Email Link

```
User → Entre email → Stockage local (Android) → API Backend → Firebase → Email Brevo → User clique lien → Android App Link → MainActivity → Firebase Auth → Dashboard
```

### 2. Confirmation d'email (Token)

```
User → Clique lien email → Android App Link → MainActivity → Redirection WebView → API Backend → Vérification token → Firestore → Success
```

### 3. Réinitialisation de mot de passe

```
User → Demande reset → API Backend → Token Firestore → Email Brevo → User clique lien → Android App Link → MainActivity → Redirection WebView → Formulaire reset → Firebase Auth → Success
```

## Étape 1 : Configuration Android

### 1.1 Modifier AndroidManifest.xml

Le fichier `android-app/AndroidManifest.xml` est déjà configuré avec :

```xml
<activity
    android:name=".MainActivity"
    android:exported="true"
    android:launchMode="singleTask">

    <!-- App Link pour confirmation d'email -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="https"
            android:host="nanasore.com"
            android:pathPrefix="/confirm-email" />
    </intent-filter>

    <!-- App Link pour réinitialisation mot de passe -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="https"
            android:host="nanasore.com"
            android:pathPrefix="/reset-password" />
    </intent-filter>

    <!-- App Link pour Firebase Email Link Authentication -->
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data
            android:scheme="https"
            android:host="nanasore.com"
            android:pathPrefix="/finishSignUp" />
    </intent-filter>
</activity>
```

**Points clés :**
- `android:autoVerify="true"` : Active la vérification automatique des App Links
- `android:launchMode="singleTask"` : Empêche la création de multiples instances
- `android:exported="true"` : Permet à d'autres applications de lancer cette activité

### 1.2 Installer Capacitor et dépendances

```bash
npm install @capacitor/android @capacitor/app @capacitor/core
npm install firebase-admin
```

### 1.3 Synchroniser Capacitor

```bash
npx cap sync android
```

### 1.4 Ajouter le plugin Capacitor personnalisé

Copiez le fichier `EmailLinkPlugin.kt` dans :
```
android/app/src/main/java/com/nanasore/pos/EmailLinkPlugin.kt
```

Enregistrez le plugin dans `android/app/src/main/java/com/nanasore/pos/MainActivity.kt` :

```kotlin
import com.getcapacitor.Plugin
import com.getcapacitor.PluginLoader

// Dans onCreate()
PluginLoader.loadPlugin(this, EmailLinkPlugin::class.java)
```

## Étape 2 : Configuration Firebase Console

### 2.1 Activer l'authentification par lien email

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet `nanasore`
3. Navigation > **Authentication** > **Sign-in method**
4. Activez **Email/Password**
5. Activez **Email link (passwordless sign-in)**
6. Cochez la case "Enable" et sauvegardez

### 2.2 Configurer le domaine autorisé

Dans Firebase Console > Authentication > Sign-in method > Email link :

- Ajoutez `https://nanasore.com` comme domaine autorisé
- Activez "Block email/link sign-in from unapproved domains"

### 2.3 Configurer Android App Links

1. Firebase Console > Authentication > Sign-in method > Email link
2. Cliquez sur **Android App**
3. Entrez le package name : `com.nanasore.pos`
4. Entrez le SHA-256 du certificat de signature (voir étape 3)
5. Cliquez sur **Save**

## Étape 3 : Obtenir les empreintes SHA-256

### Debug certificate (développement)

```bash
keytool -list -v \
  -alias androiddebugkey \
  -keystore ~/.android/debug.keystore \
  -storepass android \
  -keypass android
```

Sur Windows :
```bash
keytool -list -v -alias androiddebugkey -keystore %USERPROFILE%\.android\debug.keystore
```

### Release certificate (production)

```bash
keytool -list -v \
  -alias your-release-key-alias \
  -keystore path/to/your/release/keystore.jks
```

Copiez la valeur de `SHA256` pour chaque certificat.

## Étape 4 : Configurer Digital Asset Links

### 4.1 Générer le fichier assetlinks.json

Le fichier `android-app/.well-known/assetlinks.json` doit être hébergé sur votre serveur à :
```
https://nanasore.com/.well-known/assetlinks.json
```

Remplacez les SHA256 placeholders :

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.nanasore.pos",
      "sha256_cert_fingerprints": [
        "AA:BB:CC:DD:EE:FF:... (Debug SHA256)",
        "11:22:33:44:55:66:... (Release SHA256)"
      ]
    }
  }
]
```

### 4.2 Déployer le fichier

Copiez le fichier dans le dossier public de votre application web :

```bash
cp android-app/.well-known/assetlinks.json public/.well-known/assetlinks.json
```

Ou déployez-le manuellement sur votre serveur web.

### 4.3 Vérifier la configuration

Testez l'accessibilité :
```bash
curl https://nanasore.com/.well-known/assetlinks.json
```

Doit retourner le fichier JSON avec les bonnes empreintes.

## Étape 5 : Intégration Frontend (React/TypeScript)

### 5.1 Utiliser le service emailLinkAuthService

```typescript
import { emailLinkAuthService } from '@/services/emailLinkAuthService';

// Inscription avec lien email
const handleSignup = async (email: string, name: string) => {
  const result = await emailLinkAuthService.initiateEmailLinkSignup(
    email,
    name,
    'creator_trainer'
  );

  if (result.success) {
    // Email envoyé avec succès
    console.log('URL de confirmation:', result.confirmationUrl);
  }
};

// Écouter les URLs entrantes (App Links)
useEffect(() => {
  emailLinkAuthService.handleIncomingUrl();
}, []);
```

### 5.2 Modifier AuthScreen pour Email Link Auth

```typescript
// Dans AuthScreen.tsx
import { emailLinkAuthService } from '@/services/emailLinkAuthService';

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  if (isSignUp) {
    // Utiliser l'authentification par lien email
    const result = await emailLinkAuthService.initiateEmailLinkSignup(
      email.trim(),
      fullName.trim(),
      sellerMode
    );

    if (result.success) {
      setInfoMessage("Un email de confirmation a été envoyé. Cliquez sur le lien pour compléter votre inscription.");
    } else {
      setErrorMessage(result.message);
    }
  }
};
```

## Étape 6 : Backend API Modifications

### 6.1 Mettre à jour la route d'inscription

Modifier `server.ts` pour supporter l'authentification par lien email :

```typescript
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name, sellerMode, emailLinkAuth } = req.body;

  if (emailLinkAuth) {
    // Mode authentification par lien email
    // Générer un lien d'action Firebase pour l'email
    const actionCodeSettings = {
      url: 'https://nanasore.com/finishSignUp',
      handleCodeInApp: true,
    };

    const link = await adminAuth.generateSignInWithEmailLink(email, actionCodeSettings);

    // Envoyer l'email via Brevo
    await sendConfirmationEmail({
      email,
      name,
      confirmationUrl: link
    });

    return res.json({
      success: true,
      message: 'Email de confirmation envoyé',
      confirmationUrl: link
    });
  }

  // Mode inscription standard (code existant)
  // ...
});
```

### 6.2 Créer la route /finishSignUp

```typescript
app.get('/finishSignUp', async (req, res) => {
  // Cette route gère le retour du lien email Firebase
  // Firebase Auth web SDK traitera automatiquement le lien
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
```

## Étape 7 : Test et Validation

### 7.1 Tester les App Links localement

1. Générez un lien de test :
```bash
adb shell am start -a android.intent.action.VIEW \
  -c android.intent.category.BROWSABLE \
  -d "https://nanasore.com/confirm-email?token=test"
```

2. Vérifiez que l'application s'ouvre et que MainActivity traite le lien.

### 7.2 Tester l'authentification par lien email

1. Lancez l'application sur un appareil Android
2. Lancez le flux d'inscription
3. Entrez votre email
4. Vérifiez que l'email est reçu
5. Cliquez sur le lien dans l'email
6. Vérifiez que l'application s'ouvre et finalise l'authentification

### 7.3 Vérifier les logs Android

```bash
adb logcat | grep MainActivity
adb logcat | grep EmailLinkAuth
```

## Étape 8 : Production

### 8.1 Build de release

```bash
cd android
./gradlew assembleRelease
```

### 8.2 Signer l'APK

Utilisez votre keystore de production et mettez à jour les SHA-256 dans `assetlinks.json`.

### 8.3 Publier sur Google Play

Assurez-vous que :
- Le package name correspond (`com.nanasore.pos`)
- Les SHA-256 de release sont dans `assetlinks.json`
- Le fichier `assetlinks.json` est accessible sur `https://nanasore.com/.well-known/assetlinks.json`

## Dépannage

### Problème : L'application ne s'ouvre pas sur le lien

**Causes possibles :**
- `android:autoVerify="true"` non activé
- `assetlinks.json` mal configuré
- SHA-256 incorrect

**Solution :**
- Vérifiez que `assetlinks.json` est accessible
- Vérifiez les SHA-256 avec `keytool`
- Désinstallez/réinstallez l'application pour forcer la vérification

### Problème : Firebase Auth ne reconnaît pas le lien

**Causes possibles :**
- Domaine non autorisé dans Firebase Console
- `handleCodeInApp: false` au lieu de `true`

**Solution :**
- Ajoutez `https://nanasore.com` dans Firebase Console > Authentication > Sign-in method
- Vérifiez `actionCodeSettings.handleCodeInApp = true`

### Problème : Email non stocké localement

**Causes possibles :**
- Plugin Capacitor non enregistré
- Permissions manquantes

**Solution :**
- Vérifiez que `EmailLinkPlugin` est enregistré dans MainActivity
- Vérifiez les logs Capacitor

## Sécurité

### ✅ Mesures de sécurité

1. **Auto-verification des App Links** : `android:autoVerify="true"`
2. **SHA-256 verification** : Empêche les apps malveillantes de se faire passer pour la vôtre
3. **Domain whitelist Firebase** : Seuls les domaines autorisés peuvent générer des liens
4. **Token unique par email** : Chaque lien est unique et expire
5. **Validation côté serveur** : Vérification des tokens dans Firestore

## Ressources

- [Firebase Email Link Authentication](https://firebase.google.com/docs/auth/android/email-link-auth)
- [Android App Links](https://developer.android.com/training/app-links)
- [Digital Asset Links](https://developers.google.com/digital-asset-links)
- [Capacitor Deep Links](https://capacitorjs.com/docs/guides/deep-links)
- [Remplacement de Firebase Dynamic Links](https://firebase.google.com/docs/dynamic-links/deprecation)
