"use strict";

const createOrder = async (
  client,
  {
    userId,
    shopId,
    cartId,
    orderCheckout,
    orderShipping = {},
    orderPayment = {},
    orderStatus = "pending",
    paymentStatus = "unpaid",
  },
) => {
  const result = await client.query(
    `INSERT INTO orders (
       order_user_id,
       order_shop_id,
       order_cart_id,
       order_checkout,
       order_shipping,
       order_payment,
       order_status,
       payment_status
     ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8)
     RETURNING *`,
    [
      Number(userId),
      Number(shopId),
      cartId ? Number(cartId) : null,
      JSON.stringify(orderCheckout ?? {}),
      JSON.stringify(orderShipping ?? {}),
      JSON.stringify(orderPayment ?? {}),
      orderStatus,
      paymentStatus,
    ],
  );
  return result.rows[0];
};

const createOrderItems = async (client, orderId, items = []) => {
  if (!items.length) return [];

  const created = [];
  for (const item of items) {
    const productId = item.productId || item.product_id;
    const quantity = Number(item.quantity);
    const productPrice = Number(item.price ?? item.product_price);
    const totalPrice = Number(
      item.totalPrice ?? item.total_price ?? productPrice * quantity,
    );
    const productName = item.product_name || item.productName;

    const result = await client.query(
      `INSERT INTO order_items (
         order_id,
         product_id,
         product_name,
         product_price,
         quantity,
         total_price
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [orderId, productId, productName, productPrice, quantity, totalPrice],
    );
    created.push(result.rows[0]);
  }
  return created;
};

module.exports = {
  createOrder,
  createOrderItems,
};
