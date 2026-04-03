function normalizeConcurrency(value) {
  if (!Number.isInteger(value) || value < 1) {
    return 1;
  }
  return value;
}

async function runWithConcurrencyPool(items, concurrency, worker) {
  const queue = Array.isArray(items) ? items : [];
  if (queue.length === 0) {
    return [];
  }

  const workerCount = Math.min(normalizeConcurrency(concurrency), queue.length);
  const results = new Array(queue.length);
  let nextIndex = 0;

  async function consumeQueue() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= queue.length) {
        return;
      }

      try {
        const value = await worker(queue[currentIndex], currentIndex);
        results[currentIndex] = { status: "fulfilled", value };
      } catch (reason) {
        results[currentIndex] = { status: "rejected", reason };
      }
    }
  }

  await Promise.all(
    Array.from({ length: workerCount }, () => consumeQueue()),
  );

  return results;
}

module.exports = {
  runWithConcurrencyPool,
};
