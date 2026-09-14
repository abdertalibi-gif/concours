// ============================================================
// CONCOURS MAROC — Authentification & autorisations
// Provider React + hooks.
// Si Supabase est configuré : Supabase Auth + table profiles.
// Sinon : session locale + hash (démo).
// ============================================================
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Role, User } from './types';
import { getSessionUserId, getUserByEmail, getUserById, loadDB, saveDB, setSessionUserId } from './db';
import { hashPassword, isValidEmail, uid, verifyPassword } from './utils';
import { supabase, isSupabaseConfigured } from './supabase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; role?: Role }>;
  register: (data: { firstName: string; lastName: string; email: string; password: string; city?: string; level?: string }) => Promise<{ ok: boolean; error?: string; role?: Role }>;
  logout: () => Promise<void> | void;
  updateProfile: (patch: Partial<User>) => Promise<{ ok: boolean; error?: string }>;
  changePassword: (current: string, next: string) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---- Supabase Auth helpers ----

function supabaseUserToUser(profile: Record<string, unknown>, authId: string): User {
  return {
    id: authId,
    firstName: (profile.full_name as string)?.split(' ')[0] || '',
    lastName: (profile.full_name as string)?.split(' ').slice(1).join(' ') || '',
    email: (profile.email as string) || '',
    passwordHash: '',
    role: (profile.role as Role) || 'USER',
    status: (profile.status as string === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE') as 'ACTIVE' | 'SUSPENDED',
    city: (profile.city as string) || undefined,
    level: (profile.level as string) || undefined,
    phone: (profile.phone as string) || undefined,
    bio: (profile.bio as string) || undefined,
    createdAt: (profile.created_at as string) || new Date().toISOString(),
    lastLoginAt: (profile.last_login_at as string) || new Date().toISOString(),
  };
}

async function fetchProfile(authId: string): Promise<User | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', authId).single();
    if (error || !data) return null;
    return supabaseUserToUser(data as Record<string, unknown>, authId);
  } catch { return null; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ---- localStorage refresh ----
  const localRefresh = useCallback(() => {
    const id = getSessionUserId();
    if (!id) { setUser(null); return; }
    const u = getUserById(id);
    if (!u || u.status === 'SUSPENDED') { setSessionUserId(null); setUser(null); return; }
    setUser(u);
  }, []);

  // ---- Supabase refresh (restore session from JWT) ----
  const supaRefresh = useCallback(async () => {
    if (!isSupabaseConfigured) { localRefresh(); return; }
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { setUser(null); return; }
      const profile = await fetchProfile(session.user.id);
      if (profile && profile.status !== 'SUSPENDED') {
        setUser(profile);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, [localRefresh]);

  const refresh = useCallback(() => {
    if (isSupabaseConfigured) { supaRefresh(); } else { localRefresh(); }
  }, [isSupabaseConfigured, supaRefresh, localRefresh]);

  useEffect(() => {
    refresh();
    setLoading(false);
    const fn = () => refresh();
    window.addEventListener('cm_db_update', fn);
    return () => window.removeEventListener('cm_db_update', fn);
  }, [refresh]);

  // ---- Login ----
  const login = useCallback(async (email: string, password: string) => {
    if (isSupabaseConfigured) {
      // Supabase Auth login
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) {
        const msg = error.message.includes('Invalid login') ? 'E-mail ou mot de passe incorrect.' : error.message;
        return { ok: false, error: msg };
      }
      const profile = await fetchProfile(data.user.id);
      if (!profile) return { ok: false, error: 'Profil introuvable. Contactez le support.' };
      if (profile.status === 'SUSPENDED') return { ok: false, error: 'Ce compte est suspendu.' };
      // Update last_login_at
      await supabase.from('profiles').update({ last_login_at: new Date().toISOString() }).eq('id', data.user.id);
      setUser({ ...profile, lastLoginAt: new Date().toISOString() });
      return { ok: true, role: profile.role };
    }
    // localStorage fallback
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

  // ---- Register ----
  const register = useCallback(async (data: { firstName: string; lastName: string; email: string; password: string; city?: string; level?: string }) => {
    if (isSupabaseConfigured) {
      // Supabase Auth register
      if (!data.firstName.trim() || !data.lastName.trim()) return { ok: false, error: 'Veuillez saisir votre prénom et nom.' };
      if (!isValidEmail(data.email)) return { ok: false, error: 'Adresse e-mail invalide.' };
      if (data.password.length < 8) return { ok: false, error: 'Le mot de passe doit contenir au moins 8 caractères.' };
      const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email.trim().toLowerCase(),
        password: data.password,
        options: { data: { full_name: fullName } },
      });
      if (authError) {
        const msg = authError.message.includes('already registered') ? 'Un compte existe déjà avec cet e-mail.' : authError.message;
        return { ok: false, error: msg };
      }
      if (!authData.user) return { ok: false, error: 'Erreur lors de la création du compte.' };
      // Insert profile row (if trigger doesn't do it automatically)
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: authData.user.id,
        email: data.email.trim().toLowerCase(),
        full_name: fullName,
        role: 'USER',
        status: 'ACTIVE',
        city: data.city || null,
        level: data.level || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
      if (profileError) console.warn('[Auth] Profile insert failed (trigger may handle it):', profileError.message);
      const profile = await fetchProfile(authData.user.id);
      if (profile) setUser(profile);
      return { ok: true, role: 'USER' as Role };
    }
    // localStorage fallback
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
      id: uid('notif'), userId: nu.id, title: 'Bienvenue sur Concours Maroc',
      message: 'Votre compte est créé. Suivez vos concours favoris et préparez-vous efficacement.', type: 'success',
      link: '/concours', readBy: [], createdAt: new Date().toISOString(),
    });
    saveDB(db);
    setSessionUserId(nu.id);
    setUser(nu);
    return { ok: true, role: nu.role };
  }, []);

  // ---- Logout ----
  const logout = useCallback(async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setSessionUserId(null);
    setUser(null);
  }, []);

  // ---- Update profile ----
  const updateProfile = useCallback(async (patch: Partial<User>) => {
    if (!user) return { ok: false, error: 'Non connecté.' };
    if (isSupabaseConfigured) {
      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (patch.firstName !== undefined || patch.lastName !== undefined) {
        updates.full_name = `${patch.firstName ?? user.firstName} ${patch.lastName ?? user.lastName}`.trim();
      }
      if (patch.city !== undefined) updates.city = patch.city;
      if (patch.level !== undefined) updates.level = patch.level;
      if (patch.phone !== undefined) updates.phone = patch.phone;
      if (patch.bio !== undefined) updates.bio = patch.bio;
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) return { ok: false, error: error.message };
      const fresh = await fetchProfile(user.id);
      if (fresh) setUser(fresh);
      return { ok: true };
    }
    // localStorage fallback
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

  // ---- Change password ----
  const changePassword = useCallback(async (current: string, next: string) => {
    if (!user) return { ok: false, error: 'Non connecté.' };
    if (next.length < 8) return { ok: false, error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' };
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.updateUser({ password: next });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    // localStorage fallback
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
    isAdmin: user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN',
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
