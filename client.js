// job-client/sendJob.js
const axios = require('axios');

const jobPriority = [
  "send-email",
  "get-report",
  "generate-pdf",
  "reindex-search",
  "clear-cache"
]

function getRandomJobType(){
  return jobPriority[Math.floor(Math.random() * jobPriority.length)]
}

async function sendJob(data, index) {
  try {
    const response = await axios.post('http://localhost:3000/jobs', data);
    console.log(`✅ Job ${index}, type ${data.type} sent:`, response.data);
  } catch (err) {
    console.error(`❌ Job ${index} failed:`, err.message);
  }
}

async function sendMultipleJobs(count = 10, delay = 200) {
  for (let i = 1; i <= count; i++) {
    await sendJob({
       type:getRandomJobType(),
       data:{
        to: `user${i}@example.com`,
        subject: `Job #${i}`,
        body: `This is job number ${i}`,
      },
  }, i);

    await new Promise(res => setTimeout(res, delay)); // small delay between jobs
  }
}

sendMultipleJobs(10);
console.log(getRandomJobType())
