import fs from 'fs';
import axios from 'axios';

const BATCH_SIZE = 50; // Process 50 strings per batch
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Helper function to chunk array into batches
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Helper function to sleep
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to parse JSON, handling markdown code blocks
function parseJsonResponse(text) {
  let cleanedText = text.trim();

  // Remove markdown code blocks if present
  // Matches ```json\n...\n``` or ```\n...\n```
  const codeBlockRegex = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/;
  const match = cleanedText.match(codeBlockRegex);

  if (match) {
    cleanedText = match[1].trim();
  }

  return JSON.parse(cleanedText);
}

// Translate a batch with retry logic
async function translateBatch(batch, targetLangCode, apiKey, batchNumber, totalBatches, retryCount = 0) {
  try {
    console.log(`[Batch ${batchNumber}/${totalBatches}] Translating ${batch.length} strings...`);

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        contents: [
          {
            parts: [{
              text: `Translate the following English texts to language code '${targetLangCode}' as a JSON array: ${JSON.stringify(batch)}. respond with just the array, no extra strings, no formatting, leave anything inside a curly braces in the original language.`,
            }],
          },
        ],
      },
      {
        timeout: 30000,
      }
    );

    const responseText = response.data.candidates[0]?.content?.parts?.[0]?.text || '[]';
    const translatedValues = parseJsonResponse(responseText);

    if (!Array.isArray(translatedValues) || translatedValues.length !== batch.length) {
      throw new Error(`Translation response invalid: expected ${batch.length} translations, got ${translatedValues.length}`);
    }

    console.log(`[Batch ${batchNumber}/${totalBatches}] ✓ Successfully translated`);
    return translatedValues;

  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY * (retryCount + 1);
      console.warn(`[Batch ${batchNumber}/${totalBatches}] Failed: ${error.message}`);
      console.log(`[Batch ${batchNumber}/${totalBatches}] Retrying in ${delay / 1000}s... (Attempt ${retryCount + 1}/${MAX_RETRIES})`);
      await sleep(delay);
      return translateBatch(batch, targetLangCode, apiKey, batchNumber, totalBatches, retryCount + 1);
    } else {
      throw new Error(`[Batch ${batchNumber}/${totalBatches}] Failed after ${MAX_RETRIES} retries: ${error.message}`);
    }
  }
}

// Translate to a single target
async function translateToTarget(sourceFile, targetFile, targetLangCode, apiKey, arbData, originalValues, originalKeys) {
  console.log(`\nTranslating to ${targetLangCode} → ${targetFile}`);

  // Split into batches
  const batches = chunkArray(originalValues, BATCH_SIZE);
  const totalBatches = batches.length;

  if (totalBatches > 1) {
    console.log(`Processing in ${totalBatches} batches of up to ${BATCH_SIZE} strings each.`);
  }

  // Translate each batch
  const allTranslations = [];
  for (let i = 0; i < batches.length; i++) {
    const translatedBatch = await translateBatch(
      batches[i],
      targetLangCode,
      apiKey,
      i + 1,
      totalBatches
    );
    allTranslations.push(...translatedBatch);

    // Small delay between batches to avoid rate limiting
    if (i < batches.length - 1) {
      await sleep(500);
    }
  }

  console.log(`✓ All ${allTranslations.length} strings translated to ${targetLangCode}!`);

  // Rebuild ARB file
  const newArb = { ...arbData };
  originalKeys.forEach((key, index) => {
    if (key == '@@locale') {
      newArb[key] = targetLangCode;
      return;
    }
    newArb[key] = allTranslations[index];
  });

  fs.writeFileSync(targetFile, JSON.stringify(newArb, null, 2));
  console.log(`✓ Created: ${targetFile}`);
}

async function run() {
  try {
    const sourceFile = process.env.INPUT_SOURCE_FILE;
    const targetFileInput = process.env.INPUT_TARGET_FILE;
    const targetLangCodeInput = process.env.INPUT_TARGET_LANG_CODE;
    const apiKey = process.env.INPUT_GEMINI_API_KEY;

    if (!fs.existsSync(sourceFile)) {
      throw new Error(`Source file not found: ${sourceFile}`);
    }

    // Parse comma-separated values
    const targetFiles = targetFileInput.split(',').map(s => s.trim());
    const targetLangCodes = targetLangCodeInput.split(',').map(s => s.trim());

    // Validate counts match
    if (targetFiles.length !== targetLangCodes.length) {
      throw new Error(
        `Mismatch: ${targetFiles.length} target file(s) but ${targetLangCodes.length} language code(s). ` +
        `When using comma-separated values, counts must match.`
      );
    }

    console.log(`Source file: ${sourceFile}`);
    console.log(`Translating to ${targetFiles.length} language(s): ${targetLangCodes.join(', ')}`);

    // Load and parse source ARB file once
    const arbData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));

    // Extract only string values
    const originalValues = Object.values(arbData).filter(v => typeof v === 'string');
    const originalKeys = Object.keys(arbData).filter(k => typeof arbData[k] === 'string');

    console.log(`Found ${originalValues.length} strings to translate.`);

    // Translate to each target language
    for (let i = 0; i < targetFiles.length; i++) {
      await translateToTarget(
        sourceFile,
        targetFiles[i],
        targetLangCodes[i],
        apiKey,
        arbData,
        originalValues,
        originalKeys
      );

      // Delay between languages to avoid rate limiting
      if (i < targetFiles.length - 1) {
        console.log('\nPausing before next language...');
        await sleep(1000);
      }
    }

    console.log('\n✓ All translations completed successfully!');
  } catch (error) {
    console.error('\n✗ Translation failed:');
    console.error(error.message || error);
    process.exit(1);
  }
}

run();
