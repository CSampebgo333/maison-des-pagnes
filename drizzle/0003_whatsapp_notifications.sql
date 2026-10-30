ALTER TABLE orders ADD COLUMN whatsapp_opt_in INTEGER NOT NULL DEFAULT 0 CHECK(whatsapp_opt_in IN (0,1));
--> statement-breakpoint
ALTER TABLE orders ADD COLUMN whatsapp_consent_at TEXT;
--> statement-breakpoint
CREATE TABLE order_notifications (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 order_id TEXT NOT NULL REFERENCES orders(id),
 version INTEGER NOT NULL,
 recipient TEXT NOT NULL,
 payload TEXT NOT NULL,
 created_at TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','sending','submitted','failed','uncertain','suppressed')),
 attempts INTEGER NOT NULL DEFAULT 0,
 available_at INTEGER NOT NULL DEFAULT 0,
 claimed_at INTEGER,
 message_id TEXT,
 error_code TEXT,
 UNIQUE(order_id,version)
);
--> statement-breakpoint
CREATE INDEX notifications_pending ON order_notifications(state,available_at,id);
--> statement-breakpoint
CREATE TRIGGER notify_order_created AFTER INSERT ON orders WHEN NEW.whatsapp_opt_in=1 BEGIN
 INSERT INTO order_notifications(order_id,version,recipient,payload,created_at) VALUES(NEW.id,NEW.version,json_extract(NEW.customer,'$.phone'),json_object('reference',NEW.reference,'language',NEW.language,'status',NEW.status,'mode',json_extract(NEW.customer,'$.mode'),'agreed_date',NEW.agreed_date,'delivery_fee',NEW.delivery_fee,'custom_price',NEW.custom_price,'custom',NEW.custom,'items',json(NEW.items),'paid_amount',NEW.paid_amount),NEW.created_at);
END;
--> statement-breakpoint
CREATE TRIGGER notify_order_updated AFTER UPDATE ON orders WHEN NEW.whatsapp_opt_in=1 AND (
 NEW.status IS NOT OLD.status OR NEW.delivery_fee IS NOT OLD.delivery_fee OR NEW.custom_price IS NOT OLD.custom_price OR NEW.agreed_date IS NOT OLD.agreed_date OR NEW.paid_amount IS NOT OLD.paid_amount OR NEW.payment_method IS NOT OLD.payment_method
) BEGIN
 INSERT INTO order_notifications(order_id,version,recipient,payload,created_at) VALUES(NEW.id,NEW.version,json_extract(NEW.customer,'$.phone'),json_object('reference',NEW.reference,'language',NEW.language,'status',NEW.status,'mode',json_extract(NEW.customer,'$.mode'),'agreed_date',NEW.agreed_date,'delivery_fee',NEW.delivery_fee,'custom_price',NEW.custom_price,'custom',NEW.custom,'items',json(NEW.items),'paid_amount',NEW.paid_amount),NEW.updated_at);
END;
--> statement-breakpoint
CREATE TRIGGER stop_order_notifications AFTER UPDATE OF whatsapp_opt_in ON orders WHEN NEW.whatsapp_opt_in=0 BEGIN
 UPDATE order_notifications SET state='suppressed' WHERE order_id=NEW.id AND state='pending';
END;
