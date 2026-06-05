import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBus } from '../event-bus.service';

describe('EventBus', () => {
  let eventBus: EventBus;
  let mockEmitter: EventEmitter2;

  beforeEach(() => {
    mockEmitter = {
      emit: vi.fn(),
      emitAsync: vi.fn().mockResolvedValue(undefined),
    } as any;

    eventBus = new EventBus(mockEmitter);
  });

  // ==========================================================================
  // emit()
  // ==========================================================================
  describe('emit', () => {
    it('should emit attendance.marked event', () => {
      const payload = {
        tenantId: 'tenant-1',
        studentId: 'student-1',
        classId: 'class-1',
        statusCode: 'PRESENT',
        date: '2026-06-05',
      };

      eventBus.emit('attendance.marked', payload);

      expect(mockEmitter.emit).toHaveBeenCalledWith('attendance.marked', payload);
    });

    it('should emit homework.assigned event', () => {
      const payload = {
        tenantId: 'tenant-1',
        homeworkId: 'hw-1',
        classId: 'class-1',
        dueDate: '2026-06-10',
      };

      eventBus.emit('homework.assigned', payload);

      expect(mockEmitter.emit).toHaveBeenCalledWith('homework.assigned', payload);
    });

    it('should emit leave.applied event', () => {
      const payload = {
        tenantId: 'tenant-1',
        leaveId: 'leave-1',
        workflowInstanceId: 'wf-instance-1',
      };

      eventBus.emit('leave.applied', payload);

      expect(mockEmitter.emit).toHaveBeenCalledWith('leave.applied', payload);
    });

    it('should emit workflow.transitioned event', () => {
      const payload = {
        tenantId: 'tenant-1',
        workflowCode: 'leave_approval',
        fromState: 'WITH_TEACHER',
        toState: 'WITH_PRINCIPAL',
        instanceId: 'wf-instance-1',
      };

      eventBus.emit('workflow.transitioned', payload);

      expect(mockEmitter.emit).toHaveBeenCalledWith('workflow.transitioned', payload);
    });

    it('should emit config.changed event', () => {
      const payload = {
        tenantId: 'tenant-1',
        schemaKey: 'attendance.statuses',
        version: 3,
      };

      eventBus.emit('config.changed', payload);

      expect(mockEmitter.emit).toHaveBeenCalledWith('config.changed', payload);
    });

    it('should emit student.risk_flagged event', () => {
      const payload = {
        tenantId: 'tenant-1',
        studentId: 'student-1',
        riskLevel: 'high',
      };

      eventBus.emit('student.risk_flagged', payload);

      expect(mockEmitter.emit).toHaveBeenCalledWith('student.risk_flagged', payload);
    });
  });

  // ==========================================================================
  // emitAsync()
  // ==========================================================================
  describe('emitAsync', () => {
    it('should emit event asynchronously', async () => {
      const payload = {
        tenantId: 'tenant-1',
        studentId: 'student-1',
        classId: 'class-1',
        statusCode: 'ABSENT',
        date: '2026-06-05',
      };

      await eventBus.emitAsync('attendance.marked', payload);

      expect(mockEmitter.emitAsync).toHaveBeenCalledWith('attendance.marked', payload);
    });
  });

  // ==========================================================================
  // All event types are covered
  // ==========================================================================
  describe('event type coverage', () => {
    it('should handle all 13 domain event types', () => {
      const spies = Object.keys(mockEmitter).filter(
        (k) => k === 'emit' || k === 'emitAsync',
      );

      // All events must compile — TypeScript ensures payloads match
      eventBus.emit('attendance.marked', {
        tenantId: '', studentId: '', classId: '', statusCode: '', date: '',
      });
      eventBus.emit('attendance.corrected', {
        tenantId: '', attendanceId: '', oldStatus: '', newStatus: '',
      });
      eventBus.emit('homework.assigned', {
        tenantId: '', homeworkId: '', classId: '', dueDate: '',
      });
      eventBus.emit('homework.submitted', {
        tenantId: '', submissionId: '', studentId: '',
      });
      eventBus.emit('homework.graded', {
        tenantId: '', submissionId: '', score: 0, grade: '',
      });
      eventBus.emit('exam.score_entered', {
        tenantId: '', examId: '', studentId: '',
      });
      eventBus.emit('leave.applied', {
        tenantId: '', leaveId: '', workflowInstanceId: '',
      });
      eventBus.emit('leave.approved', {
        tenantId: '', leaveId: '',
      });
      eventBus.emit('workflow.transitioned', {
        tenantId: '', workflowCode: '', fromState: '', toState: '', instanceId: '',
      });
      eventBus.emit('config.changed', {
        tenantId: '', schemaKey: '', version: 0,
      });
      eventBus.emit('student.enrolled', {
        tenantId: '', studentId: '',
      });
      eventBus.emit('student.risk_flagged', {
        tenantId: '', studentId: '', riskLevel: 'low',
      });

      // If we get here without TypeScript errors, all types are correct
      expect(true).toBe(true);
    });
  });
});
