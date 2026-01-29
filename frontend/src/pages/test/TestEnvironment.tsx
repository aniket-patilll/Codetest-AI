import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { 
  getTest, 
  getQuestions, 
  getTestcases, 
  executeCode, 
  submitSolution, 
  Test, 
  Question, 
  Testcase,
  getStudentTests,
  Participant
} from '@/lib/api';
import CodeEditor from '@/components/test/CodeEditor';
import { Clock, ChevronLeft, ChevronRight, AlertTriangle, MonitorCheck, LayoutTemplate, Loader2, ShieldAlert, Ban, EyeOff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import TestOutput, { ExecutionResult } from '@/components/test/TestOutput';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import ReactMarkdown from 'react-markdown';

interface QuestionWithTestcases extends Question {
  testcases: Testcase[];
}

const TestEnvironment: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<QuestionWithTestcases[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [language, setLanguage] = useState<'python'>('python');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Snippet State
  const [codeSnippets, setCodeSnippets] = useState<Record<string, {starter_code: string, driver_code: string}>>({});
  
  // Initialize with manual default, will be overwritten by snippets
  const [code, setCode] = useState(defaultCode['python']);
  
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalSubmitting, setIsFinalSubmitting] = useState(false);
  const [isRunningAllTests, setIsRunningAllTests] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Proctoring State
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [isProctoringAgreed, setIsProctoringAgreed] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const [isTerminated, setIsTerminated] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);


  // Fetch Test Data
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        const testData = await getTest(id);
        setTest(testData);
        setTimeLeft(testData.duration_minutes * 60);

        const questionsData = await getQuestions(id);
        
        const questionsWithTestcases = await Promise.all(
          questionsData.map(async (q) => {
            const testcases = await getTestcases(q.id);
            return { ...q, testcases };
          })
        );
        
        setQuestions(questionsWithTestcases);

        // Check participant status
        const myTests = await getStudentTests();
        const myParticipant = myTests.find(p => p.test_id === id);
        setParticipant(myParticipant || null);

      } catch (err) {
        console.error('Failed to load test data:', err);
        toast.error("Failed to load test. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // Extract snippets when question changes
  useEffect(() => {
    if (questions.length > 0) {
      const q = questions[currentQuestionIndex];
      const match = q.description.match(/<!--JSON_SNIPPETS:(.*)-->/);
      
      let newSnippets = {};
      if (match) {
        try {
          newSnippets = JSON.parse(match[1]);
        } catch (e) {
          console.error("Failed to parse snippets", e);
        }
      }
      setCodeSnippets(newSnippets);
      
      // Update code checking specific typed snippets vs generic default
      // If we have a specific starter code for this question/language, use it.
      // Otherwise use generic default.
      // We only overwrite if 'code' is basically equal to a default or empty?
      // For simplicity in this demo, we set it if it's the *first load* of this question index
      // But we don't track first load easily locally. 
      // Let's just set it if snippets exist.
      // NOTE: This resets user code when switching questions. In real app, persist user code per question.
      
      const snippet = (newSnippets as any)[language];
      if (snippet?.starter_code) {
          setCode(snippet.starter_code);
      } else {
          setCode(defaultCode[language]);
      }
    }
  }, [currentQuestionIndex, questions, language]);

  // Timer
  useEffect(() => {
    if (!test) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { // When timer hits 0, auto-submit
          clearInterval(timer);
          handleAutoSubmit("Time expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [test, timeLeft]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Proctoring: Event Listeners
  useEffect(() => {
    if (!isProctoringAgreed || isTerminated || !participant || participant.status === 'submitted') return;

    // Enter fullscreen mode
    if (!isFullscreen) {
      enterFullscreen();
    }

    // 1. Prevent Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      toast.error("Right-click is disabled during the test.");
    };

    // 2. Prevent Copy/Paste
    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      toast.error("Copy/Paste is disabled during the test.");
    };

    // 3. Prevent Key Combinations (Ctrl+C, Ctrl+V, Ctrl+Tab, etc.)
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block common shortcuts
      if ((e.ctrlKey || e.metaKey) && 
          (e.key === 'c' || e.key === 'v' || e.key === 'x' || 
           e.key === 't' || e.key === 'w' || e.key === 'n')) {
        e.preventDefault();
        toast.error(`${e.key.toUpperCase()} key combination is disabled during the test.`);
      }
      
      // Block F11 (fullscreen toggle)
      if (e.key === 'F11') {
        e.preventDefault();
      }
    };

    // 4. Tab Switch Detection (Auto-Submit)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsTerminated(true);
        handleAutoSubmit("Tab switch detected");
      }
    };

    // 5. Window Blur Detection
    const handleBlur = () => {
      setIsTerminated(true);
      handleAutoSubmit("Window lost focus");
    };

    // Attach listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPaste);
      document.removeEventListener('paste', handleCopyPaste);
      document.removeEventListener('cut', handleCopyPaste);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isProctoringAgreed, isTerminated, participant, isFullscreen]);

  const enterFullscreen = () => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.warn('Failed to enter fullscreen:', err);
      });
    }
    setIsFullscreen(true);
  };

  const exitFullscreen = () => {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(err => {
        console.warn('Failed to exit fullscreen:', err);
      });
    }
    setIsFullscreen(false);
  };

  const handleAutoSubmit = async (reason: string) => {
    toast.error(`Violation: ${reason}. Submitting test...`);
    setIsSubmitting(true);
    
    try {
        // Submit current code for current question
        const codeToRun = getFullCode(code);
        await submitSolution({
            question_id: questions[currentQuestionIndex].id,
            code: codeToRun,
            language,
            is_final: true
        });
        
        // Update participant status
        if(participant) {
            setParticipant({ ...participant, status: 'submitted' });
        }
        
    } catch (e) {
        console.error("Auto-submit failed", e);
    } finally {
        setIsSubmitting(false);
        setIsTerminated(true);
        exitFullscreen();
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate('/student');
        }, 1000);
    }
  };



  // Helper to merge user code with driver
  // Helper to merge user code with driver
  const getFullCode = (userCode: string) => {
    const snippet = (codeSnippets as any)['python'];
    if (!snippet?.driver_code) return userCode;
    
    return userCode + "\n" + snippet.driver_code;
  };

  const handleRun = async () => {
    if (!questions[currentQuestionIndex]) return;
    
    setIsRunning(true);
    setExecutionResult(null);
    
    try {
      const question = questions[currentQuestionIndex];
      const visibleTestcases = question.testcases.filter(tc => !tc.is_hidden).slice(0, 3);
      
      // Inject driver code
      const codeToRun = getFullCode(code);

      const result = await executeCode({
        code: codeToRun,
        language,
        testcases: visibleTestcases.map(tc => ({
          input: tc.input,
          expected_output: tc.expected_output
        }))
      });

      setExecutionResult({
        type: 'run',
        testcases: visibleTestcases.map((tc, idx) => {
           const res = result.results[idx];
           if (result.runtime_error) {
              return {
                 status: 'error',
                 input: tc.input,
                 output: '',
                 expected: tc.expected_output,
                 error: result.runtime_error
              };
           }
           if (!res) return { status: 'error', input: tc.input, output: '', expected: tc.expected_output, error: 'No result returned' };
           
           return {
              status: res.passed ? 'passed' : 'failed',
              input: tc.input,
              output: res.actual_output,
              expected: res.expected_output,
              error: res.error
           };
        })
      });
      
    } catch (err) {
      setExecutionResult({
         type: 'run',
         testcases: [],
         error: err instanceof Error ? err.message : "Execution failed"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    if (!questions[currentQuestionIndex]) return;

    setIsRunningAllTests(true);
    setExecutionResult(null);

    try {
      // Inject driver code
      const codeToRun = getFullCode(code);

      // Run against ALL test cases including hidden ones
      const question = questions[currentQuestionIndex];
      const allTestcases = question.testcases;
      

      
      const result = await executeCode({
        code: codeToRun,
        language,
        testcases: allTestcases.map(tc => ({
          input: tc.input,
          expected_output: tc.expected_output
        }))
      });

      // Calculate time and space complexity (simple estimation)
      const totalTime = result.summary.avg_execution_time_ms * result.summary.total;
      const totalMemory = result.summary.max_memory_mb;
      
      // Estimate complexity based on execution patterns
      const timeComplexity = estimateTimeComplexity(allTestcases.length, totalTime);
      const spaceComplexity = estimateSpaceComplexity(totalMemory);

      setExecutionResult({
        type: 'run',
        testcases: allTestcases.map((tc, idx) => {
           const res = result.results[idx];
           if (result.runtime_error) {
              return {
                 status: 'error',
                 input: tc.input,
                 output: '',
                 expected: tc.expected_output,
                 error: result.runtime_error
              };
           }
           if (!res) return { status: 'error', input: tc.input, output: '', expected: tc.expected_output, error: 'No result returned' };
           
           return {
              status: res.passed ? 'passed' : 'failed',
              input: tc.input,
              output: res.actual_output,
              expected: res.expected_output,
              error: res.error
           };
        }),
        complexity: {
          time: timeComplexity,
          space: spaceComplexity,
          executionTime: totalTime.toFixed(2) + 'ms',
          memoryUsed: totalMemory.toFixed(2) + 'MB'
        }
      });
      
    } catch (err) {
      setExecutionResult({
         type: 'run',
         testcases: [],
         error: err instanceof Error ? err.message : "Execution failed"
      });
    } finally {
      setIsRunningAllTests(false);
    }
  };

  // Helper function to estimate time complexity
  const estimateTimeComplexity = (testCaseCount: number, totalTimeMs: number): string => {
    const avgTimePerCase = totalTimeMs / testCaseCount;
    
    if (avgTimePerCase < 1) return 'O(1)';
    if (avgTimePerCase < 10) return 'O(log n)';
    if (avgTimePerCase < 100) return 'O(n)';
    if (avgTimePerCase < 1000) return 'O(n log n)';
    if (avgTimePerCase < 5000) return 'O(n²)';
    return 'O(2ⁿ)';
  };

  // Helper function to estimate space complexity
  const estimateSpaceComplexity = (memoryMb: number): string => {
    if (memoryMb < 1) return 'O(1)';
    if (memoryMb < 10) return 'O(n)';
    if (memoryMb < 100) return 'O(n²)';
    return 'O(n³)';
  };

  const handleFinalSubmit = async () => {
    if (!questions[currentQuestionIndex]) return;

    setIsFinalSubmitting(true);
    setExecutionResult(null);

    try {
      // Inject driver code
      const codeToRun = getFullCode(code);

      // Final submission - run against ALL test cases including hidden ones
      const result = await submitSolution({
        question_id: questions[currentQuestionIndex].id,
        code: codeToRun,
        language,
        is_final: true
      });
      
      const status = result.runtime_error ? 'runtime_error'
                   : result.testcases_passed === result.total_testcases ? 'accepted' 
                   : 'wrong_answer';

      setExecutionResult({
        type: 'submit',
        status,
        score: result.rule_based_score,
        passed_count: result.testcases_passed,
        total_count: result.total_testcases,
        runtime: result.execution_time,
        memory: result.memory_used,
        error: result.runtime_error
      });
      
      // Update participant status to prevent re-entry
      if (participant) {
          setParticipant({ ...participant, status: 'submitted' });
      }
      
      if (status === 'accepted') {
        toast.success("Test completed successfully! Your scores have been updated.");
      } else if (status === 'wrong_answer') {
        toast.warning("Test completed - Some test cases failed.");
      } else {
        toast.error("Runtime Error occurred during final submission");
      }
      
      // Exit fullscreen and redirect after delay
      setTimeout(() => {
        exitFullscreen();
        navigate('/student');
      }, 3000);
      
    } catch (err) {
      setExecutionResult({
        type: 'submit',
        status: 'runtime_error',
        error: err instanceof Error ? err.message : "Final submission failed"
      });
      toast.error("Failed to complete final submission");
    } finally {
      setIsFinalSubmitting(false);
    }
  };

  const handleClear = () => {
    setExecutionResult(null);
  };

  const isTimeWarning = timeLeft < 600;
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#1e1e1e] text-white">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-zinc-400">Loading test environment...</p>
        </div>
      </div>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#1e1e1e] text-white">
        <div className="flex flex-col items-center gap-4">
          <AlertTriangle className="h-12 w-12 text-red-500" />
          <p className="text-zinc-400">Failed to load test or no questions found.</p>
          <Button variant="outline" onClick={() => navigate('/student')}>Go Back</Button>
        </div>
      </div>
    );
  }

  // 1. Submitted State
  if (participant?.status === 'submitted' || isTerminated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#1e1e1e] text-white p-4">
        <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
          <CardHeader className="text-center">
            <div className="mx-auto bg-blue-500/10 p-3 rounded-full w-fit mb-4">
               <ShieldAlert className="h-8 w-8 text-blue-500" />
            </div>
            <CardTitle className="text-2xl text-white">Test Submitted</CardTitle>
            <CardDescription>
              {isTerminated 
                ? "Your test was automatically submitted due to a proctoring violation. You cannot re-enter this test." 
                : "You have successfully completed this test. Your scores have been updated in the host dashboard."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-zinc-800/50 p-4 rounded-lg text-sm text-zinc-400 text-center">
              Scores will be available in your dashboard once the host releases the results.
            </div>
            <Button className="w-full" onClick={() => navigate('/student')}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 2. Proctoring Agreement Dialog
  if (!isProctoringAgreed) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#1e1e1e] text-white p-4 z-50">
         <AlertDialog open={true}>
          <AlertDialogContent className="bg-zinc-900 border-zinc-800 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-xl">
                <ShieldAlert className="h-6 w-6 text-yellow-500" />
                Proctored Environment
              </AlertDialogTitle>
              <AlertDialogDescription className="text-zinc-400 space-y-3 pt-4">
                <p className="text-center text-lg font-semibold">The test environment is being monitored</p>
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 space-y-3 text-sm text-red-200">
                   <div className="flex items-start gap-3">
                      <Ban className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <span>Test opens in fullscreen mode - no tab switches allowed</span>
                   </div>
                   <div className="flex items-start gap-3">
                      <Ban className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <span>No copy, paste, or cut operations allowed</span>
                   </div>
                   <div className="flex items-start gap-3">
                      <Ban className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <span>No right-click context menu or keyboard shortcuts</span>
                   </div>
                   <div className="flex items-start gap-3">
                      <EyeOff className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <span className="font-bold text-red-100">Auto-submit on violation. Results will be updated in host dashboard.</span>
                   </div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded p-3 text-sm text-blue-200 mt-4">
                  <p className="font-medium">After final submission:</p>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-blue-300">
                    <li>Your scores will be updated in the test results</li>
                    <li>You will be automatically removed from the test environment</li>
                    <li>You cannot join this test again</li>
                    <li>Your dashboard will show "Test Completed" status</li>
                  </ul>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="ghost" onClick={() => navigate('/student')}>Exit</Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={async () => {
                  setIsProctoringAgreed(true);
                  // Set started_at timestamp when user agrees to start the test
                  if (participant && participant.status === 'registered') {
                    const { error } = await supabase
                      .from('participants')
                      .update({ 
                        status: 'started',
                        started_at: new Date().toISOString()
                      })
                      .eq('id', participant.id);
                      
                    if (error) {
                      console.error('Error updating participant status:', error);
                    } else {
                      setParticipant({ ...participant, status: 'started', started_at: new Date().toISOString() });
                    }
                  }
                }}
              >
                I Agree & Start Test
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {/* Background Blur */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm -z-10" />
      </div>
    );
  }

  const question = questions[currentQuestionIndex];

  return (
    <div className="fixed inset-0 flex flex-col bg-[#1e1e1e] text-white overflow-hidden">
      {/* Top Bar */}
      <header className="flex h-14 items-center justify-between border-b border-white/5 bg-[#1e1e1e] px-4 shrink-0 z-10">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/student')}
            className="text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Exit
          </Button>
          <div className="h-6 w-px bg-white/10" />
          <h1 className="font-semibold text-zinc-200">{test.name}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
             <MonitorCheck className="h-4 w-4" />
             <span className="text-xs font-medium">Proctoring Active</span>
          </div>

          <div
            className={`flex items-center gap-2 rounded px-3 py-1.5 font-mono text-sm border ${
              isTimeWarning 
                ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' 
                : 'bg-zinc-800 text-zinc-400 border-white/5'
            }`}
          >
            {isTimeWarning && <AlertTriangle className="h-4 w-4" />}
            <Clock className="h-4 w-4" />
            <span className="font-bold">{formatTime(timeLeft)}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden relative">
        <ResizablePanelGroup direction="horizontal">
          
          {/* Question Panel */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
            <div className="h-full flex flex-col bg-[#1e1e1e] border-r border-white/5">
              {/* Question Navigation */}
              <div className="flex items-center justify-between border-b border-white/5 p-3 shrink-0">
                <span className="text-sm text-zinc-400 font-medium">
                  Problem {currentQuestionIndex + 1} of {questions.length}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5"
                    disabled={currentQuestionIndex === 0}
                    onClick={() => {
                       setCurrentQuestionIndex(currentQuestionIndex - 1);
                       setExecutionResult(null); 
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-white/5"
                    disabled={currentQuestionIndex === questions.length - 1}
                    onClick={() => {
                       setCurrentQuestionIndex(currentQuestionIndex + 1);
                       setExecutionResult(null); 
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Question Content */}
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                       <h2 className="text-xl font-bold text-zinc-100">{question.title}</h2>
                       <Badge
                        variant="secondary"
                        className={`text-xs capitalize ${
                          question.difficulty === 'easy'
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : question.difficulty === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                            : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        }`}
                      >
                        {question.difficulty}
                      </Badge>
                    </div>
                    
                    {/* Render Description (hiding metadata) */}
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown 
                        components={{
                           p: ({node, ...props}) => <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap" {...props} />,
                           code: ({node, className, children, ...props}) => (
                             <code className={`${className} bg-zinc-800 px-1 py-0.5 rounded text-zinc-200`} {...props}>{children}</code>
                           ),
                           pre: ({node, children, ...props}) => (
                              <pre className="bg-zinc-900/50 border border-white/5 p-3 rounded-lg overflow-x-auto" {...props}>{children}</pre>
                           )
                        }}
                      >
                        {question.description.split('<!--JSON_SNIPPETS')[0]}
                      </ReactMarkdown>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-zinc-200">Examples</h3>
                    {question.testcases
                      .filter((tc) => !tc.is_hidden)
                      .slice(0, 3) 
                      .map((tc, idx) => (
                        <div
                          key={tc.id}
                          className="rounded-lg border border-white/5 bg-zinc-900/50 p-4"
                        >
                          <p className="text-xs font-medium text-zinc-500 mb-2 uppercase tracking-wide">Example {idx + 1}</p>
                          <div className="space-y-2 font-mono text-sm">
                            <div>
                              <span className="text-zinc-500 select-none">Input: </span>
                              <span className="text-zinc-300">{tc.input}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500 select-none">Output: </span>
                              <span className="text-zinc-300">{tc.expected_output}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  
                </div>
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="bg-zinc-800" />

          {/* Editor & Output Panel */}
          <ResizablePanel defaultSize={70}>
            <ResizablePanelGroup direction="vertical">
              
              {/* Code Editor */}
              <ResizablePanel defaultSize={70} minSize={30}>
                 <div className="h-full flex flex-col bg-[#1e1e1e]">
                   <div className="flex items-center justify-between border-b border-white/5 bg-[#1e1e1e] px-4 py-2 shrink-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs font-mono">
                          Python
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-zinc-500">
                         {Object.keys(codeSnippets).length > 0 ? "Smart Template Active" : "Standard Template"}
                      </div>
                   </div>
                   
                   <div className="flex-1 overflow-hidden">
                      <CodeEditor 
                        code={code} 
                        language="python"  
                        onChange={(val) => setCode(val || '')} 
                      />
                   </div>
                 </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-zinc-800" />

              {/* Output Panel */}
              <ResizablePanel defaultSize={30} minSize={10} maxSize={50}>
                <TestOutput 
                   result={executionResult}
                   isRunning={isRunning}
                   isSubmitting={isSubmitting}
                   isFinalSubmitting={isFinalSubmitting}
                   isRunningAllTests={isRunningAllTests}
                   onRun={handleRun}
                   onSubmit={handleSubmit}
                   onFinalSubmit={handleFinalSubmit}
                   onClear={handleClear}
                   hasCode={!!code.trim()}
                />
              </ResizablePanel>

            </ResizablePanelGroup>
          </ResizablePanel>

        </ResizablePanelGroup>
      </div>
    </div>
  );
};

const defaultCode = {
  python: `import sys
import json

def solution(data):
    # Write your solution here
    return data

if __name__ == "__main__":
    input_str = sys.stdin.read().strip()
    try:
        data = json.loads(input_str)
    except:
        data = input_str
    result = solution(data)
    if isinstance(result, (dict, list)):
        print(json.dumps(result))
    else:
        print(result)`,
};

export default TestEnvironment;
