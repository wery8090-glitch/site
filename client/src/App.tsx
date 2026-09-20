import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { useAuth } from "@/_core/hooks/useAuth";
import Home from "@/pages/Home";
import { AdminPage, AdminSubpage, DashboardPage, DevicesPage, DownloadsPage, SecurityPage, SettingsPage, SubscriptionPage } from "@/pages/DashboardPages";
import { FeaturesPage, ForgotPasswordPage, LegalPage, LoginPage, PasswordlessPage, PricingPage, RegisterPage, ResetPasswordPage, StatusPage, DownloadPage } from "@/pages/PublicPages";
import { AdminSubscriptionsPage } from "@/pages/AdminSubscriptionsPage";
import { AdminClientPage } from "@/pages/AdminClientPage";
import { Route, Switch } from "wouter";

function Protected({ children }: { children: React.ReactNode }) {
  const { loading, isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  if (loading) return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">Проверяем сессию…</div>;
  return isAuthenticated ? <>{children}</> : null;
}
function ProtectedPage({ component: Component }: { component: React.ComponentType }) { return <Protected><Component /></Protected>; }

function Router() {
  return <Switch>
    <Route path="/" component={Home} /><Route path="/features" component={FeaturesPage} /><Route path="/pricing" component={PricingPage} /><Route path="/download" component={DownloadPage} /><Route path="/status" component={StatusPage} /><Route path="/login" component={LoginPage} /><Route path="/register" component={RegisterPage} /><Route path="/forgot-password" component={ForgotPasswordPage} /><Route path="/reset-password" component={ResetPasswordPage} /><Route path="/passwordless" component={PasswordlessPage} />
    <Route path="/terms"><LegalPage type="terms" /></Route><Route path="/privacy"><LegalPage type="privacy" /></Route>
    <Route path="/dashboard"><ProtectedPage component={DashboardPage} /></Route><Route path="/dashboard/profile"><ProtectedPage component={SettingsPage} /></Route><Route path="/dashboard/subscription"><ProtectedPage component={SubscriptionPage} /></Route><Route path="/dashboard/devices"><ProtectedPage component={DevicesPage} /></Route><Route path="/dashboard/devices/link"><ProtectedPage component={DevicesPage} /></Route><Route path="/dashboard/downloads"><ProtectedPage component={DownloadsPage} /></Route><Route path="/dashboard/security"><ProtectedPage component={SecurityPage} /></Route><Route path="/dashboard/settings"><ProtectedPage component={SettingsPage} /></Route>
    <Route path="/admin"><ProtectedPage component={AdminPage} /></Route><Route path="/admin/subscriptions"><ProtectedPage component={AdminSubscriptionsPage} /></Route><Route path="/admin/users"><ProtectedPage component={() => <AdminSubpage title="Users" />} /></Route><Route path="/admin/devices"><ProtectedPage component={() => <AdminSubpage title="Devices" />} /></Route><Route path="/admin/payments"><ProtectedPage component={() => <AdminSubpage title="Payments" />} /></Route><Route path="/admin/licenses"><ProtectedPage component={() => <AdminSubpage title="Licenses" />} /></Route><Route path="/admin/client"><ProtectedPage component={AdminClientPage} /></Route><Route path="/admin/logs"><ProtectedPage component={() => <AdminSubpage title="Audit logs" />} /></Route><Route path="/admin/settings"><ProtectedPage component={() => <AdminSubpage title="Project settings" />} /></Route>
    <Route><Home /></Route>
  </Switch>;
}
export default function App() { return <ErrorBoundary><LanguageProvider defaultLanguage="ru"><ThemeProvider defaultTheme="dark"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></LanguageProvider></ErrorBoundary>; }
