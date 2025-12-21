import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Flag, Clock, Eye, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { maskEmail } from "@/lib/emailMasking";

interface ContentReport {
  id: string;
  reporter_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ReportWithDetails extends ContentReport {
  reporter_profile?: { name: string; email: string };
  reviewer_profile?: { name: string } | null;
}

const reasonLabels: Record<string, string> = {
  inappropriate: "Inappropriate Content",
  spam: "Spam",
  harassment: "Harassment",
  misinformation: "Misinformation",
  other: "Other",
};

const statusLabels: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "Pending", icon: Clock, color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  reviewing: { label: "Reviewing", icon: Eye, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  resolved: { label: "Resolved", icon: CheckCircle, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
  dismissed: { label: "Dismissed", icon: XCircle, color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" },
};

export function ContentReportsManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<ReportWithDetails | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("pending");

  const { data: reports, isLoading } = useQuery({
    queryKey: ["content-reports", filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch reporter profiles
      const reporterIds = [...new Set(data?.map(r => r.reporter_id) || [])];
      const reviewerIds = [...new Set(data?.filter(r => r.reviewed_by).map(r => r.reviewed_by) || [])];
      const allUserIds = [...new Set([...reporterIds, ...reviewerIds])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email")
        .in("id", allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data?.map(report => ({
        ...report,
        reporter_profile: profileMap.get(report.reporter_id),
        reviewer_profile: report.reviewed_by ? profileMap.get(report.reviewed_by) : null,
      })) as ReportWithDetails[];
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ id, status, resolution_notes }: { id: string; status: string; resolution_notes?: string }) => {
      const { error } = await supabase
        .from("content_reports")
        .update({
          status,
          resolution_notes: resolution_notes || null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      // Send notification for community reports
      if (status === "resolved" || status === "dismissed") {
        try {
          await supabase.functions.invoke('notify-moderators', {
            body: {
              type: 'community_report',
              data: {
                reportType: `Report ${status}`,
                contentId: selectedReport?.content_id,
                reportedBy: selectedReport?.reporter_profile?.name || 'Unknown',
                reason: resolution_notes || `Report was ${status}`,
              }
            }
          });
        } catch (e) {
          console.error('Failed to send notification:', e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content-reports"] });
      toast.success("Report updated");
      setSelectedReport(null);
      setResolutionNotes("");
    },
    onError: () => {
      toast.error("Failed to update report");
    },
  });

  const handleUpdateStatus = (status: string) => {
    if (selectedReport) {
      updateReportMutation.mutate({
        id: selectedReport.id,
        status,
        resolution_notes: resolutionNotes,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusLabels[status] || statusLabels.pending;
    const Icon = config.icon;
    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      inappropriate: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
      spam: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
      harassment: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
      misinformation: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      other: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
    };
    return <Badge className={colors[reason] || colors.other}>{reasonLabels[reason] || reason}</Badge>;
  };

  const pendingCount = reports?.filter(r => r.status === "pending").length || 0;
  const reviewingCount = reports?.filter(r => r.status === "reviewing").length || 0;

  if (isLoading) {
    return <div className="text-center py-4">Loading reports...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{reports?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Total Reports</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
            <p className="text-sm text-muted-foreground">Pending Review</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{reviewingCount}</div>
            <p className="text-sm text-muted-foreground">Under Review</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Content Reports
        </h3>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="reviewing">Reviewing</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="dismissed">Dismissed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Content Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports?.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(report.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="capitalize">{report.content_type.replace('_', ' ')}</TableCell>
                  <TableCell>{getReasonBadge(report.reason)}</TableCell>
                  <TableCell className="text-sm">
                    {report.reporter_profile?.name || 'Unknown'}
                  </TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReport(report);
                        setResolutionNotes(report.resolution_notes || "");
                      }}
                    >
                      Review
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {reports?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No reports found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Review Content Report
            </DialogTitle>
          </DialogHeader>
          {selectedReport && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Reporter: </span>
                  {selectedReport.reporter_profile?.name || 'Unknown'}
                </div>
                <div>
                  <span className="text-muted-foreground">Date: </span>
                  {format(new Date(selectedReport.created_at), "dd MMM yyyy HH:mm")}
                </div>
                <div>
                  <span className="text-muted-foreground">Content Type: </span>
                  <span className="capitalize">{selectedReport.content_type.replace('_', ' ')}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Content ID: </span>
                  <code className="text-xs bg-muted px-1 rounded">{selectedReport.content_id.slice(0, 8)}...</code>
                </div>
              </div>

              <div className="flex gap-2">
                {getReasonBadge(selectedReport.reason)}
                {getStatusBadge(selectedReport.status)}
              </div>

              {selectedReport.description && (
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Reporter's Description</CardTitle>
                  </CardHeader>
                  <CardContent className="py-3">
                    <p className="text-sm">{selectedReport.description}</p>
                  </CardContent>
                </Card>
              )}

              {selectedReport.reviewed_by && (
                <div className="text-sm text-muted-foreground">
                  Reviewed by {selectedReport.reviewer_profile?.name || 'Unknown'} on{' '}
                  {selectedReport.reviewed_at && format(new Date(selectedReport.reviewed_at), "dd MMM yyyy HH:mm")}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Resolution Notes</label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                {selectedReport.status === "pending" && (
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus("reviewing")}
                    disabled={updateReportMutation.isPending}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Mark as Reviewing
                  </Button>
                )}
                <Button
                  variant="default"
                  onClick={() => handleUpdateStatus("resolved")}
                  disabled={updateReportMutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Resolve
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleUpdateStatus("dismissed")}
                  disabled={updateReportMutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Dismiss
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReport(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
