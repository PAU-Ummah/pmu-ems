'use client';

import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Select from '@/components/form/Select';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import { Person } from '@/services/types';

interface AddPersonFormProps {
  isOpen: boolean;
  onClose: () => void;
  currentPerson: Partial<Person>;
  isEdit: boolean;
  onInputChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDepartmentChange: (value: string) => void;
  onClassChange: (value: string) => void;
  onLivingChange: (value: string) => void;
  onSubmit: () => void;
  departmentFormOptions: { value: string; label: string }[];
  classFormOptions: { value: string; label: string }[];
  livingFormOptions: { value: string; label: string }[];
  currentSessionId?: string | null;
}

export default function AddPersonForm({
  isOpen,
  onClose,
  currentPerson,
  isEdit,
  onInputChange,
  onDepartmentChange,
  onClassChange,
  onLivingChange,
  onSubmit,
  departmentFormOptions,
  classFormOptions,
  livingFormOptions,
  currentSessionId,
}: AddPersonFormProps) {
  const classYear = currentPerson.year ?? '';
  const classDefaultValue = classYear === '' ? '' : `YR${classYear}`;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="!max-w-[1000px] p-6 lg:p-10">
      <div className="w-full">
        <h2 className="mb-6 text-xl font-semibold text-gray-900">
          {isEdit ? 'Edit Person' : 'Add New Person'}
        </h2>
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="firstName">First Name</Label>
            <InputField
              id="firstName"
              name="firstName"
              value={currentPerson.firstName ?? ''}
              onChange={onInputChange}
            />
          </div>
          <div>
            <Label htmlFor="middleName">Middle Name</Label>
            <InputField
              id="middleName"
              name="middleName"
              value={currentPerson.middleName ?? ''}
              onChange={onInputChange}
            />
          </div>
          <div>
            <Label htmlFor="surname">Surname</Label>
            <InputField
              id="surname"
              name="surname"
              value={currentPerson.surname ?? ''}
              onChange={onInputChange}
            />
          </div>
          <div>
            <Label htmlFor="department">Department</Label>
            <Select
              options={departmentFormOptions}
              defaultValue={currentPerson.department ?? ''}
              onChange={(changeEvent) => onDepartmentChange(changeEvent.target.value)}
              placeholder="Select department"
              disabled={!currentSessionId && !isEdit}
            />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <InputField
              id="gender"
              name="gender"
              value={currentPerson.gender ?? ''}
              onChange={onInputChange}
            />
          </div>
          <div>
            <Label htmlFor="class">Class</Label>
            <Select
              options={classFormOptions}
              defaultValue={classDefaultValue}
              onChange={(changeEvent) => onClassChange(changeEvent.target.value)}
              placeholder="Select class"
              disabled={!currentSessionId && !isEdit}
            />
          </div>
          <div>
            <Label htmlFor="living">Living</Label>
            <Select
              options={livingFormOptions}
              defaultValue={currentPerson.living ?? ''}
              onChange={(changeEvent) => onLivingChange(changeEvent.target.value)}
              placeholder="Select..."
            />
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              className="w-full sm:w-auto sm:min-w-[80px]"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onSubmit}
              className="w-full sm:w-auto sm:min-w-[80px]"
            >
              {isEdit ? 'Update' : 'Add'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
