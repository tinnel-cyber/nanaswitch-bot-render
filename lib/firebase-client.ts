import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

export const firebaseClientConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAds0VCLfekX8qQw-ya8ATlUbSyrG4Y6Zk",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pos-app-1759a.firebaseapp.com",
  databaseURL: "https://pos-app-1759a-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pos-app-1759a",
  storageBucket: "pos-app-1759a.firebasestorage.app",
  messagingSenderId: "60089897725",
  appId: "1:60089897725:web:0c675e63e72040dea56494",
};

export const clientApp = !getApps().length ? initializeApp(firebaseClientConfig) : getApp();
export const auth = getAuth(clientApp);
export default auth;
