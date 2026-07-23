'use strict';

const redis = require('redis');
const { promisify } = require('util');

const redisClient = redis.createClient();

const pexpire = promisify(redisClient.pexpire).bind(redisClient);
const setnxAsync = promisify(redisClient.setnx).bind(redisClient);

const acquireLock = async (productId, quantity, cartId) => {
    const key = `lock_v2026_${productId}`;
    const retryTimes = 10;
    const expiredTime = 3000; // 3 seconds
    for (let i = 0; i < retryTimes; i++) {
        const result = await setnxAsync(key, expiredTime);
        console.log(`[Redis Lock] Acquire lock for product ${productId} with result: ${result}`);
        if(result === 1){
            //thao tác với inventory
            return key;
        }else{
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}

const releaseLock = async keyLock =>{
    const delAsyncKey = promisify(redisClient.del).bind(redisClient);
    return await delAsyncKey(keyLock);
}

module.exports = {
    acquireLock,
    releaseLock
};