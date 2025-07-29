require('dotenv').config();
const express = require('express');
const { addJob } = require('./queue');

const app = express();
app.use(express.json());

app.post('/jobs', async (req, res) => {
  const { type, data } = req.body;
  const jobId = await addJob(type, data);
  res.json({ message: 'Job added', jobId });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
