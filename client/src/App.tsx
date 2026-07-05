import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { getSubdomain } from './utils/theme.js';
import TenantMain from './pages/TenantMain.js';
import Dashboard from './pages/Dashboard.js';
import RegisterByToken from './pages/RegisterByToken.js';

function App() {
  const subdomain = getSubdomain();

  // Страница без поддомена (нейтральные цвета)
  if (!subdomain) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center text-gray-800">
        <h1 className="text-3xl font-bold mb-8">Выберите вашу Управляющую Компанию</h1>
        <div className="flex gap-4">
          <a href="http://crocus.localhost:5173" className="px-6 py-3 bg-white border border-gray-300 rounded shadow hover:shadow-md transition">
            УК Crocus (Демо)
          </a>
          <a href="http://meridian.localhost:5173" className="px-6 py-3 bg-white border border-gray-300 rounded shadow hover:shadow-md transition">
            УК Meridian (Демо)
          </a>
        </div>
        {/* СПОРНЫЙ МОМЕНТ: В проде ссылки выше нужно будет поменять на реальные домены */}
      </div>
    );
  }

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<TenantMain subdomain={subdomain} />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/register" element={<RegisterByToken />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;