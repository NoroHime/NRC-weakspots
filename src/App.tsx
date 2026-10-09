import {
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

import rawTypeChart from './data/type-chart.json';
import {
  analyzeAttackSelection,
  analyzeDefenseSelection,
  findCoverageRecommendations,
  getEffect,
  getEffectLabel,
  getEffectSymbol,
  getTypeDefinition,
  MAX_ADDITIONS,
} from './logic/typeChart';
import type {
  AttackAnalysis,
  DefenseAnalysis,
  Effect,
  TypeChartData,
  TypeId,
} from './types';

import './index.css';

const typeChart = rawTypeChart as TypeChartData;

type ViewName = 'planner' | 'data';

type ColorStyle = CSSProperties & {
  '--type-color': string;
};

function colorStyle(color: string): ColorStyle {
  return {
    '--type-color': color,
  };
}

function TypeChip({
  data,
  id,
  suffix,
  className = '',
}: {
  data: TypeChartData;
  id: TypeId;
  suffix?: string;
  className?: string;
}) {
  const type = getTypeDefinition(data, id);

  if (!type) {
    return null;
  }

  return (
    <span
      className={`type-chip ${className}`.trim()}
      style={colorStyle(type.color)}
    >
      <span className="type-dot" />
      <span>{type.name}</span>
      {suffix ? <small>{suffix}</small> : null}
    </span>
  );
}

function TypeChipList({
  data,
  ids,
  empty = '暂无',
  className = '',
}: {
  data: TypeChartData;
  ids: TypeId[];
  empty?: string;
  className?: string;
}) {
  if (ids.length === 0) {
    return <span className="muted">{empty}</span>;
  }

  return (
    <div className={`chip-list ${className}`.trim()}>
      {ids.map((id) => (
        <TypeChip data={data} id={id} key={id} />
      ))}
    </div>
  );
}

function TypeSelector({
  data,
  selected,
  onToggle,
  label,
}: {
  data: TypeChartData;
  selected: TypeId[];
  onToggle: (id: TypeId) => void;
  label: string;
}) {
  return (
    <div className="type-grid" role="group" aria-label={label}>
      {data.types.map((type) => {
        const isSelected = selected.includes(type.id);

        return (
          <button
            className={`type-select-button ${
              isSelected ? 'selected' : ''
            }`}
            key={type.id}
            onClick={() => onToggle(type.id)}
            style={colorStyle(type.color)}
            type="button"
            aria-pressed={isSelected}
          >
            <span className="type-dot" />
            <span className="type-select-name">{type.name}</span>
            <span className="type-select-state">
              {isSelected ? '已选' : '选择'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SectionHeading({
  index,
  title,
  description,
  action,
}: {
  index: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div className="section-heading-main">
        <span className="section-index">{index}</span>
        <div>
          <h2>{title}</h2>
          <p className="section-description">{description}</p>
        </div>
      </div>

      {action ? (
        <div className="section-action">{action}</div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="metric-card">
      <span className="metric-label">{label}</span>
      <strong className="metric-value">{value}</strong>
      <span className="metric-hint">{hint}</span>
    </article>
  );
}

function RelationTag({ effect }: { effect: Effect }) {
  return (
    <span className={`effect-tag ${effect}`}>
      {getEffectLabel(effect)}
    </span>
  );
}

function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state">{children}</div>;
}

function AttackAnalysisPanel({
  data,
  analysis,
}: {
  data: TypeChartData;
  analysis: AttackAnalysis;
}) {
  return (
    <section className="panel">
      <div className="section-heading compact">
        <div className="section-heading-main">
          <span className="section-index">02</span>
          <div>
            <h2>进攻面分析</h2>
            <p className="section-description">
              所有面板持续显示，不根据只选一个或两个属性改变功能。
            </p>
          </div>
        </div>
      </div>

      <div className="analysis-grid">
        <article className="subpanel">
          <div className="subpanel-heading">
            <div>
              <h3>每个攻击属性的打击面</h3>
              <p className="subpanel-description">
                “独立打击面”表示只有该属性能覆盖的目标。
              </p>
            </div>
          </div>

          {analysis.perAttack.length === 0 ? (
            <EmptyState>请先选择至少一个攻击属性。</EmptyState>
          ) : (
            <div className="detail-list">
              {analysis.perAttack.map((row) => (
                <article className="detail-card" key={row.typeId}>
                  <div className="detail-title">
                    <TypeChip data={data} id={row.typeId} />
                    <span className="detail-count">
                      {row.strongTargets.length} 个克制目标
                    </span>
                  </div>

                  <span className="mini-label">克制目标</span>
                  <TypeChipList
                    data={data}
                    ids={row.strongTargets}
                  />

                  <span className="mini-label">
                    仅由该属性提供的独立打击面
                  </span>
                  <TypeChipList
                    data={data}
                    ids={row.independentTargets}
                    empty="没有独立目标，均与其他已选属性重叠"
                  />

                  <span className="mini-label">该属性的抵抗目标</span>
                  <TypeChipList
                    data={data}
                    ids={row.resistedTargets}
                  />
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="subpanel">
          <div className="subpanel-heading">
            <div>
              <h3>合并后的打击面</h3>
              <p className="subpanel-description">
                多个属性命中同一目标只代表多个来源，不表示伤害叠加。
              </p>
            </div>
          </div>

          {analysis.coverage.length === 0 ? (
            <EmptyState>当前没有已覆盖的防守属性。</EmptyState>
          ) : (
            <div className="coverage-list">
              {analysis.coverage.map((targetId) => {
                const count = analysis.sourceCounts[targetId];

                return (
                  <div
                    className={`coverage-item ${
                      count > 1 ? 'is-multi' : ''
                    }`}
                    key={targetId}
                  >
                    <TypeChip data={data} id={targetId} />

                    <span
                      className={`effect-tag ${
                        count > 1 ? 'multi' : 'strong'
                      }`}
                    >
                      {count > 1 ? '多个来源' : '单一来源'}
                    </span>

                    <span className="source-count">
                      {count} 个攻击属性命中
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="notice-grid">
            <div className="notice-block">
              <h4>未覆盖的防守属性</h4>
              <TypeChipList
                data={data}
                ids={analysis.uncovered}
                empty={
                  analysis.selected.length === 0
                    ? '请先选择攻击属性'
                    : '已覆盖全部18种防守属性'
                }
              />
            </div>

            <div className="notice-block">
              <h4>所有已选攻击属性都被抵抗</h4>
              <TypeChipList
                data={data}
                ids={analysis.allResisted}
                empty={
                  analysis.selected.length === 0
                    ? '请先选择攻击属性'
                    : '没有这样的目标'
                }
              />
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

function RecommendationPanel({
  data,
  attackIds,
}: {
  data: TypeChartData;
  attackIds: TypeId[];
}) {
  const recommendation = useMemo(
    () =>
      findCoverageRecommendations(
        data,
        attackIds,
        MAX_ADDITIONS,
      ),
    [data, attackIds],
  );

  return (
    <section className="panel">
      <SectionHeading
        index="03"
        title="集合覆盖推荐"
        description={`根据当前攻击属性池，最多尝试补充${MAX_ADDITIONS}个属性，并输出前10个组合。`}
      />

      <div className="recommendation-intro">
        <span>
          排序：完整覆盖 → 补充数量少 → 新增覆盖多 →
          重复覆盖少 → 防守面更均衡。
        </span>
        <span>
          均衡度按18个防守属性的覆盖来源分布方差反向计算，
          只用于并列排序。
        </span>
      </div>

      <div
        className={`recommendation-status ${
          recommendation.canFullyCoverWithinLimit
            ? 'success'
            : 'warning'
        }`}
      >
        {recommendation.canFullyCoverWithinLimit
          ? `最少补充 ${recommendation.minimumAdditional} 个属性可以完全覆盖18种防守属性。`
          : `${MAX_ADDITIONS}个以内无法完全覆盖，以下显示限制内的前10个组合。`}
      </div>

      {recommendation.recommendations.length === 0 ? (
        <EmptyState>没有可显示的推荐组合。</EmptyState>
      ) : (
        <div className="recommendation-list">
          {recommendation.recommendations.map((item, index) => (
            <article className="recommendation-card" key={index}>
              <div className="recommendation-card-header">
                <div>
                  <strong>方案 {index + 1}</strong>
                  <span className="rec-meta">
                    补充 {item.added.length} 个属性
                  </span>
                </div>

                <div className="recommendation-badges">
                  {item.complete ? (
                    <span className="status-badge complete">
                      完整覆盖
                    </span>
                  ) : (
                    <span className="status-badge incomplete">
                      未完全覆盖
                    </span>
                  )}

                  <span className="balance-score">
                    均衡度 {Math.round(item.balanceScore * 100)}%
                  </span>
                </div>
              </div>

              <div className="recommendation-row">
                <span className="rec-label">补充属性</span>
                <TypeChipList
                  data={data}
                  ids={item.added}
                  empty="无需补充"
                />
              </div>

              <div className="recommendation-row">
                <span className="rec-label">新增覆盖目标</span>
                <TypeChipList
                  data={data}
                  ids={item.newCoverage}
                />
              </div>

              <div className="recommendation-row">
                <span className="rec-label">重复覆盖目标</span>
                <TypeChipList
                  data={data}
                  ids={item.repeatedCoverage}
                />
              </div>

              <div className="recommendation-row">
                <span className="rec-label">未覆盖目标</span>
                <TypeChipList
                  data={data}
                  ids={item.uncovered}
                  empty="无"
                />
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DefenseAnalysisPanel({
  data,
  analysis,
}: {
  data: TypeChartData;
  analysis: DefenseAnalysis;
}) {
  return (
    <section className="panel">
      <SectionHeading
        index="05"
        title="防守属性池"
        description="查看每个防守属性的弱点、抗性，以及多个防守属性的共同关系。"
      />

      <div className="analysis-grid">
        <article className="subpanel">
          <div className="subpanel-heading">
            <div>
              <h3>每个防守属性</h3>
              <p className="subpanel-description">
                这里只读取单个防守属性关系，不计算多个属性的组合倍率。
              </p>
            </div>
          </div>

          {analysis.perDefense.length === 0 ? (
            <EmptyState>请先选择至少一个防守属性。</EmptyState>
          ) : (
            <div className="detail-list">
              {analysis.perDefense.map((row) => (
                <article className="detail-card" key={row.typeId}>
                  <div className="detail-title">
                    <TypeChip data={data} id={row.typeId} />
                  </div>

                  <span className="mini-label">
                    弱点：可以克制它的攻击属性
                  </span>
                  <TypeChipList
                    data={data}
                    ids={row.weaknesses}
                  />

                  <span className="mini-label">
                    抗性：会被它抵抗的攻击属性
                  </span>
                  <TypeChipList
                    data={data}
                    ids={row.resistances}
                  />
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="subpanel">
          <div className="subpanel-heading">
            <div>
              <h3>队伍共享关系</h3>
              <p className="subpanel-description">
                结果是对已选防守属性分别查询后取交集。
              </p>
            </div>
          </div>

          {analysis.selected.length === 0 ? (
            <EmptyState>请先选择防守属性。</EmptyState>
          ) : (
            <div className="shared-grid">
              <div className="notice-block">
                <h4>队伍共享弱点</h4>
                <p className="notice-description">
                  能同时克制所有已选防守属性的攻击属性。
                </p>
                <TypeChipList
                  data={data}
                  ids={analysis.sharedWeaknesses}
                />
              </div>

              <div className="notice-block">
                <h4>队伍共享抗性</h4>
                <p className="notice-description">
                  会被所有已选防守属性共同抵抗的攻击属性。
                </p>
                <TypeChipList
                  data={data}
                  ids={analysis.sharedResistances}
                />
              </div>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}

function MatrixPanel({ data }: { data: TypeChartData }) {
  return (
    <section className="panel">
      <SectionHeading
        index="06"
        title="完整属性矩阵"
        description="行是攻击属性，列是防守属性。矩阵数据直接来自本地 JSON。"
      />

      <div className="matrix-legend">
        <span className="legend-item">
          <span className="legend-swatch strong" />
          克制 / 2×
        </span>
        <span className="legend-item">
          <span className="legend-swatch weak" />
          抵抗 / ½×
        </span>
        <span className="legend-item">
          <span className="legend-swatch neutral" />
          普通 / 1×
        </span>
        <span className="legend-item">
          <span className="legend-swatch multi" />
          多个来源
        </span>
      </div>

      <div className="matrix-wrap">
        <table className="matrix-table">
          <thead>
            <tr>
              <th scope="col">攻＼防</th>
              {data.types.map((type) => (
                <th scope="col" key={type.id}>
                  <span
                    className="matrix-type-label"
                    style={colorStyle(type.color)}
                  >
                    <span className="type-dot" />
                    {type.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.types.map((attackType) => (
              <tr key={attackType.id}>
                <th scope="row">
                  <span
                    className="matrix-type-label"
                    style={colorStyle(attackType.color)}
                  >
                    <span className="type-dot" />
                    {attackType.name}
                  </span>
                </th>

                {data.types.map((defenseType) => {
                  const effect = getEffect(
                    data,
                    attackType.id,
                    defenseType.id,
                  );

                  return (
                    <td
                      className={`matrix-cell ${effect}`}
                      key={defenseType.id}
                      title={`${attackType.name} → ${defenseType.name}：${getEffectLabel(effect)}`}
                      aria-label={`${attackType.name}攻击${defenseType.name}：${getEffectLabel(effect)}`}
                    >
                      {getEffectSymbol(effect)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DataPage({ data }: { data: TypeChartData }) {
  return (
    <div className="page-stack">
      <section className="panel">
        <SectionHeading
          index="01"
          title="数据来源与约定"
          description="所有关系数据都打包在前端，不在运行时访问外部网页。"
        />

        <div className="data-meta-grid">
          <div className="meta-item">
            <span className="meta-label">数据版本</span>
            <strong>{data.version}</strong>
          </div>

          <div className="meta-item">
            <span className="meta-label">本地更新时间</span>
            <strong>{data.updatedAt}</strong>
          </div>

          <div className="meta-item">
            <span className="meta-label">属性数量</span>
            <strong>{data.types.length} 种</strong>
          </div>

          <div className="meta-item">
            <span className="meta-label">矩阵方向</span>
            <strong>行攻击 / 列防守</strong>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="subpanel-heading">
          <div>
            <h3>来源</h3>
            <p className="subpanel-description">
              来源链接只用于人工查阅，应用本身不会抓取这些页面。
            </p>
          </div>
        </div>

        <div className="source-list">
          {data.source.map((source) => (
            <article className="source-item" key={source.url}>
              <div>
                <strong>{source.name}</strong>
                {source.description ? (
                  <p>{source.description}</p>
                ) : null}
              </div>

              <div className="source-item-right">
                <span>核对日期：{source.accessedAt}</span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  打开来源
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="subpanel-heading">
          <div>
            <h3>备注</h3>
            <p className="subpanel-description">
              修改属性关系时，只需要编辑
              <code>src/data/type-chart.json</code>。
            </p>
          </div>
        </div>

        <ul className="notes-list">
          {data.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>

        <div className="data-callout">
          <strong>重要方向约定</strong>
          <p>
            应用使用
            <code>matrix[attackId][defenseId]</code>
            查询攻击面。防守面查询是遍历所有攻击属性并读取对应列，
            不会把攻击关系直接转置成另一张数据表。
          </p>
        </div>
      </section>
    </div>
  );
}

function Planner({
  data,
  attackIds,
  defenseIds,
  onToggleAttack,
  onToggleDefense,
  onClearAttack,
  onClearDefense,
}: {
  data: TypeChartData;
  attackIds: TypeId[];
  defenseIds: TypeId[];
  onToggleAttack: (id: TypeId) => void;
  onToggleDefense: (id: TypeId) => void;
  onClearAttack: () => void;
  onClearDefense: () => void;
}) {
  const attackAnalysis = useMemo(
    () => analyzeAttackSelection(data, attackIds),
    [data, attackIds],
  );

  const defenseAnalysis = useMemo(
    () => analyzeDefenseSelection(data, defenseIds),
    [data, defenseIds],
  );

  return (
    <div className="page-stack">
      <section className="summary-grid">
        <MetricCard
          label="进攻属性池"
          value={`${attackIds.length} / ${data.types.length}`}
          hint="当前选择的攻击属性"
        />
        <MetricCard
          label="已覆盖目标"
          value={`${attackAnalysis.coverage.length} / ${data.types.length}`}
          hint="至少有一个克制来源"
        />
        <MetricCard
          label="未覆盖目标"
          value={String(attackAnalysis.uncovered.length)}
          hint="当前没有克制来源"
        />
        <MetricCard
          label="防守属性池"
          value={`${defenseIds.length} / ${data.types.length}`}
          hint="当前选择的防守属性"
        />
      </section>

      <section className="panel">
        <SectionHeading
          index="01"
          title="进攻属性池"
          description="支持多选，用于查看 box 中已有属性对18种野怪属性的覆盖情况。"
          action={
            <button
              className="ghost-button"
              onClick={onClearAttack}
              type="button"
            >
              清空
            </button>
          }
        />

        <TypeSelector
          data={data}
          selected={attackIds}
          onToggle={onToggleAttack}
          label="选择攻击属性"
        />
      </section>

      <AttackAnalysisPanel
        data={data}
        analysis={attackAnalysis}
      />

      <RecommendationPanel
        data={data}
        attackIds={attackIds}
      />

      <section className="panel">
        <SectionHeading
          index="04"
          title="防守属性池"
          description="支持多选，用于查看目标属性的弱点、抗性和共享关系。"
          action={
            <button
              className="ghost-button"
              onClick={onClearDefense}
              type="button"
            >
              清空
            </button>
          }
        />

        <TypeSelector
          data={data}
          selected={defenseIds}
          onToggle={onToggleDefense}
          label="选择防守属性"
        />
      </section>

      <DefenseAnalysisPanel
        data={data}
        analysis={defenseAnalysis}
      />

      <MatrixPanel data={data} />
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<ViewName>('planner');
  const [attackIds, setAttackIds] = useState<TypeId[]>([]);
  const [defenseIds, setDefenseIds] = useState<TypeId[]>([]);

  const toggleAttack = (id: TypeId) => {
    setAttackIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  const toggleDefense = (id: TypeId) => {
    setDefenseIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="container hero-inner">
          <div>
            <span className="eyebrow">
              LOCAL DATA · 18 TYPES · NO SKILLS
            </span>
            <h1>洛克王国世界属性覆盖与攻防规划器</h1>
            <p className="hero-copy">
              面向 box 属性覆盖的静态规划工具。
              只处理属性关系，不加入技能池，也不计算双属性伤害倍率。
            </p>
          </div>

          <div className="hero-side">
            <div className="hero-meta">
              <strong>数据 v{typeChart.version}</strong>
              <span>本地核对：{typeChart.updatedAt}</span>
            </div>

            <nav className="top-nav" aria-label="页面导航">
              <button
                className={`nav-button ${
                  view === 'planner' ? 'active' : ''
                }`}
                onClick={() => setView('planner')}
                type="button"
              >
                规划器
              </button>
              <button
                className={`nav-button ${
                  view === 'data' ? 'active' : ''
                }`}
                onClick={() => setView('data')}
                type="button"
              >
                数据说明
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container page-content">
        {view === 'planner' ? (
          <Planner
            data={typeChart}
            attackIds={attackIds}
            defenseIds={defenseIds}
            onToggleAttack={toggleAttack}
            onToggleDefense={toggleDefense}
            onClearAttack={() => setAttackIds([])}
            onClearDefense={() => setDefenseIds([])}
          />
        ) : (
          <DataPage data={typeChart} />
        )}
      </main>

      <footer className="footer">
        <div className="container">
          纯前端静态应用 · 属性数据位于
          <code>src/data/type-chart.json</code>
          · 不包含技能数据
        </div>
      </footer>
    </div>
  );
}
