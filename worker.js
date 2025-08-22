
// worker.js
const Redis = require('ioredis');
const redis = new Redis();

const JOB_QUEUE = 'job-queue';
const FAILED_JOBS_QUEUE = 'failed-jobs';

const RETRY_DELAY = 5000;

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

const claimJobLua = `
  local topN = redis.call("ZRANGE",KEYS[1],0,ARGV[1]-1)
  local now = tonumber(ARGV[2])
  local leaseDuration = tonumber(ARGV[3])

  for i,jobId in ipairs(topN) do
    local jobData = redis.call("HGET",'job:'..jobId,'data')
    if jobData then
      local job = cjson.decode(jobData)
      if job.status == 'waiting' or (not job.leaseUntil) or job.leaseUntil < now then
        job.status = "processing"
        job.leaseUntil = now + leaseDuration
        redis.call("HSET","job:"..jobId, 'data', cjson.encode(job))
        return jobId
      end
    end
  end
  return nil
`

async function processJob(job) {
  try {

    console.log(`🔧 Processing job: ${job.id} of type ${job.type}`);
    job.attempts = (job.attempts || 0) + 1
    job.history.push({
      event:"processing",
      timestamp: new Date().toLocaleString(),
      attempt:job.attempts
    })
    // Simulate job failure
    if (Math.random() < 0.5) throw new Error("💥 Simulated failure");

    job.history.push({
      event:"completed",
      timestamp: new Date().toLocaleString(),
    })

    job.status = "completed"

    await redis.hset(`job:${job.id}`,"data",JSON.stringify(job))
    await redis.zrem("job-queue-priority",job.id)



    console.log(`✅ Job complete: ${job.id}`);
    
  } catch (err) {
    console.error(`❌ Job failed: ${job.id}`, err.message);
    job.history.push({
      event: "failed",
      timestamp: new Date().toLocaleString(),
      error: err.message
    });
    if((job.attempts || 0) >= job.retries){
      job.status = "failed";
      await redis.hset(`job:${job.id}`, "data", JSON.stringify(job));
      await redis.zrem("job-queue-priority", job.id);
    }else {
      await redis.hset(`job:${job.id}`, "data", JSON.stringify(job));
    }
  }
}

async function handleRetry(job) {
  job.attempts = job.attempts || 1;
  job.retries = job.retries || 3;
  job.updatedAt = Date.now();

  const priority = getPriority(job.type)
  
  

  if (job.attempts >= job.retries) {
    job.status = 'failed';
    console.log(`⛔ Final failure for job ${job.id}, no more retries.`);

    await redis.rpush(FAILED_JOBS_QUEUE, JSON.stringify(job));
    job.lastFailure = {
      timestamp: Date.toLocaleString(),
      "error": "RequestTimeoutError",
      "message": "External service did not respond in time"
    }
    return;
  }

  job.attempts += 1;
  job.status = 'retrying';
  console.log(`🔁 Retrying job ${job.id} in ${RETRY_DELAY / 1000}s (Attempt ${job.attempts}/${job.retries})`);

  await delay(RETRY_DELAY);
  job.history.push({
    event:"requeued",
    timestamp: Date.now().toLocaleString()
  })
  await redis.hset(`job:${job.id}`, 'data', JSON.stringify(job));

  await redis.zadd('job-queue-priority', priority, job.id);
  
  console.log(`📤 Job ${job.id} re-queued for retry`);
}


function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const popJobLua = `
  local vals = redis.call('ZRANGE', KEYS[1], 0, 0)
  if #vals == 0 then
    return nil
  end
  redis.call('ZREM', KEYS[1], vals[1])
  return vals[1]
`

async function popHighestPriorityJob() {
  const jobId = await redis.eval(claimJobLua, 1, 'job-queue-priority',10,Date.now(),5000);
  if (!jobId) return null;

  const jobStr = await redis.hget(`job:${jobId}`, "data");
  if (!jobStr) return null;

  const job = JSON.parse(jobStr);
  return job;
}


async function workerLoop() {
  console.log("👷 Worker started, waiting for jobs...");

  while (true) {
    try {
      const job = await popHighestPriorityJob()
      if(!job){
        await delay(1000)
        continue
      }

      await processJob(job);

    } catch (err) {
      console.error("❗ Error in worker loop:", err);
      await delay(1000); // brief pause before retrying loop
    }
  }
}

workerLoop();
