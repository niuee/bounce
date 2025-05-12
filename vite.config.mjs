import { defineConfig } from "vite";
import { resolve } from 'path';

export default defineConfig({
    root: resolve(__dirname, "./dev-server"),
    resolve: {
        alias: {
            "src": resolve(__dirname, "./src"),
            "@": resolve(__dirname, "../"),
            "@server": resolve(__dirname, "../server/src"),
            "@devserver": resolve(__dirname, "./dev-server"),
        },
    },
    server: {
        host: true,
        strictPort: false,
    }
});