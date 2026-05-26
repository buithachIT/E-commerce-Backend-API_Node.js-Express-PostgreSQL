"use strict ";

const { BadRequestError } = require("../core/error.response");
const instancePostgres = require("../dbs/init.postgres");
//Áp dụng factory pattern cho product service

//define Factory class to create product
class ProductFactory {
  static async createProduct(type, payload) {
    return new DynamicProduct({
      ...payload,
      product_type: type,
    }).createProduct();
  }
}
/*
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,                                
    product_name VARCHAR(255) NOT NULL,                   
    product_thumb VARCHAR(255) NOT NULL,                  
    product_description TEXT,                            
    product_price DECIMAL(12, 2) NOT NULL,            
    product_quantity INTEGER NOT NULL DEFAULT 0,         
    product_type VARCHAR(50) NOT NULL,                  
    seller_id INTEGER NOT NULL,                         
    
    product_attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Các chỉ số phụ để làm tính năng sort/gợi ý như Shopee
    favorite_count INTEGER NOT NULL DEFAULT 0,
    sold_count INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


*/
//Define base class for product
class Product {
  constructor({
    product_name,
    product_thumb,
    product_description,
    product_price,
    product_quantity,
    product_type,
    seller_id,
    category_id,
    product_attributes,
  }) {
    this.product_name = product_name;
    this.product_thumb = product_thumb;
    this.product_description = product_description;
    this.product_price = product_price;
    this.product_quantity = product_quantity;
    this.product_type = product_type;
    this.seller_id = seller_id;
    this.category_id = category_id;
    this.product_attributes = product_attributes;
  }
  //create new product
  async createProduct() {
    const pool = instancePostgres.pool;
    const createProductQuery = `
      INSERT INTO products (
        product_name, 
        product_thumb, 
        product_description, 
        product_price, 
        product_quantity, 
        product_type, 
        seller_id, 
        category_id,
        product_attributes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *
    `;

    const values = [
      this.product_name,
      this.product_thumb,
      this.product_description,
      this.product_price,
      this.product_quantity,
      this.product_type,
      this.seller_id,
      this.category_id,
      JSON.stringify(this.product_attributes),
    ];

    const result = await pool.query(createProductQuery, values);
    return result.rows[0];
  }
}
class DynamicProduct extends Product {
  async createProduct() {
    const pool = instancePostgres.pool;
    if (!this.category_id) {
      throw new BadRequestError("Missing category_id in request payload!");
    }
    const categoryQuery = `SELECT required_attributes FROM categories WHERE id = $1`;
    const categoryResult = await pool.query(categoryQuery, [this.category_id]);
    console.log(`categoryResult: `, categoryResult.rows[0]);
    if (categoryResult.rows.length === 0) {
      throw new BadRequestError("Category not found!");
    }

    const requiredAttributes = categoryResult.rows[0].required_attributes;
    if (requiredAttributes && requiredAttributes.length > 0) {
      for (const attr of requiredAttributes) {
        if (!this.product_attributes.hasOwnProperty(attr)) {
          throw new BadRequestError(`Missing required attribute: ${attr}`);
        }
      }
    }
    return super.createProduct();
  }
}
module.exports = {
  ProductFactory,
  DynamicProduct,
};
