import { q, done } from './scripts/검증/q.mjs'
await q(`UPDATE notices SET short_title=$2 WHERE id=$1`,['c8c10df8-dc5f-4dd7-8640-34ee5417d7ec', process.argv[2]])
await done()
