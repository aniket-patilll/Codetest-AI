import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Terminal, GraduationCap } from 'lucide-react';

const Signup: React.FC = () => {
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');

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
            <CardTitle className="text-2xl font-bold">Create an Account</CardTitle>
            <CardDescription className="mt-1">Choose your account type to get started</CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Host Signup Option */}
          <Link 
            to={redirect ? `/signup/host?redirect=${redirect}` : '/signup/host'}
            className="block"
          >
            <Button 
              variant="outline" 
              className="w-full h-auto py-6 flex flex-col items-center gap-2 hover:bg-primary/5 hover:border-primary transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Terminal className="h-6 w-6 text-primary" />
              </div>
              <div className="text-center">
                <div className="font-semibold">Sign up as Host</div>
                <div className="text-xs text-muted-foreground">Create and manage coding tests</div>
              </div>
            </Button>
          </Link>

          {/* Student Signup Option */}
          <Link 
            to={redirect ? `/signup/student?redirect=${redirect}` : '/signup/student'}
            className="block"
          >
            <Button 
              variant="outline" 
              className="w-full h-auto py-6 flex flex-col items-center gap-2 hover:bg-blue-500/5 hover:border-blue-500 transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                <GraduationCap className="h-6 w-6 text-blue-500" />
              </div>
              <div className="text-center">
                <div className="font-semibold">Sign up as Student</div>
                <div className="text-xs text-muted-foreground">Take coding tests and view results</div>
              </div>
            </Button>
          </Link>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
