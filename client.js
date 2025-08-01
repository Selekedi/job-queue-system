// job-client/sendJob.js
const axios = require('axios');

async function sendJob(data, index) {
  try {
    const response = await axios.post('http://localhost:3000/jobs', data);
    console.log(`✅ Job ${index} sent:`, response.data);
  } catch (err) {
    console.error(`❌ Job ${index} failed:`, err.message);
  }
}

async function sendMultipleJobs(count = 10, delay = 200) {
  for (let i = 1; i <= count; i++) {
    await sendJob({
       type:'email',
       data:{
        to: `user${i}@example.com`,
        subject: `Job #${i}`,
        body: `This is job number ${i}`,
      },
  }, i);

    await new Promise(res => setTimeout(res, delay)); // small delay between jobs
  }
}

sendMultipleJobs(30);
