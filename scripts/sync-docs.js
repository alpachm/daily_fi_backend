/**
 * Syncs the local Postman collection file with the Postman API.
 *
 * Usage: npm run docs:push
 *   (loads environment variables from .env via --env-file, see package.json)
 */

const fs = require('node:fs/promises');
const path = require('node:path');

const COLLECTION_FILE = path.join(__dirname, '..', 'documentation.postman_collection.json');
const POSTMAN_API_URL = 'https://api.getpostman.com/collections';

async function main() {
  const apiKey = process.env.POSTMAN_API_KEY;
  const collectionId = process.env.POSTMAN_COLLECTION_ID;

  if (!apiKey) {
    console.error('❌ POSTMAN_API_KEY is not set. Add it to your .env file and run again.');
    process.exitCode = 1;
    return;
  }

  if (!collectionId) {
    console.error('❌ POSTMAN_COLLECTION_ID is not set. Add it to your .env file and run again.');
    process.exitCode = 1;
    return;
  }

  let rawCollection;
  try {
    rawCollection = await fs.readFile(COLLECTION_FILE, 'utf8');
  } catch (error) {
    console.error(`❌ Failed to read the collection file: ${COLLECTION_FILE}`);
    console.error(`   ${error.message}`);
    process.exitCode = 1;
    return;
  }

  let collection;
  try {
    collection = JSON.parse(rawCollection);
  } catch (error) {
    console.error('❌ The collection file contains invalid JSON.');
    console.error(`   ${error.message}`);
    process.exitCode = 1;
    return;
  }

  // The Postman "Update Collection" endpoint expects the payload to be wrapped
  // in a root "collection" object.
  const payload = { collection };
  const url = `${POSTMAN_API_URL}/${collectionId}`;

  console.log('🚀 Pushing collection to Postman…');
  console.log(`   Collection ID: ${collectionId}`);
  console.log(`   Collection name: ${collection.info?.name ?? 'unknown'}`);

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    let responseBody;
    try {
      responseBody = JSON.parse(responseText);
    } catch {
      responseBody = null;
    }

    if (!response.ok) {
      console.error(`❌ Postman API returned HTTP ${response.status} ${response.statusText}`);
      if (responseBody && responseBody.error) {
        const errorName = responseBody.error.name ?? 'Error';
        const errorMessage = responseBody.error.message ?? JSON.stringify(responseBody.error);
        console.error(`   ${errorName}: ${errorMessage}`);
      } else {
        console.error(responseText || '(empty response body)');
      }
      process.exitCode = 1;
      return;
    }

    console.log('✅ Collection updated successfully in Postman.');
    console.log(`   HTTP status: ${response.status}`);
    if (responseBody?.collection?.uid) {
      console.log(`   Postman collection UID: ${responseBody.collection.uid}`);
    }
  } catch (error) {
    console.error('❌ Failed to reach the Postman API.');
    console.error(`   ${error.message}`);
    process.exitCode = 1;
  }
}

main();
