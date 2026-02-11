import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentTests, StudentTest } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, CheckCircle, PlayCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig = {
  registered: {
    label: 'Not Started',
    icon: AlertCircle,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
  started: {
    label: 'In Progress',
    icon: Clock,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
  },
  submitted: {
    label: 'Test Completed',
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
};

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<StudentTest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const data = await getStudentTests();
        setTests(data);
      } catch (err) {
        console.error('Failed to fetch tests:', err);
        setError('Failed to load your tests');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTests();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome, {user?.name || 'Student'}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Ready to take on some coding challenges? Your tests are waiting below.
        </p>
      </div>

      {/* Tests List */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Your Tests</h2>
          <Button variant="outline" asChild>
             <Link to="/join">Join New Test</Link>
          </Button>
        </div>

        {tests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
            <PlayCircle className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No tests found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              You haven't joined any tests yet.
            </p>
            <Button className="mt-4 glow-primary" asChild>
              <Link to="/join">
                Join a Test
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {tests.map((participant) => {
              const status = statusConfig[participant.status as keyof typeof statusConfig] || statusConfig.registered;
              const StatusIcon = status.icon;

              return (
                <Card
                  key={participant.id}
                  className="overflow-hidden transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={cn(
                            'flex h-12 w-12 items-center justify-center rounded-lg',
                            status.bgColor
                          )}
                        >
                          <StatusIcon className={cn('h-6 w-6', status.color)} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{participant.test.name}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <Badge variant="secondary" className={cn(status.color)}>
                              {status.label}
                            </Badge>
                            <span>{participant.test.questions_count} questions</span>
                            <span>{participant.test.duration_minutes} mins</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {participant.status === 'registered' && (
                          <Button asChild className="glow-primary">
                            <Link to={`/test/${participant.test.id}`}>
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Start Test
                            </Link>
                          </Button>
                        )}
                        {participant.status === 'started' && (
                          <Button asChild variant="default" className="bg-warning hover:bg-warning/90">
                            <Link to={`/test/${participant.test.id}`}>
                              <Clock className="mr-2 h-4 w-4" />
                              Resume Test
                            </Link>
                          </Button>
                        )}
                        {participant.status === 'submitted' && (
                          <div className="flex gap-2 items-center">
                            {participant.test.status === 'completed' ? (
                              <>
                                <Button asChild variant="outline" className="border-success/20 hover:bg-success/5 text-success">
                                  <Link to={`/student/results/${participant.test.id}`}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    View Results
                                  </Link>
                                </Button>
                              </>
                            ) : (
                              <Badge variant="outline" className="h-9 px-4 text-muted-foreground border-dashed">
                                <Clock className="mr-2 h-3.5 w-3.5" />
                                Results Pending
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
