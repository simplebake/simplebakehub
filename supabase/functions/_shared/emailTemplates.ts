// Email templates for different notification types

export interface EmailTemplate {
  subject: string;
  html: string;
}

// HTML escape function to prevent XSS attacks
function escapeHtml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export const newMessageTemplate = (data: {
  category: string;
  subject: string;
  message: string;
  senderEmail?: string;
}): EmailTemplate => {
  const safeCategory = escapeHtml(data.category);
  const safeSubject = escapeHtml(data.subject);
  const safeMessage = escapeHtml(data.message);
  const safeSenderEmail = data.senderEmail ? escapeHtml(data.senderEmail) : undefined;
  
  return {
    subject: `New Customer Message: ${safeSubject}`,
    html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📬 New Customer Message</h1>
      </div>
      
      <div style="padding: 30px;">
        <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
          A new customer message has been received and requires your attention.
        </p>
        
        <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #6366f1;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 100px;">Category:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${safeCategory}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subject:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${safeSubject}</td>
            </tr>
            ${safeSenderEmail ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">From:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${safeSenderEmail}</td>
            </tr>
            ` : ''}
          </table>
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Message:</p>
            <p style="color: #111827; font-size: 14px; margin: 0; white-space: pre-wrap; line-height: 1.6;">${safeMessage}</p>
          </div>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          Please log in to the admin panel to respond to this message.
        </p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This is an automated notification from Simple Bake Hub
        </p>
      </div>
    </div>
  `
  };
};

export const statusUpdateTemplate = (data: {
  messageSubject: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
}): EmailTemplate => {
  const safeMessageSubject = escapeHtml(data.messageSubject);
  const safeOldStatus = escapeHtml(data.oldStatus);
  const safeNewStatus = escapeHtml(data.newStatus);
  const safeUpdatedBy = escapeHtml(data.updatedBy);
  
  return {
  subject: `Status Update: ${safeMessageSubject}`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔄 Status Update</h1>
      </div>
      
      <div style="padding: 30px;">
        <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
          A customer message status has been updated.
        </p>
        
        <div style="background-color: #f9fafb; border-radius: 12px; padding: 24px; margin: 20px 0;">
          <p style="margin: 0 0 16px 0; color: #111827; font-weight: 500;">${safeMessageSubject}</p>
          
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="background-color: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
              ${safeOldStatus}
            </span>
            <span style="color: #9ca3af;">→</span>
            <span style="background-color: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
              ${safeNewStatus}
            </span>
          </div>
          
          <p style="color: #6b7280; font-size: 13px; margin: 16px 0 0 0;">
            Updated by: ${safeUpdatedBy}
          </p>
        </div>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This is an automated notification from Simple Bake Hub
        </p>
      </div>
    </div>
  `
  };
};

export const securityAlertTemplate = (data: {
  alertType: string;
  ipAddress: string;
  reason: string;
  timestamp: string;
}): EmailTemplate => {
  const safeAlertType = escapeHtml(data.alertType);
  const safeIpAddress = escapeHtml(data.ipAddress);
  const safeReason = escapeHtml(data.reason);
  const safeTimestamp = escapeHtml(data.timestamp);
  
  return {
  subject: `🚨 Security Alert: ${safeAlertType}`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🚨 Security Alert</h1>
      </div>
      
      <div style="padding: 30px;">
        <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
          A security event has been detected that requires your attention.
        </p>
        
        <div style="background-color: #fef2f2; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Alert Type:</td>
              <td style="padding: 8px 0; color: #991b1b; font-size: 14px; font-weight: 600;">${safeAlertType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">IP Address:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-family: monospace;">${safeIpAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Reason:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${safeReason}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Timestamp:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${safeTimestamp}</td>
            </tr>
          </table>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          Please review this alert in the security dashboard.
        </p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This is an automated security notification from Simple Bake Hub
        </p>
      </div>
    </div>
  `
  };
};

export const communityReportTemplate = (data: {
  reportType: string;
  contentId: string;
  reportedBy: string;
  reason: string;
}): EmailTemplate => {
  const safeReportType = escapeHtml(data.reportType);
  const safeContentId = escapeHtml(data.contentId);
  const safeReportedBy = escapeHtml(data.reportedBy);
  const safeReason = escapeHtml(data.reason);
  
  return {
  subject: `Community Report: ${safeReportType}`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🚩 Community Report</h1>
      </div>
      
      <div style="padding: 30px;">
        <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
          New content has been reported by a community member.
        </p>
        
        <div style="background-color: #fffbeb; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Report Type:</td>
              <td style="padding: 8px 0; color: #92400e; font-size: 14px; font-weight: 500;">${safeReportType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Content ID:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-family: monospace;">${safeContentId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Reported By:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${safeReportedBy}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Reason:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${safeReason}</td>
            </tr>
          </table>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          Please review this report and take appropriate action.
        </p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This is an automated notification from Simple Bake Hub
        </p>
      </div>
    </div>
  `
  };
};

export const reportResolutionTemplate = (data: {
  status: string;
  contentType: string;
  resolutionNotes: string;
}): EmailTemplate => {
  const safeStatus = escapeHtml(data.status);
  const safeContentType = escapeHtml(data.contentType);
  const safeResolutionNotes = escapeHtml(data.resolutionNotes);
  const isResolved = data.status === 'resolved';
  
  return {
  subject: `Your Report Has Been ${isResolved ? 'Resolved' : 'Reviewed'}`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, ${isResolved ? '#10b981 0%, #059669 100%' : '#6b7280 0%, #4b5563 100%'}); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${isResolved ? '✅' : '📋'} Report ${isResolved ? 'Resolved' : 'Reviewed'}</h1>
      </div>
      
      <div style="padding: 30px;">
        <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
          Thank you for helping keep our community safe. Your report has been reviewed by our moderation team.
        </p>
        
        <div style="background-color: ${isResolved ? '#d1fae5' : '#f3f4f6'}; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid ${isResolved ? '#10b981' : '#6b7280'};">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Status:</td>
              <td style="padding: 8px 0; color: ${isResolved ? '#065f46' : '#374151'}; font-size: 14px; font-weight: 600; text-transform: capitalize;">${safeStatus}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Content Type:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; text-transform: capitalize;">${safeContentType.replace('_', ' ')}</td>
            </tr>
          </table>
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${isResolved ? '#a7f3d0' : '#e5e7eb'};">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Resolution Notes:</p>
            <p style="color: #111827; font-size: 14px; margin: 0; line-height: 1.6;">${safeResolutionNotes}</p>
          </div>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 24px;">
          If you have any questions about this decision, please contact our support team.
        </p>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This is an automated notification from Simple Bake Hub
        </p>
      </div>
    </div>
  `
  };
};
