import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

export interface BlockedIPCheck {
  isBlocked: boolean;
  reason?: string;
  expiresAt?: string;
}

/**
 * Check if an IP address is currently blocked
 */
export async function checkIPBlocked(
  supabase: SupabaseClient,
  ipAddress: string
): Promise<BlockedIPCheck> {
  try {
    // First, cleanup expired blocks
    await supabase.rpc('cleanup_expired_blocks');

    const { data, error } = await supabase
      .from('blocked_ips')
      .select('reason, expires_at')
      .eq('ip_address', ipAddress)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error checking blocked IP:', error);
      return { isBlocked: false };
    }

    if (data) {
      return {
        isBlocked: true,
        reason: data.reason,
        expiresAt: data.expires_at
      };
    }

    return { isBlocked: false };
  } catch (error) {
    console.error('Error in checkIPBlocked:', error);
    return { isBlocked: false };
  }
}

/**
 * Automatically block an IP address for rate limit violations
 */
export async function autoBlockIPForRateLimit(
  supabase: SupabaseClient,
  ipAddress: string,
  endpoint: string,
  violationCount: number
): Promise<void> {
  try {
    // Check if IP is already blocked
    const { data: existingBlock } = await supabase
      .from('blocked_ips')
      .select('id, is_active')
      .eq('ip_address', ipAddress)
      .maybeSingle();

    if (existingBlock?.is_active) {
      // Already blocked, just update violation count
      await supabase
        .from('blocked_ips')
        .update({ violation_count: violationCount })
        .eq('id', existingBlock.id);
      return;
    }

    // Calculate block duration based on violation count
    let blockDurationHours = 24; // Default 24 hours
    if (violationCount >= 5) {
      blockDurationHours = 168; // 7 days for serious offenders
    } else if (violationCount >= 3) {
      blockDurationHours = 72; // 3 days for repeat offenders
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + blockDurationHours);

    // Create new block
    const { error: insertError } = await supabase
      .from('blocked_ips')
      .insert({
        ip_address: ipAddress,
        reason: `Automatic block: ${violationCount} rate limit violations on ${endpoint} endpoint`,
        auto_blocked: true,
        violation_count: violationCount,
        expires_at: expiresAt.toISOString(),
        is_active: true
      });

    if (insertError) {
      console.error('Error auto-blocking IP:', insertError);
    } else {
      console.log(`Auto-blocked IP ${ipAddress} for ${blockDurationHours} hours after ${violationCount} violations`);
      
      // Log the block action to audit logs
      await supabase.from('audit_logs').insert({
        event_type: 'security_ip_blocked',
        ip_address: ipAddress,
        endpoint: endpoint,
        details: {
          auto_blocked: true,
          violation_count: violationCount,
          block_duration_hours: blockDurationHours,
          reason: 'rate_limit_violations'
        }
      });
    }
  } catch (error) {
    console.error('Error in autoBlockIPForRateLimit:', error);
  }
}

/**
 * Check for repeat rate limit violations and auto-block if needed
 */
export async function checkAndAutoBlock(
  supabase: SupabaseClient,
  ipAddress: string,
  endpoint: string
): Promise<void> {
  try {
    // Count rate limit violations in the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);

    const { data: violations, error } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('ip_address', ipAddress)
      .gte('request_count', 60) // Only count actual rate limit hits
      .gte('window_start', oneDayAgo.toISOString());

    if (error) {
      console.error('Error checking violations:', error);
      return;
    }

    // Auto-block if 3 or more violations in 24 hours
    if (violations && violations.length >= 3) {
      await autoBlockIPForRateLimit(supabase, ipAddress, endpoint, violations.length);
    }
  } catch (error) {
    console.error('Error in checkAndAutoBlock:', error);
  }
}
