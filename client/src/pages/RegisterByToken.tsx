import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const RegisterByToken = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  
  const [inviteData, setInviteData] = useState<{role: string, companyId: string} | null>(null);
  const [formData, setFormData] = useState({ phone: '', password: '', name: '' });

  useEffect(() => {
    if (token) {
      axios.get(`/api/registration?token=${token}`)
        .then(res => setInviteData(res.data))
        .catch(err => console.error('Ошибка проверки токена', err));
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/registration', { token, ...formData });
      alert('Регистрация успешна! Теперь вы можете войти.');
      navigate('/');
    } catch (err) {
      console.error(err);
      alert('Ошибка при регистрации');
    }
  };

  if (!inviteData) return <div className="p-10 text-center">Проверка ссылки...</div>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-800">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {inviteData.role === 'master' 
            ? 'Добро пожаловать на страницу регистрации мастера!' 
            : 'Добро пожаловать на страницу регистрации диспетчера!'}
        </h2>
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="text" placeholder="ФИО" required className="border p-2 rounded"
            value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <input type="tel" placeholder="Телефон" required className="border p-2 rounded"
            value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
          <input type="password" placeholder="Пароль" required className="border p-2 rounded"
            value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            Зарегистрироваться
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterByToken;