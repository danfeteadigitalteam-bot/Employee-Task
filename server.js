import express from "express";
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
  console.error("ERROR: dist/index.html not found! Run 'npm run build' first.");
  process.exit(1);
}

app.use(express.static(distPath, { index: ["index.html"] }));

app.get("*", (req, res) => {
  const filePath = join(distPath, "index.html");
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error("Error serving index.html:", err.message);
      res.status(500).send("Server error");
    }
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
