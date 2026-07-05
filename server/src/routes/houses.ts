import { Router } from 'express';
import type { Request, Response } from 'express';
import prisma from '../lib/prisma.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<any> => {
    const { companyId } = req.query;

    if (!companyId) {
        return res.status(400).json({ error: 'Параметр companyId обязателен' });
    }

    try {
        const houses = await prisma.house.findMany({
            where: { companyId: String(companyId) },
            orderBy: { address: 'asc' } // Сортируем по алфавиту, чтобы жильцам было удобно искать
        });

        // Возвращаем просто массив строк с адресами, так фронту будет легче
        const addressList = houses.map(h => h.address);
        return res.json({ addresses: addressList });
    } catch (error) {
        console.error('Ошибка при получении списка домов:', error);
        return res.status(500).json({ error: 'Ошибка сервера' });
    }
});

router.post('/', async (req: Request, res: Response): Promise<any> => {
    const { address, companyId } = req.body;

    if (!address || !companyId) {
        return res.status(400).json({ error: 'Необходимо передать address и companyId' });
    }

    try {
        // Проверяем, нет ли уже такого дома в этой УК
        const existingHouse = await prisma.house.findUnique({
            where: {
                address_companyId: {
                    address: String(address).trim(),
                    companyId: String(companyId)
                }
            }
        });

        if (existingHouse) {
            return res.status(400).json({ error: 'Этот адрес уже зарегистрирован в данной УК' });
        }

        // Создаем новый дом
        const newHouse = await prisma.house.create({
            data: {
                address: String(address).trim(),
                companyId: String(companyId)
            }
        });

        return res.status(201).json({ success: true, house: newHouse });
    } catch (error) {
        console.error('Ошибка при создании дома:', error);
        return res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
});

export default router;