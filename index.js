import fs from 'fs';
import axios from 'axios';

async function run() {
  try {
    const sourceFile = process.env.INPUT_SOURCE_FILE;
    const targetFile = process.env.INPUT_TARGET_FILE;
    const targetLangCode = process.env.INPUT_TARGET_LANG_CODE;
    const apiKey = process.env.INPUT_GEMINI_API_KEY;

    if (!fs.existsSync(sourceFile)) {
      throw new Error(`Source file not found: ${sourceFile}`);
    }

    console.log(`Translating ${sourceFile} to ${targetFile} in language ${targetLangCode}`);

    const arbData = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));

    // Extract only string values
    const originalValues = Object.values(arbData).filter(v => typeof v === 'string');
    const originalKeys = Object.keys(arbData).filter(k => typeof arbData[k] === 'string');

    console.log(`Found ${originalValues.length} strings to translate.`);
    console.log('Calling LLM...');

    // Call Gemini API
    const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      contents: [
        {
          parts: [{ text: `Translate the following English texts to language code '${targetLangCode}' as a JSON array: ${JSON.stringify(originalValues)}. respond with just the array, no extra strings, no formatting.` }],
        },
      ],
    }).catch(error => {
      throw error;
    });

    const translatedValues = JSON.parse(response.data.candidates[0]?.content?.parts?.[0]?.text.trim() || '[]');

    console.log('Response received from LLM.');

    if (!Array.isArray(translatedValues) || translatedValues.length !== originalValues.length) {
      throw new Error('Translation response is invalid or does not match the number of original strings.');
    }

    console.log('Rebuilding ARB file with translations...');

    // Rebuild ARB file
    const newArb = { ...arbData };
    originalKeys.forEach((key, index) => {
      console.log(`Translating key: ${key}`);
      newArb[key] = translatedValues[index];
    });

    fs.writeFileSync(targetFile, JSON.stringify(newArb, null, 2));

    console.log(`Translated ARB created: ${targetFile}`);
    console.log('Done translating file.');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
