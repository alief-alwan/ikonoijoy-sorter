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

// Matches strings containing only symbols/punctuation (no word chars or kana/kanji)
const SYMBOL_ONLY = /^[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+$/;

// CJK kanji codepoint ranges that wanakana cannot convert to romaji
const CJK_KANJI_RE = /[\u3400-\u9FFF\uF900-\uFAFF]/g;

/**
 * Convert a Japanese text string (including kanji) to word-spaced,
 * title-cased romaji.
 *
 * Uses kuromoji for morphological analysis to group tokens into logical
 * words, concatenates readings within each word, then converts to romaji
 * via wanakana.  Content words are capitalized; particles stay lowercase.
 *
 * Falls back to wanakana-only conversion if the tokenizer is unavailable.
 */
export async function convertToRomaji(text) {
  try {
    const tokenizer = await initTokenizer();
    const tokens = tokenizer.tokenize(text);

    // Group tokens into logical word segments
    const words = [];

    for (const token of tokens) {
      const pos = token.pos || "";
      const posDetail = token.pos_detail_1 || "";

      // Skip whitespace tokens — we insert our own spaces
      if (pos === "記号" && posDetail === "空白") continue;

      // Pick the best reading for this token
      let reading;
      if (token.reading && token.reading !== "*") {
        reading = token.reading;
      } else if (isKana(token.surface_form)) {
        reading = token.surface_form;
      } else {
        // No dict reading and surface is not pure kana.
        // Strip CJK kanji — wanakana cannot convert them and they would
        // appear unconverted in the output. ASCII, Latin, and punctuation
        // are kept because wanakana passes them through unchanged.
        reading = token.surface_form.replace(CJK_KANJI_RE, "");
      }

      // Determine whether this token attaches to the previous word
      const isSymbol = pos === "記号" || SYMBOL_ONLY.test(token.surface_form);
      const attachToPrev =
        isSymbol ||
        posDetail === "接尾" ||
        pos === "助動詞" ||
        posDetail === "非自立" ||
        (pos === "助詞" && (posDetail === "接続助詞" || posDetail === "終助詞"));

      if (attachToPrev && words.length > 0) {
        words[words.length - 1].parts.push(reading);
      } else {
        words.push({ parts: [reading], capitalize: pos !== "助詞" });
      }
    }

    // Fix geminate consonant (っ/ッ) at word-group boundaries.
    // wanakana silently drops a trailing small-tsu that has no following
    // character in the same string (e.g. toRomaji("バッ") === "ba").
    // Move it to the start of the next group so wanakana sees the consonant
    // it must double.
    for (let i = 0; i < words.length - 1; i++) {
      const parts = words[i].parts;
      const last = parts[parts.length - 1];
      if (last.length > 0 && (last.endsWith("っ") || last.endsWith("ッ"))) {
        const tsu = last.slice(-1);
        parts[parts.length - 1] = last.slice(0, -1);
        words[i + 1].parts.unshift(tsu);
      }
    }

    // Convert each word group to romaji
    const romajiWords = words.map((word) => {
      const combined = word.parts.join("");
      let romaji = kanaToRomaji(combined);
      if (word.capitalize && romaji.length > 0) {
        romaji = romaji.charAt(0).toUpperCase() + romaji.slice(1);
      }
      return romaji;
    });

    let result = romajiWords.join(" ");

    // Ensure the very first character is capitalized
    if (result.length > 0) {
      result = result.charAt(0).toUpperCase() + result.slice(1);
    }

    return result.replace(/\s+/g, " ").trim();
  } catch {
    // Fallback: wanakana converts kana only, kanji stays as-is
    return kanaToRomaji(text);
  }
}
