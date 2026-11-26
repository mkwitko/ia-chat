import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { AddButton } from '../setup/add-button';
import { feedback } from '../setup/feedback';
import { AreaField, FormActions, RowActions, TextField } from '../setup/fields';
import { NEW_ITEM, useEditing } from '../setup/use-editing';
import {
  IN_USE,
  useCreatePlace,
  usePlaces,
  useRemovePlace,
  useUpdatePlace,
  type Place,
  type PlaceInput,
} from './profile-api';
import { ProfileCopy as Copy } from './profile-copy';

export const removeFeedback = {
  onSuccess: feedback.onSuccess,
  onError: (error: Error) => {
    if (error instanceof ApiError && error.code === IN_USE) toast.error(Copy.inUse);
    else feedback.onError(error);
  },
};

/** M-04: every place where the business serves; the assistant states all of them. */
export function PlacesSection() {
  const places = usePlaces();
  const edit = useEditing();
  const create = useCreatePlace();
  if (!places.data) return null;
  const list = places.data.locations;
  return (
    <div className="grid gap-3">
      {list.map((place, index) => (
        <PlaceRow key={place.id} place={place} main={index === 0} edit={edit} />
      ))}
      {edit.editing === NEW_ITEM ? (
        <PlaceForm
          pending={create.isPending}
          onCancel={edit.close}
          onSubmit={(body) => {
            create.mutate(body, edit.done);
          }}
        />
      ) : (
        <AddButton
          label={Copy.addPlace}
          onClick={() => {
            edit.open(NEW_ITEM);
          }}
        />
      )}
    </div>
  );
}

interface RowProps {
  place: Place;
  main: boolean;
  edit: ReturnType<typeof useEditing>;
}

function PlaceRow({ place, main, edit }: Readonly<RowProps>) {
  const update = useUpdatePlace();
  const remove = useRemovePlace();
  if (edit.editing === place.id)
    return (
      <PlaceForm
        initial={place}
        pending={update.isPending}
        onCancel={edit.close}
        onSubmit={(body) => {
          update.mutate({ id: place.id, body }, edit.done);
        }}
      />
    );
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-card p-4">
      <div className="min-w-48 flex-1">
        <p className="font-semibold">
          {place.name}
          {main && (
            <span className="ml-2 text-xs font-medium text-muted-foreground">{Copy.main}</span>
          )}
        </p>
        <p className="text-sm text-muted-foreground">{place.address}</p>
      </div>
      <RowActions
        onEdit={() => {
          edit.open(place.id);
        }}
        onRemove={() => {
          if (window.confirm(Copy.removeConfirm(place.name)))
            remove.mutate(place.id, removeFeedback);
        }}
      />
    </div>
  );
}

interface FormProps {
  initial?: Place;
  pending: boolean;
  onSubmit: (body: PlaceInput) => void;
  onCancel: () => void;
}

function PlaceForm({ initial, pending, onSubmit, onCancel }: Readonly<FormProps>) {
  const [name, setName] = useState(initial?.name ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [arrival, setArrival] = useState(initial?.arrivalInstructions ?? '');
  return (
    <form
      className="grid gap-4 rounded-xl border bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({ name, address, arrivalInstructions: arrival.trim() || null });
      }}
    >
      <TextField
        id="place-name"
        label={Copy.placeName}
        placeholder={Copy.placeNamePlaceholder}
        value={name}
        onChange={setName}
        required
        maxLength={80}
      />
      <TextField
        id="place-address"
        label={Copy.address}
        value={address}
        onChange={setAddress}
        required
        maxLength={300}
      />
      <AreaField
        id="place-arrival"
        label={Copy.arrival}
        value={arrival}
        onChange={setArrival}
        maxLength={1000}
      />
      <FormActions pending={pending} onCancel={onCancel} />
    </form>
  );
}
