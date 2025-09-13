import { Client } from 'pg';

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const result = await client.query(
    'DELETE FROM rsvps WHERE customer_id NOT IN (SELECT id FROM customers);'
  );
  console.log(`Deleted ${result.rowCount} orphan RSVP(s).`);
  await client.end();
}

main().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
