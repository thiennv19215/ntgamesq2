import { parseBank } from './questions';

// Vite gom mọi file câu hỏi lúc chạy; thêm file .txt vào cau-hoi/ là tự có
const files = import.meta.glob('./cau-hoi/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export const QUESTIONS = parseBank(files);

export const QUESTION_TOPICS = [...new Set(QUESTIONS.map((question) => question.category))].sort((a, b) => a.localeCompare(b, 'vi'));

export const QUESTION_TOPIC_COUNTS = new Map(
  QUESTION_TOPICS.map((topic): [string, number] => [topic, QUESTIONS.filter((question) => question.category === topic).length]),
);
