import { ALL_MODULES } from '../../support/routes';
import { runtimeErrors } from '../../support/errors';
import { openModule } from '../../support/session';
import { note } from '../../support/findings';

/**
 * Console errors and uncaught exceptions are collected globally (see
 * `support/errors.ts`) and turned into a verdict here — one place, one owner,
 * instead of an exception in a shared widget failing whichever module spec ran
 * when it happened to throw.
 */
describe('Běhové chyby — konzole a nezachycené výjimky', () => {
  for (const module of ALL_MODULES) {
    it(`${module.label} (${module.path}) se načte bez chyb v konzoli`, function () {
      openModule(this, module);

      cy.then(() => {
        const errors = runtimeErrors();
        for (const error of errors) {
          note(module.id, module.path, error.type, error.message.slice(0, 300));
        }
        expect(
          errors.map((e) => `${e.type}: ${e.message.slice(0, 200)}`),
          'runtime errors during page load',
        ).to.deep.equal([]);
      });
    });
  }
});
