import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { 
  Settings, 
  Palette, 
  Bell, 
  ShieldCheck, 
  User as UserIcon,
  Save,
  LogOut,
  Key
} from 'lucide-react';
import { cn } from '../../utils/cn';

export default function AdminParametres() {
  const { user } = useAuth();
  
  // Toggles state
  const [toggles, setToggles] = useState({
    darkMode: false,
    showStats: true,
    showRecent: true,
    notifConcours: true,
    notifInscription: true,
    notifEcole: false,
    notifDocument: false,
    notifRapport: true
  });

  const toggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const initiales = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase();

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-5xl mx-auto">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-extrabold text-[#0B2A4A] tracking-tight">Paramètres</h1>
        <p className="mt-1 text-sm text-slate-500 font-medium">Gérez les paramètres généraux de la plateforme Concours Maroc.</p>
      </div>

      {/* PARAMÈTRES GÉNÉRAUX */}
      <section className="rounded-2xl bg-white border border-[#E6ECF3] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50">
            <Settings className="h-5 w-5 text-[#0B63CE]" />
          </div>
          <h2 className="text-lg font-extrabold text-[#0B2A4A]">Paramètres généraux</h2>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-[#0B2A4A]">Nom de la plateforme</label>
            <input type="text" defaultValue="Concours Maroc" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-[#0B2A4A] outline-none focus:border-[#0B63CE] focus:bg-white focus:ring-1 focus:ring-[#0B63CE] transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-[#0B2A4A]">Description</label>
            <input type="text" defaultValue="Plateforme marocaine des concours et examens" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-[#0B2A4A] outline-none focus:border-[#0B63CE] focus:bg-white focus:ring-1 focus:ring-[#0B63CE] transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-[#0B2A4A]">Email administrateur</label>
            <input type="email" defaultValue="admin@concoursmaroc.ma" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-[#0B2A4A] outline-none focus:border-[#0B63CE] focus:bg-white focus:ring-1 focus:ring-[#0B63CE] transition-all" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-[#0B2A4A]">Téléphone</label>
            <input type="tel" defaultValue="+212 5 00 00 00 00" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-[#0B2A4A] outline-none focus:border-[#0B63CE] focus:bg-white focus:ring-1 focus:ring-[#0B63CE] transition-all" />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-sm font-bold text-[#0B2A4A]">Ville / Pays</label>
            <input type="text" defaultValue="Rabat, Maroc" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-[#0B2A4A] outline-none focus:border-[#0B63CE] focus:bg-white focus:ring-1 focus:ring-[#0B63CE] transition-all" />
          </div>
        </div>
        <div className="bg-slate-50 px-6 py-4 flex justify-end border-t border-slate-100">
          <button className="flex items-center gap-2 rounded-xl bg-[#0B63CE] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#0956B4] transition-colors">
            <Save className="h-4 w-4" /> Enregistrer les modifications
          </button>
        </div>
      </section>

      {/* APPARENCE */}
      <section className="rounded-2xl bg-white border border-[#E6ECF3] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
            <Palette className="h-5 w-5 text-emerald-600" />
          </div>
          <h2 className="text-lg font-extrabold text-[#0B2A4A]">Apparence</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <p className="text-sm font-bold text-[#0B2A4A]">Logo de la plateforme</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Image affichée dans la barre de navigation</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-[#0B63CE] text-white flex items-center justify-center font-extrabold text-lg shadow-sm">
                CM
              </div>
              <button className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-colors">Changer</button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <p className="text-sm font-bold text-[#0B2A4A]">Couleur principale</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Couleur utilisée pour les boutons et les liens actifs</p>
            </div>
            <div className="flex items-center gap-3">
              {['#0B63CE', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'].map((color) => (
                <button key={color} className={cn("h-8 w-8 rounded-full ring-offset-2 transition-all", color === '#0B63CE' ? "ring-2 ring-[#0B63CE]" : "hover:scale-110")} style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>
          
          <ToggleRow label="Mode clair / sombre" desc="Activer le mode sombre automatiquement" active={toggles.darkMode} onClick={() => toggle('darkMode')} />
          <ToggleRow label="Afficher les statistiques" desc="Montrer les chiffres sur la page d'accueil" active={toggles.showStats} onClick={() => toggle('showStats')} />
          <ToggleRow label="Afficher les concours récents" desc="Afficher la liste des concours sur la page d'accueil" active={toggles.showRecent} onClick={() => toggle('showRecent')} border={false} />
        </div>
      </section>

      {/* NOTIFICATIONS */}
      <section className="rounded-2xl bg-white border border-[#E6ECF3] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
            <Bell className="h-5 w-5 text-orange-600" />
          </div>
          <h2 className="text-lg font-extrabold text-[#0B2A4A]">Notifications</h2>
        </div>
        <div className="p-6 space-y-6">
          <ToggleRow label="Nouveau concours" desc="Être alerté lors de l'ajout d'un concours" active={toggles.notifConcours} onClick={() => toggle('notifConcours')} />
          <ToggleRow label="Nouvelle inscription" desc="Notification à chaque nouvel utilisateur" active={toggles.notifInscription} onClick={() => toggle('notifInscription')} />
          <ToggleRow label="Nouvelle école" desc="Alerte lorsqu'une école est ajoutée" active={toggles.notifEcole} onClick={() => toggle('notifEcole')} />
          <ToggleRow label="Nouveau document" desc="Alerte pour un nouveau document importé" active={toggles.notifDocument} onClick={() => toggle('notifDocument')} />
          <ToggleRow label="Rapport hebdomadaire" desc="Recevoir un rapport d'activité chaque lundi" active={toggles.notifRapport} onClick={() => toggle('notifRapport')} border={false} />
        </div>
      </section>

      {/* SÉCURITÉ */}
      <section className="rounded-2xl bg-white border border-[#E6ECF3] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50">
            <ShieldCheck className="h-5 w-5 text-red-600" />
          </div>
          <h2 className="text-lg font-extrabold text-[#0B2A4A]">Sécurité</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div>
              <p className="text-sm font-bold text-[#0B2A4A]">Authentification</p>
              <p className="text-xs font-medium text-slate-500 mt-0.5">Mot de passe de votre compte</p>
            </div>
            <button className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap">
              <Key className="h-4 w-4" /> Modifier le mot de passe
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pb-6 border-b border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-500">Sessions actives</p>
              <p className="text-lg font-extrabold text-[#0B2A4A] mt-1">1 session</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500">Dernière connexion</p>
              <p className="text-lg font-extrabold text-[#0B2A4A] mt-1">Aujourd'hui</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-500">Protection Admin</p>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 mt-1 text-[11px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                Activée
              </span>
            </div>
          </div>
          <div className="flex justify-start">
             <button className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors">
              <LogOut className="h-4 w-4" /> Déconnecter toutes les sessions
            </button>
          </div>
        </div>
      </section>

      {/* COMPTE ADMINISTRATEUR */}
      <section className="rounded-2xl bg-white border border-[#E6ECF3] shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50">
            <UserIcon className="h-5 w-5 text-violet-600" />
          </div>
          <h2 className="text-lg font-extrabold text-[#0B2A4A]">Compte administrateur</h2>
        </div>
        <div className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-sky-100 ring-4 ring-white shadow-md text-2xl font-extrabold text-[#0B63CE]">
            {initiales || 'AD'}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className="text-xl font-extrabold text-[#0B2A4A]">{user?.firstName} {user?.lastName}</p>
            <p className="text-sm font-medium text-slate-500 mt-1">{user?.email}</p>
            <span className="inline-block rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600 mt-3">
              {user?.role === 'SUPER_ADMIN' ? 'Super Administrateur' : user?.role || 'Admin'}
            </span>
          </div>
          <div className="shrink-0">
             <button className="flex items-center justify-center w-full sm:w-auto rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#0B2A4A] shadow-sm ring-1 ring-inset ring-slate-200 hover:bg-slate-50 transition-colors">
              Modifier mon profil
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}

function ToggleRow({ label, desc, active, onClick, border = true }: { label: string, desc: string, active: boolean, onClick: () => void, border?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 pb-6", border && "border-b border-slate-100")}>
      <div>
        <p className="text-sm font-bold text-[#0B2A4A]">{label}</p>
        <p className="text-xs font-medium text-slate-500 mt-0.5">{desc}</p>
      </div>
      <button 
        onClick={onClick}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0B63CE] focus:ring-offset-2",
          active ? "bg-[#0B63CE]" : "bg-slate-200"
        )}
      >
        <span 
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            active ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
