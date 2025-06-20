// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
// import Navbar from './components/Navbar'; // Plus besoin ici, il est dans Layout
import Layout from './components/Layout/Layout'; // Importer le nouveau Layout
import { AuthProvider, useAuth } from './contexts/AuthContext';
import CataloguePage from './pages/CataloguePage';
import ResourceDetailPage from './pages/ResourceDetailPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminResourcesPage from './pages/admin/AdminResourcesPage';
import AdminAddResourcePage from './pages/admin/AdminAddResourcePage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminEditUserPage from './pages/admin/AdminEditUserPage';


function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AdminRouteLayout() {
  const { currentUser } = useAuth();
  if (!currentUser || currentUser.userType !== 'ADMIN') {
    alert("Accès réservé aux administrateurs.");
    return <Navigate to="/dashboard" replace />; 
  }
  return <Outlet />; 
}


function AppContent() {
  // AppContent ne rend plus la Navbar directement
  return (
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route path="/catalogue" element={<CataloguePage />} />
        <Route path="/resources/:resourceId" element={<ResourceDetailPage />} />

        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } 
        />

        <Route path="/admin" element={<AdminRouteLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="resources" element={<AdminResourcesPage />} />
          <Route path="resources/new" element={<AdminAddResourcePage />} />
          <Route path="resources/edit/:resourceId" element={<AdminAddResourcePage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="users/edit/:userId" element={<AdminEditUserPage />} /> 
        </Route>
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout> {/* Envelopper AppContent avec Layout */}
          <AppContent />
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;