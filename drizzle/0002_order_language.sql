ALTER TABLE orders ADD COLUMN language TEXT NOT NULL DEFAULT 'fr' CHECK(language IN ('fr','en'));
