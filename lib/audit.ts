// Audit logging — records all sensitive operations for SOC2 + GDPR compliance.
// Fire-and-forget: never blocks the request; errors are swallowed + logged.

import { adminClient } from '@/lib/api-auth';

export type AuditAction =
  | 'user.create'
  | 'user.approve'
  | 'user.suspend'
  | 'user.role_change'
  | 'user.delete'
  | 'subscription.create'
  | 'subscription.activate'
  | 'subscription.cancel'
  | 'subscription.expire'
  | 'donation.complete'
  | 'donation.refund'
  | 'group.create'
  | 'group.delete'
  | 'group.join'
  | 'group.leave'
  | 'settings.update'
  | 'license.update'
  | 'image.upload';

export interface AuditParams {
  churchId?:    string;
  actorId?:     string;
  actorEmail?:  string;
  actorRole?:   string;
  action:       AuditAction;
  resourceType: string;
  resourceId?:  string;
  oldValues?:   Record<string, unknown>;
  newValues?:   Record<string, unknown>;
  ipAddress?:   string;
  userAgent?:   string;
}

/**
 * Record an audit event. Always fire-and-forget — never awaited in request path.
 * Usage: void audit({ action: 'user.approve', ... })
 */
export function audit(params: AuditParams): void {
  adminClient()
    .from('audit_logs')
    .insert({
      church_id:     params.churchId    ?? null,
      actor_id:      params.actorId     ?? null,
      actor_email:   params.actorEmail  ?? null,
      actor_role:    params.actorRole   ?? null,
      action:        params.action,
      resource_type: params.resourceType,
      resource_id:   params.resourceId  ?? null,
      old_values:    params.oldValues   ?? null,
      new_values:    params.newValues   ?? null,
      ip_address:    params.ipAddress   ?? null,
      user_agent:    params.userAgent   ?? null,
    })
    .then(({ error }) => {
      if (error) console.error('[audit] Failed to write audit log:', error.message);
    });
}

/** Helper to extract IP + User-Agent from a Next.js request */
export function requestMeta(req: Request): { ipAddress: string; userAgent: string } {
  return {
    ipAddress: req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown',
    userAgent: req.headers.get('user-agent') ?? 'unknown',
  };
}
