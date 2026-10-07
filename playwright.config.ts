import { defineConfig, devices } from '@playwright/test';

/**
 * Сквозные смоук-тесты: собранный сайт в настоящем браузере.
 *
 * Тесты идут по готовой сборке (`npm run build`), а не по dev-серверу:
 * так проверяется то, что уедет на GitHub Pages, — с разбиением на чанки,
 * ленивыми окнами и base `/history-line/`. Локально: `npm run build`,
 * затем `npm run test:e2e`; уже запущенный `vite preview` подхватывается.
 */
export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/history-line/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    // Телефон с user agent iPhone, но в Chromium: виртуализатор шкалы
    // на iOS ведёт себя иначе (см. jumpToGroup), и этот путь нужно проверять.
    { name: 'iphone', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:4173/history-line/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
