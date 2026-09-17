# Chroma website integration findings

Source repository: https://github.com/wery8090-glitch/site
Public site: https://chroma-client-pozetiv.vercel.app
Firebase project: chroma-b209d
Firebase Web Auth is enabled in the website client; Email/Password and Google provider were reported enabled. Website client defaults to authDomain chroma-b209d.firebaseapp.com and projectId chroma-b209d.

Website auth implementation:
- client/src/lib/firebase.ts initializes Firebase Web Auth and browserLocalPersistence.
- client/src/_core/hooks/useAuth.ts observes Firebase Auth and falls back to Supabase only when Firebase is not configured.
- server/firebaseAuth.ts verifies Authorization Bearer Firebase ID tokens with Firebase Admin credentials from server environment variables, then ensureFirebaseProfile().
- server/_core/context.ts tries Manus SDK, Firebase, then Supabase auth.
- server/loader.ts currently incorrectly uses authenticateSupabaseRequest for /api/loader/account, /versions, and /visuals. This must be changed to Firebase auth for the Loader to share website accounts.
- server/db.ts ensureFirebaseProfile creates/updates users by Firebase UID and creates a FREE subscription if missing. getDashboardSummary returns user/subscription/devices/latestVersion/downloads.
- client App routes include /login, /register and protected /dashboard routes.

Deployment:
- .vercel/project.json: projectId prj_fMG5Cx4cTWNPF5C4A2SEEFehSBNs, orgId team_cibUA21lIw60hY31wpnz8YES, projectName chroma-client.
- repo remote is https://github.com/wery8090-glitch/site.
- Vercel MCP listed the team pozetiv but no linked projects were returned; GitHub/Vercel auto-deploy may still be configured through repository integration.
- Environment template requires DATABASE_URL, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY and Firebase client VITE_* values. Never commit private key or service account secrets.

Loader current architecture:
- /home/ubuntu/work/chroma-loader-rebuild
- Electron main.cjs + preload.cjs + Firebase Web Auth services.
- Current Loader BackendService still points at us-central1-chroma-b209d.cloudfunctions.net/loaderSession, which returns 404 because Firebase Functions could not deploy on Spark plan.
- Safe local free-profile fallback was added so successful Firebase Auth can open dashboard without paid access.
- Latest build before website integration: /home/ubuntu/work/CHROMA-CLIENT-Loader-auth-priority-fixed.exe.
- Need change Loader BackendService to use website API https://chroma-client-pozetiv.vercel.app/api/loader/account and map its response to the Loader catalog contract.
- Need implement website-to-Loader one-time handoff only after confirming exact security flow. Do not transmit passwords or long-lived refresh tokens in URL. Preferred: a short-lived single-use handoff code stored server-side or a local callback that exchanges a Firebase ID token over HTTPS; validate state, expiry and one-time consumption.

Critical UI bug:
- Loader renderer/src/main.js could render AuthorizationView while a catalog existed and location was /, causing auth/dashboard overlay. A guard was added to avoid rendering auth when catalog exists and to navigate once to /home. Verify on actual runtime and avoid duplicate CATALOG_STATE/AUTHENTICATED navigation races.

User requirement:
- Email/password login and registration must work in Loader.
- Google login should open the user’s normal browser, allow Google sign-in, return to Loader, and establish the same Firebase account.
- If already logged into website/browser, website should offer “Open Loader”; Loader should receive a one-time handoff and open dashboard.
- Dashboard in Loader should use the website’s real profile/subscription/versions/devices data but keep Loader’s dark CHROMA design.
- Build a real Windows portable EXE >=50 MB and provide complete sanitized sources.

Security:
- No Firebase Admin private key, refresh tokens, OAuth authorization codes, passwords or cookies may be committed or put in URLs.
- Firebase Web API config may be present in frontend as public client config, but Admin credentials remain deployment secrets.
