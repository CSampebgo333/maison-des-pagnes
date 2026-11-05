-- Private management estimates; no payment or change to customer order totals.
CREATE TABLE order_costs (
 order_id TEXT PRIMARY KEY NOT NULL REFERENCES orders(id),
 production_cost INTEGER CHECK(production_cost IS NULL OR production_cost BETWEEN 0 AND 100000000),
 delivery_cost INTEGER CHECK(delivery_cost IS NULL OR delivery_cost BETWEEN 0 AND 100000000),
 other_cost INTEGER NOT NULL DEFAULT 0 CHECK(other_cost BETWEEN 0 AND 100000000),
 note TEXT NOT NULL DEFAULT '' CHECK(length(note)<=500),
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1),
 updated_at TEXT NOT NULL
);
