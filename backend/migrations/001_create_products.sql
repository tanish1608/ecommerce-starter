CREATE TABLE products (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT        NOT NULL,
    description     TEXT        NOT NULL DEFAULT '',
    price_cents     INTEGER     NOT NULL CHECK (price_cents >= 0),
    category        TEXT        NOT NULL,
    brand           TEXT        NOT NULL,
    sku             TEXT        NOT NULL UNIQUE,
    cover_image_url TEXT        NOT NULL DEFAULT '',
    stock           INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
