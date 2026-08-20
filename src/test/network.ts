export function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  } as unknown as Response;
}

export function installFetchMock() {
  const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;
  global.fetch = fetchMock;
  return fetchMock;
}
