import { MODULES } from '../../support/routes';
import { openModule } from '../../support/session';
import { note } from '../../support/findings';

const M = MODULES.media;

describe(`Modul: ${M.label} (${M.path})`, () => {
  beforeEach(function () {
    openModule(this, M);
  });

  it('renders the media heading', () => {
    cy.contains('h1', 'Média').should('be.visible');
  });

  it('renders the media tabs', () => {
    cy.visibleText().then((text) => {
      const missing = ['Fotky', 'Videa', 'Soutěže'].filter((t) => !text.includes(t));
      expect(missing, 'media tabs present').to.deep.equal([]);
    });
  });

  it('gives every rendered image an alt attribute', () => {
    // Media is the one module where a missing alt is not a footnote: the whole
    // page is images, so an unlabelled grid is unusable on a screen reader.
    cy.get('img').then(($imgs) => {
      const missing = $imgs
        .toArray()
        .filter((img) => !img.getAttribute('alt'))
        .map((img) => img.getAttribute('src') ?? '(no src)');
      if (missing.length > 0) {
        note(
          M.id,
          M.path,
          'a11y-img-alt',
          `${missing.length} obrázků bez atributu alt: ${missing.slice(0, 5).join(', ')}`,
        );
      }
      expect(missing, 'images without alt text').to.deep.equal([]);
    });
  });

  it('does not present advertising placeholders as real content', () => {
    cy.visibleText().then((text) => {
      if (text.includes('Hlavní nadpis reklamy') || text.includes('Podnadpis')) {
        note(
          M.id,
          M.path,
          'placeholder-copy',
          'reklamní pozice stále vykreslují zástupný text ("Hlavní nadpis reklamy")',
        );
      }
    });
  });
});
