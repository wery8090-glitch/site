import { AppShell, PageHeading } from "@/components/ChromaShell";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Activity, CreditCard, Monitor, RefreshCw, Search, ShieldCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";

function formatDate(value?: Date | string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" }) : "—";
}
function DashboardFrame({ children }: { children: React.ReactNode }) {
  return <AppShell><div className="container max-w-[1220px] py-8 sm:py-10">{children}</div></AppShell>;
}

type PageTitle = "Users" | "Devices" | "Payments" | "Audit logs";

export function AdminOperationsPage({ title }: { title: PageTitle }) {
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const users = trpc.admin.users.useQuery(undefined, { enabled: title === "Users" });
  const devices = trpc.admin.devices.useQuery(undefined, { enabled: title === "Devices" });
  const payments = trpc.admin.payments.useQuery(undefined, { enabled: title === "Payments" });
  const updateRole = trpc.admin.updateRole.useMutation({ onSuccess: () => void users.refetch() });
  const logs = trpc.admin.auditLogs.useQuery({ limit: 50, offset }, { enabled: title === "Audit logs" });
  const q = search.toLowerCase().trim();
  const filteredUsers = useMemo(() => (users.data ?? []).filter(row => `${row.name ?? ""} ${row.email ?? ""} ${row.username ?? ""}`.toLowerCase().includes(q)), [users.data, q]);
  const filteredDevices = useMemo(() => (devices.data ?? []).filter(row => `${row.device.name} ${row.user.email ?? ""} ${row.user.name ?? ""}`.toLowerCase().includes(q)), [devices.data, q]);
  const filteredPayments = useMemo(() => (payments.data ?? []).filter(row => `${row.payment.provider} ${row.payment.providerPaymentId ?? ""} ${row.user.email ?? ""}`.toLowerCase().includes(q)), [payments.data, q]);
  const filteredLogs = useMemo(() => (logs.data?.rows ?? []).filter(row => `${row.log.action} ${row.user?.email ?? ""} ${row.user?.name ?? ""} ${row.log.metadata ?? ""}`.toLowerCase().includes(q)), [logs.data, q]);
  const activeLoading = title === "Users" ? users.isLoading : title === "Devices" ? devices.isLoading : title === "Payments" ? payments.isLoading : logs.isLoading;
  const refresh = () => { if (title === "Users") void users.refetch(); else if (title === "Devices") void devices.refetch(); else if (title === "Payments") void payments.refetch(); else void logs.refetch(); };
  const icon = title === "Users" ? Users : title === "Devices" ? Monitor : title === "Payments" ? CreditCard : Activity;
  const Icon = icon;
  const heading = title === "Audit logs" ? "Журнал действий" : title === "Users" ? "Пользователи" : title === "Devices" ? "Устройства" : "Платежи";
  const description = title === "Users" ? "Аккаунты, роли и состояние доступа из основной базы." : title === "Devices" ? "Все привязки Loader и время последней активности." : title === "Payments" ? "Источники оплаты и связь платежа с выданной подпиской." : "Хронология входов, подписок, активаций, загрузок и админских действий.";
  const empty = title === "Users" ? !filteredUsers.length : title === "Devices" ? !filteredDevices.length : title === "Payments" ? !filteredPayments.length : !filteredLogs.length;
  return <DashboardFrame>
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><PageHeading eyebrow="Панель управления" title={heading} description={description} /><Button onClick={refresh} variant="outline" className="h-10 w-fit rounded-xl border-white/10 bg-transparent"><RefreshCw className="mr-2 h-4 w-4" />Обновить</Button></div>
    <div className="mt-8 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/[.04] p-4"><Icon className="h-5 w-5 text-primary" /><div className="text-xs text-muted-foreground">Данные загружаются через защищённые admin tRPC процедуры.</div></div>
    <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-3"><Search className="h-4 w-4 text-muted-foreground" /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Поиск по email, имени, действию…" className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>
    <div className="mt-5 overflow-x-auto surface"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-white/10 text-xs text-muted-foreground"><tr>{(title === "Users" ? ["Пользователь", "Email", "Роль", "Статус", "Регистрация", "Последний вход"] : title === "Devices" ? ["Устройство", "Пользователь", "Статус", "Добавлено", "Последняя активность"] : title === "Payments" ? ["Пользователь", "Провайдер", "Сумма", "Статус", "Подписка", "Дата"] : ["Время", "Действие", "Пользователь", "Детали"]).map(label => <th key={label} className="px-5 py-4 font-medium">{label}</th>)}</tr></thead><tbody>
      {activeLoading && <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">Загрузка…</td></tr>}
      {!activeLoading && title === "Users" && filteredUsers.map(row => <tr key={row.id} className="border-b border-white/5"><td className="px-5 py-4 font-semibold">{row.name || row.username || `User #${row.id}`}</td><td className="px-5 py-4 text-muted-foreground">{row.email || "—"}</td><td className="px-5 py-4 text-xs uppercase"><select value={row.role} onChange={event => updateRole.mutate({ openId: row.openId, role: event.target.value as "user" | "developer" | "admin" | "support" | "media" | "moderator" })} className="rounded-lg border border-white/10 bg-white/[.04] px-2 py-1 text-xs"><option value="user">user</option><option value="support">support</option><option value="media">media</option><option value="moderator">moderator</option><option value="admin">admin</option><option value="developer">developer</option></select></td><td className="px-5 py-4"><span className={row.status === "active" ? "text-primary" : "text-red-200"}>{row.status}</span></td><td className="px-5 py-4 text-muted-foreground">{formatDate(row.createdAt)}</td><td className="px-5 py-4 text-muted-foreground">{formatDate(row.lastLoginAt || row.lastSignedIn)}</td></tr>)}
      {!activeLoading && title === "Devices" && filteredDevices.map(row => <tr key={row.device.id} className="border-b border-white/5"><td className="px-5 py-4 font-semibold">{row.device.name}<div className="text-xs text-muted-foreground">#{row.device.id}</div></td><td className="px-5 py-4">{row.user.email || row.user.name || `User #${row.user.id}`}</td><td className="px-5 py-4 text-xs uppercase">{row.device.status}</td><td className="px-5 py-4 text-muted-foreground">{formatDate(row.device.createdAt)}</td><td className="px-5 py-4 text-muted-foreground">{formatDate(row.device.lastSeenAt)}</td></tr>)}
      {!activeLoading && title === "Payments" && filteredPayments.map(row => <tr key={row.payment.id} className="border-b border-white/5"><td className="px-5 py-4">{row.user.email || row.user.name || `User #${row.user.id}`}</td><td className="px-5 py-4">{row.payment.provider}<div className="text-xs text-muted-foreground">{row.payment.providerPaymentId || "без внешнего ID"}</div></td><td className="px-5 py-4 font-semibold">{(row.payment.amount / 100).toFixed(2)} {row.payment.currency}</td><td className="px-5 py-4 text-xs uppercase">{row.payment.status}</td><td className="px-5 py-4">#{row.payment.subscriptionId || "—"}</td><td className="px-5 py-4 text-muted-foreground">{formatDate(row.payment.createdAt)}</td></tr>)}
      {!activeLoading && title === "Audit logs" && filteredLogs.map(row => <tr key={row.log.id} className="border-b border-white/5"><td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">{formatDate(row.log.createdAt)}</td><td className="px-5 py-4 font-semibold"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-primary" />{row.log.action}</span></td><td className="px-5 py-4">{row.user?.email || row.user?.name || (row.log.userId ? `User #${row.log.userId}` : "System")}</td><td className="max-w-[420px] truncate px-5 py-4 text-xs text-muted-foreground" title={row.log.metadata || ""}>{row.log.metadata || "—"}</td></tr>)}
      {!activeLoading && empty && <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">Ничего не найдено.</td></tr>}
    </tbody></table></div>
    {title === "Audit logs" && <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>Показано {offset + 1}–{offset + filteredLogs.length} из {logs.data?.total ?? 0}</span><div className="flex gap-2"><Button variant="outline" disabled={offset === 0 || logs.isFetching} onClick={() => setOffset(value => Math.max(0, value - 50))}>Назад</Button><Button variant="outline" disabled={offset + 50 >= (logs.data?.total ?? 0) || logs.isFetching} onClick={() => setOffset(value => value + 50)}>Далее</Button></div></div>}
  </DashboardFrame>;
}
