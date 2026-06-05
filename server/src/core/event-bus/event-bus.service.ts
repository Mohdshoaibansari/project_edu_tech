import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Typed event bus for inter-context communication.
 *
 * Contexts communicate via events, NEVER through direct service imports.
 * This is the shared kernel for all domain events.
 */
export interface DomainEvents {
  'attendance.marked': { tenantId: string; studentId: string; classId: string; statusCode: string; date: string };
  'attendance.corrected': { tenantId: string; attendanceId: string; oldStatus: string; newStatus: string };
  'homework.assigned': { tenantId: string; homeworkId: string; classId: string; dueDate: string };
  'homework.submitted': { tenantId: string; submissionId: string; studentId: string };
  'homework.graded': { tenantId: string; submissionId: string; score: number; grade: string };
  'exam.score_entered': { tenantId: string; examId: string; studentId: string };
  'leave.applied': { tenantId: string; leaveId: string; workflowInstanceId: string };
  'leave.approved': { tenantId: string; leaveId: string };
  'workflow.transitioned': { tenantId: string; workflowCode: string; fromState: string; toState: string; instanceId: string };
  'config.changed': { tenantId: string; schemaKey: string; version: number };
  'student.enrolled': { tenantId: string; studentId: string };
  'student.risk_flagged': { tenantId: string; studentId: string; riskLevel: string };
}

export type DomainEventName = keyof DomainEvents;

@Injectable()
export class EventBus {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Emit a typed domain event.
   */
  emit<K extends DomainEventName>(event: K, payload: DomainEvents[K]): void {
    this.eventEmitter.emit(event, payload);
  }

  /**
   * Emit an event asynchronously (non-blocking).
   */
  emitAsync<K extends DomainEventName>(event: K, payload: DomainEvents[K]): Promise<void> {
    return this.eventEmitter.emitAsync(event, payload) as Promise<any>;
  }
}
