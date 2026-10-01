import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

function getRevision() {
  // 1. Kiểm tra các biến môi trường có sẵn từ CI/CD (Vercel, GitHub Actions, Netlify, Render,...)
  const envSha =
    process.env.VITE_APP_REVISION ||
    process.env.VITE_REVISION ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    process.env.CI_COMMIT_SHORT_SHA ||
    process.env.CI_COMMIT_SHA ||
    process.env.RENDER_GIT_COMMIT ||
    process.env.COMMIT_REF;

  if (envSha) {
    return envSha.slice(0, 7);
  }

  // 2. Thử chạy git CLI (với stdio: ignore để không báo lỗi ra console nếu môi trường không cài git)
  try {
    const gitHash = execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf-8",
      timeout: 1500,
    }).trim();
    if (gitHash) return gitHash;
  } catch {
    // Không có git CLI hoặc không phải git repository
  }

  // 3. Fallback đọc trực tiếp file .git bằng fs (hoạt động tốt kể cả khi không có git CLI trên máy)
  try {
    const gitDir = path.resolve(process.cwd(), ".git");
    if (fs.existsSync(gitDir)) {
      const headContent = fs.readFileSync(path.join(gitDir, "HEAD"), "utf-8").trim();
      if (headContent.startsWith("ref:")) {
        const refPath = headContent.replace(/^ref:\s*/, "");
        const fullRefPath = path.join(gitDir, refPath);
        if (fs.existsSync(fullRefPath)) {
          return fs.readFileSync(fullRefPath, "utf-8").trim().slice(0, 7);
        }
        // Thử tìm trong packed-refs nếu repo đã nén refs
        const packedRefsPath = path.join(gitDir, "packed-refs");
        if (fs.existsSync(packedRefsPath)) {
          const lines = fs.readFileSync(packedRefsPath, "utf-8").split("\n");
          for (const line of lines) {
            if (line.includes(refPath)) {
              return line.split(" ")[0].trim().slice(0, 7);
            }
          }
        }
      } else if (headContent.length >= 7) {
        return headContent.slice(0, 7);
      }
    }
  } catch {
    // Bỏ qua nếu không đọc được file .git
  }

  // 4. Fallback mặc định an toàn khi không thể lấy được mã commit
  return "prod";
}

const commitHash = getRevision();
process.env.VITE_APP_REVISION = commitHash;
process.env.VITE_REVISION = commitHash;

export default defineConfig({
  plugins: [react()],
  define: {
    "import.meta.env.VITE_APP_REVISION": JSON.stringify(commitHash),
    "import.meta.env.VITE_REVISION": JSON.stringify(commitHash),
  },
  server: { port: 5173, open: true },
});


