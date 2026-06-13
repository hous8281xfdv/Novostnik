import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    const sql = neon(process.env.DATABASE_URL);
    const posts = await sql`
        SELECT p.*, 
               COALESCE(l.like_count, 0) as like_count,
               COALESCE(c.comment_count, 0) as comment_count
        FROM posts p
        LEFT JOIN (SELECT post_id, COUNT(*) as like_count FROM likes GROUP BY post_id) l ON p.id = l.post_id
        LEFT JOIN (SELECT post_id, COUNT(*) as comment_count FROM comments GROUP BY post_id) c ON p.id = c.post_id
        WHERE p.status = 'approved'
        ORDER BY p.created_at DESC
    `;
    res.status(200).json(posts);
}
