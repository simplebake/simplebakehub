import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { Mail, MessageSquare, Clock, CheckCircle, XCircle } from "lucide-react";
import { maskEmail } from "@/lib/emailMasking";

interface CustomerMessage {
  id: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  email: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

export const CustomerMessagesManager = () => {
  const queryClient = useQueryClient();
  const [selectedMessage, setSelectedMessage] = useState<CustomerMessage | null>(null);
  const [responseText, setResponseText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const { data: messages, isLoading } = useQuery({
    queryKey: ["customer-messages", filterStatus],
    queryFn: async () => {
      let query = supabase
        .from("customer_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CustomerMessage[];
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, oldStatus, subject }: { id: string; status: string; oldStatus: string; subject: string }) => {
      const { error } = await supabase
        .from("customer_messages")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;

      // Send status update notification
      if (oldStatus !== status) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          const { data: profile } = await supabase
            .from("profiles")
            .select("name")
            .eq("id", user?.id)
            .single();

          await supabase.functions.invoke('notify-moderators', {
            body: {
              type: 'status_update',
              data: {
                messageSubject: subject,
                oldStatus,
                newStatus: status,
                updatedBy: profile?.name || user?.email || 'Unknown',
              }
            }
          });
        } catch (e) {
          console.error('Failed to send status notification:', e);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-messages"] });
      toast.success("Message status updated");
    },
    onError: () => {
      toast.error("Failed to update status");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case "in_progress":
        return <Badge variant="default"><MessageSquare className="w-3 h-3 mr-1" />In Progress</Badge>;
      case "resolved":
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>;
      case "closed":
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Closed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      feedback: "bg-blue-100 text-blue-800",
      support: "bg-orange-100 text-orange-800",
      bug: "bg-red-100 text-red-800",
      feature: "bg-purple-100 text-purple-800",
      other: "bg-gray-100 text-gray-800",
    };
    return <Badge className={colors[category] || colors.other}>{category}</Badge>;
  };

  const pendingCount = messages?.filter(m => m.status === "pending").length || 0;
  const inProgressCount = messages?.filter(m => m.status === "in_progress").length || 0;

  if (isLoading) {
    return <div className="text-center py-4">Loading messages...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{messages?.length || 0}</div>
            <p className="text-sm text-muted-foreground">Total Messages</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-blue-600">{inProgressCount}</div>
            <p className="text-sm text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Customer Messages</h3>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages?.map((message) => (
                <TableRow key={message.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(message.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="font-medium">{message.subject}</TableCell>
                  <TableCell>{getCategoryBadge(message.category)}</TableCell>
                  <TableCell>{getStatusBadge(message.status)}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedMessage(message)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {messages?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No messages found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              {selectedMessage?.subject}
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="flex gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">From: </span>
                  {selectedMessage.email ? maskEmail(selectedMessage.email) : "Anonymous"}
                </div>
                <div>
                  <span className="text-muted-foreground">Date: </span>
                  {format(new Date(selectedMessage.created_at), "dd MMM yyyy HH:mm")}
                </div>
              </div>
              <div className="flex gap-2">
                {getCategoryBadge(selectedMessage.category)}
                {getStatusBadge(selectedMessage.status)}
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Message</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap">{selectedMessage.message}</p>
                </CardContent>
              </Card>
              <div className="space-y-2">
                <label className="text-sm font-medium">Update Status</label>
                <Select
                  value={selectedMessage.status}
                  onValueChange={(value) => {
                    const oldStatus = selectedMessage.status;
                    updateStatusMutation.mutate({ 
                      id: selectedMessage.id, 
                      status: value, 
                      oldStatus, 
                      subject: selectedMessage.subject 
                    });
                    setSelectedMessage({ ...selectedMessage, status: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMessage(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
