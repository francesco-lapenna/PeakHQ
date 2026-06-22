export const handler = async () => ({
  statusCode: 501,
  body: JSON.stringify({
    error: { code: 'NOT_IMPLEMENTED', message: 'Coming in Phase 3 Step 3.' },
  }),
});
