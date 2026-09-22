import type { AIPlan, AIPlanAction, LifeOSState, Task } from '../types';

export type AIToolName = 'createTask' | 'createRecurringTask' | 'createReminder' | 'createNote' | 'createWorkoutPlan';
export type AITool = { name: AIToolName; description: string };

export const lifeOSTools: AITool[] = [
  { name: 'createTask', description: '创建一次性任务' },
  { name: 'createRecurringTask', description: '创建周期任务' },
  { name: 'createReminder', description: '设置提醒' },
  { name: 'createNote', description: '创建 Markdown 笔记' },
  { name: 'createWorkoutPlan', description: '生成训练计划' },
];

// 通过 EXPO_PUBLIC_* 环境变量配置，兼容任意 OpenAI 协议服务（DeepSeek / 中转站 / 通义…）
// 注意：EXPO_PUBLIC_* 会被编译进客户端包，请使用限额 key，不要放主账号密钥。
const AI_BASE_URL = (process.env.EXPO_PUBLIC_AI_BASE_URL ?? '').replace(/\/+$/, '');
const AI_API_KEY = process.env.EXPO_PUBLIC_AI_API_KEY ?? '';
const AI_MODEL = process.env.EXPO_PUBLIC_AI_MODEL ?? 'deepseek-v4-flash-0731';
const AI_TIMEOUT_MS = Number(process.env.EXPO_PUBLIC_AI_TIMEOUT_MS ?? 60000);

export function isAIConfigured(): boolean {
  return Boolean(AI_BASE_URL && AI_API_KEY);
}

export function aiModelName(): string {
  return AI_MODEL;
}

const SYSTEM_PROMPT = `你是 Life OS 的生活规划助手。用户会用一句话描述今天想做的事，你要把它拆成今天可执行的结构化安排。

只输出一个 JSON 对象，不要输出解释文字、不要用 markdown 代码块。JSON 结构固定为：
{
  "summary": "一句话总结这次安排（中文，20 字以内）",
  "actions": [
    {
      "tool": "createTask" | "createRecurringTask",
      "title": "任务标题（中文，简短具体）",
      "time": "HH:MM（24 小时制；无法确定时给合理时间）",
      "category": "work" | "fitness" | "learning" | "life" | "note",
      "explanation": "为什么这样安排（中文，20 字以内）",
      "requiresConfirmation": true | false
    }
  ]
}

规则：
1. 时间要错开，符合人的作息（工作类放在 9:00-12:00 / 14:00-18:00，健身放在 18:00-20:00，学习放在 20:00-22:00）。
2. 涉及「每次/每周/每天/每月」等重复性安排时用 createRecurringTask，并设 requiresConfirmation 为 true；一次性安排用 createTask。
3. 用户没提到的内容不要凭空添加，最多输出 5 条 actions。
4. 用户表达模糊时，给出一个合理的默认安排，不要反问。`;

function buildUserPrompt(input: string, state?: LifeOSState, today = ''): string {
  const contextLines: string[] = [];
  if (today) contextLines.push(`今天是 ${today}。`);
  if (state) {
    const existing = state.tasks.filter((task) => task.dueDate === today).map((task) => task.title);
    if (existing.length) contextLines.push(`今天已有任务：${existing.join('、')}。不要重复创建同名任务。`);
    const recurring = state.recurringTasks.map((task) => task.title);
    if (recurring.length) contextLines.push(`已有周期任务：${recurring.join('、')}。`);
  }
  contextLines.push(`用户说：「${input}」`);
  return contextLines.join('\n');
}

type RawAction = Partial<AIPlanAction> & { tool?: string };
type RawPlan = { summary?: string; actions?: RawAction[] };

const VALID_TOOLS: AIToolName[] = ['createTask', 'createRecurringTask', 'createReminder', 'createNote', 'createWorkoutPlan'];
const VALID_CATEGORIES: Task['category'][] = ['work', 'fitness', 'learning', 'life', 'note'];

function firstJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  return start >= 0 && end > start ? text.slice(start, end + 1) : null;
}

function normalizePlan(raw: RawPlan, input: string): AIPlan | null {
  const actions: AIPlanAction[] = [];
  (raw.actions ?? []).slice(0, 5).forEach((action, index) => {
    const title = typeof action.title === 'string' ? action.title.trim() : '';
    if (!title) return;
    const tool = VALID_TOOLS.includes(action.tool as AIToolName) ? (action.tool as AIToolName) : 'createTask';
    const category = VALID_CATEGORIES.includes(action.category as Task['category']) ? (action.category as Task['category']) : 'life';
    const time = typeof action.time === 'string' && /^\d{1,2}:\d{2}$/.test(action.time) ? action.time : '待安排';
    actions.push({
      id: `ai-${Date.now()}-${index}`,
      tool,
      title,
      time,
      category,
      explanation: typeof action.explanation === 'string' ? action.explanation : 'AI 生成的安排',
      requiresConfirmation: action.requiresConfirmation ?? tool === 'createRecurringTask',
    });
  });
  if (!actions.length) return null;
  return {
    id: `ai-${Date.now()}`,
    input,
    summary: typeof raw.summary === 'string' && raw.summary.trim() ? raw.summary.trim() : '我已把你的意愿拆成今天可以执行的安排',
    actions,
    createdAt: new Date().toISOString(),
    source: 'ai',
  };
}

async function callChatCompletion(input: string, state?: LifeOSState): Promise<AIPlan> {
  const today = new Date();
  const todayLabel = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const response = await fetch(`${AI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(input, state, todayLabel) },
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`AI 请求失败：HTTP ${response.status}`);
    }
    const payload = await response.json() as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content ?? '';
    const json = firstJsonObject(content);
    if (!json) throw new Error('AI 返回内容不是 JSON');
    const plan = normalizePlan(JSON.parse(json) as RawPlan, input);
    if (!plan) throw new Error('AI 未返回有效安排');
    return plan;
  } finally {
    clearTimeout(timer);
  }
}

/** 本地规则兜底：未配置 key 或网络/接口异常时使用，保证功能始终可用 */
export function generateLocalPlan(input: string): AIPlan {
  const normalized = input.trim();
  const actions: AIPlan['actions'] = [];
  const addTask = (id: string, title: string, time: string, category: Task['category'], explanation: string) => actions.push({ id, tool: 'createTask', title, time, category, explanation, requiresConfirmation: false });
  if (/论文/.test(normalized)) addTask('paper', '修改论文第二章', '14:00', 'work', '安排到今天下午的专注时段');
  if (/健身|训练/.test(normalized)) addTask('fitness', '健身训练（胸 + 三头）', '19:00', 'fitness', '根据当前训练计划安排');
  if (/英语|学习/.test(normalized)) addTask('english', '学习英语 30 分钟', '20:30', 'learning', '安排在训练后，保持连续性');
  if (/浇花/.test(normalized)) actions.push({ id: 'water', tool: 'createRecurringTask', title: '浇花', time: '10:00', category: 'life', explanation: '创建每周六的周期任务', requiresConfirmation: true });
  if (/房租/.test(normalized)) actions.push({ id: 'rent', tool: 'createRecurringTask', title: '交房租', time: '09:00', category: 'life', explanation: '创建每月 1 日的周期任务', requiresConfirmation: true });
  if (!actions.length) addTask('general', normalized || '整理今天的计划', '待安排', 'life', '先加入收件箱，稍后再安排时间');
  return {
    id: `ai-${Date.now()}`,
    input: normalized,
    summary: '本地规则生成的安排（未连接 AI）',
    actions,
    createdAt: new Date().toISOString(),
    source: 'local',
  };
}

/**
 * 生成计划：优先调用真实 AI；未配置或调用失败时降级到本地规则，并在 source 中标注来源。
 */
export async function generatePlan(input: string, state?: LifeOSState): Promise<AIPlan> {
  const normalized = input.trim();
  if (!isAIConfigured()) {
    return { ...generateLocalPlan(normalized), note: '未配置 AI，已使用本地规则' };
  }
  try {
    return await callChatCompletion(normalized, state);
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    console.warn('[ai] 调用失败，降级到本地规则：', message);
    return { ...generateLocalPlan(normalized), note: `AI 调用失败，已用本地规则（${message}）` };
  }
}

/** 兼容旧调用点 */
export const generateMockPlan = generatePlan;
