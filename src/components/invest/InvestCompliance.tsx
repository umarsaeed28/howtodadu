/** The disclaimer every Invest page carries, and the broker of record. */
export const INVEST_DISCLAIMER =
  "ROI, rent, build cost, and value figures are estimates based on stated assumptions and are not investment, tax, or legal advice. Verify all numbers before purchasing.";

/** PLACEHOLDER: the broker's Washington license number. Replace with the real number before launch. */
export const BROKER_LICENSE = "[license number]";

export default function InvestCompliance({ source }: { source: string }) {
  return (
    <footer className="iv-compliance">
      <p>{INVEST_DISCLAIMER}</p>
      <p>
        Listing information is provided by {source} and is deemed reliable but not guaranteed. Each listing names its
        listing brokerage where the feed provides it. Listings whose feed rules disallow display are not shown.
      </p>
      <p>Umar Saeed, licensed real estate broker, Dalton Wade, Inc. License {BROKER_LICENSE}.</p>
    </footer>
  );
}
