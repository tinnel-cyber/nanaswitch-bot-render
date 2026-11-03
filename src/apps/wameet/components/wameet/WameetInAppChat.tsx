import React from 'react';
import {
  WameetChatHub,
  WameetChatHubProps
} from './WameetChatHub';
import {
  WameetChatMessage,
  WameetChatThread,
  WameetChatProductCard
} from '../../../../services/wameetChatService';

export type {
  WameetChatHubProps as WameetInAppChatProps,
  WameetChatMessage,
  WameetChatThread,
  WameetChatProductCard
};

/**
 * ARCHITECTURE DU CHAT IN-APP WAMEET (100% FIREBASE SYNC + AUTO-SUPPRESSION)
 * -------------------------------------------------------------------------
 * 1. Synchronisation temps réel bilatérale 100% Firebase Firestore (onSnapshot)
 * 2. Moteur d'auto-suppression éphémère par défaut (7 jours) :
 *    - Champ expireAt sur chaque document de message
 *    - Google Cloud Firestore TTL Policy
 *    - Firebase Storage Lifecycle Rule (wameet_chat/)
 * 3. Support multimédia complet : Texte, Emojis, Audio (Notes vocales) et Images (WebP < 200Ko)
 */
export const WameetInAppChat: React.FC<WameetChatHubProps> = (props) => {
  return <WameetChatHub {...props} />;
};

export default WameetInAppChat;
