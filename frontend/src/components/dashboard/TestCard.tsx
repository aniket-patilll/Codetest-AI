import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, Code, Users, Eye, Settings, BarChart3, Share2, Check, MoreVertical, StopCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getJoinUrl, updateTest, deleteTest } from '@/lib/api';
import { toast } from '@/hooks/use-toast';

interface TestCardProps {
  test: {
    id: string;
    name: string;
    duration: number;
    languages: string[];
    status: 'draft' | 'active' | 'completed';
    participants: number;
    createdAt: string;
    questions: number;
    join_code?: string;
  };
  onRefresh?: () => void;
}

const statusConfig = {
  draft: { label: 'Draft', variant: 'secondary' as const },
  active: { label: 'Active', variant: 'default' as const },
  completed: { label: 'Completed', variant: 'outline' as const },
};

export const TestCard: React.FC<TestCardProps> = ({ test, onRefresh }) => {
  const [copied, setCopied] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const status = statusConfig[test.status];

  const handleShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (test.join_code) {
      navigator.clipboard.writeText(getJoinUrl(test.join_code));
      setCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Share this link with your students to join the test.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleEndTest = async () => {
    setIsEnding(true);
    try {
      await updateTest(test.id, { status: 'completed' });
      toast({
        title: 'Test ended',
        description: 'The test has been marked as completed. No new students can join.',
      });
      onRefresh?.();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to end test. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsEnding(false);
    }
  };

  const handleDeleteTest = async () => {
    setIsDeleting(true);
    try {
      await deleteTest(test.id);
      toast({
        title: 'Test deleted',
        description: 'The test has been permanently deleted.',
      });
      onRefresh?.();
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete test. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{test.name}" and all its questions, submissions, and participant data.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTest}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete Test'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {test.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {test.questions} questions
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={status.variant}
              className={cn(
                test.status === 'active' && 'bg-success/20 text-success border-success/30'
              )}
            >
              {status.label}
            </Badge>
            
            {/* Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to={`/host/tests/${test.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to={`/host/tests/${test.id}/manage`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage
                  </Link>
                </DropdownMenuItem>
                {test.status !== 'completed' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleEndTest}
                      disabled={isEnding}
                      className="text-warning"
                    >
                      <StopCircle className="mr-2 h-4 w-4" />
                      {isEnding ? 'Ending...' : 'End Test'}
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Test
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{test.duration} min</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4" />
            <span>{test.participants} participants</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Code className="h-4 w-4" />
            <span>{test.languages.join(', ')}</span>
          </div>
        </div>

        <div className="mt-4 flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" asChild>
            <Link to={`/host/tests/${test.id}`}>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              View
            </Link>
          </Button>
          {test.join_code && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleShare}
              className={cn(copied && 'border-success text-success')}
            >
              {copied ? (
                <Check className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Share2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              {copied ? 'Copied!' : 'Share'}
            </Button>
          )}
          {test.status !== 'draft' && (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/host/tests/${test.id}/results`}>
                <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                Results
              </Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
};
