/* global console, process */
import { readFile, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const manifestPath = path.join(projectRoot, "src", "config", "asset-manifest.ts");
const source = await readFile(manifestPath, "utf8");
const manifestBlock = source.match(/export const productAssets = \{([\s\S]*?)\}\s+as const/);
const creativeManifestPath = path.join(
  projectRoot,
  "src",
  "config",
  "creative-asset-manifest.ts",
);
const creativeSource = await readFile(creativeManifestPath, "utf8");
const creativeManifestBlock = creativeSource.match(
  /export const creativeAssets = \{([\s\S]*?)\}\s+as const/,
);

if (!manifestBlock || !creativeManifestBlock) {
  console.error("无法解析产品素材或原创视觉素材清单。");
  process.exit(1);
}

const parseEntries = (block) =>
  [...block.matchAll(/\s*(\w+):\s*"([^"]+)"/g)].map(([, key, relativePath]) => ({
    key,
    relativePath,
  }));
const entries = [
  ...parseEntries(manifestBlock[1]),
  ...parseEntries(creativeManifestBlock[1]),
];

const metadataByKey = {
  background: { usage: "开场与环境背景", alpha: false },
  grapeCluster: { usage: "青提口味与高潮原料", alpha: true },
  grapeSingle: { usage: "青提近景点缀", alpha: true },
  jasmineFlower: { usage: "茉莉口味主原料", alpha: true },
  jasminePetals: { usage: "花瓣漂浮点缀", alpha: true },
  logo: { usage: "仅素材检查；正式广告使用品牌文字", alpha: false },
  productFront: { usage: "产品揭晓与口味场景", alpha: false },
  productHero: { usage: "最终产品定格", alpha: false },
  productThreeView: { usage: "仅素材检查", alpha: false },
  waterSplash: { usage: "气泡高潮水花", alpha: true },
  liquidVortex: { usage: "原创液体推镜与环境层", alpha: false },
  grapeRefraction: { usage: "原创青提折射动态背景", alpha: false },
  jasmineWaterSpiral: { usage: "原创茉莉水幕动态背景", alpha: false },
  bubbleShockwave: { usage: "原创气泡冲击转场与高潮", alpha: false },
};

const results = [];
let failed = false;

for (const entry of entries) {
  const absolutePath = path.join(projectRoot, "public", entry.relativePath);
  const displayPath = path.posix.join("public", entry.relativePath.replaceAll("\\", "/"));
  const expectation = metadataByKey[entry.key];
  let result = {
    ...entry,
    displayPath,
    exists: false,
    bytes: 0,
    dimensions: "—",
    alpha: "不要求",
    note: "",
  };

  try {
    const fileStat = await stat(absolutePath);
    result.exists = fileStat.isFile();
    result.bytes = fileStat.size;
    if (!result.exists || result.bytes === 0) {
      throw new Error("文件为空或不是普通文件");
    }

    const image = sharp(absolutePath, { failOn: "error" });
    const imageMetadata = await image.metadata();
    if (!imageMetadata.width || !imageMetadata.height) {
      throw new Error("无法读取图片尺寸");
    }
    result.dimensions = `${imageMetadata.width}×${imageMetadata.height}`;

    if (expectation?.alpha) {
      const stats = await image.stats();
      const alphaChannel = stats.channels[3];
      const hasTransparentPixels = Boolean(
        imageMetadata.hasAlpha && alphaChannel && alphaChannel.min < 255,
      );
      result.alpha = hasTransparentPixels ? "通过" : "失败";
      if (!hasTransparentPixels) {
        throw new Error("要求透明的素材没有有效 Alpha 像素");
      }
    }

    result.note = "通过";
  } catch (error) {
    failed = true;
    result.note = error instanceof Error ? error.message : String(error);
  }

  results.push(result);
}

if (entries.length !== 16) {
  failed = true;
  console.error(`素材清单应包含14项，实际解析到${entries.length}项。`);
}

for (const result of results) {
  const status = result.note === "通过" ? "PASS" : "FAIL";
  console.log(
    `[${status}] ${result.key} | ${result.displayPath} | ${result.bytes} bytes | ${result.dimensions} | Alpha: ${result.alpha} | ${result.note}`,
  );
}

const rows = results.map((result) => {
  const expectation = metadataByKey[result.key];
  const filename = path.basename(result.relativePath);
  const size = result.bytes ? `${(result.bytes / 1024).toFixed(1)} KB` : "—";
  const note = `${result.note}; 尺寸 ${result.dimensions}; Alpha ${result.alpha}`;
  return `| ${result.key} | ${filename} | ${expectation?.usage ?? "—"} | ${result.exists ? "是" : "否"} | ${size} | ${note} |`;
});

const markdown = `# 素材清单\n\n> 本文件由 \`npm run check:assets\` 自动生成，请勿手工维护检查结果。\n\n| 素材字段 | 文件名 | 用途 | 是否存在 | 文件大小 | 备注 |\n|---|---|---|---|---:|---|\n${rows.join("\n")}\n\n- 检查时间：${new Date().toISOString()}\n- 总计：${results.length} 项\n- 结论：${failed ? "未通过" : "全部通过"}\n`;

const docsDir = path.join(projectRoot, "docs");
await mkdir(docsDir, { recursive: true });
await writeFile(path.join(docsDir, "ASSET_MANIFEST.md"), markdown, "utf8");

if (failed) {
  process.exit(1);
}
