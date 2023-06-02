const { exec, execSync } = require('child_process');

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
app.post('/function/', (req, res) => {
  const { functionBody, functionName, functionArgs, dependencies } = req.body;
  installDependencies(dependencies);
  const func = new Function(...functionArgs, functionBody);
  functions.push({ name: functionName, func });
  res.status(200).json({
    message: 'Function uploaded successfully',
    timeStamp: Date.now(),
    status: 200,
  });
});

// GET endpoint to list names of all functions
app.get('/functions/', (req, res) => {
  const list = [];
  functions.forEach((func) => {
    list.push(func.name);
  });
  res.status(200).json(list);
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

/* --- Support Functions */

// Install Dependencies
function installDependencies(dependencies) {
  dependencies.forEach((item) => {
    let module = item.name;
    if (item.version) {
      module += `@">=${
        item.version[0] == '^' ? item.version.substring(1) : item.version
      }"`;
    }
    execSync(`npm install ${module}`, (err, stdout, stderr) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log(stdout);
    });
  });
}
