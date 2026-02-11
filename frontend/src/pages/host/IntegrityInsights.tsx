import React, { useState, useEffect } from 'react';
import { getHostTests, getTestIntegritySummary, Test, IntegritySummary, RiskLevel } from '@/lib/api';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Shield, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle,
  ArrowLeftRight,
  Clipboard,
  Eye,
  MousePointer,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

const riskConfig: Record<RiskLevel, {
  label: string;
  icon: typeof CheckCircle;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  low: {
    label: 'Low Risk',
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
    borderColor: 'border-success/30',
  },
  medium: {
    label: 'Medium Risk',
    icon: AlertTriangle,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    borderColor: 'border-warning/30',
  },
  high: {
    label: 'High Risk',
    icon: AlertCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    borderColor: 'border-destructive/30',
  },
};

const IntegrityInsights: React.FC = () => {
  const [selectedTestId, setSelectedTestId] = useState<string>('');
  const [tests, setTests] = useState<Test[]>([]);
  const [integrityData, setIntegrityData] = useState<IntegritySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingIntegrity, setIsLoadingIntegrity] = useState(false);

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

  // Fetch integrity data when test changes
  useEffect(() => {
    if (!selectedTestId) return;

    const fetchIntegrity = async () => {
      setIsLoadingIntegrity(true);
      try {
        const data = await getTestIntegritySummary(selectedTestId);
        setIntegrityData(data);
      } catch (err) {
        console.error('Failed to fetch integrity data:', err);
        setIntegrityData([]);
      } finally {
        setIsLoadingIntegrity(false);
      }
    };
    fetchIntegrity();
  }, [selectedTestId]);

  const lowRisk = integrityData.filter((s) => s.risk_level === 'low').length;
  const mediumRisk = integrityData.filter((s) => s.risk_level === 'medium').length;
  const highRisk = integrityData.filter((s) => s.risk_level === 'high').length;

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Integrity Signals</h1>
          </div>
          <p className="mt-1 text-muted-foreground">
            Activity insights and behavioral patterns during tests
          </p>
        </div>
        <Select value={selectedTestId} onValueChange={setSelectedTestId}>
          <SelectTrigger className="w-[250px]">
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
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className={cn('border-success/30')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{lowRisk}</p>
                <p className="text-sm text-muted-foreground">Low Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn('border-warning/30')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-warning/10">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{mediumRisk}</p>
                <p className="text-sm text-muted-foreground">Medium Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={cn('border-destructive/30')}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground">{highRisk}</p>
                <p className="text-sm text-muted-foreground">High Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disclaimer */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Note:</span> These signals are behavioral
            indicators and should be reviewed in context. They are not definitive proof of
            misconduct and should be used as one of many factors in assessment.
          </p>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoadingIntegrity ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : integrityData.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
            <Shield className="h-12 w-12 mb-2 opacity-50" />
            <p>No integrity data for this test yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Student</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <ArrowLeftRight className="h-4 w-4" />
                    Tab Switches
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clipboard className="h-4 w-4" />
                    Copy/Paste
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Eye className="h-4 w-4" />
                    Window Blur
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <MousePointer className="h-4 w-4" />
                    Right Clicks
                  </div>
                </TableHead>
                <TableHead className="text-right">Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {integrityData.map((signal) => {
                const risk = riskConfig[signal.risk_level];
                const RiskIcon = risk.icon;

                return (
                  <TableRow key={signal.participant_id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {signal.student_name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="font-medium text-foreground">{signal.student_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'font-mono font-medium',
                          signal.events.tab_switches > 10
                            ? 'text-destructive'
                            : signal.events.tab_switches > 5
                            ? 'text-warning'
                            : 'text-muted-foreground'
                        )}
                      >
                        {signal.events.tab_switches}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'font-mono font-medium',
                          signal.events.copy_paste_attempts > 5
                            ? 'text-destructive'
                            : signal.events.copy_paste_attempts > 2
                            ? 'text-warning'
                            : 'text-muted-foreground'
                        )}
                      >
                        {signal.events.copy_paste_attempts}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'font-mono font-medium',
                          signal.events.window_blur_count > 10
                            ? 'text-destructive'
                            : signal.events.window_blur_count > 5
                            ? 'text-warning'
                            : 'text-muted-foreground'
                        )}
                      >
                        {signal.events.window_blur_count}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-mono font-medium text-muted-foreground">
                        {signal.events.right_clicks}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Badge
                          variant="outline"
                          className={cn(risk.bgColor, risk.color, risk.borderColor)}
                        >
                          <RiskIcon className="mr-1 h-3 w-3" />
                          {risk.label}
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default IntegrityInsights;
