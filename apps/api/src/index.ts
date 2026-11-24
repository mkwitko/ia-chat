import { parseEnv } from '@app/core';

// Fails fast on a bad environment. The server/worker and its logger arrive in E-04/E-05.
parseEnv(process.env);
