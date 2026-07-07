import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { User } from './types.ts';
import LoginScreen from './screens/LoginScreen.js';
import RegisterScreen from './screens/RegisterScreen.js';
import DispatcherDashboard from './screens/DispatcherDashboard.js';
import MasterDashboard from './screens/MasterDashboard.js';

const queryClient = new QueryClient();

const getInviteParams = () => {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  return { token };
};

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user_session');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // Инициализируем тему: проверяем localStorage, если там пусто — ставим светлую 'light' по умолчанию
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const [inviteParams] = useState(() => getInviteParams());

  const [isRegistering, setIsRegistering] = useState(!!inviteParams.token);

  // Железобетонное переключение темы через глобальный DOM
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    // Сохраняем выбор пользователя, чтобы при перезагрузке тема не слетала
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleLogin = (loggedUser: User) => {
    localStorage.setItem('user_session', JSON.stringify(loggedUser));
    setUser(loggedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    setUser(null);
  };

 if (!user) {
    // Если в URL есть токен инвайта — открываем регистрацию
    if (isRegistering && inviteParams.token) {
      return (
        <RegisterScreen 
          token={inviteParams.token} 
          onRegisterSuccess={() => {
            setIsRegistering(false);
            // Чистим URL от токена, чтобы при F5 не швыряло опять на регистрацию
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Опционально: если бэк при успешной регистрации сразу сессию не возвращает, 
            // то юзер просто увидит чистый экран логина и введет пароль. Это ок.
            alert('Регистрация успешна! Теперь вы можете войти в систему.');
          }}
        />
      );
    }

    // Если токена нет — обычный экран логина
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* bg-white dark:bg-gray-900 теперь отработает идеально, 
        потому что класс 'dark' сидит на самом теге <html>
      */}
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-200">
        <header className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
          <h1 className="text-xl font-bold">
            Здравствуйте, {user.name} ({user.role === 'admin' ? 'Админ' : user.role})
          </h1>
          
          <div className="flex gap-4 items-center">
            {/* Кнопка переключения темы */}
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-lg hover:scale-105 active:scale-95 transition-all"
              title="Переключить тему"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            
            <button onClick={handleLogout} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium transition-colors">
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