const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

let jobCounter = 0;

async function addJob(type, data) {
  const job = {
    id: ++jobCounter,
    type,
    data,
    createdAt: Date.now(),
  };

  await redis.lpush('job-queue', JSON.stringify(job));
  return job.id;
}

module.exports = { addJob };
