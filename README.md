# 洛克王国世界属性覆盖与攻防规划器

一个纯前端静态应用，用于查看18种属性的攻击覆盖、防守弱点、抗性和集合覆盖推荐。

## 特点

- React + Vite + TypeScript
- 无后端
- 不在运行时抓取网页
- 属性关系统一放在 `src/data/type-chart.json`
- 不包含技能池
- 不包含精灵池
- 不计算双属性伤害倍率
- 攻击关系和防守关系使用有方向矩阵
- 支持 GitHub Pages 部署

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run preview
```

## GitHub Pages

1. 创建 GitHub 仓库。
2. 将项目推送到 `main` 分支。
3. 在仓库的 Settings → Pages 中将 Source 设置为 GitHub Actions。
4. 后续推送到 `main` 会自动构建并部署。

构建时 `VITE_BASE_PATH` 会被设置为 `/<仓库名>/`，因此无论仓库叫什么名字，
Pages 子路径下的静态资源都能正确加载。

## 修改属性关系

编辑：

```text
src/data/type-chart.json
```

矩阵格式：

```ts
matrix[attackId][defenseId]
```

例如：

```json
{
  "fire": {
    "grass": "strong",
    "water": "weak",
    "normal": "weak"
  }
}
```

可使用的关系值：

```text
strong  = 克制
neutral = 普通
weak    = 抵抗
```

## 数据自检脚本

修改 `src/data/type-chart.json` 后，可以用随项目附带的脚本做一致性检查：

```bash
node scripts/validate-data.mjs
```

它会检查属性数量、矩阵行数与列数、324 个单元格是否齐全、取值是否只有
`strong` / `neutral` / `weak`，并打印每个攻击属性的克制目标数量。

```bash
node scripts/verify-recommendations.mjs
```

它用独立的暴力枚举复核集合覆盖推荐逻辑，确认界面给出的“最少补充 N 个属性”
确实是理论最小值。

## 项目结构

```text
NRC-weakspots/
├─ .github/workflows/deploy.yml
├─ scripts/
│  ├─ validate-data.mjs
│  └─ verify-recommendations.mjs
├─ src/
│  ├─ data/type-chart.json
│  ├─ logic/typeChart.ts
│  ├─ App.tsx
│  ├─ index.css
│  ├─ main.tsx
│  └─ types.ts
├─ index.html
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```
