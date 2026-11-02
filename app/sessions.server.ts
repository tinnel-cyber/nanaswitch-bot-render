import { createCookieSessionStorage } from "@remix-run/node";

// Récupération de la clé secrète que vous avez définie
const sessionSecret =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV !== "production"
    ? "nanasore_dev_session_secret_fallback_key_2026"
    : undefined);

if (!sessionSecret) {
  throw new Error("La variable d'environnement SESSION_SECRET est requise.");
}

// Configuration du stockage sécurisé des cookies pour Nanasore
export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__nanasore_session",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 1 semaine de connexion
    path: "/",
    sameSite: "lax",
    secrets: [sessionSecret], // C'est ici que le secret protège le cookie
    secure: process.env.NODE_ENV === "production", // HTTPS en production sur Render
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;
