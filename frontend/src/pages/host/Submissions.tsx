import React, { useState, useEffect } from 'react';
import { getHostTests, getSubmissionsForTest, Test, SubmissionDetail, AIEvaluation } from '@/lib/api';
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
import { Search, Clock, Cpu, HardDrive, Sparkles, Loader2, FileCode, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const Submissions: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [tests, setTests] = useState<Test[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionDetail[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch tests on mount
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const testsData = await getHostTests();
        setTests(testsData);
        if (testsData.length > 0) {
          setSelectedTestId(testsData[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch tests:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTests();
  }, []);

  const fetchSubmissions = async (showLoading = true) => {
    if (!selectedTestId) return;
    
    try {
      if (showLoading) {
        setIsLoadingSubmissions(true);
      } else {
        setIsRefreshing(true);
      }
      const data = await getSubmissionsForTest(selectedTestId);
      setSubmissions(data);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
      setSubmissions([]);
    } finally {
      setIsLoadingSubmissions(false);
      setIsRefreshing(false);
    }
  };

  // Fetch submissions when test changes
  useEffect(() => {
    fetchSubmissions();
  }, [selectedTestId]);

  const filteredData = submissions.filter((submission) =>
    submission.participant?.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    submission.participant?.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStudentName = (submission: SubmissionDetail) => {
    const user = Array.isArray(submission.participant?.user) 
      ? submission.participant?.user[0] 
      : submission.participant?.user;
    return user?.full_name || 'Unknown Student';
  };

  const getStudentEmail = (submission: SubmissionDetail) => {
    const user = Array.isArray(submission.participant?.user) 
      ? submission.participant?.user[0] 
      : submission.participant?.user;
    return user?.email || 'No Email';
  };

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Submissions</h1>
        <p className="text-muted-foreground">Review student submissions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by student name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={selectedTestId} onValueChange={setSelectedTestId}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a test" />
            </SelectTrigger>
            <SelectContent>
              {tests.map((test) => (
                <SelectItem key={test.id} value={test.id}>
                  {test.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={() => fetchSubmissions(false)} 
            disabled={isRefreshing}
            className="gap-2"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Refreshing...
              </>
            ) : (
              <>
                <ArrowLeft className="h-4 w-4" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoadingSubmissions ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
            <FileCode className="h-12 w-12 mb-2 opacity-50" />
            <p>No submissions yet for this test</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Student</TableHead>
                <TableHead>Language</TableHead>
                <TableHead className="text-right">Score</TableHead>
                <TableHead className="text-right">Test Cases</TableHead>
                <TableHead className="text-right">Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((submission) => (
                <TableRow
                  key={submission.id}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => setSelectedSubmission(submission)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                        {getStudentName(submission).split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">{getStudentName(submission)}</span>
                        <p className="text-xs text-muted-foreground">{getStudentEmail(submission)}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{submission.language}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={cn(
                        'font-bold',
                        submission.final_score >= 90
                          ? 'text-success'
                          : submission.final_score >= 70
                          ? 'text-warning'
                          : 'text-destructive'
                      )}
                    >
                      {submission.final_score.toFixed(1)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {submission.testcases_passed}/{submission.total_testcases}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {new Date(submission.submitted_at).toLocaleTimeString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View Code
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Side Panel */}
      <Sheet open={!!selectedSubmission} onOpenChange={() => setSelectedSubmission(null)}>
        <SheetContent className="w-[600px] sm:max-w-[600px] overflow-y-auto">
          {selectedSubmission && (
            <>
              <SheetHeader>
                <SheetTitle>{getStudentName(selectedSubmission)}'s Submission</SheetTitle>
                <SheetDescription>
                  Submitted at {new Date(selectedSubmission.submitted_at).toLocaleString()}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {(() => {
                  let evaluation = selectedSubmission.ai_evaluation;
                  if (typeof evaluation === 'string') {
                    try {
                      evaluation = JSON.parse(evaluation);
                    } catch (e) {
                      console.error("Failed to parse AI evaluation", e);
                      evaluation = null;
                    }
                  }
                  
                  return (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm">Execution</span>
                        </div>
                        <p className="mt-1 font-mono text-lg font-bold text-foreground">
                          {selectedSubmission.execution_time || 'N/A'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <HardDrive className="h-4 w-4" />
                          <span className="text-sm">Memory</span>
                        </div>
                        <p className="mt-1 font-mono text-lg font-bold text-foreground">
                          {selectedSubmission.memory_used || 'N/A'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border bg-muted/30 p-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Cpu className="h-4 w-4" />
                          <span className="text-sm">Score</span>
                        </div>
                        <p
                          className={cn(
                            'mt-1 text-lg font-bold',
                            selectedSubmission.final_score >= 90
                              ? 'text-success'
                              : selectedSubmission.final_score >= 70
                              ? 'text-warning'
                              : 'text-destructive'
                          )}
                        >
                          {selectedSubmission.final_score.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Code */}
                <div>
                  <h3 className="mb-2 font-semibold text-foreground">Submitted Code</h3>
                  <div className="rounded-lg border border-border bg-[#0d1117] p-4 overflow-x-auto">
                    <pre className="font-mono text-sm text-gray-300">
                      {selectedSubmission.code}
                    </pre>
                  </div>
                </div>

                {/* AI Evaluation */}
                {selectedSubmission.ai_evaluation && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-foreground">AI Evaluation Summary</h3>
                    </div>
                    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                      <div>
                        <span className="text-sm font-medium text-foreground">Code Quality</span>
                        <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div 
                            className="h-full bg-success rounded-full" 
                            style={{ width: `${(selectedSubmission.ai_evaluation.code_quality_score || 0) * 10}%` }}
                          />
                        </div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">Logical Clarity</span>
                        <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${(selectedSubmission.ai_evaluation.logical_clarity_score || 0) * 10}%` }}
                          />
                        </div>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                          <strong>Time:</strong> {selectedSubmission.ai_evaluation.time_complexity} | 
                          <strong> Space:</strong> {selectedSubmission.ai_evaluation.space_complexity}
                        </p>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Submissions;
