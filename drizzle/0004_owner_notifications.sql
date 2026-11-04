-- Durable owner alerts are separate from optional customer updates.
CREATE TABLE owner_notifications (
 order_id TEXT PRIMARY KEY REFERENCES orders(id),
 reference TEXT NOT NULL,
 created_at TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','submitted','failed','uncertain')),
 attempts INTEGER NOT NULL DEFAULT 0,
 available_at INTEGER NOT NULL DEFAULT 0,
 claimed_at INTEGER,
 message_id TEXT,
 error_code TEXT
);
--> statement-breakpoint
CREATE INDEX owner_notifications_pending ON owner_notifications(state,available_at);
