import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  createTest, 
  updateTest, 
  getTest, 
  getQuestions, 
  getTestcases, 
  getParticipants,
  createQuestion, 
  createTestcase, 
  updateQuestion,
  deleteQuestion,
  deleteTestcase,
  getJoinUrl, 
  generateQuestion,
  Test,
  Participant 
} from '@/lib/api';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  Copy,
  Check,
  Link,
  Share2,
  Users,
  Settings,
  ListChecks,
  Code,
  Sparkles,
  Eye,
  EyeOff,
  ChevronRight,
  MonitorPlay,
  Clock,
  Lock,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface QuestionForm {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
  testcases: {
    id: string;
    input: string;
    expected_output: string;
    is_hidden: boolean;
  }[];
  isNew?: boolean;
}

const TestCreation: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');
  
  const [test, setTest] = useState<Test | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  
  const [formData, setFormData] = useState({
    name: '',
    duration_minutes: 60,
    languages: ['python'] as string[],
    password: '' as string,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [questions, setQuestions] = useState<QuestionForm[]>([]);
  
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiTestcaseCount, setAiTestcaseCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const testData = await getTest(id);
        setTest(testData);
        setFormData({
          name: testData.name,
          duration_minutes: testData.duration_minutes,
          languages: testData.languages,
          password: testData.password || '',
        });

        const questionsData = await getQuestions(id);
        const questionsWithTestcases = await Promise.all(
          questionsData.map(async (q) => {
            const testcases = await getTestcases(q.id);
            return {
              id: q.id,
              title: q.title,
              description: q.description,
              difficulty: q.difficulty,
              points: q.points,
              testcases: testcases.map(tc => ({
                id: tc.id,
                input: tc.input,
                expected_output: tc.expected_output,
                is_hidden: tc.is_hidden
              })),
              isNew: false
            };
          })
        );
        setQuestions(questionsWithTestcases);

        const participantsData = await getParticipants(id);
        setParticipants(participantsData);

      } catch (err) {
        console.error('Failed to load test:', err);
        toast.error('Failed to load test details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: crypto.randomUUID(),
        title: '',
        description: '',
        difficulty: 'medium',
        points: 100,
        testcases: [{ id: crypto.randomUUID(), input: '', expected_output: '', is_hidden: false }],
        isNew: true
      },
    ]);
  };

  const updateQuestionItem = (index: number, updates: Partial<QuestionForm>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    setQuestions(updated);
  };

  const removeQuestionItem = async (index: number) => {
    const q = questions[index];
    if (!q.isNew && id) {
       try {
         await deleteQuestion(q.id);
       } catch (e) {
         toast.error("Failed to delete question");
         return;
       }
    }
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const addTestcase = (questionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].testcases.push({
      id: crypto.randomUUID(),
      input: '',
      expected_output: '',
      is_hidden: false,
    });
    setQuestions(updated);
  };

  const updateTestcaseItem = (questionIndex: number, testcaseIndex: number, updates: Partial<QuestionForm['testcases'][0]>) => {
    const updated = [...questions];
    updated[questionIndex].testcases[testcaseIndex] = { ...updated[questionIndex].testcases[testcaseIndex], ...updates };
    setQuestions(updated);
  };

  const removeTestcaseItem = async (questionIndex: number, testcaseIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].testcases = updated[questionIndex].testcases.filter((_, i) => i !== testcaseIndex);
    setQuestions(updated);
  };

  const handleSave = async (status: 'draft' | 'active') => {
    if (!formData.name.trim()) {
      toast.error('Please enter a test name');
      return;
    }
    setIsSaving(true);
    try {
      let currentTest = test;
      const testPayload = {
          name: formData.name,
          duration_minutes: formData.duration_minutes,
          languages: formData.languages,
          password: formData.password || null,
          status,
      };

      if (isEditMode && id) {
        currentTest = await updateTest(id, testPayload);
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          let qId = q.id;
          if (q.isNew) {
            const newQ = await createQuestion({
              test_id: id,
              title: q.title || `Question ${i + 1}`,
              description: q.description || 'No description',
              difficulty: q.difficulty,
              points: q.points,
              order_index: i,
            });
            qId = newQ.id;
          } else {
            await updateQuestion(q.id, {
               title: q.title,
               description: q.description,
               difficulty: q.difficulty,
               points: q.points,
               order_index: i
            });
          }
           
          const existingTCs = await getTestcases(qId);
          for(const oldTc of existingTCs) await deleteTestcase(oldTc.id);
          for (let j = 0; j < q.testcases.length; j++) {
             const tc = q.testcases[j];
             await createTestcase({
               question_id: qId,
               input: tc.input,
               expected_output: tc.expected_output,
               is_hidden: tc.is_hidden,
               order_index: j
             });
          }
        }
      } else {
        currentTest = await createTest(testPayload);
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          const question = await createQuestion({
            test_id: currentTest.id,
            title: q.title || `Question ${i + 1}`,
            description: q.description || 'No description',
            difficulty: q.difficulty,
            points: q.points,
            order_index: i,
          });
          for (let j = 0; j < q.testcases.length; j++) {
            const tc = q.testcases[j];
            await createTestcase({
              question_id: question.id,
              input: tc.input,
              expected_output: tc.expected_output,
              is_hidden: tc.is_hidden,
              order_index: j,
            });
          }
        }
      }
      setTest(currentTest);
      setShowSuccessDialog(true);
      toast.success(status === 'active' ? 'Test published successfully' : 'Test saved');
    } catch (error) {
      console.error('Failed to save test:', error);
      toast.error('Failed to save test');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateQuestion = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Please enter a topic or description");
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateQuestion(aiPrompt, aiDifficulty, aiTestcaseCount);
      setQuestions([
        ...questions,
        {
          id: crypto.randomUUID(),
          title: result.title,
          description: result.description + (result.code_snippets ? `\n\n<!--JSON_SNIPPETS:${JSON.stringify(result.code_snippets)}-->` : ''),
          difficulty: result.difficulty,
          points: 100,
          testcases: result.testcases.map(tc => ({
             id: crypto.randomUUID(),
             input: tc.input,
             expected_output: tc.expected_output,
             is_hidden: false
          })),
          isNew: true
        }
      ]);
      setShowAIDialog(false);
      setAiPrompt('');
      toast.success("Question generated successfully!");
    } catch (err) {
      console.error("AI Generation failed:", err);
      toast.error("Failed to generate question. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyLink = () => {
    if (test?.join_code) {
      navigator.clipboard.writeText(getJoinUrl(test.join_code));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success('Link copied to clipboard');
    }
  };

  const handleCopyCode = () => {
    if (test?.join_code) {
      navigator.clipboard.writeText(test.join_code);
      toast.success('Join code copied');
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0a] text-zinc-100">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-zinc-100 p-3 md:p-1 space-y-8 animate-in fade-in duration-500">
      
      {/* Premium Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-8 border-b border-white/5 relative">
        <div className="space-y-4 relative z-10">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-zinc-500 hover:text-emerald-400 p-0 h-auto hover:bg-transparent transition-colors group">
             <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </Button>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white/90">
               {isEditMode ? 'Manage Assessment' : 'Create Assessment'}
            </h1>
            <p className="text-zinc-400 mt-2 max-w-xl text-lg font-light leading-relaxed">
                {isEditMode ? `Refine the details and challenges for "${test?.name}".` : 'Design a world-class coding evaluation for your candidates.'}
            </p>
          </div>
        </div>
        
        {isEditMode && (
          <div className="flex gap-4">
             <Button 
               variant="outline"
               className="border-white/10 bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm transition-all"
               onClick={handleCopyLink}
             >
               <Share2 className="mr-2 h-4 w-4" />
               Share Link
             </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="settings" value={activeTab} onValueChange={setActiveTab} className="space-y-8">
        <div className="flex items-center justify-center">
           <TabsList className="bg-zinc-900/50 border border-white/10 p-1.5 h-auto rounded-full backdrop-blur-md">
             {[
               { id: 'settings', label: 'Configuration', icon: Settings },
               { id: 'questions', label: `Challenges (${questions.length})`, icon: ListChecks },
               ...(isEditMode ? [{ id: 'participants', label: `Candidates (${participants.length})`, icon: Users }] : [])
             ].map(tab => (
               <TabsTrigger 
                 key={tab.id}
                 value={tab.id} 
                 className="rounded-full px-6 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25 transition-all duration-300"
               >
                 <tab.icon className="h-4 w-4 mr-2" />
                 {tab.label}
               </TabsTrigger>
             ))}
           </TabsList>
        </div>

        <TabsContent value="settings" className="max-w-4xl mx-auto animate-in slide-in-from-bottom-4 duration-500 fade-in">
          <div className="glass-panel p-8 rounded-2xl space-y-8 shadow-2xl shadow-black/50">
             <div className="space-y-6">
                <div className="space-y-3">
                   <Label className="text-zinc-300 text-sm uppercase tracking-wider font-semibold">Assessment Title</Label>
                   <div className="relative group">
                     <MonitorPlay className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                     <Input
                       placeholder="e.g. Software Engineer Assessment"
                       value={formData.name}
                       onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                       className="pl-12 bg-black/40 border-white/10 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500/50  h-14 text-lg rounded-xl transition-all"
                     />
                   </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-3">
                      <Label className="text-zinc-300 text-sm uppercase tracking-wider font-semibold">Duration (Minutes)</Label>
                      <div className="relative group">
                        <Clock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                        <Input
                          type="number"
                          min={15}
                          max={240}
                          value={formData.duration_minutes || ''}
                          onChange={(e) => {
                             const val = e.target.value;
                             setFormData({ ...formData, duration_minutes: val === '' ? ('' as any) : parseInt(val) });
                          }}
                          className="pl-12 bg-black/40 border-white/10 text-white focus-visible:ring-emerald-500/50 h-14 text-lg rounded-xl"
                        />
                      </div>
                   </div>
                   <div className="space-y-3">
                      <Label className="text-zinc-300 text-sm uppercase tracking-wider font-semibold">Access Control</Label>
                      <div className="relative group">
                         <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-500 group-focus-within:text-emerald-500 transition-colors" />
                         <Input
                           type={showPassword ? 'text' : 'password'}
                           placeholder="Public Access (No Password)"
                           value={formData.password}
                           onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                           className="pl-12 pr-12 bg-black/40 border-white/10 text-white focus-visible:ring-emerald-500/50 h-14 text-lg rounded-xl"
                         />
                         <button
                           type="button"
                           className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                           onClick={() => setShowPassword(!showPassword)}
                         >
                           {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                         </button>
                      </div>
                   </div>
                </div>
             </div>
             
             <div className="pt-6 border-t border-white/5 flex justify-end">
                <Button 
                   className="bg-emerald-600 hover:bg-emerald-500 text-white h-12 px-8 rounded-full shadow-lg shadow-emerald-900/20 text-md font-medium transition-all hover:scale-105 active:scale-95" 
                   onClick={() => setActiveTab('questions')}
                >
                  Configure Challenges <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
             </div>
          </div>
        </TabsContent>

        <TabsContent value="questions" className="space-y-8 max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-500 fade-in">
          <div className="flex flex-col sm:flex-row justify-between items-end gap-4 bg-gradient-to-r from-zinc-900 via-zinc-900 to-black p-6 rounded-2xl border border-white/5 shadow-xl">
             <div>
                <h3 className="text-xl font-bold text-white mb-2">Coding Challenges</h3>
                <p className="text-zinc-400">Curate a set of problems to test candidate skills.</p>
             </div>
             <div className="flex gap-3">
                <Button 
                   variant="outline" 
                   className="border-indigo-500/30 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/20 hover:text-indigo-300 transition-all hover:border-indigo-500/50"
                   onClick={() => setShowAIDialog(true)}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  AI Generate
                </Button>
                <Button onClick={addQuestion} className="bg-white text-black hover:bg-zinc-200 transition-colors font-semibold">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Manually
                </Button>
             </div>
          </div>

          <div className="space-y-6">
             {questions.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-24 px-4 text-center border border-dashed border-white/10 rounded-3xl bg-white/5 backdrop-blur-sm">
                 <div className="bg-black/40 p-5 rounded-full mb-6 ring-1 ring-white/10">
                    <Code className="h-10 w-10 text-zinc-500" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-2">Start Adding Challenges</h3>
                 <p className="text-zinc-400 mb-8 max-w-md mx-auto">Build your assessment by adding manual questions or using our AI to generate problems instantly.</p>
                 <div className="flex gap-4">
                    <Button className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20" onClick={() => setShowAIDialog(true)}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate with AI
                    </Button>
                    <Button variant="outline" className="border-white/10 bg-black/20 hover:bg-black/40 text-zinc-300" onClick={addQuestion}>
                      <Plus className="mr-2 h-4 w-4" />
                      Manual Entry
                    </Button>
                 </div>
               </div>
             ) : (
               questions.map((question, qIndex) => (
                 <div key={question.id} className="group rounded-2xl border border-white/5 bg-[#121212] overflow-hidden transition-all hover:border-white/10 hover:shadow-2xl hover:shadow-black/50">
                    <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white/[0.02]">
                       <div className="flex items-center gap-4 w-full">
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-sm font-bold text-emerald-500 border border-emerald-500/20 shadow-inner">
                             {qIndex + 1}
                          </span>
                          <Input 
                             value={question.title}
                             onChange={(e) => updateQuestionItem(qIndex, { title: e.target.value })}
                             placeholder="Challenge Title"
                             className="h-10 bg-transparent border-transparent text-xl font-bold text-white placeholder:text-zinc-600 focus-visible:ring-0 focus-visible:border-white/10 px-0 w-full hover:bg-white/5 transition-colors rounded-lg px-2"
                          />
                       </div>
                       <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg shrink-0"
                          onClick={() => removeQuestionItem(qIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <div className="p-6 md:p-8 space-y-8">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-3">
                             <Label className="text-zinc-500 text-xs uppercase tracking-widest font-bold ml-1">Difficulty Level</Label>
                             <div className="relative">
                               <select
                                  className="w-full h-12 rounded-xl border border-white/10 bg-black/40 px-4 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none hover:bg-black/60 transition-colors"
                                  value={question.difficulty}
                                  onChange={(e) =>
                                    updateQuestionItem(qIndex, { difficulty: e.target.value as 'easy' | 'medium' | 'hard' })
                                  }
                                >
                                  <option value="easy">Easy (Beginner)</option>
                                  <option value="medium">Medium (Intermediate)</option>
                                  <option value="hard">Hard (Advanced)</option>
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                   <div className={`h-2.5 w-2.5 rounded-full ${
                                      question.difficulty === 'easy' ? 'bg-green-500' : 
                                      question.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                                   } shadow-[0_0_10px_currentColor]`} />
                                </div>
                             </div>
                          </div>
                          <div className="space-y-3">
                             <Label className="text-zinc-500 text-xs uppercase tracking-widest font-bold ml-1">Score Points</Label>
                             <Input 
                                type="number"
                                value={question.points}
                                onChange={(e) => updateQuestionItem(qIndex, { points: parseInt(e.target.value) || 0 })}
                                className="h-12 bg-black/40 border-white/10 text-zinc-200 rounded-xl focus-visible:ring-emerald-500/50 hover:bg-black/60 transition-colors"
                             />
                          </div>
                       </div>
                       
                       <div className="space-y-3">
                          <Label className="text-zinc-500 text-xs uppercase tracking-widest font-bold ml-1">Problem Description</Label>
                          <Textarea
                             className="min-h-[160px] bg-black/40 border-white/10 text-zinc-300 resize-y font-mono text-sm leading-relaxed rounded-xl focus-visible:ring-emerald-500/50 p-4 hover:bg-black/60 transition-colors"
                             placeholder="Write the problem statement using Markdown..."
                             value={question.description}
                             onChange={(e) => updateQuestionItem(qIndex, { description: e.target.value })}
                          />
                       </div>
                       
                       <div className="space-y-4 pt-6 border-t border-white/5">
                          <div className="flex items-center justify-between">
                             <Label className="text-zinc-400 text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                                Test Cases <Badge className="bg-white/10 hover:bg-white/20 text-white border-0">{question.testcases.length}</Badge>
                             </Label>
                             <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg"
                                onClick={() => addTestcase(qIndex)}
                              >
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                Add Test Case
                              </Button>
                          </div>
                          
                          <div className="grid gap-4">
                             {question.testcases.map((tc, tcIndex) => (
                                <div key={tc.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-start bg-black/30 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                                   <div className="space-y-1.5">
                                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold pl-1">Input</span>
                                      <Input
                                         placeholder="e.g. [1, 2, 3]"
                                         value={tc.input}
                                         onChange={(e) => updateTestcaseItem(qIndex, tcIndex, { input: e.target.value })}
                                         className="font-mono text-xs bg-black/50 border-white/10 text-zinc-300 h-10 rounded-lg focus-visible:ring-emerald-500/30"
                                      />
                                   </div>
                                    <div className="space-y-1.5">
                                      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold pl-1">Expected Output</span>
                                      <Input
                                         placeholder="e.g. 6"
                                         value={tc.expected_output}
                                         onChange={(e) => updateTestcaseItem(qIndex, tcIndex, { expected_output: e.target.value })}
                                         className="font-mono text-xs bg-black/50 border-white/10 text-zinc-300 h-10 rounded-lg focus-visible:ring-emerald-500/30"
                                      />
                                   </div>
                                   <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-10 w-10 md:mt-6 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                      onClick={() => removeTestcaseItem(qIndex, tcIndex)}
                                      disabled={question.testcases.length === 1}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 </div>
               ))
             )}
          </div>
          
          <div className="flex justify-end gap-3 sticky bottom-6 z-10 pt-4 pointer-events-none">
             <div className="bg-[#1c1c1c]/90 border border-white/10 p-2.5 rounded-2xl flex gap-3 backdrop-blur-xl shadow-2xl pointer-events-auto">
               <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5 rounded-xl px-4" onClick={() => handleSave('draft')} disabled={isSaving}>
                 {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                 Save Draft
               </Button>
               <Button className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 rounded-xl px-6 font-semibold tracking-wide" onClick={() => handleSave('active')} disabled={isSaving}>
                 {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                 {isEditMode ? 'Update & Publish' : 'Publish Test'}
               </Button>
             </div>
          </div>
        </TabsContent>

        {isEditMode && (
          <TabsContent value="participants" className="space-y-8 max-w-5xl mx-auto animate-in slide-in-from-bottom-4 duration-500 fade-in">
             <div className="bg-gradient-to-r from-indigo-900/20 to-purple-900/20 p-6 rounded-2xl border border-indigo-500/20 shadow-lg">
                <h3 className="text-xl font-bold text-white mb-1">Active Candidates</h3>
                <p className="text-indigo-200/60">Monitor progress and status of invited students.</p>
             </div>
             
             {participants.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/10 rounded-3xl bg-white/5">
                   <Users className="h-12 w-12 mb-4 opacity-20 text-white" />
                   <p className="font-semibold text-zinc-300 text-lg">No candidates registered</p>
                   <p className="text-zinc-500">Share your test link to get started.</p>
                </div>
             ) : (
                <div className="grid gap-4">
                   {participants.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-5 rounded-2xl border border-white/5 bg-[#121212] hover:bg-white/5 transition-colors group">
                         <div className="flex items-center gap-5">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[1px] shadow-lg shadow-indigo-500/20">
                               <div className="h-full w-full rounded-full bg-black flex items-center justify-center">
                                 <span className="text-indigo-400 font-bold text-lg">
                                    {(Array.isArray(p.user) ? p.user[0] : p.user)?.full_name?.charAt(0) || 'U'}
                                 </span>
                               </div>
                            </div>
                            <div>
                               <div className="font-bold text-white text-lg group-hover:text-indigo-400 transition-colors">{(Array.isArray(p.user) ? p.user[0] : p.user)?.full_name || 'Unknown User'}</div>
                               <div className="text-sm text-zinc-500">{(Array.isArray(p.user) ? p.user[0] : p.user)?.email}</div>
                            </div>
                         </div>
                         <div className="flex flex-col items-end gap-2">
                            <Badge variant="secondary" className={cn(
                               "px-3 py-1 text-xs font-semibold tracking-wide border-0 uppercase",
                               p.status === 'submitted' ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20' :
                               p.status === 'started' ? 'bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20' :
                               'bg-zinc-800 text-zinc-400'
                            )}>
                               {p.status}
                            </Badge>
                            <div className="text-xs text-zinc-600 font-mono">
                               Joined: {new Date(p.joined_at).toLocaleDateString()}
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </TabsContent>
        )}
      </Tabs>

      {/* AI Dialog - Premium Style */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="sm:max-w-lg bg-[#0f0f0f] border-zinc-800 text-zinc-100 shadow-2xl shadow-indigo-900/20">
          <DialogHeader className="pb-4 border-b border-white/5">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
              <Sparkles className="h-6 w-6 text-indigo-400" />
              AI Challenge Generator
            </DialogTitle>
            <DialogDescription className="text-zinc-400 text-base">
              Harness the power of Groq to instantly create coding problems (free tier).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-3">
              <Label className="text-zinc-300 font-semibold">What kind of problem?</Label>
              <Textarea 
                placeholder="e.g. Design a system to track real-time stock prices..." 
                className="min-h-[120px] bg-black/50 border-white/10 text-zinc-200 resize-none focus-visible:ring-indigo-500/50 rounded-xl p-4 text-base"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-3">
                 <Label className="text-zinc-300 font-semibold">Difficulty</Label>
                 <div className="relative">
                    <select
                      className="w-full h-12 rounded-xl border border-white/10 bg-black/50 px-4 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none"
                      value={aiDifficulty}
                      onChange={(e) => setAiDifficulty(e.target.value)}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                       <ChevronRight className="h-4 w-4 rotate-90" />
                    </div>
                 </div>
               </div>
               <div className="space-y-3">
                 <Label className="text-zinc-300 font-semibold">Test Cases</Label>
                 <Input
                   type="number"
                   min={3}
                   max={10}
                   value={aiTestcaseCount || ''}
                   onChange={(e) => {
                      const val = e.target.value;
                      setAiTestcaseCount(val === '' ? ('' as any) : parseInt(val));
                   }}
                   className="h-12 bg-black/50 border-white/10 text-zinc-200 focus-visible:ring-indigo-500/50 rounded-xl"
                 />
               </div>
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="ghost" onClick={() => setShowAIDialog(false)} disabled={isGenerating} className="text-zinc-400 hover:text-white rounded-xl h-11">Cancel</Button>
            <Button 
               className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-11 px-6 shadow-lg shadow-indigo-600/25 font-semibold" 
               onClick={handleGenerateQuestion} 
               disabled={isGenerating || !aiPrompt.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Logic...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Challenge
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog - Premium Style */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md bg-[#0f0f0f] border-zinc-800 text-zinc-100 shadow-2xl shadow-emerald-900/20">
          <DialogHeader className="pb-4 border-b border-white/5">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-white">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                 <Check className="h-5 w-5 text-emerald-500" />
              </div>
              {isEditMode ? 'Assessment Updated' : 'Assessment Live!'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400 mt-2">
              Your coding test is ready for candidates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-6">
            <div className="space-y-3">
              <Label className="text-zinc-400 text-xs uppercase tracking-widest font-bold">
                 Direct Join Link
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                   <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                   <Input
                     readOnly
                     value={test?.join_code ? getJoinUrl(test.join_code) : ''}
                     className="pl-10 font-mono text-sm bg-black/50 border-zinc-800 text-zinc-300 h-10 rounded-lg selection:bg-emerald-900/50"
                   />
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyLink} className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg h-10 w-10 shrink-0">
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-zinc-400 text-xs uppercase tracking-widest font-bold">
                 Unique Access Code
              </Label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-xl border border-dashed border-zinc-700 bg-black/30 p-5 text-center relative group">
                  <div className="absolute inset-0 bg-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
                  <span className="font-mono text-4xl font-black tracking-[0.2em] text-white relative z-10 selection:bg-emerald-500/30">
                    {test?.join_code || '--------'}
                  </span>
                </div>
                <Button variant="outline" size="icon" onClick={handleCopyCode} className="h-auto border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl w-14 shrink-0 transition-all">
                  <Copy className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1 h-11 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl" onClick={() => navigate('/host')}>
                Done
              </Button>
              {!isEditMode && (
                <Button className="flex-1 h-11 bg-white text-black hover:bg-zinc-200 rounded-xl font-semibold" onClick={() => {
                   setShowSuccessDialog(false);
                   setTest(null);
                   setQuestions([]);
                   setFormData({ name: '', duration_minutes: 60, languages: ['python'], password: '' });
                }}>
                  Create Another
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestCreation;
