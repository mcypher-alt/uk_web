import React from 'react';
import { useAuth } from '../context/AuthContext.js';
import { Navigate } from 'react-router-dom';
import MasterDashboard from '../components/MasterDashboard.js';
import DispatcherDashboard from '../components/DispatcherDashboard.js';

const Dashboard = () => {
  const { user, logout } = useAuth();

  if (!user) return <Navigate to="/" />;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-white shadow px-4 py-3 flex justify-between items-center">
        <div>
          <span className="font-bold">{user.name}</span> ({user.role})
        </div>
        <button onClick={logout} className="text-red-500 hover:underline">Выйти</button>
      </header>
      
      {user.role === 'master' ? <MasterDashboard user={user} /> : <DispatcherDashboard user={user} />}
    </div>
  );
};

export default Dashboard;