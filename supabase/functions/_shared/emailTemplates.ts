// Email templates for different notification types

export interface EmailTemplate {
  subject: string;
  html: string;
}

export const newMessageTemplate = (data: {
  category: string;
  subject: string;
  message: string;
  senderEmail?: string;
}): EmailTemplate => ({
  subject: `New Customer Message: ${data.subject}`,
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
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${data.category}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subject:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-weight: 500;">${data.subject}</td>
            </tr>
            ${data.senderEmail ? `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">From:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${data.senderEmail}</td>
            </tr>
            ` : ''}
          </table>
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Message:</p>
            <p style="color: #111827; font-size: 14px; margin: 0; white-space: pre-wrap; line-height: 1.6;">${data.message}</p>
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
  `,
});

export const statusUpdateTemplate = (data: {
  messageSubject: string;
  oldStatus: string;
  newStatus: string;
  updatedBy: string;
}): EmailTemplate => ({
  subject: `Status Update: ${data.messageSubject}`,
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
          <p style="margin: 0 0 16px 0; color: #111827; font-weight: 500;">${data.messageSubject}</p>
          
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="background-color: #fef3c7; color: #92400e; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
              ${data.oldStatus}
            </span>
            <span style="color: #9ca3af;">→</span>
            <span style="background-color: #d1fae5; color: #065f46; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: 500;">
              ${data.newStatus}
            </span>
          </div>
          
          <p style="color: #6b7280; font-size: 13px; margin: 16px 0 0 0;">
            Updated by: ${data.updatedBy}
          </p>
        </div>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          This is an automated notification from Simple Bake Hub
        </p>
      </div>
    </div>
  `,
});

export const securityAlertTemplate = (data: {
  alertType: string;
  ipAddress: string;
  reason: string;
  timestamp: string;
}): EmailTemplate => ({
  subject: `🚨 Security Alert: ${data.alertType}`,
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
              <td style="padding: 8px 0; color: #991b1b; font-size: 14px; font-weight: 600;">${data.alertType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">IP Address:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-family: monospace;">${data.ipAddress}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Reason:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${data.reason}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Timestamp:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${data.timestamp}</td>
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
  `,
});

export const communityReportTemplate = (data: {
  reportType: string;
  contentId: string;
  reportedBy: string;
  reason: string;
}): EmailTemplate => ({
  subject: `Community Report: ${data.reportType}`,
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
              <td style="padding: 8px 0; color: #92400e; font-size: 14px; font-weight: 500;">${data.reportType}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Content ID:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; font-family: monospace;">${data.contentId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Reported By:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${data.reportedBy}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Reason:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px;">${data.reason}</td>
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
  `,
});

export const reportResolutionTemplate = (data: {
  status: string;
  contentType: string;
  resolutionNotes: string;
}): EmailTemplate => ({
  subject: `Your Report Has Been ${data.status === 'resolved' ? 'Resolved' : 'Reviewed'}`,
  html: `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
      <div style="background: linear-gradient(135deg, ${data.status === 'resolved' ? '#10b981 0%, #059669 100%' : '#6b7280 0%, #4b5563 100%'}); padding: 30px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">${data.status === 'resolved' ? '✅' : '📋'} Report ${data.status === 'resolved' ? 'Resolved' : 'Reviewed'}</h1>
      </div>
      
      <div style="padding: 30px;">
        <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">
          Thank you for helping keep our community safe. Your report has been reviewed by our moderation team.
        </p>
        
        <div style="background-color: ${data.status === 'resolved' ? '#d1fae5' : '#f3f4f6'}; border-radius: 12px; padding: 24px; margin: 20px 0; border-left: 4px solid ${data.status === 'resolved' ? '#10b981' : '#6b7280'};">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 120px;">Status:</td>
              <td style="padding: 8px 0; color: ${data.status === 'resolved' ? '#065f46' : '#374151'}; font-size: 14px; font-weight: 600; text-transform: capitalize;">${data.status}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Content Type:</td>
              <td style="padding: 8px 0; color: #111827; font-size: 14px; text-transform: capitalize;">${data.contentType.replace('_', ' ')}</td>
            </tr>
          </table>
          <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${data.status === 'resolved' ? '#a7f3d0' : '#e5e7eb'};">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 8px 0;">Resolution Notes:</p>
            <p style="color: #111827; font-size: 14px; margin: 0; line-height: 1.6;">${data.resolutionNotes}</p>
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
  `,
});
