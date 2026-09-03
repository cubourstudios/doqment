import {
  FileTextIcon,
  FolderIcon,
  HomeIcon,
  SettingsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/**
 * One list, rendered as a bottom tab bar on phones and a sidebar on desktop.
 *
 * Five entries is the ceiling for a mobile tab bar — past that the targets get
 * too narrow to hit reliably — so anything else belongs inside Settings.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: HomeIcon },
  { href: "/projects", label: "Projects", icon: FolderIcon },
  { href: "/clients", label: "Clients", icon: UsersIcon },
  { href: "/documents", label: "Docs", icon: FileTextIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];
