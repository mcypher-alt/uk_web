import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { User } from './types.ts';
import LoginScreen from './screens/LoginScreen.js';
import RegisterScreen from './screens/RegisterScreen.js';
import DispatcherDashboard from './screens/DispatcherDashboard.js';
import MasterDashboard from './screens/MasterDashboard.js';
import { authApi } from './api/index.js';

const queryClient = new QueryClient();

const getInviteParams = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  return { token };
};

export default function App() {
  // 1. Инициализируем юзера как null (никакого localStorage)
  const [user, setUser] = useState<User | null>(null);
  
  // 2. Флаг загрузки, чтобы дождаться ответа от бэкенда
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // Тему оставляем в localStorage
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const [inviteParams] = useState(() => getInviteParams());
  const [isRegistering, setIsRegistering] = useState(!!inviteParams.token);

  // 3. Проверка сессии при запуске приложения через authApi
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await authApi.getMe();
        if (response.authenticated) {
          setUser(response.user);
        }
      } catch (error) {
        // Ошибка (например, 401) означает, что куки нет или она невалидна
        setUser(null);
      } finally {
        setIsAuthLoading(false); // Выключаем спиннер загрузки
      }
    };

    checkSession();
  }, []);

  // Переключение темы
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Обновление стейта после успешного входа
  const handleLogin = (loggedUser: User) => {
    setUser(loggedUser);
  };

  // 4. Асинхронный логаут через authApi
  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    } finally {
      setUser(null);
    }
  };

  // Показываем загрузочный экран, пока бэкенд проверяет куку
  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
        <div className="text-xl font-medium animate-pulse">Загрузка...</div>
      </div>
    );
  }

  // Роутинг для неавторизованных пользователей (регистрация или логин)
  if (!user) {
    if (isRegistering && inviteParams.token) {
      return (
        <RegisterScreen 
          token={inviteParams.token} 
          onRegisterSuccess={() => {
            setIsRegistering(false);
            window.history.replaceState({}, document.title, window.location.pathname);
          }}
        />
      );
    }

    return <LoginScreen onLogin={handleLogin} />;
  }

  // Основной интерфейс для авторизованных пользователей
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
        <header className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
          <h1 className="text-xl font-bold">
            Здравствуйте, {user.name}
          </h1>
          
          <div className="flex gap-4 items-center">
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-lg hover:scale-105 active:scale-95 transition-all"
              title="Переключить тему"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            
            <button 
              onClick={handleLogout} 
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium transition-colors hover:bg-red-700"
            >
              Выйти
            </button>
          </div>
        </header>

        <main className="p-4">
          {(user.role === 'dispatcher' || user.role === 'admin') && <DispatcherDashboard user={user} />}
          {user.role === 'master' && <MasterDashboard user={user} />}
        </main>
      </div>
    </QueryClientProvider>
  );
}