import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Language = "en" | "ru";
type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; isRussian: boolean };
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

const dictionary: Record<string, string> = {
  "Features": "Возможности", "Pricing": "Тарифы", "Download": "Скачать", "Status": "Статус", "Sign in": "Войти", "Get started": "Начать", "Dashboard": "Кабинет", "Open dashboard": "Открыть кабинет", "Telegram": "Телеграм", "Overview": "Обзор", "Subscription": "Подписка", "Devices": "Устройства", "Downloads": "Загрузки", "Security": "Безопасность", "Settings": "Настройки", "Admin panel": "Админ-панель", "Workspace": "Рабочая область", "Control room": "Панель управления", "Log out": "Выйти", "Log in": "Войти", "Language": "Язык", "English": "Английский", "Russian": "Русский", "Save": "Сохранить", "Saved locally": "Сохранено локально", "Loading…": "Загрузка…", "Checking session…": "Проверяем сессию…", "Refresh": "Обновить", "Buy": "Купить", "Register free": "Зарегистрироваться бесплатно", "POPULAR": "ПОПУЛЯРНЫЙ", "FREE": "БЕСПЛАТНО", "Basic features": "Базовые возможности", "Access after registration": "Доступ после регистрации", "Client download access": "Доступ к загрузке клиента", "Basic access after registration.": "Базовый доступ после регистрации.", "Early access to updates": "Ранний доступ к обновлениям", "New features first": "Новые функции первыми", "Expanded support": "Расширенная поддержка", "Have a promo code?": "Есть промокод?", "How it works": "Как это работает", "Sign in to download": "Войдите для скачивания", "Operational": "Работает", "Beta": "Бета", "Website": "Сайт", "Account & OAuth": "Аккаунт и OAuth", "Database": "База данных", "Loader API": "API Loader", "Username": "Имя пользователя", "USERNAME": "ИМЯ ПОЛЬЗОВАТЕЛЯ", "EMAIL": "EMAIL", "PASSWORD": "ПАРОЛЬ", "Password": "Пароль", "Create account.": "Создать аккаунт.", "Welcome back.": "С возвращением.", "Restore access.": "Восстановить доступ.", "Create account": "Создать аккаунт", "Forgot password?": "Забыли пароль?", "Send email": "Отправить письмо", "Please wait…": "Подождите…", "Terms": "Условия", "Privacy": "Конфиденциальность", "Contact": "Контакты", "Client releases": "Релизы клиента", "Users": "Пользователи", "Payments": "Платежи", "Licenses": "Лицензии", "Audit logs": "Журнал аудита", "Project settings": "Настройки проекта", "Publish versions and changelog": "Публикация версий и changelog", "Search, status, role, ban / unban": "Поиск, статус, роль, блокировка", "Grant, extend, revoke": "Выдать, продлить, отозвать", "Inspect and reset binding": "Проверить и сбросить привязку", "Login, linking, downloads, admin actions": "Входы, привязки, загрузки и действия админов", "Plan": "Тариф", "Term": "Срок", "Selected offer": "Выбранный вариант", "Price": "Цена", "Price is being confirmed": "Цена уточняется", "1 month": "1 месяц", "3 months": "3 месяца", "6 months": "6 месяцев", "Choose a purchase method": "Выберите способ покупки", "Choose a plan and term": "Выберите тариф и срок", "Purchase through Telegram": "Покупка через Telegram", "Go to purchase": "Перейти к покупке", "Open Telegram": "Открыть Telegram", "Back": "Назад", "Copy": "Копировать", "Create key": "Создать ключ", "Activation limit": "Лимит активаций", "Expires at": "Дата окончания", "Active": "Активна", "Expired": "Истекла", "Used": "Использована", "Cancel": "Отмена", "No active subscription": "Нет активной подписки", "Цена уточняется": "Price is being confirmed"
};
const reverseDictionary = Object.fromEntries(Object.entries(dictionary).map(([en, ru]) => [ru, en]));

function translateDom(language: Language) {
  if (typeof document === "undefined") return;
  const map = language === "ru" ? dictionary : reverseDictionary;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) nodes.push(current as Text);
  nodes.forEach(node => {
    const parent = node.parentElement;
    if (!parent || ["SCRIPT", "STYLE", "CODE"].includes(parent.tagName)) return;
    const raw = node.nodeValue ?? "";
    const trimmed = raw.trim();
    if (!trimmed || !map[trimmed]) return;
    node.nodeValue = raw.replace(trimmed, map[trimmed]);
  });
  document.querySelectorAll<HTMLElement>("input, textarea, [aria-label], [title]").forEach(element => {
    for (const attr of ["placeholder", "aria-label", "title"]) {
      const value = element.getAttribute(attr);
      if (value && map[value]) element.setAttribute(attr, map[value]);
    }
  });
}

export function LanguageProvider({ children, defaultLanguage = "ru" }: { children: React.ReactNode; defaultLanguage?: Language }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("chroma-language-v2") ?? (localStorage.getItem("chroma-language") === "ru" ? "ru" : null);
    return saved === "ru" || saved === "en" ? saved : defaultLanguage;
  });
  useEffect(() => {
    localStorage.setItem("chroma-language-v2", language);
    document.documentElement.lang = language;
    const apply = () => translateDom(language);
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language]);
  const value = useMemo(() => ({ language, setLanguage, isRussian: language === "ru" }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { const context = useContext(LanguageContext); if (!context) throw new Error("useLanguage must be used within LanguageProvider"); return context; }
export const uiText = {
  en: { overview: "Overview", subscription: "Subscription", devices: "Devices", downloads: "Downloads", security: "Security", settings: "Settings", support: "Support", admin: "Admin panel", workspace: "Workspace", controlRoom: "Control room", language: "Language", english: "English", russian: "Russian", saved: "Saved locally", saveHint: "Your preference is stored in this browser.", appearance: "Interface preference", appearanceHint: "Chroma keeps the dark premium surface as its default.", notifications: "Notifications", notificationsHint: "Notification controls will be added when account preferences are persisted.", unavailable: "Not connected yet", englishNative: "English", russianNative: "Русский" },
  ru: { overview: "Обзор", subscription: "Подписка", devices: "Устройства", downloads: "Загрузки", security: "Безопасность", settings: "Настройки", support: "Поддержка", admin: "Админ-панель", workspace: "Рабочая область", controlRoom: "Панель управления", language: "Язык", english: "Английский", russian: "Русский", saved: "Сохранено локально", saveHint: "Выбор сохраняется в этом браузере.", appearance: "Внешний вид", appearanceHint: "Chroma использует тёмную premium-тему по умолчанию.", notifications: "Уведомления", notificationsHint: "Настройки уведомлений появятся после подключения сохранения профиля.", unavailable: "Пока не подключено", englishNative: "English", russianNative: "Русский" }
} as const;
