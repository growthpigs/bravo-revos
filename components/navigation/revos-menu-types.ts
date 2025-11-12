import { LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  isActive?: boolean;
}

export interface MenuSection {
  id: string;
  title: string;
  items: MenuItem[];
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export interface ActiveCartridge {
  id: string;
  name: string;
  chips: string[];
  loadedAt: Date;
}

export interface RevOSMenuProps {
  credits?: number;
  showSandboxToggle?: boolean;
  sandboxMode?: boolean;
  onSandboxToggle?: (enabled: boolean) => void;
  activeCartridge?: ActiveCartridge | null;
}
