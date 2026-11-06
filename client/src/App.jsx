import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { ThemeProvider } from './context/ThemeContext';

import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { OverviewPage } from './pages/OverviewPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { DatabasePage } from './pages/DatabasePage';
import { StoragePage } from './pages/StoragePage';
import { AuthPage } from './pages/AuthPage';
import { ApiExplorerPage } from './pages/ApiExplorerPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LogsPage } from './pages/LogsPage';
import { SecurityRulesPage } from './pages/SecurityRulesPage';
import { ProjectSettingsPage } from './pages/ProjectSettingsPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { BillingPage } from './pages/BillingPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-stratum-950 flex flex-col items-center justify-center text-slate-400 font-mono text-xs">
        <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
        Connecting to Stratum Cloud...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProjectProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<OverviewPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="database" element={<DatabasePage />} />
                <Route path="storage" element={<StoragePage />} />
                <Route path="auth" element={<AuthPage />} />
                <Route path="api-explorer" element={<ApiExplorerPage />} />
                <Route path="analytics" element={<AnalyticsPage />} />
                <Route path="logs" element={<LogsPage />} />
                <Route path="security" element={<SecurityRulesPage />} />
                <Route path="settings" element={<ProjectSettingsPage />} />
                <Route path="documentation" element={<DocumentationPage />} />
                <Route path="billing" element={<BillingPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ProjectProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

