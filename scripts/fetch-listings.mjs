import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const SOURCE_URL =
  "https://kellieortiz.samsonproperties.net/json.php?setbounds=&showagent=0&showagency=0&similar=0&sortby=listings.listingdate%2BDESC&showalerts=0&alertnumber=0&search_request%5Bstype%5D=advanced&search_request%5Badvtypes%5D%5B%5D=1&search_request%5Badvtypes%5D%5B%5D=2&search_request%5Badvtypes%5D%5B%5D=3&search_request%5Badvtypes%5D%5B%5D=4&search_request%5Badvtypes%5D%5B%5D=5&search_request%5Badvtypes%5D%5B%5D=6&search_request%5Badvtypes%5D%5B%5D=9&search_request%5Badvtypes%5D%5B%5D=12&search_request%5Badvtypes%5D%5B%5D=31&search_request%5Badvtypes%5D%5B%5D=43&search_request%5Badvtypes%5D%5B%5D=55&search_request%5Badvtypes%5D%5B%5D=56&search_request%5Badvmax%5D=100000000&search_request%5Badvmaxfootage%5D=30000&search_request%5Badvsortby%5D=listings.listingdate+DESC%2Clistings.mlsid";

const RESIDENTIAL_TYPES = new Set(["Single Family", "Townhouse", "Condos", "Multi-Family"]);
const NORTHERN_VIRGINIA_CITIES = new Set([
  "Alexandria",
  "Aldie",
  "Annandale",
  "Arlington",
  "Ashburn",
  "Burke",
  "Centreville",
  "Chantilly",
  "Dumfries",
  "Fairfax",
  "Fairfax Station",
  "Falls Church",
  "Great Falls",
  "Herndon",
  "Leesburg",
  "Lorton",
  "Manassas",
  "McLean",
  "Mclean",
  "Oakton",
  "Reston",
  "Springfield",
  "Vienna",
  "Woodbridge"
]);

const cleanText = (value) => String(value ?? "").trim().replace(/\s+/g, " ");
const parsePrice = (value) => Number(cleanText(value).replace(/[^\d]/g, "")) || 0;
const parseNumber = (value) => Number(String(value ?? "").replace(/,/g, "")) || 0;
const normalizeListingUrl = (value) => {
  const url = cleanText(value);
  if (url.startsWith("/")) return `https://kellieortiz.samsonproperties.net${url}`;
  return url;
};

const formatPrice = (price) => {
  if (!price) return "Price on request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(price);
};

const readSource = async () => {
  if (process.env.LISTINGS_SOURCE_FILE) {
    return JSON.parse(await readFile(process.env.LISTINGS_SOURCE_FILE, "utf8"));
  }

  const response = await fetch(SOURCE_URL);
  if (!response.ok) {
    throw new Error(`BoldTrail feed returned ${response.status} ${response.statusText}`);
  }
  return response.json();
};

const source = await readSource();
const markers = Array.isArray(source.markers) ? source.markers : [];

const listings = markers
  .map((listing, index) => {
    const city = cleanText(listing.city);
    const state = cleanText(listing.state).toUpperCase();
    const type = cleanText(listing.type);
    const price = parsePrice(listing.price);
    const isNorthernVirginia = state === "VA" && NORTHERN_VIRGINIA_CITIES.has(city);

    return {
      id: cleanText(listing.mlsid || listing.mls || `${listing.address}-${index}`),
      address: cleanText(listing.address),
      city,
      state,
      zip: cleanText(listing.zip),
      type,
      statusLabel: cleanText(listing.listing_label) || "Active",
      price,
      priceLabel: cleanText(listing.labelprice) || formatPrice(price),
      beds: parseNumber(listing.beds),
      baths: parseNumber(listing.baths),
      sqft: parseNumber(listing.footage),
      acres: parseNumber(listing.acres),
      image: cleanText(listing.pic),
      url: normalizeListingUrl(listing.linktolisting),
      feedRank: index,
      isNorthernVirginia,
      isAlexandria: city === "Alexandria"
    };
  })
  .filter((listing) => {
    return (
      RESIDENTIAL_TYPES.has(listing.type) &&
      ["VA", "MD", "DC"].includes(listing.state) &&
      listing.image &&
      listing.url &&
      listing.price >= 150000 &&
      listing.price <= 3000000
    );
  })
  .slice(0, 180);

const output = {
  generatedAt: new Date().toISOString(),
  source: SOURCE_URL,
  sourceReturned: markers.length,
  sourceTotal: Number(source.listingsTotal) || source.listingsTotal || markers.length,
  filters: {
    sort: "Days on website from listings.listingdate DESC",
    includedTypes: [...RESIDENTIAL_TYPES],
    priceRange: "$150,000 to $3,000,000",
    market: "VA, MD, DC",
    displayLimit: 180
  },
  listings
};

const outputPath = path.resolve("data/listings.json");
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

console.log(`Wrote ${listings.length} listings to ${outputPath}`);
