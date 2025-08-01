
// worker.js
const Redis = require('ioredis');
const redis = new Redis();

const JOB_QUEUE = 'job-queue';
const FAILED_JOBS_QUEUE = 'failed-jobs';

const RETRY_DELAY = 5000;

async function processJob(job) {
  try {
    console.log(`🔧 Processing job: ${job.id}`);
    
    // Simulate job failure
    if (Math.random() < 0.5) throw new Error("💥 Simulated failure");

    job.history.push({
      event:"processing",
      timestamp: Date.now().toLocaleString(),
      attempt:job.attempts + 1
    })

    console.log(`✅ Job complete: ${job.id}`);
    
  } catch (err) {
    console.error(`❌ Job failed: ${job.id}`, err.message);
    job.history.push({
      event:"failed",
      timestamp: Date.now().toLocaleString()
    })
    await handleRetry(job);
  }
}

async function handleRetry(job) {
  job.attempts = job.attempts || 1;
  job.retries = job.retries || 3;
  job.updatedAt = Date.now();
  
  

  if (job.attempts >= job.retries) {
    job.status = 'failed';
    console.log(`⛔ Final failure for job ${job.id}, no more retries.`);

    await redis.rpush(FAILED_JOBS_QUEUE, JSON.stringify(job));
    job.lastFailure = {
      "timestamp": Date.now().toLocaleString(),
      "error": "RequestTimeoutError",
      "message": "External service did not respond in time"
    }
    return;
  }

  job.attempts += 1;
  job.status = 'retrying';
  console.log(`🔁 Retrying job ${job.id} in ${RETRY_DELAY / 1000}s (Attempt ${job.attempts}/${job.retries})`);

  await delay(RETRY_DELAY);
  await redis.rpush(JOB_QUEUE, JSON.stringify(job));
  job.history.push({
    event:"requeued",
    timestamp: Date.now().toLocaleString()
  })
  console.log(`📤 Job ${job.id} re-queued for retry`);
}


function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function workerLoop() {
  console.log("👷 Worker started, waiting for jobs...");

  while (true) {
    try {
      const res = await redis.blpop(JOB_QUEUE, 0);
      const [_key, value] = res;

      let job;
      try {
        job = JSON.parse(value);
      } catch (e) {
        console.warn("⚠️ Could not parse job:", value);
        continue;
      }

      await processJob(job);

    } catch (err) {
      console.error("❗ Error in worker loop:", err);
      await delay(1000); // brief pause before retrying loop
    }
  }
}

workerLoop();
