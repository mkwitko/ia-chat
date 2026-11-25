// Google event ids use base32hex (a-v, 0-9), 5 to 1024 chars. A UUID without dashes is hex, so
// it fits and stays unique per appointment.
const DASH = /-/g;

export const eventIdFor = (appointmentId: string): string =>
  appointmentId.replace(DASH, '').toLowerCase();
