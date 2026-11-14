# NaNa Payment Micro-service (IP Statique & Zéro Carte Bancaire)

Micro-service autonome dédié au traitement des paiements bancaires et Mobile Money pour **Nanasore**.
Conçu pour fonctionner **100 % gratuitement et sans aucune carte bancaire** sur **Render.com** (ou Vercel), avec sortie réseau par **IP Statique via Fixie**.

---

## 🏗️ Architecture

```
[ Frontend Nanasore ] (Firebase Hosting - Gratuit)
        │
        ▼ (HTTPS REST / Webhooks)
[ Micro-service Node.js ] (Render Free Web Service - Gratuit)
        │
        ▼ (Toutes requêtes sortantes via Proxy Fixie)
[ Fixie Static IP Proxy ] (Plan Tricycle Gratuit - Zéro CB)
        │
        ▼ (Sortie par IP STATIQUE FIXE Whitelistée)
[ Serveurs Bancaires / Agrégateurs ] (CinetPay, Wave, Orange, Coris, etc.)
```

---

## 🚀 Étape 1 : Obtenir l'URL et les IPs Statiques Fixie (Gratuit, 0 CB)

1. Rendez-vous sur : **[https://app.usefixie.com/signup](https://app.usefixie.com/signup)**
2. Créez un compte avec votre email (`pousbila04@gmail.com`).
3. Cliquez sur **New Proxy** et sélectionnez le plan gratuit **tricycle** (0 $/mois, 500 requêtes/mois, aucune carte requise).
4. Sur la page de votre proxy, copiez :
   - **Proxy URL** : `http://fixie:<votre_token>@velvet.usefixie.com:80`
   - **Outbound IPs** : Deux adresses IP statiques (ex: `54.xxx.xxx.xxx`, `34.xxx.xxx.xxx`).
5. **Ces deux adresses IP sont celles à renseigner dans la liste blanche (IP Whitelisting) de votre partenaire bancaire.**

---

## ⚡ Étape 2 : Déploiement sur Render.com (Gratuit, 0 CB)

1. Rendez-vous sur : **[https://dashboard.render.com](https://dashboard.render.com)**
2. Connectez-vous ou créez votre compte (`pousbila04@gmail.com`).
3. Cliquez sur **New +** > **Web Service**.
4. Liez votre dépôt Git (ou uploadez ce dossier) :
   - **Nom** : `nana-payment-api`
   - **Environment** : `Node`
   - **Plan** : `Free` (0 $/mois)
   - **Build Command** : `npm install`
   - **Start Command** : `npm start`
5. Dans l'onglet **Environment Variables**, ajoutez :
   - `FIXIE_URL` : Votre URL Fixie copiée à l'étape 1
   - `PAYMENT_WEBHOOK_SECRET` : `konkobo_telecom_webhook_secret_key_2026`
   - `PORT` : `10000`
   - `NODE_ENV` : `production`
   - `FIREBASE_PROJECT_ID` : `nanasore`
6. Cliquez sur **Deploy Web Service**.
7. Votre API sera immédiatement disponible sur : `https://nana-payment-api.onrender.com`.

---

## 🧪 Étape 3 : Tester & Vérifier l'Adresse IP Statique

Pour vérifier instantanément l'adresse IP sortante que voient les banques :

### En ligne de commande locale :
```bash
node test-fixie.js "http://fixie:VOTRE_TOKEN@velvet.usefixie.com:80"
```

### Via l'API déployée sur Render :
```bash
curl https://nana-payment-api.onrender.com/api/payment/ip
```
La réponse JSON contient l'adresse IP statique exacte :
```json
{
  "status": "success",
  "ip": "54.xxx.xxx.xxx",
  "isProxyActive": true,
  "whitelistingInstructions": "Ajoutez l'adresse IP 54.xxx.xxx.xxx dans la liste blanche..."
}
```

---

## 📡 Endpoints de l'API

| Méthode | Route | Description |
|---|---|---|
| `GET` | `/health` | Statut du micro-service et vérification Fixie |
| `GET` | `/api/payment/ip` | Vérifie l'adresse IP statique vue par la banque |
| `POST` | `/api/payment/webhook` | Webhook universel HMAC-SHA256 (Wave, Orange, CinetPay, FedaPay) |
| `POST` | `/api/payment/initiate` | Initialise une transaction vers la banque via IP statique |
| `POST` | `/api/payment/bank-proxy` | Relais sécurisé universel vers l'API d'une banque partenaire |
