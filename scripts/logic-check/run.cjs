/* eslint-disable */
// 无头验证：直接运行编译后的真实业务代码（不含 RN 组件）
// 用法：npm run verify:logic
const path = require('path');
const fs = require('fs');

// 载入项目 .env（本地开发使用的 key / base url），供 aiService 读取
const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
    .forEach((line) => {
      const index = line.indexOf('=');
      process.env[line.slice(0, index).trim()] = line.slice(index + 1).trim();
    });
}
const assert = require('assert');
const { localDateNow, reminderAtFor, timeFromMinutes, addDays, dateLabel } = require('./out/utils/datetime.js');
const { generatePlan, generateLocalPlan, isAIConfigured, aiModelName } = require('./out/services/aiService.js');
const { createRecurringInstance } = require('./out/utils/recurrence.js');

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push(['✅', name, '']);
  } catch (error) {
    results.push(['❌', name, error.message]);
  }
}
async function testAsync(name, fn) {
  try {
    await fn();
    results.push(['✅', name, '']);
  } catch (error) {
    results.push(['❌', name, error.message]);
  }
}

const today = localDateNow();

test('localDateNow 返回 YYYY-MM-DD', () => {
  assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
});

test('reminderAtFor 提前 10 分钟 → 13:50', () => {
  const task = { id: 't', title: '修改论文', time: '14:00', dueDate: today, status: 'todo', kind: 'one-off', category: 'work' };
  assert.strictEqual(reminderAtFor(task, 10), `${today}T13:50`);
});

test('reminderAtFor 跨零点回绕 → 23:50', () => {
  const task = { id: 't', title: 'x', time: '00:20', dueDate: today, status: 'todo', kind: 'one-off', category: 'life' };
  assert.strictEqual(reminderAtFor(task, 30), `${today}T23:50`);
});

test('timeFromMinutes 830 → 13:50', () => {
  assert.strictEqual(timeFromMinutes(830), '13:50');
});

test('addDays 跨月', () => {
  assert.strictEqual(addDays('2026-09-30', 1), '2026-10-01');
});

test('dateLabel 输出中文星期', () => {
  assert.match(dateLabel(today), /月\d+日 · 星期[日一二三四五六]/);
});

test('周期任务实例带日期后缀且状态为 todo', () => {
  const instance = createRecurringInstance({ id: 'rec-water', title: '浇花', schedule: 'weekly', scheduleLabel: '每周六', time: '10:00', nextRun: today, enabled: true });
  assert.strictEqual(instance.id, `rec-water-${today}`);
  assert.strictEqual(instance.status, 'todo');
});

test('本地兜底：记录类输入生成 createNote', () => {
  const plan = generateLocalPlan('记个想法：把周报模板简化');
  assert.ok(plan.actions.some((action) => action.tool === 'createNote'), '缺少 createNote');
  assert.strictEqual(plan.source, 'local');
});

test('本地兜底：健身 + 论文关键词生成任务', () => {
  const plan = generateLocalPlan('今天要健身和改论文');
  assert.ok(plan.actions.some((action) => /健身/.test(action.title)));
  assert.ok(plan.actions.some((action) => /论文/.test(action.title)));
});

test('AI 配置已从 .env 注入', () => {
  assert.strictEqual(isAIConfigured(), true, '未读取到 AI 配置');
  assert.ok(aiModelName().length > 0);
});

(async () => {
  const realFetch = global.fetch;

  await testAsync('真实 AI 返回 createTask + createNote 时正确归一化', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          summary: '安排任务并记录笔记',
          actions: [
            { tool: 'createTask', title: '健身', time: '19:00', category: 'fitness', explanation: '傍晚训练', requiresConfirmation: false },
            { tool: 'createNote', title: 'UASB 对比图', content: '# UASB 对比图\n\n补一组数据', category: 'note', explanation: '整理成笔记', requiresConfirmation: false },
            { tool: '胡乱工具', title: '非法工具应被修正', time: 'bad', category: '未知', explanation: 'x' },
          ],
        }) } }],
      }),
    });
    const plan = await generatePlan('今天健身，另外记一下 UASB 对比图', undefined);
    assert.strictEqual(plan.source, 'ai');
    assert.strictEqual(plan.actions[0].tool, 'createTask');
    assert.strictEqual(plan.actions[1].tool, 'createNote');
    assert.match(plan.actions[1].content, /UASB/);
    assert.strictEqual(plan.actions[2].tool, 'createTask', '非法 tool 应降级为 createTask');
    assert.strictEqual(plan.actions[2].time, '待安排', '非法时间应降级为「待安排」');
    assert.strictEqual(plan.actions[2].category, 'life', '非法分类应降级为 life');
  });

  await testAsync('AI 返回前后带解释文字也能解析出 JSON', async () => {
    global.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '好的，这是计划：\n{"summary":"ok","actions":[{"tool":"createTask","title":"阅读文献","time":"21:30","category":"learning","explanation":"晚读","requiresConfirmation":false}]}\n希望有帮助！' } }] }),
    });
    const plan = await generatePlan('晚上读文献', undefined);
    assert.strictEqual(plan.actions.length, 1);
    assert.strictEqual(plan.actions[0].title, '阅读文献');
  });

  await testAsync('AI 请求失败时降级到本地规则并标注原因', async () => {
    global.fetch = async () => { throw new Error('network down'); };
    const plan = await generatePlan('今天健身和改论文', undefined);
    assert.strictEqual(plan.source, 'local');
    assert.match(plan.note, /AI 调用失败/);
  });

  await testAsync('AI 返回非 JSON 时降级到本地规则', async () => {
    global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: '抱歉，我不太确定。' } }] }) });
    const plan = await generatePlan('记一下：明天提交材料', undefined);
    assert.strictEqual(plan.source, 'local');
    assert.ok(plan.actions.some((action) => action.tool === 'createNote'), '本地兜底也应识别笔记意图');
  });

  global.fetch = realFetch;

  const failed = results.filter(([mark]) => mark === '❌');
  results.forEach(([mark, name, detail]) => console.log(`${mark} ${name}${detail ? ` → ${detail}` : ''}`));
  console.log(`\n通过 ${results.length - failed.length}/${results.length}`);
  process.exit(failed.length ? 1 : 0);
})();
