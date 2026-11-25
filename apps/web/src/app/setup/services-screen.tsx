import { formatCents } from '@/lib/money';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { Screen, ScreenWidth } from '../screens/screen';
import { AddButton } from './add-button';
import { feedback } from './feedback';
import { RowActions } from './fields';
import { LocationSection } from './location-section';
import { ServiceForm } from './service-form';
import {
  useArchiveService,
  useCreateService,
  useServices,
  useUpdateService,
  type Service,
} from './setup-api';
import { CommonCopy, ServicesCopy as Copy } from './setup-copy';
import { NEW_ITEM, useEditing } from './use-editing';

/** Spec 10, "Serviços e local". */
export function ServicesScreen() {
  const services = useServices();
  return (
    <Screen title={Copy.title} width={ScreenWidth.form}>
      <BackLink to={Route.more} label={CommonCopy.more} />
      <div className="grid gap-10 pt-2 pb-10">
        <section className="grid gap-3">
          <h2 className="px-4 text-lg md:px-0">{Copy.servicesHeading}</h2>
          {services.isPending && <ListSkeleton />}
          {services.isError && (
            <LoadError message={CommonCopy.loadFailed} onRetry={() => void services.refetch()} />
          )}
          {services.data && (
            <ServiceList
              services={services.data.services}
              pricesForbidden={services.data.pricesForbidden}
            />
          )}
        </section>
        <LocationSection />
      </div>
    </Screen>
  );
}

function ServiceList({
  services,
  pricesForbidden,
}: Readonly<{ services: Service[]; pricesForbidden: boolean }>) {
  const edit = useEditing();
  const create = useCreateService();
  return (
    <div className="grid gap-3 px-4 md:px-0">
      {pricesForbidden && (
        <p className="rounded-lg bg-attention-soft px-3 py-2 text-sm">{Copy.pricesForbidden}</p>
      )}
      {services.length === 0 && edit.editing !== NEW_ITEM && (
        <p className="text-sm text-muted-foreground">{Copy.empty}</p>
      )}
      {services.map((service) => (
        <ServiceItem key={service.id} service={service} edit={edit} />
      ))}
      {edit.editing === NEW_ITEM ? (
        <ServiceForm
          pending={create.isPending}
          onCancel={edit.close}
          onSubmit={(body) => {
            create.mutate(body, edit.done);
          }}
        />
      ) : (
        <AddButton
          label={Copy.add}
          onClick={() => {
            edit.open(NEW_ITEM);
          }}
        />
      )}
    </div>
  );
}

function ServiceItem({
  service,
  edit,
}: Readonly<{ service: Service; edit: ReturnType<typeof useEditing> }>) {
  const update = useUpdateService();
  const archive = useArchiveService();
  if (edit.editing === service.id)
    return (
      <ServiceForm
        initial={service}
        pending={update.isPending}
        onCancel={edit.close}
        onSubmit={(body) => {
          update.mutate({ id: service.id, body }, edit.done);
        }}
      />
    );
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-card p-4">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{service.name}</p>
        <p className="text-sm text-muted-foreground">
          {Copy.minutes(service.durationMinutes)} ·{' '}
          <span className="tabular-nums">{formatCents(service.priceCents)}</span>
          {!service.visibleToPatient && ` · ${Copy.hidden}`}
        </p>
      </div>
      <RowActions
        onEdit={() => {
          edit.open(service.id);
        }}
        onRemove={() => {
          if (window.confirm(Copy.removeConfirm(service.name)))
            archive.mutate(service.id, feedback);
        }}
      />
    </div>
  );
}
