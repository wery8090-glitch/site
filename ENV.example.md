# Chroma environment template

The managed runtime protects `.env` and `.env.example` from direct edits. Use this list when configuring deployment secrets and settings.

```dotenv
DATABASE_URL=
JWT_SECRET=
VITE_APP_ID=
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im
OWNER_OPEN_ID=
OWNER_NAME=
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
VITE_FRONTEND_FORGE_API_KEY=
APP_URL=http://localhost:3000
VITE_SUPABASE_URL=https://rsbcqzeyiazogktztubu.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
SUPABASE_URL=https://rsbcqzeyiazogktztubu.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_replace_me
SUPABASE_SECRET_KEY=
SUPABASE_JWKS_URL=https://rsbcqzeyiazogktztubu.supabase.co/auth/v1/.well-known/jwks.json
FIREBASE_PROJECT_ID=chroma-b209d
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
STORAGE_URL=
PAYMENT_PROVIDER_KEY=
PAYMENT_WEBHOOK_SECRET=
```

`DATABASE_URL`, OAuth variables, and runtime forge variables are already supplied by the managed project where available. Configure `STORAGE_URL`, `PAYMENT_PROVIDER_KEY`, and `PAYMENT_WEBHOOK_SECRET` only when enabling private downloads and real sandbox/live payments.
