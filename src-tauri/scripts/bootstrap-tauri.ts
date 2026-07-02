import { confirm, getPackageJson } from "../plugins/vite-plugin-tauri/utils";
import TauriCli from "@tauri-apps/cli";
import { getPackageInfoSync } from "local-pkg";

async function bootstrap() {
  const pkgName = getPackageJson().name ?? "tauri-app";
  const ok = await confirm(
    `Couldn't find a Tauri project in current directory, would you like to initialize a new one?`,
  );
  if (!ok) {
    process.exit(0);
  }
  const tauriVersion = Number(
    getPackageInfoSync("@tauri-apps/cli")?.version?.split(".")[0] ?? 2,
  );
  console.log("Initializing Tauri...");
  const distFlag = tauriVersion === 1 ? "--dist-dir" : "--frontend-dist";
  const devFlag = tauriVersion === 1 ? "--dev-path" : "--dev-url";
  await TauriCli.run(
    [
      "init",
      "--app-name",
      pkgName,
      "--window-title",
      `${pkgName} window`,
      distFlag,
      `Injected by bootstrap-tauri script, you can change this later`,
      devFlag,
      `Injected by bootstrap-tauri script, you can change this later`,
    ],
    "bootstrap-tauri",
  );
  console.log("Tauri initialized.");
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
