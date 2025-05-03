const concurrently = require('concurrently');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

const ngrokAuthToken = process.env.NGROK_AUTHTOKEN;
const port = process.env.PORT || 3000;

if (!ngrokAuthToken) {
  console.error('Error: NGROK_AUTHTOKEN is not defined in your .env file.');
  console.error('Please get your authtoken from https://dashboard.ngrok.com/get-started/your-authtoken');
  process.exit(1);
}

const commands = [
  {
    command: `npx nodemon ${path.join(__dirname, 'index.js')}`,
    name: 'nodemon',
    prefixColor: 'blue',
  },
  {
    command: `npx ngrok http ${port} --authtoken=${ngrokAuthToken}`,
    name: 'ngrok',
    prefixColor: 'green',
  },
];

// Correctly handle the promise returned by concurrently
const { result } = concurrently(commands, {
  prefix: 'name',
  killOthers: ['failure', 'success'],
  restartTries: 3,
});

result.then(
  () => {
    console.log('All processes finished successfully.');
  },
  (err) => {
    console.error('One of the processes failed:', err);
  }
); 