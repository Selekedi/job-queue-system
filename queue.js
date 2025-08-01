const Redis = require('ioredis');
const { v4: uuidv4} = require("uuid")
const redis = new Redis(process.env.REDIS_URL);


async function addJob(type, data) {
  const id = uuidv4()
  const job = {
    id,
    type,
    data,
    retries:3,
    attempts:0,
    status:"waiting",
    addedAt: Date.now(),
    updatedAt: Date.now(),
    history:[{
      event:"created", timestamp: Date.now().toLocaleString()
    }]
  };

  await redis.rpush('job-queue', JSON.stringify(job));

  return job.id;
}

module.exports = { addJob };
