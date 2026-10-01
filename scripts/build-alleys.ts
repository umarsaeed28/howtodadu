/** npm run build:alleys → data/alleys.geojson (public alleys from the city's right-of-way polygons). */
import { mkdirSync, writeFileSync } from "node:fs";
import { fetchAlleys } from "../src/lib/server/alleys";

fetchAlleys()
  .then((c) => {
    mkdirSync("data", { recursive: true });
    writeFileSync("data/alleys.geojson", JSON.stringify(c));
    console.log(`${c.features.length} alleys, pulled ${c.pulledAt}`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
