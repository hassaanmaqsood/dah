const express = require('express');
const app = express();
const port = 3010;
const path = require('path');

// Array to store functions
const functions = [];

app.use(express.json());
app.use(express.static('static'));

app.get('/', (req, res) => {
  res.sendFile(path.resolve('pages/index.html'));
});

// POST endpoint to upload a function
app.post('/API/', (req, res) => {
  const { functionBody, functionName, functionArgs } = req.body;
  const func = new Function(...functionArgs, functionBody);
  functions.push({ name: functionName, func });
  res.status(200).json(
        { 
          message: 'Function uploaded successfully', 
          timeStamp: Date.now(),
          status: 200, 
        }
  );
});

// GET endpoint to list names of all functions
app.post('/API/', (req, res) => {
  const { functionBody, functionName, functionArgs } = req.body;
  const func = new Function(...functionArgs, functionBody);
  functions.push({ name: functionName, func });
  res.status(200).json({ message: 'Function uploaded successfully' });
});

// GET endpoint to call a function
app.get('/:funcName/', (req, res) => {
  const { funcName } = req.params;
  const { params } = req.body;
  console.log(req.url);
  // Search for the function with the specified name
  const funcObject = functions.find((func) => func.name === funcName);

  if (!funcObject) {
    res.status(404).json({ message: 'Function not found' });
  } else {
    // Call the function with the parsed input parameters
    const startTime = process.hrtime();
    const result = funcObject.func(...params);
    const [secs, nanosecs] = process.hrtime(startTime);
    const response = {
      return: result,
      message: 'Function called successfully',
      timeStamp: Date.now(),
      status: 200,
      runTime: secs + nanosecs / 1e9,
    };
    res.status(200).json(response);
  }
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});
