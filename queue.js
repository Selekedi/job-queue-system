const Redis = require('ioredis');
const { v4: uuidv4} = require("uuid")
const redis = new Redis(process.env.REDIS_URL);

const jobPriority = {
  "send-email":20,
  "get-report":40,
  "generate-pdf":50,
  "reindex-search":60,
  "clear-cache":100
}

function getPriority(jobType){
  return jobPriority[jobType] ?? 200
}


async function addJob(type, data) {

  const id = uuidv4()
  const priority = getPriority(type)
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

  await redis.hset(`job:${job.id}`, 'data', JSON.stringify(job));

  await redis.zadd('job-queue-priority', priority, job.id);

  return job.id;
}

module.exports = { addJob };
