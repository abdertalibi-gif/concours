// ============================================================
// CONCOURS MAROC — Routeur principal
// Public + Espace utilisateur + Administration
// ============================================================
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './components/ui';
import { AdminLayout, DashboardLayout, PublicLayout } from './components/layout';
import Home from './pages/Home';
import ConcoursList from './pages/ConcoursList';
import ConcoursDetail from './pages/ConcoursDetail';
import { EcoleDetail, EcolesList } from './pages/Ecoles';
import { ExamenDetail, ExamensList } from './pages/Examens';
import Documents from './pages/Documents';
import { CourseDetail, PreparationList } from './pages/Preparation';
import { ForgotPassword, Login, Register } from './pages/Auth';
import { DashConcours, DashCours, DashFavoris, DashHome, DashNotifications, DashParametres, DashProfil } from './pages/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminConcours from './pages/admin/AdminConcours';
import { AdminEcoles, AdminMinisteres, AdminUniversites } from './pages/admin/AdminCatalog';
import { AdminCours, AdminDocuments, AdminExamens } from './pages/admin/AdminContent';
import { AdminNotifications, AdminSignalements, AdminUsers } from './pages/admin/AdminUsers';
import AdminRapports from './pages/admin/AdminRapports';
import AdminParametres from './pages/admin/AdminParametres';
import { APropos, Conditions, Confidentialite, Contact, FAQ, NotFound } from './pages/Static';
import type { JSX } from 'react';

function GuestOnly({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          {/* ---------- Public ---------- */}
          <Route element={<PublicLayout />}>
            <Route index element={<Home />} />
            <Route path="concours" element={<ConcoursList />} />
            <Route path="concours/:slug" element={<ConcoursDetail />} />
            <Route path="ecoles" element={<EcolesList />} />
            <Route path="ecoles/:slug" element={<EcoleDetail />} />
            <Route path="examens" element={<ExamensList />} />
            <Route path="examens/:slug" element={<ExamenDetail />} />
            <Route path="documents" element={<Documents />} />
            <Route path="preparation" element={<PreparationList />} />
            <Route path="preparation/cours/:slug" element={<CourseDetail />} />
            <Route path="connexion" element={<GuestOnly><Login /></GuestOnly>} />
            <Route path="inscription" element={<GuestOnly><Register /></GuestOnly>} />
            <Route path="mot-de-passe-oublie" element={<GuestOnly><ForgotPassword /></GuestOnly>} />
            <Route path="a-propos" element={<APropos />} />
            <Route path="faq" element={<FAQ />} />
            <Route path="contact" element={<Contact />} />
            <Route path="confidentialite" element={<Confidentialite />} />
            <Route path="conditions" element={<Conditions />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* ---------- Espace utilisateur ---------- */}
          <Route path="dashboard" element={<DashboardLayout />}>
            <Route index element={<DashHome />} />
            <Route path="concours" element={<DashConcours />} />
            <Route path="cours" element={<DashCours />} />
            <Route path="favoris" element={<DashFavoris />} />
            <Route path="notifications" element={<DashNotifications />} />
            <Route path="profil" element={<DashProfil />} />
            <Route path="parametres" element={<DashParametres />} />
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* ---------- Administration ---------- */}
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="concours" element={<AdminConcours />} />
            <Route path="ecoles" element={<AdminEcoles />} />
            <Route path="universites" element={<AdminUniversites />} />
            <Route path="ministeres" element={<AdminMinisteres />} />
            <Route path="examens" element={<AdminExamens />} />
            <Route path="documents" element={<AdminDocuments />} />
            <Route path="cours" element={<AdminCours />} />
            <Route path="utilisateurs" element={<AdminUsers />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="signalements" element={<AdminSignalements />} />
            <Route path="rapports" element={<AdminRapports />} />
            <Route path="parametres" element={<AdminParametres />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
