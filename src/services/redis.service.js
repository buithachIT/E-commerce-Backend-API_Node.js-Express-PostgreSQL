"use strict";

const { createClient } = require("redis");
const {
  reservationInventory,
} = require("../models/repositories/inventory.repo");

/**
 * node-redis v4+ is promise-based (no setnx/pexpire + promisify).
 * Connect lazily so requiring this module does not crash the app.
 */
let redisClient = null;
let connectPromise = null;

const getRedisClient = async () => {
  if (redisClient?.isOpen) return redisClient;

  if (!connectPromise) {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
    });

    redisClient.on("error", (err) => {
      console.error("[Redis]", err.message);
    });

    connectPromise = redisClient
      .connect()
      .then(() => redisClient)
      .catch((err) => {
        connectPromise = null;
        redisClient = null;
        throw err;
      });
  }

  return connectPromise;
};

const acquireLock = async (productId, quantity, cartId) => {
  const key = `lock_v2026_${productId}`;
  const retryTimes = 10;
  const expiredTime = 3000;

  let client;
  try {
    client = await getRedisClient();
  } catch (err) {
    console.error("[Redis Lock] Cannot connect:", err.message);
    return null;
  }

  for (let i = 0; i < retryTimes; i++) {
    // SET key NX PX — 'OK' if acquired, null if key exists
    const result = await client.set(key, String(cartId ?? "1"), {
      NX: true,
      PX: expiredTime,
    });

    console.log(
      `[Redis Lock] Acquire lock for product ${productId} result: ${result}`,
    );

    if (result === "OK") {
      try {
        // inventory.repo currently expects typo `quatity`
        const reservation = await reservationInventory({
          productId,
          quantity,
          quatity: quantity,
          cartId,
        });

        if (reservation) {
          await client.pExpire(key, expiredTime);
          return key;
        }

        await client.del(key);
        return null;
      } catch (err) {
        await client.del(key).catch(() => {});
        console.error("[Redis Lock] Reservation failed:", err.message);
        return null;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  return null;
};

const releaseLock = async (keyLock) => {
  if (!keyLock) return 0;

  try {
    const client = await getRedisClient();
    return await client.del(keyLock);
  } catch (err) {
    console.error("[Redis] releaseLock failed:", err.message);
    return 0;
  }
};

module.exports = {
  acquireLock,
  releaseLock,
};
