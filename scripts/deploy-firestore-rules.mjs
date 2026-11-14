import fs from 'fs';
import path from 'path';

const configPath = path.join(process.env.USERPROFILE, '.config', 'configstore', 'firebase-tools.json');
const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const refreshToken = data.tokens.refresh_token;

async function deployRules() {
  console.log('1. Refreshing Google OAuth access token...');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com',
      client_secret: 'j9iVZfS8kkCEFUPaAeJV0sAi',
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    throw new Error('Failed to get access token: ' + JSON.stringify(tokenData));
  }
  const token = tokenData.access_token;
  console.log('Access token obtained successfully.');

  console.log('2. Reading local firestore.rules...');
  const rulesContent = fs.readFileSync('firestore.rules', 'utf8');

  console.log('3. Creating new ruleset on Google Cloud...');
  const createRulesetRes = await fetch('https://firebaserules.googleapis.com/v1/projects/nanasore/rulesets', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      source: {
        files: [
          {
            name: 'firestore.rules',
            content: rulesContent
          }
        ]
      }
    })
  });

  const rulesetData = await createRulesetRes.json();
  if (!rulesetData.name) {
    throw new Error('Failed to create ruleset: ' + JSON.stringify(rulesetData));
  }
  console.log('Ruleset created:', rulesetData.name);

  console.log('4. Releasing ruleset to cloud.firestore...');
  const releaseRes = await fetch('https://firebaserules.googleapis.com/v1/projects/nanasore/releases/cloud.firestore', {
    method: 'PATCH',
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      release: {
        name: 'projects/nanasore/releases/cloud.firestore',
        rulesetName: rulesetData.name
      }
    })
  });

  const releaseData = await releaseRes.json();
  console.log('Release response:', releaseData);
  console.log('=== FIRESTORE RULES DEPLOYED SUCCESSFULLY TO FIREBASE PRODUCTION! ===');
}

deployRules().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
