-- 1. Bảng tài khoản
CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    user_name VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng người mua
CREATE TABLE buyers (
    id SERIAL PRIMARY KEY,
    account_id INTEGER UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, -- Viết gộp cho sạch
    full_name VARCHAR(255) NOT NULL,
    gender VARCHAR(50)
);

-- 3. Bảng người bán
CREATE TABLE sellers (
    id SERIAL PRIMARY KEY,
    account_id INTEGER UNIQUE NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, -- Viết gộp cho sạch
    shop_name VARCHAR(255),
    verify INTEGER DEFAULT 0 CHECK (verify IN (0, 1, 2)),
    description TEXT,
    rate DECIMAL(2,1) DEFAULT 0.0
);

-- 4. Bảng địa chỉ
CREATE TABLE addresses (
    id SERIAL PRIMARY KEY,
    buyer_id INTEGER REFERENCES buyers(id) ON DELETE CASCADE,
    seller_id INTEGER REFERENCES sellers(id) ON DELETE CASCADE,
    address_type VARCHAR(50),
    address_owner_name VARCHAR(150),
    phone VARCHAR(20),
    house_number VARCHAR(100),
    street VARCHAR(150),
    ward VARCHAR(100),
    city VARCHAR(100),
    note TEXT
);

-- 5. Bảng thương hiệu
CREATE TABLE brands (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    made_in VARCHAR(100)
);

-- 6. Bảng danh mục sản phẩm
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL
);

-- 7. Bảng sản phẩm
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    seller_id INTEGER NOT NULL REFERENCES sellers(id) ON DELETE CASCADE, -- Hết bị lỗi nhờ sellers(id) đã có SERIAL PRIMARY KEY
    category_id INTEGER NOT NULL REFERENCES categories(id),
    brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
    favorite_count INTEGER DEFAULT 0,
    description TEXT,
    sold_count INTEGER DEFAULT 0
);

-- 8. Bảng file sản phẩm
CREATE TABLE product_files (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    file_url VARCHAR(255) NOT NULL
);

-- 9. Bảng đánh giá sản phẩm
CREATE TABLE product_reviews (
    id SERIAL PRIMARY KEY,
    content TEXT,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
    rate DECIMAL(2,1) NOT NULL CHECK (rate >= 1.0 AND rate <= 5.0)
);

-- 10. Bảng file đánh giá sản phẩm
CREATE TABLE product_review_files (
    id SERIAL PRIMARY KEY,
    review_id INTEGER NOT NULL REFERENCES product_reviews(id) ON DELETE CASCADE,
    file_url VARCHAR(255) NOT NULL
);

-- 11. Bảng biến thể sản phẩm
CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_name VARCHAR(150) NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url VARCHAR(255)
);

-- 12. Bảng giỏ hàng
CREATE TABLE cart (
    id SERIAL PRIMARY KEY,
    buyer_id INTEGER NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Bảng đơn hàng
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    buyer_id INTEGER NOT NULL REFERENCES buyers(id),
    total_price DECIMAL(12,2) NOT NULL,
    shipping_address TEXT NOT NULL,
    order_status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    payment_method VARCHAR(50),
    discount_amount DECIMAL(12,2) DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Bảng chi tiết đơn hàng
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id INTEGER NOT NULL REFERENCES product_variants(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_purchase DECIMAL(12,2) NOT NULL
);

-- 15. Bảng mã giảm giá
CREATE TABLE discounts (
    id SERIAL PRIMARY KEY,
    discount_code VARCHAR(50) UNIQUE NOT NULL,
    voucher_type VARCHAR(50) NOT NULL,
    value DECIMAL(12,2) NOT NULL,
    minimum_order_value DECIMAL(12,2) DEFAULT 0.0,
    maximum_discount DECIMAL(12,2),
    start_date TIMESTAMP NOT NULL,
    expired_date TIMESTAMP NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 0),
    seller_id INTEGER REFERENCES sellers(id) ON DELETE CASCADE
);

-- 16. Bảng mã giảm giá của người mua
CREATE TABLE buyer_discounts (
    id SERIAL PRIMARY KEY,
    buyer_id INTEGER NOT NULL REFERENCES buyers(id) ON DELETE CASCADE,
    discount_id INTEGER NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    is_used BOOLEAN DEFAULT FALSE,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);