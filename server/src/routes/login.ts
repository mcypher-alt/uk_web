import { Router } from 'express';
import type { Request, Response }  from 'express';
import bcrypt from 'bcrypt';
import prisma from '../lib/prisma.js';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<any> => {
    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ error: 'Введите номер телефона и пароль' });
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.startsWith('8') && cleanPhone.length === 11) {
        cleanPhone = '7' + cleanPhone.slice(1);
    }

    try {
        const user = await prisma.user.findUnique({
        where: { phone: cleanPhone }
        });

        if (!user) {
        return res.status(401).json({ error: 'Неверный номер телефона или пароль' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
        return res.status(401).json({ error: 'Неверный номер телефона или пароль' });
        }

        const companies = (user.role === 'admin' || user.role === 'dispatcher')
        ? ['crocus', 'meridian'] // Список всех твоих УК
        : [user.companyId];

        return res.json({
        success: true,
        user: {
            id: user.id,
            name: user.name,
            role: user.role,
            companyId: companies
        }
        });
    } catch (error) {
        console.error('Ошибка при авторизации:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

export default router;