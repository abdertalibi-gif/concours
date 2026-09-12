import { useState } from 'react';
import { AdminHeader } from './shared';
import { Card, Button, Input } from '../../components/ui';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/ui';
import { adminUpdate } from '../../lib/db';
import type { User } from '../../lib/types';

export default function AdminParametres() {
  const { user } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    notifications: true,
    maintenanceMode: false
  });

  const handleSave = () => {
    if (!user) return;
    setLoading(true);

    // Simulate save
    setTimeout(() => {
      adminUpdate<User>('users', user.id, {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
      });
      setLoading(false);
      toast.toast('Vos préférences ont été mises à jour avec succès.', 'success');
    }, 600);
  };

  return (
    <div>
      <AdminHeader
        title="Paramètres de l'Administration"
        subtitle="Gérez votre compte et les réglages de la plateforme."
      />

      <div className="mt-6 max-w-3xl space-y-6">
        <Card className="p-6">
          <h2 className="text-base font-bold text-[#0B2A4A] mb-4">Profil Administrateur</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-slate-700">Prénom</label>
              <Input
                value={form.firstName}
                onChange={(e) => setForm(prev => ({ ...prev, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-bold text-slate-700">Nom</label>
              <Input
                value={form.lastName}
                onChange={(e) => setForm(prev => ({ ...prev, lastName: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-[13px] font-bold text-slate-700">Adresse email</label>
              <Input
                value={form.email}
                onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-bold text-[#0B2A4A] mb-4">Préférences du système</h2>

          <div className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-200">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={form.notifications}
                  onChange={(e) => setForm(prev => ({ ...prev, notifications: e.target.checked }))}
                />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4 peer-checked:bg-[#0B63CE] ring-1 ring-black/5" />
                <div className="h-full w-full rounded-full transition-colors peer-checked:bg-sky-100" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Notifications de rapport</p>
                <p className="text-xs text-slate-500">Recevoir un email lors d'un signalement.</p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-200">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={form.maintenanceMode}
                  onChange={(e) => setForm(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                />
                <div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4 peer-checked:bg-rose-500 ring-1 ring-black/5" />
                <div className="h-full w-full rounded-full transition-colors peer-checked:bg-rose-100" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Mode Maintenance</p>
                <p className="text-xs text-slate-500">Bloquer l'accès au site public pour les utilisateurs non-admins.</p>
              </div>
            </label>
          </div>
        </Card>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => window.location.reload()}>Annuler</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? 'Sauvegarde...' : 'Enregistrer les modifications'}
          </Button>
        </div>
      </div>
    </div>
  );
}
