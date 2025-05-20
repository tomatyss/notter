import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for React and React DOM
          'vendor-react': ['react', 'react-dom'],
          
          // Vendor chunk for Tauri API
          'vendor-tauri': ['@tauri-apps/api'],
          
          // Vendor chunk for other third-party libraries
          'vendor-libs': [
            'date-fns', 
            'lodash', 
            'react-markdown', 
            'react-router-dom'
          ],
          
          // LLM providers chunk
          'llm-providers': [
            '@google/genai',
            'ollama'
          ],
          
          // Feature chunks
          'feature-chat': [
            './src/components/chat/ChatPanel.tsx',
            './src/hooks/useChat.ts',
            './src/providers/llm/index.ts'
          ],
          
          'feature-note-viewer': [
            './src/components/OptimizedNoteViewer.tsx',
            './src/components/noteViewer/NoteContent.tsx',
            './src/components/noteViewer/NoteHeader.tsx',
            './src/components/noteViewer/BacklinksSection.tsx'
          ],
          
          'feature-search': [
            './src/components/SearchPanel.tsx'
          ]
        }
      }
    },
    // Increase the warning limit slightly to avoid warnings for chunks that are just over the limit
    chunkSizeWarningLimit: 600
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
