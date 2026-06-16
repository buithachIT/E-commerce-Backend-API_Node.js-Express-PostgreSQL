const asyncHandler = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

const runInTransaction = async (dbInstance, callback) => {
  const actualPool = dbInstance.pool || dbInstance;

  const client = await actualPool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    if (client && typeof client.release === "function") {
      client.release();
    }
  }
};

module.exports = {
  asyncHandler,
  runInTransaction,
};
