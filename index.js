const core = require("@actions/core");
const github = require("@actions/github");
const tc = require("@actions/tool-cache");
const fetch = require("cross-fetch");

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

function mapArchitecture(arch) {
  switch (arch) {
    case "x64":
      return "x86_64";
    case "x32":
      return "i386";
    default:
      throw new Error(
        "Architecture could not be mapped to reviewdog architecture"
      );
  }
}

function getReleaseURL(version = "0.10.0") {
  return `https://github.com/reviewdog/reviewdog/releases/download/v${version}/reviewdog_${version}_${mapPlatform(
    process.platform
  )}_${mapArchitecture(process.arch)}.tar.gz`;
}

async function fetchReviewdog(version = "0.10.0") {
  const reviewdogPath = await tc.downloadTool(getReleaseURL(version));
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

  core.info(`Added reviewdog@${version} to the cache`);

  return cachedPath;
}

async function determineVersionToCache(requestedVersion = "latest") {
  if (requestedVersion === "latest") {
    const raw_response = await fetch(
      "https://api.github.com/repos/reviewdog/reviewdog/releases/latest"
    );

    if (raw_response.status >= 400) {
      throw new Error(
        "Bad response from GitHub API while resolving latest version"
      );
    }

    const response = await raw_response.json();
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
    core.info(`reviewdog@${expectedCacheVersion} avaiable from cache.`);
    core.addPath(toolPath);
  } else {
    core.info(
      `reviewdog@${expectedCacheVersion} not available from cache, going to initialize it now.`
    );
    const cachedPath = await fetchReviewdog(expectedCacheVersion);
    core.addPath(cachedPath);
  }

  core.info(
    `reviewdog@${expectedCacheVersion} avaiable on $PATH as 'reviewdog'`
  );
}

try {
  main().catch((error) => core.setFailed(error.message));
} catch (error) {
  core.setFailed(error.message);
}
