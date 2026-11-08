export type AnswerMode = 'reveal' | 'input'
export type QuizScope = 'all' | 'wrong' | 'due'
export type QuizPhase = 'answering' | 'submitted' | 'skipped'

export interface SubjectMeta {
  id: string
  name: string
  desc: string
  icon: string
  accent: string
  file: string
  questionCount: number
}

export interface SubjectIndex {
  schemaVersion: number
  subjects: SubjectMeta[]
}

export interface Chapter {
  id: string
  name: string
}

export interface BlankMeta {
  hint?: string
}

export interface Question {
  id: string
  chapter: string
  difficulty?: number
  stem: string
  blanks?: BlankMeta[]
  explain?: string
}

export interface QuestionBank {
  schemaVersion: number
  subject: string
  chapters: Chapter[]
  questions: Question[]
}

export interface BlankRecord {
  right: number
  wrong: number
  streak: number
  lastResult: 'right' | 'wrong'
  ease: number
  interval: number
  dueAt: number
}

export interface QuestionRecord {
  lastSeenAt: number
  wrongCount: number
  mastery: number
  starred: boolean
  weight: number
  blanks: BlankRecord[]
}

export interface UserSettings {
  defaultMode: AnswerMode
  showHint: boolean
  dailyGoal: number
}

export interface SubjectProgress {
  questions: Record<string, QuestionRecord>
}

export interface ProgressState {
  schemaVersion: number
  updatedAt: number
  settings: UserSettings
  subjects: Record<string, SubjectProgress>
}

export interface SegmentText {
  type: 'text'
  text: string
}

export interface SegmentBlank {
  type: 'blank'
  index: number
  answers: string[]
  hint?: string
}

export type Segment = SegmentText | SegmentBlank

export interface BlankOutcome {
  correct: boolean
  input: string
}

export interface SessionResult {
  subjectId: string
  subjectName: string
  total: number
  totalBlanks: number
  correctBlanks: number
  accuracy: number
  durationMs: number
  newWrongCount: number
  finishedAt: number
}

export interface QuestionSnapshot {
  inputs: string[]
  revealed: boolean[]
  selfEval: ('wrong' | null)[]
  phase: QuizPhase
  outcomes: BlankOutcome[]
}
