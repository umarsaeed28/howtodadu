import type { Study, StudyRow } from "@/lib/report/study";

/** A two- or three-column study table, like an architect's: item, requirement or description, and the code basis. */
export function StudyTable({ rows, head, withRef = false }: { rows: StudyRow[]; head: [string, string, string?]; withRef?: boolean }) {
  return (
    <div className="st-wrap">
      <table className="st">
        <thead>
          <tr>
            <th scope="col">{head[0]}</th>
            <th scope="col">{head[1]}</th>
            {withRef && <th scope="col">{head[2] ?? "Basis"}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.item}>
              <th scope="row">{r.item}</th>
              <td>{r.value}</td>
              {withRef && <td className="st-ref">{r.ref ?? ""}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StudyAnalysis({ block }: { block: { rows: StudyRow[]; summary: string } }) {
  return (
    <>
      <StudyTable rows={block.rows} head={["Item", "Amount"]} />
      <p className="st-summary">{block.summary}</p>
    </>
  );
}

export function StudyUtilities({ study }: { study: Study }) {
  return (
    <>
      <p className="st-summary" style={{ marginTop: 0 }}>{study.utilities.summary}</p>
      <ul className="st-list">{study.utilities.clearances.map((c) => <li key={c}>{c}</li>)}</ul>
      <p className="st-note">Typical Seattle City Light clearances. Overhead lines are not in public data, so check the site.</p>
    </>
  );
}

export function StudyConclusion({ study }: { study: Study }) {
  return (
    <>
      <p className="st-conclusion">{study.conclusion}</p>
      <p className="st-k">Recommended next steps</p>
      <ul className="st-list">{study.dueDiligence.map((d) => <li key={d}>{d}</li>)}</ul>
    </>
  );
}
