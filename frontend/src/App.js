import "./App.css";
import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import { I18nProvider, useI18n } from "./lib/i18n";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

const Login           = lazy(() => import("./pages/Login"));
const Register        = lazy(() => import("./pages/Register"));
const AdminDashboard  = lazy(() => import("./pages/AdminDashboard"));
const TechDashboard   = lazy(() => import("./pages/TechDashboard"));
const HelperDashboard = lazy(() => import("./pages/HelperDashboard"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
      <div className="w-8 h-8 border-4 border-slate-300 border-t-slate-800 dark:border-slate-600 dark:border-t-slate-200 rounded-full animate-spin" />
    </div>
  );
}

function roleHome(role) {
  if (role === "admin") return "/admin";
  if (role === "helper") return "/helper";
  return "/tech";
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}

function ToasterWithDir() {
  const { lang } = useI18n();
  return <Toaster position="top-center" richColors dir={lang === "ar" ? "rtl" : "ltr"} />;
}

function App() {
  return (
    <ErrorBoundary>
    <ThemeProvider>
    <I18nProvider>
      <AuthProvider>
        <BrowserRouter>
          <ToasterWithDir />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute role="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tech"
                element={
                  <ProtectedRoute role="technician">
                    <TechDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/helper"
                element={
                  <ProtectedRoute role="helper">
                    <HelperDashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </I18nProvider>
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
