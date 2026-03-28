/** Routes where the bottom nav & sidebar should hide to give full-screen space */
export const immersiveRoutes = [
  "/premixes/",    // guided bake (dynamic segment)
  "/dough-assistant",
  "/dough",
  "/starter-ai",
  "/starter-guide",
  "/bake-analysis",
  "/recipe-generator",
  "/share",
  "/auth",
];

/** Check whether a pathname matches an immersive route */
export const isImmersiveRoute = (pathname: string) =>
  immersiveRoutes.some((r) => pathname === r || pathname.startsWith(r));

import {
  ChefHat, Home, Megaphone, Cog, MessageSquare, BookOpen,
  Cookie, Users, Search, Bell, FlaskConical, Calculator, Bot,
  ClipboardList, GraduationCap,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  ariaLabel: string;
  iconColor?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    title: "Home",
    items: [
      { label: "Dashboard", path: "/", icon: Home, ariaLabel: "Home overview", iconColor: "text-blue-500" },
    ],
  },
  {
    title: "Baking",
    items: [
      { label: "Guided Bakes", path: "/premixes", icon: Cookie, ariaLabel: "Guided baking premixes", iconColor: "text-amber-500" },
      { label: "Dough Calculator", path: "/dough", icon: Calculator, ariaLabel: "Dough calculator", iconColor: "text-amber-600" },
    ],
  },
  {
    title: "Starter",
    items: [
      { label: "Feeding Log", path: "/feeding-log", icon: ClipboardList, ariaLabel: "Track starter feedings", iconColor: "text-emerald-500" },
      { label: "Health Check", path: "/starter", icon: FlaskConical, ariaLabel: "Check starter health", iconColor: "text-emerald-600" },
      { label: "Starter AI", path: "/starter-guide", icon: Bot, ariaLabel: "AI sourdough assistant", iconColor: "text-emerald-400" },
    ],
  },
  {
    title: "Community & Learning",
    items: [
      { label: "Community Feed", path: "/share", icon: ChefHat, ariaLabel: "Community bakes feed", iconColor: "text-rose-500" },
      { label: "Discover Bakers", path: "/discover", icon: Search, ariaLabel: "Discover new bakers", iconColor: "text-rose-400" },
      { label: "Connections", path: "/followers", icon: Users, ariaLabel: "Followers and following", iconColor: "text-rose-600" },
      { label: "Tutorials", path: "/tutorials", icon: GraduationCap, ariaLabel: "Browse baking tutorials", iconColor: "text-violet-500" },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Notifications", path: "/notifications", icon: Bell, ariaLabel: "View your notifications", iconColor: "text-orange-500" },
      { label: "Settings", path: "/settings", icon: Cog, ariaLabel: "Settings and admin", iconColor: "text-muted-foreground" },
      { label: "Contact Us", path: "/contact", icon: MessageSquare, ariaLabel: "Send feedback or get help", iconColor: "text-sky-500" },
    ],
  },
];

export const adminItems: NavItem[] = [
  { label: "Marketing & Customers", path: "/marketing", icon: Megaphone, ariaLabel: "Marketing and customer tools", iconColor: "text-pink-500" },
  { label: "Manage Tutorials", path: "/tutorials/manage", icon: BookOpen, ariaLabel: "Manage tutorials", iconColor: "text-pink-400" },
];

export const bottomNavItems = [
  { label: "Home", path: "/", icon: Home, ariaLabel: "Home" },
  { label: "Bakes", path: "/premixes", icon: Cookie, ariaLabel: "Guided bakes" },
  { label: "Feeding", path: "/feeding-log", icon: ClipboardList, ariaLabel: "Feeding log" },
  { label: "Community", path: "/share", icon: ChefHat, ariaLabel: "Community" },
];

export const desktopNav = [
  { label: "Home", path: "/", icon: Home, ariaLabel: "Home" },
  { label: "Bakes", path: "/premixes", icon: Cookie, ariaLabel: "Guided bakes" },
  { label: "Feeding", path: "/feeding-log", icon: ClipboardList, ariaLabel: "Feeding log" },
  { label: "Community", path: "/share", icon: ChefHat, ariaLabel: "Community" },
  { label: "Tutorials", path: "/tutorials", icon: GraduationCap, ariaLabel: "Tutorials" },
];
