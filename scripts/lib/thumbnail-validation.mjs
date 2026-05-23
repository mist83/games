import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function isInside(baseDir, targetPath) {
  const relative = path.relative(baseDir, targetPath);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export function validateThumbnailSvg(manifest, absDir) {
  const failures = [];
  if (
    typeof manifest.thumbnail !== "string" ||
    manifest.thumbnail.trim() === ""
  ) {
    failures.push("CONTRACT: manifest.thumbnail is required");
    return failures;
  }

  const thumbnailPath = path.resolve(absDir, manifest.thumbnail);
  if (!isInside(absDir, thumbnailPath)) {
    failures.push(
      "THUMBNAIL: manifest.thumbnail must stay inside the game directory",
    );
    return failures;
  }
  if (path.extname(thumbnailPath).toLowerCase() !== ".svg") {
    failures.push("THUMBNAIL: manifest.thumbnail must point to an SVG file");
    return failures;
  }
  if (!existsSync(thumbnailPath)) {
    failures.push(`THUMBNAIL: missing thumbnail file ${manifest.thumbnail}`);
    return failures;
  }

  const svg = readFileSync(thumbnailPath, "utf8");
  if (!/^\s*<svg[\s>]/i.test(svg)) {
    failures.push("THUMBNAIL: thumbnail file must start with an <svg> element");
  }
  if (/\burl\s*\(/i.test(svg)) {
    failures.push(
      "THUMBNAIL: URL references are not allowed in thumbnail SVGs",
    );
  }

  return failures;
}
