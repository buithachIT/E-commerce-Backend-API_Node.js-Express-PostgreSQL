"use strict ";

const { BadRequestError } = require("../core/error.response");
const { pool } = require("../dbs/init.postgres");
const { v7: uuidv7 } = require("uuid");
const slugify = require("slugify");
const {
  findAllPublishedProductByShop,
  findAllDraftProductByShop,
  publishProductByShop,
  unPublishProductByShop,
  searchProductByUser,
  findAllProducts,
  updateProductRepo,
  updateElectronicsRepo,
  updateClothingRepo,
} = require("../models/repositories/product.repo");
const { runInTransaction } = require("../helpers/async-handler");
const { insertInventory } = require("../models/repositories/inventory.repo");

class ProductFactory {
  static productRegistry = {};

  static registerProductType(type, classRef) {
    ProductFactory.productRegistry[type] = classRef;
  }

  static async createProduct(type, payload) {
    const productClass = ProductFactory.productRegistry[type];
    const globalProductId = uuidv7();
    if (!productClass)
      throw new BadRequestError(`Invalid product type: ${type}`);
    return await new productClass(payload).createProduct({
      product_id: globalProductId,
    });
  }

  // PUT //
  static async publishProductByShop({ product_shop, product_id }) {
    return await publishProductByShop({
      product_shop: product_shop,
      product_id: product_id,
    });
  }

  static async unPublishProductByShop({ product_shop, product_id }) {
    return await unPublishProductByShop({
      product_shop: product_shop,
      product_id: product_id,
    });
  }
  static async updateProduct(type, productId, payload) {
    console.log("check", type, productId, payload);
    const productClass = ProductFactory.productRegistry[type];
    if (!productClass)
      throw new BadRequestError(`Invalid product type: ${type}`);

    return await new productClass({}).updateProduct({
      productId,
      payload,
    });
  }
  // END PUT //

  // QUERY //
  static async findAllDraftForShop({ product_shop, limit = 50, skip = 0 }) {
    const query = { product_shop, is_draft: true, is_published: false };
    return await findAllDraftProductByShop({ query, limit, skip });
  }

  static async findAllPublishedForShop({ product_shop, limit = 50, skip = 0 }) {
    const query = { product_shop, is_published: true, is_draft: false };
    return await findAllPublishedProductByShop({ query, limit, skip });
  }

  static async getListProducts({ keySearch }) {
    return await searchProductByUser({ keySearch });
  }

  static async findAllProducts({
    limit = 50,
    sort = "ctime",
    page = 1,
    filter = { is_published: true },
  }) {
    return await findAllProducts({
      limit,
      sort,
      page,
      filter,
      select: ["id", "product_name", "product_price", "product_thumb"],
    });
  }

  static async findProducts({ keySearch }) {
    return await searchProductByUser({ keySearch });
  }

  // END QUERY //
}

//Define base class for product
class Product {
  constructor({
    product_name,
    product_thumb,
    product_description,
    product_price,
    product_slug,
    product_ratings_average,
    is_draft,
    is_published,
    product_quantity,
    product_type,
    product_shop,
    product_attributes,
    product_attributes_id,
  } = {}) {
    const targetSlug = product_slug || product_name;
    this.product_slug = targetSlug ? slugify(targetSlug, { lower: true }) : "";
    this.product_name = product_name;
    this.product_thumb = product_thumb;
    this.product_description = product_description;
    this.product_price = product_price;
    this.product_ratings_average = product_ratings_average;
    this.is_draft = is_draft;
    this.is_published = is_published;
    this.product_quantity = product_quantity;
    this.product_type = product_type;
    this.product_shop = product_shop;
    this.product_attributes = product_attributes;
    this.product_attributes_id = null;
  }
  //create new product
  async createProduct({ product_id, client }) {
    const createProductQuery = `
      INSERT INTO products (
        id,
        product_name, 
        product_thumb, 
        product_description, 
        product_price, 
        product_slug, 
        product_ratings_average, 
        is_draft, 
        is_published,
        product_quantity, 
        product_type, 
        product_shop
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *
    `;

    const values = [
      product_id,
      this.product_name,
      this.product_thumb,
      this.product_description,
      this.product_price,
      this.product_slug,
      this.product_ratings_average,
      this.is_draft,
      this.is_published,
      this.product_quantity,
      this.product_type,
      this.product_shop,
    ];

    const result = await client.query(createProductQuery, values);
    if (result.rows && result.rows.length > 0) {
      await insertInventory({
        client: client,
        inven_product_id: result.rows[0].id,
        inven_shop_id: this.product_shop,
        inven_stock: this.product_quantity,
        inven_location: "Default Warehouse",
      });
    }
    return result.rows[0];
  }
  //update product
  async updateProduct({ productId, payload, client }) {
    return await updateProductRepo({ productId, payload, client });
  }
}

class ElectronicsProduct extends Product {
  async createProduct({ product_id }) {
    return await runInTransaction(pool, async (client) => {
      const createElectronicsProductQuery = `
      INSERT INTO electronics_products (id, manufacturer, model, color, product_shop) 
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `;
      const electronicsValues = [
        product_id,
        this.product_attributes.manufacturer,
        this.product_attributes.model,
        this.product_attributes.color,
        this.product_shop,
      ];
      const electronicsResult = await client.query(
        createElectronicsProductQuery,
        electronicsValues,
      );
      if (!electronicsResult.rows || electronicsResult.rows.length === 0) {
        throw new BadRequestError("Create electronics product details failed!");
      }

      const newProduct = await super.createProduct({
        product_id,
        client,
      });
      if (!newProduct) {
        throw new BadRequestError("Create product failed!");
      }
      return newProduct;
    });
  }
  async updateProduct({ productId, payload }) {
    return await runInTransaction(pool, async (client) => {
      let updatedElectronics = null;

      if (payload.product_attributes) {
        updatedElectronics = await updateElectronicsRepo({
          productId,
          payload: payload.product_attributes,
          client,
        });
      }

      const updatedParent = await super.updateProduct({
        productId,
        payload,
        client,
      });

      if (!updatedParent && !updatedElectronics) {
        throw new BadRequestError("Invalid data!");
      }

      return {
        ...updatedParent,
        product_attributes: updatedElectronics,
      };
    });
  }
}
class ClothingProduct extends Product {
  async createProduct({ product_id }) {
    return await runInTransaction(pool, async (client) => {
      const createClothingProductQuery = `
        INSERT INTO clothing_products (id, brand, size, material, product_shop) 
        VALUES ($1, $2, $3, $4, $5) RETURNING *;
      `;
      const clothingValues = [
        product_id,
        this.product_attributes.brand,
        this.product_attributes.size,
        this.product_attributes.material,
        this.product_shop,
      ];

      const clothingResult = await client.query(
        createClothingProductQuery,
        clothingValues,
      );
      if (!clothingResult.rows || clothingResult.rows.length === 0) {
        throw new BadRequestError("Create clothing product details failed!");
      }

      const newProduct = await super.createProduct({
        product_id,
        client,
      });
      if (!newProduct) {
        throw new BadRequestError("Create product failed!");
      }
      return newProduct;
    });
  }
  async updateProduct({ productId, payload }) {
    return await runInTransaction(pool, async (client) => {
      console.log(productId, payload);
      let updatedClothing = null;

      if (payload.product_attributes) {
        updatedClothing = await updateClothingRepo({
          productId,
          payload: payload.product_attributes,
          client,
        });
      }

      const updatedParent = await super.updateProduct({
        productId,
        payload,
        client,
      });

      if (!updatedParent && !updatedClothing) {
        throw new BadRequestError(
          "Không tìm thấy sản phẩm hoặc dữ liệu không hợp lệ!",
        );
      }

      return {
        ...updatedParent,
        product_attributes: updatedClothing,
      };
    });
  }
}

//register product types
ProductFactory.registerProductType("Electronic", ElectronicsProduct);
ProductFactory.registerProductType("Clothing", ClothingProduct);

module.exports = {
  ProductFactory,
};
