import { AppShell, PageHeading } from "@/components/ChromaShell";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { MessageCircle, Send, Ticket, X } from "lucide-react";
import { useState } from "react";

const categories = [
  ["subscription", "Проблема с подпиской"],
  ["bug", "Баг сайта"],
  ["account", "Проблема с аккаунтом"],
  ["loader", "Проблема с Loader"],
  ["other", "Другой вопрос"],
] as const;

function TicketThread({ ticketId, staff = false }: { ticketId: number; staff?: boolean }) {
  const { data, refetch } = trpc.support.get.useQuery({ ticketId });
  const [body, setBody] = useState("");
  const reply = trpc.support.reply.useMutation({ onSuccess: () => { setBody(""); void refetch(); } });
  if (!data) return <div className="surface p-6 text-sm text-muted-foreground">Загрузка тикета…</div>;
  return <div className="surface flex min-h-[520px] flex-col p-5">
    <div className="flex items-start justify-between border-b border-white/10 pb-4"><div><div className="eyebrow">#{data.ticket.id} · {data.ticket.category}</div><h2 className="mt-2 text-lg font-semibold">{data.ticket.subject}</h2></div><span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[.15em] text-primary">{data.ticket.status}</span></div>
    <div className="grid flex-1 content-start gap-3 overflow-auto py-5">{data.messages.map(row => { const fromUser = row.message.authorOpenId === data.ticket.userOpenId; return <div key={row.message.id} className={`max-w-[85%] rounded-2xl border p-3 text-sm ${fromUser ? "border-white/10 bg-white/[.035]" : "ml-auto border-primary/20 bg-primary/[.07]"}`}><div className="mb-1 text-[10px] text-muted-foreground">{row.author.name || row.author.username || row.author.email || (fromUser ? "Пользователь" : "Support")}</div><div className="whitespace-pre-wrap leading-6">{row.message.body}</div></div>; })}</div>
    <div className="flex gap-2 border-t border-white/10 pt-4"><textarea value={body} onChange={event => setBody(event.target.value)} placeholder={staff ? "Ответить пользователю…" : "Ваш ответ…"} className="min-h-12 flex-1 resize-none rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-sm outline-none focus:border-primary/60" /><Button disabled={!body.trim() || reply.isPending} onClick={() => reply.mutate({ ticketId, body })} className="self-end rounded-xl bg-primary text-[#10150c]"><Send className="mr-2 h-4 w-4" />Отправить</Button></div>
  </div>;
}

export function SupportPage() {
  const tickets = trpc.support.list.useQuery();
  const [selected, setSelected] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<typeof categories[number][0]>("subscription");
  const create = trpc.support.create.useMutation({ onSuccess: result => { setSubject(""); setBody(""); setSelected(result.id); void tickets.refetch(); } });
  return <AppShell><div className="container max-w-[1220px] py-8 sm:py-10"><PageHeading eyebrow="Support" title="Поддержка" description="Создайте тикет, выберите тему и продолжите диалог с командой CHROMA." /><div className="mt-8 grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
    <section className="surface p-5"><div className="flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" /><h2 className="font-semibold">Мои обращения</h2></div><div className="mt-4 grid gap-2">{tickets.data?.map(ticket => <button key={ticket.id} onClick={() => setSelected(ticket.id)} className={`rounded-xl border p-4 text-left ${selected === ticket.id ? "border-primary/45 bg-primary/[.06]" : "border-white/10 bg-white/[.025]"}`}><div className="flex justify-between gap-3 text-sm font-semibold"><span className="truncate">#{ticket.id} · {ticket.subject}</span><span className="text-[10px] uppercase text-primary">{ticket.status}</span></div><div className="mt-2 text-xs text-muted-foreground">{ticket.category} · обновлено {new Date(ticket.updatedAt).toLocaleString("ru-RU")}</div></button>)}{!tickets.data?.length && <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">Обращений пока нет.</div>}</div></section>
    {selected ? <TicketThread ticketId={selected} /> : <section className="glass p-5"><div className="eyebrow">New ticket</div><h2 className="mt-2 text-xl font-semibold">Опишите проблему</h2><div className="mt-5 grid gap-3"><select value={category} onChange={event => setCategory(event.target.value as typeof category)} className="h-11 rounded-xl border border-white/10 bg-white/[.04] px-3 text-sm"><option value="subscription">Проблема с подпиской</option><option value="bug">Баг сайта</option><option value="account">Проблема с аккаунтом</option><option value="loader">Проблема с Loader</option><option value="other">Другой вопрос</option></select><input value={subject} onChange={event => setSubject(event.target.value)} placeholder="Короткая тема" className="h-11 rounded-xl border border-white/10 bg-white/[.04] px-3 text-sm outline-none focus:border-primary/60" /><textarea value={body} onChange={event => setBody(event.target.value)} placeholder="Что произошло? Добавьте текст ошибки, если он есть." className="min-h-40 rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-sm outline-none focus:border-primary/60" /><Button disabled={create.isPending || !subject.trim() || !body.trim()} onClick={() => create.mutate({ subject, body, category })} className="h-11 rounded-xl bg-primary font-bold text-[#10150c]"><MessageCircle className="mr-2 h-4 w-4" />Создать обращение</Button></div></section>}
  </div></div></AppShell>;
}

export function SupportPanelPage() {
  const queue = trpc.support.queue.useQuery();
  const [selected, setSelected] = useState<number | null>(null);
  const update = trpc.support.update.useMutation({ onSuccess: () => void queue.refetch() });
  return <AppShell><div className="container max-w-[1280px] py-8 sm:py-10"><div className="flex items-start justify-between gap-4"><PageHeading eyebrow="Supp-panel / Staff" title="Активные обращения" description="Очередь тикетов, история переписки и быстрые статусы для Support, Media, Admin и Developer." /><Button onClick={() => queue.refetch()} variant="outline" className="rounded-xl border-white/10 bg-transparent">Обновить</Button></div><div className="mt-8 grid gap-5 lg:grid-cols-[.8fr_1.2fr]"><section className="grid content-start gap-2">{queue.data?.map(row => <button key={row.ticket.id} onClick={() => setSelected(row.ticket.id)} className={`surface p-4 text-left ${selected === row.ticket.id ? "border-primary/50" : ""}`}><div className="flex justify-between gap-3"><span className="truncate font-semibold">#{row.ticket.id} · {row.ticket.subject}</span><span className="text-[10px] uppercase text-primary">{row.ticket.status}</span></div><div className="mt-2 text-xs text-muted-foreground">{row.user.email || row.user.name || `User #${row.user.id}`} · {row.ticket.category}</div><div className="mt-3 flex gap-2"><button onClick={event => { event.stopPropagation(); update.mutate({ ticketId: row.ticket.id, status: "closed" }); }} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] hover:border-primary/40">Закрыть</button><button onClick={event => { event.stopPropagation(); update.mutate({ ticketId: row.ticket.id, priority: "high" }); }} className="rounded-lg border border-red-300/20 px-2 py-1 text-[10px] text-red-200">Высокий приоритет</button></div></button>)}{!queue.data?.length && <div className="surface p-10 text-center text-sm text-muted-foreground">Активных обращений нет.</div>}</section>{selected ? <TicketThread ticketId={selected} staff /> : <div className="surface grid min-h-[420px] place-items-center p-8 text-center text-sm text-muted-foreground"><div><MessageCircle className="mx-auto h-8 w-8 text-primary/60" /><p className="mt-3">Выберите тикет слева, чтобы открыть переписку.</p></div></div>}</div></div></AppShell>;
}
