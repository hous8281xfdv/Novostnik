import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    const { postId } = req.query;
    const sql = neon(process.env.DATABASE_URL);
    const comments = await sql`SELECT * FROM comments WHERE post_id = ${postId} ORDER BY created_at ASC`;
    res.status(200).json(comments);
}
