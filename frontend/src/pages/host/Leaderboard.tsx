import React, { useState, useEffect } from 'react';
import { getHostTests, getLeaderboard, Test, LeaderboardEntry } from '@/lib/api';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Medal, Clock, RefreshCw, Crown, Search, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const Leaderboard = () => {
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Fetch leaderboard when test changes
  const fetchLeaderboard = async (showLoading = true) => {
    if (!selectedTestId) return;

    try {
      if (showLoading) setIsLoading(true);
      else setIsRefreshing(true);

      const response = await getLeaderboard(selectedTestId);
      setLeaderboard(response.entries);
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedTestId]);

  const filteredData = leaderboard.filter(entry => 
    entry.student_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500 fill-yellow-500/20" />;
      case 2:
        return <Medal className="h-6 w-6 text-zinc-300 fill-zinc-300/20" />;
      case 3:
        return <Medal className="h-6 w-6 text-amber-600 fill-amber-600/20" />;
      default:
        return <span className="font-mono text-zinc-500 font-bold">#{rank}</span>;
    }
  };

  const getRowStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-yellow-500/5 border-yellow-500/20 hover:bg-yellow-500/10";
      case 2:
        return "bg-zinc-300/5 border-zinc-300/20 hover:bg-zinc-300/10";
      case 3:
        return "bg-amber-600/5 border-amber-600/20 hover:bg-amber-600/10";
      default:
        return "hover:bg-zinc-800/50 border-zinc-800";
    }
  };

  if (isLoading && !selectedTestId) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-zinc-100">
        <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-zinc-100 p-6 md:p-10 space-y-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white glow-text flex items-center gap-3">
             <Trophy className="h-8 w-8 text-yellow-500" />
             Leaderboard
          </h1>
          <p className="text-zinc-400">Top performers representing excellence in coding.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedTestId} onValueChange={setSelectedTestId}>
            <SelectTrigger className="w-[250px] bg-zinc-900 border-zinc-800 text-zinc-200">
              <SelectValue placeholder="Select Assessment" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800">
              {tests.map((test) => (
                <SelectItem key={test.id} value={test.id} className="text-zinc-300 focus:bg-zinc-800 focus:text-white">
                  {test.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
             <Input 
                placeholder="Search student..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-200 w-full sm:w-[200px]"
             />
          </div>

          <Button 
            variant="outline" 
            className="border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800"
            onClick={() => fetchLeaderboard(false)}
            disabled={isRefreshing}
          >
             <RefreshCw className={cn("h-4 w-4 mr-2", isRefreshing && "animate-spin")} />
             Refresh
          </Button>
        </div>
      </div>

      {/* Top 3 Podium (Visual) */}
      {!isLoading && leaderboard.length > 0 && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-12 px-4 max-w-5xl mx-auto">
            {/* Rank 2 */}
            {leaderboard[1] && (
               <div className="order-2 md:order-1 flex flex-col items-center">
                  <div className="relative">
                     <div className="h-20 w-20 rounded-full border-4 border-zinc-400 bg-zinc-900 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(200,200,200,0.3)]">
                        <span className="text-2xl font-bold text-zinc-300">
                           {leaderboard[1].student_name.charAt(0)}
                        </span>
                     </div>
                     <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-zinc-400 text-zinc-900 font-bold px-2 py-0.5 rounded-full text-xs shadow-lg">#2</div>
                  </div>
                  <div className="mt-4 text-center p-4 bg-gradient-to-t from-zinc-900/80 to-zinc-900/0 rounded-xl w-full border border-zinc-800">
                     <div className="font-bold text-lg text-zinc-200 truncate max-w-[150px] mx-auto">{leaderboard[1].student_name}</div>
                     <div className="text-zinc-400 text-sm">{leaderboard[1].total_score.toFixed(0)} pts</div>
                  </div>
               </div>
            )}
            
            {/* Rank 1 */}
            {leaderboard[0] && (
               <div className="order-1 md:order-2 flex flex-col items-center z-10 -mt-6">
                  <div className="relative">
                     <Crown className="absolute -top-8 left-1/2 -translate-x-1/2 h-8 w-8 text-yellow-500 fill-yellow-500 animate-bounce" />
                     <div className="h-24 w-24 rounded-full border-4 border-yellow-500 bg-zinc-900 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(234,179,8,0.5)]">
                        <span className="text-3xl font-bold text-yellow-500">
                           {leaderboard[0].student_name.charAt(0)}
                        </span>
                     </div>
                     <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-yellow-950 font-bold px-3 py-0.5 rounded-full text-sm shadow-lg">#1</div>
                  </div>
                  <div className="mt-4 text-center p-6 bg-gradient-to-t from-yellow-900/20 to-zinc-900/0 rounded-xl w-full border border-yellow-500/20 shadow-lg shadow-yellow-900/10">
                     <div className="font-bold text-xl text-white truncate max-w-[180px] mx-auto">{leaderboard[0].student_name}</div>
                     <div className="text-yellow-500 font-bold text-lg">{leaderboard[0].total_score.toFixed(0)} pts</div>
                     <div className="text-xs text-zinc-500 mt-1 flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" /> {leaderboard[0].time_taken}
                     </div>
                  </div>
               </div>
            )}

            {/* Rank 3 */}
            {leaderboard[2] && (
               <div className="order-3 flex flex-col items-center">
                  <div className="relative">
                     <div className="h-20 w-20 rounded-full border-4 border-amber-700 bg-zinc-900 flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(180,83,9,0.3)]">
                        <span className="text-2xl font-bold text-amber-600">
                           {leaderboard[2].student_name.charAt(0)}
                        </span>
                     </div>
                     <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-amber-700 text-amber-100 font-bold px-2 py-0.5 rounded-full text-xs shadow-lg">#3</div>
                  </div>
                  <div className="mt-4 text-center p-4 bg-gradient-to-t from-zinc-900/80 to-zinc-900/0 rounded-xl w-full border border-zinc-800">
                     <div className="font-bold text-lg text-zinc-200 truncate max-w-[150px] mx-auto">{leaderboard[2].student_name}</div>
                     <div className="text-zinc-400 text-sm">{leaderboard[2].total_score.toFixed(0)} pts</div>
                  </div>
               </div>
            )}
         </div>
      )}

      {/* Leaderboard Table */}
      <Card className="bg-[#121212] border-zinc-800 shadow-xl overflow-hidden">
        <CardContent className="p-0">
           {!selectedTestId ? (
              <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
                 <Trophy className="h-16 w-16 mb-4 opacity-20" />
                 <p className="text-lg">Select an assessment to view rankings</p>
              </div>
           ) : isLoading ? (
              <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
                 <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
                 <p>Loading API data...</p>
              </div>
           ) : filteredData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
                 <Trophy className="h-16 w-16 mb-4 opacity-20" />
                 <p className="text-lg">No participants found</p>
              </div>
           ) : (
             <Table>
                <TableHeader className="bg-zinc-900/50">
                   <TableRow className="border-zinc-800 hover:bg-transparent">
                      <TableHead className="w-[80px] text-center font-bold text-zinc-400">Rank</TableHead>
                      <TableHead className="text-zinc-400 font-bold">Student</TableHead>
                      <TableHead className="text-right text-zinc-400 font-bold">Total Score</TableHead>
                      <TableHead className="text-center text-zinc-400 font-bold">Progress</TableHead>
                      <TableHead className="text-right text-zinc-400 font-bold">Time</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {filteredData.map((entry) => (
                      <TableRow 
                        key={entry.user_id} 
                        className={cn("transition-colors", getRowStyle(entry.rank))}
                      >
                         <TableCell className="text-center">
                            <div className="flex justify-center">
                               {getRankIcon(entry.rank)}
                            </div>
                         </TableCell>
                         <TableCell>
                            <div className="font-semibold text-zinc-200">{entry.student_name}</div>
                            {entry.rank <= 3 && (
                               <Badge variant="outline" className="border-0 bg-white/5 text-[10px] text-zinc-500 mt-1">
                                  Top Performer
                               </Badge>
                            )}
                         </TableCell>
                         <TableCell className="text-right">
                            <span className={cn(
                               "font-mono font-bold text-lg",
                               entry.total_score >= 90 ? "text-emerald-400" : "text-white"
                            )}>
                               {entry.total_score.toFixed(0)}
                            </span>
                         </TableCell>
                         <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                               <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                                  <div 
                                    className={cn(
                                       "h-full rounded-full",
                                       entry.testcases_passed === entry.total_testcases ? "bg-emerald-500" : "bg-blue-500"
                                    )} 
                                    style={{ width: `${(entry.testcases_passed / (entry.total_testcases || 1)) * 100}%` }} 
                                  />
                               </div>
                               <span className="text-[10px] text-zinc-500">
                                  {entry.testcases_passed}/{entry.total_testcases} Tests
                               </span>
                            </div>
                         </TableCell>
                         <TableCell className="text-right font-mono text-zinc-400">
                            {entry.time_taken}
                         </TableCell>
                      </TableRow>
                   ))}
                </TableBody>
             </Table>
           )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Leaderboard;
