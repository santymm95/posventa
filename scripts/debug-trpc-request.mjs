const url = 'http://localhost:3000/api/trpc/auth.login?batch=1';
const body = [
  {
    id: '0',
    json: {
      input: {
        email: 'admin@gmail.com',
        password: 'admin2026*',
      },
    },
  },
];

async function main() {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('HEADERS', Object.fromEntries(res.headers.entries()));
    console.log('BODY', text);
  } catch (error) {
    console.error('FETCH ERROR', error);
  }
}

main();
