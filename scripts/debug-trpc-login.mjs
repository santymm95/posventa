import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

const client = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
      fetch: (input, init) => globalThis.fetch(input, init),
    }),
  ],
});

async function main() {
  try {
    const res = await client.auth.login.mutate({
      email: 'admin@gmail.com',
      password: 'admin2026*',
    });
    console.log('RESULT', res);
  } catch (err) {
    console.error('ERROR', err);
    if (err instanceof Error) console.error(err.stack);
  }
}

main();
