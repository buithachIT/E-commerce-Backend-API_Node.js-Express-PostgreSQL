CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    user_name VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

create table key_stores (
    id SERIAL PRIMARY KEY,
    account_id INTEGER UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    public_key TEXT NOT NULL,
    private_key TEXT NOT NULL,
    refresh_token VARCHAR(255),
    refresh_token_used VARCHAR(255)[] DEFAULT '{}',
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
