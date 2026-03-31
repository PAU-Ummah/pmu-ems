import { Event } from '@/services/types';

export function getRegisteredAttendeeCount(event: Event | Partial<Event>): number {
  return event.attendees?.length ?? 0;
}

export function getExternalAttendeeCount(event: Event | Partial<Event>): number {
  const externalGroups = event.externalAttendeeGroups ?? [];
  return externalGroups.reduce((sum, group) => {
    const safeCount = Number.isFinite(group.count) ? Math.max(0, group.count) : 0;
    return sum + safeCount;
  }, 0);
}

export function getTotalAttendeeCount(event: Event | Partial<Event>): number {
  return getRegisteredAttendeeCount(event) + getExternalAttendeeCount(event);
}

export function getAttendanceBreakdown(event: Event | Partial<Event>) {
  return {
    students: getRegisteredAttendeeCount(event),
    external: getExternalAttendeeCount(event),
    total: getTotalAttendeeCount(event),
  };
}
