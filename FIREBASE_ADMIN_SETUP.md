# Configuration Firebase Admin SDK pour Nanasore

## Qu'est-ce que Firebase Admin SDK ?

Firebase Admin SDK permet d'effectuer des opérations privilégiées côté serveur que le client SDK ne peut pas faire, comme :
- Réinitialiser les mots de passe utilisateurs
- Gérer les utilisateurs sans authentification
- Accéder à Firestore avec des droits administrateur
- Générer des tokens personnalisés

## Étapes de configuration

### 1. Télécharger la clé de service Firebase

1. Allez sur la [Console Firebase](https://console.firebase.google.com/)
2. Sélectionnez votre projet `nanasore`
3. Cliquez sur l'icône ⚙️ (Paramètres) > **Comptes de service**
4. Cliquez sur **Générer une nouvelle clé privée**
5. Sélectionnez **JSON** et cliquez sur **Générer**
6. Sauvegardez ce fichier JSON en local (NE PAS le committer dans Git !)

### 2. Extraire les valeurs du fichier JSON

Le fichier JSON téléchargé ressemble à ceci :

```json
{
  "type": "service_account",
  "project_id": "nanasore",
  "private_key_id": "xxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@nanasore.iam.gserviceaccount.com",
  "client_id": "xxxxx",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40nanasore.iam.gserviceaccount.com"
}
```

### 3. Ajouter les variables d'environnement

Ajoutez ces variables dans votre fichier `.env` :

```bash
# Firebase Admin SDK
FIREBASE_TYPE="service_account"
FIREBASE_PROJECT_ID="nanasore"
FIREBASE_PRIVATE_KEY_ID="votre_private_key_id_ici"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nVOTRE_CLE_PRIVEE_ICI\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@nanasore.iam.gserviceaccount.com"
FIREBASE_CLIENT_ID="votre_client_id_ici"
FIREBASE_AUTH_URI="https://accounts.google.com/o/oauth2/auth"
FIREBASE_TOKEN_URI="https://oauth2.googleapis.com/token"
FIREBASE_AUTH_PROVIDER_X509_CERT_URL="https://www.googleapis.com/oauth2/v1/certs"
FIREBASE_CLIENT_X509_CERT_URL="https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40nanasore.iam.gserviceaccount.com"
```

**IMPORTANT :**
- Copiez exactement la valeur de `private_key` du fichier JSON, y compris les `\n` pour les sauts de ligne
- NE JAMAIS committer le fichier `.env` dans Git
- Ajoutez `.env` à votre `.gitignore`

### 4. Redémarrer le serveur

Après avoir ajouté les variables d'environnement, redémarrez votre serveur :

```bash
npm run dev
```

## Fonctionnalités activées

Avec Firebase Admin SDK configuré, les fonctionnalités suivantes sont disponibles :

### ✅ Réinitialisation de mot de passe
- Route : `POST /reset-password` (demande)
- Route : `POST /reset-password` (confirmation avec token)
- Stockage sécurisé des tokens dans Firestore
- Expiration des tokens après 1 heure

### ✅ Gestion des utilisateurs
- Vérification de l'existence d'un utilisateur par email
- Mise à jour du mot de passe sans authentification préalable
- Création d'utilisateurs administrateur

## Sécurité

- Les tokens de réinitialisation expirent après 1 heure
- Les tokens sont uniques (crypto.randomBytes 32 bytes)
- Le token est supprimé après utilisation
- Les messages d'erreur ne révèlent pas si un email existe ou non (sécurité contre l'énumération)

## Alternative : Google Cloud ADC

Si vous déployez sur Google Cloud (Cloud Run, Cloud Functions), vous pouvez utiliser Application Default Credentials au lieu des variables d'environnement :

```bash
# Sur Google Cloud, les credentials sont automatiquement injectés
# Pas besoin de configurer FIREBASE_PRIVATE_KEY, etc.
```

Dans ce cas, seule `FIREBASE_PROJECT_ID` est nécessaire.

## Dépannage

### Erreur : "Certificate error"
Si vous obtenez une erreur de certificat, vérifiez que la clé privée est correctement formatée avec les `\n`.

### Erreur : "auth/email-already-exists"
C'est normal lors du développement. Utilisez un email différent pour les tests.

### Erreur : "permission-denied"
Vérifiez que votre compte de service Firebase a les bonnes permissions dans IAM & Admin.
