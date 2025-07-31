const Redis = require('ioredis');
const redis = new Redis();

async function processJob(job) {
  console.log('Processing job:', job);
  // Simulate work
  await new Promise(resolve => setTimeout(resolve, 2000));
  console.log('Finished job:', job);
}

async function worker() {
  console.log('Worker started, waiting for jobs...');

  while (true) {
    try {
      // BLPOP blocks until a job is available in 'job-queue'
      const result = await redis.blpop('job-queue', 0); // 0 = block indefinitely
      const jobData = result[1];
      const job = JSON.parse(jobData);

      await processJob(job);
    } catch (err) {
      console.error('Error processing job:', err);
    }
  }
}

worker();

