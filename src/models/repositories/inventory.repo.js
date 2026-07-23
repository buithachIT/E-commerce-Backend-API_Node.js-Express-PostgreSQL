"use strict";

const { runInTransaction } = require("../../helpers/async-handler");

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

/**
 * Hàm đặt giữ kho (Reservation Inventory) - chịu tải
 * @param {string} productId - ID sản phẩm
 * @param {number} quatity - Số lượng sản phẩm
 * @param {string} cartId - ID giỏ hàng
 * @returns {Promise<object>} - Object reservation
 */
const reservationInventory = async ({productId, quatity, cartId})=>{
  const numQuantity = Number(quatity);
  if(numQuantity <= 0) return 0;

  return await runInTransaction(pool, async (client)=>{

    //Khóa dòng kho của sản phẩm
    const queryLockInventory = `
    SELECT id, inven_stock FROM inventories WHERE inven_product_id = $1 FOR UPDATE`;

    const result = await client.query(queryLockInventory, [productId]);
    const inventory = result.rows[0];

    //Check tồn kho
    if(!inventory) throw new NotFoundError(`Inventory not found`);
    if(Number(inventory.inven_stock) < numQuantity) throw new NotFoundError(`Product out of stock`);

    //Trừ kho bảng cha inventories
    const queryUpdateInventory = `
    UPDATE inventories SET inven_stock = inven_stock - $1, update_at = NOW() WHERE id = $2`
    await client.query(queryUpdateInventory, [numQuantity, inventory.id]);
    //Update lại tồn kho
    const queryInsertReservation = `
    INSERT INTO inventory_reservations (inventory_id, cart_id, num_stock, created_on) VALUES ($1, $2, $3, NOW()) RETURNING *;`;

    const resultReservation = await client.query(queryInsertReservation, [inventory.id, cartId, numQuantity]);
    const reservation = resultReservation.rows[0];

    //Return reservation
    return resultReservation.rows[0];  
  });
}
module.exports = {
  insertInventory,
  reservationInventory,
};
