import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { getThemeConfig } from '../utils/theme.js';
import { useAuth } from '../context/AuthContext.js';

const TenantMain = ({ subdomain }: { subdomain: string }) => {
  const theme = getThemeConfig(subdomain);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Стейты форм
  const [meter, setMeter] = useState({ address: '', type: 'water', value: '' });
  const [ticket, setTicket] = useState({ address: '', description: '', type: 'regular' });
  const [authData, setAuthData] = useState({ phone: '', password: '' });

  // СПОРНЫЙ МОМЕНТ: Строка 21 — Цветовые схемы Tailwind UI стилей динамически из утилит.
  // Для Crocus (черный/синий) и Meridian (оранжевый) настроим кнопки и акценты ниже.
  const isCrocus = subdomain === 'crocus';
  const btnStyle = isCrocus 
    ? 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500' 
    : 'bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-500';

  const handleMeterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/meters', { companyId: subdomain, ...meter });
      alert('Показания успешно переданы!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/tickets', { companyId: subdomain, ...ticket });
      alert('Аварийная заявка зарегистрирована!');
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/login', authData);
      if (res.data.success) {
        login(res.data.user); // Передаем конкретно user, а не весь res.data
        navigate('/dashboard');
      }
    } catch (err) {
      alert('Неверный телефон или пароль');
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 ${isCrocus ? 'text-slate-900' : 'text-gray-900'}`}>
      
      {/* Навигационная панель в стиле Tailwind UI */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          
          {/* Логотип-заглушка */}
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-white shadow ${isCrocus ? 'bg-blue-600' : 'bg-orange-500'}`}>
              {subdomain[0]?.toUpperCase()}
            </div>
            <span className="font-bold text-lg tracking-tight">
              УК {subdomain.charAt(0).toUpperCase() + subdomain.slice(1)}
            </span>
          </div>

          {/* Ссылки */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#" className="hover:text-slate-900 transition-colors">Политика конфиденциальности</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Адреса наших домов</a>
          </nav>
          
          {/* Бургер / Кнопка ЛК */}
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)} 
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md text-sm font-medium bg-white hover:bg-slate-50 shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              <span>Личный кабинет</span>
              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Выпадающее меню логина в стиле Tailwind UI */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <h3 className="text-base font-semibold text-slate-900 mb-3">Вход для сотрудников</h3>
                <form onSubmit={handleLogin} className="space-y-3">
                  <div>
                    <input 
                      type="tel" 
                      placeholder="Телефон" 
                      className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 bg-white text-black" 
                      value={authData.phone} 
                      onChange={e => setAuthData({...authData, phone: e.target.value})} 
                      required
                    />
                  </div>
                  <div>
                    <input 
                      type="password" 
                      placeholder="Пароль" 
                      className="w-full text-sm px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 bg-white text-black" 
                      value={authData.password} 
                      onChange={e => setAuthData({...authData, password: e.target.value})} 
                      required
                    />
                  </div>
                  <button 
                    type="submit" 
                    className={`w-full text-sm py-2 px-4 rounded-md font-medium shadow transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${btnStyle}`}
                  >
                    Войти в систему
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Контентная зона */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            Онлайн-сервисы вашей управляющей компании
          </h1>
          <p className="mt-3 max-w-2xl mx-auto text-xl text-slate-500 sm:mt-4">
            Передавайте показания приборов учета и сообщайте об аварийных ситуациях в один клик.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          
          {/* Карточка: Счетчики */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex items-center gap-3 mb-6">
              <div className={`p-2 rounded-lg ${isCrocus ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Передача показаний</h2>
            </div>

            <form onSubmit={handleMeterSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Адрес проживания</label>
                <input 
                  type="text" 
                  placeholder="ул. Ленина, д. 12, кв. 45" 
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:outline-none bg-transparent" 
                  required
                  value={meter.address} 
                  onChange={e => setMeter({...meter, address: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Тип счетчика</label>
                <select 
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:outline-none bg-white"
                  value={meter.type} 
                  onChange={e => setMeter({...meter, type: e.target.value})}
                >
                  <option value="water">Горячее / Холодное водоснабжение</option>
                  <option value="electricity">Электричество</option>
                  <option value="gas">Газ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Текущее значение</label>
                <input 
                  type="number" 
                  placeholder="00000" 
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:outline-none bg-transparent" 
                  required
                  value={meter.value} 
                  onChange={e => setMeter({...meter, value: e.target.value})} 
                />
              </div>

              <button type="submit" className={`w-full py-2.5 px-4 rounded-lg font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${btnStyle}`}>
                Отправить показания
              </button>
            </form>
          </section>

          {/* Карточка: Заявки */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-red-50 text-red-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900">Вызов мастера / Заявка</h2>
            </div>

            <form onSubmit={handleTicketSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Адрес проблемы</label>
                <input 
                  type="text" 
                  placeholder="ул. Ленина, д. 12, кв. 45" 
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:outline-none bg-transparent" 
                  required
                  value={ticket.address} 
                  onChange={e => setTicket({...ticket, address: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Описание ситуации</label>
                <textarea 
                  placeholder="Опишите проблему (например: течет стояк в туалете, искрит розетка...)" 
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:outline-none bg-transparent h-24 resize-none" 
                  required
                  value={ticket.description} 
                  onChange={e => setTicket({...ticket, description: e.target.value})} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Приоритет заявки</label>
                <select 
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:outline-none bg-white"
                  value={ticket.type} 
                  onChange={e => setTicket({...ticket, type: e.target.value})}
                >
                  <option value="regular">Плановая (В порядке очереди)</option>
                  <option value="emergency">🚨 Экстренная (Реагирование до 30 минут)</option>
                </select>
              </div>

              <button type="submit" className="w-full py-2.5 px-4 rounded-lg font-medium shadow-sm transition-all text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500">
                Создать обращение
              </button>
            </form>
          </section>

        </div>
      </main>
    </div>
  );
};

export default TenantMain;