import { describe, it, expect } from "vitest";
import { parseAddressesFromCsvText } from "../parse-csv-addresses";

describe("parseAddressesFromCsvText", () => {
  it("reads address column from header row", () => {
    const csv = `address,city,zip
7721 24th Ave NW,Ballard,98117
1526 N 107th St,Seattle,98133`;
    expect(parseAddressesFromCsvText(csv)).toEqual([
      "7721 24th Ave NW",
      "1526 N 107th St",
    ]);
  });

  it("accepts one address per line without header", () => {
    const csv = `7721 24th Ave NW Seattle
1526 N 107th St, Seattle, WA, 98133`;
    expect(parseAddressesFromCsvText(csv)).toEqual([
      "7721 24th Ave NW Seattle",
      "1526 N 107th St",
    ]);
  });

  it("dedupes case-insensitively", () => {
    const csv = `Same St Seattle
same st seattle`;
    expect(parseAddressesFromCsvText(csv)).toEqual(["Same St Seattle"]);
  });
});
