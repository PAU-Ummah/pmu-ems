'use client';

import { Modal } from '@/components/ui/modal';
import InputField from '@/components/form/input/InputField';
import Select from '@/components/form/Select';
import Label from '@/components/form/Label';
import Button from '@/components/ui/button/Button';
import { Person } from '@/types';

interface AddPersonFormProps {
  isOpen: boolean;
  onClose: () => void;
  currentPerson: Partial<Person>;
  isEdit: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLivingChange: (value: string) => void;
  onSubmit: () => void;
  livingFormOptions: { value: string; label: string }[];
}

export default function AddPersonForm({
  isOpen,
  onClose,
  currentPerson,
  isEdit,
  onInputChange,
  onLivingChange,
  onSubmit,
  livingFormOptions,
}: AddPersonFormProps) {
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
              value={currentPerson.firstName || ''}
              onChange={onInputChange}
            />
          </div>
          <div>
            <Label htmlFor="middleName">Middle Name</Label>
            <InputField
              id="middleName"
              name="middleName"
              value={currentPerson.middleName || ''}
              onChange={onInputChange}
            />
          </div>
          <div>
            <Label htmlFor="surname">Surname</Label>
            <InputField
              id="surname"
              name="surname"
              value={currentPerson.surname || ''}
              onChange={onInputChange}
            />
          </div>
          <div>
            <Label htmlFor="department">Department</Label>
            <InputField
              id="department"
              name="department"
              value={currentPerson.department || ''}
              onChange={onInputChange}
            />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <InputField
              id="gender"
              name="gender"
              value={currentPerson.gender || ''}
              onChange={onInputChange}
            />
          </div>
          <div>
            <Label htmlFor="class">Class</Label>
            <InputField
              id="class"
              name="class"
              value={currentPerson.class || ''}
              onChange={onInputChange}
            />
          </div>
          <div>
            <Label htmlFor="living">Living</Label>
            <Select
              options={livingFormOptions}
              defaultValue={currentPerson.living || ''}
              onChange={(e) => onLivingChange(e.target.value)}
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
