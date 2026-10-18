CREATE TABLE catalogue_documents (id INTEGER PRIMARY KEY CHECK(id=1), revision TEXT NOT NULL, document TEXT NOT NULL);
--> statement-breakpoint
CREATE TABLE inventory (product_id TEXT PRIMARY KEY, quantity INTEGER CHECK(quantity IS NULL OR quantity>=0), demo INTEGER NOT NULL DEFAULT 0);
--> statement-breakpoint
CREATE TABLE orders (id TEXT PRIMARY KEY, reference TEXT NOT NULL UNIQUE, token_hash TEXT NOT NULL UNIQUE, request_key TEXT NOT NULL UNIQUE, request_hash TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','preparing','ready','shipping','completed','cancelled')), version INTEGER NOT NULL DEFAULT 1, customer TEXT NOT NULL, items TEXT NOT NULL, custom TEXT, delivery_fee INTEGER CHECK(delivery_fee IS NULL OR delivery_fee>=0), custom_price INTEGER CHECK(custom_price IS NULL OR custom_price>=0), agreed_date TEXT, customer_agreed INTEGER NOT NULL DEFAULT 0, internal_note TEXT NOT NULL DEFAULT '', cancellation_reason TEXT NOT NULL DEFAULT '', paid_amount INTEGER NOT NULL DEFAULT 0 CHECK(paid_amount>=0), payment_method TEXT CHECK(payment_method IS NULL OR payment_method IN ('Orange Money','Wave')), pdf_key TEXT, photo_key TEXT);
--> statement-breakpoint
CREATE TABLE order_lines (order_id TEXT NOT NULL REFERENCES orders(id), product_id TEXT NOT NULL, quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 99), PRIMARY KEY(order_id,product_id));
--> statement-breakpoint
CREATE TABLE order_events (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL REFERENCES orders(id), created_at TEXT NOT NULL, actor TEXT NOT NULL, summary TEXT NOT NULL);
--> statement-breakpoint
CREATE INDEX orders_created ON orders(created_at);
--> statement-breakpoint
CREATE INDEX orders_status_date ON orders(status,created_at);
--> statement-breakpoint
CREATE INDEX events_order ON order_events(order_id,id);
--> statement-breakpoint
CREATE TRIGGER reserve_order BEFORE UPDATE OF status ON orders WHEN OLD.status='pending' AND NEW.status='confirmed' BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM order_lines l LEFT JOIN inventory i ON i.product_id=l.product_id WHERE l.order_id=NEW.id AND (i.quantity IS NULL OR i.quantity<l.quantity)) THEN RAISE(ABORT,'STOCK_INSUFFISANT') END;
 UPDATE inventory SET quantity=quantity-(SELECT quantity FROM order_lines WHERE order_id=NEW.id AND product_id=inventory.product_id) WHERE product_id IN (SELECT product_id FROM order_lines WHERE order_id=NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER release_order AFTER UPDATE OF status ON orders WHEN NEW.status='cancelled' AND OLD.status IN ('confirmed','preparing','ready','shipping') BEGIN
 UPDATE inventory SET quantity=quantity+(SELECT quantity FROM order_lines WHERE order_id=NEW.id AND product_id=inventory.product_id) WHERE product_id IN (SELECT product_id FROM order_lines WHERE order_id=NEW.id);
END;

