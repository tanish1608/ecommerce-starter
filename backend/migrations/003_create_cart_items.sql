CREATE TABLE cart_items (
    session_token TEXT    NOT NULL REFERENCES sessions (token) ON DELETE CASCADE,
    product_id    BIGINT  NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    quantity      INTEGER NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (session_token, product_id)
);
