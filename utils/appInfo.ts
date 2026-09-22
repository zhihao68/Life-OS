import Constants from 'expo-constants';

/**
 * 读取当前安装包的版本信息，用于在应用内自证「装的是哪一版」。
 * nativeBuildVersion 在真机上来自原生清单，是判断"是否装了新包"的可靠依据。
 */
export function appVersionInfo(): { version: string; build: string; source: string } {
  const config = Constants.expoConfig;
  const version = Constants.nativeAppVersion ?? config?.version ?? '未知';
  const nativeBuild = Constants.nativeBuildVersion;
  const configBuild = config?.android?.versionCode;
  const build = nativeBuild ?? (configBuild !== undefined ? `${configBuild}` : '未知');
  const source = `${Constants.executionEnvironment ?? 'unknown'} · ${Constants.appOwnership ?? 'unknown'}`;
  return { version, build, source };
}
