import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Метод не разрешён' });
    }

    const { phone, password } = req.body;

    if (!phone || !password) {
        return res.status(400).json({ error: 'Телефон и пароль обязательны' });
    }

    try {
        const sql = neon(process.env.DATABASE_URL);
        
        const [user] = await sql`
            SELECT id, name, phone FROM users 
            WHERE phone = ${phone} AND password = ${password}
        `;

        if (!user) {
            return res.status(401).json({ error: 'Неверный телефон или пароль' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Ошибка:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
}
