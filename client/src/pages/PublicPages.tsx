import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Check, CircleCheck, Clock3, Download, ExternalLink, LockKeyhole, Server, ShieldCheck, Sparkles, Tag, Wrench } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { supabase, mapSupabaseError } from "@/lib/supabase";
import { completePasswordlessLink, firebaseAuth, firebaseConfigured, firebaseErrorMessage, googleProvider, sendPasswordlessLink } from "@/lib/firebase";
import { useAuth } from "@/_core/hooks/useAuth";
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup, updateProfile } from "firebase/auth";
import { Footer, PageHeading, PublicHeader } from "@/components/ChromaShell";
import { PurchaseDialog } from "@/components/PurchaseDialog";
import { CHROMA_FEATURES, FEATURE_GROUPS, FEATURE_POLICY } from "@shared/featureCatalog";
import { PURCHASE_OFFERS } from "@shared/purchase";

export function PublicPage({ children, eyebrow, title, description }: { children: React.ReactNode; eyebrow: string; title: string; description: string }) {
  return <div className="min-h-screen bg-background"><PublicHeader /><main className="container py-16 sm:py-24"><PageHeading eyebrow={eyebrow} title={title} description={description} /><div className="mt-12">{children}</div></main><Footer /></div>;
}

export function FeaturesPage() {
  const items = [[Sparkles, "Visual system", "A deliberate dark interface, soft motion, and lime used only where it matters."], [Server, "Loader-ready architecture", "The website is the control plane. A Windows Loader can talk to a dedicated API without database access."], [ShieldCheck, "Device identity", "Ed25519 device identity keeps private keys local and lets the server remain the source of truth."], [Wrench, "Built for iteration", "Plans, client versions, devices, downloads, and audit logs have distinct data boundaries."], [LockKeyhole, "Protected surfaces", "Account and admin routes are guarded server-side, not by client-side role labels."], [Clock3, "Short-lived access", "Loader sessions are designed to expire and require re-authentication instead of becoming permanent keys."]];
  return <PublicPage eyebrow="What is inside" title="A visual client with a serious foundation." description="Explore safe visual, HUD, accessibility, profile, and performance controls. Gameplay automation and unfair-advantage features are intentionally excluded."><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{items.map(([Icon, title, text]) => <div key={title as string} className="surface p-6"><div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><h3 className="mt-6 text-lg font-semibold">{title as string}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text as string}</p></div>)}</div><div className="mt-12 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[.045] p-5 text-sm text-muted-foreground"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><strong className="text-foreground">{CHROMA_FEATURES.length}+ safe controls.</strong> {FEATURE_POLICY}</span></div><div className="mt-8 grid gap-5 lg:grid-cols-5">{FEATURE_GROUPS.map(group => <section key={group} className="surface p-5"><div className="eyebrow">{group}</div><div className="mt-4 grid gap-2">{CHROMA_FEATURES.filter(feature => feature.group === group).map(feature => <div key={feature.id} className="rounded-lg border border-white/10 bg-white/[.025] px-3 py-2 text-xs"><div className="font-semibold">{feature.name}</div><div className="mt-1 text-muted-foreground">{feature.description}</div></div>)}</div></section>)}</div></PublicPage>;
}

export function PricingPage() {
  const { data: plans = [], isLoading } = trpc.plans.list.useQuery();
  return <PublicPage eyebrow="Access" title="Choose the access that fits your setup." description="Compare Chroma plans, then complete your purchase through FunPay or Telegram. Chroma does not process or simulate payments on this site."><div className="grid gap-5 lg:grid-cols-4">{isLoading ? [1,2,3,4].map(i => <div key={i} className="h-80 animate-pulse rounded-2xl bg-white/[.04]" />) : <><div className="surface flex flex-col p-6"><div className="text-xs font-bold uppercase tracking-[.18em] text-muted-foreground">FREE</div><div className="mt-5 text-4xl font-semibold">0 ₽</div><p className="mt-3 text-sm leading-6 text-muted-foreground">Basic access after registration.</p><div className="mt-6 grid flex-1 gap-3 text-sm">{["Basic features", "Access after registration", "Client download access"].map(item => <div key={item} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-primary" />{item}</div>)}</div><Link href="/register" className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-xl bg-white/10 font-bold hover:bg-white/15">Register free <ArrowRight className="ml-2 h-4 w-4" /></Link></div>{plans.filter(plan => plan.slug !== "free").map((plan, index) => { const purchasePlan = plan.slug === "premium_beta" ? "premium_beta" : plan.slug === "premium" ? "premium" : "base"; const firstOffer = PURCHASE_OFFERS.find(offer => offer.plan === purchasePlan && offer.duration === "month"); return <div key={plan.id} className={`surface flex flex-col p-6 ${index === 1 ? "border-primary/50 bg-primary/[.035]" : ""}`}><div className="flex items-center justify-between"><div className="text-xs font-bold uppercase tracking-[.18em] text-muted-foreground">{plan.slug === "premium_beta" ? "PREMIUM + BETA" : plan.name}</div>{index === 0 && <span className="rounded-full bg-primary px-2 py-1 text-[9px] font-bold text-[#10150c]">POPULAR</span>}</div><div className="mt-5 text-2xl font-semibold">{firstOffer?.price === null ? "Цена уточняется" : `${firstOffer?.price ?? "—"} ₽`}<span className="ml-1 text-sm font-normal text-muted-foreground">/ 1 month</span></div><p className="mt-3 min-h-12 text-sm leading-6 text-muted-foreground">{plan.slug === "premium_beta" ? "Early access to updates and new features." : plan.description}</p><div className="mt-6 grid flex-1 gap-3">{(plan.slug === "premium_beta" ? ["Early access to updates", "New features first", "Expanded support"] : JSON.parse(plan.features || "[]")).map((item: string) => <div key={item} className="flex gap-2 text-sm"><Check className="h-4 w-4 shrink-0 text-primary" />{item}</div>)}</div><PurchaseDialog initialPlan={purchasePlan as "base" | "premium" | "premium_beta"} triggerLabel="Buy" triggerClassName="mt-7 h-11 w-full rounded-xl bg-primary font-bold text-[#10150c] hover:bg-[#d0ff73]" /></div>; })}</>}</div><div className="mt-8 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[.045] p-5 text-sm text-muted-foreground"><Tag className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span><strong className="text-foreground">Have a promo code?</strong> After purchase, tell the seller: “I’m from [PROMO CODE]”. Promo codes are used only to identify the purchase source.</span></div></PublicPage>;
}
export function DownloadPage() { return <PublicPage eyebrow="Get Chroma" title="Download the Loader when your account is ready." description="Closed client files should be delivered through a short-lived, server-authorized URL after user, device, subscription, and version checks."><div className="grid gap-5 md:grid-cols-[1.15fr_.85fr]"><div className="glass rounded-2xl p-7"><div className="flex items-start justify-between gap-5"><div><div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Download className="h-5 w-5" /></div><h2 className="mt-6 text-2xl font-semibold">Chroma Loader</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Windows Loader distribution is protected by account and device authorization. Public file URLs are not exposed for closed builds.</p></div><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground">Windows</span></div><div className="mt-8 grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><div className="text-xs text-muted-foreground">Release</div><div className="mt-1 text-sm font-semibold">Server-managed</div></div><div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><div className="text-xs text-muted-foreground">Delivery</div><div className="mt-1 text-sm font-semibold">Signed URL</div></div><div className="rounded-xl border border-white/10 bg-white/[.03] p-4"><div className="text-xs text-muted-foreground">Access</div><div className="mt-1 text-sm font-semibold">Protected</div></div></div><Link href="/login" className="mt-8 inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-[#10150c] hover:bg-[#d0ff73]">Sign in to download <ArrowRight className="h-4 w-4" /></Link></div><div className="surface p-7"><div className="eyebrow">How it works</div><div className="mt-5 grid gap-5">{[["01", "Sign in", "Open your Chroma account."], ["02", "Bind a device", "Confirm the Loader from Devices."], ["03", "Verify access", "The server checks subscription and device status."], ["04", "Download", "Receive a time-limited authorized URL."]].map(item => <div key={item[0]} className="flex gap-4"><span className="text-xs font-bold text-primary">{item[0]}</span><div><div className="text-sm font-semibold">{item[1]}</div><div className="mt-1 text-xs leading-5 text-muted-foreground">{item[2]}</div></div></div>)}</div></div></div></PublicPage>; }

export function StatusPage() { return <PublicPage eyebrow="Service health" title="Everything important, visible." description="A simple status surface for the website, account, API, and future Loader services."><div className="grid gap-3">{[["Website", "Operational"], ["Account & OAuth", "Operational"], ["Database", "Operational"], ["Loader API", "Beta"]].map(([name, status], index) => <div key={name} className="surface flex items-center justify-between p-5"><div className="flex items-center gap-3"><span className={`h-2.5 w-2.5 rounded-full ${index === 3 ? "bg-amber-300" : "bg-primary"}`} /><span className="text-sm font-medium">{name}</span></div><span className={`text-xs ${index === 3 ? "text-amber-200" : "text-primary"}`}>{status}</span></div>)}</div></PublicPage>; }

export function LoaderHandoffPage() {
  const { firebaseUser, loading, isAuthenticated } = useAuth();
  const [status, setStatus] = useState("Проверяем аккаунт…");
  const [error, setError] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const port = params.get("port");
    const state = params.get("state");
    if (!port || !state) { setError("Некорректная ссылка Loader."); return; }
    if (loading) return;
    if (!isAuthenticated || !firebaseUser) { setStatus("Войдите в аккаунт, чтобы открыть Loader."); return; }
    let cancelled = false;
    void (async () => {
      try {
        setStatus("Передаём безопасную сессию в Loader…");
        const idToken = await firebaseUser.getIdToken(true);
        const hosts = ["localhost", "127.0.0.1"];
        let delivered = false;
        for (const host of hosts) {
          try { await fetch(`http://${host}:${encodeURIComponent(port)}/google-callback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, state, uid: firebaseUser.uid, email: firebaseUser.email ?? "", displayName: firebaseUser.displayName ?? "", idToken }) }); delivered = true; break; } catch { /* try the other loopback address */ }
        }
        if (!delivered) throw new Error("Loader не принимает callback. Запустите Loader заново.");
        if (!cancelled) setStatus("Готово. Вернитесь в окно CHROMA Loader.");
      } catch (reason) { if (!cancelled) { setError(reason instanceof Error ? reason.message : "Не удалось передать сессию."); setStatus(""); } }
    })();
    return () => { cancelled = true; };
  }, [firebaseUser, isAuthenticated, loading]);
  const next = `/loader-handoff${window.location.search}`;
  return <PublicPage eyebrow="CHROMA Loader" title="Открытие Loader" description="Эта страница передаёт только короткоживущий Firebase ID token через локальный защищённый callback. Пароль и токены не помещаются в URL."><div className="surface mx-auto max-w-lg p-7 text-center"><p className="text-sm text-muted-foreground">{status}</p>{error && <p className="mt-4 rounded-xl border border-red-300/20 bg-red-300/[.06] p-3 text-sm text-red-100">{error}</p>}{!loading && !isAuthenticated && <div className="mt-6 flex justify-center gap-3"><Link href={`/login?next=${encodeURIComponent(next)}`} className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-bold text-[#10150c]">Войти</Link><Link href={`/register?next=${encodeURIComponent(next)}`} className="inline-flex h-10 items-center rounded-xl border border-white/10 px-4 text-sm font-semibold">Регистрация</Link></div>}</div></PublicPage>;
}

export function LegalPage({ type }: { type: "terms" | "privacy" }) { const privacy = type === "privacy"; return <PublicPage eyebrow={privacy ? "Legal / Privacy" : "Legal / Terms"} title={privacy ? "Privacy, by design." : "Terms of use."} description={privacy ? "A concise placeholder policy surface for the product foundation. Replace with reviewed legal copy before launch." : "A concise placeholder terms surface for the product foundation. Replace with reviewed legal copy before launch."}><div className="prose prose-invert max-w-3xl prose-headings:tracking-tight prose-p:text-muted-foreground"><h2>{privacy ? "Data we need" : "Using Chroma"}</h2><p>{privacy ? "Chroma should collect only the account, device, subscription, and operational data needed to provide the service. Device binding stores a public key; the private key remains on the Loader device." : "Use the service lawfully and keep your account credentials secure. Access to closed client files is personal and may be revoked when a device or subscription is disabled."}</p><h2>{privacy ? "Security posture" : "Availability"}</h2><p>{privacy ? "Passwords and secrets must not be stored in plaintext. Audit records should avoid tokens and sensitive secrets. Production traffic should use HTTPS and secure cookies." : "The website and future Loader API may change while the product is being developed. Any payment provider terms must be shown at checkout once live billing is enabled."}</p><h2>Contact</h2><p>For launch-ready legal text, replace this draft with reviewed policy content and the correct operator contact details.</p></div></PublicPage>; }

function withAuthTimeout<T>(promise: Promise<T>, timeoutMs = 15000) {
  return Promise.race([promise, new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error("Запрос авторизации не ответил вовремя.")), timeoutMs))]);
}

function AuthCard({ mode }: { mode: "login" | "register" | "forgot" | "passwordless" }) {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const syncProfile = trpc.auth.syncProfile.useMutation();
  const title = mode === "login" ? "С возвращением." : mode === "register" ? "Создать аккаунт." : mode === "passwordless" ? "Войти без пароля." : "Восстановить доступ.";
  const finishAuth = async (next = "/dashboard", forceRefresh = false) => {
    if (firebaseConfigured && firebaseAuth?.currentUser) {
      // Firebase may publish auth state before the first ID token is available to the tRPC header.
      // Wait for a fresh token before the protected profile sync, otherwise registration can
      // briefly reach Dashboard and then be redirected after the first protected query fails.
      await withAuthTimeout(firebaseAuth.currentUser.getIdToken(forceRefresh));
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try { await withAuthTimeout(syncProfile.mutateAsync()); lastError = undefined; break; }
        catch (error) { lastError = error; if (attempt === 0) await new Promise(resolve => window.setTimeout(resolve, 350)); }
      }
      if (lastError) throw lastError;
    }
    navigate(next);
  };
  useEffect(() => { if (mode !== "passwordless" || !firebaseConfigured || !firebaseAuth) return; withAuthTimeout(completePasswordlessLink()).then(credential => { if (credential) void withAuthTimeout(finishAuth()); }).catch(error => setError(error instanceof Error && error.message ? error.message : firebaseErrorMessage(error && typeof error === "object" && "code" in error ? String(error.code) : ""))); }, [mode]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    try {
      if (mode === "passwordless") {
        if (!firebaseConfigured) throw new Error("Passwordless вход доступен после настройки Firebase.");
        await withAuthTimeout(sendPasswordlessLink(email)); setMessage("Ссылка для входа отправлена на email. Откройте её на этом устройстве.");
      } else if (mode === "forgot") {
        if (firebaseConfigured && firebaseAuth) await withAuthTimeout(sendPasswordResetEmail(firebaseAuth, email, { url: `${window.location.origin}/login` }));
        else { const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` }); if (resetError) throw resetError; }
        setMessage("Если аккаунт существует, письмо для восстановления уже отправлено.");
      } else if (mode === "register") {
        if (password !== confirmPassword) throw new Error("Пароли не совпадают.");
        if (firebaseConfigured && firebaseAuth) { const credential = await withAuthTimeout(createUserWithEmailAndPassword(firebaseAuth, email, password)); await withAuthTimeout(updateProfile(credential.user, { displayName: username || email.split("@")[0] })); const next = new URLSearchParams(window.location.search).get("next") || "/dashboard"; await withAuthTimeout(finishAuth(next, true)); }
        else { const response = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, email, password }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.message || "Не удалось создать аккаунт."); if (payload.access_token) { await supabase.auth.setSession({ access_token: payload.access_token, refresh_token: payload.refresh_token || "" }); navigate("/dashboard"); } else setMessage("Аккаунт создан. Теперь войдите с email и паролем."); }
      } else {
        if (firebaseConfigured && firebaseAuth) await withAuthTimeout(signInWithEmailAndPassword(firebaseAuth, email, password));
        else { const { error: loginError } = await supabase.auth.signInWithPassword({ email, password }); if (loginError) throw loginError; }
        const next = new URLSearchParams(window.location.search).get("next") || "/dashboard";
        await withAuthTimeout(finishAuth(next));
      }
    } catch (authError) { const code = authError && typeof authError === "object" && "code" in authError ? String(authError.code) : ""; setError(authError instanceof Error && !code ? authError.message : firebaseConfigured ? firebaseErrorMessage(code) : mapSupabaseError(authError instanceof Error ? authError.message : "")); } finally { setBusy(false); }
  };
  const googleLogin = async () => { if (!firebaseConfigured || !firebaseAuth) return; setBusy(true); setError(""); try { await withAuthTimeout(signInWithPopup(firebaseAuth, googleProvider)); const next = new URLSearchParams(window.location.search).get("next") || "/dashboard"; await withAuthTimeout(finishAuth(next)); } catch (authError) { const code = authError && typeof authError === "object" && "code" in authError ? String(authError.code) : ""; setError(firebaseErrorMessage(code)); } finally { setBusy(false); } };
  return <div className="min-h-screen bg-background"><PublicHeader /><div className="container flex min-h-[calc(100vh-74px)] items-center justify-center py-16"><form onSubmit={submit} className="glass w-full max-w-md rounded-3xl p-8 sm:p-10"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary text-[#10150c]"><Sparkles className="h-6 w-6" /></div><h1 className="mt-7 text-center text-3xl font-semibold tracking-[-.04em]">{title}</h1><p className="mt-3 text-center text-sm leading-6 text-muted-foreground">Firebase account для сайта и будущего Loader.</p>{mode === "register" && <label className="mt-7 block text-xs font-semibold text-muted-foreground">ИМЯ<input required value={username} onChange={e => setUsername(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 text-sm outline-none focus:border-primary/60" /></label>}<label className="mt-7 block text-xs font-semibold text-muted-foreground">EMAIL<input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 text-sm outline-none focus:border-primary/60" /></label>{mode !== "forgot" && mode !== "passwordless" && <><label className="mt-4 block text-xs font-semibold text-muted-foreground">ПАРОЛЬ<input required minLength={6} type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-sm outline-none focus:border-primary/60" /></label>{mode === "register" && <label className="mt-4 block text-xs font-semibold text-muted-foreground">ПОВТОРИТЕ ПАРОЛЬ<input required minLength={6} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-sm outline-none focus:border-primary/60" /></label>}</>}{(error || message) && <div className={`mt-4 rounded-xl border p-3 text-sm ${error ? "border-red-300/20 bg-red-300/[.06] text-red-100" : "border-primary/20 bg-primary/[.06] text-primary"}`}>{error || message}</div>}{(mode === "login" || mode === "register") && firebaseConfigured && <button type="button" onClick={googleLogin} disabled={busy} className="mt-7 inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/10 bg-white/[.04] font-semibold hover:bg-white/[.08]">Продолжить с Google</button>}<button disabled={busy} className="mt-3 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary font-bold text-[#10150c] transition hover:bg-[#d0ff73] disabled:cursor-wait disabled:opacity-60">{busy ? "Подождите…" : mode === "login" ? "ВОЙТИ  →" : mode === "register" ? "СОЗДАТЬ АККАУНТ  →" : mode === "passwordless" ? "ОТПРАВИТЬ ССЫЛКУ  →" : "ОТПРАВИТЬ ПИСЬМО  →"}</button><div className="mt-5 flex flex-wrap justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground">{mode === "login" && <Link href="/passwordless" className="text-primary hover:underline">Войти без пароля</Link>}{mode === "login" && <Link href="/register" className="text-primary hover:underline">Создать аккаунт</Link>}{mode === "login" && <Link href="/forgot-password" className="hover:text-foreground">Забыли пароль?</Link>}{mode === "passwordless" && <Link href="/login" className="text-primary hover:underline">Войти с паролем</Link>}{mode === "register" && <Link href="/login" className="text-primary hover:underline">Уже есть аккаунт?</Link>}{mode === "forgot" && <Link href="/login" className="text-primary hover:underline">Войти</Link>}</div></form></div></div>;
}
export function LoginPage() { return <AuthCard mode="login" />; }
export function RegisterPage() { return <AuthCard mode="register" />; }
export function ForgotPasswordPage() { return <AuthCard mode="forgot" />; }
export function PasswordlessPage() { return <AuthCard mode="passwordless" />; }
