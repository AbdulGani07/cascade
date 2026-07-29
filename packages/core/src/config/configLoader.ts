import {
  loadCascadeConfig,
  defaultConfig as pkgDefaultConfig,
  CascadeConfig,
} from "@cascade-code/config";

export { defaultConfig } from "@cascade-code/config";

export function loadConfig(projectRoot: string): CascadeConfig {
  try {
    return loadCascadeConfig(projectRoot);
  } catch {
    return { ...pkgDefaultConfig };
  }
}
