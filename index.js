const express = require('express');
const { execSync } = require('child_process');
const fs = require('fs');
const app = express();
const port = 3010;
const path = require('path');

// Directory to store function files
const functionsDir = path.resolve('functions');
// Create functions directory if it doesn't exist
if (!fs.existsSync(functionsDir)) {
  fs.mkdirSync(functionsDir);
}
app.use(express.json());
app.use(express.static('static'));

app.get('/', (req, res) => {
  res.sendFile(path.resolve('pages/index.html'));
});

app.get('/APIs', (req, res) => {
  fs.readdir(functionsDir, (err, files) => {
    if (err) {
      res.status(500).json({ message: 'Internal server error' });
    } else {
      const list = files.map((file) => file.split('.json')[0]);
      res.status(200).json(list);
    }
  });
});

// POST endpoint to upload a function
app.post('/API/', (req, res) => {
  const { functionBody, functionName, functionArgs, dependencies } = req.body;
  const filePath = path.join(functionsDir, `${functionName}.json`);
  installDependencies(dependencies);

  const functionData = {
    name: functionName,
    body: functionBody,
    args: functionArgs,
  };

  fs.writeFile(filePath, JSON.stringify(functionData), (err) => {
    if (err) {
      res.status(500).json({ message: 'Internal server error' });
    } else {
      res.status(200).json({ message: 'Function uploaded successfully' });
    }
  });
});

// GET endpoint to call a function
app.get('/:funcName/', (req, res) => {
  const { funcName } = req.params;
  const { params } = req.body;
  const filePath = path.join(functionsDir, `${funcName}.json`);

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      res.status(404).json({ message: 'Function not found' });
    } else {
      const functionData = JSON.parse(data);
      const func = new Function(...functionData.args, functionData.body);
      const startTime = process.hrtime();
      const result = func(...params);
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
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});

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
