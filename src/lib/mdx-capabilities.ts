import { defineMdxCapabilities, type MdxCapability } from '@windrun-huaiin/contracts/mdx';

export const ddaasMdxCapabilities = defineMdxCapabilities([
  'base',
  // 'code',    // 代码块
  // 'math',   // 数学公式
  // 'mermaid',    // Mermaid绘图
  // 'type-table',  // 类型字段表
  // 'npm',            // 安装命令Tab
] as const satisfies readonly MdxCapability[]);
