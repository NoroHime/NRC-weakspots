import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function normalizeBase(value: string): string {
  if (value === '/' || value.endsWith('/')) {
    return value;
  }

  return `${value}/`;
}

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/').pop();

const base = normalizeBase(
  process.env.VITE_BASE_PATH ??
    (repositoryName ? `/${repositoryName}/` : '/'),
);

export default defineConfig({
  plugins: [react()],
  base,
});
