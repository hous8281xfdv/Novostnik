import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { phone, password } = req.body;
    const sql = neon(process.env.DATABASE_URL);
    const [user] = await sql`SELECT id, name, phone FROM users WHERE phone = ${phone} AND password = ${password}`;
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.status(200).json(user);
}
