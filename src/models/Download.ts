const USE_MOCK = process.env.MOCK_DB === 'true';

export const Download = USE_MOCK
  ? (await import('./DownloadMock.js')).Download
  : (await import('./DownloadMongoose.js')).Download;
