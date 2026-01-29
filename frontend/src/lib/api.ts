/**
 * API client for backend communication
 */
import { supabase } from './supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  requireAuth?: boolean;
}

/**
 * Make an authenticated API request to the backend
 */
export async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const { method = 'GET', body, requireAuth = true } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Add auth token if required
  if (requireAuth) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// Code Execution API
// ============================================

export interface TestcaseInput {
  input: string;
  expected_output: string;
}

export interface ExecutionRequest {
  code: string;
  language: 'python' | 'cpp' | 'java';
  testcases: TestcaseInput[];
  timeout_seconds?: number;
  memory_limit_mb?: number;
}

export interface TestcaseResult {
  testcase_index: number;
  passed: boolean;
  actual_output: string;
  expected_output: string;
  execution_time_ms: number;
  memory_used_mb: number;
  error?: string;
}

export interface ExecutionResponse {
  results: TestcaseResult[];
  summary: {
    passed: number;
    failed: number;
    total: number;
    avg_execution_time_ms: number;
    max_memory_mb: number;
  };
  runtime_error?: string;
}

export async function executeCode(request: ExecutionRequest): Promise<ExecutionResponse> {
  return apiRequest<ExecutionResponse>('/api/v1/execute', {
    method: 'POST',
    body: request,
  });
}

// ============================================
// Submission API
// ============================================

export interface SubmissionRequest {
  question_id: string;
  code: string;
  language: 'python' | 'cpp' | 'java';
  is_final?: boolean;
}

export interface SubmissionResponse {
  submission_id: string;
  testcases_passed: number;
  total_testcases: number;
  rule_based_score: number;
  execution_time: string;
  memory_used: string;
  runtime_error?: string;
}

export async function submitSolution(request: SubmissionRequest): Promise<SubmissionResponse> {
  return apiRequest<SubmissionResponse>('/api/v1/submit', {
    method: 'POST',
    body: request,
  });
}

// ============================================
// AI Evaluation API
// ============================================

export interface AIEvaluation {
  code_quality_score: number;
  logical_clarity_score: number;
  time_complexity: string;
  space_complexity: string;
  overall_score: number;
  suggestions?: string[];
  justification?: string;
}

export interface EvaluationResponse {
  submission_id: string;
  ai_evaluation: AIEvaluation;
  final_score: number;
  rule_based_score: number;
  ai_weight: number;
}

export async function evaluateSubmission(submissionId: string): Promise<EvaluationResponse> {
  return apiRequest<EvaluationResponse>('/api/v1/evaluate', {
    method: 'POST',
    body: { submission_id: submissionId },
  });
}

export interface GeneratedQuestion {
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  testcases: {
    input: string;
    expected_output: string;
    is_hidden: boolean;
  }[];
  code_snippets: {
    [key: string]: {
      starter_code: string;
      driver_code: string;
    };
  };
}

export async function generateQuestion(prompt: string, difficulty: string, testcaseCount: number = 5): Promise<GeneratedQuestion> {
  return apiRequest<GeneratedQuestion>('/api/v1/generate/question', {
    method: 'POST',
    body: { prompt, difficulty, testcase_count: testcaseCount },
  });
}

// ============================================
// Leaderboard API
// ============================================

export interface LeaderboardEntry {
  rank: number;
  student_name: string;
  user_id: string;
  total_score: number;
  testcases_passed: number;
  total_testcases: number;
  time_taken: string;
  submitted_at?: string;
}

export interface LeaderboardResponse {
  test_id: string;
  entries: LeaderboardEntry[];
  total_participants: number;
}

export async function getLeaderboard(
  testId: string,
  limit = 50,
  offset = 0
): Promise<LeaderboardResponse> {
  return apiRequest<LeaderboardResponse>(
    `/api/v1/leaderboard/${testId}?limit=${limit}&offset=${offset}`
  );
}

export async function getMyRank(testId: string): Promise<{
  ranked: boolean;
  rank?: number;
  total_score?: number;
  message?: string;
}> {
  return apiRequest(`/api/v1/leaderboard/${testId}/my-rank`);
}

// ============================================
// Tests API (Supabase Direct)
// ============================================

export interface Test {
  id: string;
  name: string;
  host_id: string;
  duration_minutes: number;
  languages: string[];
  status: 'draft' | 'scheduled' | 'active' | 'completed';
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  join_code?: string;
  password?: string | null;
  participants_count?: number;
  questions_count?: number;
}

export interface Question {
  id: string;
  test_id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  order_index: number;
}

export interface Testcase {
  id: string;
  question_id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  order_index: number;
}

export interface Participant {
  id: string;
  user_id: string;
  test_id: string;
  status: 'registered' | 'started' | 'submitted';
  joined_at: string;
  started_at: string | null;
  submitted_at: string | null;
  user?: {
    full_name: string;
    email: string;
  };
}

// Get all tests for the current host
export async function getHostTests(): Promise<Test[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tests')
    .select(`
      *,
      participants:participants(count),
      questions:questions(count)
    `)
    .eq('host_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || []).map(test => ({
    ...test,
    participants_count: test.participants?.[0]?.count || 0,
    questions_count: test.questions?.[0]?.count || 0,
  }));
}

// Get a single test by ID
export async function getTest(testId: string): Promise<Test> {
  const { data, error } = await supabase
    .from('tests')
    .select(`
      *,
      participants:participants(count),
      questions:questions(count)
    `)
    .eq('id', testId)
    .single();

  if (error) throw new Error(error.message);

  return {
    ...data,
    participants_count: data.participants?.[0]?.count || 0,
    questions_count: data.questions?.[0]?.count || 0,
  };
}

export async function createTest(test: {
  name: string;
  duration_minutes: number;
  languages: string[];
  status?: 'draft' | 'scheduled' | 'active';
  starts_at?: string;
  ends_at?: string;
  password?: string | null;
}): Promise<Test> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('tests')
    .insert({
      ...test,
      host_id: session.user.id,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Update a test
export async function updateTest(testId: string, updates: Partial<Test>): Promise<Test> {
  const { data, error } = await supabase
    .from('tests')
    .update(updates)
    .eq('id', testId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Delete a test
export async function deleteTest(testId: string): Promise<void> {
  const { error } = await supabase
    .from('tests')
    .delete()
    .eq('id', testId);

  if (error) throw new Error(error.message);
}

// ============================================
// Questions API
// ============================================

// Get questions for a test
export async function getQuestions(testId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('test_id', testId)
    .order('order_index');

  if (error) throw new Error(error.message);
  return data || [];
}

// Create a question
export async function createQuestion(question: {
  test_id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points?: number;
  order_index?: number;
}): Promise<Question> {
  const { data, error } = await supabase
    .from('questions')
    .insert(question)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Update a question
export async function updateQuestion(questionId: string, updates: Partial<Question>): Promise<Question> {
  const { data, error } = await supabase
    .from('questions')
    .update(updates)
    .eq('id', questionId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Delete a question
export async function deleteQuestion(questionId: string): Promise<void> {
  const { error } = await supabase
    .from('questions')
    .delete()
    .eq('id', questionId);

  if (error) throw new Error(error.message);
}

// ============================================
// Testcases API
// ============================================

// Get testcases for a question
export async function getTestcases(questionId: string): Promise<Testcase[]> {
  const { data, error } = await supabase
    .from('testcases')
    .select('*')
    .eq('question_id', questionId)
    .order('order_index');

  if (error) throw new Error(error.message);
  return data || [];
}

// Create a testcase
export async function createTestcase(testcase: {
  question_id: string;
  input: string;
  expected_output: string;
  is_hidden?: boolean;
  order_index?: number;
}): Promise<Testcase> {
  const { data, error } = await supabase
    .from('testcases')
    .insert(testcase)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Delete a testcase
export async function deleteTestcase(testcaseId: string): Promise<void> {
  const { error } = await supabase
    .from('testcases')
    .delete()
    .eq('id', testcaseId);

  if (error) throw new Error(error.message);
}

// ============================================
// Participants API
// ============================================

// Get participants for a test
export async function getParticipants(testId: string): Promise<Participant[]> {
  const { data, error } = await supabase
    .from('participants')
    .select(`
      *,
      user:users(full_name, email)
    `)
    .eq('test_id', testId)
    .order('joined_at', { ascending: false });

  if (error) throw new Error(error.message);
  
  // Transform the data to ensure user object structure is consistent
  return (data || []).map(p => ({
    ...p,
    user: Array.isArray(p.user) ? p.user[0] : p.user
  }));
}

// Get host dashboard stats
export async function getHostStats(): Promise<{
  total_tests: number;
  active_tests: number;
  total_participants: number;
}> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data: tests, error } = await supabase
    .from('tests')
    .select(`
      id,
      status,
      participants:participants(count)
    `)
    .eq('host_id', session.user.id);

  if (error) throw new Error(error.message);

  const testsList = tests || [];
  const totalParticipants = testsList.reduce(
    (sum, t) => sum + (t.participants?.[0]?.count || 0),
    0
  );

  return {
    total_tests: testsList.length,
    active_tests: testsList.filter(t => t.status === 'active').length,
    total_participants: totalParticipants,
  };
}

// ============================================
// Submissions List API (for hosts)
// ============================================

export interface SubmissionDetail {
  id: string;
  participant_id: string;
  question_id: string;
  code: string;
  language: string;
  testcases_passed: number;
  total_testcases: number;
  rule_based_score: number;
  ai_evaluation: AIEvaluation | null;
  final_score: number;
  execution_time: string | null;
  memory_used: string | null;
  runtime_error: string | null;
  submitted_at: string;
  participant?: {
    started_at: string;
    submitted_at: string;
    user: {
      full_name: string;
      email: string;
    };
  };
}

// Get all submissions for a specific test
export async function getSubmissionsForTest(testId: string): Promise<SubmissionDetail[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      participant:participants!inner(
        user_id,
        started_at,
        submitted_at,
        user:users(full_name, email)
      )
    `)
    .eq('participant.test_id', testId)
    .order('submitted_at', { ascending: false });

  if (error) throw new Error(error.message);
  
  // Transform the data to ensure consistent structure
  return (data || []).map(sub => {
    let evaluation = sub.ai_evaluation;
    if (typeof evaluation === 'string') {
      try {
        evaluation = JSON.parse(evaluation);
      } catch (e) {
        evaluation = null;
      }
    }

    return {
      ...sub,
      ai_evaluation: evaluation,
      participant: {
        ...sub.participant,
        started_at: sub.participant.started_at,
        submitted_at: sub.participant.submitted_at,
        user: Array.isArray(sub.participant?.user) ? sub.participant.user[0] : sub.participant?.user
      }
    };
  });
}

// ============================================
// Test Join API
// ============================================

// Get test by join code (for students)
export async function getTestByJoinCode(joinCode: string): Promise<Test | null> {
  const { data, error } = await supabase
    .from('tests')
    .select('*')
    .eq('join_code', joinCode.toUpperCase())
    .single();

  if (error) {
    console.error('Error finding test:', error);
    return null;
  }

  return data;
}

// Join a test as a participant
export async function joinTest(testId: string): Promise<{ success: boolean; participant_id?: string; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check if already joined
  const { data: existing } = await supabase
    .from('participants')
    .select('id')
    .eq('test_id', testId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (existing) {
    return { success: true, participant_id: existing.id };
  }

  // Join the test
  const { data, error } = await supabase
    .from('participants')
    .insert({
      test_id: testId,
      user_id: session.user.id,
      status: 'registered',
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, participant_id: data.id };
}

// Get tests for the current student
export interface StudentTest extends Participant {
  test: Test & {
    questions_count: number;
  };
  score?: number;
}

export async function getStudentTests(): Promise<StudentTest[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('participants')
    .select(`
      *,
      user:users(full_name, email),
      test:tests(*, questions(count))
    `)
    .eq('user_id', session.user.id)
    .order('joined_at', { ascending: false });

  if (error) throw new Error(error.message);

  return (data || [])
    .filter(p => p.test) // Remove orphaned participants
    .map(p => ({
      ...p,
      user: Array.isArray(p.user) ? p.user[0] : p.user,
      test: {
        ...p.test,
        questions_count: p.test.questions?.[0]?.count || 0
      }
    }));
}

// Get join URL for a test
export function getJoinUrl(joinCode: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  return `${baseUrl}/join/${joinCode}`;
}
