// No "new version" / "package updates available" notices at startup.
// `pi update` still updates everything; only the startup check is silenced.
import { DefaultPackageManager, type ExtensionAPI } from "@earendil-works/pi-coding-agent";

export default function (_pi: ExtensionAPI) {
  // pi reads this each time it checks, so setting it while extensions load is early enough.
  process.env.PI_SKIP_VERSION_CHECK = "1";
  // The package check has no switch short of PI_OFFLINE, which also stops catalog refreshes and /bug uploads.
  DefaultPackageManager.prototype.checkForAvailableUpdates = async () => [];
}
