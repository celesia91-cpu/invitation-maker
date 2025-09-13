-- Migration: add foreign key constraint linking rsvps.customer_id to customers.id
-- Requires that all rsvps rows reference existing customers.

ALTER TABLE rsvps
ADD CONSTRAINT rsvps_customer_id_fkey
FOREIGN KEY (customer_id) REFERENCES customers(id);
