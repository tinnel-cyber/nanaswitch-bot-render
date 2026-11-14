# Guide de Réinitialisation de Mot de Passe - Nanasore

## Vue d'ensemble

Le système de réinitialisation de mot de passe utilise :
- **Firebase Admin SDK** pour la gestion sécurisée des utilisateurs
- **Brevo API** pour l'envoi d'emails transactionnels
- **Firestore** pour le stockage sécurisé des tokens de réinitialisation
- **Remix** pour les routes serveur

## Flux utilisateur

### 1. Demande de réinitialisation (Forgot Password)

**Route** : `POST /reset-password`

**Formulaire** :
- Email de l'utilisateur

**Processus** :
1. L'utilisateur entre son email sur `/reset-password`
2. Le serveur vérifie si l'email existe dans Firebase
3. Si l'utilisateur existe :
   - Génération d'un token sécurisé (32 bytes hex)
   - Stockage du token dans Firestore (collection `passwordResets`)
   - Expiration du token : 1 heure
   - Envoi de l'email via Brevo (Template #2)
4. Réponse : Message de succès (identique que l'email existe ou non pour sécurité)

**URL de réinitialisation générée** :
```
https://nanasore.com/reset-password?token={token}
```

### 2. Confirmation de réinitialisation (Reset Password)

**Route** : `POST /reset-password` (avec token)

**Formulaire** :
- Token (hidden field, provenant de l'URL)
- Nouveau mot de passe
- Confirmation du mot de passe

**Processus** :
1. L'utilisateur clique sur le lien dans l'email
2. Le formulaire de réinitialisation s'affiche
3. L'utilisateur entre son nouveau mot de passe
4. Le serveur :
   - Vérifie que le token existe dans Firestore
   - Vérifie que le token n'est pas expiré
   - Met à jour le mot de passe dans Firebase Auth
   - Supprime le token utilisé
5. Redirection vers la page de connexion

## Fichiers impliqués

### 1. `app/routes/reset-password.jsx`
Route Remix gérant :
- L'affichage du formulaire de demande
- L'affichage du formulaire de réinitialisation
- Le traitement des actions (demande et confirmation)

### 2. `app/utils/firebase.server.ts`
Module Firebase Admin avec les fonctions :
- `getUserByEmail(email)` : Vérifie si un utilisateur existe
- `updateUserPassword(uid, password)` : Met à jour le mot de passe
- `createUser(email, password, displayName)` : Crée un utilisateur

### 3. `app/utils/email.server.ts`
Module Brevo avec les fonctions :
- `sendPasswordResetEmail(email, name, resetUrl)` : Envoie l'email de réinitialisation

## Configuration requise

### Variables d'environnement

Ajoutez ces variables dans votre fichier `.env` :

```bash
# Firebase Admin SDK (obligatoire pour la réinitialisation de mot de passe)
FIREBASE_TYPE="service_account"
FIREBASE_PROJECT_ID="nanasore"
FIREBASE_PRIVATE_KEY_ID="your_private_key_id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@nanasore.iam.gserviceaccount.com"
FIREBASE_CLIENT_ID="your_client_id"
FIREBASE_AUTH_URI="https://accounts.google.com/o/oauth2/auth"
FIREBASE_TOKEN_URI="https://oauth2.googleapis.com/token"
FIREBASE_AUTH_PROVIDER_X509_CERT_URL="https://www.googleapis.com/oauth2/v1/certs"
FIREBASE_CLIENT_X509_CERT_URL="https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40nanasore.iam.gserviceaccount.com"

# Brevo Email API
BREVO_API_KEY="your_brevo_api_key"
BREVO_SENDER_EMAIL="admin@nanasore.com"
BREVO_SENDER_NAME="Nanasore Team"

# URL de l'application
APP_URL="https://nanasore.com"
```

### Dépendances

Assurez-vous que ces packages sont installés :

```bash
npm install firebase-admin
```

Déjà installé dans ce projet ✅

## Template Brevo #2

Le template Brevo doit être configuré avec les variables suivantes :

| Variable | Description |
|----------|-------------|
| `RESET_PASSWORD_URL` | Lien de réinitialisation sécurisé |
| `EMAIL` | Email de l'utilisateur |
| `NAME` | Nom de l'utilisateur |

**Exemple de template** :

```
Bonjour {{ NAME }},

Vous avez demandé la réinitialisation de votre mot de passe.

Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :
{{ RESET_PASSWORD_URL }}

Ce lien expire dans 1 heure.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.

Cordialement,
L'équipe Nanasore
```

## Sécurité

### ✅ Mesures de sécurité implémentées

1. **Tokens uniques** : Utilisation de `crypto.randomBytes(32)` pour générer des tokens imprévisibles
2. **Expiration** : Les tokens expirent après 1 heure
3. **Suppression après utilisation** : Le token est supprimé après réinitialisation réussie
4. **Pas d'énumération d'emails** : Le même message est affiché que l'email existe ou non
5. **Validation de mot de passe** : Minimum 6 caractères requis
6. **Confirmation de mot de passe** : Double saisie obligatoire

### 🔒 Firestore Security Rules

Ajoutez ces règles dans Firestore pour sécuriser la collection `passwordResets` :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /passwordResets/{token} {
      allow read, write: if false; // Interdit l'accès depuis le client
    }
  }
}
```

## Tests

### Test local

1. Lancez le serveur de développement :
   ```bash
   npm run dev
   ```

2. Naviguez vers `http://localhost:3000/reset-password`

3. Entrez un email de test (ex: `test@example.com`)

4. Vérifiez que l'email est envoyé via Brevo

5. Cliquez sur le lien dans l'email

6. Entrez un nouveau mot de passe

7. Vérifiez que vous pouvez vous connecter avec le nouveau mot de passe

### Debug

Pour voir les logs du serveur :
```bash
npm run dev
```

Les logs incluent :
- `[PASSWORD RESET]` : Envoi d'email de réinitialisation
- `[FIREBASE ADMIN]` : Initialisation Firebase Admin
- Erreurs de réinitialisation

## Intégration avec AuthScreen

Le composant `AuthScreen.tsx` a déjà un lien "Mot de passe oublié ?" qui devrait rediriger vers `/reset-password`.

Assurez-vous que le lien est correct :

```tsx
<Link to="/reset-password" className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
  Mot de passe oublié ?
</Link>
```

## Personnalisation

### Changer le délai d'expiration

Dans `app/routes/reset-password.jsx`, modifiez cette ligne :

```javascript
const expiresAt = Date.now() + 3600000; // 1 heure en millisecondes
```

Pour 24 heures :
```javascript
const expiresAt = Date.now() + 86400000; // 24 heures
```

### Changer le template Brevo

Modifiez le `templateId` dans `app/utils/email.server.ts` :

```javascript
export async function sendPasswordResetEmail({ email, name, resetUrl }: { email: string; name?: string; resetUrl: string }) {
  return sendBrevoEmail({
    templateId: 2, // Changez ce numéro pour utiliser un autre template
    email,
    name,
    params: {
      RESET_PASSWORD_URL: resetUrl,
      EMAIL: email,
      NAME: name || 'Utilisateur',
    },
  });
}
```

## Dépannage

### Erreur : "Lien invalide ou expiré"

**Causes possibles** :
- Le token a expiré (plus de 1 heure)
- Le token a déjà été utilisé
- Le token a été supprimé manuellement

**Solution** : Demandez une nouvelle réinitialisation

### Erreur : "Erreur lors de l'envoi de l'e-mail"

**Causes possibles** :
- `BREVO_API_KEY` manquante ou invalide
- Template Brevo #2 non configuré
- Problème de réseau

**Solution** :
- Vérifiez les variables d'environnement
- Configurez le template dans le dashboard Brevo
- Vérifiez les logs du serveur

### Erreur : "Firebase Admin non initialisé"

**Causes possibles** :
- Variables Firebase Admin manquantes
- Clé privée mal formatée

**Solution** :
- Suivez le guide `FIREBASE_ADMIN_SETUP.md`
- Vérifiez que la clé privée contient les `\n`

## Support

Pour toute question ou problème :
- Consultez `FIREBASE_ADMIN_SETUP.md` pour la configuration Firebase Admin
- Vérifiez la documentation Brevo : https://developers.brevo.com/
- Consultez la documentation Remix : https://remix.run/docs
