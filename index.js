const core = require("@actions/core");
const github = require("@actions/github");
const tc = require("@actions/tool-cache");

const versionRegex = /^(v)?([0-9]+\.[0-9]+\.[0-9]+)+$/;

function mapPlatform(platform) {
  switch (platform) {
    case "win32":
      return "Windows";
    case "darwin":
      return "Darwin";
    case "linux":
      return "Linux";
    default:
      throw new Error("Platform could no be mapped to reviewdog platform");
  }
}

function getURL(version = "0.10.0") {
  return `https://github.com/reviewdog/reviewdog/releases/download/v${version}/reviewdog_${version}_${mapPlatform(
    process.platform
  )}_${process.arch}.tar.gz`;
}

async function fetchReviewdog(version = "0.10.0") {
  const reviewdogPath = await tc.downloadTool(getURL(version));
  const reviewdogExtractedFolder = await tc.extractTar(
    reviewdogPath,
    `/tmp/reviewdog-${version}-${process.platform}-${process.arch}`
  );
  const executableName =
    process.platform === "win32" ? "reviewdog.exe" : "reviewdog";
  const cachedPath = await tc.cacheFile(
    `${reviewdogExtractedFolder}/${executableName}`,
    executableName,
    "reviewdog",
    version
  );

  return cachedPath;
}

async function determineVersionToCache(requestedVersion = "latest") {
  if (requestedVersion === "latest") {
    const response = await fetch(
      "https://api.github.com/repos/reviewdog/reviewdog/releases/latest"
    ).then((response) => response.json());
    const latest_version = `${response.tag_name}`;
    const matches = latest_version.match(versionRegex);

    if (matches !== null) {
      const possibleVersion = matches.pop();

      if (possibleVersion) {
        return possibleVersion;
      }
    }
  }

  return requestedVersion;
}

async function main() {
  const requestedVersion = core.getInput("version");
  const expectedCacheVersion = await determineVersionToCache(requestedVersion);

  const toolPath = tc.find("reviewdog", expectedCacheVersion);
  if (toolPath) {
    core.addPath(toolPath);
  } else {
    const cachedPath = await fetchReviewdog(expectedCacheVersion);
    core.addPath(cachedPath);
  }
}

try {
  main().catch((error) => core.setFailed(error.message));
} catch (error) {
  core.setFailed(error.message);
}
