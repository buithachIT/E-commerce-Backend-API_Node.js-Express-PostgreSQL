CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    user_name VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    email_verify_token VARCHAR(255),
    email_verify_expires TIMESTAMPTZ,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMPTZ,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE key_stores (
    id SERIAL PRIMARY KEY,
    account_id INTEGER UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    refresh_token VARCHAR(255),
    refresh_tokens_used VARCHAR(255)[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE key_permission AS ENUM ('0000', '1111', '2222');

CREATE TABLE IF NOT EXISTS api_keys (
    id SERIAL PRIMARY KEY,
    key VARCHAR(255) NOT NULL UNIQUE,
    status BOOLEAN DEFAULT TRUE,
    
    permissions key_permission[] NOT NULL, 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Default API key for local / Docker (permission 0000 = full access in this project)
INSERT INTO api_keys (key, status, permissions)
VALUES (
  'ead7995a27c5e17ec3dea9eb99794effb22e1e51d8f54771a258abce99f381677400f788f42b3ade31aae8dcf42e9d6b51238e3dfd1154bc2cb285b2d70d6b8e',
  TRUE,
  ARRAY['0000']::key_permission[]
)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY,                               
    product_name VARCHAR(255) NOT NULL,                 
    product_thumb VARCHAR(255) NOT NULL,                 
    product_description TEXT,                            
    product_price DECIMAL(12, 2) NOT NULL,               
    product_quantity INTEGER NOT NULL DEFAULT 0,       
    product_type VARCHAR(50) NOT NULL,                   
    product_shop INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,                       
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE electronics_products (
    id UUID PRIMARY KEY,
    manufacturer VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    product_shop INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    color VARCHAR(50) NOT NULL
);

CREATE TABLE clothing_products (
    id UUID PRIMARY KEY,
    brand VARCHAR(100) NOT NULL,
    size VARCHAR(50) NOT NULL,
    product_shop INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    material VARCHAR(100) NOT NULL
);

CREATE TABLE inventories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inven_product_id UUID NOT NULL,     
    inven_location VARCHAR(255) DEFAULT 'unKnow',
    inven_stock INT NOT NULL DEFAULT 0 CHECK (inven_stock >= 0), 
    inven_shop_id INTEGER NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_inventory_product FOREIGN KEY (inven_product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_shop FOREIGN KEY (inven_shop_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX idx_inventory_product_shop ON inventories(inven_product_id, inven_shop_id);
 
CREATE TABLE inventory_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventory_id UUID NOT NULL,  
    cart_id UUID NOT NULL,
    num_stock INT NOT NULL CHECK (num_stock > 0),
    created_on TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT fk_reservation_inventory FOREIGN KEY (inventory_id) REFERENCES inventories(id) ON DELETE CASCADE
);

CREATE INDEX idx_reservation_cart ON inventory_reservations(cart_id);

CREATE TABLE discounts (
    id SERIAL PRIMARY KEY,
    discount_name VARCHAR(255) NOT NULL,
    discount_description TEXT,
    discount_type VARCHAR(50) NOT NULL DEFAULT 'fixed_amount',
    discount_value DECIMAL(12, 2) NOT NULL CHECK (discount_value >= 0),
    discount_code VARCHAR(50) UNIQUE NOT NULL,
    discount_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    discount_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    discount_max_uses INT NOT NULL DEFAULT 0 CHECK (discount_max_uses >= 0),
    discount_used_count INT NOT NULL DEFAULT 0 CHECK (discount_used_count >= 0),
    discount_users_used VARCHAR(255)[] DEFAULT '{}',
    discount_max_uses_per_user INT NOT NULL DEFAULT 0 CHECK (discount_max_uses_per_user >= 0),
    discount_min_order_value DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (discount_min_order_value >= 0),
    discount_max_value DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (discount_max_value >= 0),
    discount_shopId INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    discount_is_active BOOLEAN DEFAULT TRUE,
    discount_apply_to VARCHAR(255) NOT NULL DEFAULT 'all' CHECK (discount_apply_to IN ('all', 'specific')),
    discount_product_ids UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


CREATE TABLE cart (
    id SERIAL PRIMARY KEY,
    cart_userid VARCHAR(255) NOT NULL UNIQUE,  
    cart_state VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (cart_state IN ('active', 'completed', 'failed', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INT NOT NULL REFERENCES cart(id) ON DELETE CASCADE,  
    product_id UUID NOT NULL, 
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),  
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_cart_product UNIQUE (cart_id, product_id) 
);
CREATE INDEX idx_cart_userid ON cart(cart_userid);

-- Model B: 1 shop = 1 order (see docs/migrations/002_orders.sql)
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_user_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  order_shop_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  order_cart_id INTEGER REFERENCES cart(id) ON DELETE SET NULL,

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