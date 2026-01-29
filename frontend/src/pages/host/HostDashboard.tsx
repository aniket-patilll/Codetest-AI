import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '@/components/dashboard/StatCard';
import { TestCard } from '@/components/dashboard/TestCard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { getHostTests, getHostStats, Test } from '@/lib/api';
import { FileText, Users, PlayCircle, Plus, Loader2 } from 'lucide-react';

const HostDashboard: React.FC = () => {
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [stats, setStats] = useState({ total_tests: 0, active_tests: 0, total_participants: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [testsData, statsData] = await Promise.all([
        getHostTests(),
        getHostStats(),
      ]);
      setTests(testsData);
      setStats(statsData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back, {user?.name?.split(' ')[0] || 'Host'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here's an overview of your coding tests
          </p>
        </div>
        <Button asChild className="glow-primary">
          <Link to="/host/tests/create">
            <Plus className="mr-2 h-4 w-4" />
            Create New Test
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Tests"
          value={stats.total_tests}
          description="All time"
          icon={FileText}
        />
        <StatCard
          title="Active Tests"
          value={stats.active_tests}
          description="Currently running"
          icon={PlayCircle}
        />
        <StatCard
          title="Total Participants"
          value={stats.total_participants}
          description="Across all tests"
          icon={Users}
        />
      </div>

      {/* Recent Tests */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Your Tests</h2>
          {tests.length > 6 && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/host/tests">View all</Link>
            </Button>
          )}
        </div>
        {tests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No tests yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first coding test to get started
            </p>
            <Button className="mt-4" asChild>
              <Link to="/host/tests/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Test
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tests.slice(0, 6).map((test) => (
              <TestCard 
                key={test.id} 
                test={{
                  id: test.id,
                  name: test.name,
                  duration: test.duration_minutes,
                  languages: test.languages,
                  status: test.status === 'scheduled' ? 'draft' : test.status,
                  participants: test.participants_count || 0,
                  createdAt: new Date(test.created_at).toLocaleDateString(),
                  questions: test.questions_count || 0,
                  join_code: test.join_code,
                }} 
                onRefresh={fetchData}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HostDashboard;
