-- Run once on existing databases (local / VPS)
-- Model B: 1 shop = 1 order (Shopee-style order entity)
-- Requires: accounts, cart, products tables already exist
-- Requires: gen_random_uuid() (PostgreSQL 13+ or pgcrypto)

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_user_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  order_shop_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  order_cart_id INTEGER REFERENCES cart(id) ON DELETE SET NULL,

  -- Snapshot from checkout review (do not recompute for invoices)
  -- e.g. { "totalPrice", "totalDiscount", "totalCheckout", "feeShip", "shop_discounts" }
  order_checkout JSONB NOT NULL DEFAULT '{}'::jsonb,
  order_shipping JSONB DEFAULT '{}'::jsonb,
  order_payment JSONB DEFAULT '{}'::jsonb,

  order_status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (order_status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  -- Price/name snapshot at purchase time
  product_name VARCHAR(255) NOT NULL,
  product_price DECIMAL(12, 2) NOT NULL CHECK (product_price >= 0),
  quantity INT NOT NULL CHECK (quantity > 0),
  total_price DECIMAL(12, 2) NOT NULL CHECK (total_price >= 0),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(order_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop ON orders(order_shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);
