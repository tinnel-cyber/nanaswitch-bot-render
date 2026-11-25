import React from 'react';
import { StoreConfig, StoreProductItem } from '../components/storeBuilder/types';
import { ThemeCustomizationConfig } from '../types';

export type { StoreConfig, StoreProductItem };

export interface WhiteLabelConfig {
  customFooterText?: string;
  hidePoweredBy?: boolean;
  [key: string]: any;
}

export type ThemeId = 'theme-service-portfolio' | 'theme-livestream-pro' | 'theme-beauty-emerald' | 'theme-electro-orange' | 'theme-default' | 'theme-digital-pro' | 'theme-electro-tech' | 'theme-mega-store-pro' | 'theme-blank-custom' | 'theme-minimal' | 'theme-grid' | string;

export interface StoreThemeProps {
  // Données de base de la boutique
  storeSlug?: string;
  storeConfig: StoreConfig;
  storeTheme: 'light' | 'dark' | 'blue';
  customConfig?: ThemeCustomizationConfig;
  forcedThemeId?: string;
  whiteLabelConfig?: {
    customFooterText?: string;
    hidePoweredBy?: boolean;
    [key: string]: any;
  };

  // Catalogue et filtrage
  allProducts: StoreProductItem[];
  filteredProducts: StoreProductItem[];
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;

  // Interactions produit & Panier / Commande
  selectedProduct: StoreProductItem | null;
  onSelectProduct: (product: StoreProductItem) => void;
  onAddToCart: (product: StoreProductItem, quantity: number) => void;
  onBuyNow: (product: StoreProductItem, quantity: number) => void;
  getProductWhatsAppUrl: (product: StoreProductItem) => string;
  cartCount?: number;
  onOpenCart?: () => void;

  // Permissions & Rôles
  isPublicView: boolean;
  isStoreAdmin: boolean;
  isProductEditor: boolean;
  canDelete: boolean;
  isAdminPreview?: boolean;
  isSimulatedMobile?: boolean;

  // Bannières & Médias
  displayBanners: Array<{
    image: string;
    badge?: string;
    title?: string;
    subtitle?: string;
  }>;
  bannerIndex: number;
  bannerScrollRef: React.RefObject<HTMLDivElement | null>;
  onScrollBanner: (direction: 'left' | 'right') => void;
  logoFileInputRef?: React.RefObject<HTMLInputElement | null>;
  bannerFileInputRef?: React.RefObject<HTMLInputElement | null>;
  promoFileInputRef?: React.RefObject<HTMLInputElement | null>;

  // Rayon 1 (Carrousel Nouveautés sous le pouce)
  carouselProducts?: StoreProductItem[];
  carouselColumnCount?: number;
  carouselTopRow?: StoreProductItem[];
  carouselBottomRow?: StoreProductItem[];
  promoShelfScrollRef?: React.RefObject<HTMLDivElement | null>;

  // Actions d'administration commerçant directes sur la vitrine
  onOpenEditProduct?: (product: StoreProductItem) => void;
  onEditProduct?: (product: StoreProductItem, options?: { initialCard?: number }) => void;
  onPreviewFunnel?: (product: StoreProductItem) => void;
  onSelectCustomizerSection?: (accordionIndex: number) => void;
  onOpenQuickCatalog?: () => void;
  onOpenFunnel?: (product: StoreProductItem, e: React.MouseEvent) => void;
  onOpenTunnel?: (product: StoreProductItem) => void;
  onRemoveProduct?: (productId: string, productName: string, e: React.MouseEvent) => void;
  onToggleLiveDemo?: (product: StoreProductItem, e: React.MouseEvent) => void;
  onShareProduct?: (product: StoreProductItem, e: React.MouseEvent) => void;
  onOpenAddProduct?: () => void;
  onOpenTickerModal?: () => void;
  onOpenMarketingAiModal?: () => void;
  onOpenWebinarModal?: () => void;
  onOpenThemeSelector?: () => void;
  onUpdateCustomSections?: (sections: any[]) => void;
  onAddCustomSection?: (type: any) => void;
  onConfigureCustomSection?: (sectionId: string) => void;
  onLoadDefaultSections?: () => void;
  onDeployBlueprint?: (blueprint: any) => void;
}

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  subtitle: string;
  description: string;
  badge: string;
  version: string;
  previewMockup: string; // URL ou identifiant de composant
  features: string[];
  isAvailable: boolean;
  component: React.ComponentType<StoreThemeProps>;
}
