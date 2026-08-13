import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { markdownContent } from './plugins/markdownContent.ts'

// https://vite.dev/config/
export default defineConfig({
  base: '/history-line/',
  plugins: [markdownContent(), react()],
})
