const fs = require("fs");
const path = require("path");

const distDir = path.resolve(__dirname, "..", "dist");
const sourceFontsDir = path.join(
  distDir,
  "assets",
  "node_modules",
  "@expo",
  "vector-icons",
  "build",
  "vendor",
  "react-native-vector-icons",
  "Fonts"
);
const targetFontsDir = path.join(distDir, "assets", "vector-icons", "Fonts");

const sourceUrlPrefix =
  "/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/";
const targetUrlPrefix = "/assets/vector-icons/Fonts/";

function walkFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

if (!fs.existsSync(sourceFontsDir)) {
  console.warn(`Vector icon font source not found: ${sourceFontsDir}`);
  process.exit(0);
}

fs.mkdirSync(targetFontsDir, { recursive: true });

for (const fontPath of walkFiles(sourceFontsDir)) {
  if (path.extname(fontPath) === ".ttf") {
    fs.copyFileSync(fontPath, path.join(targetFontsDir, path.basename(fontPath)));
  }
}

for (const filePath of walkFiles(distDir)) {
  if (!/\.(html|js|css)$/.test(filePath)) {
    continue;
  }

  const original = fs.readFileSync(filePath, "utf8");
  const patched = original.split(sourceUrlPrefix).join(targetUrlPrefix);

  if (patched !== original) {
    fs.writeFileSync(filePath, patched);
  }
}

console.log("Patched Expo vector icon asset paths for Cloudflare.");
