/**
 * Build-time Japanese -> romaji conversion (kuromoji + wanakana).
 * Used by scrapeSongs.js so the browser doesn't need the kuromoji dictionary.
 */
const path = require("path");
const kuromoji = require("kuromoji");
const { toRomaji: kanaToRomaji, isKana } = require("wanakana");

const DICT_PATH = path.resolve(__dirname, "../node_modules/kuromoji/dict");

let tokenizerPromise = null;

function initTokenizer() {
    if (!tokenizerPromise) {
        tokenizerPromise = new Promise((resolve, reject) => {
            kuromoji.builder({ dicPath: DICT_PATH }).build((err, tokenizer) => {
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

// Small yōon kana (ya/yu/yo and small vowels). They must immediately follow the
// consonant kana they modify in the same string for wanakana to convert correctly.
const SMALL_YOON_RE = /^[ゃゅょぁぃぅぇぉャュョァィゥェォ]/;

const JAPANESE_CHAR_RE = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

function hasJapanese(text) {
    return JAPANESE_CHAR_RE.test(text);
}

/**
 * Convert a Japanese text string (including kanji) to word-spaced,
 * title-cased romaji. Falls back to wanakana-only conversion on failure.
 */
async function convertToRomaji(text) {
    try {
        const tokenizer = await initTokenizer();
        const tokens = tokenizer.tokenize(text);

        const words = [];

        for (const token of tokens) {
            const pos = token.pos || "";
            const posDetail = token.pos_detail_1 || "";

            if (pos === "記号" && posDetail === "空白") continue;

            let reading;
            if (token.reading && token.reading !== "*") {
                reading = token.reading;
            } else if (isKana(token.surface_form)) {
                reading = token.surface_form;
            } else {
                reading = token.surface_form.replace(CJK_KANJI_RE, "");
            }

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

        // Move a trailing small-tsu to the next group so wanakana doubles the consonant.
        for (let i = 0; i < words.length - 1; i++) {
            const parts = words[i].parts;
            const last = parts[parts.length - 1];
            if (last.length > 0 && (last.endsWith("っ") || last.endsWith("ッ"))) {
                const tsu = last.slice(-1);
                parts[parts.length - 1] = last.slice(0, -1);
                words[i + 1].parts.unshift(tsu);
            }
        }

        // A small kana always modifies the preceding consonant kana; merge groups
        // that start with one into the previous group.
        for (let i = words.length - 1; i >= 1; i--) {
            const nextParts = words[i].parts;
            const first = nextParts[0];
            if (first && SMALL_YOON_RE.test(first)) {
                const yoon = first.charAt(0);
                nextParts[0] = first.slice(1);
                if (nextParts[0] === "") nextParts.splice(0, 1);
                const prevParts = words[i - 1].parts;
                if (prevParts.length > 0) {
                    prevParts[prevParts.length - 1] += yoon;
                }
                prevParts.push(...nextParts);
                words.splice(i, 1);
            }
        }

        const romajiWords = words.map((word) => {
            const combined = word.parts.join("");
            // wanakana maps fu + small vowel to "fua"/"fyi"/...; use "f" + full vowel instead.
            const preprocessed = combined
                .replace(/ファ/g, "fア").replace(/ふぁ/g, "fあ")
                .replace(/フィ/g, "fイ").replace(/ふぃ/g, "fい")
                .replace(/フェ/g, "fエ").replace(/ふぇ/g, "fえ")
                .replace(/フォ/g, "fオ").replace(/ふぉ/g, "fお");
            let romaji = kanaToRomaji(preprocessed);
            if (word.capitalize && romaji.length > 0) {
                romaji = romaji.charAt(0).toUpperCase() + romaji.slice(1);
            }
            return romaji;
        });

        let result = romajiWords.join(" ");
        if (result.length > 0) {
            result = result.charAt(0).toUpperCase() + result.slice(1);
        }
        return result.replace(/\s+/g, " ").trim();
    } catch {
        return kanaToRomaji(text);
    }
}

/** Adds `romajiTitle` to every song whose title contains Japanese characters. */
async function addRomajiTitles(songs) {
    try {
        await initTokenizer();
    } catch (e) {
        console.warn(`⚠️  Romaji tokenizer unavailable (${e.message}); skipping romaji titles.`);
        return songs;
    }
    const out = [];
    for (const song of songs) {
        if (!hasJapanese(song.title)) {
            out.push(song);
            continue;
        }
        out.push({ ...song, romajiTitle: await convertToRomaji(song.title) });
    }
    return out;
}

module.exports = { addRomajiTitles, convertToRomaji };
