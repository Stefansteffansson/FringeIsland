// Admin-related TypeScript types for FringeIsland (D15 Universal Group Pattern)

/** Admin panel card types */
export type CardType = 'users' | 'groups' | 'journeys' | 'enrollments';

/** Platform statistics */
export interface PlatformStats {
  users: number | null;
  groups: number | null;
  journeys: number | null;
  enrollments: number | null;
}

/** Confirm modal state (used across admin pages) */
export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  variant: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
}

/** DeusEx group member (member_group_id references a personal group) */
export interface DeusexMember {
  id: string;
  member_group_id: string;
  added_at: string;
  users: {
    id: string;
    email: string;
    full_name: string;
  };
}
