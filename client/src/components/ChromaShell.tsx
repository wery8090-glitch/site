import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { uiText, useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowUpRight,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  Download,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Settings,
  Shield,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export function ChromaMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="focus-ring inline-flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-[#10150c] shadow-[0_0_22px_rgba(184,246,65,.22)]">
        <Sparkles className="h-4.5 w-4.5" strokeWidth={2.5} />
      </span>
      {!compact && <span className="text-sm font-bold tracking-[.22em]">CHROMA</span>}
    </Link>
  );
}

const publicLinks = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/download", label: "Download" },
  { href: "/status", label: "Status" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { language } = useLanguage();
  const localizedPublicLinks = publicLinks.map(link => ({ ...link, label: link.href === "/features" ? (language === "ru" ? "Возможности" : "Features") : link.href === "/pricing" ? (language === "ru" ? "Тарифы" : "Pricing") : link.href === "/download" ? (language === "ru" ? "Скачать" : "Download") : (language === "ru" ? "Статус" : "Status") }));
  return (
    <header className="relative z-40 border-b border-white/[.07] bg-[#0a0c0b]/75 backdrop-blur-xl">
      <div className="container flex h-[74px] items-center justify-between">
        <ChromaMark />
        <nav className="hidden items-center gap-7 md:flex">
          {localizedPublicLinks.map(link => <Link key={link.href} href={link.href} className="focus-ring text-sm text-muted-foreground hover:text-foreground">{link.label}</Link>)}
          <a href="https://t.me/ChromaVisual" target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">Telegram <ArrowUpRight className="h-3.5 w-3.5" /></a>
        </nav>
        <div className="hidden items-center gap-3 sm:flex">
          {user ? <Link href="/dashboard" className="focus-ring inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-sm font-semibold hover:border-primary/40 hover:bg-white/[.04]">{language === "ru" ? "Кабинет" : "Dashboard"} <ArrowUpRight className="h-4 w-4 text-primary" /></Link> : <><Link href="/login" className="focus-ring px-3 text-sm text-muted-foreground hover:text-foreground">{language === "ru" ? "Войти" : "Sign in"}</Link><Button onClick={() => startLogin()} className="h-10 rounded-xl bg-primary px-4 text-sm font-bold text-[#10150c] hover:bg-[#c8ff55]">{language === "ru" ? "Начать" : "Get started"}</Button></>}
        </div>
        <button className="rounded-lg p-2 text-muted-foreground hover:bg-white/5 md:hidden" onClick={() => setOpen(value => !value)} aria-label="Open menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && <div className="container border-t border-white/[.07] py-4 md:hidden"><nav className="grid gap-2">{localizedPublicLinks.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-white/5 hover:text-foreground">{link.label}</Link>)}<a href="https://t.me/ChromaVisual" target="_blank" rel="noreferrer" className="rounded-lg px-3 py-2 text-sm text-primary hover:bg-primary/10">Telegram / ChromaVisual</a><Link href={user ? "/dashboard" : "/login"} className="mt-2 rounded-lg bg-primary px-3 py-2 text-center text-sm font-bold text-[#10150c]">{user ? (language === "ru" ? "Открыть кабинет" : "Open dashboard") : (language === "ru" ? "Войти" : "Sign in")}</Link></nav></div>}
    </header>
  );
}

const appLinks = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
  { href: "/dashboard/devices", label: "Devices", icon: Monitor },
  { href: "/dashboard/downloads", label: "Downloads", icon: Download },
  { href: "/dashboard/security", label: "Security", icon: Shield },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth({ redirectOnUnauthenticated: true, redirectPath: "/login" });
  const { language } = useLanguage();
  const t = uiText[language];
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user?.name || user?.email?.split("@")[0] || "Chroma user";
  const initials = displayName.slice(0, 2).toUpperCase();
  const localizedAppLinks = appLinks.map(item => ({ ...item, label: item.href === "/dashboard" ? t.overview : item.href.includes("subscription") ? t.subscription : item.href.includes("devices") ? t.devices : item.href.includes("downloads") ? t.downloads : item.href.includes("security") ? t.security : t.settings }));
  if (!user) return <div className="grid min-h-screen place-items-center bg-background"><div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  return (
    <div className="min-h-screen bg-[#0a0c0b]">
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[266px] flex-col border-r border-white/[.07] bg-[#0e1210] px-4 py-5 transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2"><ChromaMark /><button className="rounded-lg p-1 text-muted-foreground lg:hidden" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button></div>
        <div className="mt-10 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground/70">{t.workspace}</div>
        <nav className="mt-3 grid gap-1">{localizedAppLinks.map(item => { const active = location === item.href; const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`focus-ring group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-primary text-[#10150c] shadow-[0_8px_28px_rgba(184,246,65,.12)]" : "text-muted-foreground hover:bg-white/[.045] hover:text-foreground"}`}><Icon className="h-4 w-4" /><span>{item.label}</span>{active && <ChevronRight className="ml-auto h-4 w-4" />}</Link>})}</nav>
        {user.role === "admin" && <><div className="mt-8 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-muted-foreground/70">{t.controlRoom}</div><Link href="/admin" className={`mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${location.startsWith("/admin") ? "bg-white/[.08] text-primary" : "text-muted-foreground hover:bg-white/[.045] hover:text-foreground"}`}><Activity className="h-4 w-4" />{t.admin}</Link></>}
        <div className="mt-auto border-t border-white/[.07] pt-4"><div className="flex items-center gap-3 rounded-xl bg-white/[.035] px-3 py-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">{initials}</div><div className="min-w-0"><p className="truncate text-sm font-semibold">{displayName}</p><p className="truncate text-xs text-muted-foreground">{user.role}</p></div><button onClick={() => logout()} className="ml-auto rounded-lg p-1.5 text-muted-foreground hover:bg-white/10 hover:text-foreground" aria-label="Log out"><LogOut className="h-4 w-4" /></button></div></div>
      </aside>
      {mobileOpen && <button className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <main className="lg:pl-[266px]"><div className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[.07] bg-[#0a0c0b]/80 px-5 backdrop-blur-xl lg:hidden"><button onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-white/5"><Menu className="h-5 w-5" /></button><ChromaMark compact /><div className="w-9" /></div>{children}</main>
    </div>
  );
}

export function Footer() {
  return <footer className="border-t border-white/[.07] py-8"><div className="container flex flex-col items-center justify-between gap-4 text-xs text-muted-foreground sm:flex-row"><div className="flex items-center gap-2"><ChromaMark compact /><span>© {new Date().getFullYear()} Chroma Client</span></div><div className="flex gap-5"><Link href="/terms" className="hover:text-foreground">Terms</Link><Link href="/privacy" className="hover:text-foreground">Privacy</Link><Link href="/status" className="hover:text-foreground">Status</Link></div></div></footer>;
}

export function PageHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <div className="max-w-3xl"><div className="eyebrow">{eyebrow || "Chroma Client"}</div><h1 className="mt-3 text-3xl font-semibold tracking-[-.04em] text-foreground sm:text-4xl">{title}</h1>{description && <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{description}</p>}</div>;
}

export function SectionLink({ href, children }: { href: string; children: React.ReactNode }) { return <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-[#d0ff73]">{children}<ArrowUpRight className="h-4 w-4" /></Link>; }
export function UserIcon() { return <CircleUserRound className="h-4 w-4" />; }
export function ProfileIcon() { return <UserRound className="h-4 w-4" />; }
