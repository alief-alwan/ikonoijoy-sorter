#!/usr/bin/env node
/**
 * Scrapes IKONOIJOY member data from the jpop.fandom.com wiki using the
 * MediaWiki API and saves it as public/members.json.
 *
 * Run automatically via the prebuild / prestart npm scripts.
 * If the wiki is unreachable, an existing public/members.json is preserved;
 * if no file exists yet the bundled FALLBACK_MEMBERS data is written instead.
 */

const fs = require("fs");
const path = require("path");

const OUT_FILE = path.resolve(__dirname, "../public/members.json");
const WIKI_API = "https://jpop.fandom.com/api.php";
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// ── Zodiac helpers ─────────────────────────────────────────────────────────
const ZODIAC_RANGES = [
  { sign: "Capricorn", start: [12, 22], end: [12, 31] },
  { sign: "Capricorn", start: [1, 1], end: [1, 19] },
  { sign: "Aquarius", start: [1, 20], end: [2, 18] },
  { sign: "Pisces", start: [2, 19], end: [3, 20] },
  { sign: "Aries", start: [3, 21], end: [4, 19] },
  { sign: "Taurus", start: [4, 20], end: [5, 20] },
  { sign: "Gemini", start: [5, 21], end: [6, 20] },
  { sign: "Cancer", start: [6, 21], end: [7, 22] },
  { sign: "Leo", start: [7, 23], end: [8, 22] },
  { sign: "Virgo", start: [8, 23], end: [9, 22] },
  { sign: "Libra", start: [9, 23], end: [10, 22] },
  { sign: "Scorpio", start: [10, 23], end: [11, 21] },
  { sign: "Sagittarius", start: [11, 22], end: [12, 21] },
];

function zodiacFromDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const month = d.getMonth() + 1;
  const day = d.getDate();
  for (const r of ZODIAC_RANGES) {
    const [sm, sd] = r.start;
    const [em, ed] = r.end;
    if (
      (month === sm && day >= sd) ||
      (month === em && day <= ed) ||
      (sm < em && month > sm && month < em)
    ) {
      return r.sign;
    }
  }
  return null;
}

// ── HTTP helper ────────────────────────────────────────────────────────────
async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": BROWSER_UA },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return response.json();
}

function buildApiUrl(params) {
  const base = new URL(WIKI_API);
  for (const [k, v] of Object.entries(params)) {
    base.searchParams.set(k, v);
  }
  return base.toString();
}

// ── Infobox parser ─────────────────────────────────────────────────────────
/**
 * Parses a MediaWiki infobox template from raw wikitext.
 * Returns a plain object of field→value.
 */
function parseInfobox(wikitext) {
  if (!wikitext) return {};
  // Match the first template block (handles nested {{…}})
  const startIdx = wikitext.indexOf("{{");
  if (startIdx === -1) return {};

  let depth = 0;
  let end = startIdx;
  for (let i = startIdx; i < wikitext.length; i++) {
    if (wikitext[i] === "{" && wikitext[i + 1] === "{") {
      depth++;
      i++;
    } else if (wikitext[i] === "}" && wikitext[i + 1] === "}") {
      depth--;
      i++;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  const block = wikitext.slice(startIdx + 2, end - 1);
  const fields = {};
  // Split on pipe but only at the top level (not inside nested {{ }})
  const parts = [];
  let current = "";
  let d = 0;
  for (let i = 0; i < block.length; i++) {
    const ch = block[i];
    if (ch === "{" && block[i + 1] === "{") { d++; current += "{{"; i++; continue; }
    if (ch === "}" && block[i + 1] === "}") { d--; current += "}}"; i++; continue; }
    if (ch === "|" && d === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());

  for (const part of parts.slice(1)) { // skip template name
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim().toLowerCase().replace(/[\s_-]+/g, "_");
    const val = cleanWikiValue(part.slice(eq + 1).trim());
    if (val) fields[key] = val;
  }
  return fields;
}

/** Strip wiki markup from a value. */
function cleanWikiValue(val) {
  if (!val) return null;
  // Remove [[File:...]] image links entirely
  val = val.replace(/\[\[File:[^\]]*\]\]/gi, "");
  // Unwrap [[link|text]] → text, or [[link]] → link
  val = val.replace(/\[\[(?:[^|\]]*\|)?([^\]]+)\]\]/g, "$1");
  // Remove {{…}} template calls
  val = val.replace(/\{\{[^}]*\}\}/g, "");
  // Remove HTML tags (including incomplete ones) and all angle brackets
  val = val.replace(/[<>]/g, "");
  // Remove wikitext formatting
  val = val.replace(/'{2,3}/g, "");
  // Collapse whitespace
  val = val.replace(/\s+/g, " ").trim();
  return val || null;
}

/** Extract a reasonable date string (YYYY-MM-DD) from a messy wiki value. */
function normalizeDate(raw) {
  if (!raw) return null;
  // Try ISO format
  const iso = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  // Try "January 21, 2007" / "21 January 2007"
  const months = {
    january: "01", february: "02", march: "03", april: "04",
    may: "05", june: "06", july: "07", august: "08",
    september: "09", october: "10", november: "11", december: "12",
  };
  const mEn = raw.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/i);
  if (mEn) {
    const mo = months[mEn[1].toLowerCase()];
    if (mo) return `${mEn[3]}-${mo}-${mEn[2].padStart(2, "0")}`;
  }
  const mEnRev = raw.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/i);
  if (mEnRev) {
    const mo = months[mEnRev[2].toLowerCase()];
    if (mo) return `${mEnRev[3]}-${mo}-${mEnRev[1].padStart(2, "0")}`;
  }
  return null;
}

// ── Wiki fetch helpers ─────────────────────────────────────────────────────
/** Fetch wikitext + thumbnail for a list of page titles (batched ≤50). */
async function fetchPagesBatch(titles) {
  const url = buildApiUrl({
    action: "query",
    prop: "revisions|pageimages",
    rvprop: "content",
    rvslots: "main",
    pithumbsize: "300",
    format: "json",
    titles: titles.join("|"),
  });
  const json = await fetchJson(url);
  return Object.values(json.query?.pages ?? {});
}

/** Fetch all members of a wiki category. */
async function fetchCategoryMembers(categoryTitle) {
  const url = buildApiUrl({
    action: "query",
    list: "categorymembers",
    cmtitle: categoryTitle,
    cmlimit: "100",
    cmtype: "page",
    format: "json",
  });
  const json = await fetchJson(url);
  return (json.query?.categorymembers ?? []).map((m) => m.title);
}

// ── Member data builder ────────────────────────────────────────────────────
function buildMember(pageData, groupName) {
  const wikitext =
    pageData.revisions?.[0]?.slots?.main?.["*"] ??
    pageData.revisions?.[0]?.["*"] ??
    "";
  const info = parseInfobox(wikitext);

  // Field aliases covering various infobox templates on the wiki
  const get = (...keys) => {
    for (const k of keys) {
      const v = info[k.toLowerCase().replace(/[\s-]+/g, "_")];
      if (v) return v;
    }
    return null;
  };

  const nameKanji =
    get("kanji", "japanese_name", "japanese", "kanji_name") ??
    (pageData.title || "").replace(/_/g, " ");
  const romaji =
    get("romaji", "romanized", "romanization", "romanised", "latin_name") ??
    (pageData.title || "").replace(/_/g, " ");
  const dobRaw = get("born", "birthday", "birth_date", "dob", "birthdate");
  const dob = normalizeDate(dobRaw ?? get("birth_year"));
  const height = get("height") ?? null;
  const bloodType = get("blood_type", "blood", "bloodtype") ?? null;
  const birthplace = get(
    "birthplace",
    "place_of_birth",
    "birth_place",
    "hometown",
    "origin"
  ) ?? null;
  const memberColor = get(
    "color",
    "member_color",
    "image_color",
    "colour",
    "member_colour",
    "image_colour"
  ) ?? null;
  const photoUrl =
    pageData.thumbnail?.source ?? null;
  const zodiac = zodiacFromDate(dob);

  // Determine group from infobox or use the category group
  const infoGroup = get("group", "groups", "unit") ?? groupName;

  return {
    id: pageData.pageid ?? pageData.title,
    name: nameKanji,
    romaji,
    group: infoGroup,
    photo: photoUrl,
    dateOfBirth: dob,
    birthplace,
    height,
    bloodType,
    zodiac,
    memberColor,
  };
}

// ── Groups config ──────────────────────────────────────────────────────────
const GROUPS = [
  {
    name: "=LOVE",
    categories: [
      "Category:=LOVE members",
      "Category:=LOVE Members",
      "Category:＝LOVE members",
      "Category:＝LOVE Members",
      "Category:=LOVE",
    ],
  },
  {
    name: "≠ME",
    categories: [
      "Category:≠ME members",
      "Category:≠ME Members",
      "Category:Notme members",
      "Category:NotMe members",
      "Category:≠ME",
    ],
  },
  {
    name: "≒JOY",
    categories: [
      "Category:≒JOY members",
      "Category:≒JOY Members",
      "Category:NearlyEqualJoy members",
      "Category:NearlyEqualJOY members",
      "Category:≒JOY",
    ],
  },
];

// ── Fallback data ──────────────────────────────────────────────────────────
// Used when the wiki is unreachable and no local file exists.
const FALLBACK_MEMBERS = [
  // =LOVE
  { id: "elove-1", name: "大谷映美里", romaji: "Otani Emiri", group: "=LOVE", photo: null, dateOfBirth: "2000-01-16", birthplace: "Osaka, Japan", height: "159 cm", bloodType: "A", zodiac: "Capricorn", memberColor: "Red" },
  { id: "elove-2", name: "大場花菜", romaji: "Oba Hana", group: "=LOVE", photo: null, dateOfBirth: "2001-03-12", birthplace: "Tokyo, Japan", height: "157 cm", bloodType: "B", zodiac: "Pisces", memberColor: "Yellow" },
  { id: "elove-3", name: "音嶋莉沙", romaji: "Otoshima Risa", group: "=LOVE", photo: null, dateOfBirth: "2001-05-25", birthplace: "Fukuoka, Japan", height: "158 cm", bloodType: "O", zodiac: "Gemini", memberColor: "Lime Green" },
  { id: "elove-4", name: "齊藤なぎさ", romaji: "Saito Nagisa", group: "=LOVE", photo: null, dateOfBirth: "2000-09-02", birthplace: "Kanagawa, Japan", height: "162 cm", bloodType: "B", zodiac: "Virgo", memberColor: "Coral Pink" },
  { id: "elove-5", name: "佐々木舞香", romaji: "Sasaki Maika", group: "=LOVE", photo: null, dateOfBirth: "2001-02-04", birthplace: "Chiba, Japan", height: "155 cm", bloodType: "O", zodiac: "Aquarius", memberColor: "Lavender" },
  { id: "elove-6", name: "高松瞳", romaji: "Takamatsu Hitomi", group: "=LOVE", photo: null, dateOfBirth: "2001-08-20", birthplace: "Kagawa, Japan", height: "156 cm", bloodType: "A", zodiac: "Leo", memberColor: "Orange" },
  { id: "elove-7", name: "瀧脇笙古", romaji: "Takiwaki Shoko", group: "=LOVE", photo: null, dateOfBirth: "2002-03-22", birthplace: "Hyogo, Japan", height: "160 cm", bloodType: "B", zodiac: "Aries", memberColor: "Sky Blue" },
  { id: "elove-8", name: "野口衣織", romaji: "Noguchi Iori", group: "=LOVE", photo: null, dateOfBirth: "2002-09-14", birthplace: "Tokyo, Japan", height: "163 cm", bloodType: "A", zodiac: "Virgo", memberColor: "White" },
  { id: "elove-9", name: "諸橋沙夏", romaji: "Morohashi Sana", group: "=LOVE", photo: null, dateOfBirth: "2002-07-23", birthplace: "Niigata, Japan", height: "158 cm", bloodType: "A", zodiac: "Leo", memberColor: "Mint" },
  { id: "elove-10", name: "山本杏奈", romaji: "Yamamoto Anna", group: "=LOVE", photo: null, dateOfBirth: "2003-02-06", birthplace: "Osaka, Japan", height: "160 cm", bloodType: "B", zodiac: "Aquarius", memberColor: "Pink" },
  // ≠ME
  { id: "nme-1", name: "尾木波菜", romaji: "Ogi Hana", group: "≠ME", photo: null, dateOfBirth: "2003-08-15", birthplace: "Tokyo, Japan", height: "158 cm", bloodType: "O", zodiac: "Leo", memberColor: "Pink" },
  { id: "nme-2", name: "落合希来里", romaji: "Ochiai Kirari", group: "≠ME", photo: null, dateOfBirth: "2003-10-22", birthplace: "Aichi, Japan", height: "156 cm", bloodType: "A", zodiac: "Libra", memberColor: "Coral" },
  { id: "nme-3", name: "蟹澤萌子", romaji: "Kanisawa Moeko", group: "≠ME", photo: null, dateOfBirth: "2003-09-06", birthplace: "Kanagawa, Japan", height: "160 cm", bloodType: "B", zodiac: "Virgo", memberColor: "Purple" },
  { id: "nme-4", name: "川中子奈月心", romaji: "Kawaguchi Natsune", group: "≠ME", photo: null, dateOfBirth: "2004-05-14", birthplace: "Saitama, Japan", height: "159 cm", bloodType: "O", zodiac: "Taurus", memberColor: "Yellow" },
  { id: "nme-5", name: "河野奈津美", romaji: "Kawanago Natsumi", group: "≠ME", photo: null, dateOfBirth: "2003-12-24", birthplace: "Hyogo, Japan", height: "157 cm", bloodType: "A", zodiac: "Capricorn", memberColor: "Sky Blue" },
  { id: "nme-6", name: "櫻井もも", romaji: "Sakurai Momo", group: "≠ME", photo: null, dateOfBirth: "2003-03-17", birthplace: "Tokyo, Japan", height: "162 cm", bloodType: "O", zodiac: "Pisces", memberColor: "Peach" },
  { id: "nme-7", name: "涼海みさき", romaji: "Suganami Mirei", group: "≠ME", photo: null, dateOfBirth: "2004-07-15", birthplace: "Osaka, Japan", height: "158 cm", bloodType: "B", zodiac: "Cancer", memberColor: "Mint" },
  { id: "nme-8", name: "鈴木瞳美", romaji: "Suzuki Hitomi", group: "≠ME", photo: null, dateOfBirth: "2003-11-09", birthplace: "Chiba, Japan", height: "157 cm", bloodType: "A", zodiac: "Scorpio", memberColor: "Gold" },
  { id: "nme-9", name: "谷崎早耶", romaji: "Tanizaki Saya", group: "≠ME", photo: null, dateOfBirth: "2003-05-28", birthplace: "Fukuoka, Japan", height: "159 cm", bloodType: "O", zodiac: "Gemini", memberColor: "Red" },
  { id: "nme-10", name: "冨田菜々風", romaji: "Tomita Nanaka", group: "≠ME", photo: null, dateOfBirth: "2004-04-01", birthplace: "Nagano, Japan", height: "160 cm", bloodType: "B", zodiac: "Aries", memberColor: "Orange" },
  { id: "nme-11", name: "永田詩央里", romaji: "Nagata Shiori", group: "≠ME", photo: null, dateOfBirth: "2002-08-24", birthplace: "Kanagawa, Japan", height: "165 cm", bloodType: "A", zodiac: "Virgo", memberColor: "Lime" },
  { id: "nme-12", name: "本田珠由記", romaji: "Honda Miyuki", group: "≠ME", photo: null, dateOfBirth: "2003-06-17", birthplace: "Shizuoka, Japan", height: "156 cm", bloodType: "B", zodiac: "Gemini", memberColor: "Lavender" },
  // ≒JOY
  { id: "njoy-1", name: "相田珠里依", romaji: "Aida Jurii", group: "≒JOY", photo: null, dateOfBirth: "2006-10-13", birthplace: "Tokyo, Japan", height: "158 cm", bloodType: "A", zodiac: "Libra", memberColor: "Pink" },
  { id: "njoy-2", name: "天野香乃愛", romaji: "Amano Konoa", group: "≒JOY", photo: null, dateOfBirth: "2007-01-21", birthplace: "Osaka, Japan", height: "157 cm", bloodType: "O", zodiac: "Aquarius", memberColor: "Light Pink" },
  { id: "njoy-3", name: "市原歩夢", romaji: "Ichihara Ayumi", group: "≒JOY", photo: null, dateOfBirth: "2006-09-14", birthplace: "Kanagawa, Japan", height: "159 cm", bloodType: "B", zodiac: "Virgo", memberColor: "Blue" },
  { id: "njoy-4", name: "江角怜音", romaji: "Esumi Renon", group: "≒JOY", photo: null, dateOfBirth: "2007-02-09", birthplace: "Shimane, Japan", height: "162 cm", bloodType: "A", zodiac: "Aquarius", memberColor: "Yellow" },
  { id: "njoy-5", name: "押田美月", romaji: "Oshida Mitsuki", group: "≒JOY", photo: null, dateOfBirth: "2006-08-21", birthplace: "Tokyo, Japan", height: "156 cm", bloodType: "O", zodiac: "Leo", memberColor: "Orange" },
  { id: "njoy-6", name: "大西葵", romaji: "Onishi Aoi", group: "≒JOY", photo: null, dateOfBirth: "2007-03-09", birthplace: "Osaka, Japan", height: "160 cm", bloodType: "B", zodiac: "Pisces", memberColor: "Mint" },
  { id: "njoy-7", name: "小澤愛実", romaji: "Ozawa Aimi", group: "≒JOY", photo: null, dateOfBirth: "2006-11-30", birthplace: "Aichi, Japan", height: "158 cm", bloodType: "A", zodiac: "Sagittarius", memberColor: "Purple" },
  { id: "njoy-8", name: "高橋舞", romaji: "Takahashi Mai", group: "≒JOY", photo: null, dateOfBirth: "2006-07-17", birthplace: "Hokkaido, Japan", height: "163 cm", bloodType: "O", zodiac: "Cancer", memberColor: "Red" },
  { id: "njoy-9", name: "藤沢莉子", romaji: "Fujisawa Riko", group: "≒JOY", photo: null, dateOfBirth: "2007-04-05", birthplace: "Kanagawa, Japan", height: "157 cm", bloodType: "B", zodiac: "Aries", memberColor: "Coral" },
  { id: "njoy-10", name: "村山結香", romaji: "Murayama Yuuka", group: "≒JOY", photo: null, dateOfBirth: "2006-12-10", birthplace: "Tokyo, Japan", height: "161 cm", bloodType: "A", zodiac: "Sagittarius", memberColor: "Sky Blue" },
  { id: "njoy-11", name: "山田百華", romaji: "Yamada Momoka", group: "≒JOY", photo: null, dateOfBirth: "2006-06-25", birthplace: "Hyogo, Japan", height: "159 cm", bloodType: "O", zodiac: "Cancer", memberColor: "Lime" },
  { id: "njoy-12", name: "山野愛月", romaji: "Yamano Arisu", group: "≒JOY", photo: null, dateOfBirth: "2007-05-02", birthplace: "Saitama, Japan", height: "160 cm", bloodType: "B", zodiac: "Taurus", memberColor: "Gold" },
];

// ── Main scrape logic ──────────────────────────────────────────────────────

/**
 * Uses the allcategories API to discover category names that start with the
 * group name.  Returns them as "Category:…" strings.
 */
async function discoverCategories(groupName) {
  const discovered = new Set();
  try {
    const url = buildApiUrl({
      action: "query",
      list: "allcategories",
      acprefix: groupName,
      aclimit: "20",
      format: "json",
    });
    const json = await fetchJson(url);
    for (const cat of json.query?.allcategories ?? []) {
      discovered.add(`Category:${cat["*"]}`);
    }
  } catch (e) {
    console.warn(`  Category discovery for "${groupName}" failed: ${e.message}`);
  }
  return [...discovered];
}

async function scrapeGroup(group) {
  const allTitles = [];

  // Dynamically discover categories, then append hardcoded ones as fallback
  const dynamic = await discoverCategories(group.name);
  const seen = new Set();
  const categoriesToTry = [];
  for (const cat of [...dynamic, ...group.categories]) {
    if (!seen.has(cat)) {
      seen.add(cat);
      categoriesToTry.push(cat);
    }
  }
  console.log(`  Trying categories: ${categoriesToTry.join(", ")}`);

  for (const cat of categoriesToTry) {
    try {
      const titles = await fetchCategoryMembers(cat);
      console.log(`  "${cat}": ${titles.length} page(s)`);
      for (const t of titles) {
        if (!allTitles.includes(t)) allTitles.push(t);
      }
      if (allTitles.length > 0) break; // found members in this category
    } catch (e) {
      console.warn(`  Category "${cat}" failed: ${e.message}`);
    }
  }

  if (allTitles.length === 0) {
    console.warn(`  No member pages found for ${group.name}`);
    return [];
  }

  console.log(`  ${group.name}: found ${allTitles.length} member pages`);
  const members = [];

  // Batch the title fetches (MediaWiki allows up to 50 per request)
  for (let i = 0; i < allTitles.length; i += 50) {
    const batch = allTitles.slice(i, i + 50);
    try {
      const pages = await fetchPagesBatch(batch);
      for (const page of pages) {
        if (page.missing !== undefined) continue;
        members.push(buildMember(page, group.name));
      }
    } catch (e) {
      console.warn(`  Batch fetch failed: ${e.message}`);
    }
  }
  return members;
}

async function main() {
  console.log("🔍 Scraping IKONOIJOY member data from jpop.fandom.com …");
  let members = [];
  let scraped = false;

  try {
    for (const group of GROUPS) {
      console.log(`Fetching ${group.name} …`);
      const groupMembers = await scrapeGroup(group);
      members.push(...groupMembers);
    }
    if (members.length > 0) {
      scraped = true;
      console.log(`✅ Scraped ${members.length} members from the wiki.`);
    } else {
      console.warn("⚠️  No members scraped from wiki.");
    }
  } catch (e) {
    console.warn(`⚠️  Wiki scrape failed: ${e.message}`);
  }

  if (!scraped) {
    if (fs.existsSync(OUT_FILE)) {
      console.log("ℹ️  Using existing public/members.json.");
      return;
    }
    console.log("ℹ️  Writing fallback member data.");
    members = FALLBACK_MEMBERS;
  }

  const output = {
    scraped: scraped ? new Date().toISOString() : null,
    source: scraped ? WIKI_API : "fallback",
    members,
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(output, null, 2), "utf8");
  console.log(`💾 Saved ${members.length} members to public/members.json`);
}

main().catch((e) => {
  console.error("Fatal scrape error:", e);
  process.exit(0); // Don't fail the build
});
