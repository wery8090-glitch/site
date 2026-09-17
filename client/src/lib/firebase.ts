import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence, isSignInWithEmailLink, sendSignInLinkToEmail, signInWithEmailLink, type UserCredential } from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyDN8pdGNg52AQjnwnRMwsPgoRTKhDS1uOU",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "chroma-b209d.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "chroma-b209d",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "chroma-b209d.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "213596652962",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:213596652962:web:563e71a9411e599fcd5efb",
};

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.appId);
export const firebaseApp = firebaseConfigured ? (getApps()[0] ?? initializeApp(config)) : null;
export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null;
export const googleProvider = new GoogleAuthProvider();
export const emailLinkActionCodeSettings = firebaseConfigured ? { url: `${window.location.origin}/passwordless`, handleCodeInApp: true } : null;

if (firebaseAuth) {
  void setPersistence(firebaseAuth, browserLocalPersistence);
}

export function firebaseErrorMessage(code?: string | null) {
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Неверный email или пароль.",
    "auth/invalid-login-credentials": "Неверный email или пароль.",
    "auth/user-not-found": "Этот аккаунт ещё переносится на новую систему авторизации.",
    "auth/email-already-in-use": "Этот email уже используется.",
    "auth/wrong-password": "Неверный email или пароль.",
    "auth/weak-password": "Пароль слишком слабый.",
    "auth/popup-closed-by-user": "Окно входа было закрыто.",
    "auth/network-request-failed": "Нет соединения с интернетом.",
    "auth/invalid-email": "Введите корректный email.",
    "auth/user-disabled": "Этот аккаунт отключён.",
    "auth/too-many-requests": "Слишком много попыток. Повторите позже.",
    "auth/operation-not-allowed": "Этот способ входа пока не включён в Firebase.",
  };
  return messages[code ?? ""] ?? "Неизвестная ошибка авторизации.";
}

export async function sendPasswordlessLink(email: string) {
  if (!firebaseAuth || !emailLinkActionCodeSettings) throw new Error("Firebase Auth is not configured.");
  await sendSignInLinkToEmail(firebaseAuth, email, emailLinkActionCodeSettings);
  window.localStorage.setItem("chroma.passwordless.email", email);
}

export async function completePasswordlessLink(): Promise<UserCredential | null> {
  if (!firebaseAuth || !isSignInWithEmailLink(firebaseAuth, window.location.href)) return null;
  const email = window.localStorage.getItem("chroma.passwordless.email") ?? window.prompt("Введите email для завершения входа") ?? "";
  if (!email) throw new Error("Email is required to complete passwordless sign-in.");
  const credential = await signInWithEmailLink(firebaseAuth, email, window.location.href);
  window.localStorage.removeItem("chroma.passwordless.email");
  return credential;
}
