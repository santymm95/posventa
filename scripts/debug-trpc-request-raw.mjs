import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

const loggerFetch = async (input, init) => {
  console.log('FETCH INPUT', input);
  console.log('FETCH METHOD', init?.method);
  if (init?.body) {
    try {
      const bodyText = typeof init.body === 'string' ? init.body : await new Response(init.body).text();
      console.log('FETCH BODY', bodyText);
    } catch (err) {
      console.log('FETCH BODY UNREADABLE', err);
    }
  }
  const res = await globalThis.fetch(input, init);
  const resText = await res.text();
  console.log('RESPONSE STATUS', res.status);
  console.log('RESPONSE HEADERS', JSON.stringify(Array.from(res.headers.entries())));
  console.log('RESPONSE BODY', resText);
  return new Response(resText, {
    status: res.status,
    headers: res.headers,
  });
};

const client = createTRPCProxyClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3001/api/trpc',
      fetch: loggerFetch,
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
  }
}

main();
