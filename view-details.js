const { tryCatch } = require("bullmq");
const Redis = require("ioredis")
const redis = new Redis()

async function getJobsData(){
    const jobIds = await redis.zrange("job-queue-priority", 0, -1)
    console.log(jobIds)
}

async function checkAllJobsStatus() {
  let cursor = '0';
  const jobs = [];

  do {
    const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'job:*', 'COUNT', 100);
    cursor = nextCursor;

    if (keys.length > 0) {
      const jobDataArr = await redis.mget(...keys.map(k => `${k}`)); // or HGET each if using hash fields
      for (let i = 0; i < keys.length; i++) {
        const data = jobDataArr[i];
        if (data) {
          const job = JSON.parse(JSON.parse(data).data); // your job hash stores { data: JSON.stringify(job) }
          jobs.push({ id: keys[i], status: job.status });
        }
      }
    }
  } while (cursor !== '0');

  return jobs;
}


async function getJobById(id){
    try {
        const jobStr = await redis.hget(`job:${id}`,"data")
        const job = JSON.parse(jobStr)
        return job
    } catch (error) {
        console.error(error)
    }
}

async function getData(){
    try {
        const data = await getJobById('b895c33e-b3de-4039-819b-51255f768ed3')
        console.log(data)
    } catch (error) {
        console.error(error)
    }
} 

getData()



