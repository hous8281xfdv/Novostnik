import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();
    const { commentId } = req.body;
    const sql = neon(process.env.DATABASE_URL);
    await sql`DELETE FROM comments WHERE id = ${commentId}`;
    res.status(200).json({ success: true });
}
