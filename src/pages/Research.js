
import React from 'react';
import './Research.css';

const papers = [
  {
    id: 1,
    type: 'Clinical Brief',
    title:
      'The Cortisol–Hair Loss Connection: Nutritional Stress, Meal Timing and Telogen Effluvium in Working Women',
    author: 'Kavya Yadla, M.Sc. (Physics)',
    doi: '10.5281/zenodo.22920200',
    description:
      'An exploration of nutritional stress, meal timing and their potential relationship with hair shedding in working professionals.',
    publicationUrl: 'https://doi.org/10.5281/zenodo.22920200',
    pdfUrl: '',
  },

  // Add your next paper as another object here.
];

function Research() {
  return (
    <main className="research-page">
      <header className="research-heading">
        <span className="research-kicker">
          SCIENCE · NUTRITION · WELLNESS
        </span>

        <h1>Research & Publications</h1>

        <p>
          Explore my research and evidence-informed work at the
          intersection of nutrition, metabolism and everyday health.
        </p>
      </header>

      {papers.length > 0 ? (
        <section className="research-grid">
          {papers.map((paper) => (
            <article className="research-card" key={paper.id}>
              <span className="research-tag">{paper.type}</span>

              <h2>{paper.title}</h2>

              <p className="research-author">
                By {paper.author}
              </p>

              <div className="research-doi">
                <span>PUBLICATION DOI</span>
                <a
                  href={paper.publicationUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {paper.doi} ↗
                </a>
              </div>

              <p className="research-description">
                {paper.description}
              </p>

              <div className="research-actions">
                <a
                  href={paper.publicationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="research-primary-button"
                >
                  View Publication <span>↗</span>
                </a>

                {paper.pdfUrl && (
                  <a
                    href={paper.pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="research-pdf-link"
                  >
                    Download PDF ↓
                  </a>
                )}
              </div>
            </article>
          ))}
        </section>
      ) : (
        <p>No publications are available yet.</p>
      )}

      <p className="research-disclaimer">
        Research summaries are provided for educational purposes and
        are not a substitute for individual medical advice.
      </p>
    </main>
  );
}

export default Research;
