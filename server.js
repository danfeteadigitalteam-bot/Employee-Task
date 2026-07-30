import express from "express";
import history from "connect-history-api-fallback";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const distPath = join(__dirname, "dist");

console.log("Starting server...");
console.log("Dist path:", distPath);
console.log("Dist exists:", existsSync(distPath));
console.log("Index exists:", existsSync(join(distPath, "index.html")));

if (!existsSync(join(distPath, "index.html"))) {
  console.error("dist/index.html not found. Run 'npm run build' first.");
  process.exit(1);
}

app.use(history());
app.use(express.static(distPath));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
