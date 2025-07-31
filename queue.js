const Redis = require('ioredis');
const { v4: uuidv4} = require("uuid")
const redis = new Redis(process.env.REDIS_URL);

let jobCounter = 0;

async function addJob(type, data) {
  const id = uuidv4()
  const job = {
    id,
    type,
    data,
    retries:3,
    attempts:0,
    meta:{
      status:"waiting",
      addedAt: Date.now(),
      updatedAt: Date.now()
    }
  };

  await redis.rpush('job-queue', JSON.stringify(job));

  return job.id;
}

module.exports = { addJob };
