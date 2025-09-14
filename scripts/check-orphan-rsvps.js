import { Client } from 'pg';

async function main() {
  const purge = process.argv.includes('--purge');
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const orphanQuery = `
    SELECT r.*
    FROM rsvps r
    LEFT JOIN customers c ON r.customer_id = c.id
    WHERE c.id IS NULL;
  `;
  const { rows } = await client.query(orphanQuery);
  if (rows.length === 0) {
    console.log('No orphan RSVPs found.');
  } else {
    console.log(`Found ${rows.length} orphan RSVP(s):`);
    console.table(rows);
    if (purge) {
      const del = await client.query(
        'DELETE FROM rsvps WHERE customer_id NOT IN (SELECT id FROM customers);'
      );
      console.log(`Deleted ${del.rowCount} orphan RSVP(s).`);
    } else {
      console.log('Run again with --purge to delete these rows.');
    }
  }
  await client.end();
}

main().catch((err) => {
  console.error('Integrity check failed:', err);
  process.exit(1);
});
