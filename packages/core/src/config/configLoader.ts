import {
  loadCascadeConfig,
  defaultConfig as pkgDefaultConfig,
  CascadeConfig,
} from "@cascade/config";

export { defaultConfig } from "@cascade/config";

export function loadConfig(projectRoot: string): CascadeConfig {
  try {
    return loadCascadeConfig(projectRoot);
  } catch {
    return { ...pkgDefaultConfig };
  }
}
