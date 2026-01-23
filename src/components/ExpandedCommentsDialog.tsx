import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageCircle, Reply, ChevronDown, ChevronUp, Loader2, Trash2, Pencil, X, Check } from "lucide-react";
import { Link } from "react-router-dom";

interface Comment {
  id: string;
  comment: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  parent_comment_id: string | null;
  profiles: { name: string } | null;
  replies?: Comment[];
}

interface ExpandedCommentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bakeShareId: string;
  bakeOwnerId: string;
  currentUserId: string;
  onCommentAdded: () => void;
}

const COMMENTS_PER_PAGE = 10;

export const ExpandedCommentsDialog = ({
  open,
  onOpenChange,
  bakeShareId,
  bakeOwnerId,
  currentUserId,
  onCommentAdded,
}: ExpandedCommentsDialogProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchComments = async (pageNum: number, append = false) => {
    setLoading(true);
    try {
      const from = pageNum * COMMENTS_PER_PAGE;
      const to = from + COMMENTS_PER_PAGE - 1;

      // Fetch top-level comments
      const { data, error } = await supabase
        .from("bake_comments")
        .select("id, comment, user_id, created_at, updated_at, parent_comment_id, profiles(name)")
        .eq("bake_share_id", bakeShareId)
        .is("parent_comment_id", null)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from("bake_comments")
            .select("id, comment, user_id, created_at, updated_at, parent_comment_id, profiles(name)")
            .eq("parent_comment_id", comment.id)
            .order("created_at", { ascending: true });

          return { ...comment, replies: replies || [] };
        })
      );

      if (append) {
        setComments((prev) => [...prev, ...commentsWithReplies]);
      } else {
        setComments(commentsWithReplies);
      }

      setHasMore((data?.length || 0) === COMMENTS_PER_PAGE);
    } catch (error: any) {
      toast.error("Failed to load comments");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setPage(0);
      setComments([]);
      fetchComments(0);
    }
  }, [open, bakeShareId]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchComments(nextPage, true);
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("bake_comments").insert({
        bake_share_id: bakeShareId,
        user_id: currentUserId,
        comment: newComment.trim(),
        parent_comment_id: null,
      });

      if (error) throw error;

      // Trigger notification
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      fetch(`${supabaseUrl}/functions/v1/notify-comment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commenterId: currentUserId,
          bakeShareId,
          bakeOwnerId,
          commentPreview: newComment.trim(),
        }),
      }).catch((err) => console.log("Comment notification:", err));

      setNewComment("");
      fetchComments(0);
      onCommentAdded();
      toast.success("Comment added!");
    } catch (error: any) {
      toast.error("Failed to add comment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentCommentId: string, parentUserId: string) => {
    if (!replyText.trim()) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from("bake_comments").insert({
        bake_share_id: bakeShareId,
        user_id: currentUserId,
        comment: replyText.trim(),
        parent_comment_id: parentCommentId,
      });

      if (error) throw error;

      // Notify the parent comment author if different from current user
      if (parentUserId !== currentUserId) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        fetch(`${supabaseUrl}/functions/v1/notify-comment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            commenterId: currentUserId,
            bakeShareId,
            bakeOwnerId: parentUserId,
            commentPreview: replyText.trim(),
          }),
        }).catch((err) => console.log("Reply notification:", err));
      }

      setReplyText("");
      setReplyingTo(null);
      fetchComments(0);
      onCommentAdded();
      toast.success("Reply added!");
    } catch (error: any) {
      toast.error("Failed to add reply");
    } finally {
      setSubmitting(false);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  const handleDeleteComment = async () => {
    if (!commentToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("bake_comments")
        .delete()
        .eq("id", commentToDelete)
        .eq("user_id", currentUserId);

      if (error) throw error;

      setDeleteConfirmOpen(false);
      setCommentToDelete(null);
      fetchComments(0);
      onCommentAdded();
      toast.success("Comment deleted!");
    } catch (error: any) {
      toast.error("Failed to delete comment");
    } finally {
      setDeleting(false);
    }
  };

  const startEditing = (commentId: string, currentText: string) => {
    setEditingCommentId(commentId);
    setEditText(currentText);
  };

  const cancelEditing = () => {
    setEditingCommentId(null);
    setEditText("");
  };

  const handleSaveEdit = async () => {
    if (!editingCommentId || !editText.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("bake_comments")
        .update({ comment: editText.trim() })
        .eq("id", editingCommentId)
        .eq("user_id", currentUserId);

      if (error) throw error;

      setEditingCommentId(null);
      setEditText("");
      fetchComments(0);
      toast.success("Comment updated!");
    } catch (error: any) {
      toast.error("Failed to update comment");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const isEdited = (createdAt: string, updatedAt: string) => {
    const created = new Date(createdAt).getTime();
    const updated = new Date(updatedAt).getTime();
    // Consider edited if updated_at is more than 1 second after created_at
    return updated - created > 1000;
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Comments
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="space-y-2">
                {/* Main comment */}
                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/baker/${comment.user_id}`}
                        className="font-medium text-sm hover:text-primary transition-colors"
                      >
                        {comment.profiles?.name || "Unknown"}
                      </Link>
                      {editingCommentId === comment.id ? (
                        <div className="mt-1 flex gap-2">
                          <Input
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="flex-1 h-8 text-sm"
                            maxLength={500}
                            disabled={saving}
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="h-8 px-2"
                            onClick={handleSaveEdit}
                            disabled={saving || !editText.trim()}
                          >
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={cancelEditing}
                            disabled={saving}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-foreground mt-1 break-words">
                          {comment.comment}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(comment.created_at)}
                      </span>
                      {isEdited(comment.created_at, comment.updated_at) && (
                        <span className="text-xs text-muted-foreground/70 italic">
                          (edited)
                        </span>
                      )}
                    </div>
                  </div>

                  {editingCommentId !== comment.id && (
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setReplyingTo(replyingTo === comment.id ? null : comment.id);
                          setReplyText("");
                        }}
                      >
                        <Reply className="h-3 w-3 mr-1" />
                        Reply
                      </Button>

                      {comment.user_id === currentUserId && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => startEditing(comment.id, comment.comment)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setCommentToDelete(comment.id);
                              setDeleteConfirmOpen(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Delete
                          </Button>
                        </>
                      )}

                      {comment.replies && comment.replies.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs"
                          onClick={() => toggleReplies(comment.id)}
                        >
                          {expandedReplies.has(comment.id) ? (
                            <ChevronUp className="h-3 w-3 mr-1" />
                          ) : (
                            <ChevronDown className="h-3 w-3 mr-1" />
                          )}
                          {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Reply input */}
                {replyingTo === comment.id && (
                  <div className="ml-4 flex gap-2">
                    <Input
                      placeholder={`Reply to ${comment.profiles?.name || "Unknown"}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="flex-1 h-8 text-sm"
                      maxLength={500}
                      disabled={submitting}
                    />
                    <Button
                      size="sm"
                      className="h-8"
                      onClick={() => handleSubmitReply(comment.id, comment.user_id)}
                      disabled={submitting || !replyText.trim()}
                    >
                      {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Send"}
                    </Button>
                  </div>
                )}

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && expandedReplies.has(comment.id) && (
                  <div className="ml-4 space-y-2 border-l-2 border-border pl-3">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="bg-muted/30 rounded-lg p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/baker/${reply.user_id}`}
                              className="font-medium text-xs hover:text-primary transition-colors"
                            >
                              {reply.profiles?.name || "Unknown"}
                            </Link>
                            {editingCommentId === reply.id ? (
                              <div className="mt-0.5 flex gap-2">
                                <Input
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  className="flex-1 h-7 text-sm"
                                  maxLength={500}
                                  disabled={saving}
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  className="h-7 px-2"
                                  onClick={handleSaveEdit}
                                  disabled={saving || !editText.trim()}
                                >
                                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2"
                                  onClick={cancelEditing}
                                  disabled={saving}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <p className="text-sm text-foreground mt-0.5 break-words">
                                {reply.comment}
                              </p>
                            )}
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatDate(reply.created_at)}
                              </span>
                              {isEdited(reply.created_at, reply.updated_at) && (
                                <span className="text-xs text-muted-foreground/70 italic">
                                  (edited)
                                </span>
                              )}
                            </div>
                            {reply.user_id === currentUserId && editingCommentId !== reply.id && (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => startEditing(reply.id, reply.comment)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setCommentToDelete(reply.id);
                                    setDeleteConfirmOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!loading && comments.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </p>
            )}

            {hasMore && !loading && comments.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={loadMore}
              >
                Load more comments
              </Button>
            )}
          </div>
        </ScrollArea>

        {/* New comment form */}
        <div className="pt-4 border-t space-y-1">
          <form onSubmit={handleSubmitComment} className="flex gap-2">
            <Input
              placeholder="Add a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1"
              maxLength={500}
              disabled={submitting}
            />
            <Button type="submit" disabled={submitting || !newComment.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-right">
            {500 - newComment.length} characters remaining
          </p>
        </div>
    </DialogContent>
  </Dialog>

  <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete comment?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete your comment.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={handleDeleteComment}
          disabled={deleting}
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</>
);
};
