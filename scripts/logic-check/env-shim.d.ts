// 无头验证环境的最小 Node 全局声明（避免为验证脚本引入 @types/node 依赖）
declare const process: {
  env: Record<string, string | undefined>;
  exit(code?: number): never;
};
declare const require: (id: string) => unknown;
declare const __dirname: string;
