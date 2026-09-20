import { AppShell, PageHeading } from "@/components/ChromaShell";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Activity, ChevronLeft, ChevronRight, RefreshCw, UserRound } from "lucide-react";
import { useState } from "react";

function formatDate(value?: Date | string | null) {
  return value ? new Date(value).toLocaleString("ru-RU", { dateStyle: "medium", timeStyle: "short" }) : "—";
}
function formatMetadata(value?: string | null) {
  if (!value) return "—";
  try { return JSON.stringify(JSON.parse(value), null, 2); } catch { return value; }
}

export default function AdminAuditPage() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 50;
  const actions = trpc.admin.auditActions.useQuery().data ?? [];
  const logs = trpc.admin.auditLogs.useQuery({ limit: pageSize, offset: page * pageSize, action: action || undefined });
  const total = logs.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return <AppShell><div className="container max-w-[1280px] py-8 sm:py-10">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
      <PageHeading eyebrow="Control room / Observability" title="Audit logs" description="Входы, подписки, устройства, скачивания и административные действия. Токены и пароли в журнал не записываются." />
      <Button onClick={() => logs.refetch()} variant="outline" className="h-10 w-fit rounded-xl border-white/10 bg-transparent text-muted-foreground"><RefreshCw className="mr-2 h-4 w-4" />Обновить</Button>
    </div>
    <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div className="surface p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Activity className="h-4 w-4 text-primary" />Всего событий</div><div className="mt-3 text-2xl font-semibold">{total}</div></div>
      {actions.slice(0, 3).map(item => <button key={item.action} onClick={() => { setAction(item.action); setPage(0); }} className={`surface p-4 text-left hover:border-primary/40 ${action === item.action ? "border-primary/50 bg-primary/[.05]" : ""}`}><div className="truncate text-xs text-muted-foreground">{item.action}</div><div className="mt-3 text-2xl font-semibold text-primary">{item.count}</div></button>)}
    </div>
    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[.025] p-4 sm:flex-row sm:items-center">
      <select value={action} onChange={event => { setAction(event.target.value); setPage(0); }} className="h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.04] px-3 text-sm text-foreground outline-none focus:border-primary/60"><option value="">Все действия</option>{actions.map(item => <option key={item.action} value={item.action}>{item.action} ({item.count})</option>)}</select>
      {action && <Button onClick={() => { setAction(""); setPage(0); }} variant="ghost" className="h-10 text-xs text-muted-foreground">Сбросить</Button>}
    </div>
    <div className="mt-5 overflow-x-auto rounded-2xl border border-white/10 bg-[#101611]/80"><table className="w-full min-w-[900px] text-left text-sm"><thead className="border-b border-white/10 bg-white/[.025] text-xs text-muted-foreground"><tr><th className="px-5 py-4 font-medium">Время</th><th className="px-5 py-4 font-medium">Действие</th><th className="px-5 py-4 font-medium">Пользователь</th><th className="px-5 py-4 font-medium">Детали</th></tr></thead><tbody>{logs.isLoading ? <tr><td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">Загрузка событий…</td></tr> : logs.isError ? <tr><td colSpan={4} className="px-5 py-12 text-center text-red-200">Не удалось загрузить журнал.</td></tr> : logs.data?.rows.length ? logs.data.rows.map(row => <tr key={row.log.id} className="border-b border-white/5 align-top hover:bg-primary/[.025]"><td className="whitespace-nowrap px-5 py-4 text-xs text-muted-foreground">{formatDate(row.log.createdAt)}</td><td className="px-5 py-4"><span className="inline-flex rounded-lg border border-primary/20 bg-primary/[.06] px-2.5 py-1 font-mono text-[10px] font-bold text-primary">{row.log.action}</span></td><td className="px-5 py-4"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-full bg-white/[.06] text-muted-foreground"><UserRound className="h-3.5 w-3.5" /></span><div><div className="font-medium">{row.user?.name || row.user?.username || row.user?.email || (row.log.userId ? `User #${row.log.userId}` : "System")}</div><div className="text-xs text-muted-foreground">{row.user?.email || "Без email"}</div></div></div></td><td className="max-w-[420px] px-5 py-4"><pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-muted-foreground">{formatMetadata(row.log.metadata)}</pre></td></tr>) : <tr><td colSpan={4} className="px-5 py-12 text-center text-muted-foreground">Событий нет.</td></tr>}</tbody></table></div>
    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>Страница {page + 1} из {totalPages} · {total} событий</span><div className="flex gap-2"><Button disabled={page === 0} onClick={() => setPage(value => Math.max(0, value - 1))} variant="outline" className="h-9 rounded-lg border-white/10 bg-transparent px-3"><ChevronLeft className="h-4 w-4" /></Button><Button disabled={page + 1 >= totalPages} onClick={() => setPage(value => Math.min(totalPages - 1, value + 1))} variant="outline" className="h-9 rounded-lg border-white/10 bg-transparent px-3"><ChevronRight className="h-4 w-4" /></Button></div></div>
  </div></AppShell>;
}

