/**
 * Badge theme configuration matching PWA design
 * Colors and gradients from the web app's Badge component
 */

export const BADGE_COLORS = {
  vip: {
    gradient: ['#8B5CF6', '#EC4899'] as const, // purple to pink
    text: '#FFFFFF',
    shadow: 'rgba(139, 92, 246, 0.3)',
  },
  trending: {
    gradient: ['#F97316', '#EF4444'] as const, // orange to red
    text: '#FFFFFF',
    shadow: 'rgba(249, 115, 22, 0.3)',
  },
  new: {
    gradient: ['#3B82F6', '#06B6D4'] as const, // blue to cyan
    text: '#FFFFFF',
    shadow: 'rgba(59, 130, 246, 0.3)',
  },
  free: {
    background: '#ECFDF5',
    text: '#047857',
    border: '#A7F3D0',
  },
  soldOut: {
    background: '#FEF2F2',
    text: '#DC2626',
    border: '#FECACA',
  },
  lastChance: {
    background: '#FFFBEB',
    text: '#D97706',
    border: '#FDE68A',
  },
};

export type BadgeStatus = 'VIP' | 'Trending' | 'New' | 'Free' | 'Last Chance' | 'Sold Out';
