# Chroma Loader

A Windows x64 WPF Loader that uses the **same Supabase Auth account as the website**. It does not connect to PostgreSQL and contains only the public Supabase publishable key.

## Behavior

- Email/password login through Supabase Auth REST.
- Session persistence through a refresh token protected with Windows DPAPI (`CurrentUser`).
- No `email_confirmed_at` check and no email-confirmation UI.
- Account and subscription are read from `GET https://chroma-client.vercel.app/api/loader/account` with the Supabase access token.
- Plan/status/expiration are server-authoritative; the Loader never invents PREMIUM locally.
- Logout clears the local protected session.
- Creates the safe user game directory structure under `C:\ChromaVisual` without deleting user files.

## Build on Windows

```powershell
dotnet restore .\Chroma.Loader.csproj
dotnet publish .\Chroma.Loader.csproj -c Release -r win-x64 --self-contained true /p:PublishSingleFile=true
```

The output is `bin\Release\net8.0-windows\win-x64\publish\Chroma.Loader.exe` and does not require a separate .NET Runtime.

## Supabase requirement

The Supabase project must have **Confirm email disabled / auto-confirm enabled**. The website and Loader intentionally do not check or display email-confirmation status, but Supabase itself must return a session from `signUp` for immediate Dashboard navigation.

The Loader intentionally does not include a service-role key, database password, or backend secret.
