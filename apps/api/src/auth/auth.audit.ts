import { Injectable } from '@nestjs/common';
export type AuthOutcome =
  | 'success'
  | 'unknown_identity'
  | 'wrong_password'
  | 'inactive_user'
  | 'replay'
  | 'operational_error';
@Injectable()
export class AuthAudit {
  record(outcome: AuthOutcome, correlation: string, userId?: number): void {
    // Only application-owned, allow-listed fields reach internal logs.
    console.info(
      JSON.stringify({
        event: 'authentication',
        outcome,
        correlation,
        ...(userId === undefined ? {} : { userId }),
      }),
    );
  }
}
