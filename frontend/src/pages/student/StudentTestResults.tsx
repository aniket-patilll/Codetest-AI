import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTest, getSubmissionsForTest, getMyRank, Test, SubmissionDetail } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Trophy, Clock, CheckCircle, XCircle, ArrowLeft, Sparkles, AlertCircle, Code, BarChart3, Calculator, Lightbulb, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const StudentTestResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [test, setTest] = useState<Test | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDetail[]>([]);
  const [rankInfo, setRankInfo] = useState<{ rank?: number; total_score?: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [testData, submissionsData, rankData] = await Promise.all([
          getTest(id),
          getSubmissionsForTest(id),
          getMyRank(id)
        ]);

        setTest(testData);
        setSubmissions(submissionsData);
        setRankInfo(rankData);
      } catch (err) {
        console.error('Failed to fetch results:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!test) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground">
        <div className="p-6 rounded-full bg-red-500/10 mb-4">
           <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Assessment Not Found</h2>
        <p className="text-muted-foreground mb-6">The test you are looking for does not exist or has been removed.</p>
        <Button asChild variant="outline">
          <Link to="/student">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const totalScore = submissions.reduce((sum, s) => sum + s.final_score, 0);
  const maxScore = (test.questions_count || submissions.length || 0) * 100;
  
  // Calculate aggregated stats
  const totalTestsPassed = submissions.reduce((sum, s) => sum + s.testcases_passed, 0);
  const totalTestsCount = submissions.reduce((sum, s) => sum + s.total_testcases, 0);
  const avgCodeQuality = submissions.reduce((acc, curr) => {
     let score = 0;
     if (typeof curr.ai_evaluation === 'object' && curr.ai_evaluation) {
        score = curr.ai_evaluation.code_quality_score || 0;
     } else if (typeof curr.ai_evaluation === 'string') {
        try {
           const parsed = JSON.parse(curr.ai_evaluation);
           score = parsed.code_quality_score || 0;
        } catch {}
     }
     return acc + score;
  }, 0) / (submissions.length || 1);

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10 space-y-10 animate-in fade-in duration-500">
      
      {/* Premium Header */}
      <div className="max-w-5xl mx-auto space-y-6">
        <Button asChild variant="ghost" className="text-muted-foreground hover:text-primary p-0 h-auto hover:bg-transparent transition-colors group mb-2">
          <Link to="/student" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-border">
          <div className="space-y-2">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
               {test.name}
            </h1>
            <div className="flex items-center gap-4 text-muted-foreground">
               <span className="flex items-center gap-1.5 bg-muted px-3 py-1 rounded-full text-xs font-medium border border-border">
                  <Clock className="h-3.5 w-3.5" />
                  Warning: Completed on {submissions[0] ? new Date(submissions[0].submitted_at).toLocaleDateString() : 'N/A'}
               </span>
               <span className="flex items-center gap-1.5 bg-muted px-3 py-1 rounded-full text-xs font-medium border border-border">
                  <BarChart3 className="h-3.5 w-3.5" />
                  {submissions.length} Questions
               </span>
            </div>
          </div>
          
          {rankInfo?.rank && (
            <div className="flex items-center gap-3 bg-gradient-to-br from-amber-500/10 to-orange-600/10 px-6 py-3 rounded-2xl border border-amber-500/20 shadow-lg shadow-amber-900/10">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                 <Trophy className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                 <div className="text-xs text-amber-500/80 font-bold uppercase tracking-wider">Class Rank</div>
                 <div className="text-3xl font-black text-amber-500">#{rankInfo.rank}</div>
              </div>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           {/* Total Score Card */}
           <div className="relative overflow-hidden p-6 rounded-3xl border border-border bg-card group hover:border-primary/30 transition-all duration-300 hover:shadow-lg">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Trophy className="h-24 w-24 text-primary" />
              </div>
              <div className="relative z-10">
                 <div className="text-muted-foreground text-sm font-bold uppercase tracking-widest mb-2">Total Score</div>
                 <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-foreground tracking-tight">
                       {rankInfo?.total_score?.toFixed(0) || totalScore.toFixed(0)}
                    </span>
                    <span className="text-xl text-muted-foreground font-medium">/ {maxScore}</span>
                 </div>
                 <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                       className="h-full bg-gradient-to-r from-primary to-green-400 rounded-full transition-all duration-1000" 
                       style={{ width: `${(totalScore / (maxScore || 1)) * 100}%` }}
                    />
                 </div>
              </div>
           </div>

           {/* Test Cases Card */}
           <div className="relative overflow-hidden p-6 rounded-3xl border border-border bg-card group hover:border-blue-500/30 transition-all duration-300 hover:shadow-lg">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Code className="h-24 w-24 text-blue-500" />
              </div>
              <div className="relative z-10">
                 <div className="text-muted-foreground text-sm font-bold uppercase tracking-widest mb-2">Test Cases Passed</div>
                 <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-foreground tracking-tight">
                       {totalTestsPassed}
                    </span>
                    <span className="text-xl text-muted-foreground font-medium">/ {totalTestsCount}</span>
                 </div>
                 <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                    {totalTestsPassed === totalTestsCount ? (
                       <span className="text-green-600 flex items-center gap-1.5">
                          <CheckCircle className="h-4 w-4" /> Perfect Execution
                       </span>
                    ) : (
                       <span className="text-amber-600 flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4" /> Some Cases Failed
                       </span>
                    )}
                 </div>
              </div>
           </div>

           {/* Code Quality Card */}
           <div className="relative overflow-hidden p-6 rounded-3xl border border-border bg-card group hover:border-purple-500/30 transition-all duration-300 hover:shadow-lg">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Sparkles className="h-24 w-24 text-purple-500" />
              </div>
              <div className="relative z-10">
                 <div className="text-muted-foreground text-sm font-bold uppercase tracking-widest mb-2">AI Quality Score</div>
                 <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-foreground tracking-tight">
                       {avgCodeQuality.toFixed(1)}
                    </span>
                    <span className="text-xl text-muted-foreground font-medium">/ 10</span>
                 </div>
                 <div className="mt-4 text-sm text-purple-600 font-medium">
                    Based on algorithmic efficiency & clarity
                 </div>
              </div>
           </div>
        </div>

        {/* Detailed Breakdown */}
        <div className="space-y-6 pt-6">
           <h2 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <Calculator className="h-6 w-6 text-muted-foreground" />
              Problem Breakdown
           </h2>
           
           <div className="space-y-4">
             {submissions.map((submission, index) => {
                let aiEval: any = submission.ai_evaluation;
                if (typeof aiEval === 'string') {
                   try { aiEval = JSON.parse(aiEval); } catch { aiEval = null; }
                }

                return (
                 <Card key={submission.id} className="overflow-hidden border border-border bg-card hover:bg-muted/30 transition-colors rounded-2xl shadow-sm">
                   <Accordion type="single" collapsible>
                     <AccordionItem value="details" className="border-0">
                       <AccordionTrigger className="w-full px-6 py-5 hover:no-underline hover:bg-muted/50 transition-colors">
                         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full pr-4">
                           <div className="flex items-center gap-5">
                             <div className={cn(
                               "h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-inner",
                               submission.testcases_passed === submission.total_testcases 
                                 ? "bg-green-500/10 text-green-600 border border-green-500/20" 
                                 : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                             )}>
                               {index + 1}
                             </div>
                             <div className="text-left">
                               <h3 className="font-bold text-lg text-foreground">Problem {index + 1}</h3> 
                               <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                 <span className={cn(
                                     "flex items-center gap-1.5 font-medium",
                                     submission.testcases_passed === submission.total_testcases ? "text-green-600" : "text-amber-600"
                                   )}>
                                   {submission.testcases_passed === submission.total_testcases ? 
                                     <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />
                                   }
                                   {submission.testcases_passed}/{submission.total_testcases} Passed
                                 </span>
                                 <span className="w-1 h-1 rounded-full bg-border" />
                                 <span className="flex items-center gap-1.5 font-mono">
                                   <Clock className="h-3.5 w-3.5" />
                                   {submission.execution_time}
                                 </span>
                               </div>
                             </div>
                           </div>
                           
                           <div className="flex items-center gap-6 text-right">
                             <div>
                               <p className="text-xs text-black font-bold uppercase tracking-wider mb-0.5">Score</p>
                               <p className="text-2xl font-black text-black">{submission.final_score.toFixed(0)}</p>
                             </div>
                           </div>
                         </div>
                       </AccordionTrigger>
      
                       <AccordionContent className="border-t border-border bg-muted/30">
                         <div className="p-6 grid lg:grid-cols-2 gap-8">
                           {/* Code Snippet */}
                           <div className="space-y-3">
                             <h4 className="font-semibold text-black flex items-center gap-2">
                               <Code className="h-4 w-4 text-black" />
                               Submitted Solution
                             </h4>
                             <div className="bg-[#0a0a0a] rounded-xl border border-white/10 p-5 overflow-x-auto shadow-inner h-[300px] overflow-y-auto custom-scrollbar">
                               <pre className="text-sm font-mono text-white leading-relaxed">
                                 {submission.code}
                               </pre>
                             </div>
                           </div>
      
                           {/* AI Feedback */}
                           {aiEval && (
                             <div className="space-y-3">
                                <h4 className="font-semibold text-purple-400 flex items-center gap-2">
                                 <Sparkles className="h-4 w-4 text-purple-400" />
                                 AI Analysis
                               </h4>
                               <div className="space-y-5 rounded-xl bg-gradient-to-br from-indigo-900/10 to-purple-900/10 p-6 border border-indigo-500/20 shadow-inner h-full">
                                 <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-3 rounded-lg border border-white/5">
                                       <div className="text-xs text-black uppercase font-bold mb-1">Time Complexity</div>
                                       <div className="font-mono text-emerald-400 font-semibold">{aiEval.time_complexity}</div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-white/5">
                                       <div className="text-xs text-black uppercase font-bold mb-1">Space Complexity</div>
                                       <div className="font-mono text-emerald-400 font-semibold">{aiEval.space_complexity}</div>
                                    </div>
                                 </div>
                                 
                                 <div className="space-y-4">
                                    <div className="space-y-2">
                                       <div className="flex justify-between text-sm">
                                          <span className="text-foreground">Code Quality</span>
                                          <span className="font-bold text-indigo-600">{aiEval.code_quality_score}/10</span>
                                       </div>
                                       <div className="h-2.5 bg-muted rounded-full overflow-hidden border border-border">
                                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(aiEval.code_quality_score || 0) * 10}%` }} />
                                       </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                       <div className="flex justify-between text-sm">
                                          <span className="text-foreground">Logical Clarity</span>
                                          <span className="font-bold text-purple-600">{aiEval.logical_clarity_score}/10</span>
                                       </div>
                                       <div className="h-2.5 bg-muted rounded-full overflow-hidden border border-border">
                                          <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(aiEval.logical_clarity_score || 0) * 10}%` }} />
                                       </div>
                                    </div>
                                 </div>

                                 {/* Justification */}
                                 {aiEval.justification && (
                                    <div className="pt-4 border-t border-indigo-200">
                                       <div className="flex items-start gap-2 mb-2">
                                          <MessageSquare className="h-4 w-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                                          <div className="text-xs text-indigo-700 font-semibold uppercase tracking-wider">Evaluation Summary</div>
                                       </div>
                                       <p className="text-sm text-indigo-900 leading-relaxed pl-6">
                                          {aiEval.justification}
                                       </p>
                                    </div>
                                 )}

                                 {/* Suggestions */}
                                 {aiEval.suggestions && aiEval.suggestions.length > 0 && (
                                    <div className="pt-4 border-t border-indigo-200">
                                       <div className="flex items-center gap-2 mb-3">
                                          <Lightbulb className="h-4 w-4 text-amber-600" />
                                          <div className="text-xs text-amber-700 font-semibold uppercase tracking-wider">Improvement Suggestions</div>
                                       </div>
                                       <ul className="space-y-2.5 pl-6">
                                          {aiEval.suggestions.map((suggestion, idx) => (
                                             <li key={idx} className="text-sm text-amber-900 leading-relaxed flex items-start gap-2">
                                                <span className="text-amber-600 mt-1.5 flex-shrink-0">•</span>
                                                <span>{suggestion}</span>
                                             </li>
                                          ))}
                                       </ul>
                                    </div>
                                 )}
                               </div>
                             </div>
                           )}
                         </div>
                       </AccordionContent>
                     </AccordionItem>
                   </Accordion>
                 </Card>
                );
             })}
           </div>
        </div>
      </div>
    </div>
  );
};

export default StudentTestResults;
