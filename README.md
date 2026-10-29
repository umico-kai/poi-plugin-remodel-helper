# poi-plugin-remodel-helper / 改造规划

给镇守府的舰娘按**改造状态**分个类，一眼看出谁现在就能改、谁只是差材料、谁等级还不够。

## 功能

- **三色状态标记**
  - 绿 `いっていいよ` —— 等级达标，材料齐全，随时可以改
  - 黄 `いっていい……ってさ` —— 等级够了，但额外材料不足
  - 红 `待ってろいよ` —— 还没到改造等级
- **材料缺口明细**：列出每种缺多少，含设计图、详报、兵装、甲板，以及开发资材、高速建造材
- **形态转换舰娘**：多形态舰娘有特殊标记，如果像双鹤这种不会改回去的可以标记改造完成，之后不再提示

## 安装

已发布到 npm：[poi-plugin-remodel-helper](https://www.npmjs.com/package/poi-plugin-remodel-helper)

**方式一：poi 插件管理**

```
poi → 设置 → 插件管理 → 搜索 remodel → 安装
```

**方式二：命令行**

```
cd %APPDATA%\poi\plugins\node_modules
npm install poi-plugin-remodel-helper
```

装完重启 poi，左侧栏出现「改造规划」。

**方式三：手动解压**

下载 Releases 里的 zip，解压到 `%APPDATA%\poi\plugins\node_modules\`，重启 poi。

## 许可

MIT
