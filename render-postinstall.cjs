// Only run the Render build script when deployed on Render
if (process.env.RENDER === "true") {
  const { execSync } = require("child_process");
  execSync("bash ./render-build.sh", { stdio: "inherit" });
}
