/** The disclaimer every investment summary carries, and the listing data notice. */
export const INVEST_DISCLAIMER =
  "ROI, rent, build cost, and value figures are estimates based on stated assumptions and are not investment, tax, or legal advice. Verify all numbers before purchasing.";

export default function InvestCompliance({ source }: { source: string }) {
  return (
    <footer className="iv-compliance">
      <p>{INVEST_DISCLAIMER}</p>
      <p>
        Listing information is provided by {source} and is deemed reliable but not guaranteed. Each listing names its
        listing brokerage where the feed provides it. Listings whose feed rules disallow display are not shown.
      </p>
    </footer>
  );
}
