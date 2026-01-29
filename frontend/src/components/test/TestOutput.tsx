import React, { useState } from "react";
import { Play, Loader2, Trash2, Terminal, Send, CheckCircle, XCircle, AlertCircle, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import { AIEvaluation } from "@/lib/api";

export interface TestCaseResult {
  status: 'passed' | 'failed' | 'error';
  input: string;
  output: string;
  expected: string;
  error?: string;
  execution_time?: number;
}

export interface ComplexityMetrics {
  time: string;
  space: string;
  executionTime: string;
  memoryUsed: string;
}

export interface ExecutionResult {
  type: 'run' | 'submit';
  status?: 'accepted' | 'wrong_answer' | 'runtime_error' | 'compiler_error';
  testcases?: TestCaseResult[];
  score?: number;
  passed_count?: number;
  total_count?: number;
  runtime?: string;
  memory?: string;
  error?: string;
  complexity?: ComplexityMetrics;
  ai_evaluation?: AIEvaluation;
}

interface TestOutputProps {
  result: ExecutionResult | null;
  isRunning: boolean;
  isSubmitting: boolean;
  isFinalSubmitting: boolean;
  isRunningAllTests: boolean;
  onRun: () => void;
  onSubmit: () => void;
  onFinalSubmit: () => void;
  onClear: () => void;
  hasCode: boolean;
}

const TestOutput: React.FC<TestOutputProps> = ({ 
  result, 
  isRunning, 
  isSubmitting,
  isFinalSubmitting,
  isRunningAllTests,
  onRun, 
  onSubmit, 
  onFinalSubmit,
  onClear, 
  hasCode 
}) => {
  const [activeCase, setActiveCase] = useState(0);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] relative border-t border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/50 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-2 text-zinc-400">
          <Terminal size={14} />
          <span className="text-xs font-medium uppercase tracking-wider">
            {result ? (result.type === 'run' ? 'Test Results' : 'Submission Result') : 'Output'}
          </span>
        </div>
      </div>

      {/* Output Area */}
      <div className="flex-1 overflow-hidden font-mono text-sm relative">
        {isRunning || isSubmitting || isRunningAllTests ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1e1e1e]/80 backdrop-blur-sm z-10 transition-all text-zinc-400 gap-3">
             <Loader2 size={32} className="animate-spin text-primary" />
             <span className="font-semibold text-zinc-300">
               {isRunning ? 'Running Code...' : isRunningAllTests ? 'Testing All Cases...' : 'Evaluating Solution...'}
             </span>
          </div>
        ) : null}

        {!result ? (
           <div className="h-full flex flex-col items-center justify-center text-zinc-600 p-8 text-center">
             <Terminal size={48} className="mb-4 opacity-20" />
             <p className="mb-2 font-medium">Ready to execute</p>
             <p className="text-xs max-w-xs">Run your code to test against sample cases, or submit to check against all test cases.</p>
           </div>
        ) : result.type === 'run' && result.testcases ? (
           <div className="h-full flex flex-col">

             {/* Test Case Count Display */}
             <div className="px-4 py-2 bg-zinc-800/50 border-b border-white/5 text-xs text-zinc-400">
               Showing {result.testcases.length} test cases
             </div>
             
             {/* Test Case Tabs */}
             <div className="flex items-center gap-2 p-2 px-4 overflow-x-auto border-b border-white/5 bg-zinc-900/30">
               {result.testcases.map((tc, idx) => (
                 <button
                   key={idx}
                   onClick={() => setActiveCase(idx)}
                   className={cn(
                     "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0",
                     activeCase === idx 
                       ? "bg-zinc-700 text-white shadow-sm" 
                       : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
                   )}
                 >
                   {tc.status === 'passed' ? (
                     <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                   ) : tc.status === 'error' ? (
                     <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                   ) : (
                     <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                   )}
                   Case {idx + 1}
                 </button>
               ))}
             </div>

             {/* Complexity Metrics Display */}
             {result.complexity && (
               <div className="p-3 bg-zinc-800/30 border-b border-white/5">
                 <div className="grid grid-cols-2 gap-3 text-xs">
                   <div className="flex items-center gap-2">
                     <Clock className="h-4 w-4 text-blue-400" />
                     <div>
                       <div className="text-zinc-500">Time Complexity</div>
                       <div className="font-mono text-zinc-200">{result.complexity.time}</div>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <Zap className="h-4 w-4 text-purple-400" />
                     <div>
                       <div className="text-zinc-500">Space Complexity</div>
                       <div className="font-mono text-zinc-200">{result.complexity.space}</div>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <Clock className="h-4 w-4 text-green-400" />
                     <div>
                       <div className="text-zinc-500">Execution Time</div>
                       <div className="font-mono text-zinc-200">{result.complexity.executionTime}</div>
                     </div>
                   </div>
                   <div className="flex items-center gap-2">
                     <Zap className="h-4 w-4 text-orange-400" />
                     <div>
                       <div className="text-zinc-500">Memory Used</div>
                       <div className="font-mono text-zinc-200">{result.complexity.memoryUsed}</div>
                     </div>
                   </div>
                 </div>
                 
                 {result.ai_evaluation && (
                     <div className="mt-3 pt-3 border-t border-white/5">
                        <h4 className="flex items-center gap-2 text-xs font-bold text-primary mb-2">
                           <Zap className="h-3 w-3" /> AI Analysis
                        </h4>
                        <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                            <div>
                                <span className="text-zinc-500">Quality Score:</span> <span className="text-zinc-200">{result.ai_evaluation.code_quality_score}/10</span>
                            </div>
                            <div>
                                <span className="text-zinc-500">Logical Clarity:</span> <span className="text-zinc-200">{result.ai_evaluation.logical_clarity_score}/10</span>
                            </div>
                        </div>

                     </div>
                 )}
               </div>
             )}

             {/* Test Case Details */}
             <div className="flex-1 overflow-auto p-4 space-y-4">
               {result.testcases[activeCase] && (
                 <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-2">
                       <h3 className={cn(
                         "text-sm font-bold flex items-center gap-2",
                         result.testcases[activeCase].status === 'passed' ? "text-green-400" : "text-red-400"
                       )}>
                         {result.testcases[activeCase].status === 'passed' ? (
                           <><CheckCircle size={16} /> Passed</>
                         ) : (
                           <><XCircle size={16} /> Failed</>
                         )}
                       </h3>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="text-xs text-zinc-500 uppercase tracking-wide">Input</span>
                        <div className="p-3 rounded bg-zinc-800/50 border border-white/5 text-zinc-300">
                          {result.testcases[activeCase].input}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs text-zinc-500 uppercase tracking-wide">Output</span>
                         <div className={cn(
                           "p-3 rounded border text-zinc-300",
                           result.testcases[activeCase].status === 'passed' 
                             ? "bg-zinc-800/50 border-white/5" 
                             : "bg-red-500/10 border-red-500/20"
                         )}>
                          {result.testcases[activeCase].output}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs text-zinc-500 uppercase tracking-wide">Expected</span>
                        <div className="p-3 rounded bg-zinc-800/50 border border-white/5 text-zinc-300">
                          {result.testcases[activeCase].expected}
                        </div>
                      </div>
                      
                      {result.testcases[activeCase].error && (
                        <div className="space-y-1">
                          <span className="text-xs text-red-400 uppercase tracking-wide">Error</span>
                          <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-300 whitespace-pre-wrap">
                            {result.testcases[activeCase].error}
                          </div>
                        </div>
                      )}
                    </div>
                 </div>
               )}
             </div>
           </div>
        ) : (
          /* Submit Result */
          <div className="h-full overflow-auto p-6">
             <div className={cn(
               "mb-6 p-4 rounded-lg text-center border",
               result.status === 'accepted' 
                 ? "bg-green-500/10 border-green-500/20 text-green-400" 
                 : result.status === 'runtime_error' || result.status === 'compiler_error'
                 ? "bg-red-500/10 border-red-500/20 text-red-400"
                 : "bg-red-500/10 border-red-500/20 text-red-400" 
             )}>
                <div className="flex items-center justify-center gap-2 mb-2">
                   {result.status === 'accepted' ? (
                     <CheckCircle size={28} />
                   ) : result.status === 'runtime_error' ? (
                     <AlertCircle size={28} />
                   ) : (
                     <XCircle size={28} />
                   )}
                   <h2 className="text-2xl font-bold capitalize">
                     {result.status?.replace('_', ' ') || 'Unknown'}
                   </h2>
                </div>
                {result.error ? (
                  <pre className="text-sm opacity-90 whitespace-pre-wrap text-left mt-4 bg-black/20 p-4 rounded">{result.error}</pre>
                ) : (
                  <div className="text-sm opacity-90">
                     Passed {result.passed_count ?? 0} of {result.total_count ?? 0} test cases
                  </div>
                )}
             </div>

             {result.status === 'accepted' && (
               <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded bg-zinc-800/50 border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 mb-1 text-xs uppercase">
                      <Clock size={14} /> Runtime
                    </div>
                    <div className="text-xl font-mono text-zinc-200">{result.runtime || 'N/A'}</div>
                 </div>
                 <div className="p-4 rounded bg-zinc-800/50 border border-white/5">
                    <div className="flex items-center gap-2 text-zinc-400 mb-1 text-xs uppercase">
                      <Zap size={14} /> Memory
                    </div>
                    <div className="text-xl font-mono text-zinc-200">{result.memory || 'N/A'}</div>
                 </div>
                 <div className="p-4 rounded bg-zinc-800/50 border border-white/5 col-span-2">
                    <div className="flex items-center gap-2 text-zinc-400 mb-1 text-xs uppercase">
                      <Terminal size={14} /> Score
                    </div>
                    <div className="text-2xl font-bold text-primary">{result.score}/100</div>
                 </div>
               </div>
             )}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-2 border-t border-white/5 bg-zinc-900/50 flex items-center justify-between shrink-0">
        <Button
          onClick={onClear}
          variant="ghost"
          size="sm"
          className="text-zinc-500 hover:text-white hover:bg-zinc-800 h-8 px-3 text-xs"
          disabled={(!result) || isRunning || isSubmitting || isRunningAllTests}
        >
          <Trash2 size={14} className="mr-2" />
          Clear
        </Button>

        <div className="flex gap-2">
          <Button
            onClick={onRun}
            disabled={isRunning || isSubmitting || !hasCode}
            variant="secondary"
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 h-8 px-4 text-xs font-semibold"
          >
            {isRunning ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Running
              </>
            ) : (
              <>
                <Play size={14} className="mr-2 fill-current" />
                Run Code
              </>
            )}
          </Button>

          <Button
            onClick={onSubmit}
            disabled={isRunning || isSubmitting || isRunningAllTests || !hasCode}
            variant="secondary"
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 h-8 px-4 text-xs font-semibold"
          >
            {isRunningAllTests ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Testing All...
              </>
            ) : (
              <>
                <Play size={14} className="mr-2 fill-current" />
                Run All Tests
              </>
            )}
          </Button>

          <Button
            onClick={onFinalSubmit}
            disabled={isRunning || isSubmitting || isFinalSubmitting || !hasCode}
            className="bg-green-600 hover:bg-green-500 text-white h-8 px-4 text-xs font-semibold shadow-lg shadow-green-900/20"
          >
            {isFinalSubmitting ? (
              <>
                <Loader2 size={14} className="mr-2 animate-spin" />
                Final Submit
              </>
            ) : (
              <>
                <Send size={14} className="mr-2" />
                Final Submit
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TestOutput;
