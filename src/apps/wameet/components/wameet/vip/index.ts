/**
 * Module Hub VIP Wameet (Prompt 26)
 * Découverte des Salles VIP (Éducation/Cours) et Salons VIP (Affaires/Networking)
 */

export * from './types';
export * from './mockVipData';
export { InfiniteCarouselRow } from './InfiniteCarouselRow';
export { VipBusinessLoungeCard } from './VipBusinessLoungeCard';
export { VipCourseRoomCard } from './VipCourseRoomCard';
export { VipRoomDetailModal } from './VipRoomDetailModal';
export { VipDiscoveryScreen } from './VipDiscoveryScreen';
export { VipPaywallModal } from './VipPaywallModal';
export type { VipPaywallModalProps } from './VipPaywallModal';
export { VipCourseRoomView } from './VipCourseRoomView';
export { VipWebinarPlayer } from './VipWebinarPlayer';
export type { VipWebinarPlayerProps } from './VipWebinarPlayer';
export { VipModulesAccordion } from './VipModulesAccordion';
export type { VipModulesAccordionProps } from './VipModulesAccordion';
export { VipQuizEngine } from './VipQuizEngine';
export type { VipQuizEngineProps } from './VipQuizEngine';
export { VipClassroomQnA } from './VipClassroomQnA';
export type { VipClassroomQnAProps } from './VipClassroomQnA';
export { VipExclusiveFeed } from './VipExclusiveFeed';
export type { VipExclusiveFeedProps } from './VipExclusiveFeed';
export { Vip1to1BookingModal } from './Vip1to1BookingModal';
export type { Vip1to1BookingModalProps } from './Vip1to1BookingModal';
export { VipDealsNetworkBoard } from './VipDealsNetworkBoard';
export type { VipDealsNetworkBoardProps } from './VipDealsNetworkBoard';
export { VipBusinessLoungeView } from './VipBusinessLoungeView';
export { useVipSubscription, VIP_DEFAULT_PLANS } from '../../../../../hooks/useVipSubscription';
export type {
  VipSubscriptionStatus,
  VipSubscriptionPlan,
  SubscribeParams,
  UseVipSubscriptionReturn
} from '../../../../../hooks/useVipSubscription';

