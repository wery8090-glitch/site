# Сборка Chroma на Windows через CMD

## 1. Установить Node.js

Установите Node.js 22 LTS с официального сайта: https://nodejs.org/

После установки закройте и заново откройте CMD. Проверьте:

```cmd
node -v
npm -v
```

Версия Node должна начинаться с `v22`.

## 2. Установить pnpm

```cmd
npm install --global pnpm
pnpm -v
```

## 3. Распаковать исходники

Распакуйте ZIP в папку без кириллицы, например:

```text
C:\Projects\chroma-client
```

Откройте CMD и перейдите в папку:

```cmd
cd /d C:\Projects\chroma-client
```

## 4. Настроить переменные окружения

Скопируйте `ENV.example.md` в отдельный файл `.env` и заполните значения Supabase и базы данных. Не публикуйте `.env` и не добавляйте его в Git.

Для локальной проверки интерфейса можно начать с Supabase-переменных:

```env
VITE_SUPABASE_URL=https://rsbcqzeyiazogktztubu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=ваш_публичный_ключ_supabase
SUPABASE_URL=https://rsbcqzeyiazogktztubu.supabase.co
SUPABASE_PUBLISHABLE_KEY=ваш_публичный_ключ_supabase
SUPABASE_SECRET_KEY=ваш_секретный_ключ_только_на_сервере
```

## 5. Установить зависимости и проверить проект

```cmd
pnpm install
pnpm check
pnpm build
```

## 6. Запустить локально

```cmd
pnpm dev
```

Откройте адрес, который появится в CMD, обычно:

```text
http://localhost:3000
```

## 7. Запустить production-сборку локально

```cmd
pnpm start
```

## Важно про пароль

На регистрации используется пароль, который содержит:

- минимум 8 символов;
- хотя бы одну строчную букву;
- хотя бы одну заглавную букву;
- хотя бы одну цифру.

Пример формата: `Chroma2026!`.

Не используйте этот пример как настоящий пароль.

## Деплой в Vercel

Проект уже содержит совместимую конфигурацию `vercel.json`; версия Node.js `22.x` задаётся через `engines` в `package.json`. Для деплоя через Vercel CLI:

```cmd
npm install --global vercel
vercel logout
vercel login
vercel
vercel --prod
```

Если CLI пишет `The specified token is not valid`, выполните `vercel logout`, затем `vercel login` и войдите в аккаунт, у которого есть доступ к проекту `chroma-client`.

Перед production-деплоем добавьте секретные переменные в настройках проекта Vercel. Никогда не вставляйте секретные ключи в исходники.
