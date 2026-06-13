import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    const sql = neon(process.env.DATABASE_URL);
    const pending = await sql`SELECT * FROM pending_posts ORDER BY created_at DESC`;
    res.status(200).json(pending);
}
