import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { markdownContent } from './plugins/markdownContent.ts'

// ⚠ КАРКАС — docs/CORE.md, раздел 5: base — адрес сайта на GitHub Pages,
// а data/content.ts исключён из чанка data намеренно (раздел 3).

/**
 * База событий шкалы: файлы стран, справочник, слои, связи и сводка
 * редакционной базы (`*.md?summary`). Полные статьи и источники
 * (data/content.ts и `*.md` без запроса) грузятся отдельно, с модальным окном.
 */
const isTimelineData = (id: string) =>
  (/[\\/]src[\\/]data[\\/]/.test(id) && !/[\\/]content\.ts$/.test(id)) || /\.md\?summary$/.test(id)

// https://vite.dev/config/
export default defineConfig({
  base: '/history-line/',
  plugins: [markdownContent(), react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          // Библиотеки, база и код интерфейса меняются с разной частотой.
          // Отдельные чанки остаются в кеше браузера, когда меняется соседний,
          // и скачиваются параллельно. Только то, что нужно для первого экрана:
          // ленивые чанки (окна, Mermaid) делятся автоматически.
          groups: [
            {
              name: 'vendor',
              test: /node_modules[\\/](react|react-dom|scheduler|@tanstack)[\\/]/,
              tags: ['$initial'],
              priority: 2,
            },
            { name: 'data', test: isTimelineData, tags: ['$initial'], priority: 1 },
          ],
        },
      },
    },
  },
})
