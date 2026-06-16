const insertInventory = async ({
  client,
  inven_product_id,
  inven_shop_id,
  inven_stock,
  inven_location,
}) => {
  const insertInventoryQuery = `
      INSERT INTO inventories (
        inven_product_id,
        inven_shop_id,
        inven_stock,
        inven_location
      ) VALUES ($1, COALESCE($2, 'unKnow'), $3, $4)
      RETURNING *
    `;
  const values = [inven_product_id, inven_shop_id, inven_stock, inven_location];
  const result = await client.query(insertInventoryQuery, values);
  return result.rows[0];
};

module.exports = {
  insertInventory,
};
