import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSubmissionsForTest, getTest, SubmissionDetail, Test } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Search, Clock, Cpu, HardDrive, Sparkles, Loader2, FileCode, ArrowLeft, CheckCircle, XCircle, Eye, Download, AlertTriangle, Zap, Lightbulb, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

const TestResults: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'score' | 'time' | 'name'>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [test, setTest] = useState<Test | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionDetail[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      } else {
        setIsRefreshing(true);
      }
      const [testData, submissionsData] = await Promise.all([
        getTest(id!),
        getSubmissionsForTest(id!)
      ]);
      setTest(testData);
      setSubmissions(submissionsData);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  // Sort submissions
  const sortedSubmissions = [...submissions].sort((a, b) => {
    let aValue: number | string;
    let bValue: number | string;

    switch (sortField) {
      case 'score':
        aValue = a.final_score;
        bValue = b.final_score;
        break;
      case 'time':
        aValue = new Date(a.submitted_at).getTime();
        bValue = new Date(b.submitted_at).getTime();
        break;
      case 'name':
        aValue = a.participant?.user?.full_name || '';
        bValue = b.participant?.user?.full_name || '';
        break;
      default:
        aValue = a.final_score;
        bValue = b.final_score;
    }

    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    } else {
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      if (sortDirection === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    }
  });

  // Filter submissions based on search query
  const filteredSubmissions = sortedSubmissions.filter((submission) =>
    submission.participant?.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    submission.participant?.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStudentName = (submission: SubmissionDetail) => {
    return submission.participant?.user?.full_name || 'Unknown Student';
  };

  const getStudentEmail = (submission: SubmissionDetail) => {
    return submission.participant?.user?.email || 'No Email';
  };

  const handlePublishResults = async () => {
    if (!id) return;
    setIsPublishing(true);
    try {
      await import('@/lib/api').then(m => m.updateTest(id, { status: 'completed' }));
      setTest(prev => prev ? { ...prev, status: 'completed' } : null);
      alert('Results published successfully! Students can now view their scores.');
    } catch (err) {
      console.error('Failed to publish results:', err);
      alert('Failed to publish results. Please try again.');
    } finally {
      setIsPublishing(false);
    }
  };
  
  // Helper to ensure AI evaluation is an object
  const getAiEval = (submission: SubmissionDetail) => {
     if (typeof submission.ai_evaluation === 'string') {
        try {
           return JSON.parse(submission.ai_evaluation);
        } catch {
           return null;
        }
     }
     return submission.ai_evaluation;
  };

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
           <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
           <p className="text-zinc-500 font-medium animate-pulse">Loading Results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-zinc-100 p-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-900">
        <div className="space-y-1">
          <Link to="/host" className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-emerald-400 mb-2 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
             <h1 className="text-3xl font-bold tracking-tight text-white glow-text">Test Results</h1>
             <Badge variant="outline" className="border-zinc-800 bg-zinc-900/50 text-zinc-400 font-mono">
                {test?.name}
             </Badge>
          </div>
          <p className="text-zinc-500 max-w-2xl">
             View detailed performance metrics and AI-driven insights for all participants.
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => fetchData(false)} 
            disabled={isRefreshing}
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Refreshing
              </>
            ) : (
              <>
                 <ArrowLeft className="mr-2 h-4 w-4 rotate-180" /> {/* Refresh icon substitute */}
                 Refresh
              </>
            )}
          </Button>
          
          <Button 
             onClick={handlePublishResults} 
             disabled={isPublishing || test?.status === 'completed'} 
             className={cn(
                "font-semibold shadow-lg shadow-emerald-900/20 transition-all",
                test?.status === 'completed' 
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                  : "bg-emerald-600 hover:bg-emerald-500 text-white"
             )}
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : test?.status === 'completed' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Published
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Publish Results
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Students", value: filteredSubmissions.length, icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/20" },
          { 
             label: "Avg. Score", 
             value: filteredSubmissions.length > 0 ? (filteredSubmissions.reduce((sum, s) => sum + s.final_score, 0) / filteredSubmissions.length).toFixed(1) : '0', 
             icon: Sparkles, 
             color: "text-amber-400", 
             bg: "bg-amber-500/10", 
             border: "border-amber-500/20" 
          },
          { 
             label: "Pass Rate", 
             value: filteredSubmissions.length > 0 ? ((filteredSubmissions.filter(s => s.testcases_passed === s.total_testcases).length / filteredSubmissions.length) * 100).toFixed(0) + '%' : '0%', 
             icon: CheckCircle, 
             color: "text-emerald-400", 
             bg: "bg-emerald-500/10", 
             border: "border-emerald-500/20" 
          },
          { 
             label: "Avg. Testcases", 
             value: filteredSubmissions.length > 0 ? (filteredSubmissions.reduce((sum, s) => sum + s.testcases_passed, 0) / filteredSubmissions.reduce((sum, s) => sum + s.total_testcases, 0) * 100).toFixed(0) + '%' : '0%', 
             icon: FileCode, 
             color: "text-purple-400", 
             bg: "bg-purple-500/10", 
             border: "border-purple-500/20" 
          }
        ].map((stat, i) => (
           <div key={i} className={cn("p-5 rounded-xl border bg-card/50 backdrop-blur-sm transition-all hover:border-zinc-700", stat.border)}>
              <div className="flex justify-between items-start">
                 <div>
                    <p className="text-zinc-500 text-sm font-medium mb-1">{stat.label}</p>
                    <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
                 </div>
                 <div className={cn("p-2.5 rounded-lg", stat.bg)}>
                    <stat.icon className={cn("h-5 w-5", stat.color)} />
                 </div>
              </div>
           </div>
        ))}
      </div>

      {/* Controls & Table */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-end">
          <div className="w-full md:max-w-md relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
             <Input 
                placeholder="Search students..." 
                className="pl-10 bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus-visible:ring-emerald-500/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
             <Select value={sortField} onValueChange={(v: any) => setSortField(v)}>
                <SelectTrigger className="w-[140px] bg-zinc-900 border-zinc-800 text-zinc-300">
                   <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                   <SelectItem value="score">Score</SelectItem>
                   <SelectItem value="time">Time</SelectItem>
                   <SelectItem value="name">Name</SelectItem>
                </SelectContent>
             </Select>
             <Select value={sortDirection} onValueChange={(v: any) => setSortDirection(v)}>
                <SelectTrigger className="w-[110px] bg-zinc-900 border-zinc-800 text-zinc-300">
                   <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-300">
                   <SelectItem value="desc">Desc</SelectItem>
                   <SelectItem value="asc">Asc</SelectItem>
                </SelectContent>
             </Select>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 overflow-hidden shadow-sm">
           <Table>
              <TableHeader className="bg-zinc-900/80 border-b border-zinc-800">
                 <TableRow className="hover:bg-transparent border-zinc-800">
                    <TableHead className="text-zinc-400 font-medium pl-6">Student</TableHead>
                    <TableHead className="text-zinc-400 font-medium">Language</TableHead>
                    <TableHead className="text-zinc-400 font-medium text-right">Score</TableHead>
                    <TableHead className="text-zinc-400 font-medium text-right">Test Cases</TableHead>
                    <TableHead className="text-zinc-400 font-medium text-right hidden lg:table-cell">Complexity</TableHead>
                    <TableHead className="text-zinc-400 font-medium text-right pr-6">Details</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                 {filteredSubmissions.length === 0 ? (
                    <TableRow className="hover:bg-transparent border-zinc-800">
                       <TableCell colSpan={6} className="h-32 text-center text-zinc-500">
                          No results found matching your criteria.
                       </TableCell>
                    </TableRow>
                 ) : (
                    filteredSubmissions.map((sub) => {
                       const aiEval = getAiEval(sub);
                       
                       return (
                          <TableRow key={sub.id} className="border-zinc-800 hover:bg-zinc-800/30 transition-colors">
                             <TableCell className="pl-6">
                                <div>
                                   <div className="font-medium text-zinc-200">{getStudentName(sub)}</div>
                                   <div className="text-xs text-zinc-500">{getStudentEmail(sub)}</div>
                                </div>
                             </TableCell>
                             <TableCell>
                                <Badge variant="outline" className="bg-zinc-900 text-zinc-400 border-zinc-700 capitalize font-mono text-[10px]">
                                   {sub.language}
                                </Badge>
                             </TableCell>
                             <TableCell className="text-right">
                                <span className={cn(
                                   "font-bold font-mono",
                                   sub.final_score >= 90 ? "text-emerald-400" :
                                   sub.final_score >= 70 ? "text-amber-400" : "text-red-400"
                                )}>
                                   {sub.final_score.toFixed(1)}
                                </span>
                             </TableCell>
                             <TableCell className="text-right">
                                <div className="flex justify-end">
                                   <Badge variant="secondary" className={cn(
                                      "font-mono text-[10px]",
                                      sub.testcases_passed === sub.total_testcases ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                                   )}>
                                      {sub.testcases_passed} / {sub.total_testcases}
                                   </Badge>
                                </div>
                             </TableCell>
                             <TableCell className="text-right hidden lg:table-cell">
                                <div className="flex flex-col items-end gap-0.5 text-xs font-mono text-zinc-500">
                                   <span>T: {aiEval?.time_complexity || '-'}</span>
                                   <span>S: {aiEval?.space_complexity || '-'}</span>
                                </div>
                             </TableCell>
                             <TableCell className="text-right pr-6">
                                <Button 
                                   variant="ghost" 
                                   size="sm" 
                                   onClick={() => setSelectedSubmission(sub)}
                                   className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                                >
                                   View Report <ArrowLeft className="ml-2 h-3.5 w-3.5 rotate-180" />
                                </Button>
                             </TableCell>
                          </TableRow>
                       );
                    })
                 )}
              </TableBody>
           </Table>
        </div>
      </div>

      {/* Details Sheet */}
      <Sheet open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <SheetContent className="w-full sm:max-w-2xl bg-[#0f0f0f] border-zinc-800 text-zinc-100 overflow-y-auto p-0">
          {selectedSubmission && (() => {
             const aiEval = getAiEval(selectedSubmission);
             
             return (
               <div className="flex flex-col h-full">
                  <SheetHeader className="p-6 border-b border-zinc-800 bg-zinc-900/50">
                     <SheetTitle className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold text-lg">
                           {getStudentName(selectedSubmission).charAt(0)}
                        </div>
                        <div>
                           {getStudentName(selectedSubmission)}
                           <div className="text-sm font-normal text-zinc-500 mt-1">{getStudentEmail(selectedSubmission)}</div>
                        </div>
                     </SheetTitle>
                     <SheetDescription className="text-zinc-500 flex items-center gap-2 text-xs">
                        <Clock className="h-3 w-3" /> Submitted on {new Date(selectedSubmission.submitted_at).toLocaleString()}
                     </SheetDescription>
                  </SheetHeader>

                  <div className="p-6 space-y-8 pb-20">
                     {/* Score Cards */}
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                           <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">Final Score</div>
                           <div className={cn("text-4xl font-black", selectedSubmission.final_score >= 70 ? 'text-emerald-400' : 'text-amber-400')}>
                              {selectedSubmission.final_score.toFixed(0)}
                              <span className="text-lg text-zinc-600 font-normal">/100</span>
                           </div>
                        </div>
                        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/50">
                           <div className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">Test Cases</div>
                           <div className="flex items-center gap-2">
                              {selectedSubmission.testcases_passed === selectedSubmission.total_testcases ? (
                                 <CheckCircle className="h-6 w-6 text-emerald-500" />
                              ) : (
                                 <XCircle className="h-6 w-6 text-red-500" />
                              )}
                              <div className="text-2xl font-bold text-white">
                                 {selectedSubmission.testcases_passed}<span className="text-zinc-600 text-lg">/{selectedSubmission.total_testcases}</span>
                              </div>
                           </div>
                        </div>
                     </div>

                     {/* AI Evaluation Section */}
                     {aiEval ? (
                        <div className="space-y-4">
                           <div className="flex items-center gap-2 text-indigo-400">
                              <Sparkles className="h-5 w-5" />
                              <h3 className="font-bold text-lg">AI Analysis</h3>
                           </div>
                           
                           <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-5 space-y-6">
                              {/* Complexity Grid */}
                              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-indigo-500/10">
                                 <div>
                                    <div className="text-xs text-indigo-300/70 mb-1">Time Complexity</div>
                                    <div className="font-mono text-indigo-200 font-semibold">{aiEval.time_complexity}</div>
                                 </div>
                                 <div>
                                    <div className="text-xs text-indigo-300/70 mb-1">Space Complexity</div>
                                    <div className="font-mono text-indigo-200 font-semibold">{aiEval.space_complexity}</div>
                                 </div>
                              </div>
                              
                              {/* Quality Scores */}
                              <div className="space-y-3">
                                 <div>
                                    <div className="flex justify-between text-sm mb-1.5">
                                       <span className="text-zinc-300">Code Quality</span>
                                       <span className="text-indigo-300 font-mono">{aiEval.code_quality_score}/10</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                                       <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(aiEval.code_quality_score || 0) * 10}%` }} />
                                    </div>
                                 </div>
                                 <div>
                                    <div className="flex justify-between text-sm mb-1.5">
                                       <span className="text-zinc-300">Logical Clarity</span>
                                       <span className="text-indigo-300 font-mono">{aiEval.logical_clarity_score}/10</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                                       <div className="h-full bg-purple-500 rounded-full" style={{ width: `${(aiEval.logical_clarity_score || 0) * 10}%` }} />
                                    </div>
                                 </div>
                              </div>

                              {/* Justification */}
                              {aiEval.justification && (
                                 <div className="pt-4 border-t border-indigo-500/10">
                                    <div className="flex items-start gap-2 mb-2">
                                       <MessageSquare className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                                       <div className="text-xs text-indigo-300/70 font-semibold uppercase tracking-wider">Evaluation Summary</div>
                                    </div>
                                    <p className="text-sm text-indigo-200/90 leading-relaxed pl-6">
                                       {aiEval.justification}
                                    </p>
                                 </div>
                              )}

                              {/* Suggestions */}
                              {aiEval.suggestions && aiEval.suggestions.length > 0 && (
                                 <div className="pt-4 border-t border-indigo-500/10">
                                    <div className="flex items-center gap-2 mb-3">
                                       <Lightbulb className="h-4 w-4 text-amber-400" />
                                       <div className="text-xs text-amber-300/70 font-semibold uppercase tracking-wider">Improvement Suggestions</div>
                                    </div>
                                    <ul className="space-y-2 pl-6">
                                       {aiEval.suggestions.map((suggestion, idx) => (
                                          <li key={idx} className="text-sm text-amber-200/90 leading-relaxed flex items-start gap-2">
                                             <span className="text-amber-400/60 mt-1.5 flex-shrink-0">•</span>
                                             <span>{suggestion}</span>
                                          </li>
                                       ))}
                                    </ul>
                                 </div>
                              )}
                           </div>
                        </div>
                     ) : (
                        <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30 text-center">
                           <Loader2 className="h-8 w-8 text-zinc-600 animate-spin mx-auto mb-3" />
                           <p className="text-zinc-500">AI analysis is processing or unavailable...</p>
                        </div>
                     )}

                     {/* Code Editor View */}
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                           <h3 className="font-bold text-lg text-white">Submitted Code</h3>
                           <Badge variant="outline" className="font-mono text-zinc-500">
                              {selectedSubmission.language}
                           </Badge>
                        </div>
                        <div className="rounded-xl border border-zinc-800 bg-[#0d1117] overflow-hidden">
                           <div className="bg-zinc-800/50 px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
                              <div className="flex gap-1.5">
                                 <div className="w-3 h-3 rounded-full bg-red-500/20" />
                                 <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                                 <div className="w-3 h-3 rounded-full bg-green-500/20" />
                              </div>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-zinc-300">
                                 <Download className="h-3.5 w-3.5" />
                              </Button>
                           </div>
                           <div className="p-4 overflow-x-auto">
                              <pre className="text-sm font-mono text-zinc-300 leading-relaxed">
                                 {selectedSubmission.code}
                              </pre>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
             );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default TestResults;