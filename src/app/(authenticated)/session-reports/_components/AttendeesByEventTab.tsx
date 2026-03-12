import ComponentCard from '@/components/common/ComponentCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Event, Person } from '@/services/types';

interface EventFinanceRow {
  event: Event;
  attendeeCount: number;
}

interface AttendeesByEventTabProps {
  eventFinanceRows: EventFinanceRow[];
  people: Person[];
}

export default function AttendeesByEventTab({
  eventFinanceRows,
  people,
}: AttendeesByEventTabProps) {
  return (
    <div className="mb-8">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white/90">
        Attendees by event
      </h3>
      <div className="space-y-6">
        {eventFinanceRows.map((row) => {
          const attendeeIds = row.event.attendees ?? [];
          const attendeePeople = attendeeIds
            .map((attendeeId) =>
              people.find((person) => person.id === attendeeId)
            )
            .filter(Boolean);

          return (
            <ComponentCard key={row.event.id} title={row.event.name}>
              <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                {row.event.date} · {row.attendeeCount} attendee
                {row.attendeeCount !== 1 ? 's' : ''}
              </p>
              {attendeePeople.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No attendees recorded.
                </p>
              ) : (
                <div className="max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-gray-100 bg-gray-50 dark:bg-gray-800/50">
                      <TableRow>
                        <TableCell
                          isHeader
                          className="text-theme-xs px-3 py-2 text-start font-semibold text-gray-700 dark:text-white/90"
                        >
                          Name
                        </TableCell>
                        <TableCell
                          isHeader
                          className="text-theme-xs px-3 py-2 text-start font-semibold text-gray-700 dark:text-white/90"
                        >
                          Department
                        </TableCell>
                        <TableCell
                          isHeader
                          className="text-theme-xs px-3 py-2 text-start font-semibold text-gray-700 dark:text-white/90"
                        >
                          Year
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {attendeePeople.map((person) => (
                        <TableRow
                          key={person!.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <TableCell className="px-3 py-2 text-start text-theme-sm text-gray-800 dark:text-white/90">
                            {person!.firstName} {person!.middleName}{' '}
                            {person!.surname}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                            {person!.department}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-start text-theme-sm text-gray-600 dark:text-gray-400">
                            {person!.year ? `YR${person!.year}` : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </ComponentCard>
          );
        })}
      </div>
    </div>
  );
}
