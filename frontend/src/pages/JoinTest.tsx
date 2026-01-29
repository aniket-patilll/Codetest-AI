import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getTestByJoinCode, joinTest, Test } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Terminal, 
  Clock, 
  Code2, 
  Users, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';

const JoinTest: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [joinCode, setJoinCode] = useState(code || '');
  const [test, setTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(!!code);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  
  // Password state
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Look up test if code provided in URL
  useEffect(() => {
    if (code) {
      lookupTest(code);
    }
  }, [code]);

  const lookupTest = async (codeToLookup: string) => {
    setIsLoading(true);
    setError(null);
    setTest(null);

    try {
      const foundTest = await getTestByJoinCode(codeToLookup);
      if (foundTest) {
        setTest(foundTest);
      } else {
        setError('Test not found. Please check the code and try again.');
      }
    } catch (err) {
      setError('Failed to find test. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLookup = () => {
    if (joinCode.trim()) {
      lookupTest(joinCode.trim());
    }
  };

  const handleJoin = async () => {
    if (!test || !isAuthenticated) return;

    // Check password if test requires one
    if (test.password && password !== test.password) {
      setError('Incorrect password. Please try again.');
      return;
    }

    setIsJoining(true);
    setError(null);
    try {
      const result = await joinTest(test.id);
      if (result.success) {
        setJoined(true);
      } else {
        setError(result.error || 'Failed to join test');
      }
    } catch (err) {
      setError('Failed to join test. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-success';
      case 'scheduled':
        return 'text-warning';
      case 'completed':
        return 'text-muted-foreground';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Terminal className="h-6 w-6 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Join Test</CardTitle>
            <CardDescription className="mt-1">
              Enter the test code to join a coding assessment
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Success State */}
          {joined && test && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Successfully Joined!</h3>
                <p className="text-sm text-muted-foreground">
                  You're registered for "{test.name}"
                </p>
              </div>
              <Button className="w-full" onClick={() => navigate('/student')}>
                Go to Dashboard
              </Button>
            </div>
          )}

          {/* Join Form */}
          {!joined && (
            <>
              {/* Code Input */}
              {!test && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Test Code</Label>
                    <Input
                      id="code"
                      placeholder="Enter 8-character code"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                      className="text-center font-mono text-lg tracking-widest uppercase"
                      maxLength={8}
                    />
                  </div>
                  
                  {error && (
                    <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    onClick={handleLookup}
                    disabled={isLoading || joinCode.length < 4}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Looking up...
                      </>
                    ) : (
                      'Find Test'
                    )}
                  </Button>
                </div>
              )}

              {/* Test Preview */}
              {test && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{test.name}</h3>
                        <span className={`text-sm font-medium capitalize ${getStatusColor(test.status)}`}>
                          {test.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{test.duration_minutes} minutes</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Code2 className="h-4 w-4" />
                        <span>{test.languages.join(', ')}</span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  {!isAuthenticated ? (
                    <div className="space-y-3">
                      <p className="text-sm text-center text-muted-foreground">
                        Please login or sign up to join this test
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" asChild>
                          <Link to={`/login?redirect=/join/${test.join_code}`}>Login</Link>
                        </Button>
                        <Button className="flex-1" asChild>
                          <Link to={`/signup?redirect=/join/${test.join_code}`}>Sign Up</Link>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-center text-muted-foreground">
                        Joining as <strong>{user?.name}</strong>
                      </p>
                      
                      {/* Password input if test requires it */}
                      {test.password && (
                        <div className="space-y-2">
                          <Label htmlFor="password" className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Password Required
                          </Label>
                          <div className="relative">
                            <Input
                              id="password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Enter test password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                      )}

                      <Button 
                        className="w-full glow-primary" 
                        onClick={handleJoin}
                        disabled={isJoining || test.status === 'completed'}
                      >
                        {isJoining ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Joining...
                          </>
                        ) : test.status === 'completed' ? (
                          'Test has ended'
                        ) : (
                          'Join Test'
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="w-full" 
                        onClick={() => { setTest(null); setError(null); }}
                      >
                        Enter different code
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Footer */}
          {!joined && !test && (
            <div className="text-center text-sm text-muted-foreground">
              Already joined?{' '}
              <Link to="/student" className="font-medium text-primary hover:underline">
                Go to Dashboard
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinTest;
