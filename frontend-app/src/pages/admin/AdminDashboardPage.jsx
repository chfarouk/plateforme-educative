// src/pages/admin/AdminDashboardPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';

function AdminDashboardPage() {
  return (
    <div>
      <h2>Tableau de Bord Administrateur</h2>
      <ul>
        <li><Link to="/admin/resources">Gérer les Ressources</Link></li>
        {/* Autres liens admin ici */}
      </ul>
    </div>
  );
}
export default AdminDashboardPage;