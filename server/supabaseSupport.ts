type SupportCategory = "subscription" | "bug" | "account" | "loader" | "other";
type SupportStatus = "open" | "pending" | "closed";
type SupportPriority = "low" | "normal" | "high";

type ProfileRow = { id: number; open_id: string; username?: string | null; name?: string | null; email?: string | null };
type TicketRow = { id: number; user_open_id: string; assignee_open_id?: string | null; subject: string; category: SupportCategory; status: SupportStatus; priority: SupportPriority; created_at: string; updated_at: string };
type MessageRow = { id: number; ticket_id: number; author_open_id: string; body: string; internal: boolean; created_at: string };

const SUPABASE_URL = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "https://rsbcqzeyiazogktztubu.supabase.co").replace(/\/$/, "");

function headers() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { ...headers(), ...(init.headers ?? {}) } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`SUPABASE_${response.status}`);
  return body as T;
}

function profile(openId: string, row?: ProfileRow | null) {
  return { id: row?.id ?? 0, openId, username: row?.username ?? null, name: row?.name ?? null, email: row?.email ?? null };
}

function mapTicket(row: TicketRow) {
  return { id: Number(row.id), userId: 0, userOpenId: row.user_open_id, assigneeOpenId: row.assignee_open_id ?? null, subject: row.subject, category: row.category, status: row.status, priority: row.priority, createdAt: row.created_at, updatedAt: row.updated_at };
}

async function profiles(openIds: string[]) {
  const unique = Array.from(new Set(openIds.filter(Boolean)));
  if (!unique.length) return new Map<string, ProfileRow>();
  const filter = `(${unique.join(",")})`;
  const rows = await rest<ProfileRow[]>(`profiles?select=id,open_id,username,name,email&open_id=in.${encodeURIComponent(filter)}&limit=200`);
  return new Map(rows.map(row => [row.open_id, row]));
}

async function ticketWithMessages(row: TicketRow) {
  const messages = await rest<MessageRow[]>(`support_messages?select=id,ticket_id,author_open_id,body,internal,created_at&ticket_id=eq.${Number(row.id)}&internal=eq.false&order=created_at.asc&limit=200`);
  const profileRows = await profiles([row.user_open_id, ...messages.map(message => message.author_open_id)]);
  return {
    ticket: mapTicket(row),
    user: profile(row.user_open_id, profileRows.get(row.user_open_id)),
    messages: messages.map(message => ({
      message: { id: Number(message.id), ticketId: Number(message.ticket_id), authorId: 0, authorOpenId: message.author_open_id, body: message.body, internal: message.internal, createdAt: message.created_at },
      author: profile(message.author_open_id, profileRows.get(message.author_open_id)),
    })),
  };
}

export async function createSupportTicket(input: { userOpenId: string; subject: string; category: SupportCategory; body: string }) {
  const rows = await rest<TicketRow[]>("support_tickets", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ user_open_id: input.userOpenId, subject: input.subject, category: input.category, status: "open", priority: "normal" }) });
  const ticket = rows[0];
  if (!ticket) return null;
  await rest("support_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ ticket_id: ticket.id, author_open_id: input.userOpenId, body: input.body, internal: false }) });
  return Number(ticket.id);
}

export async function getUserSupportTickets(userOpenId: string) {
  const rows = await rest<TicketRow[]>(`support_tickets?select=*&user_open_id=eq.${encodeURIComponent(userOpenId)}&order=updated_at.desc&limit=100`);
  return rows.map(mapTicket);
}

export async function getSupportTicket(ticketId: number) {
  const rows = await rest<TicketRow[]>(`support_tickets?select=*&id=eq.${ticketId}&limit=1`);
  return rows[0] ? ticketWithMessages(rows[0]) : null;
}

export async function getSupportQueue() {
  const rows = await rest<TicketRow[]>("support_tickets?select=*&status=neq.closed&order=updated_at.desc&limit=200");
  const profileRows = await profiles(rows.flatMap(row => [row.user_open_id, row.assignee_open_id ?? ""]));
  return rows.map(row => ({ ticket: mapTicket(row), user: profile(row.user_open_id, profileRows.get(row.user_open_id)), assignee: row.assignee_open_id ? profile(row.assignee_open_id, profileRows.get(row.assignee_open_id)) : null }));
}

export async function addSupportMessage(input: { ticketId: number; authorOpenId: string; body: string; internal?: boolean }) {
  await rest("support_messages", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ ticket_id: input.ticketId, author_open_id: input.authorOpenId, body: input.body, internal: Boolean(input.internal) }) });
  if (!input.internal) await rest(`support_tickets?id=eq.${input.ticketId}`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ status: "pending", updated_at: new Date().toISOString() }) });
  return true;
}

export async function updateSupportTicket(ticketId: number, input: { status?: SupportStatus; priority?: SupportPriority; assigneeOpenId?: string | null }) {
  const changes: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.status !== undefined) changes.status = input.status;
  if (input.priority !== undefined) changes.priority = input.priority;
  if (input.assigneeOpenId !== undefined) changes.assignee_open_id = input.assigneeOpenId;
  const rows = await rest<TicketRow[]>(`support_tickets?id=eq.${ticketId}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(changes) });
  return rows.length > 0;
}
