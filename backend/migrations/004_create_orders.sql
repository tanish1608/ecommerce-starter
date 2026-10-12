CREATE TABLE orders (
    id            BIGSERIAL   PRIMARY KEY,
    session_token TEXT        NOT NULL,
    total_cents   INTEGER     NOT NULL CHECK (total_cents >= 0),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
