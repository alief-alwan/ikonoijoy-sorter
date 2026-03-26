import kuromoji from "kuromoji";
import { toRomaji as kanaToRomaji, isKana } from "wanakana";

let tokenizerPromise = null;

/**
 * Initialize the kuromoji tokenizer. Can be called early to start loading
 * the dictionary in the background. Returns a promise that resolves to the
 * tokenizer instance.
 */
export function initTokenizer() {
  if (!tokenizerPromise) {
    tokenizerPromise = new Promise((resolve, reject) => {
      kuromoji
        .builder({ dicPath: `${process.env.PUBLIC_URL}/dict/` })
        .build((err, tokenizer) => {
          if (err) reject(err);
          else resolve(tokenizer);
        });
    });
  }
  return tokenizerPromise;
}

/**
 * Convert a Japanese text string (including kanji) to romaji.
 * Uses kuromoji for morphological analysis to get kanji readings,
 * then wanakana to convert the katakana readings to romaji.
 *
 * Falls back to wanakana-only conversion if the tokenizer is unavailable.
 */
export async function convertToRomaji(text) {
  try {
    const tokenizer = await initTokenizer();
    const tokens = tokenizer.tokenize(text);
    return tokens
      .map((token) => {
        if (token.reading && token.reading !== "*") {
          return kanaToRomaji(token.reading);
        }
        // No reading available — convert any kana in the surface form
        if (isKana(token.surface_form)) {
          return kanaToRomaji(token.surface_form);
        }
        return token.surface_form;
      })
      .join("");
  } catch {
    // Fallback: wanakana converts kana only, kanji stays as-is
    return kanaToRomaji(text);
  }
}
