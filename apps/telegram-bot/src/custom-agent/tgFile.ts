import https from "node:https";
import { HttpsProxyAgent } from "https-proxy-agent";

export function downloadTelegramFile(url: string, proxyUrl?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const agent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;
    https
      .get(url, { agent }, (res) => {
        const loc = res.headers.location;
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && loc) {
          downloadTelegramFile(loc, proxyUrl).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`download HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      })
      .on("error", reject);
  });
}
