# Cloudflare Worker : Supabase (PostgreSQL + Auth RLS) & Brevo (SMTP)

Ce projet fournit une architecture Cloudflare Worker moderne (ES Modules) prête pour la production, intégrant **Supabase** (Base de données PostgreSQL, Authentification et règles RLS strictes) et **Brevo** (anciennement Sendinblue, pour l'envoi d'emails transactionnels SMTP à l'Edge) pour propulser un agent autonome et une application web.

---

## 1. Structure du Projet

```text
├── database/
│   └── schema.sql            # Schéma PostgreSQL : table public.profiles, RLS & trigger handle_new_user
├── src/
│   ├── index.js              # Point d'entrée principal Cloudflare Worker (ES Modules) & routeur API
│   └── lib/
│       ├── supabase.js       # Client factory Supabase (stateless, zero-session, injection JWT RLS)
│       └── brevo.js          # Client d'envoi d'emails transactionnels Brevo (SMTP v3)
├── .dev.vars.example         # Gabarit des variables d'environnement locales
├── wrangler.toml             # Configuration du worker Cloudflare
├── package.json              # Dépendances Node.js (@supabase/supabase-js, etc.)
└── README.md                 # Documentation complète d'installation et d'utilisation
```

---

## 2. Spécifications du Client Supabase (`src/lib/supabase.js`)

Le client est optimisé pour les runtimes serverless (Cloudflare Workers) et les contextes d'agents :

- **Fabrique (Factory)** : `createSupabaseClient(env, jwtToken, options)` instancie dynamiquement le client sans singleton persistant.
- **Désactivation de la session locale** :
  ```javascript
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  }
  ```
- **Injection dynamique du JWT** : Lorsqu'un utilisateur effectue une requête, son token JWT est injecté dans les en-têtes globaux (`Authorization: Bearer <token>`). Supabase applique ainsi rigoureusement le contexte `auth.uid()` au niveau du moteur PostgreSQL (RLS).
- **Client Administrateur Agent** : `createSupabaseAdminClient(env)` permet à l'agent d'exécuter des opérations d'arrière-plan avec la `SERVICE_ROLE_KEY` lorsque nécessaire.

---

## 3. Schéma de Base de Données (`database/schema.sql`)

Le schéma PostgreSQL contient :
1. La table `public.profiles` :
   - `id` : `UUID` clé primaire, liée à `auth.users(id)` avec `ON DELETE CASCADE`.
   - `full_name` : `TEXT` nom complet.
   - `role` : `TEXT DEFAULT 'user'` rôle de l'utilisateur.
   - `is_active` : `BOOLEAN DEFAULT true`.
   - `updated_at` : `TIMESTAMP WITH TIME ZONE`.
2. **Row Level Security (RLS)** activée avec politiques strictes :
   - Les utilisateurs authentifiés peuvent uniquement **lire** (`SELECT`) leur propre profil : `auth.uid() = id`.
   - Les utilisateurs authentifiés peuvent uniquement **modifier** (`UPDATE`) leur propre profil : `auth.uid() = id`.
3. **Fonction & Trigger Automatique** (`handle_new_user`) :
   - Déclenché immédiatement après chaque `INSERT` sur `auth.users`.
   - Initialise automatiquement l'enregistrement correspondant dans `public.profiles`.

### Application du schéma dans Supabase :
1. Connectez-vous à votre [Dashboard Supabase](https://supabase.com/dashboard).
2. Ouvrez votre projet et rendez-vous dans le menu **SQL Editor**.
3. Copiez l'intégralité du contenu du fichier `database/schema.sql` et collez-le dans l'éditeur.
4. Cliquez sur **Run** pour appliquer le schéma, les politiques RLS et le déclencheur.

---

## 4. Configuration de l'Expéditeur Brevo ("Nanasore Team")

Brevo assure l'acheminement des emails transactionnels (SMTP) générés par le Worker et les agents.

### Étape 1 : Obtenir la clé API Brevo (v3)
1. Rendez-vous sur votre compte [Brevo](https://app.brevo.com/).
2. Dans le menu de votre profil en haut à droite, cliquez sur **SMTP & API**.
3. Dans l'onglet **Clés API**, cliquez sur **Générer une nouvelle clé API**.
4. Nommez la clé (ex: `nanasore-worker-agent`) et copiez la clé générée (commençant par `xkeysib-...`).

### Étape 2 : Configurer et Valider l'Expéditeur "Nanasore Team"
1. Dans Brevo, accédez à **Paramètres** (ou **Expéditeurs, Domaines et IP dédiées**) -> **Expéditeurs**.
2. Cliquez sur **Ajouter un expéditeur** :
   - **Nom de l'expéditeur** : `Nanasore Team`
   - **Email de l'expéditeur** : `contact@nanasore.com` (ou votre adresse d'expéditeur validée).
3. Brevo envoie un courriel de confirmation contenant un code/lien de vérification. Validez l'adresse.
4. *(Recommandé)* Configurez les enregistrements **DKIM**, **SPF** et **DMARC** sur votre zone DNS pour une délivrabilité optimale.

---

## 5. Exécution en Local avec Wrangler

### Prérequis
- [Node.js](https://nodejs.org/) v18+ installé.
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/).

### Étape 1 : Installation des dépendances
À la racine du projet, lancez :
```bash
npm install
```

### Étape 2 : Préparation des variables d'environnement (`.dev.vars`)
Dupliquez le fichier `.dev.vars.example` :
```bash
cp .dev.vars.example .dev.vars
```
Éditez `.dev.vars` et renseignez vos véritables valeurs :
```ini
ENVIRONMENT="development"
SUPABASE_URL="https://votre-projet.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
BREVO_API_KEY="xkeysib-..."
BREVO_SENDER_NAME="Nanasore Team"
BREVO_SENDER_EMAIL="contact@nanasore.com"
```

### Étape 3 : Démarrage du serveur local
Lancez Wrangler en mode développement :
```bash
npx wrangler dev
```
Par défaut, le worker démarre sur `http://localhost:8787`.

---

## 6. Déploiement en Production sur Cloudflare

1. Authentifiez-vous auprès de Cloudflare si ce n'est pas déjà fait :
   ```bash
   npx wrangler login
   ```
2. Configurez les secrets de production chiffrés :
   ```bash
   npx wrangler secret put SUPABASE_URL
   npx wrangler secret put SUPABASE_ANON_KEY
   npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
   npx wrangler secret put BREVO_API_KEY
   ```
3. Déployez le Worker :
   ```bash
   npx wrangler deploy
   ```

---

## 7. Points de Terminaison API (Endpoints) & Exemples de Test

### A. Healthcheck
```bash
curl http://localhost:8787/api/health
```

### B. Récupération du profil utilisateur (RLS active)
Remplacez `<TOKEN_JWT_UTILISATEUR>` par le token obtenu après login Supabase :
```bash
curl -X GET http://localhost:8787/api/profile \
  -H "Authorization: Bearer <TOKEN_JWT_UTILISATEUR>"
```
*Le client Supabase injecte automatiquement ce JWT ; la politique RLS garantit que l'utilisateur ne reçoit que son propre profil.*

### C. Mise à jour de son profil
```bash
curl -X PUT http://localhost:8787/api/profile \
  -H "Authorization: Bearer <TOKEN_JWT_UTILISATEUR>" \
  -H "Content-Type: application/json" \
  -d '{"full_name": "Alex Dupont"}'
```

### D. Envoi d'email transactionnel via Brevo ("Nanasore Team")
```bash
curl -X POST http://localhost:8787/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": [{"email": "client@example.com", "name": "Client Nanasore"}],
    "subject": "Votre rapport d'\''analyse",
    "htmlContent": "<p>Bonjour, voici le rapport généré par notre agent.</p>"
  }'
```

### E. Notification Agent
```bash
curl -X POST http://localhost:8787/api/agent/notify \
  -H "Content-Type: application/json" \
  -d '{
    "email": "destinataire@example.com",
    "title": "Alerte Traitement Terminé",
    "message": "L'\''agent a finalisé la synchronisation avec succès.",
    "actionUrl": "https://nanasore.com/dashboard"
  }'
```
