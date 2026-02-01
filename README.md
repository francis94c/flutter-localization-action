# Flutter Localization Action using Gemini

A GitHub Action that automatically translates Flutter ARB (Application Resource Bundle) files to multiple languages using Google's Gemini API.

## Features

- 🌍 Translate Flutter ARB files to any language
- 🚀 **Multiple simultaneous translations** with comma-separated values
- 🤖 Powered by Google Gemini 2.5 Flash for accurate translations
- 📦 Easy to integrate into your CI/CD workflow
- 🎯 Preserves ARB file structure and metadata
- ⚡ Fast and efficient translation process
- 🔄 Automatic batching for large language files (50 strings per batch)
- 🔁 Built-in retry logic with exponential backoff
- 📊 Progress tracking for batch operations

## Prerequisites

- A Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- Flutter project with ARB localization files

## Usage

### Build-time Translation (Recommended)

Generate translations on-the-fly during your build process without committing them to your repository. **Use comma-separated values to translate multiple languages in a single step:**

```yaml
name: Build Flutter App

on:
  push:
    branches: [main, develop]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.x'

      - name: Translate to multiple languages
        uses: francis94c/flutter-localization-action@v1
        with:
          source_file: 'lib/l10n/app_en.arb'
          target_file: 'lib/l10n/app_es.arb, lib/l10n/app_fr.arb, lib/l10n/app_de.arb'
          target_lang_code: 'es, fr, de'
          gemini_api_key: ${{ secrets.GEMINI_API_KEY }}

      - name: Get dependencies
        run: flutter pub get

      - name: Build APK
        run: flutter build apk --release

      - name: Upload APK
        uses: actions/upload-artifact@v3
        with:
          name: app-release
          path: build/app/outputs/flutter-apk/app-release.apk
```

> **Note:** Translation files are generated during the build and included in the compiled app, but not committed to version control. This keeps your repository clean while supporting multiple languages. You can also translate to a single language, comma separated lists are optional ;-).

### Basic Example with Commit

```yaml
name: Translate Localization Files

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Translate to Spanish
        uses: francis94c/flutter-localization-action@v1
        with:
          source_file: 'lib/l10n/app_en.arb'
          target_file: 'lib/l10n/app_es.arb'
          target_lang_code: 'es'
          gemini_api_key: ${{ secrets.GEMINI_API_KEY }}

      - name: Translate to French
        uses: francis94c/flutter-localization-action@v1
        with:
          source_file: 'lib/l10n/app_en.arb'
          target_file: 'lib/l10n/app_fr.arb'
          target_lang_code: 'fr'
          gemini_api_key: ${{ secrets.GEMINI_API_KEY }}

      - name: Commit translations
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add lib/l10n/*.arb
          git commit -m "Update translations" || echo "No changes to commit"
          git push
```

### Multiple Languages in Single Step (New!)

Translate to many languages at once using comma-separated values:

```yaml
name: Translate to Multiple Languages

on:
  workflow_dispatch:

jobs:
  translate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Translate to 7 languages
        uses: francis94c/flutter-localization-action@v1
        with:
          source_file: 'lib/l10n/app_en.arb'
          target_file: 'lib/l10n/app_es.arb, lib/l10n/app_fr.arb, lib/l10n/app_de.arb, lib/l10n/app_it.arb, lib/l10n/app_pt.arb, lib/l10n/app_ja.arb, lib/l10n/app_zh.arb'
          target_lang_code: 'es, fr, de, it, pt, ja, zh'
          gemini_api_key: ${{ secrets.GEMINI_API_KEY }}

      - name: Commit translations
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add lib/l10n/*.arb
          git commit -m "Update translations" || echo "No changes to commit"
          git push
```

### Using Matrix Strategy (Alternative)

You can also use GitHub Actions matrix strategy for parallel processing:

```yaml
name: Translate to Multiple Languages

on:
  workflow_dispatch:

jobs:
  translate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        language:
          - { code: 'es', name: 'Spanish' }
          - { code: 'fr', name: 'French' }
          - { code: 'de', name: 'German' }
          - { code: 'it', name: 'Italian' }
          - { code: 'pt', name: 'Portuguese' }
          - { code: 'ja', name: 'Japanese' }
          - { code: 'zh', name: 'Chinese' }
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Translate to ${{ matrix.language.name }}
        uses: francis94c/flutter-localization-action@v1
        with:
          source_file: 'lib/l10n/app_en.arb'
          target_file: 'lib/l10n/app_${{ matrix.language.code }}.arb'
          target_lang_code: ${{ matrix.language.code }}
          gemini_api_key: ${{ secrets.GEMINI_API_KEY }}

      - name: Upload translated files
        uses: actions/upload-artifact@v3
        with:
          name: translations-${{ matrix.language.code }}
          path: lib/l10n/app_${{ matrix.language.code }}.arb
```

## Inputs

| Input              | Description                                                                                                 | Required | Example                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------- |
| `source_file`      | Path to the source ARB file (typically English)                                                             | Yes      | `lib/l10n/app_en.arb`                                                                 |
| `target_file`      | Path(s) where translated ARB files will be saved. Use comma-separated values for multiple files.            | Yes      | Single: `lib/l10n/app_es.arb`<br>Multiple: `lib/l10n/app_es.arb, lib/l10n/app_fr.arb` |
| `target_lang_code` | Target language code(s). Use comma-separated values for multiple languages. Count must match `target_file`. | Yes      | Single: `es`<br>Multiple: `es, fr, de`                                                |
| `gemini_api_key`   | Your Google Gemini API key                                                                                  | Yes      | `${{ secrets.GEMINI_API_KEY }}`                                                       |

## Supported Language Codes

The action supports all language codes that Gemini API supports, including but not limited to:

- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `ja` - Japanese
- `zh` - Chinese
- `ko` - Korean
- `ar` - Arabic
- `hi` - Hindi
- `ru` - Russian
- And many more...

## How It Works

1. The action reads your source ARB file (typically `app_en.arb`)
2. Extracts all translatable string values
3. Splits strings into batches (50 per batch) for large files
4. Sends each batch to Google Gemini API for translation
5. Receives translated strings in the target language(s)
6. Retries failed batches automatically (up to 3 times)
7. Reconstructs ARB file(s) with translated values while preserving metadata
8. Saves the translated file(s) to the specified target path(s)
9. If multiple languages specified, processes each language sequentially

## ARB File Structure

The action preserves the structure of your ARB files, including metadata. Here's an example:

**Input (app_en.arb):**

```json
{
  "@@locale": "en",
  "app_title": "My App",
  "@app_title": {
    "description": "The title of the application"
  },
  "welcome_message": "Welcome to our app!"
}
```

**Output (app_es.arb):**

```json
{
  "@@locale": "en",
  "app_title": "Mi Aplicación",
  "@app_title": {
    "description": "The title of the application"
  },
  "welcome_message": "¡Bienvenido a nuestra aplicación!"
}
```

## Setting Up Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. In your GitHub repository, go to Settings → Secrets and variables → Actions
4. Create a new secret named `GEMINI_API_KEY`
5. Paste your API key

## Best Practices

- ✅ Always use a source file in a language you're confident in (typically English)
- ✅ Store your Gemini API key as a GitHub secret
- ✅ Review translations before deploying to production
- ✅ Use the action in a separate branch or PR for manual review
- ✅ Keep your source ARB file up to date and well-structured

## Limitations

- The action translates only string values in the ARB file
- Metadata and placeholders are preserved but not translated
- Translation quality depends on the Gemini API
- API rate limits apply based on your Gemini API tier

## Troubleshooting

### "Source file not found"

- Ensure the path to your source file is correct
- Use paths relative to the repository root
- Check that the file exists in your repository

### "Mismatch: X target file(s) but Y language code(s)"

- When using comma-separated values, the count must match exactly
- Example: `target_file: 'app_es.arb, app_fr.arb'` requires `target_lang_code: 'es, fr'`
- Check for extra commas or missing values

### "Translation response is invalid"

- This usually indicates an API error
- Check your API key is valid
- Ensure you haven't exceeded your API quota
- Check the GitHub Actions logs for the full error message
- The action will automatically retry failed batches up to 3 times

### Metadata is in English

- This is expected behavior - the action only translates string values
- Metadata (keys starting with `@`) are preserved as-is

### Large files timing out

- The action automatically batches translations (50 strings per batch)
- Check GitHub Actions logs to see batch progress
- Failed batches are retried with exponential backoff
- Consider splitting very large ARB files into smaller modules

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

**Francis Ilechukwu**

## Acknowledgments

- Powered by [Google Gemini API](https://ai.google.dev/)
- Built for the Flutter community

---

Made with ❤️ for Flutter developers
