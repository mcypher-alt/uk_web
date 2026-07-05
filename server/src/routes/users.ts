import { Router } from 'express';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js'; 

const router = Router();

router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, role, companyId } = req.body;

        if (!name || !companyId) {
            res.status(400).json({ error: 'Имя сотрудника и companyId обязательны' });
            return;
        }

        const newUser = await prisma.user.create({
            data: {
                name: String(name),
                role: role || 'MASTER', // Если роль не передали, по дефолту ставим MASTER
                companyId: String(companyId),
                phone: '',
                password: ''
            }
        });

        res.status(201).json({ user: newUser });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Не удалось создать сотрудника' });
    }
});

// GET /api/users/masters?companyId=...
router.get('/masters', async (req: Request, res: Response): Promise<any> => {
    const { companyId } = req.query;

    if (!companyId) {
        return res.status(400).json({ error: 'companyId обязателен' });
    }

    try {
        const masters = await prisma.user.findMany({
            where: {
                companyId: String(companyId),
                role: 'master' // Тянем только мастеров, диспетчеров назначать на трубы не нужно
            },
            select: {
                id: true,
                name: true,
                phone: true
            }
        });

        return res.json({ masters });
    } catch (error) {
        console.error('Ошибка при получении списка мастеров:', error);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.get('/:id/workload', async (req: Request, res: Response) => {
    try {
        const masterId = parseInt(req.params.id as string);
        const { companyId } = req.query;

        if (isNaN(masterId) || !companyId) {
        res.status(400).json({ error: 'Некорректные параметры запроса' });
        return;
        }

        const master = await prisma.user.findFirst({
            where: {
                id: masterId,
                companyId: String(companyId)
            }
        });

        if (!master) {
        res.status(404).json({ error: 'Мастер не найден в вашей управляющей компании' });
        return;
    }

    const activeTicketsCount = await prisma.ticket.count({
        where: {
            masterId: masterId,
            status: { in: ['new', 'in_work'] }
        }
    });

    res.json({
        hasActiveTickets: activeTicketsCount > 0,
        count: activeTicketsCount
    });

    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера при проверке нагрузки мастера' });
    }
})

export default router;