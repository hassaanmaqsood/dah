const { exec, execSync } = require('child_process');

const express = require('express');
const app = express();
const port = 3010;
const path = require('path');

const CyclicDb = require('@cyclic.sh/dynamodb');
const db = CyclicDb('drab-lime-donkey-yokeCyclicDB');

app.use(express.json());
app.use(express.static('static'));

app.get('/', (req, res) => {
  res.sendFile(path.resolve('pages/index.html'));
});

app.get('/APIs', async (req, res) => {
  try {
    const { results: functionsMetaData } = await db
      .collection('functions')
      .list();
    const list = await Promise.all(
      functionsMetaData.map(async ({ key }) => {
        const { functionArgs, functionBody } = (
          await db.collection('functions').get(key)
        ).props;
        return key;
      })
    );
    res.status(200).json(list);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST endpoint to upload a function
app.post('/API/', async (req, res) => {
  try {
    const { functionBody, functionName, functionArgs, dependencies } = req.body;
    console.log(functionBody, functionArgs);
    await installDependencies(dependencies);
    const funcRef = await db
      .collection('functions')
      .set(functionName, { functionBody, functionArgs });
    res.status(200).json({ message: 'Function uploaded successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET endpoint to call a function
app.get('/:funcName/', async (req, res) => {
  try {
    const { funcName } = req.params;
    const { params } = req.body;

    const funcDoc = await db.collection('functions').get(funcName);

    if (!funcDoc) {
      res.status(404).json({ message: 'Function not found' });
    } else {
      const { functionBody, functionArgs } = funcDoc.props;
      console.log(functionBody, functionArgs);
      const func = new Function(...functionArgs, functionBody);

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
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`);
});

// Install Dependencies
async function installDependencies(dependencies) {
  for (const item of dependencies) {
    let module = item.name;
    if (item.version) {
      module += `@">=${
        item.version[0] == '^' ? item.version.substring(1) : item.version
      }"`;
    }
    await execCommand(`npm install ${module}`);
  }
}

// Utility function to execute shell commands synchronously
function execCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(stderr);
        reject(error);
      } else {
        console.log(stdout);
        resolve();
      }
    });
  });
}
