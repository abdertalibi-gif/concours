// ============================================================
// CONCOURS MAROC — Authentification & autorisations
// Provider React + hooks. En production (Next.js) : Auth.js +
// sessions serveur ; ici : session locale + hash (démo).
// Les vérifications de rôle sont CENTRALISÉES ici.
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role, User } from './types';
import { getSessionUserId, getUserByEmail, getUserById, loadDB, saveDB, setSessionUserId } from './db';
import { hashPassword, isValidEmail, uid, verifyPassword } from './utils';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; role?: Role }>;
  register: (data: { firstName: string; lastName: string; email: string; password: string; city?: string; level?: string }) => Promise<{ ok: boolean; error?: string; role?: Role }>;
  logout: () => void;
  updateProfile: (patch: Partial<User>) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    const id = getSessionUserId();
    if (!id) { setUser(null); return; }
    const u = getUserById(id);
    if (!u || u.status === 'SUSPENDED') { setSessionUserId(null); setUser(null); return; }
    setUser(u);
  }, []);

  useEffect(() => {
    refresh();
    setLoading(false);
    const fn = () => refresh();
    window.addEventListener('cm_db_update', fn);
    return () => window.removeEventListener('cm_db_update', fn);
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 350));
    if (!isValidEmail(email)) return { ok: false, error: 'Adresse e-mail invalide.' };
    const u = getUserByEmail(email);
    if (!u || !verifyPassword(password, u.passwordHash)) {
      return { ok: false, error: 'E-mail ou mot de passe incorrect.' };
    }
    if (u.status === 'SUSPENDED') return { ok: false, error: 'Ce compte est suspendu. Contactez le support.' };
    const db = loadDB();
    const found = db.users.find((x) => x.id === u.id);
    if (found) { found.lastLoginAt = new Date().toISOString(); saveDB(db); }
    setSessionUserId(u.id);
    setUser({ ...u, lastLoginAt: new Date().toISOString() });
    return { ok: true, role: u.role };
  }, []);

  const register = useCallback(async (data: { firstName: string; lastName: string; email: string; password: string; city?: string; level?: string }) => {
    await new Promise((r) => setTimeout(r, 350));
    if (!data.firstName.trim() || !data.lastName.trim()) return { ok: false, error: 'Veuillez saisir votre prénom et nom.' };
    if (!isValidEmail(data.email)) return { ok: false, error: 'Adresse e-mail invalide.' };
    if (data.password.length < 8) return { ok: false, error: 'Le mot de passe doit contenir au moins 8 caractères.' };
    if (getUserByEmail(data.email)) return { ok: false, error: 'Un compte existe déjà avec cet e-mail.' };
    const db = loadDB();
    const nu: User = {
      id: uid('u'), firstName: data.firstName.trim(), lastName: data.lastName.trim(),
      email: data.email.trim().toLowerCase(), passwordHash: hashPassword(data.password),
      role: 'USER', status: 'ACTIVE', city: data.city, level: data.level,
      createdAt: new Date().toISOString(), lastLoginAt: new Date().toISOString(),
    };
    db.users.push(nu);
    db.notifications.unshift({
      id: uid('notif'), userId: nu.id, title: 'Bienvenue sur Concours Maroc 🎓',
      message: 'Votre compte est créé. Suivez vos concours favoris et préparez-vous efficacement.', type: 'success',
      link: '/concours', readBy: [], createdAt: new Date().toISOString(),
    });
    saveDB(db);
    setSessionUserId(nu.id);
    setUser(nu);
    return { ok: true, role: nu.role };
  }, []);

  const logout = useCallback(() => {
    setSessionUserId(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch: Partial<User>) => {
    if (!user) return { ok: false, error: 'Non connecté.' };
    await new Promise((r) => setTimeout(r, 250));
    const db = loadDB();
    const found = db.users.find((x) => x.id === user.id);
    if (!found) return { ok: false, error: 'Utilisateur introuvable.' };
    const safe: Partial<User> = {
      firstName: patch.firstName, lastName: patch.lastName, city: patch.city,
      level: patch.level, phone: patch.phone, bio: patch.bio,
    };
    Object.assign(found, safe);
    saveDB(db);
    setUser({ ...found });
    return { ok: true };
  }, [user]);

  const changePassword = useCallback(async (current: string, next: string) => {
    if (!user) return { ok: false, error: 'Non connecté.' };
    if (next.length < 8) return { ok: false, error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' };
    const db = loadDB();
    const found = db.users.find((x) => x.id === user.id);
    if (!found || !verifyPassword(current, found.passwordHash)) {
      return { ok: false, error: 'Mot de passe actuel incorrect.' };
    }
    found.passwordHash = hashPassword(next);
    saveDB(db);
    return { ok: true };
  }, [user]);

  const value = useMemo<AuthContextValue>(() => ({
    user, loading, login, register, logout, updateProfile, changePassword, refresh,
    isAdmin: user?.role === 'ADMIN',
  }), [user, loading, login, register, logout, updateProfile, changePassword, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
}

export function requireRole(user: User | null, roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
