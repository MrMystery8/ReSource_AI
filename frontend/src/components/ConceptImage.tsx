import { useState } from 'react';
import type { ConceptVisualOutput } from '@resource-ai/shared';
import './ResultsView.css';

export interface ConceptImageProps {
  data: ConceptVisualOutput;
}

export function ConceptImage({ data }: ConceptImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className="concept-image">
      <h3 className="concept-image__title">ReSource Concept Visual</h3>
      <div className="concept-image__container">
        {!loaded && !error && (
          <div className="concept-image__placeholder" aria-label="Loading image">
            <span className="concept-image__placeholder-text">
              Loading concept visual...
            </span>
          </div>
        )}
        {error && (
          <div className="concept-image__error">
            Failed to load concept image.
          </div>
        )}
        <img
          src={data.imageUrl}
          alt="ReSource Concept Visual showing the recommended second-life project"
          className={`concept-image__img ${loaded ? 'concept-image__img--visible' : 'concept-image__img--hidden'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      </div>
    </div>
  );
}

export default ConceptImage;
