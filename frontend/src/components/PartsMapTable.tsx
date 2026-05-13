import type { ReusablePartsMapOutput, PartVerdict } from '@resource-ai/shared';
import './ResultsView.css';

export interface PartsMapTableProps {
  data: ReusablePartsMapOutput;
}

const VERDICT_CLASS_MAP: Record<PartVerdict, string> = {
  Salvage: 'parts-map__verdict--salvage',
  Conditional: 'parts-map__verdict--conditional',
  'Do Not Access': 'parts-map__verdict--do-not-access',
};

export function PartsMapTable({ data }: PartsMapTableProps) {
  return (
    <div className="parts-map">
      <h3 className="parts-map__title">Reusable Parts Map</h3>
      <div className="parts-map__table-wrapper">
        <table className="parts-map__table">
          <thead>
            <tr>
              <th>Part/Resource</th>
              <th>Likely Presence</th>
              <th>Reuse Value</th>
              <th>Possible Use</th>
              <th>Skill Needed</th>
              <th>Safety Concern</th>
              <th>Verdict</th>
            </tr>
          </thead>
          <tbody>
            {data.parts.map((row, index) => (
              <tr key={index}>
                <td>{row.partResource}</td>
                <td>{row.likelyPresence}</td>
                <td>{row.reuseValue}</td>
                <td>{row.possibleUse}</td>
                <td>{row.skillNeeded}</td>
                <td>{row.safetyConcern}</td>
                <td>
                  <span
                    className={`parts-map__verdict ${VERDICT_CLASS_MAP[row.verdict]}`}
                  >
                    {row.verdict}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PartsMapTable;
