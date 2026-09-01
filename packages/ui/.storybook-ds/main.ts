import type { StorybookConfig } from '@storybook/react-vite';

/**
 * Reference Storybook for the claude.ai/design sync.
 *
 * Identical to `packages/ui/.storybook` except for the stories glob: the sync
 * covers the web component library only, so `src/native/**` is excluded. Two
 * reasons, both structural rather than preference:
 *
 *  - `Native/Button` and `UI/Button` derive the same component name, so they
 *    would merge into one card carrying stories with incompatible props.
 *  - Native stories import `react-native`, which the preview compiler resolves
 *    against the shipped bundle — there is no react-native in it.
 *
 * The one-level glob (`src/<Component>/<Component>.stories.tsx`) excludes the
 * native tree, which nests one level deeper.
 */
const config: StorybookConfig = {
  stories: ['../src/*/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials', '@storybook/addon-a11y'],
  framework: { name: '@storybook/react-vite', options: {} },
};

export default config;
