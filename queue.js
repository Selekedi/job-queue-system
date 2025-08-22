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


const enqueueLua = `
  local jobKey = KEYS[1]
  local queueKey = KEYS[2]
  local jobData = ARGV[1]
  local priority = tonumber(ARGV[2])
  local jobId = ARGV[3]

  -- store the job data
  redis.call("HSET",jobKey,"data",jobData)

  -- Add the job to the priority queue
  redis.call("ZADD",queueKey,priority,jobId)

  return jobId
`


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
    leaseUntil:0,
    history:[{
      event:"created", timestamp:new Date().toLocaleString()
    }]
  };

  await redis.eval(
    enqueueLua,
    2,
    `job:${id}`,
    "job-queue-priority",
    JSON.stringify(job),
    priority,
    id
  )

  

  return id;
}

module.exports = { addJob };
